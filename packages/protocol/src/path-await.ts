/**
 * Pure path-await poll loop for TransportNode.awaitPath.
 * Path presence arrives as probe events; adapters schedule from timer intents.
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PATH_REQUEST_TIMEOUT_SECONDS } from "./path-table.js";

export const PATH_AWAIT_POLL_INTERVAL_MS = 50;
export const PATH_AWAIT_TIMER_ID = "path-await";
export const PATH_AWAIT_DEFAULT_TIMEOUT_MS = PATH_REQUEST_TIMEOUT_SECONDS * 1000;

export interface PathAwaitState {
  readonly armed: boolean;
  readonly deadlineMs: number;
  readonly pathPresent: boolean;
  readonly concluded: boolean;
  readonly found: boolean;
}

export type PathAwaitEvent =
  | Event
  | { readonly kind: "path-await/arm"; readonly at: number; readonly timeoutMs: number }
  | { readonly kind: "path-await/path-status"; readonly present: boolean };

export function initialPathAwaitState(): PathAwaitState {
  return {
    armed: false,
    deadlineMs: 0,
    pathPresent: false,
    concluded: false,
    found: false
  };
}

/** Whether the path-await loop should keep probing. */
export function shouldContinuePathAwait(concluded: boolean): boolean {
  return !concluded;
}

export const stepPathAwait: StepFn<PathAwaitState> = (state, event) =>
  stepPathAwaitInner(state, event as PathAwaitEvent);

function stepPathAwaitInner(
  state: PathAwaitState,
  event: PathAwaitEvent
): { state: PathAwaitState; intents: Intent[] } {
  if (event.kind === "path-await/arm") {
    return {
      state: {
        armed: true,
        deadlineMs: event.at + event.timeoutMs,
        pathPresent: false,
        concluded: false,
        found: false
      },
      intents: [
        {
          kind: "timer/set",
          timer: { id: PATH_AWAIT_TIMER_ID, delayMs: PATH_AWAIT_POLL_INTERVAL_MS }
        }
      ]
    };
  }

  if (event.kind === "path-await/path-status") {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    if (event.present) {
      return {
        state: {
          ...state,
          pathPresent: true,
          concluded: true,
          found: true
        },
        intents: [{ kind: "timer/cancel", timer: { id: PATH_AWAIT_TIMER_ID } }]
      };
    }
    return {
      state: { ...state, pathPresent: false },
      intents: []
    };
  }

  if (event.kind === "timer/fired" && event.id === PATH_AWAIT_TIMER_ID) {
    if (!state.armed || state.concluded) {
      return { state, intents: [] };
    }
    if (state.pathPresent || event.at >= state.deadlineMs) {
      return {
        state: {
          ...state,
          concluded: true,
          found: state.pathPresent
        },
        intents: []
      };
    }
    return {
      state,
      intents: [
        {
          kind: "timer/set",
          timer: { id: PATH_AWAIT_TIMER_ID, delayMs: PATH_AWAIT_POLL_INTERVAL_MS }
        }
      ]
    };
  }

  return { state, intents: [] };
}
