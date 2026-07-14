/**
 * Pure RNS resource proof framing and decrypted-payload split.
 * Hashing / decrypt / link send stay at the adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packResourceProof` / `splitResourceProof` /
 * `splitResourceDecryptedPayload` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { equalByteArrays } from "./path-table.js";

export const RESOURCE_PROOF_HASH_SIZE = 32;
export const RESOURCE_PROOF_SIZE = RESOURCE_PROOF_HASH_SIZE * 2;
export const RESOURCE_RANDOM_HASH_SIZE = 4;

export interface ResourceProofFields {
  readonly resourceHash: Uint8Array;
  readonly proofHash: Uint8Array;
}

export function packResourceProof(
  resourceHash: Uint8Array,
  proofHash: Uint8Array
): Uint8Array {
  if (resourceHash.length !== RESOURCE_PROOF_HASH_SIZE) {
    throw new Error(`resource hash must be ${RESOURCE_PROOF_HASH_SIZE} bytes`);
  }
  if (proofHash.length !== RESOURCE_PROOF_HASH_SIZE) {
    throw new Error(`proof hash must be ${RESOURCE_PROOF_HASH_SIZE} bytes`);
  }
  const output = new Uint8Array(RESOURCE_PROOF_SIZE);
  output.set(resourceHash, 0);
  output.set(proofHash, RESOURCE_PROOF_HASH_SIZE);
  return output;
}

export function splitResourceProof(proofData: Uint8Array): ResourceProofFields | null {
  if (proofData.length !== RESOURCE_PROOF_SIZE) {
    return null;
  }
  return {
    resourceHash: proofData.subarray(0, RESOURCE_PROOF_HASH_SIZE),
    proofHash: proofData.subarray(RESOURCE_PROOF_HASH_SIZE)
  };
}

export function isValidResourceProof(
  proofData: Uint8Array,
  expectedProof: Uint8Array
): boolean {
  const split = splitResourceProof(proofData);
  if (split === null) {
    return false;
  }
  return equalByteArrays(split.proofHash, expectedProof);
}

/** Whether inbound RESOURCE_PRF bytes match the fixed proof length. */
export function shouldAcceptResourceProofPayload(dataLength: number): boolean {
  return dataLength === RESOURCE_PROOF_SIZE;
}

/** Whether a RESOURCE_PRF split produced hash halves. */
export function shouldAcceptResourceProofSplit(splitOk: boolean): boolean {
  return splitOk;
}

/** Whether a resource random-hash prefix has the RNS size. */
export function isValidResourceRandomHashLength(length: number): boolean {
  return length === RESOURCE_RANDOM_HASH_SIZE;
}

/** After link decrypt, drop the leading random-hash prefix. */
export function splitResourceDecryptedPayload(
  decrypted: Uint8Array,
  randomHashSize: number = RESOURCE_RANDOM_HASH_SIZE
): Uint8Array | null {
  if (decrypted.length < randomHashSize) {
    return null;
  }
  return decrypted.subarray(randomHashSize);
}

/**
 * Resource-proof pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packResourceProof`
 * reads beside the step).
 */
export type PackResourceProofState = Record<string, never>;

export type PackResourceProofEvent =
  | Event
  | {
      readonly kind: "resource-proof/pack-gate";
      readonly resourceHash: Uint8Array;
      readonly proofHash: Uint8Array;
    };

export type PackResourceProofAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackResourceProofStepResult {
  readonly state: PackResourceProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackResourceProofAction[];
}

export function initialPackResourceProofState(): PackResourceProofState {
  return {};
}

export function stepPackResourceProofWithActions(
  state: PackResourceProofState,
  event: PackResourceProofEvent
): PackResourceProofStepResult {
  if (event.kind === "resource-proof/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packResourceProof(event.resourceHash, event.proofHash)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackResourceProof(
  actions: ReadonlyArray<PackResourceProofAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract resource-proof pack bytes from step actions; null when no `use-raw`. */
export function packResourceProofRawFromActions(
  actions: ReadonlyArray<PackResourceProofAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource-proof split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitResourceProof`
 * reads beside the step).
 */
export type SplitResourceProofState = Record<string, never>;

export type SplitResourceProofEvent =
  | Event
  | {
      readonly kind: "resource-proof/split-gate";
      readonly proofData: Uint8Array;
    };

export type SplitResourceProofAction =
  | { readonly kind: "use-fields"; readonly fields: ResourceProofFields }
  | { readonly kind: "reject" };

export interface SplitResourceProofStepResult {
  readonly state: SplitResourceProofState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceProofAction[];
}

export function initialSplitResourceProofState(): SplitResourceProofState {
  return {};
}

export function stepSplitResourceProofWithActions(
  state: SplitResourceProofState,
  event: SplitResourceProofEvent
): SplitResourceProofStepResult {
  if (event.kind === "resource-proof/split-gate") {
    const fields = splitResourceProof(event.proofData);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitResourceProof(
  actions: ReadonlyArray<SplitResourceProofAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitResourceProof(
  actions: ReadonlyArray<SplitResourceProofAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split resource-proof fields from step actions; null when no `use-fields`. */
export function resourceProofFieldsFromActions(
  actions: ReadonlyArray<SplitResourceProofAction>
): ResourceProofFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Resource decrypted-payload split is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `splitResourceDecryptedPayload` reads beside the step).
 */
export type SplitResourceDecryptedPayloadState = Record<string, never>;

export type SplitResourceDecryptedPayloadEvent =
  | Event
  | {
      readonly kind: "resource-proof/split-decrypted-gate";
      readonly decrypted: Uint8Array;
      readonly randomHashSize?: number;
    };

export type SplitResourceDecryptedPayloadAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface SplitResourceDecryptedPayloadStepResult {
  readonly state: SplitResourceDecryptedPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitResourceDecryptedPayloadAction[];
}

export function initialSplitResourceDecryptedPayloadState(): SplitResourceDecryptedPayloadState {
  return {};
}

export function stepSplitResourceDecryptedPayloadWithActions(
  state: SplitResourceDecryptedPayloadState,
  event: SplitResourceDecryptedPayloadEvent
): SplitResourceDecryptedPayloadStepResult {
  if (event.kind === "resource-proof/split-decrypted-gate") {
    const raw = splitResourceDecryptedPayload(
      event.decrypted,
      event.randomHashSize ?? RESOURCE_RANDOM_HASH_SIZE
    );
    if (raw === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseSplitResourceDecryptedPayload(
  actions: ReadonlyArray<SplitResourceDecryptedPayloadAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectSplitResourceDecryptedPayload(
  actions: ReadonlyArray<SplitResourceDecryptedPayloadAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract decrypted payload bytes from step actions; null when no `use-raw`. */
export function resourceDecryptedPayloadFromActions(
  actions: ReadonlyArray<SplitResourceDecryptedPayloadAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
