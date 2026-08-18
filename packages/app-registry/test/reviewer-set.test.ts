import { describe, expect, it } from "vitest";
import {
  ReviewerStore,
  independentReviewerKeys,
  reviewerCoversScope,
  type TrustedReviewer,
} from "../src/reviewer-set.js";

const A = "aa".repeat(64);
const B = "bb".repeat(64);
const C = "cc".repeat(64);
const PUBLISHER = "dd".repeat(64);

function reviewer(
  key: string,
  batch: string,
  scope: TrustedReviewer["scope"] = "sensitive",
): TrustedReviewer {
  return {
    reviewerPublicKey: key,
    label: key.slice(0, 8),
    addedAt: 1,
    source: "paste",
    scope,
    importBatchId: batch,
  };
}

class MemoryStore {
  readonly values = new Map<string, Uint8Array>();
  async get(key: string) {
    return this.values.get(key) ?? null;
  }
  async set(key: string, value: Uint8Array) {
    this.values.set(key, value);
  }
  async delete(key: string) {
    this.values.delete(key);
  }
}

describe("reviewer independence", () => {
  it("does not count two keys from the same import toward K", () => {
    const keys = independentReviewerKeys(
      [reviewer(A, "paste-1"), reviewer(B, "paste-1"), reviewer(C, "qr-1")],
      { publisherPublicKey: PUBLISHER, needed: "sensitive" },
    );
    expect(keys.size).toBe(2);
    expect(keys.has(A)).toBe(true);
    expect(keys.has(C)).toBe(true);
    expect(keys.has(B)).toBe(false);
  });

  it("never counts the app's own publisher, even if listed", () => {
    const keys = independentReviewerKeys([reviewer(PUBLISHER, "solo")], {
      publisherPublicKey: PUBLISHER,
      needed: "sensitive",
    });
    expect(keys.size).toBe(0);
  });

  it("does not let a sensitive-scoped reviewer satisfy critical", () => {
    expect(
      reviewerCoversScope(reviewer(A, "solo", "sensitive"), "critical"),
    ).toBe(false);
    expect(
      reviewerCoversScope(reviewer(A, "solo", "critical"), "sensitive"),
    ).toBe(true);
    const keys = independentReviewerKeys([reviewer(A, "solo", "sensitive")], {
      publisherPublicKey: PUBLISHER,
      needed: "critical",
    });
    expect(keys.size).toBe(0);
  });
});

describe("ReviewerStore", () => {
  it("persists scoped reviewers and returns the independent key set", async () => {
    const store = new ReviewerStore(new MemoryStore());
    await store.add(reviewer(A, "batch-1", "critical"));
    await store.add(reviewer(B, "batch-1", "critical"));
    await store.add(reviewer(C, "batch-2", "sensitive"));
    expect((await store.list()).map((row) => row.reviewerPublicKey)).toEqual([
      A,
      B,
      C,
    ]);
    const forCritical = await store.independentKeys({
      publisherPublicKey: PUBLISHER,
      needed: "critical",
    });
    expect([...forCritical]).toEqual([A]);
    const forSensitive = await store.independentKeys({
      publisherPublicKey: PUBLISHER,
      needed: "sensitive",
    });
    expect(forSensitive.size).toBe(2);
    expect(forSensitive.has(A)).toBe(true);
    expect(forSensitive.has(C)).toBe(true);
  });
});
