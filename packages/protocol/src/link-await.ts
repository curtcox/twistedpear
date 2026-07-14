/**
 * Pure outbound link-await: arm a timeout, conclude on established or timeout.
 * Adapters run requestLink and sleep/cancel timers from intents.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const LINK_AWAIT_DEFAULT_TIMEOUT_MS = 5000;
export const LINK_AWAIT_TIMER_ID = "link-await";

export interface LinkAwaitState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly established: boolean;
  readonly timedOut: boolean;
}

export type LinkAwaitEvent =
  | Event
  | { readonly kind: "link-await/arm"; readonly timeoutMs: number }
  | { readonly kind: "link-await/established" };

export function initialLinkAwaitState(): LinkAwaitState {
  return {
    armed: false,
    concluded: false,
    established: false,
    timedOut: false
  };
}

/** Whether the adapter should keep waiting for establish or timeout. */
export function shouldContinueLinkAwait(concluded: boolean): boolean {
  return !concluded;
}

/** Whether await concluded with an established link. */
export function isLinkAwaitEstablished(state: LinkAwaitState): boolean {
  return state.concluded && state.established;
}

/** Whether await concluded due to timeout. */
export function isLinkAwaitTimedOut(state: LinkAwaitState): boolean {
  return state.concluded && state.timedOut;
}

export const stepLinkAwait: StepFn<LinkAwaitState> = (state, event) =>
  stepLinkAwaitInner(state, event as LinkAwaitEvent);

function stepLinkAwaitInner(
  state: LinkAwaitState,
  event: LinkAwaitEvent
): { state: LinkAwaitState; intents: Intent[] } {
  if (event.kind === "link-await/arm") {
    return {
      state: {
        armed: true,
        concluded: false,
        established: false,
        timedOut: false
      },
      intents: [
        {
          kind: "timer/set",
          timer: { id: LINK_AWAIT_TIMER_ID, delayMs: event.timeoutMs }
        }
      ]
    };
  }

  if (event.kind === "link-await/established") {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        established: true,
        timedOut: false
      },
      intents: [{ kind: "timer/cancel", timer: { id: LINK_AWAIT_TIMER_ID } }]
    };
  }

  if (event.kind === "timer/fired" && event.id === LINK_AWAIT_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        established: false,
        timedOut: true
      },
      intents: []
    };
  }

  return { state, intents: [] };
}
