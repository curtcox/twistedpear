/**
 * Pure link app-request await: arm, send request, conclude on response / fail / reject.
 * Timeout scheduling stays on LinkRequestReceipt (packet receipt); this machine owns
 * Promise-shell conclusion via resolve actions. Adapters perform link.request from
 * the send-request action.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export interface LinkAppRequestAwaitState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly response: Uint8Array | null;
}

export type LinkAppRequestAwaitEvent =
  | Event
  | { readonly kind: "app-request-await/arm"; readonly timeoutSec: number }
  | { readonly kind: "app-request-await/response"; readonly response: Uint8Array | null }
  | { readonly kind: "app-request-await/failed" }
  | { readonly kind: "app-request-await/send-rejected" };

export type LinkAppRequestAwaitAction =
  | { readonly kind: "send-request"; readonly timeoutSec: number }
  | { readonly kind: "resolve"; readonly response: Uint8Array | null };

export interface LinkAppRequestAwaitStepResult {
  readonly state: LinkAppRequestAwaitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestAwaitAction[];
}

export function initialLinkAppRequestAwaitState(): LinkAppRequestAwaitState {
  return {
    armed: false,
    concluded: false,
    response: null
  };
}

/** Whether the adapter should keep waiting for a response or failure. */
export function shouldContinueLinkAppRequestAwait(concluded: boolean): boolean {
  return !concluded;
}

export const stepLinkAppRequestAwait: StepFn<LinkAppRequestAwaitState> = (state, event) => {
  const result = stepLinkAppRequestAwaitInner(state, event as LinkAppRequestAwaitEvent);
  return { state: result.state, intents: result.intents };
};

export function stepLinkAppRequestAwaitWithActions(
  state: LinkAppRequestAwaitState,
  event: LinkAppRequestAwaitEvent
): LinkAppRequestAwaitStepResult {
  return stepLinkAppRequestAwaitInner(state, event);
}

function conclude(
  state: LinkAppRequestAwaitState,
  response: Uint8Array | null
): LinkAppRequestAwaitStepResult {
  if (!state.armed || state.concluded) {
    return { state, intents: [], actions: [] };
  }
  return {
    state: {
      armed: true,
      concluded: true,
      response
    },
    intents: [],
    actions: [{ kind: "resolve", response }]
  };
}

function stepLinkAppRequestAwaitInner(
  state: LinkAppRequestAwaitState,
  event: LinkAppRequestAwaitEvent
): LinkAppRequestAwaitStepResult {
  if (event.kind === "app-request-await/arm") {
    return {
      state: {
        armed: true,
        concluded: false,
        response: null
      },
      intents: [],
      actions: [{ kind: "send-request", timeoutSec: event.timeoutSec }]
    };
  }

  if (event.kind === "app-request-await/response") {
    return conclude(state, event.response);
  }

  if (event.kind === "app-request-await/failed" || event.kind === "app-request-await/send-rejected") {
    return conclude(state, null);
  }

  return { state, intents: [], actions: [] };
}
