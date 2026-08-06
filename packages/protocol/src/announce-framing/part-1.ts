/** Extracted from announce-framing.ts; the original module remains the public composition point. */
/**
 * Pure RNS announce payload framing and signed-material assembly.
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / parse / validate / build / signed-material / destination-hash
 * material and match / packet-type conclusions leave via machine actions (no
 * ad-hoc `packAnnouncePayload` / `parseAnnouncePayload` /
 * `announceSignedMaterial` / `announceDestinationHashMaterial` /
 * `announceDestinationHashMatches` / `isAnnouncePacketType` / `plan` string
 * reads beside the step).
 * Payload / parsed-announce accept gates conclude via machine actions (no
 * ad-hoc `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` reads
 * beside the step).
 * Signature-attempt / destination-hash-check gates conclude via machine
 * actions (no ad-hoc `shouldAttemptAnnounceSignatureValidate` /
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_TYPE_ANNOUNCE } from "../packet-header.js";
import { equalByteArrays } from "../path-table.js";

export const ANNOUNCE_RANDOM_HASH_SIZE = 10;
export const ANNOUNCE_SIGNATURE_SIZE = 64;
export const ANNOUNCE_PUBLIC_KEY_SIZE = 64;
export const ANNOUNCE_NAME_HASH_SIZE = 10;
export const ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE = 32;

export interface AnnouncePayloadFields {
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly signature: Uint8Array;
  readonly appData: Uint8Array | null;
}

export function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}

export function announceSignedMaterial(input: {
  readonly destinationHash: Uint8Array;
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly appData: Uint8Array | null;
}): Uint8Array {
  return concatBytes(
    input.destinationHash,
    input.publicKey,
    input.nameHash,
    input.randomHash,
    input.ratchetPublicKey ?? new Uint8Array(),
    input.appData ?? new Uint8Array(),
  );
}

/**
 * Announce signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `announceSignedMaterial`
 * reads beside the step).
 */
export type AnnounceSignedMaterialState = Record<string, never>;

export type AnnounceSignedMaterialEvent =
  | Event
  | {
      readonly kind: "announce/signed-material-gate";
      readonly destinationHash: Uint8Array;
      readonly publicKey: Uint8Array;
      readonly nameHash: Uint8Array;
      readonly randomHash: Uint8Array;
      readonly ratchetPublicKey: Uint8Array | null;
      readonly appData: Uint8Array | null;
    };

export type AnnounceSignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface AnnounceSignedMaterialStepResult {
  readonly state: AnnounceSignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceSignedMaterialAction[];
}

export function initialAnnounceSignedMaterialState(): AnnounceSignedMaterialState {
  return {};
}

