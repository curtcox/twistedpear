/**
 * Pure shared byte-array helpers used by protocol leaves.
 * Assemble conclusions leave via machine actions (no ad-hoc
 * `assembleByteArrays` reads beside the step).
 */

import type { Event, Intent } from "@twistedpear/effects";

export function concatByteArrays(
  ...parts: ReadonlyArray<Uint8Array>
): Uint8Array {
  return assembleByteArrays(parts);
}

/**
 * The array form is the primitive, and the variadic `concatByteArrays` wraps
 * it — not the other way round. A resource hashmap has one entry per part, so
 * a 100 MB transfer assembles hundreds of thousands of arrays; spreading that
 * into an argument list overflows the call stack.
 */
export function assembleByteArrays(
  parts: ReadonlyArray<Uint8Array>,
): Uint8Array {
  let length = 0;
  for (const part of parts) {
    length += part.length;
  }
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
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
  event: AssembleByteArraysEvent,
): AssembleByteArraysStepResult {
  if (event.kind === "bytes/assemble-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: assembleByteArrays(event.parts),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAssembleByteArrays(
  actions: ReadonlyArray<AssembleByteArraysAction>,
): boolean {
  return actions.length > 0;
}

/** Extract assembled bytes from step actions; null when no `use-raw`. */
export function assembleByteArraysRawFromActions(
  actions: ReadonlyArray<AssembleByteArraysAction>,
): Uint8Array | null {
  return actions[0]?.raw ?? null;
}
