import { describe, expect, it } from "vitest";
import {
  PATHFINDER_MAX_HOPS,
  announceEmittedFromRandomBlob,
  shouldAddPathEntry,
  shouldAnswerPathRequest,
  stepPathTable,
  initialPathTableState
} from "../src/path-table.js";

function blobWithEmitted(emitted: number): Uint8Array {
  const blob = new Uint8Array(10);
  blob[5] = (emitted >>> 32) & 0xff;
  blob[6] = (emitted >>> 24) & 0xff;
  blob[7] = (emitted >>> 16) & 0xff;
  blob[8] = (emitted >>> 8) & 0xff;
  blob[9] = emitted & 0xff;
  return blob;
}

describe("protocol path table", () => {
  it("answers path requests unless next hop is the requestor", () => {
    const nextHop = new Uint8Array([1, 2, 3]);
    expect(shouldAnswerPathRequest(nextHop, null)).toBe(true);
    expect(shouldAnswerPathRequest(nextHop, new Uint8Array([9, 9, 9]))).toBe(true);
    expect(shouldAnswerPathRequest(nextHop, nextHop)).toBe(false);
  });

  it("adds first path under max hops", () => {
    expect(
      shouldAddPathEntry({
        hops: 1,
        randomBlob: blobWithEmitted(100),
        nowSeconds: 0,
        existing: null
      })
    ).toBe(true);
    expect(
      shouldAddPathEntry({
        hops: PATHFINDER_MAX_HOPS + 1,
        randomBlob: blobWithEmitted(100),
        nowSeconds: 0,
        existing: null
      })
    ).toBe(false);
  });

  it("prefers newer announce timebase at equal-or-better hops", () => {
    const older = blobWithEmitted(10);
    const newer = blobWithEmitted(20);
    expect(announceEmittedFromRandomBlob(newer)).toBeGreaterThan(announceEmittedFromRandomBlob(older));
    expect(
      shouldAddPathEntry({
        hops: 2,
        randomBlob: newer,
        nowSeconds: 100,
        existing: { hops: 2, expires: 1_000, randomBlobs: [older] }
      })
    ).toBe(true);
    expect(
      shouldAddPathEntry({
        hops: 2,
        randomBlob: older,
        nowSeconds: 100,
        existing: { hops: 2, expires: 1_000, randomBlobs: [newer] }
      })
    ).toBe(false);
  });

  it("stepPathTable is deterministic", () => {
    const run = () => {
      let state = initialPathTableState();
      const blob = blobWithEmitted(50);
      state = stepPathTable(state, {
        kind: "path/announce",
        destinationKey: "dest",
        hops: 1,
        randomBlob: blob,
        at: 10
      } as never).state;
      return { lastAdded: state.lastAdded, hops: state.entries.get("dest")?.hops };
    };
    expect(run()).toEqual(run());
  });
});
