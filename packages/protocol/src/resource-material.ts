/**
 * Pure RNS resource hash-input / encrypt-payload material helpers.
 * SHA / encrypt stay at the crypto adapter edge.
 * Material conclusions leave via machine actions (no ad-hoc
 * `resourceEncryptMaterial` / `resourceHashMaterial` /
 * `resourceExpectedProofMaterial` / `resourcePartMapHashMaterial` /
 * `computeResourceTotalParts` reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import { RESOURCE_RANDOM_HASH_SIZE } from "./resource-proof.js";

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

/** Plaintext encrypted on the wire: randomHash || data. */
export function resourceEncryptMaterial(randomHash: Uint8Array, data: Uint8Array): Uint8Array {
  if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
    throw new Error(`resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
  }
  return concatBytes(randomHash, data);
}

/** Material hashed for the resource identity hash: data || randomHash. */
export function resourceHashMaterial(data: Uint8Array, randomHash: Uint8Array): Uint8Array {
  if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
    throw new Error(`resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
  }
  return concatBytes(data, randomHash);
}

/** Material hashed for the expected proof: data || resourceHash. */
export function resourceExpectedProofMaterial(data: Uint8Array, resourceHash: Uint8Array): Uint8Array {
  return concatBytes(data, resourceHash);
}

/** Material hashed (then truncated) for a part map-hash: partData || randomHash. */
export function resourcePartMapHashMaterial(partData: Uint8Array, randomHash: Uint8Array): Uint8Array {
  if (randomHash.length !== RESOURCE_RANDOM_HASH_SIZE) {
    throw new Error(`resource random hash must be ${RESOURCE_RANDOM_HASH_SIZE} bytes`);
  }
  return concatBytes(partData, randomHash);
}

/** Number of SDU-sized parts needed for an encrypted resource payload. */
export function computeResourceTotalParts(length: number, sdu: number): number {
  return Math.ceil(length / sdu);
}

/**
 * Resource encrypt material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `resourceEncryptMaterial`
 * reads beside the step). Bad random-hash length becomes `reject`.
 */
export type ResourceEncryptMaterialState = Record<string, never>;

export type ResourceEncryptMaterialEvent =
  | Event
  | {
      readonly kind: "resource-material/encrypt-gate";
      readonly randomHash: Uint8Array;
      readonly data: Uint8Array;
    };

export type ResourceEncryptMaterialAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface ResourceEncryptMaterialStepResult {
  readonly state: ResourceEncryptMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceEncryptMaterialAction[];
}

export function initialResourceEncryptMaterialState(): ResourceEncryptMaterialState {
  return {};
}

