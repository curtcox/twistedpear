/**
 * Pure RNS Channel RX sequence acceptance, ring insertion, and contiguous drain.
 */
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
      if (index !== null) {
        remaining.splice(index, 1);
      }
    }
  }

  return { contiguous, remaining, nextRxSequence };
}
