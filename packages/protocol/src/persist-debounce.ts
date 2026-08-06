/**
 * Pure debounce for persistence flushes (e.g. LXMF propagation server).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";

export const PERSIST_DEBOUNCE_MS = 250;

export interface PersistDebounceState {
  readonly pending: boolean;
}

export type PersistDebounceEvent =
  | Event
  | { readonly kind: "persist/request" }
  | { readonly kind: "persist/cancel" };

export type PersistDebounceAction = { readonly kind: "flush" };

export interface PersistDebounceStepResult {
  readonly state: PersistDebounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PersistDebounceAction[];
}

export function initialPersistDebounceState(): PersistDebounceState {
  return { pending: false };
}

export const stepPersistDebounce: StepFn<PersistDebounceState> = (
  state,
  event,
) => {
  const result = stepPersistDebounceInner(state, event as PersistDebounceEvent);
  return { state: result.state, intents: result.intents };
};

export function stepPersistDebounceWithActions(
  state: PersistDebounceState,
  event: PersistDebounceEvent,
): PersistDebounceStepResult {
  return stepPersistDebounceInner(state, event);
}

function stepPersistDebounceInner(
  state: PersistDebounceState,
  event: PersistDebounceEvent,
): PersistDebounceStepResult {
  if (event.kind === "persist/cancel") {
    return {
      state: { pending: false },
      intents: [{ kind: "timer/cancel", timer: { id: "persist-debounce" } }],
      actions: [],
    };
  }

  if (event.kind === "persist/request") {
    return {
      state: { pending: true },
      intents: [
        { kind: "timer/cancel", timer: { id: "persist-debounce" } },
        {
          kind: "timer/set",
          timer: { id: "persist-debounce", delayMs: PERSIST_DEBOUNCE_MS },
        },
      ],
      actions: [],
    };
  }

  if (event.kind === "timer/fired" && event.id === "persist-debounce") {
    if (!state.pending) {
      return { state, intents: [], actions: [] };
    }
    return {
      state: { pending: false },
      intents: [],
      actions: [{ kind: "flush" }],
    };
  }

  return { state, intents: [], actions: [] };
}
