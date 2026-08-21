import { beforeEach, describe, expect, it, vi } from "vitest";

const { unpackPackage, verifyPackage } = vi.hoisted(() => ({
  unpackPackage: vi.fn(),
  verifyPackage: vi.fn(),
}));

vi.mock("../../app-registry/dist/index.js", () => ({
  unpackPackage,
  verifyPackage,
}));

import { confirmInstallReview } from "../src/install-review.mjs";
import { installReviewHostMessage } from "../src/capability-review.mjs";

const MANIFEST = {
  name: "demo",
  version: "1.2.0",
  publisherPublicKey: "pk",
};

describe("installReviewHostMessage", () => {
  it("stamps a token and defaults a missing trusted label to null", () => {
    const message = installReviewHostMessage({
      randomBytes: (length: number) => new Uint8Array(length).fill(7),
      appId: "demo",
      version: "1.0.0",
      publisherPublicKey: "pk",
      trusted: false,
      presented: { riskTier: "elevated", capabilities: [] },
    });
    expect(message).toMatchObject({
      type: "install-review",
      appId: "demo",
      version: "1.0.0",
      publisherPublicKey: "pk",
      trusted: false,
      trustedLabel: null,
      riskTier: "elevated",
      capabilities: [],
    });
    expect(message.token).toEqual(expect.any(String));
    expect(message.token.length).toBeGreaterThan(0);
  });
});

describe("confirmInstallReview", () => {
  const archive = new Uint8Array([1, 2, 3]);
  const provider = { randomBytes: (length: number) => new Uint8Array(length) };

  beforeEach(() => {
    unpackPackage.mockReset();
    verifyPackage.mockReset();
    unpackPackage.mockReturnValue({ manifest: { name: "demo" } });
    verifyPackage.mockReturnValue({ manifest: MANIFEST });
  });

  it("throws when the host cancels the review", async () => {
    await expect(
      confirmInstallReview({
        provider,
        archive,
        trustStore: {
          isTrusted: async () => false,
          list: async () => [],
        },
        capabilitiesForReview: () => [],
        requestHostReply: async () => null,
      }),
    ).rejects.toThrow("Install cancelled at capability review");
  });

  it("throws when the host rejects the review", async () => {
    await expect(
      confirmInstallReview({
        provider,
        archive,
        trustStore: {
          isTrusted: async () => false,
          list: async () => [],
        },
        capabilitiesForReview: () => [],
        requestHostReply: async () => ({ accept: false }),
      }),
    ).rejects.toThrow("Install cancelled at capability review");
  });

  it("returns the verified package when the host accepts", async () => {
    const result = await confirmInstallReview({
      provider,
      archive,
      minVersionFor: () => "1.0.0",
      hostApiVersion: "0.16.0",
      trustStore: {
        isTrusted: async () => true,
        list: async () => [
          { publisherPublicKey: "pk", label: "Known publisher" },
        ],
      },
      capabilitiesForReview: () => [{ id: "storage:kv", riskClass: "benign" }],
      requestHostReply: async (message) => {
        expect(message.type).toBe("install-review");
        expect(message.trusted).toBe(true);
        expect(message.trustedLabel).toBe("Known publisher");
        return { accept: true };
      },
    });
    expect(result).toMatchObject({
      appId: "demo",
      trusted: true,
      review: { accept: true },
    });
    expect(verifyPackage).toHaveBeenCalledWith(
      provider,
      archive,
      expect.objectContaining({
        minVersion: "1.0.0",
        hostApiVersion: "0.16.0",
      }),
    );
  });

  it("omits minVersion and trustedLabel when they are not available", async () => {
    const result = await confirmInstallReview({
      provider,
      archive,
      trustStore: {
        isTrusted: async () => true,
        list: async () => [],
      },
      capabilitiesForReview: () => [],
      requestHostReply: async (message) => {
        expect(message.trustedLabel).toBeNull();
        return { accept: true };
      },
    });
    expect(result.trusted).toBe(true);
    expect(verifyPackage.mock.calls[0]?.[2]).not.toHaveProperty("minVersion");
  });
});
