/**
 * Pure RNS hash truncation sizes and slice helpers.
 * SHA itself stays at the crypto adapter edge.
 * Truncation conclusions leave via machine actions (no ad-hoc
 * `truncateHashBytes` / `truncateToNameHash` / `truncateToTruncatedHash`
 * reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { firstActionOfKind, hasActionOfKind } from "./action-kind.js";

/** TRUNCATED_HASH_LENGTH in bits (RNS Identity). */
export const TRUNCATED_HASH_BITS = 128;
/** Truncated hash length in bytes. */
export const TRUNCATED_HASH_BYTES = TRUNCATED_HASH_BITS / 8;

/** NAME_HASH_LENGTH in bits (RNS Destination / ratchet id). */
export const NAME_HASH_BITS = 80;
/** Name-hash length in bytes. */
export const NAME_HASH_BYTES = NAME_HASH_BITS / 8;

/** Truncate digest bytes to `length` (default RNS truncated hash). */
export function truncateHashBytes(
  digest: Uint8Array,
  length: number = TRUNCATED_HASH_BYTES,
): Uint8Array {
  if (length < 0) {
    throw new Error("hash truncation length must be non-negative");
  }
  if (digest.length < length) {
    throw new Error(`digest must be at least ${length} bytes`);
  }
  return digest.subarray(0, length);
}

export function truncateToNameHash(digest: Uint8Array): Uint8Array {
  return truncateHashBytes(digest, NAME_HASH_BYTES);
}

export function truncateToTruncatedHash(digest: Uint8Array): Uint8Array {
  return truncateHashBytes(digest, TRUNCATED_HASH_BYTES);
}

/**
 * Hash truncation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `truncateHashBytes` /
 * `truncateToNameHash` / `truncateToTruncatedHash` reads beside the step).
 * Undersized digests / invalid lengths become `reject`.
 */
export type TruncateHashBytesState = Record<string, never>;

export type TruncateHashBytesEvent =
  | Event
  | {
      readonly kind: "hash-truncate/truncate-gate";
      readonly digest: Uint8Array;
      readonly length?: number;
    };

export type TruncateHashBytesAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface TruncateHashBytesStepResult {
  readonly state: TruncateHashBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TruncateHashBytesAction[];
}

export function initialTruncateHashBytesState(): TruncateHashBytesState {
  return {};
}

export function stepTruncateHashBytesWithActions(
  state: TruncateHashBytesState,
  event: TruncateHashBytesEvent,
): TruncateHashBytesStepResult {
  if (event.kind === "hash-truncate/truncate-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: truncateHashBytes(
              event.digest,
              event.length ?? TRUNCATED_HASH_BYTES,
            ),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseTruncateHashBytes(
  actions: ReadonlyArray<TruncateHashBytesAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

export function shouldRejectTruncateHashBytes(
  actions: ReadonlyArray<TruncateHashBytesAction>,
): boolean {
  return hasActionOfKind(actions, "reject");
}

/** Extract truncated bytes from step actions; null when no `use-raw`. */
export function truncateHashBytesRawFromActions(
  actions: ReadonlyArray<TruncateHashBytesAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}
