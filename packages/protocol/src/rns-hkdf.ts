/**
 * Pure RNS-compatible HKDF-SHA256 (mirrors RNS/Cryptography/HKDF.py parameter handling).
 * Uses @noble/hashes — a pure algorithm dependency, not an IO surface.
 * HKDF conclusions leave via machine actions (no ad-hoc `rnsHkdfSha256` reads
 * beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { hkdf as nobleHkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha256.js";

export interface RnsHkdfInput {
  readonly length: number;
  readonly deriveFrom: Uint8Array;
  readonly salt?: Uint8Array | null;
  readonly context?: Uint8Array | null;
}

export interface NormalizedHkdfParams {
  readonly keyMaterial: Uint8Array;
  readonly salt: Uint8Array;
  readonly info: Uint8Array;
  readonly length: number;
}

export function normalizeRnsHkdfParams(
  input: RnsHkdfInput,
): NormalizedHkdfParams {
  if (input.length < 1) {
    throw new Error("Invalid output key length");
  }
  if (input.deriveFrom.length === 0) {
    throw new Error("Cannot derive key from empty input material");
  }

  const salt =
    input.salt === null || input.salt === undefined || input.salt.length === 0
      ? new Uint8Array(32)
      : input.salt;
  const info = input.context ?? new Uint8Array(0);

  return {
    keyMaterial: input.deriveFrom,
    salt,
    info,
    length: input.length,
  };
}

export function rnsHkdfSha256(input: RnsHkdfInput): Uint8Array {
  const params = normalizeRnsHkdfParams(input);
  return nobleHkdf(
    sha256,
    params.keyMaterial,
    params.salt,
    params.info,
    params.length,
  );
}

/**
 * RNS HKDF-SHA256 is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `rnsHkdfSha256` reads
 * beside the step). Invalid length / empty material become `reject`.
 */
export type RnsHkdfSha256State = Record<string, never>;

export type RnsHkdfSha256Event =
  | Event
  | {
      readonly kind: "rns-hkdf/derive-gate";
      readonly length: number;
      readonly deriveFrom: Uint8Array;
      readonly salt?: Uint8Array | null;
      readonly context?: Uint8Array | null;
    };

export type RnsHkdfSha256Action =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface RnsHkdfSha256StepResult {
  readonly state: RnsHkdfSha256State;
  readonly intents: readonly Intent[];
  readonly actions: readonly RnsHkdfSha256Action[];
}

export function initialRnsHkdfSha256State(): RnsHkdfSha256State {
  return {};
}

export function stepRnsHkdfSha256WithActions(
  state: RnsHkdfSha256State,
  event: RnsHkdfSha256Event,
): RnsHkdfSha256StepResult {
  if (event.kind === "rns-hkdf/derive-gate") {
    try {
      const input: RnsHkdfInput = {
        length: event.length,
        deriveFrom: event.deriveFrom,
        ...(event.salt !== undefined ? { salt: event.salt } : {}),
        ...(event.context !== undefined ? { context: event.context } : {}),
      };
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: rnsHkdfSha256(input),
          },
        ],
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseRnsHkdfSha256(
  actions: ReadonlyArray<RnsHkdfSha256Action>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectRnsHkdfSha256(
  actions: ReadonlyArray<RnsHkdfSha256Action>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract derived key bytes from step actions; null when no `use-raw`. */
export function rnsHkdfSha256RawFromActions(
  actions: ReadonlyArray<RnsHkdfSha256Action>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
