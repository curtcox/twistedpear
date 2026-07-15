/**
 * Pure interface reconnect scheduling decisions and timer step machine.
 * Socket connect / timer arming stay at the adapter edge.
 * Interface name / MTU / closed / send / enqueue / deliver / yield gates
 * conclude via machine actions (no ad-hoc `isValidInterfaceName` /
 * `packetFitsInterfaceMtu` / `isInterfaceClosed` / `canInterfaceSend` /
 * `shouldEnqueueRawInterfaceFrame` / `shouldEnqueueDecodedPacket` /
 * `shouldDeliverQueuedPacket` / `shouldYieldBufferedPacket` reads beside
 * the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const INTERFACE_RECONNECT_WAIT_MS = 5_000;
export const INTERFACE_RECONNECT_TIMER_ID = "interface-reconnect";

/** Whether an interface name is non-empty (RNS interface config). */
export function isValidInterfaceName(name: string): boolean {
  return name.length > 0;
}

/**
 * Interface-name validity gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isValidInterfaceName`
 * reads beside the step).
 */
export type InterfaceNameValidState = Record<string, never>;

export type InterfaceNameValidEvent =
  | Event
  | {
      readonly kind: "iface/name-valid-gate";
      readonly name: string;
    };

export type InterfaceNameValidAction =
  | { readonly kind: "valid" }
  | { readonly kind: "invalid" };

export interface InterfaceNameValidStepResult {
  readonly state: InterfaceNameValidState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceNameValidAction[];
}

export function initialInterfaceNameValidState(): InterfaceNameValidState {
  return {};
}