export function stepAnnounceSignedMaterialWithActions(
  state: AnnounceSignedMaterialState,
  event: AnnounceSignedMaterialEvent,
): AnnounceSignedMaterialStepResult {
  if (event.kind === "announce/signed-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: announceSignedMaterial({
            destinationHash: event.destinationHash,
            publicKey: event.publicKey,
            nameHash: event.nameHash,
            randomHash: event.randomHash,
            ratchetPublicKey: event.ratchetPublicKey,
            appData: event.appData,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAnnounceSignedMaterial(
  actions: ReadonlyArray<AnnounceSignedMaterialAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract announce signed material from step actions; null when no `use-raw`. */
export function announceSignedMaterialRawFromActions(
  actions: ReadonlyArray<AnnounceSignedMaterialAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

export function packAnnouncePayload(input: {
  readonly publicKey: Uint8Array;
  readonly nameHash: Uint8Array;
  readonly randomHash: Uint8Array;
  readonly ratchetPublicKey: Uint8Array | null;
  readonly signature: Uint8Array;
  readonly appData: Uint8Array | null;
}): Uint8Array {
  if (input.publicKey.length !== ANNOUNCE_PUBLIC_KEY_SIZE) {
    throw new Error(
      `Announce public key must be ${ANNOUNCE_PUBLIC_KEY_SIZE} bytes`,
    );
  }
  if (input.nameHash.length !== ANNOUNCE_NAME_HASH_SIZE) {
    throw new Error(
      `Announce name hash must be ${ANNOUNCE_NAME_HASH_SIZE} bytes`,
    );
  }
  if (input.randomHash.length !== ANNOUNCE_RANDOM_HASH_SIZE) {
    throw new Error(
      `Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`,
    );
  }
  if (
    input.ratchetPublicKey !== null &&
    input.ratchetPublicKey.length !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE
  ) {
    throw new Error(
      `Announce ratchet public key must be ${ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE} bytes`,
    );
  }
  if (input.signature.length !== ANNOUNCE_SIGNATURE_SIZE) {
    throw new Error(
      `Announce signature must be ${ANNOUNCE_SIGNATURE_SIZE} bytes`,
    );
  }

  return concatBytes(
    input.publicKey,
    input.nameHash,
    input.randomHash,
    input.ratchetPublicKey ?? new Uint8Array(),
    input.signature,
    input.appData ?? new Uint8Array(),
  );
}

export function parseAnnouncePayload(
  data: Uint8Array,
  hasRatchet: boolean,
): AnnouncePayloadFields | null {
  const ratchetLength = hasRatchet ? ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE : 0;
  const minimumLength =
    ANNOUNCE_PUBLIC_KEY_SIZE +
    ANNOUNCE_NAME_HASH_SIZE +
    ANNOUNCE_RANDOM_HASH_SIZE +
    ANNOUNCE_SIGNATURE_SIZE +
    ratchetLength;

  if (data.length < minimumLength) {
    return null;
  }

  let offset = 0;
  const publicKey = data.subarray(offset, offset + ANNOUNCE_PUBLIC_KEY_SIZE);
  offset += ANNOUNCE_PUBLIC_KEY_SIZE;
  const nameHash = data.subarray(offset, offset + ANNOUNCE_NAME_HASH_SIZE);
  offset += ANNOUNCE_NAME_HASH_SIZE;
  const randomHash = data.subarray(offset, offset + ANNOUNCE_RANDOM_HASH_SIZE);
  offset += ANNOUNCE_RANDOM_HASH_SIZE;
  const ratchetPublicKey = hasRatchet
    ? data.subarray(offset, offset + ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE)
    : null;
  offset += ratchetLength;
  const signature = data.subarray(offset, offset + ANNOUNCE_SIGNATURE_SIZE);
  offset += ANNOUNCE_SIGNATURE_SIZE;
  const appData = data.length > offset ? data.subarray(offset) : null;

  return {
    publicKey,
    nameHash,
    randomHash,
    ratchetPublicKey,
    signature,
    appData,
  };
}

/**
 * Announce payload pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packAnnouncePayload`
 * reads beside the step).
 */
export type PackAnnouncePayloadState = Record<string, never>;

export type PackAnnouncePayloadEvent =
  | Event
  | {
      readonly kind: "announce/pack-payload-gate";
      readonly publicKey: Uint8Array;
      readonly nameHash: Uint8Array;
      readonly randomHash: Uint8Array;
      readonly ratchetPublicKey: Uint8Array | null;
      readonly signature: Uint8Array;
      readonly appData: Uint8Array | null;
    };

export type PackAnnouncePayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface PackAnnouncePayloadStepResult {
  readonly state: PackAnnouncePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackAnnouncePayloadAction[];
}

export function initialPackAnnouncePayloadState(): PackAnnouncePayloadState {
  return {};
}

export function stepPackAnnouncePayloadWithActions(
  state: PackAnnouncePayloadState,
  event: PackAnnouncePayloadEvent,
): PackAnnouncePayloadStepResult {
  if (event.kind === "announce/pack-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: packAnnouncePayload({
            publicKey: event.publicKey,
            nameHash: event.nameHash,
            randomHash: event.randomHash,
            ratchetPublicKey: event.ratchetPublicKey,
            signature: event.signature,
            appData: event.appData,
          }),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackAnnouncePayload(
  actions: ReadonlyArray<PackAnnouncePayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract announce pack bytes from step actions; null when no `use-raw`. */
export function packAnnouncePayloadRawFromActions(
  actions: ReadonlyArray<PackAnnouncePayloadAction>,
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

/**
 * Announce payload parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parseAnnouncePayload`
 * reads beside the step).
 */
export type ParseAnnouncePayloadState = Record<string, never>;

export type ParseAnnouncePayloadEvent =
  | Event
  | {
      readonly kind: "announce/parse-payload-gate";
      readonly data: Uint8Array;
      readonly hasRatchet: boolean;
    };

export type ParseAnnouncePayloadAction =
  | { readonly kind: "use-fields"; readonly fields: AnnouncePayloadFields }
  | { readonly kind: "reject" };

export interface ParseAnnouncePayloadStepResult {
  readonly state: ParseAnnouncePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParseAnnouncePayloadAction[];
}

export function initialParseAnnouncePayloadState(): ParseAnnouncePayloadState {
  return {};
}

export function stepParseAnnouncePayloadWithActions(
  state: ParseAnnouncePayloadState,
  event: ParseAnnouncePayloadEvent,
): ParseAnnouncePayloadStepResult {
  if (event.kind === "announce/parse-payload-gate") {
    const fields = parseAnnouncePayload(event.data, event.hasRatchet);
    if (fields === null) {
      return { state, intents: [], actions: [{ kind: "reject" }] };
    }
    return {
      state,
      intents: [],
      actions: [{ kind: "use-fields", fields }],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseParseAnnouncePayload(
  actions: ReadonlyArray<ParseAnnouncePayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectParseAnnouncePayload(
  actions: ReadonlyArray<ParseAnnouncePayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract parsed announce payload fields from step actions; null when no `use-fields`. */
export function announcePayloadFieldsFromActions(
  actions: ReadonlyArray<ParseAnnouncePayloadAction>,
): AnnouncePayloadFields | null {
  const action = actions.find((entry) => entry.kind === "use-fields");
  return action?.kind === "use-fields" ? action.fields : null;
}

/** Whether announce payload fields parsed successfully and may be retained. */
export function shouldAcceptAnnouncePayload(fieldsPresent: boolean): boolean {
  return fieldsPresent;
}

/**
 * Announce payload accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptAnnouncePayload` reads beside the step).
 */
export type AcceptAnnouncePayloadState = Record<string, never>;

export type AcceptAnnouncePayloadEvent =
  | Event
  | {
      readonly kind: "announce/accept-payload-gate";
      readonly fieldsPresent: boolean;
    };

export type AcceptAnnouncePayloadAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptAnnouncePayloadStepResult {
  readonly state: AcceptAnnouncePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptAnnouncePayloadAction[];
}

export function initialAcceptAnnouncePayloadState(): AcceptAnnouncePayloadState {
  return {};
}

export function stepAcceptAnnouncePayloadWithActions(
  state: AcceptAnnouncePayloadState,
  event: AcceptAnnouncePayloadEvent,
): AcceptAnnouncePayloadStepResult {
  if (event.kind === "announce/accept-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptAnnouncePayload(event.fieldsPresent)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptAnnouncePayloadNow(
  actions: ReadonlyArray<AcceptAnnouncePayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAnnouncePayloadAccept(
  actions: ReadonlyArray<AcceptAnnouncePayloadAction>,
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Whether a validated announce parse result may enter handleAnnounce. */
export function shouldAcceptParsedAnnounce(parsedPresent: boolean): boolean {
  return parsedPresent;
}

/**
 * Parsed-announce accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAcceptParsedAnnounce` reads beside the step).
 */
export type AcceptParsedAnnounceState = Record<string, never>;

export type AcceptParsedAnnounceEvent =
  | Event
  | {
      readonly kind: "announce/accept-parsed-gate";
      readonly parsedPresent: boolean;
    };

export type AcceptParsedAnnounceAction =
  { readonly kind: "accept" } | { readonly kind: "skip" };

export interface AcceptParsedAnnounceStepResult {
  readonly state: AcceptParsedAnnounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptParsedAnnounceAction[];
}

export function initialAcceptParsedAnnounceState(): AcceptParsedAnnounceState {
  return {};
}
