import { describe, expect, it } from "vitest";
import {
  admitReplicaEntries,
  replicaRetentionWindows,
  type ReplicaEntry,
} from "../src/index.js";

function entry(
  authorId: string,
  seq: number,
  at: number,
  extra: Partial<ReplicaEntry> = {},
): ReplicaEntry {
  return { authorId, seq, at, payload: extra.payload ?? seq, ...extra };
}

describe("replica admission", () => {
  it("rejects an entry attributed to the local author", () => {
    const local = [entry("self", 1, 1, { key: "k", payload: "mine" })];
    const result = admitReplicaEntries(
      local,
      [entry("self", 2, 2, { key: "k", payload: "forged" })],
      { localAuthorId: "self" },
    );
    expect(result.accepted).toEqual([]);
    expect(result.rejected[0]?.reason).toBe("forged-author");
  });

  it("rejects a sender forging another author's id", () => {
    const result = admitReplicaEntries(
      [],
      [entry("alice", 1, 1, { key: "k", payload: "stolen" })],
      { localAuthorId: "self", fromAuthorId: "bob" },
    );
    expect(result.rejected[0]?.reason).toBe("forged-author");
  });

  it("rejects an author with no live offer", () => {
    const result = admitReplicaEntries(
      [],
      [entry("stranger", 1, 1)],
      { localAuthorId: "self", offeredAuthors: new Set(["peer"]) },
    );
    expect(result.rejected[0]?.reason).toBe("unoffered-author");
  });

  it("rejects a tombstone that would hide another author's live key", () => {
    const local = [entry("self", 1, 1, { key: "slot", payload: "held" })];
    const result = admitReplicaEntries(
      local,
      [entry("peer", 1, 9, { key: "slot", tombstone: true, payload: null })],
      { localAuthorId: "self", fromAuthorId: "peer" },
    );
    expect(result.rejected[0]?.reason).toBe("cross-author-tombstone");
  });

  it("rejects a conflicting payload for an existing id", () => {
    const local = [entry("peer", 1, 1, { payload: "a" })];
    const result = admitReplicaEntries(
      local,
      [entry("peer", 1, 1, { payload: "b" })],
      { localAuthorId: "self", fromAuthorId: "peer" },
    );
    expect(result.rejected[0]?.reason).toBe("conflict");
  });

  it("reports the retained seq window after capping", () => {
    const log = [entry("a", 3, 3), entry("a", 4, 4), entry("b", 1, 1)];
    expect(replicaRetentionWindows(log)).toEqual({
      a: { minSeq: 3, maxSeq: 4 },
      b: { minSeq: 1, maxSeq: 1 },
    });
  });
});
