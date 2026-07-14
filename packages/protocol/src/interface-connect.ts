/**
 * Pure interface initial-connect timeout: arm a timer, conclude on open / fail / timeout.
 * Adapters open the socket and sleep/cancel timers from intents.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const INTERFACE_CONNECT_TIMEOUT_MS = 5_000;
export const INTERFACE_CONNECT_TIMER_ID = "interface-connect";

export interface InterfaceConnectState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly connected: boolean;
  readonly timedOut: boolean;
  readonly failed: boolean;
}

export type InterfaceConnectEvent =
  | Event
  | { readonly kind: "interface-connect/arm"; readonly timeoutMs: number }
  | { readonly kind: "interface-connect/connected" }
  | { readonly kind: "interface-connect/failed" };

export function initialInterfaceConnectState(): InterfaceConnectState {
  return {
    armed: false,
    concluded: false,
    connected: false,
    timedOut: false,
    failed: false
  };
}

/** Whether the adapter should keep waiting for connect, fail, or timeout. */
export function shouldContinueInterfaceConnect(concluded: boolean): boolean {
  return !concluded;
}

/** Whether connect concluded with an open socket. */
export function isInterfaceConnectConnected(state: InterfaceConnectState): boolean {
  return state.concluded && state.connected;
}

/** Whether connect concluded due to timeout. */
export function isInterfaceConnectTimedOut(state: InterfaceConnectState): boolean {
  return state.concluded && state.timedOut;
}

/** Whether connect concluded due to a socket error/close before open. */
export function isInterfaceConnectFailed(state: InterfaceConnectState): boolean {
  return state.concluded && state.failed;
}

export const stepInterfaceConnect: StepFn<InterfaceConnectState> = (state, event) =>
  stepInterfaceConnectInner(state, event as InterfaceConnectEvent);

function stepInterfaceConnectInner(
  state: InterfaceConnectState,
  event: InterfaceConnectEvent
): { state: InterfaceConnectState; intents: Intent[] } {
  if (event.kind === "interface-connect/arm") {
    return {
      state: {
        armed: true,
        concluded: false,
        connected: false,
        timedOut: false,
        failed: false
      },
      intents: [
        {
          kind: "timer/set",
          timer: { id: INTERFACE_CONNECT_TIMER_ID, delayMs: event.timeoutMs }
        }
      ]
    };
  }

  if (event.kind === "interface-connect/connected") {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        connected: true,
        timedOut: false,
        failed: false
      },
      intents: [{ kind: "timer/cancel", timer: { id: INTERFACE_CONNECT_TIMER_ID } }]
    };
  }

  if (event.kind === "interface-connect/failed") {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        connected: false,
        timedOut: false,
        failed: true
      },
      intents: [{ kind: "timer/cancel", timer: { id: INTERFACE_CONNECT_TIMER_ID } }]
    };
  }

  if (event.kind === "timer/fired" && event.id === INTERFACE_CONNECT_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        connected: false,
        timedOut: true,
        failed: false
      },
      intents: []
    };
  }

  return { state, intents: [] };
}
