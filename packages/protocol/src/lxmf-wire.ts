/**
 * Pure LXMF outer wire framing (destination || source || signature || payload).
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / split conclusions leave via machine actions (no ad-hoc
 * `packLxmfWire` / `splitLxmfWire` / `packLxmfDestinationPrefixed` /
 * `splitLxmfDestinationPrefixed` / `lxmfInboundDeliveryBytes` reads beside
 * the step).
 */
import type { Event, Intent } from "@twistedpear/effects";
import {
  LXMF_DESTINATION_LENGTH,
  LXMF_SIGNATURE_LENGTH,
  LxmfDeliveryMethod,
  type LxmfDeliveryMethodValue
} from "./lxmf-delivery.js";

export const LXMF_WIRE_HEADER_SIZE = 2 * LXMF_DESTINATION_LENGTH + LXMF_SIGNATURE_LENGTH;

export interface LxmfWireFields {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
}

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

export function packLxmfWire(input: {
  readonly destinationHash: Uint8Array;
  readonly sourceHash: Uint8Array;
  readonly signature: Uint8Array;
  readonly payload: Uint8Array;
}): Uint8Array {
  if (input.destinationHash.length !== LXMF_DESTINATION_LENGTH) {
    throw new Error(`destination hash must be ${LXMF_DESTINATION_LENGTH} bytes`);
  }
  if (input.sourceHash.length !== LXMF_DESTINATION_LENGTH) {
    throw new Error(`source hash must be ${LXMF_DESTINATION_LENGTH} bytes`);
  }
  if (input.signature.length !== LXMF_SIGNATURE_LENGTH) {
    throw new Error(`signature must be ${LXMF_SIGNATURE_LENGTH} bytes`);
  }
  return concatBytes(input.destinationHash, input.sourceHash, input.signature, input.payload);
}

export function splitLxmfWire(bytes: Uint8Array): LxmfWireFields | null {
  if (bytes.length < LXMF_WIRE_HEADER_SIZE + 1) {
    return null;
  }
  return {
    destinationHash: bytes.subarray(0, LXMF_DESTINATION_LENGTH),
    sourceHash: bytes.subarray(LXMF_DESTINATION_LENGTH, 2 * LXMF_DESTINATION_LENGTH),
    signature: bytes.subarray(2 * LXMF_DESTINATION_LENGTH, LXMF_WIRE_HEADER_SIZE),
    payload: bytes.subarray(LXMF_WIRE_HEADER_SIZE)
  };
}

/** Material hashed for the message hash: destination || source || payloadWithoutStamp. */
export function lxmfHashableMaterial(
  destinationHash: Uint8Array,
  sourceHash: Uint8Array,
  payloadWithoutStamp: Uint8Array
): Uint8Array {
  return concatBytes(destinationHash, sourceHash, payloadWithoutStamp);
}

/** Material signed: hashableMaterial || messageHash. */
export function lxmfSignedMaterial(hashableMaterial: Uint8Array, messageHash: Uint8Array): Uint8Array {
  return concatBytes(hashableMaterial, messageHash);
}

export function lxmfOpportunisticPayload(packed: Uint8Array): Uint8Array {
  if (packed.length < LXMF_DESTINATION_LENGTH) {
    throw new Error("LXMF packed bytes too short for opportunistic payload");
  }
  return packed.subarray(LXMF_DESTINATION_LENGTH);
}

/** Rebuild full LXMF bytes when an opportunistic packet carries only the trailing segment. */
export function lxmfInboundDeliveryBytes(
  method: LxmfDeliveryMethodValue,
  destinationHash: Uint8Array,
  packetData: Uint8Array
): Uint8Array {
  if (method === LxmfDeliveryMethod.OPPORTUNISTIC) {
    return concatBytes(destinationHash, packetData);
  }
  return packetData;
}

export interface LxmfDestinationPrefixed {
  readonly destinationHash: Uint8Array;
  readonly remainder: Uint8Array;
}

