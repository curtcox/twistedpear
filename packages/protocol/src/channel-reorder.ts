/**
 * Pure RNS Channel RX sequence acceptance, ring insertion, and contiguous drain.
 * Ring-sequence index conclusions leave via machine actions (no ad-hoc
 * `indexOfChannelRingSequence` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { CHANNEL_SEQ_MAX, CHANNEL_SEQ_MODULUS, nextChannelSequence } from "./channel-envelope.js";

/** Whether an inbound sequence is inside the acceptable RX window. */
export function shouldAcceptChannelSequence(input: {
  readonly sequence: number;
  readonly nextRxSequence: number;
  readonly windowMax: number;
}): boolean {
  if (input.sequence >= input.nextRxSequence) {
    return true;
  }

  const windowOverflow = (input.nextRxSequence + input.windowMax) % CHANNEL_SEQ_MODULUS;
  if (windowOverflow < input.nextRxSequence) {
    return input.sequence <= windowOverflow;
  }

  return false;
}

/**
 * Insert index for a sequence into an ordered ring, or null if duplicate.
 * `wrapBaseSequence` mirrors RNS Channel.next_rx_sequence used for wrap-aware ordering.
 */
export function channelEmplaceIndex(input: {
  readonly sequence: number;
  readonly ringSequences: readonly number[];
  readonly wrapBaseSequence: number;
}): number | null {
  for (const existing of input.ringSequences) {
    if (existing === input.sequence) {
      return null;
    }
  }

  for (let index = 0; index < input.ringSequences.length; index += 1) {
    const existing = input.ringSequences[index]!;
    if (
      input.sequence < existing &&
      !(input.wrapBaseSequence - input.sequence > CHANNEL_SEQ_MAX / 2)
    ) {
      return index;
    }
  }

  return input.ringSequences.length;
}

/** Whether an emplace index may insert into the RX/TX ring (duplicate → miss). */
export function shouldEmplaceChannelEnvelope(indexPresent: boolean): boolean {
  return indexPresent;
}

/**
 * Channel envelope emplace gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEmplaceChannelEnvelope`
 * reads beside the step).
 */
export type EmplaceChannelEnvelopeState = Record<string, never>;

export type EmplaceChannelEnvelopeEvent =
  | Event
  | {
      readonly kind: "channel/emplace-envelope-gate";
      readonly indexPresent: boolean;
    };

export type EmplaceChannelEnvelopeAction =
  | { readonly kind: "emplace" }
  | { readonly kind: "skip" };

export interface EmplaceChannelEnvelopeStepResult {
  readonly state: EmplaceChannelEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmplaceChannelEnvelopeAction[];
}

export function initialEmplaceChannelEnvelopeState(): EmplaceChannelEnvelopeState {
  return {};
}

export function stepEmplaceChannelEnvelopeWithActions(
  state: EmplaceChannelEnvelopeState,
  event: EmplaceChannelEnvelopeEvent
): EmplaceChannelEnvelopeStepResult {
  if (event.kind === "channel/emplace-envelope-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldEmplaceChannelEnvelope(event.indexPresent) ? "emplace" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldEmplaceChannelEnvelopeNow(
  actions: ReadonlyArray<EmplaceChannelEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "emplace");
}

export function shouldSkipEmplaceChannelEnvelope(
  actions: ReadonlyArray<EmplaceChannelEnvelopeAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether RX drain may splice/unpack a contiguous ring sequence by lookup index. */
export function shouldDrainChannelRingIndex(indexPresent: boolean): boolean {
  return indexPresent;
}

/** Index of `target` in a ring of sequences, or null if absent. */
export function indexOfChannelRingSequence(input: {
  readonly ringSequences: ReadonlyArray<number>;
  readonly target: number;
}): number | null {
  for (let index = 0; index < input.ringSequences.length; index += 1) {
    if (input.ringSequences[index] === input.target) {
      return index;
    }
  }
  return null;
}

/**
 * Channel ring-sequence index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfChannelRingSequence`
 * reads beside the step).
 */
export type IndexOfChannelRingSequenceState = Record<string, never>;

export type IndexOfChannelRingSequenceEvent =
  | Event
  | {
      readonly kind: "channel/ring-sequence-index-gate";
      readonly ringSequences: ReadonlyArray<number>;
      readonly target: number;
    };

export type IndexOfChannelRingSequenceAction =
  | { readonly kind: "use-index"; readonly index: number }
  | { readonly kind: "miss" };

export interface IndexOfChannelRingSequenceStepResult {
  readonly state: IndexOfChannelRingSequenceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfChannelRingSequenceAction[];
}

export function initialIndexOfChannelRingSequenceState(): IndexOfChannelRingSequenceState {
  return {};
}

export function stepIndexOfChannelRingSequenceWithActions(
  state: IndexOfChannelRingSequenceState,
  event: IndexOfChannelRingSequenceEvent
): IndexOfChannelRingSequenceStepResult {
  if (event.kind === "channel/ring-sequence-index-gate") {
    const index = indexOfChannelRingSequence({
      ringSequences: event.ringSequences,
      target: event.target
    });
    return {
      state,
      intents: [],
      actions:
        index === null
          ? [{ kind: "miss" }]
          : [{ kind: "use-index", index }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseChannelRingSequenceIndex(
  actions: ReadonlyArray<IndexOfChannelRingSequenceAction>
): boolean {
  return actions.some((action) => action.kind === "use-index");
}

export function shouldMissChannelRingSequenceIndex(
  actions: ReadonlyArray<IndexOfChannelRingSequenceAction>
): boolean {
  return actions.some((action) => action.kind === "miss");
}

/** Extract ring-sequence index from step actions; null when no `use-index`. */
export function channelRingSequenceIndexFromActions(
  actions: ReadonlyArray<IndexOfChannelRingSequenceAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-index");
  return action?.kind === "use-index" ? action.index : null;
}

export function insertChannelSequence(
  ringSequences: readonly number[],
  sequence: number,
  wrapBaseSequence: number
): { readonly inserted: boolean; readonly ring: readonly number[] } {
  const index = channelEmplaceIndex({ sequence, ringSequences, wrapBaseSequence });
  if (index === null) {
    return { inserted: false, ring: ringSequences };
  }
  const ring = [...ringSequences];
  ring.splice(index, 0, sequence);
  return { inserted: true, ring };
}

/** Drain contiguous sequences starting at nextRxSequence (in ring order). */
export function drainContiguousChannelSequences(input: {
  readonly ringSequences: readonly number[];
  readonly nextRxSequence: number;
}): {
  readonly contiguous: readonly number[];
  readonly remaining: readonly number[];
  readonly nextRxSequence: number;
} {
  const remaining = [...input.ringSequences];
  const contiguous: number[] = [];
  let nextRxSequence = input.nextRxSequence;

  // Walk a snapshot of original ring order like RNS Channel.receive.
  for (const sequence of input.ringSequences) {
    if (sequence === nextRxSequence) {
      contiguous.push(sequence);
      nextRxSequence = nextChannelSequence(nextRxSequence);
      const index = indexOfChannelRingSequence({ ringSequences: remaining, target: sequence });
      if (shouldDrainChannelRingIndex(index !== null)) {
        remaining.splice(index!, 1);
      }
    }
  }

  return { contiguous, remaining, nextRxSequence };
}
