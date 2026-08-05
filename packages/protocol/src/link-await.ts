/**
 * Pure outbound link-await: arm a timeout, conclude on established or timeout.
 * Adapters run requestLink from the request-link action, schedule/cancel timers
 * from intents, and conclude the Promise shell only via resolve/reject actions
 * (link object stays at the adapter; same shape as propagation resolve-link-wait).
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

export type LinkAwaitAction =
  | { readonly kind: "request-link"; readonly timeoutMs: number }
  | { readonly kind: "resolve" }
  | { readonly kind: "reject"; readonly reason: "timeout" };

export interface LinkAwaitStepResult {
  readonly state: LinkAwaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAwaitAction[];
}

export function initialLinkAwaitState(): LinkAwaitState {
  return {
    armed: false,
    concluded: false,
    established: false,
    timedOut: false,
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

export const stepLinkAwait: StepFn<LinkAwaitState> = (state, event) => {
  const result = stepLinkAwaitInner(state, event as LinkAwaitEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkAwaitWithActions(
  state: LinkAwaitState,
  event: LinkAwaitEvent,
): LinkAwaitStepResult {
  return stepLinkAwaitInner(state, event);
}

function stepLinkAwaitInner(
  state: LinkAwaitState,
  event: LinkAwaitEvent,
): LinkAwaitStepResult {
  if (event.kind === "link-await/arm") {
    return {
      state: {
        armed: true,
        concluded: false,
        established: false,
        timedOut: false,
      },
      intents: [
        {
          kind: "timer/set",
          timer: { id: LINK_AWAIT_TIMER_ID, delayMs: event.timeoutMs },
        },
      ],
      actions: [{ kind: "request-link", timeoutMs: event.timeoutMs }],
    };
  }

  if (event.kind === "link-await/established") {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        established: true,
        timedOut: false,
      },
      intents: [{ kind: "timer/cancel", timer: { id: LINK_AWAIT_TIMER_ID } }],
      actions: [{ kind: "resolve" }],
    };
  }

  if (event.kind === "timer/fired" && event.id === LINK_AWAIT_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        established: false,
        timedOut: true,
      },
      intents: [],
      actions: [{ kind: "reject", reason: "timeout" }],
    };
  }

  return { state, intents: [], actions: [] };
}
