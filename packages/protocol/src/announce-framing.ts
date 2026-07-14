/**
 * Pure RNS announce payload framing and signed-material assembly.
 * Signing / hashing stay at the crypto adapter edge.
 */
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

/** Whether announce payload fields parsed successfully and may be retained. */
export function shouldAcceptAnnouncePayload(fieldsPresent: boolean): boolean {
  return fieldsPresent;
}

/** Whether a validated announce parse result may enter handleAnnounce. */
export function shouldAcceptParsedAnnounce(parsedPresent: boolean): boolean {
  return parsedPresent;
}

/** Material hashed then truncated for destination-hash check after announce validate. */
export function announceDestinationHashMaterial(
  nameHash: Uint8Array,
  identityHash: Uint8Array
): Uint8Array {
  return concatBytes(nameHash, identityHash);
}

export function announceDestinationHashMatches(
  destinationHash: Uint8Array,
  expectedTruncatedHash: Uint8Array
): boolean {
  return equalByteArrays(destinationHash, expectedTruncatedHash);
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
