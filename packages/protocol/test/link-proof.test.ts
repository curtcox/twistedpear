import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_PUBLIC_KEY_SIZE,
  LINK_PROOF_SIGNATURE_SIZE,
  linkProofSignedMaterial,
  packLinkProofData
} from "../src/link-proof.js";

describe("protocol link proof materials", () => {
  it("builds signed material and packs proof data", () => {
    const linkId = new Uint8Array(16).fill(1);
    const publicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(2);
    const ownerSig = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(3);
    const signalling = new Uint8Array([4, 5, 6]);
    const signed = linkProofSignedMaterial(linkId, publicKey, ownerSig, signalling);
    expect(signed.length).toBe(linkId.length + publicKey.length + ownerSig.length + signalling.length);

    const signature = new Uint8Array(LINK_PROOF_SIGNATURE_SIZE).fill(7);
    const packed = packLinkProofData(signature, publicKey, signalling);
    expect(packed.length).toBe(LINK_PROOF_BODY_SIZE + signalling.length);
    expect([...packed.subarray(0, LINK_PROOF_SIGNATURE_SIZE)]).toEqual([...signature]);
  });
});
