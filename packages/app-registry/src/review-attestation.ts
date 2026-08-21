/** Signed review of a package artifact. Travels like an app announce. */

import {
  Identity,
  bytesToHex,
  hexToBytes,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";
import { serializeCanonicalJson } from "./manifest.js";

export const REVIEW_ATTESTATION_FORMAT = 1;
export const REVIEW_ANNOUNCE_ASPECT = "review";
const REVIEW_ANNOUNCE_MAGIC = new Uint8Array([0x54, 0x50, 0x52, 0x56, 0x01]); // TPRV\x01

export type ReviewVerdict = "endorse" | "concern";
export type ReviewBasis = "source-read" | "executed" | "diff-from-prior";

export interface UnsignedReviewAttestation {
  readonly formatVersion: number;
  readonly appId: string;
  readonly publisherPublicKey: string;
  readonly packageHash: string;
  readonly reviewerPublicKey: string;
  readonly verdict: string;
  readonly basis: ReadonlyArray<ReviewBasis>;
  readonly capabilities: ReadonlyArray<string>;
  readonly firstSeenAt: number;
  readonly reviewedAt: number;
  readonly expiresAt: number;
}

export interface ReviewAttestation extends UnsignedReviewAttestation {
  readonly signature: string;
  readonly verdict: ReviewVerdict;
}

export interface ReviewAnnounceSummary {
  readonly formatVersion: number;
  readonly packageHash: string;
  readonly reviewerKeyHash: string;
  readonly publisherKeyHash: string;
  readonly verdict: ReviewVerdict;
  readonly expiresAt: number;
  readonly announceSignature: string;
}

export interface AttestationTally {
  readonly endorsements: number;
  readonly concerns: number;
  /** Endorsements that count toward the review requirement. Zero if any concern. */
  readonly attestationCount: number;
}

const SIGNING_FIELDS = [
  "formatVersion",
  "appId",
  "publisherPublicKey",
  "packageHash",
  "reviewerPublicKey",
  "verdict",
  "basis",
  "capabilities",
  "firstSeenAt",
  "reviewedAt",
  "expiresAt",
] as const;

const BASIS: ReadonlySet<string> = new Set([
  "source-read",
  "executed",
  "diff-from-prior",
]);

function signingPayload(attestation: UnsignedReviewAttestation): Uint8Array {
  const payload: Record<string, unknown> = {};
  for (const field of SIGNING_FIELDS) {
    payload[field] = attestation[field];
  }
  return new TextEncoder().encode(serializeCanonicalJson(payload));
}

function keyHash(provider: CryptoProvider, publicKeyHex: string): string {
  return bytesToHex(provider.sha256(hexToBytes(publicKeyHex)).slice(0, 8));
}

export function reviewDestinationName(
  provider: CryptoProvider,
  packageHash: string,
  reviewerPublicKey: string,
): string {
  const packagePart = hexToBytes(packageHash).slice(0, 8);
  const reviewerPart = provider
    .sha256(hexToBytes(reviewerPublicKey))
    .slice(0, 8);
  return `tp.review.${bytesToHex(packagePart)}.${bytesToHex(reviewerPart)}`;
}

export function signReviewAttestation(
  _provider: CryptoProvider,
  identity: Identity,
  unsigned: UnsignedReviewAttestation,
): ReviewAttestation {
  if (unsigned.formatVersion !== REVIEW_ATTESTATION_FORMAT) {
    throw new Error(`Unsupported review format ${unsigned.formatVersion}`);
  }
  if (unsigned.verdict !== "endorse" && unsigned.verdict !== "concern") {
    throw new Error(`Unknown verdict ${unsigned.verdict}`);
  }
  const verdict: ReviewVerdict = unsigned.verdict;
  if (
    unsigned.basis.length === 0 ||
    unsigned.basis.some((item) => !BASIS.has(item))
  ) {
    throw new Error("Review basis must be a non-empty set of known claims");
  }
  if (unsigned.expiresAt <= unsigned.reviewedAt) {
    throw new Error("Review expiresAt must be after reviewedAt");
  }
  const reviewerPublicKey = bytesToHex(identity.getPublicKey());
  const body: UnsignedReviewAttestation = {
    ...unsigned,
    reviewerPublicKey,
    verdict,
  };
  return {
    ...body,
    verdict,
    signature: bytesToHex(identity.sign(signingPayload(body))),
  };
}

export function verifyReviewAttestation(
  provider: CryptoProvider,
  attestation: ReviewAttestation,
): boolean {
  if (attestation.formatVersion !== REVIEW_ATTESTATION_FORMAT) return false;
  const { signature, ...unsigned } = attestation;
  const identity = Identity.fromPublicKey(
    provider,
    hexToBytes(attestation.reviewerPublicKey),
  );
  if (identity === null) return false;
  try {
    return identity.validate(hexToBytes(signature), signingPayload(unsigned));
  } catch {
    return false;
  }
}

export function encodeReviewAnnounceData(
  summary: ReviewAnnounceSummary,
): Uint8Array {
  const expires = new Uint8Array(8);
  const view = new DataView(expires.buffer);
  view.setBigUint64(0, BigInt(summary.expiresAt));
  const bytes = new Uint8Array(
    REVIEW_ANNOUNCE_MAGIC.length +
      1 +
      8 +
      8 +
      8 +
      1 +
      8 +
      hexToBytes(summary.announceSignature).length,
  );
  let offset = 0;
  bytes.set(REVIEW_ANNOUNCE_MAGIC, offset);
  offset += REVIEW_ANNOUNCE_MAGIC.length;
  bytes[offset++] = summary.formatVersion;
  bytes.set(hexToBytes(summary.packageHash).slice(0, 8), offset);
  offset += 8;
  bytes.set(hexToBytes(summary.reviewerKeyHash).slice(0, 8), offset);
  offset += 8;
  bytes.set(hexToBytes(summary.publisherKeyHash).slice(0, 8), offset);
  offset += 8;
  bytes[offset++] = summary.verdict === "concern" ? 1 : 0;
  bytes.set(expires, offset);
  offset += 8;
  bytes.set(hexToBytes(summary.announceSignature), offset);
  return bytes;
}

export function decodeReviewAnnounceData(
  appData: Uint8Array,
): ReviewAnnounceSummary | null {
  const header = REVIEW_ANNOUNCE_MAGIC.length + 1 + 8 + 8 + 8 + 1 + 8;
  if (appData.length <= header) return null;
  for (let i = 0; i < REVIEW_ANNOUNCE_MAGIC.length; i++) {
    if (appData[i] !== REVIEW_ANNOUNCE_MAGIC[i]) return null;
  }
  let offset = REVIEW_ANNOUNCE_MAGIC.length;
  const formatVersion = appData[offset++]!;
  const packageHash = bytesToHex(appData.subarray(offset, offset + 8));
  offset += 8;
  const reviewerKeyHash = bytesToHex(appData.subarray(offset, offset + 8));
  offset += 8;
  const publisherKeyHash = bytesToHex(appData.subarray(offset, offset + 8));
  offset += 8;
  const verdict: ReviewVerdict =
    appData[offset++] === 1 ? "concern" : "endorse";
  const expiresAt = Number(
    new DataView(appData.buffer, appData.byteOffset + offset, 8).getBigUint64(
      0,
    ),
  );
  offset += 8;
  return {
    formatVersion,
    packageHash,
    reviewerKeyHash,
    publisherKeyHash,
    verdict,
    expiresAt,
    announceSignature: bytesToHex(appData.subarray(offset)),
  };
}

export function reviewAnnounceSummary(
  provider: CryptoProvider,
  attestation: ReviewAttestation,
): ReviewAnnounceSummary {
  return {
    formatVersion: REVIEW_ATTESTATION_FORMAT,
    packageHash: attestation.packageHash.slice(0, 16),
    reviewerKeyHash: keyHash(provider, attestation.reviewerPublicKey),
    publisherKeyHash: keyHash(provider, attestation.publisherPublicKey),
    verdict: attestation.verdict,
    expiresAt: attestation.expiresAt,
    announceSignature: attestation.signature,
  };
}

/**
 * Count attestations the user is willing to treat as evidence.
 * A review is of an artifact (packageHash), never of a publisher.
 * A trusted `concern` is a unilateral brake: attestationCount becomes 0 so
 * evaluateApproval reports review unmet (still overridable).
 */
function attestationCountsTowardTally(
  provider: CryptoProvider,
  attestation: ReviewAttestation,
  options: {
    readonly trustedReviewerKeys: ReadonlySet<string>;
    readonly packageHash: string;
    readonly publisherPublicKey: string;
    readonly at: number;
  },
  seen: ReadonlySet<string>,
): boolean {
  if (attestation.packageHash !== options.packageHash) return false;
  if (attestation.expiresAt <= options.at) return false;
  if (!options.trustedReviewerKeys.has(attestation.reviewerPublicKey)) {
    return false;
  }
  if (attestation.reviewerPublicKey === options.publisherPublicKey)
    return false;
  if (seen.has(attestation.reviewerPublicKey)) return false;
  return verifyReviewAttestation(provider, attestation);
}

export function countTrustedAttestations(
  provider: CryptoProvider,
  attestations: ReadonlyArray<ReviewAttestation>,
  options: {
    readonly trustedReviewerKeys: ReadonlySet<string>;
    readonly packageHash: string;
    readonly publisherPublicKey: string;
    readonly at: number;
  },
): AttestationTally {
  let endorsements = 0;
  let concerns = 0;
  const seen = new Set<string>();
  for (const attestation of attestations) {
    if (!attestationCountsTowardTally(provider, attestation, options, seen)) {
      continue;
    }
    seen.add(attestation.reviewerPublicKey);
    if (attestation.verdict === "concern") concerns += 1;
    else endorsements += 1;
  }
  return {
    endorsements,
    concerns,
    attestationCount: concerns > 0 ? 0 : endorsements,
  };
}