export function stepResourceEncryptMaterialWithActions(
  state: ResourceEncryptMaterialState,
  event: ResourceEncryptMaterialEvent
): ResourceEncryptMaterialStepResult {
  if (event.kind === "resource-material/encrypt-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: resourceEncryptMaterial(event.randomHash, event.data)
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseResourceEncryptMaterial(
  actions: ReadonlyArray<ResourceEncryptMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectResourceEncryptMaterial(
  actions: ReadonlyArray<ResourceEncryptMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract encrypt material bytes from step actions; null when no `use-raw`. */
export function resourceEncryptMaterialRawFromActions(
  actions: ReadonlyArray<ResourceEncryptMaterialAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `resourceHashMaterial`
 * reads beside the step). Bad random-hash length becomes `reject`.
 */
export type ResourceHashMaterialState = Record<string, never>;

export type ResourceHashMaterialEvent =
  | Event
  | {
      readonly kind: "resource-material/hash-gate";
      readonly data: Uint8Array;
      readonly randomHash: Uint8Array;
    };

export type ResourceHashMaterialAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface ResourceHashMaterialStepResult {
  readonly state: ResourceHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceHashMaterialAction[];
}

export function initialResourceHashMaterialState(): ResourceHashMaterialState {
  return {};
}

export function stepResourceHashMaterialWithActions(
  state: ResourceHashMaterialState,
  event: ResourceHashMaterialEvent
): ResourceHashMaterialStepResult {
  if (event.kind === "resource-material/hash-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: resourceHashMaterial(event.data, event.randomHash)
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseResourceHashMaterial(
  actions: ReadonlyArray<ResourceHashMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectResourceHashMaterial(
  actions: ReadonlyArray<ResourceHashMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract hash material bytes from step actions; null when no `use-raw`. */
export function resourceHashMaterialRawFromActions(
  actions: ReadonlyArray<ResourceHashMaterialAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource expected-proof material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `resourceExpectedProofMaterial` reads beside the step).
 */
export type ResourceExpectedProofMaterialState = Record<string, never>;

export type ResourceExpectedProofMaterialEvent =
  | Event
  | {
      readonly kind: "resource-material/expected-proof-gate";
      readonly data: Uint8Array;
      readonly resourceHash: Uint8Array;
    };

export type ResourceExpectedProofMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface ResourceExpectedProofMaterialStepResult {
  readonly state: ResourceExpectedProofMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceExpectedProofMaterialAction[];
}

export function initialResourceExpectedProofMaterialState(): ResourceExpectedProofMaterialState {
  return {};
}

export function stepResourceExpectedProofMaterialWithActions(
  state: ResourceExpectedProofMaterialState,
  event: ResourceExpectedProofMaterialEvent
): ResourceExpectedProofMaterialStepResult {
  if (event.kind === "resource-material/expected-proof-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: resourceExpectedProofMaterial(event.data, event.resourceHash)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseResourceExpectedProofMaterial(
  actions: ReadonlyArray<ResourceExpectedProofMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract expected-proof material bytes from step actions; null when no `use-raw`. */
export function resourceExpectedProofMaterialRawFromActions(
  actions: ReadonlyArray<ResourceExpectedProofMaterialAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource part map-hash material is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `resourcePartMapHashMaterial` reads beside the step). Bad random-hash length
 * becomes `reject`.
 */
export type ResourcePartMapHashMaterialState = Record<string, never>;

export type ResourcePartMapHashMaterialEvent =
  | Event
  | {
      readonly kind: "resource-material/part-map-hash-gate";
      readonly partData: Uint8Array;
      readonly randomHash: Uint8Array;
    };

export type ResourcePartMapHashMaterialAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface ResourcePartMapHashMaterialStepResult {
  readonly state: ResourcePartMapHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourcePartMapHashMaterialAction[];
}

export function initialResourcePartMapHashMaterialState(): ResourcePartMapHashMaterialState {
  return {};
}

export function stepResourcePartMapHashMaterialWithActions(
  state: ResourcePartMapHashMaterialState,
  event: ResourcePartMapHashMaterialEvent
): ResourcePartMapHashMaterialStepResult {
  if (event.kind === "resource-material/part-map-hash-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: resourcePartMapHashMaterial(event.partData, event.randomHash)
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseResourcePartMapHashMaterial(
  actions: ReadonlyArray<ResourcePartMapHashMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectResourcePartMapHashMaterial(
  actions: ReadonlyArray<ResourcePartMapHashMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract part map-hash material bytes from step actions; null when no `use-raw`. */
export function resourcePartMapHashMaterialRawFromActions(
  actions: ReadonlyArray<ResourcePartMapHashMaterialAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Resource total-parts computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computeResourceTotalParts`
 * reads beside the step).
 */
export type ComputeResourceTotalPartsState = Record<string, never>;

export type ComputeResourceTotalPartsEvent =
  | Event
  | {
      readonly kind: "resource-material/total-parts-gate";
      readonly length: number;
      readonly sdu: number;
    };

export type ComputeResourceTotalPartsAction = {
  readonly kind: "use-parts";
  readonly parts: number;
};

export interface ComputeResourceTotalPartsStepResult {
  readonly state: ComputeResourceTotalPartsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputeResourceTotalPartsAction[];
}

export function initialComputeResourceTotalPartsState(): ComputeResourceTotalPartsState {
  return {};
}

export function stepComputeResourceTotalPartsWithActions(
  state: ComputeResourceTotalPartsState,
  event: ComputeResourceTotalPartsEvent
): ComputeResourceTotalPartsStepResult {
  if (event.kind === "resource-material/total-parts-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-parts",
          parts: computeResourceTotalParts(event.length, event.sdu)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseComputeResourceTotalParts(
  actions: ReadonlyArray<ComputeResourceTotalPartsAction>
): boolean {
  return actions.some((action) => action.kind === "use-parts");
}

/** Extract total parts from step actions; null when no `use-parts`. */
export function resourceTotalPartsFromActions(
  actions: ReadonlyArray<ComputeResourceTotalPartsAction>
): number | null {
  const action = actions.find((entry) => entry.kind === "use-parts");
  return action?.kind === "use-parts" ? action.parts : null;
}
