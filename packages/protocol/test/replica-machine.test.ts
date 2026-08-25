import { describe, expect, it } from "vitest";
import {
  capReplicaLogs,
  initialReplicaState,
  mergeReplicaLogs,
  replicaVisibleView,
  stepReplica,
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

describe("replica machine", () => {
  it("opens, appends, caps, evicts, and closes", () => {
    let state = initialReplicaState();
    expect(state.phase).toBe("idle");
    state = stepReplica(state, { kind: "replica/open" }).state;
    expect(state.phase).toBe("open");
    state = stepReplica(state, { kind: "replica/append" }).state;
    expect(state.phase).toBe("open");
    state = stepReplica(state, { kind: "replica/cap" }).state;
    expect(state.phase).toBe("capped");
    state = stepReplica(state, { kind: "replica/evict" }).state;
    expect(state.phase).toBe("open");
    state = stepReplica(state, { kind: "replica/close" }).state;
    expect(state.phase).toBe("closed");
  });
});

describe("replica merge", () => {
  it("is a join: commutative, associative, idempotent", () => {
    const a = [entry("a", 1, 1)];
    const b = [entry("b", 1, 2)];
    const c = [entry("a", 2, 3, { key: "k", payload: "x" })];
    expect(mergeReplicaLogs(a, b)).toEqual(mergeReplicaLogs(b, a));
    expect(mergeReplicaLogs(mergeReplicaLogs(a, b), c)).toEqual(
      mergeReplicaLogs(a, mergeReplicaLogs(b, c)),
    );
    expect(mergeReplicaLogs(a, a)).toEqual(a);
  });

  it("does not resurrect a tombstoned key", () => {
    const live = entry("a", 1, 1, { key: "k", payload: "old" });
    const tomb = entry("a", 2, 2, { key: "k", tombstone: true, payload: null });
    const laterLive = entry("b", 1, 1, { key: "k", payload: "stale" });
    const merged = mergeReplicaLogs([live, tomb], [laterLive]);
    expect(replicaVisibleView(merged).has("k")).toBe(false);
  });

  it("bounds retained entries per author", () => {
    const log = [entry("a", 1, 1), entry("a", 2, 2), entry("a", 3, 3)];
    expect(capReplicaLogs(log, 2).map((item) => item.seq)).toEqual([2, 3]);
  });
});
