import { describe, expect, it } from "vitest";
import {
  NAME_HASH_BITS,
  NAME_HASH_BYTES,
  PacketContextCode,
  TRUNCATED_HASH_BITS,
  TRUNCATED_HASH_BYTES,
  initialTruncateHashBytesState,
  shouldRejectTruncateHashBytes,
  shouldUseTruncateHashBytes,
  stepTruncateHashBytesWithActions,
  truncateHashBytes,
  truncateHashBytesRawFromActions,
  truncateToNameHash,
  truncateToTruncatedHash,
  utf8OrBytes
} from "../src/index.js";

describe("hash-truncate", () => {
  it("exposes RNS truncated and name-hash sizes", () => {
    expect(TRUNCATED_HASH_BITS).toBe(128);
    expect(TRUNCATED_HASH_BYTES).toBe(16);
    expect(NAME_HASH_BITS).toBe(80);
    expect(NAME_HASH_BYTES).toBe(10);
  });

  it("truncates digests to configured lengths", () => {
    const digest = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
    expect(Array.from(truncateToTruncatedHash(digest))).toEqual(
      Array.from(digest.subarray(0, 16))
    );
    expect(Array.from(truncateToNameHash(digest))).toEqual(Array.from(digest.subarray(0, 10)));
    expect(Array.from(truncateHashBytes(digest, 4))).toEqual([1, 2, 3, 4]);
  });

  it("rejects undersized digests", () => {
    expect(() => truncateHashBytes(new Uint8Array(8), 16)).toThrow(/at least 16/);
  });

  it("truncates via use-raw actions", () => {
    const digest = Uint8Array.from({ length: 32 }, (_, i) => i + 1);
    const truncated = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
      kind: "hash-truncate/truncate-gate",
      digest
    });
    expect(shouldUseTruncateHashBytes(truncated.actions)).toBe(true);
    expect(shouldRejectTruncateHashBytes(truncated.actions)).toBe(false);
    expect(Array.from(truncateHashBytesRawFromActions(truncated.actions)!)).toEqual(
      Array.from(digest.subarray(0, 16))
    );

    const nameHash = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
      kind: "hash-truncate/truncate-gate",
      digest,
      length: NAME_HASH_BYTES
    });
    expect(Array.from(truncateHashBytesRawFromActions(nameHash.actions)!)).toEqual(
      Array.from(digest.subarray(0, 10))
    );

    const rejected = stepTruncateHashBytesWithActions(initialTruncateHashBytesState(), {
      kind: "hash-truncate/truncate-gate",
      digest: new Uint8Array(8),
      length: 16
    });
    expect(shouldRejectTruncateHashBytes(rejected.actions)).toBe(true);
    expect(truncateHashBytesRawFromActions(rejected.actions)).toBeNull();
  });
});

describe("packet-context", () => {
  it("matches RNS packet context byte codes", () => {
    expect(PacketContextCode.NONE).toBe(0x00);
    expect(PacketContextCode.PATH_RESPONSE).toBe(0x0b);
    expect(PacketContextCode.LRPROOF).toBe(0xff);
    expect(PacketContextCode.KEEPALIVE).toBe(0xfa);
  });
});

describe("utf8OrBytes", () => {
  it("encodes strings and copies bytes", () => {
    expect(Array.from(utf8OrBytes("ab"))).toEqual([97, 98]);
    const bytes = new Uint8Array([1, 2, 3]);
    const copied = utf8OrBytes(bytes);
    expect(Array.from(copied)).toEqual([1, 2, 3]);
    expect(copied).not.toBe(bytes);
  });
});
