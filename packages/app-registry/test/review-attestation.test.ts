import { beforeAll, describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  countTrustedAttestations,
  decodeReviewAnnounceData,
  encodeReviewAnnounceData,
  reviewAnnounceSummary,
  reviewDestinationName,
  signReviewAttestation,
  verifyReviewAttestation,
  type UnsignedReviewAttestation,
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const HASH = "ab".repeat(32);

function unsigned(
  publisherPublicKey: string,
  overrides: Partial<UnsignedReviewAttestation> = {},
): UnsignedReviewAttestation {
  return {
    formatVersion: 1,
    appId: "notes",
    publisherPublicKey,
    packageHash: HASH,
    reviewerPublicKey: "00".repeat(64),
    verdict: "endorse",
    basis: ["source-read"],
    capabilities: ["lxmf:send"],
    firstSeenAt: 10,
    reviewedAt: 20,
    expiresAt: 200,
    ...overrides,
  };
}

describe("review attestation", () => {
  let publisher: Identity;
  let reviewer: Identity;
  let stranger: Identity;

  beforeAll(() => {
    publisher = new Identity(provider);
    reviewer = new Identity(provider);
    stranger = new Identity(provider);
  });

  it("signs a review of an artifact and rejects a swapped payload", () => {
    const publisherPublicKey = bytesToHex(publisher.getPublicKey());
    const signed = signReviewAttestation(
      provider,
      reviewer,
      unsigned(publisherPublicKey),
    );
    expect(verifyReviewAttestation(provider, signed)).toBe(true);
    expect(signed.reviewerPublicKey).toBe(bytesToHex(reviewer.getPublicKey()));
    expect(
      verifyReviewAttestation(provider, {
        ...signed,
        packageHash: "cd".repeat(32),
      }),
    ).toBe(false);
  });

  it("round-trips a compact announce summary that names verdict and hashes", () => {
    const publisherPublicKey = bytesToHex(publisher.getPublicKey());
    const signed = signReviewAttestation(
      provider,
      reviewer,
      unsigned(publisherPublicKey, { verdict: "concern" }),
    );
    const summary = reviewAnnounceSummary(provider, signed);
    const decoded = decodeReviewAnnounceData(encodeReviewAnnounceData(summary));
    expect(decoded).toMatchObject({
      verdict: "concern",
      expiresAt: 200,
      packageHash: HASH.slice(0, 16),
    });
    expect(
      reviewDestinationName(provider, HASH, signed.reviewerPublicKey),
    ).toMatch(/^tp\.review\./);
  });

  it("counts only trusted, unexpired, matching-hash endorsements", () => {
    const publisherPublicKey = bytesToHex(publisher.getPublicKey());
    const trusted = signReviewAttestation(
      provider,
      reviewer,
      unsigned(publisherPublicKey),
    );
    const other = signReviewAttestation(
      provider,
      stranger,
      unsigned(publisherPublicKey),
    );
    const expired = signReviewAttestation(
      provider,
      reviewer,
      unsigned(publisherPublicKey, { reviewedAt: 1, expiresAt: 5 }),
    );
    const tally = countTrustedAttestations(
      provider,
      [trusted, other, expired],
      {
        trustedReviewerKeys: new Set([trusted.reviewerPublicKey]),
        packageHash: HASH,
        publisherPublicKey,
        at: 50,
      },
    );
    expect(tally).toEqual({
      endorsements: 1,
      concerns: 0,
      attestationCount: 1,
    });
  });

  it("lets a trusted concern raise the bar — endorsements stop counting", () => {
    const publisherPublicKey = bytesToHex(publisher.getPublicKey());
    const endorse = signReviewAttestation(
      provider,
      reviewer,
      unsigned(publisherPublicKey),
    );
    const concern = signReviewAttestation(
      provider,
      stranger,
      unsigned(publisherPublicKey, { verdict: "concern", basis: ["executed"] }),
    );
    const tally = countTrustedAttestations(provider, [endorse, concern], {
      trustedReviewerKeys: new Set([
        endorse.reviewerPublicKey,
        concern.reviewerPublicKey,
      ]),
      packageHash: HASH,
      publisherPublicKey,
      at: 50,
    });
    expect(tally.endorsements).toBe(1);
    expect(tally.concerns).toBe(1);
    expect(tally.attestationCount).toBe(0);
  });

  it("refuses to count a review the app's own publisher signed", () => {
    const publisherPublicKey = bytesToHex(publisher.getPublicKey());
    const self = signReviewAttestation(
      provider,
      publisher,
      unsigned(publisherPublicKey),
    );
    const tally = countTrustedAttestations(provider, [self], {
      trustedReviewerKeys: new Set([publisherPublicKey]),
      packageHash: HASH,
      publisherPublicKey,
      at: 50,
    });
    expect(tally.attestationCount).toBe(0);
  });
});