/** Split destination-hash-prefixed LXMF / propagation envelopes. */
export function splitLxmfDestinationPrefixed(bytes: Uint8Array): LxmfDestinationPrefixed | null {
  if (bytes.length < LXMF_DESTINATION_LENGTH) {
    return null;
  }
  return {
    destinationHash: bytes.subarray(0, LXMF_DESTINATION_LENGTH),
    remainder: bytes.subarray(LXMF_DESTINATION_LENGTH)
  };
}

export function packLxmfDestinationPrefixed(
  destinationHash: Uint8Array,
  remainder: Uint8Array
): Uint8Array {
  if (destinationHash.length !== LXMF_DESTINATION_LENGTH) {
    throw new Error(`destination hash must be ${LXMF_DESTINATION_LENGTH} bytes`);
  }
  return concatBytes(destinationHash, remainder);
}

/**
 * LXMF outer-wire pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLxmfWire` reads beside
 * the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackLxmfWireState = Record<string, never>;

export type PackLxmfWireEvent =
  | Event
  | {
      readonly kind: "lxmf-wire/pack-gate";
      readonly destinationHash: Uint8Array;
      readonly sourceHash: Uint8Array;
      readonly signature: Uint8Array;
      readonly payload: Uint8Array;
    };

export type PackLxmfWireAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackLxmfWireStepResult {
  readonly state: PackLxmfWireState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLxmfWireAction[];
}

export function initialPackLxmfWireState(): PackLxmfWireState {
  return {};
}

export function stepPackLxmfWireWithActions(
  state: PackLxmfWireState,
  event: PackLxmfWireEvent
): PackLxmfWireStepResult {
  if (event.kind === "lxmf-wire/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packLxmfWire({
              destinationHash: event.destinationHash,
              sourceHash: event.sourceHash,
              signature: event.signature,
              payload: event.payload
            })
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLxmfWire(actions: ReadonlyArray<PackLxmfWireAction>): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackLxmfWire(actions: ReadonlyArray<PackLxmfWireAction>): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed LXMF wire bytes from step actions; null when no `use-raw`. */
export function packLxmfWireRawFromActions(
  actions: ReadonlyArray<PackLxmfWireAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * LXMF outer-wire split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLxmfWire` reads beside
 * the step). Short frames become `reject`.
 */
export type SplitLxmfWireState = Record<string, never>;

export type SplitLxmfWireEvent =
  | Event
  | {
      readonly kind: "lxmf-wire/split-gate";
      readonly bytes: Uint8Array;
    };

export type SplitLxmfWireAction =
  | { readonly kind: "use-fields"; readonly fields: LxmfWireFields }
  | { readonly kind: "reject" };

export interface SplitLxmfWireStepResult {
  readonly state: SplitLxmfWireState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLxmfWireAction[];
}

export function initialSplitLxmfWireState(): SplitLxmfWireState {
  return {};
}

export function stepSplitLxmfWireWithActions(
  state: SplitLxmfWireState,
  event: SplitLxmfWireEvent
): SplitLxmfWireStepResult {
  if (event.kind === "lxmf-wire/split-gate") {
    const fields = splitLxmfWire(event.bytes);
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

export function shouldUseSplitLxmfWire(actions: ReadonlyArray<SplitLxmfWireAction>): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitLxmfWire(actions: ReadonlyArray<SplitLxmfWireAction>): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split LXMF wire fields from step actions; null when no `use-fields`. */
export function lxmfWireFieldsFromActions(
  actions: ReadonlyArray<SplitLxmfWireAction>
): LxmfWireFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Destination-prefixed pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLxmfDestinationPrefixed`
 * reads beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackLxmfDestinationPrefixedState = Record<string, never>;

export type PackLxmfDestinationPrefixedEvent =
  | Event
  | {
      readonly kind: "lxmf-destination-prefixed/pack-gate";
      readonly destinationHash: Uint8Array;
      readonly remainder: Uint8Array;
    };

export type PackLxmfDestinationPrefixedAction =
  | { readonly kind: "use-raw"; readonly raw: Uint8Array }
  | { readonly kind: "reject" };

export interface PackLxmfDestinationPrefixedStepResult {
  readonly state: PackLxmfDestinationPrefixedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLxmfDestinationPrefixedAction[];
}

export function initialPackLxmfDestinationPrefixedState(): PackLxmfDestinationPrefixedState {
  return {};
}

export function stepPackLxmfDestinationPrefixedWithActions(
  state: PackLxmfDestinationPrefixedState,
  event: PackLxmfDestinationPrefixedEvent
): PackLxmfDestinationPrefixedStepResult {
  if (event.kind === "lxmf-destination-prefixed/pack-gate") {
    try {
      return {
        state,
        intents: [],
        actions: [
          {
            kind: "use-raw",
            raw: packLxmfDestinationPrefixed(event.destinationHash, event.remainder)
          }
        ]
      };
    } catch {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLxmfDestinationPrefixed(
  actions: ReadonlyArray<PackLxmfDestinationPrefixedAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

export function shouldRejectPackLxmfDestinationPrefixed(
  actions: ReadonlyArray<PackLxmfDestinationPrefixedAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract packed destination-prefixed bytes from step actions; null when no `use-raw`. */
export function packLxmfDestinationPrefixedRawFromActions(
  actions: ReadonlyArray<PackLxmfDestinationPrefixedAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Destination-prefixed split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLxmfDestinationPrefixed`
 * reads beside the step). Short frames become `reject`.
 */
export type SplitLxmfDestinationPrefixedState = Record<string, never>;

export type SplitLxmfDestinationPrefixedEvent =
  | Event
  | {
      readonly kind: "lxmf-destination-prefixed/split-gate";
      readonly bytes: Uint8Array;
    };

export type SplitLxmfDestinationPrefixedAction =
  | { readonly kind: "use-fields"; readonly fields: LxmfDestinationPrefixed }
  | { readonly kind: "reject" };

export interface SplitLxmfDestinationPrefixedStepResult {
  readonly state: SplitLxmfDestinationPrefixedState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLxmfDestinationPrefixedAction[];
}

export function initialSplitLxmfDestinationPrefixedState(): SplitLxmfDestinationPrefixedState {
  return {};
}

export function stepSplitLxmfDestinationPrefixedWithActions(
  state: SplitLxmfDestinationPrefixedState,
  event: SplitLxmfDestinationPrefixedEvent
): SplitLxmfDestinationPrefixedStepResult {
  if (event.kind === "lxmf-destination-prefixed/split-gate") {
    const fields = splitLxmfDestinationPrefixed(event.bytes);
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

export function shouldUseSplitLxmfDestinationPrefixed(
  actions: ReadonlyArray<SplitLxmfDestinationPrefixedAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitLxmfDestinationPrefixed(
  actions: ReadonlyArray<SplitLxmfDestinationPrefixedAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split destination-prefixed fields from step actions; null when no `use-fields`. */
export function lxmfDestinationPrefixedFieldsFromActions(
  actions: ReadonlyArray<SplitLxmfDestinationPrefixedAction>
): LxmfDestinationPrefixed | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Inbound delivery rebuild is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `lxmfInboundDeliveryBytes`
 * reads beside the step).
 */
export type LxmfInboundDeliveryState = Record<string, never>;

export type LxmfInboundDeliveryEvent =
  | Event
  | {
      readonly kind: "lxmf-inbound-delivery/rebuild-gate";
      readonly method: LxmfDeliveryMethodValue;
      readonly destinationHash: Uint8Array;
      readonly packetData: Uint8Array;
    };

export type LxmfInboundDeliveryAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface LxmfInboundDeliveryStepResult {
  readonly state: LxmfInboundDeliveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfInboundDeliveryAction[];
}

export function initialLxmfInboundDeliveryState(): LxmfInboundDeliveryState {
  return {};
}

export function stepLxmfInboundDeliveryWithActions(
  state: LxmfInboundDeliveryState,
  event: LxmfInboundDeliveryEvent
): LxmfInboundDeliveryStepResult {
  if (event.kind === "lxmf-inbound-delivery/rebuild-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: lxmfInboundDeliveryBytes(event.method, event.destinationHash, event.packetData)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseLxmfInboundDelivery(
  actions: ReadonlyArray<LxmfInboundDeliveryAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract inbound-delivery rebuild bytes from step actions; null when no `use-raw`. */
export function lxmfInboundDeliveryRawFromActions(
  actions: ReadonlyArray<LxmfInboundDeliveryAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
