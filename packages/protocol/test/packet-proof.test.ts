import { describe, expect, it } from "vitest";
import {
  PACKET_EXPLICIT_PROOF_SIZE,
  PACKET_FULL_HASH_SIZE,
  PACKET_SIGNATURE_SIZE,
  packPacketProof,
  packetProofHashMatches,
  splitPacketProof
} from "../src/packet-proof.js";

describe("protocol packet proof framing", () => {
  const packetHash = new Uint8Array(PACKET_FULL_HASH_SIZE).fill(1);
  const signature = new Uint8Array(PACKET_SIGNATURE_SIZE).fill(2);

  it("packs and splits explicit proofs", () => {
    const packed = packPacketProof(packetHash, signature, true);
    expect(packed.length).toBe(PACKET_EXPLICIT_PROOF_SIZE);
    const split = splitPacketProof(packed);
    expect(split?.kind).toBe("explicit");
    if (split?.kind === "explicit") {
      expect([...split.packetHash]).toEqual([...packetHash]);
      expect([...split.signature]).toEqual([...signature]);
      expect(packetProofHashMatches(split, packetHash)).toBe(true);
      expect(packetProofHashMatches(split, new Uint8Array(PACKET_FULL_HASH_SIZE).fill(9))).toBe(false);
    }
  });

  it("packs and splits implicit proofs", () => {
    const packed = packPacketProof(packetHash, signature, false);
    expect(packed.length).toBe(PACKET_SIGNATURE_SIZE);
    const split = splitPacketProof(packed);
    expect(split).toEqual({ kind: "implicit", signature });
    expect(packetProofHashMatches(split!, packetHash)).toBe(true);
  });

  it("rejects malformed proof lengths", () => {
    expect(splitPacketProof(new Uint8Array(10))).toBeNull();
  });
});
