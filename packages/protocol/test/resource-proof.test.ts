import { describe, expect, it } from "vitest";
import {
  RESOURCE_PROOF_SIZE,
  isValidResourceProof,
  packResourceProof,
  splitResourceDecryptedPayload,
  splitResourceProof
} from "../src/resource-proof.js";

describe("protocol resource proof", () => {
  const hash = new Uint8Array(32).fill(1);
  const proof = new Uint8Array(32).fill(2);

  it("packs and splits proof payloads", () => {
    const packed = packResourceProof(hash, proof);
    expect(packed.length).toBe(RESOURCE_PROOF_SIZE);
    const split = splitResourceProof(packed);
    expect([...split!.resourceHash]).toEqual([...hash]);
    expect([...split!.proofHash]).toEqual([...proof]);
  });

  it("validates expected proof bytes", () => {
    const packed = packResourceProof(hash, proof);
    expect(isValidResourceProof(packed, proof)).toBe(true);
    expect(isValidResourceProof(packed, new Uint8Array(32).fill(9))).toBe(false);
    expect(isValidResourceProof(new Uint8Array(10), proof)).toBe(false);
  });

  it("splits decrypted payload after random hash prefix", () => {
    const decrypted = new Uint8Array([1, 2, 3, 4, 9, 8, 7]);
    expect([...splitResourceDecryptedPayload(decrypted)!]).toEqual([9, 8, 7]);
    expect(splitResourceDecryptedPayload(new Uint8Array([1, 2]))).toBeNull();
  });
});
