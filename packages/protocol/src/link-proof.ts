/**
 * Pure RNS link-request / link-proof signalling and payload layout helpers.
 * Pack / split / signalling encode conclusions leave via machine actions (no
 * ad-hoc `packLinkProofData` / `splitLinkProofBody` / `packLinkRequestData` /
 * `splitLinkRequestData` / `encodeLinkSignallingBytes` / `encodeLinkMtuBytes`
 * reads beside the step).
 */
import type { Event, Intent } from "@twistedpear/effects";

export const LINK_PROOF_SIGNATURE_SIZE = 64;
export const LINK_PROOF_PUBLIC_KEY_SIZE = 32;
export const LINK_PROOF_BODY_SIZE = LINK_PROOF_SIGNATURE_SIZE + LINK_PROOF_PUBLIC_KEY_SIZE;
export const LINK_PROOF_MTU_SIZE = 3;
export const LINK_REQUEST_ECPUB_SIZE = 64;
export const LINK_MTU_BYTEMASK = 0x1fffff;
export const LINK_MODE_BYTEMASK = 0xe0;

export type LinkProofPayloadKind = "body-only" | "body-with-mtu" | "invalid";

export function classifyLinkProofPayload(dataLength: number): LinkProofPayloadKind {
  if (dataLength === LINK_PROOF_BODY_SIZE) {
    return "body-only";
  }
  if (dataLength === LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE) {
    return "body-with-mtu";
  }
  return "invalid";
}

export interface LinkProofBodyFields {
  readonly signature: Uint8Array;
  readonly peerPublicKey: Uint8Array;
}

export function splitLinkProofBody(data: Uint8Array): LinkProofBodyFields | null {
  if (data.length < LINK_PROOF_BODY_SIZE) {
    return null;
  }
  return {
    signature: data.subarray(0, LINK_PROOF_SIGNATURE_SIZE),
    peerPublicKey: data.subarray(
      LINK_PROOF_SIGNATURE_SIZE,
      LINK_PROOF_SIGNATURE_SIZE + LINK_PROOF_PUBLIC_KEY_SIZE
    )
  };
}

export function encodeLinkSignallingBytes(mtu: number, mode: number): Uint8Array {
  const signallingValue = (mtu & LINK_MTU_BYTEMASK) + (((mode << 5) & LINK_MODE_BYTEMASK) << 16);
  const buffer = new ArrayBuffer(4);
  const view = new DataView(buffer);
  view.setUint32(0, signallingValue, false);
  return new Uint8Array(buffer).subarray(1);
}

export function decodeLinkModeFromSignallingByte(byte: number): number {
  return (byte & LINK_MODE_BYTEMASK) >> 5;
}

export function encodeLinkMtuBytes(mtu: number): Uint8Array {
  const value = mtu & 0xffffff;
  return new Uint8Array([(value >> 16) & 0xff, (value >> 8) & 0xff, value & 0xff]);
}

export function decodeLinkMtuFromBytes(bytes: Uint8Array): number {
  return ((bytes[0]! << 16) | (bytes[1]! << 8) | bytes[2]!) & LINK_MTU_BYTEMASK;
}

export function modeFromLinkRequestData(data: Uint8Array, defaultMode: number): number {
  if (data.length > LINK_REQUEST_ECPUB_SIZE) {
    return decodeLinkModeFromSignallingByte(data[LINK_REQUEST_ECPUB_SIZE]!);
  }
  return defaultMode;
}

export function mtuFromLinkRequestData(data: Uint8Array): number | null {
  if (data.length !== LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE) {
    return null;
  }
  return decodeLinkMtuFromBytes(data.subarray(LINK_REQUEST_ECPUB_SIZE));
}

export function modeFromLinkProofData(data: Uint8Array, defaultMode: number): number {
  if (data.length > LINK_PROOF_BODY_SIZE) {
    return decodeLinkModeFromSignallingByte(data[LINK_PROOF_BODY_SIZE]!);
  }
  return defaultMode;
}

