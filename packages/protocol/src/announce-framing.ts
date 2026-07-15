/**
 * Pure RNS announce payload framing and signed-material assembly.
 * Signing / hashing stay at the crypto adapter edge.
 * Pack / parse / validate / build / signed-material / destination-hash
 * material and match conclusions leave via machine actions (no ad-hoc
 * `packAnnouncePayload` / `parseAnnouncePayload` / `announceSignedMaterial` /
 * `announceDestinationHashMaterial` / `announceDestinationHashMatches` /
 * `plan` string reads beside the step).
 * Payload / parsed-announce accept gates conclude via machine actions (no
 * ad-hoc `shouldAcceptAnnouncePayload` / `shouldAcceptParsedAnnounce` reads
 * beside the step).
 * Signature-attempt / destination-hash-check gates conclude via machine
 * actions (no ad-hoc `shouldAttemptAnnounceSignatureValidate` /
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
 */
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { PACKET_TYPE_ANNOUNCE } from "./packet-header.js";
import { equalByteArrays } from "./path-table.js";

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
    input.appData ?? new Uint8Array()
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
  event: AnnounceSignedMaterialEvent
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
            appData: event.appData
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAnnounceSignedMaterial(
  actions: ReadonlyArray<AnnounceSignedMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract announce signed material from step actions; null when no `use-raw`. */
export function announceSignedMaterialRawFromActions(
  actions: ReadonlyArray<AnnounceSignedMaterialAction>
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
    throw new Error(`Announce public key must be ${ANNOUNCE_PUBLIC_KEY_SIZE} bytes`);
  }
  if (input.nameHash.length !== ANNOUNCE_NAME_HASH_SIZE) {
    throw new Error(`Announce name hash must be ${ANNOUNCE_NAME_HASH_SIZE} bytes`);
  }
  if (input.randomHash.length !== ANNOUNCE_RANDOM_HASH_SIZE) {
    throw new Error(`Announce random hash must be ${ANNOUNCE_RANDOM_HASH_SIZE} bytes`);
  }
  if (
    input.ratchetPublicKey !== null &&
    input.ratchetPublicKey.length !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE
  ) {
    throw new Error(`Announce ratchet public key must be ${ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE} bytes`);
  }
  if (input.signature.length !== ANNOUNCE_SIGNATURE_SIZE) {
    throw new Error(`Announce signature must be ${ANNOUNCE_SIGNATURE_SIZE} bytes`);
  }

  return concatBytes(
    input.publicKey,
    input.nameHash,
    input.randomHash,
    input.ratchetPublicKey ?? new Uint8Array(),
    input.signature,
    input.appData ?? new Uint8Array()
  );
}

