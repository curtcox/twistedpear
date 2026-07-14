/**
 * Pure path-response grace delay before transmitting a cached announce reply.
 * Adapters arm the timer from intents, transmit on the transmit action, and
 * conclude the Promise shell only via resolve actions.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PATH_REQUEST_GRACE_MS } from "./path-table.js";

export const PATH_RESPONSE_GRACE_TIMER_ID = "path-response-grace";
export { PATH_REQUEST_GRACE_MS };

export interface PathResponseGraceState {
  readonly armed: boolean;
  readonly concluded: boolean;
  readonly ready: boolean;
}

export type PathResponseGraceEvent =
  | Event
  | { readonly kind: "path-response-grace/arm"; readonly delayMs?: number };

export type PathResponseGraceAction =
  | { readonly kind: "transmit" }
  | { readonly kind: "resolve" };

export interface PathResponseGraceStepResult {
  readonly state: PathResponseGraceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathResponseGraceAction[];
}

export function initialPathResponseGraceState(): PathResponseGraceState {
  return {
    armed: false,
    concluded: false,
    ready: false
  };
}

/** Whether grace concluded and the adapter should transmit the path response. */
export function shouldTransmitPathResponse(state: PathResponseGraceState): boolean {
  return state.concluded && state.ready;
}

export const stepPathResponseGrace: StepFn<PathResponseGraceState> = (state, event) => {
  const result = stepPathResponseGraceInner(state, event as PathResponseGraceEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPathResponseGraceWithActions(
  state: PathResponseGraceState,
  event: PathResponseGraceEvent
): PathResponseGraceStepResult {
  return stepPathResponseGraceInner(state, event);
}

function stepPathResponseGraceInner(
  state: PathResponseGraceState,
  event: PathResponseGraceEvent
): PathResponseGraceStepResult {
  if (event.kind === "path-response-grace/arm") {
    return {
      state: {
        armed: true,
        concluded: false,
        ready: false
      },
      intents: [
        {
          kind: "timer/set",
          timer: {
            id: PATH_RESPONSE_GRACE_TIMER_ID,
            delayMs: event.delayMs ?? PATH_REQUEST_GRACE_MS
          }
        }
      ],
      actions: []
    };
  }

  if (event.kind === "timer/fired" && event.id === PATH_RESPONSE_GRACE_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: {
        ...state,
        concluded: true,
        ready: true
      },
      intents: [],
      actions: [{ kind: "transmit" }, { kind: "resolve" }]
    };
  }

  return { state, intents: [], actions: [] };
}