export function mtuFromLinkProofData(data: Uint8Array): number | null {
  if (data.length !== LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE) {
    return null;
  }
  return decodeLinkMtuFromBytes(
    data.subarray(LINK_PROOF_BODY_SIZE, LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)
  );
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

/** Material signed for a link-request proof. */
export function linkProofSignedMaterial(
  linkId: Uint8Array,
  publicKey: Uint8Array,
  ownerSigPublicKey: Uint8Array,
  signallingBytes: Uint8Array
): Uint8Array {
  return concatBytes(linkId, publicKey, ownerSigPublicKey, signallingBytes);
}

/** Wire body for a link-request proof packet (optional signalling already appended by caller). */
export function packLinkProofData(
  signature: Uint8Array,
  publicKey: Uint8Array,
  signallingBytes: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (signature.length !== LINK_PROOF_SIGNATURE_SIZE) {
    throw new Error(`link proof signature must be ${LINK_PROOF_SIGNATURE_SIZE} bytes`);
  }
  if (publicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE) {
    throw new Error(`link proof public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`);
  }
  return concatBytes(signature, publicKey, signallingBytes);
}

export interface LinkRequestKeyFields {
  readonly publicKey: Uint8Array;
  readonly signaturePublicKey: Uint8Array;
  readonly signallingBytes: Uint8Array;
}

/** Pack initiator link-request payload: X25519 pub || Ed25519 pub || optional signalling. */
export function packLinkRequestData(
  publicKey: Uint8Array,
  signaturePublicKey: Uint8Array,
  signallingBytes: Uint8Array = new Uint8Array(0)
): Uint8Array {
  if (publicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE) {
    throw new Error(`link request public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`);
  }
  if (signaturePublicKey.length !== LINK_PROOF_PUBLIC_KEY_SIZE) {
    throw new Error(`link request signature public key must be ${LINK_PROOF_PUBLIC_KEY_SIZE} bytes`);
  }
  return concatBytes(publicKey, signaturePublicKey, signallingBytes);
}

export function splitLinkRequestData(data: Uint8Array): LinkRequestKeyFields | null {
  if (data.length !== LINK_REQUEST_ECPUB_SIZE && data.length !== LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE) {
    return null;
  }
  return {
    publicKey: data.subarray(0, LINK_PROOF_PUBLIC_KEY_SIZE),
    signaturePublicKey: data.subarray(LINK_PROOF_PUBLIC_KEY_SIZE, LINK_REQUEST_ECPUB_SIZE),
    signallingBytes:
      data.length === LINK_REQUEST_ECPUB_SIZE + LINK_PROOF_MTU_SIZE
        ? data.subarray(LINK_REQUEST_ECPUB_SIZE)
        : new Uint8Array(0)
  };
}

/** Truncate link-request hashable material when signalling bytes are present. */
export function linkRequestHashablePart(
  hashablePart: Uint8Array,
  requestDataLength: number
): Uint8Array {
  if (requestDataLength <= LINK_REQUEST_ECPUB_SIZE) {
    return hashablePart;
  }
  const diff = requestDataLength - LINK_REQUEST_ECPUB_SIZE;
  return hashablePart.subarray(0, hashablePart.length - diff);
}

/**
 * Link-proof pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkProofData`
 * reads beside the step).
 */
export type PackLinkProofDataState = Record<string, never>;

export type PackLinkProofDataEvent =
  | Event
  | {
      readonly kind: "link-proof/pack-gate";
      readonly signature: Uint8Array;
      readonly publicKey: Uint8Array;
      readonly signallingBytes: Uint8Array;
    };

export type PackLinkProofDataAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLinkProofDataStepResult {
  readonly state: PackLinkProofDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkProofDataAction[];
}

export function initialPackLinkProofDataState(): PackLinkProofDataState {
  return {};
}

export function stepPackLinkProofDataWithActions(
  state: PackLinkProofDataState,
  event: PackLinkProofDataEvent
): PackLinkProofDataStepResult {
  if (event.kind === "link-proof/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packLinkProofData(event.signature, event.publicKey, event.signallingBytes)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkProofData(
  actions: ReadonlyArray<PackLinkProofDataAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract link-proof pack bytes from step actions; null when no `use-raw`. */
export function packLinkProofDataRawFromActions(
  actions: ReadonlyArray<PackLinkProofDataAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Link-proof body split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLinkProofBody`
 * reads beside the step).
 */
export type SplitLinkProofBodyState = Record<string, never>;

export type SplitLinkProofBodyEvent =
  | Event
  | {
      readonly kind: "link-proof/split-body-gate";
      readonly data: Uint8Array;
    };

export type SplitLinkProofBodyAction =
  | { readonly kind: "use-fields"; readonly fields: LinkProofBodyFields }
  | { readonly kind: "reject" };

export interface SplitLinkProofBodyStepResult {
  readonly state: SplitLinkProofBodyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLinkProofBodyAction[];
}

export function initialSplitLinkProofBodyState(): SplitLinkProofBodyState {
  return {};
}

export function stepSplitLinkProofBodyWithActions(
  state: SplitLinkProofBodyState,
  event: SplitLinkProofBodyEvent
): SplitLinkProofBodyStepResult {
  if (event.kind === "link-proof/split-body-gate") {
    const fields = splitLinkProofBody(event.data);
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

export function shouldUseSplitLinkProofBody(
  actions: ReadonlyArray<SplitLinkProofBodyAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitLinkProofBody(
  actions: ReadonlyArray<SplitLinkProofBodyAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split link-proof body fields from step actions; null when no `use-fields`. */
export function linkProofBodyFieldsFromActions(
  actions: ReadonlyArray<SplitLinkProofBodyAction>
): LinkProofBodyFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Link-request pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkRequestData`
 * reads beside the step).
 */
export type PackLinkRequestDataState = Record<string, never>;

export type PackLinkRequestDataEvent =
  | Event
  | {
      readonly kind: "link-request/pack-gate";
      readonly publicKey: Uint8Array;
      readonly signaturePublicKey: Uint8Array;
      readonly signallingBytes: Uint8Array;
    };

export type PackLinkRequestDataAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackLinkRequestDataStepResult {
  readonly state: PackLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkRequestDataAction[];
}

export function initialPackLinkRequestDataState(): PackLinkRequestDataState {
  return {};
}

export function stepPackLinkRequestDataWithActions(
  state: PackLinkRequestDataState,
  event: PackLinkRequestDataEvent
): PackLinkRequestDataStepResult {
  if (event.kind === "link-request/pack-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packLinkRequestData(
            event.publicKey,
            event.signaturePublicKey,
            event.signallingBytes
          )
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackLinkRequestData(
  actions: ReadonlyArray<PackLinkRequestDataAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract link-request pack bytes from step actions; null when no `use-raw`. */
export function packLinkRequestDataRawFromActions(
  actions: ReadonlyArray<PackLinkRequestDataAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Link-request split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLinkRequestData`
 * reads beside the step).
 */
export type SplitLinkRequestDataState = Record<string, never>;

export type SplitLinkRequestDataEvent =
  | Event
  | {
      readonly kind: "link-request/split-gate";
      readonly data: Uint8Array;
    };

export type SplitLinkRequestDataAction =
  | { readonly kind: "use-fields"; readonly fields: LinkRequestKeyFields }
  | { readonly kind: "reject" };

export interface SplitLinkRequestDataStepResult {
  readonly state: SplitLinkRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLinkRequestDataAction[];
}

export function initialSplitLinkRequestDataState(): SplitLinkRequestDataState {
  return {};
}

export function stepSplitLinkRequestDataWithActions(
  state: SplitLinkRequestDataState,
  event: SplitLinkRequestDataEvent
): SplitLinkRequestDataStepResult {
  if (event.kind === "link-request/split-gate") {
    const fields = splitLinkRequestData(event.data);
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

export function shouldUseSplitLinkRequestData(
  actions: ReadonlyArray<SplitLinkRequestDataAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectSplitLinkRequestData(
  actions: ReadonlyArray<SplitLinkRequestDataAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract split link-request fields from step actions; null when no `use-fields`. */
export function linkRequestKeyFieldsFromActions(
  actions: ReadonlyArray<SplitLinkRequestDataAction>
): LinkRequestKeyFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/**
 * Link signalling-byte encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeLinkSignallingBytes`
 * reads beside the step).
 */
export type EncodeLinkSignallingBytesState = Record<string, never>;

export type EncodeLinkSignallingBytesEvent =
  | Event
  | {
      readonly kind: "link-proof/encode-signalling-gate";
      readonly mtu: number;
      readonly mode: number;
    };

export type EncodeLinkSignallingBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface EncodeLinkSignallingBytesStepResult {
  readonly state: EncodeLinkSignallingBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeLinkSignallingBytesAction[];
}

export function initialEncodeLinkSignallingBytesState(): EncodeLinkSignallingBytesState {
  return {};
}

export function stepEncodeLinkSignallingBytesWithActions(
  state: EncodeLinkSignallingBytesState,
  event: EncodeLinkSignallingBytesEvent
): EncodeLinkSignallingBytesStepResult {
  if (event.kind === "link-proof/encode-signalling-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: encodeLinkSignallingBytes(event.mtu, event.mode)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeLinkSignallingBytes(
  actions: ReadonlyArray<EncodeLinkSignallingBytesAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract encoded signalling bytes from step actions; null when no `use-raw`. */
export function encodeLinkSignallingBytesRawFromActions(
  actions: ReadonlyArray<EncodeLinkSignallingBytesAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Link MTU-byte encode framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `encodeLinkMtuBytes` reads
 * beside the step).
 */
export type EncodeLinkMtuBytesState = Record<string, never>;

export type EncodeLinkMtuBytesEvent =
  | Event
  | {
      readonly kind: "link-proof/encode-mtu-gate";
      readonly mtu: number;
    };

export type EncodeLinkMtuBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface EncodeLinkMtuBytesStepResult {
  readonly state: EncodeLinkMtuBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EncodeLinkMtuBytesAction[];
}

export function initialEncodeLinkMtuBytesState(): EncodeLinkMtuBytesState {
  return {};
}

export function stepEncodeLinkMtuBytesWithActions(
  state: EncodeLinkMtuBytesState,
  event: EncodeLinkMtuBytesEvent
): EncodeLinkMtuBytesStepResult {
  if (event.kind === "link-proof/encode-mtu-gate") {
    return {
      state,
      intents: [],
      actions: [{ kind: "use-raw", raw: encodeLinkMtuBytes(event.mtu) }]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseEncodeLinkMtuBytes(
  actions: ReadonlyArray<EncodeLinkMtuBytesAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract encoded MTU bytes from step actions; null when no `use-raw`. */
export function encodeLinkMtuBytesRawFromActions(
  actions: ReadonlyArray<EncodeLinkMtuBytesAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}
