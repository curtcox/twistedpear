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
import type { Event, Intent } from "@twistedpear/effects";
import { PACKET_TYPE_ANNOUNCE } from "../packet-header.js";
import { equalByteArrays } from "../path-table.js";
import { concatBytes, shouldAcceptParsedAnnounce } from "./part-1.js";
import type {
  AcceptParsedAnnounceAction,
  AcceptParsedAnnounceEvent,
  AcceptParsedAnnounceState,
  AcceptParsedAnnounceStepResult,
} from "./part-1.js";
import { firstActionOfKind, hasActionOfKind } from "../action-kind.js";
export function stepAcceptParsedAnnounceWithActions(
  state: AcceptParsedAnnounceState,
  event: AcceptParsedAnnounceEvent,
): AcceptParsedAnnounceStepResult {
  if (event.kind === "announce/accept-parsed-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: shouldAcceptParsedAnnounce(event.parsedPresent)
            ? "accept"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAcceptParsedAnnounceNow(
  actions: ReadonlyArray<AcceptParsedAnnounceAction>,
): boolean {
  return hasActionOfKind(actions, "accept");
}

export function shouldSkipParsedAnnounceAccept(
  actions: ReadonlyArray<AcceptParsedAnnounceAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
}

/** Material hashed then truncated for destination-hash check after announce validate. */
export function announceDestinationHashMaterial(
  nameHash: Uint8Array,
  identityHash: Uint8Array,
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
  event: AnnounceDestinationHashMaterialEvent,
): AnnounceDestinationHashMaterialStepResult {
  if (event.kind === "announce/destination-hash-material-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: "use-raw",
          raw: announceDestinationHashMaterial(
            event.nameHash,
            event.identityHash,
          ),
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldUseAnnounceDestinationHashMaterial(
  actions: ReadonlyArray<AnnounceDestinationHashMaterialAction>,
): boolean {
  return hasActionOfKind(actions, "use-raw");
}

/** Extract announce destination-hash material from step actions; null when no `use-raw`. */
export function announceDestinationHashMaterialRawFromActions(
  actions: ReadonlyArray<AnnounceDestinationHashMaterialAction>,
): Uint8Array | null {
  return firstActionOfKind(actions, "use-raw")?.raw ?? null;
}

export function announceDestinationHashMatches(
  destinationHash: Uint8Array,
  expectedTruncatedHash: Uint8Array,
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
  { readonly kind: "match" } | { readonly kind: "mismatch" };

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
  event: AnnounceDestinationHashMatchEvent,
): AnnounceDestinationHashMatchStepResult {
  if (event.kind === "announce/destination-hash-match-gate") {
    return {
      state,
      intents: [],
      actions: [
        {
          kind: announceDestinationHashMatches(
            event.destinationHash,
            event.expectedTruncatedHash,
          )
            ? "match"
            : "mismatch",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldMatchAnnounceDestinationHash(
  actions: ReadonlyArray<AnnounceDestinationHashMatchAction>,
): boolean {
  return hasActionOfKind(actions, "match");
}

export function shouldMismatchAnnounceDestinationHash(
  actions: ReadonlyArray<AnnounceDestinationHashMatchAction>,
): boolean {
  return hasActionOfKind(actions, "mismatch");
}

/** Whether a packet is an ANNOUNCE type eligible for announce parse. */
export function isAnnouncePacketType(packetType: number): boolean {
  return packetType === PACKET_TYPE_ANNOUNCE;
}

/**
 * Announce packet-type gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isAnnouncePacketType`
 * reads beside the step).
 */
export type AnnouncePacketTypeState = Record<string, never>;

export type AnnouncePacketTypeEvent =
  | Event
  | {
      readonly kind: "announce/packet-type-gate";
      readonly packetType: number;
    };

export type AnnouncePacketTypeAction =
  { readonly kind: "announce" } | { readonly kind: "other" };

export interface AnnouncePacketTypeStepResult {
  readonly state: AnnouncePacketTypeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnnouncePacketTypeAction[];
}

export function initialAnnouncePacketTypeState(): AnnouncePacketTypeState {
  return {};
}

export function stepAnnouncePacketTypeWithActions(
  state: AnnouncePacketTypeState,
  event: AnnouncePacketTypeEvent,
): AnnouncePacketTypeStepResult {
  if (event.kind === "announce/packet-type-gate") {
    return {
      state,
      intents: [],
      actions: [
        { kind: isAnnouncePacketType(event.packetType) ? "announce" : "other" },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldTreatAnnouncePacketType(
  actions: ReadonlyArray<AnnouncePacketTypeAction>,
): boolean {
  return hasActionOfKind(actions, "announce");
}

export function shouldTreatAnnouncePacketTypeOther(
  actions: ReadonlyArray<AnnouncePacketTypeAction>,
): boolean {
  return hasActionOfKind(actions, "other");
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
  { readonly kind: "attempt" } | { readonly kind: "skip" };

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
  event: AttemptAnnounceSignatureValidateEvent,
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
            publicKeyLoaded: event.publicKeyLoaded,
          })
            ? "attempt"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldAttemptAnnounceSignatureValidateNow(
  actions: ReadonlyArray<AttemptAnnounceSignatureValidateAction>,
): boolean {
  return hasActionOfKind(actions, "attempt");
}

export function shouldSkipAnnounceSignatureValidate(
  actions: ReadonlyArray<AttemptAnnounceSignatureValidateAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
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
  { readonly kind: "check" } | { readonly kind: "skip" };

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
  event: CheckAnnounceDestinationHashEvent,
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
            onlyValidateSignature: event.onlyValidateSignature,
          })
            ? "check"
            : "skip",
        },
      ],
    };
  }

  return { state, intents: [], actions: [] };
}

export function shouldCheckAnnounceDestinationHashNow(
  actions: ReadonlyArray<CheckAnnounceDestinationHashAction>,
): boolean {
  return hasActionOfKind(actions, "check");
}

export function shouldSkipAnnounceDestinationHashCheck(
  actions: ReadonlyArray<CheckAnnounceDestinationHashAction>,
): boolean {
  return hasActionOfKind(actions, "skip");
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
