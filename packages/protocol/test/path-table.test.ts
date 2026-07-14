import { describe, expect, it } from "vitest";
import {
  PATHFINDER_MAX_HOPS,
  PATH_REQUEST_MIN_INTERVAL,
  PATH_REQUEST_TIMEOUT_SECONDS,
  PACKET_DEST_TYPE_GROUP,
  PACKET_DEST_TYPE_PLAIN,
  PACKET_DEST_TYPE_SINGLE,
  PACKET_HEADER_1,
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_DATA,
  announceEmittedFromRandomBlob,
  appendPathRandomBlob,
  isDiscoveryPathRequestExpired,
  isPathEntryExpired,
  planDiscoveryPathRequestFulfill,
  planPathEntryLookup,
  planPathOutbound,
  planPathRequestIngress,
  canAnswerLocalPathRequest,
  shouldAddPathEntry,
  shouldAnswerPathRequest,
  shouldBeginPathDiscovery,
  shouldClearExpiredDiscoveryPathRequest,
  shouldEmitPathRequest,
  shouldRememberPathRequestTag,
  stepPathTable,
  initialPathTableState
} from "../src/index.js";

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

  it("throttles path-request emission by min interval", () => {
    expect(
      shouldEmitPathRequest({ lastRequestAt: 100, nowSeconds: 100 + PATH_REQUEST_MIN_INTERVAL - 1 })
    ).toBe(false);
    expect(
      shouldEmitPathRequest({ lastRequestAt: 100, nowSeconds: 100 + PATH_REQUEST_MIN_INTERVAL })
    ).toBe(true);
  });

  it("expires discovery path-request entries past absolute deadline", () => {
    const timeoutAt = 100 + PATH_REQUEST_TIMEOUT_SECONDS;
    expect(isDiscoveryPathRequestExpired({ timeoutAt, nowSeconds: timeoutAt })).toBe(false);
    expect(isDiscoveryPathRequestExpired({ timeoutAt, nowSeconds: timeoutAt + 1 })).toBe(true);
  });

  it("expires path-table entries at or past expires", () => {
    expect(isPathEntryExpired({ expires: 100, nowSeconds: 99 })).toBe(false);
    expect(isPathEntryExpired({ expires: 100, nowSeconds: 100 })).toBe(true);
    expect(isPathEntryExpired({ expires: 100, nowSeconds: 101 })).toBe(true);
  });

  it("dedupe-appends path announce random blobs", () => {
    const first = new Uint8Array([1, 2, 3]);
    const second = new Uint8Array([4, 5, 6]);
    const once = appendPathRandomBlob({ randomBlobs: [], randomBlob: first });
    expect(once).toHaveLength(1);
    expect(appendPathRandomBlob({ randomBlobs: once, randomBlob: first })).toHaveLength(1);
    expect(appendPathRandomBlob({ randomBlobs: once, randomBlob: second })).toHaveLength(2);
  });

  it("plans wrap, direct, and flood outbound kinds", () => {
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("wrap");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 1
      })
    ).toBe("direct");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_ANNOUNCE,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_PLAIN,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_GROUP,
        headerType: PACKET_HEADER_1,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_2,
        hasPath: true,
        pathHops: 3
      })
    ).toBe("flood");
    expect(
      planPathOutbound({
        packetType: PACKET_TYPE_DATA,
        destinationType: PACKET_DEST_TYPE_SINGLE,
        headerType: PACKET_HEADER_1,
        hasPath: false,
        pathHops: 0
      })
    ).toBe("flood");
  });

  it("plans path-request ingress for leaf and discovery nodes", () => {
    expect(
      planPathRequestIngress({
        parsedOk: false,
        hasTag: false,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore-unparsed");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: true,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore-seen-tag");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: true,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("answer-local");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: false,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: true,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("answer-path");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: true,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false
      })
    ).toBe("ignore");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
        allowDiscovery: false
      })
    ).toBe("ignore");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: true,
        discoveryExpired: false,
        allowDiscovery: true
      })
    ).toBe("ignore-in-flight-discovery");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: true,
        discoveryExpired: true,
        allowDiscovery: true
      })
    ).toBe("start-discovery");
    expect(
      planPathRequestIngress({
        parsedOk: true,
        hasTag: true,
        tagAlreadySeen: false,
        hasLocalAnswerer: false,
        transportEnabled: true,
        hasPath: false,
        shouldAnswerPath: false,
        discoveryPresent: false,
        discoveryExpired: false,
        allowDiscovery: true
      })
    ).toBe("start-discovery");
  });

  it("gates local answer handler and discovery begin", () => {
    expect(canAnswerLocalPathRequest(true)).toBe(true);
    expect(canAnswerLocalPathRequest(false)).toBe(false);
    expect(
      shouldBeginPathDiscovery({
        parsedOk: true,
        tagPresent: true,
        destinationKeyPresent: true
      })
    ).toBe(true);
    expect(
      shouldBeginPathDiscovery({
        parsedOk: true,
        tagPresent: true,
        destinationKeyPresent: false
      })
    ).toBe(false);
    expect(shouldClearExpiredDiscoveryPathRequest(true)).toBe(true);
    expect(shouldClearExpiredDiscoveryPathRequest(false)).toBe(false);
    expect(shouldRememberPathRequestTag(true)).toBe(true);
    expect(shouldRememberPathRequestTag(false)).toBe(false);
  });

  it("plans discovery path-request fulfill from announce", () => {
    expect(
      planDiscoveryPathRequestFulfill({
        hasPending: false,
        expired: false
      })
    ).toBe("ignore");
    expect(
      planDiscoveryPathRequestFulfill({
        hasPending: true,
        expired: true
      })
    ).toBe("drop-expired");
    expect(
      planDiscoveryPathRequestFulfill({
        hasPending: true,
        expired: false
      })
    ).toBe("fulfill");
  });

  it("plans path-table get miss/expired/hit", () => {
    expect(planPathEntryLookup({ entryPresent: false, expired: false })).toBe("miss");
    expect(planPathEntryLookup({ entryPresent: true, expired: true })).toBe("expired");
    expect(planPathEntryLookup({ entryPresent: true, expired: false })).toBe("hit");
  });
});
