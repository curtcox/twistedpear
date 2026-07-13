/**
 * Pure interface reconnect scheduling decisions and timer step machine.
 * Socket connect / timer arming stay at the adapter edge.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const INTERFACE_RECONNECT_WAIT_MS = 5_000;
export const INTERFACE_RECONNECT_TIMER_ID = "interface-reconnect";

/** Whether an interface name is non-empty (RNS interface config). */
export function isValidInterfaceName(name: string): boolean {
  return name.length > 0;
}

/** Whether a packet's raw length fits the interface MTU. */
export function packetFitsInterfaceMtu(rawLength: number, mtu: number): boolean {
  return rawLength <= mtu;
}

/** Whether the interface is closed (no further send / receive / close work). */
export function isInterfaceClosed(closed: boolean): boolean {
  return closed;
}

/** Whether the interface may send (open and configured for outbound traffic). */
export function canInterfaceSend(input: {
  readonly closed: boolean;
  readonly outgoing: boolean;
}): boolean {
  return !isInterfaceClosed(input.closed) && input.outgoing;
}

/** Whether a raw (non-HDLC) inbound byte chunk should be enqueued as a frame. */
export function shouldEnqueueRawInterfaceFrame(length: number): boolean {
  return length > 0;
}

/** Whether a successfully decoded packet should be pushed onto the inbound queue. */
export function shouldEnqueueDecodedPacket(packetPresent: boolean): boolean {
  return packetPresent;
}

export type InterfaceReconnectPlan =
  | { readonly kind: "reconnect"; readonly delayMs: number; readonly attempt: number }
  | { readonly kind: "give-up"; readonly attempt: number };

export function planInterfaceReconnect(input: {
  readonly attempts: number;
  readonly maxTries?: number | null;
  readonly waitMs?: number;
}): InterfaceReconnectPlan {
  const attempt = input.attempts + 1;
  const maxTries = input.maxTries ?? null;
  if (maxTries !== null && attempt > maxTries) {
    return { kind: "give-up", attempt };
  }
  return {
    kind: "reconnect",
    delayMs: input.waitMs ?? INTERFACE_RECONNECT_WAIT_MS,
    attempt
  };
}

export interface InterfaceReconnectState {
  readonly attempts: number;
  readonly maxTries: number | null;
  readonly waitMs: number;
  readonly detached: boolean;
  /** When true, spawned/server-accepted sockets must not auto-reconnect. */
  readonly suppressReconnect: boolean;
  readonly waiting: boolean;
}

export type InterfaceReconnectEvent =
  | Event
  | { readonly kind: "iface/connected" }
  | { readonly kind: "iface/disconnected" }
  | { readonly kind: "iface/connect-failed" }
  | { readonly kind: "iface/detach" };

export type InterfaceReconnectAction =
  | { readonly kind: "connect"; readonly attempt: number }
  | { readonly kind: "give-up"; readonly attempt: number };

export interface InterfaceReconnectStepResult {
  readonly state: InterfaceReconnectState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceReconnectAction[];
}

export function initialInterfaceReconnectState(options: {
  readonly maxTries?: number | null;
  readonly waitMs?: number;
  readonly suppressReconnect?: boolean;
} = {}): InterfaceReconnectState {
  return {
    attempts: 0,
    maxTries: options.maxTries ?? null,
    waitMs: options.waitMs ?? INTERFACE_RECONNECT_WAIT_MS,
    detached: false,
    suppressReconnect: options.suppressReconnect === true,
    waiting: false
  };
}

export const stepInterfaceReconnect: StepFn<InterfaceReconnectState> = (state, event) => {
  const result = stepInterfaceReconnectInner(state, event as InterfaceReconnectEvent);
  return { state: result.state, intents: result.intents };
};

export function stepInterfaceReconnectWithActions(
  state: InterfaceReconnectState,
  event: InterfaceReconnectEvent
): InterfaceReconnectStepResult {
  return stepInterfaceReconnectInner(state, event);
}

function cancelTimerIntent(): Intent {
  return { kind: "timer/cancel", timer: { id: INTERFACE_RECONNECT_TIMER_ID } };
}

function setTimerIntent(delayMs: number): Intent {
  return { kind: "timer/set", timer: { id: INTERFACE_RECONNECT_TIMER_ID, delayMs } };
}

function stepInterfaceReconnectInner(
  state: InterfaceReconnectState,
  event: InterfaceReconnectEvent
): InterfaceReconnectStepResult {
  if (event.kind === "iface/detach") {
    return {
      state: { ...state, detached: true, waiting: false },
      intents: [cancelTimerIntent()],
      actions: []
    };
  }

  if (event.kind === "iface/connected") {
    return {
      state: { ...state, attempts: 0, waiting: false, detached: false },
      intents: [cancelTimerIntent()],
      actions: []
    };
  }

  if (state.detached || state.suppressReconnect) {
    return { state, intents: [], actions: [] };
  }

  if (event.kind === "iface/disconnected" || event.kind === "iface/connect-failed") {
    return {
      state: { ...state, waiting: true },
      intents: [cancelTimerIntent(), setTimerIntent(state.waitMs)],
      actions: []
    };
  }

  if (event.kind === "timer/fired" && event.id === INTERFACE_RECONNECT_TIMER_ID) {
    if (!state.waiting) {
      return { state, intents: [], actions: [] };
    }
    const plan = planInterfaceReconnect({
      attempts: state.attempts,
      maxTries: state.maxTries,
      waitMs: state.waitMs
    });
    if (plan.kind === "give-up") {
      return {
        state: { ...state, attempts: plan.attempt, waiting: false },
        intents: [],
        actions: [{ kind: "give-up", attempt: plan.attempt }]
      };
    }
    return {
      state: { ...state, attempts: plan.attempt, waiting: false },
      intents: [],
      actions: [{ kind: "connect", attempt: plan.attempt }]
    };
  }

  return { state, intents: [], actions: [] };
}