export function stepInterfaceNameValidWithActions(
  state: InterfaceNameValidState,
  event: InterfaceNameValidEvent
): InterfaceNameValidStepResult {
  if (event.kind === "iface/name-valid-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: isValidInterfaceName(event.name) ? "valid" : "invalid" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptInterfaceName(
  actions: ReadonlyArray<InterfaceNameValidAction>
): boolean {
  return actions.some((action) => action.kind === "valid");
}

export function shouldRejectInterfaceName(
  actions: ReadonlyArray<InterfaceNameValidAction>
): boolean {
  return actions.some((action) => action.kind === "invalid");
}

/** Whether a packet's raw length fits the interface MTU. */
export function packetFitsInterfaceMtu(rawLength: number, mtu: number): boolean {
  return rawLength <= mtu;
}

/**
 * Interface MTU fitness gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packetFitsInterfaceMtu`
 * reads beside the step).
 */
export type InterfaceMtuFitState = Record<string, never>;

export type InterfaceMtuFitEvent =
  | Event
  | {
      readonly kind: "iface/mtu-fit-gate";
      readonly rawLength: number;
      readonly mtu: number;
    };

export type InterfaceMtuFitAction =
  | { readonly kind: "fit" }
  | { readonly kind: "overflow" };

export interface InterfaceMtuFitStepResult {
  readonly state: InterfaceMtuFitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceMtuFitAction[];
}

export function initialInterfaceMtuFitState(): InterfaceMtuFitState {
  return {};
}

export function stepInterfaceMtuFitWithActions(
  state: InterfaceMtuFitState,
  event: InterfaceMtuFitEvent
): InterfaceMtuFitStepResult {
  if (event.kind === "iface/mtu-fit-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: packetFitsInterfaceMtu(event.rawLength, event.mtu) ? "fit" : "overflow"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInterfaceMtuFit(
  actions: ReadonlyArray<InterfaceMtuFitAction>
): boolean {
  return actions.some((action) => action.kind === "fit");
}

export function shouldInterfaceMtuOverflow(
  actions: ReadonlyArray<InterfaceMtuFitAction>
): boolean {
  return actions.some((action) => action.kind === "overflow");
}

/** Whether the interface is closed (no further send / receive / close work). */
export function isInterfaceClosed(closed: boolean): boolean {
  return closed;
}

/**
 * Interface closed gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isInterfaceClosed`
 * reads beside the step).
 */
export type InterfaceClosedState = Record<string, never>;

export type InterfaceClosedEvent =
  | Event
  | {
      readonly kind: "iface/closed-gate";
      readonly closed: boolean;
    };

export type InterfaceClosedAction =
  | { readonly kind: "closed" }
  | { readonly kind: "open" };

export interface InterfaceClosedStepResult {
  readonly state: InterfaceClosedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceClosedAction[];
}

export function initialInterfaceClosedState(): InterfaceClosedState {
  return {};
}

export function stepInterfaceClosedWithActions(
  state: InterfaceClosedState,
  event: InterfaceClosedEvent
): InterfaceClosedStepResult {
  if (event.kind === "iface/closed-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: isInterfaceClosed(event.closed) ? "closed" : "open" }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldInterfaceClosedNow(
  actions: ReadonlyArray<InterfaceClosedAction>
): boolean {
  return actions.some((action) => action.kind === "closed");
}

export function shouldInterfaceOpenNow(
  actions: ReadonlyArray<InterfaceClosedAction>
): boolean {
  return actions.some((action) => action.kind === "open");
}

/** Whether the interface may send (open and configured for outbound traffic). */
export function canInterfaceSend(input: {
  readonly closed: boolean;
  readonly outgoing: boolean;
}): boolean {
  return !isInterfaceClosed(input.closed) && input.outgoing;
}

/**
 * Interface send-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canInterfaceSend`
 * reads beside the step).
 */
export type InterfaceSendAllowState = Record<string, never>;

export type InterfaceSendAllowEvent =
  | Event
  | {
      readonly kind: "iface/send-allow-gate";
      readonly closed: boolean;
      readonly outgoing: boolean;
    };

export type InterfaceSendAllowAction =
  | { readonly kind: "allow" }
  | { readonly kind: "deny" };

export interface InterfaceSendAllowStepResult {
  readonly state: InterfaceSendAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InterfaceSendAllowAction[];
}

export function initialInterfaceSendAllowState(): InterfaceSendAllowState {
  return {};
}

export function stepInterfaceSendAllowWithActions(
  state: InterfaceSendAllowState,
  event: InterfaceSendAllowEvent
): InterfaceSendAllowStepResult {
  if (event.kind === "iface/send-allow-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: canInterfaceSend({ closed: event.closed, outgoing: event.outgoing })
            ? "allow"
            : "deny"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAllowInterfaceSend(
  actions: ReadonlyArray<InterfaceSendAllowAction>
): boolean {
  return actions.some((action) => action.kind === "allow");
}

export function shouldDenyInterfaceSend(
  actions: ReadonlyArray<InterfaceSendAllowAction>
): boolean {
  return actions.some((action) => action.kind === "deny");
}

/** Whether a raw (non-HDLC) inbound byte chunk should be enqueued as a frame. */
export function shouldEnqueueRawInterfaceFrame(length: number): boolean {
  return length > 0;
}

/**
 * Raw interface-frame enqueue gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEnqueueRawInterfaceFrame` reads beside the step).
 */
export type EnqueueRawInterfaceFrameState = Record<string, never>;

export type EnqueueRawInterfaceFrameEvent =
  | Event
  | {
      readonly kind: "iface/enqueue-raw-frame-gate";
      readonly length: number;
    };

export type EnqueueRawInterfaceFrameAction =
  | { readonly kind: "enqueue" }
  | { readonly kind: "skip" };

export interface EnqueueRawInterfaceFrameStepResult {
  readonly state: EnqueueRawInterfaceFrameState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EnqueueRawInterfaceFrameAction[];
}

export function initialEnqueueRawInterfaceFrameState(): EnqueueRawInterfaceFrameState {
  return {};
}

export function stepEnqueueRawInterfaceFrameWithActions(
  state: EnqueueRawInterfaceFrameState,
  event: EnqueueRawInterfaceFrameEvent
): EnqueueRawInterfaceFrameStepResult {
  if (event.kind === "iface/enqueue-raw-frame-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEnqueueRawInterfaceFrame(event.length) ? "enqueue" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEnqueueRawInterfaceFrameNow(
  actions: ReadonlyArray<EnqueueRawInterfaceFrameAction>
): boolean {
  return actions.some((action) => action.kind === "enqueue");
}

export function shouldSkipRawInterfaceFrameEnqueue(
  actions: ReadonlyArray<EnqueueRawInterfaceFrameAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a successfully decoded packet should be pushed onto the inbound queue. */
export function shouldEnqueueDecodedPacket(packetPresent: boolean): boolean {
  return packetPresent;
}

/**
 * Decoded-packet enqueue gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldEnqueueDecodedPacket` reads beside the step).
 */
export type EnqueueDecodedPacketState = Record<string, never>;

export type EnqueueDecodedPacketEvent =
  | Event
  | {
      readonly kind: "iface/enqueue-decoded-packet-gate";
      readonly packetPresent: boolean;
    };

export type EnqueueDecodedPacketAction =
  | { readonly kind: "enqueue" }
  | { readonly kind: "skip" };

export interface EnqueueDecodedPacketStepResult {
  readonly state: EnqueueDecodedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EnqueueDecodedPacketAction[];
}

export function initialEnqueueDecodedPacketState(): EnqueueDecodedPacketState {
  return {};
}

export function stepEnqueueDecodedPacketWithActions(
  state: EnqueueDecodedPacketState,
  event: EnqueueDecodedPacketEvent
): EnqueueDecodedPacketStepResult {
  if (event.kind === "iface/enqueue-decoded-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEnqueueDecodedPacket(event.packetPresent) ? "enqueue" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEnqueueDecodedPacketNow(
  actions: ReadonlyArray<EnqueueDecodedPacketAction>
): boolean {
  return actions.some((action) => action.kind === "enqueue");
}

export function shouldSkipDecodedPacketEnqueue(
  actions: ReadonlyArray<EnqueueDecodedPacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a pushed packet should be delivered immediately to a waiting iterator. */
export function shouldDeliverQueuedPacket(waiterPresent: boolean): boolean {
  return waiterPresent;
}

/**
 * Queued-packet deliver gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldDeliverQueuedPacket` reads beside the step).
 */
export type DeliverQueuedPacketState = Record<string, never>;

export type DeliverQueuedPacketEvent =
  | Event
  | {
      readonly kind: "iface/deliver-queued-packet-gate";
      readonly waiterPresent: boolean;
    };

export type DeliverQueuedPacketAction =
  | { readonly kind: "deliver" }
  | { readonly kind: "buffer" };

export interface DeliverQueuedPacketStepResult {
  readonly state: DeliverQueuedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DeliverQueuedPacketAction[];
}

export function initialDeliverQueuedPacketState(): DeliverQueuedPacketState {
  return {};
}

export function stepDeliverQueuedPacketWithActions(
  state: DeliverQueuedPacketState,
  event: DeliverQueuedPacketEvent
): DeliverQueuedPacketStepResult {
  if (event.kind === "iface/deliver-queued-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldDeliverQueuedPacket(event.waiterPresent) ? "deliver" : "buffer"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldDeliverQueuedPacketNow(
  actions: ReadonlyArray<DeliverQueuedPacketAction>
): boolean {
  return actions.some((action) => action.kind === "deliver");
}

export function shouldBufferQueuedPacket(
  actions: ReadonlyArray<DeliverQueuedPacketAction>
): boolean {
  return actions.some((action) => action.kind === "buffer");
}

/** Whether a buffered queue value should be yielded from the iterator. */
export function shouldYieldBufferedPacket(valuePresent: boolean): boolean {
  return valuePresent;
}

/**
 * Buffered-packet yield gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldYieldBufferedPacket` reads beside the step).
 */
export type YieldBufferedPacketState = Record<string, never>;

export type YieldBufferedPacketEvent =
  | Event
  | {
      readonly kind: "iface/yield-buffered-packet-gate";
      readonly valuePresent: boolean;
    };

export type YieldBufferedPacketAction =
  | { readonly kind: "yield" }
  | { readonly kind: "skip" };

export interface YieldBufferedPacketStepResult {
  readonly state: YieldBufferedPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly YieldBufferedPacketAction[];
}

export function initialYieldBufferedPacketState(): YieldBufferedPacketState {
  return {};
}

export function stepYieldBufferedPacketWithActions(
  state: YieldBufferedPacketState,
  event: YieldBufferedPacketEvent
): YieldBufferedPacketStepResult {
  if (event.kind === "iface/yield-buffered-packet-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldYieldBufferedPacket(event.valuePresent) ? "yield" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldYieldBufferedPacketNow(
  actions: ReadonlyArray<YieldBufferedPacketAction>
): boolean {
  return actions.some((action) => action.kind === "yield");
}

export function shouldSkipBufferedPacketYield(
  actions: ReadonlyArray<YieldBufferedPacketAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
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