export function parseAnnouncePayload(
  data: Uint8Array,
  hasRatchet: boolean
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
    appData
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
  event: PackAnnouncePayloadEvent
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
            appData: event.appData
          })
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUsePackAnnouncePayload(
  actions: ReadonlyArray<PackAnnouncePayloadAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract announce pack bytes from step actions; null when no `use-raw`. */
export function packAnnouncePayloadRawFromActions(
  actions: ReadonlyArray<PackAnnouncePayloadAction>
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
  event: ParseAnnouncePayloadEvent
): ParseAnnouncePayloadStepResult {
  if (event.kind === "announce/parse-payload-gate") {
    const fields = parseAnnouncePayload(event.data, event.hasRatchet);
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

export function shouldUseParseAnnouncePayload(
  actions: ReadonlyArray<ParseAnnouncePayloadAction>
): boolean {
  return actions.some((action) => action.kind === "use-fields");
}

export function shouldRejectParseAnnouncePayload(
  actions: ReadonlyArray<ParseAnnouncePayloadAction>
): boolean {
  return actions.some((action) => action.kind === "reject");
}

/** Extract parsed announce payload fields from step actions; null when no `use-fields`. */
export function announcePayloadFieldsFromActions(
  actions: ReadonlyArray<ParseAnnouncePayloadAction>
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

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
  event: AcceptAnnouncePayloadEvent
): AcceptAnnouncePayloadStepResult {
  if (event.kind === "announce/accept-payload-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptAnnouncePayload(event.fieldsPresent) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptAnnouncePayloadNow(
  actions: ReadonlyArray<AcceptAnnouncePayloadAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipAnnouncePayloadAccept(
  actions: ReadonlyArray<AcceptAnnouncePayloadAction>
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
  | { readonly kind: "accept" }
  | { readonly kind: "skip" };

export interface AcceptParsedAnnounceStepResult {
  readonly state: AcceptParsedAnnounceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptParsedAnnounceAction[];
}

export function initialAcceptParsedAnnounceState(): AcceptParsedAnnounceState {
  return {};
}

export function stepAcceptParsedAnnounceWithActions(
  state: AcceptParsedAnnounceState,
  event: AcceptParsedAnnounceEvent
): AcceptParsedAnnounceStepResult {
  if (event.kind === "announce/accept-parsed-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptParsedAnnounce(event.parsedPresent) ? "accept" : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptParsedAnnounceNow(
  actions: ReadonlyArray<AcceptParsedAnnounceAction>
): boolean {
  return actions.some((action) => action.kind === "accept");
}

export function shouldSkipParsedAnnounceAccept(
  actions: ReadonlyArray<AcceptParsedAnnounceAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/** Material hashed then truncated for destination-hash check after announce validate. */
export function announceDestinationHashMaterial(
  nameHash: Uint8Array,
  identityHash: Uint8Array
): Uint8Array {
  return concatBytes(nameHash, identityHash);
}

/**
 * Announce destination-hash material assembly is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `announceDestinationHashMaterial` reads beside the step).
 */
export type AnnounceDestinationHashMaterialState = Record<string, never>;

export type AnnounceDestinationHashMaterialEvent =
  | Event
  | {
      readonly kind: "announce/destination-hash-material-gate";
      readonly nameHash: Uint8Array;
      readonly identityHash: Uint8Array;
    };

export type AnnounceDestinationHashMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};

export interface AnnounceDestinationHashMaterialStepResult {
  readonly state: AnnounceDestinationHashMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceDestinationHashMaterialAction[];
}

export function initialAnnounceDestinationHashMaterialState(): AnnounceDestinationHashMaterialState {
  return {};
}

export function stepAnnounceDestinationHashMaterialWithActions(
  state: AnnounceDestinationHashMaterialState,
  event: AnnounceDestinationHashMaterialEvent
): AnnounceDestinationHashMaterialStepResult {
  if (event.kind === "announce/destination-hash-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: announceDestinationHashMaterial(event.nameHash, event.identityHash)
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAnnounceDestinationHashMaterial(
  actions: ReadonlyArray<AnnounceDestinationHashMaterialAction>
): boolean {
  return actions.some((action) => action.kind === "use-raw");
}

/** Extract announce destination-hash material from step actions; null when no `use-raw`. */
export function announceDestinationHashMaterialRawFromActions(
  actions: ReadonlyArray<AnnounceDestinationHashMaterialAction>
): Uint8Array | null {
  const action = actions.find((entry) => entry.kind === "use-raw");
  return action?.kind === "use-raw" ? action.raw : null;
}

export function announceDestinationHashMatches(
  destinationHash: Uint8Array,
  expectedTruncatedHash: Uint8Array
): boolean {
  return equalByteArrays(destinationHash, expectedTruncatedHash);
}

/**
 * Announce destination-hash match is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `announceDestinationHashMatches` reads beside the step).
 */
export type AnnounceDestinationHashMatchState = Record<string, never>;

export type AnnounceDestinationHashMatchEvent =
  | Event
  | {
      readonly kind: "announce/destination-hash-match-gate";
      readonly destinationHash: Uint8Array;
      readonly expectedTruncatedHash: Uint8Array;
    };

export type AnnounceDestinationHashMatchAction =
  | { readonly kind: "match" }
  | { readonly kind: "mismatch" };

export interface AnnounceDestinationHashMatchStepResult {
  readonly state: AnnounceDestinationHashMatchState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceDestinationHashMatchAction[];
}

export function initialAnnounceDestinationHashMatchState(): AnnounceDestinationHashMatchState {
  return {};
}

export function stepAnnounceDestinationHashMatchWithActions(
  state: AnnounceDestinationHashMatchState,
  event: AnnounceDestinationHashMatchEvent
): AnnounceDestinationHashMatchStepResult {
  if (event.kind === "announce/destination-hash-match-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: announceDestinationHashMatches(
            event.destinationHash,
            event.expectedTruncatedHash
          )
            ? "match"
            : "mismatch"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchAnnounceDestinationHash(
  actions: ReadonlyArray<AnnounceDestinationHashMatchAction>
): boolean {
  return actions.some((action) => action.kind === "match");
}

export function shouldMismatchAnnounceDestinationHash(
  actions: ReadonlyArray<AnnounceDestinationHashMatchAction>
): boolean {
  return actions.some((action) => action.kind === "mismatch");
}

/** Whether a packet is an ANNOUNCE type eligible for announce parse. */
export function isAnnouncePacketType(packetType: number): boolean {
  return packetType === PACKET_TYPE_ANNOUNCE;
}

export type AnnounceValidatePlan =
  | "reject-parse"
  | "reject-public-key"
  | "reject-signature"
  | "accept-signature-only"
  | "reject-destination-hash"
  | "accept";

/**
 * Whether Announce.validate may attempt signature crypto at the edge.
 */
export function shouldAttemptAnnounceSignatureValidate(input: {
  readonly parsedOk: boolean;
  readonly identityPresent: boolean;
  readonly publicKeyLoaded: boolean;
}): boolean {
  return input.parsedOk && input.identityPresent && input.publicKeyLoaded;
}

/**
 * Announce signature-attempt gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldAttemptAnnounceSignatureValidate` reads beside the step).
 */
export type AttemptAnnounceSignatureValidateState = Record<string, never>;

export type AttemptAnnounceSignatureValidateEvent =
  | Event
  | {
      readonly kind: "announce/attempt-signature-validate-gate";
      readonly parsedOk: boolean;
      readonly identityPresent: boolean;
      readonly publicKeyLoaded: boolean;
    };

export type AttemptAnnounceSignatureValidateAction =
  | { readonly kind: "attempt" }
  | { readonly kind: "skip" };

export interface AttemptAnnounceSignatureValidateStepResult {
  readonly state: AttemptAnnounceSignatureValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AttemptAnnounceSignatureValidateAction[];
}

export function initialAttemptAnnounceSignatureValidateState(): AttemptAnnounceSignatureValidateState {
  return {};
}

export function stepAttemptAnnounceSignatureValidateWithActions(
  state: AttemptAnnounceSignatureValidateState,
  event: AttemptAnnounceSignatureValidateEvent
): AttemptAnnounceSignatureValidateStepResult {
  if (event.kind === "announce/attempt-signature-validate-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAttemptAnnounceSignatureValidate({
            parsedOk: event.parsedOk,
            identityPresent: event.identityPresent,
            publicKeyLoaded: event.publicKeyLoaded
          })
            ? "attempt"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttemptAnnounceSignatureValidateNow(
  actions: ReadonlyArray<AttemptAnnounceSignatureValidateAction>
): boolean {
  return actions.some((action) => action.kind === "attempt");
}

export function shouldSkipAnnounceSignatureValidate(
  actions: ReadonlyArray<AttemptAnnounceSignatureValidateAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Whether Announce.validate may check destination-hash material after signature.
 */
export function shouldCheckAnnounceDestinationHash(input: {
  readonly parsedOk: boolean;
  readonly identityPresent: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
}): boolean {
  return (
    input.parsedOk &&
    input.identityPresent &&
    input.publicKeyLoaded &&
    input.signatureValid &&
    !input.onlyValidateSignature
  );
}

/**
 * Announce destination-hash check gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldCheckAnnounceDestinationHash` reads beside the step).
 */
export type CheckAnnounceDestinationHashState = Record<string, never>;

export type CheckAnnounceDestinationHashEvent =
  | Event
  | {
      readonly kind: "announce/check-destination-hash-gate";
      readonly parsedOk: boolean;
      readonly identityPresent: boolean;
      readonly publicKeyLoaded: boolean;
      readonly signatureValid: boolean;
      readonly onlyValidateSignature: boolean;
    };

export type CheckAnnounceDestinationHashAction =
  | { readonly kind: "check" }
  | { readonly kind: "skip" };

export interface CheckAnnounceDestinationHashStepResult {
  readonly state: CheckAnnounceDestinationHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CheckAnnounceDestinationHashAction[];
}

export function initialCheckAnnounceDestinationHashState(): CheckAnnounceDestinationHashState {
  return {};
}

export function stepCheckAnnounceDestinationHashWithActions(
  state: CheckAnnounceDestinationHashState,
  event: CheckAnnounceDestinationHashEvent
): CheckAnnounceDestinationHashStepResult {
  if (event.kind === "announce/check-destination-hash-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldCheckAnnounceDestinationHash({
            parsedOk: event.parsedOk,
            identityPresent: event.identityPresent,
            publicKeyLoaded: event.publicKeyLoaded,
            signatureValid: event.signatureValid,
            onlyValidateSignature: event.onlyValidateSignature
          })
            ? "check"
            : "skip"
        }
      ]
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCheckAnnounceDestinationHashNow(
  actions: ReadonlyArray<CheckAnnounceDestinationHashAction>
): boolean {
  return actions.some((action) => action.kind === "check");
}

export function shouldSkipAnnounceDestinationHashCheck(
  actions: ReadonlyArray<CheckAnnounceDestinationHashAction>
): boolean {
  return actions.some((action) => action.kind === "skip");
}

/**
 * Announce.validate outcome from parse / key / signature / dest-hash gates.
 * Crypto loadPublicKey + validate stay at the adapter edge as booleans.
 */
export function planAnnounceValidateOutcome(input: {
  readonly parsedOk: boolean;
  readonly publicKeyLoaded: boolean;
  readonly signatureValid: boolean;
  readonly onlyValidateSignature: boolean;
  readonly destinationHashMatches: boolean;
}): AnnounceValidatePlan {
  if (!input.parsedOk) {
    return "reject-parse";
  }
  if (!input.publicKeyLoaded) {
    return "reject-public-key";
  }
  if (!input.signatureValid) {
    return "reject-signature";
  }
  if (input.onlyValidateSignature) {
    return "accept-signature-only";
  }
  if (!input.destinationHashMatches) {
    return "reject-destination-hash";
  }
  return "accept";
}

/**
 * Announce validate gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type AnnounceValidateState = Record<string, never>;

export type AnnounceValidateEvent =
  | Event
  | {
      readonly kind: "announce/validate-gate";
      readonly parsedOk: boolean;
      readonly publicKeyLoaded: boolean;
      readonly signatureValid: boolean;
      readonly onlyValidateSignature: boolean;
      readonly destinationHashMatches: boolean;
    };

export type AnnounceValidateAction = { readonly kind: AnnounceValidatePlan };

export interface AnnounceValidateStepResult {
  readonly state: AnnounceValidateState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceValidateAction[];
}

export function initialAnnounceValidateState(): AnnounceValidateState {
  return {};
}

export const stepAnnounceValidate: StepFn<AnnounceValidateState> = (state, event) => {
  const result = stepAnnounceValidateInner(state, event as AnnounceValidateEvent);
  return { state: result.state, intents: result.intents };
};

export function stepAnnounceValidateWithActions(
  state: AnnounceValidateState,
  event: AnnounceValidateEvent
): AnnounceValidateStepResult {
  return stepAnnounceValidateInner(state, event);
}

/** Whether validate may return true from accept / accept-signature-only actions. */
export function shouldAcceptAnnounceValidate(
  actions: ReadonlyArray<AnnounceValidateAction>
): boolean {
  return actions.some(
    (action) => action.kind === "accept" || action.kind === "accept-signature-only"
  );
}

function stepAnnounceValidateInner(
  state: AnnounceValidateState,
  event: AnnounceValidateEvent
): AnnounceValidateStepResult {
  if (event.kind === "announce/validate-gate") {
    const plan = planAnnounceValidateOutcome({
      parsedOk: event.parsedOk,
      publicKeyLoaded: event.publicKeyLoaded,
      signatureValid: event.signatureValid,
      onlyValidateSignature: event.onlyValidateSignature,
      destinationHashMatches: event.destinationHashMatches
    });
    return { state, intents: [], actions: [{ kind: plan }] };
  }

  return { state, intents: [], actions: [] };
}

export type AnnounceBuildPlan =
  | "ok"
  | "not-announceable-type"
  | "not-announceable-direction"
  | "missing-identity"
  | "bad-random-hash"
  | "bad-ratchet";

/**
 * Whether Announce.buildPacket may proceed (SINGLE IN + identity + material sizes).
 * Entropy/signing stay at the adapter edge.
 */
export function planAnnounceBuild(input: {
  readonly typeSingle: boolean;
  readonly directionIn: boolean;
  readonly identityPresent: boolean;
  readonly randomHashLength: number;
  readonly ratchetPublicKeyLength: number | null;
}): AnnounceBuildPlan {
  if (!input.typeSingle) {
    return "not-announceable-type";
  }
  if (!input.directionIn) {
    return "not-announceable-direction";
  }
  if (!input.identityPresent) {
    return "missing-identity";
  }
  if (input.randomHashLength !== ANNOUNCE_RANDOM_HASH_SIZE) {
    return "bad-random-hash";
  }
  if (
    input.ratchetPublicKeyLength !== null &&
    input.ratchetPublicKeyLength !== ANNOUNCE_RATCHET_PUBLIC_KEY_SIZE
  ) {
    return "bad-ratchet";
  }
  return "ok";
}

/**
 * Announce build gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type AnnounceBuildState = Record<string, never>;

export type AnnounceBuildEvent =
  | Event
  | {
      readonly kind: "announce/build-gate";
      readonly typeSingle: boolean;
      readonly directionIn: boolean;
      readonly identityPresent: boolean;
      readonly randomHashLength: number;
      readonly ratchetPublicKeyLength: number | null;
    };

export type AnnounceBuildAction =
  | { readonly kind: "proceed" }
  | { readonly kind: "reject-not-announceable-type" }
  | { readonly kind: "reject-not-announceable-direction" }
  | { readonly kind: "reject-missing-identity" }
  | { readonly kind: "reject-bad-random-hash" }
  | { readonly kind: "reject-bad-ratchet" };

export interface AnnounceBuildStepResult {
  readonly state: AnnounceBuildState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnounceBuildAction[];
}

export function initialAnnounceBuildState(): AnnounceBuildState {
  return {};
}

export const stepAnnounceBuild: StepFn<AnnounceBuildState> = (state, event) => {
  const result = stepAnnounceBuildInner(state, event as AnnounceBuildEvent);
  return { state: result.state, intents: result.intents };
};

export function stepAnnounceBuildWithActions(
  state: AnnounceBuildState,
  event: AnnounceBuildEvent
): AnnounceBuildStepResult {
  return stepAnnounceBuildInner(state, event);
}

export function shouldProceedAnnounceBuild(
  actions: ReadonlyArray<AnnounceBuildAction>
): boolean {
  return actions.some((action) => action.kind === "proceed");
}

export function shouldRejectAnnounceBuildNotAnnounceableType(
  actions: ReadonlyArray<AnnounceBuildAction>
): boolean {
  return actions.some((action) => action.kind === "reject-not-announceable-type");
}

export function shouldRejectAnnounceBuildNotAnnounceableDirection(
  actions: ReadonlyArray<AnnounceBuildAction>
): boolean {
  return actions.some((action) => action.kind === "reject-not-announceable-direction");
}

export function shouldRejectAnnounceBuildMissingIdentity(
  actions: ReadonlyArray<AnnounceBuildAction>
): boolean {
  return actions.some((action) => action.kind === "reject-missing-identity");
}

export function shouldRejectAnnounceBuildBadRandomHash(
  actions: ReadonlyArray<AnnounceBuildAction>
): boolean {
  return actions.some((action) => action.kind === "reject-bad-random-hash");
}

export function shouldRejectAnnounceBuildBadRatchet(
  actions: ReadonlyArray<AnnounceBuildAction>
): boolean {
  return actions.some((action) => action.kind === "reject-bad-ratchet");
}

function stepAnnounceBuildInner(
  state: AnnounceBuildState,
  event: AnnounceBuildEvent
): AnnounceBuildStepResult {
  if (event.kind === "announce/build-gate") {
    const plan = planAnnounceBuild({
      typeSingle: event.typeSingle,
      directionIn: event.directionIn,
      identityPresent: event.identityPresent,
      randomHashLength: event.randomHashLength,
      ratchetPublicKeyLength: event.ratchetPublicKeyLength
    });
    if (plan === "ok") {
      return { state, intents: [], actions: [{ kind: "proceed" }] };
    }
    if (plan === "not-announceable-type") {
      return { state, intents: [], actions: [{ kind: "reject-not-announceable-type" }] };
    }
    if (plan === "not-announceable-direction") {
      return {
        state,
        intents: [],
        actions: [{ kind: "reject-not-announceable-direction" }]
      };
    }
    if (plan === "missing-identity") {
      return { state, intents: [], actions: [{ kind: "reject-missing-identity" }] };
    }
    if (plan === "bad-random-hash") {
      return { state, intents: [], actions: [{ kind: "reject-bad-random-hash" }] };
    }
    return { state, intents: [], actions: [{ kind: "reject-bad-ratchet" }] };
  }

  return { state, intents: [], actions: [] };
}
