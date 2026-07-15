/**
 * Pure shared byte-array helpers used by protocol leaves.
 * Assemble conclusions leave via machine actions (no ad-hoc
 * `assembleByteArrays` reads beside the step).
 */

import type { Event, Intent } from "@twistedpear/effects";

export function concatByteArrays(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function assembleByteArrays(parts: ReadonlyArray<Uint8Array>): Uint8Array {
  return concatByteArrays(...parts);
}

/**
 * Byte-array assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `assembleByteArrays`
 * reads beside the step).
 */
export type AssembleByteArraysState = Record<string, never>;

export type AssembleByteArraysEvent =
  | Event
  | {
      readonly kind: "bytes/assemble-gate";
      readonly parts: ReadonlyArray<Uint8Array>;
    };

export type AssembleByteArraysAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface AssembleByteArraysStepResult {
  readonly state: AssembleByteArraysState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AssembleByteArraysAction[];
}

export function initialAssembleByteArraysState(): AssembleByteArraysState {
  return {};
}

export function stepAssembleByteArraysWithActions(
  state: AssembleByteArraysState,
  event: AssembleByteArraysEvent
): AssembleByteArraysStepResult {
  if (event.kind === "bytes/assemble-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: assembleByteArrays(event.parts)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAssembleByteArrays(
  actions: ReadonlyArray<AssembleByteArraysAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract assembled bytes from step actions; null when no `use-raw`. */
export function assembleByteArraysRawFromActions(
  actions: ReadonlyArray<AssembleByteArraysAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
