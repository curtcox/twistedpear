/**
 * User-assigned reviewer trust. No global score, no badge.
 * Independence is a property of acquisition: two keys from the same import
 * do not both count toward K, and a key from the app's publisher never counts.
 */

import { hexToBytes } from "@twistedpear/reticulum-ts";
import type { TrustKeyValueStore, TrustSource } from "./trust.js";
import { TrustStoreError } from "./trust.js";

export type ReviewerScope = "sensitive" | "critical";

export interface TrustedReviewer {
  readonly reviewerPublicKey: string;
  readonly label: string;
  readonly addedAt: number;
  readonly source: TrustSource;
  readonly scope: ReviewerScope;
  /** Keys that share this id arrived together and are not independent. */
  readonly importBatchId: string;
}

const STORE_KEY = "trust:reviewers";
const PUBLIC_KEY_BYTES = 64;
const SCOPE_RANK: Readonly<Record<ReviewerScope, number>> = {
  sensitive: 1,
  critical: 2,
};

function validateKey(publicKey: string): void {
  if (!/^[0-9a-f]+$/i.test(publicKey)) {
    throw new TrustStoreError("INVALID_KEY", "Reviewer key must be hex");
  }
  if (hexToBytes(publicKey).length !== PUBLIC_KEY_BYTES) {
    throw new TrustStoreError(
      "INVALID_KEY",
      `Reviewer key must be ${PUBLIC_KEY_BYTES} bytes`,
    );
  }
}

export function reviewerCoversScope(
  reviewer: TrustedReviewer,
  needed: ReviewerScope,
): boolean {
  return SCOPE_RANK[reviewer.scope] >= SCOPE_RANK[needed];
}

/**
 * Keys that may count toward K for this publisher and tier.
 * At most one key per import batch; never the app's own publisher.
 */
export function independentReviewerKeys(
  reviewers: ReadonlyArray<TrustedReviewer>,
  options: {
    readonly publisherPublicKey: string;
    readonly needed: ReviewerScope;
  },
): Set<string> {
  const keys = new Set<string>();
  const batches = new Set<string>();
  for (const reviewer of reviewers) {
    if (reviewer.reviewerPublicKey === options.publisherPublicKey) continue;
    if (!reviewerCoversScope(reviewer, options.needed)) continue;
    if (batches.has(reviewer.importBatchId)) continue;
    batches.add(reviewer.importBatchId);
    keys.add(reviewer.reviewerPublicKey);
  }
  return keys;
}

export class ReviewerStore {
  constructor(private readonly store: TrustKeyValueStore) {}

  async list(): Promise<ReadonlyArray<TrustedReviewer>> {
    const raw = await this.store.get(STORE_KEY);
    if (raw === null) return [];
    return JSON.parse(new TextDecoder().decode(raw)) as TrustedReviewer[];
  }

  async add(entry: TrustedReviewer): Promise<ReadonlyArray<TrustedReviewer>> {
    validateKey(entry.reviewerPublicKey);
    const existing = await this.list();
    const next = [
      ...existing.filter(
        (candidate) => candidate.reviewerPublicKey !== entry.reviewerPublicKey,
      ),
      {
        ...entry,
        label: entry.label.slice(0, 64),
        importBatchId:
          entry.importBatchId.length > 0
            ? entry.importBatchId
            : `solo:${entry.reviewerPublicKey}`,
      },
    ];
    await this.save(next);
    return next;
  }

  async remove(
    reviewerPublicKey: string,
  ): Promise<ReadonlyArray<TrustedReviewer>> {
    const next = (await this.list()).filter(
      (entry) => entry.reviewerPublicKey !== reviewerPublicKey,
    );
    await this.save(next);
    return next;
  }

  async independentKeys(options: {
    readonly publisherPublicKey: string;
    readonly needed: ReviewerScope;
  }): Promise<Set<string>> {
    return independentReviewerKeys(await this.list(), options);
  }

  private async save(entries: ReadonlyArray<TrustedReviewer>): Promise<void> {
    await this.store.set(
      STORE_KEY,
      new TextEncoder().encode(JSON.stringify(entries)),
    );
  }
}
