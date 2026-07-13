import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_PUBLIC_KEY_SIZE,
  LINK_PROOF_SIGNATURE_SIZE,
  LINK_REQUEST_ECPUB_SIZE,
  linkProofSignedMaterial,
  linkRequestHashablePart,
  packLinkProofData,
  packLinkRequestData,
  splitLinkRequestData
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

  it("packs and splits link-request payloads", () => {
    const publicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(1);
    const signaturePublicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(2);
    const signalling = new Uint8Array([3, 4, 5]);
    const packed = packLinkRequestData(publicKey, signaturePublicKey, signalling);
    expect(packed.length).toBe(LINK_REQUEST_ECPUB_SIZE + signalling.length);
    const split = splitLinkRequestData(packed);
    expect(split).not.toBeNull();
    expect([...split!.publicKey]).toEqual([...publicKey]);
    expect([...split!.signaturePublicKey]).toEqual([...signaturePublicKey]);
    expect([...split!.signallingBytes]).toEqual([...signalling]);

    const hashable = new Uint8Array(20).fill(9);
    expect([...linkRequestHashablePart(hashable, LINK_REQUEST_ECPUB_SIZE)]).toEqual([...hashable]);
    expect(linkRequestHashablePart(hashable, LINK_REQUEST_ECPUB_SIZE + 3).length).toBe(17);
  });
});
