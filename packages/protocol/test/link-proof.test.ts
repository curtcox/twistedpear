import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_PUBLIC_KEY_SIZE,
  LINK_PROOF_SIGNATURE_SIZE,
  LINK_REQUEST_ECPUB_SIZE,
  initialPackLinkProofDataState,
  initialPackLinkRequestDataState,
  initialSplitLinkProofBodyState,
  initialSplitLinkRequestDataState,
  linkProofBodyFieldsFromActions,
  linkProofSignedMaterial,
  linkRequestHashablePart,
  linkRequestKeyFieldsFromActions,
  packLinkProofData,
  packLinkProofDataRawFromActions,
  packLinkRequestData,
  packLinkRequestDataRawFromActions,
  shouldRejectSplitLinkProofBody,
  shouldRejectSplitLinkRequestData,
  shouldUsePackLinkProofData,
  shouldUsePackLinkRequestData,
  shouldUseSplitLinkProofBody,
  shouldUseSplitLinkRequestData,
  splitLinkRequestData,
  stepPackLinkProofDataWithActions,
  stepPackLinkRequestDataWithActions,
  stepSplitLinkProofBodyWithActions,
  stepSplitLinkRequestDataWithActions
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

  it("emits pack framing bytes from WithActions steps", () => {
    const signature = new Uint8Array(LINK_PROOF_SIGNATURE_SIZE).fill(7);
    const publicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(2);
    const signalling = new Uint8Array([4, 5, 6]);

    const proofStepped = stepPackLinkProofDataWithActions(initialPackLinkProofDataState(), {
      kind: "link-proof/pack-gate",
      signature,
      publicKey,
      signallingBytes: signalling
    });
    expect(shouldUsePackLinkProofData(proofStepped.actions)).toBe(true);
    const proofPacked = packLinkProofDataRawFromActions(proofStepped.actions);
    expect(proofPacked).not.toBeNull();
    expect([...proofPacked!]).toEqual([...packLinkProofData(signature, publicKey, signalling)]);

    const signaturePublicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(3);
    const requestStepped = stepPackLinkRequestDataWithActions(initialPackLinkRequestDataState(), {
      kind: "link-request/pack-gate",
      publicKey,
      signaturePublicKey,
      signallingBytes: signalling
    });
    expect(shouldUsePackLinkRequestData(requestStepped.actions)).toBe(true);
    const requestPacked = packLinkRequestDataRawFromActions(requestStepped.actions);
    expect(requestPacked).not.toBeNull();
    expect([...requestPacked!]).toEqual([
      ...packLinkRequestData(publicKey, signaturePublicKey, signalling)
    ]);
  });

  it("emits split fields or reject from WithActions steps", () => {
    const signature = new Uint8Array(LINK_PROOF_SIGNATURE_SIZE).fill(7);
    const publicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(2);
    const proofPacked = packLinkProofData(signature, publicKey);
    const proofOk = stepSplitLinkProofBodyWithActions(initialSplitLinkProofBodyState(), {
      kind: "link-proof/split-body-gate",
      data: proofPacked
    });
    expect(shouldUseSplitLinkProofBody(proofOk.actions)).toBe(true);
    expect(shouldRejectSplitLinkProofBody(proofOk.actions)).toBe(false);
    const body = linkProofBodyFieldsFromActions(proofOk.actions);
    expect(body).not.toBeNull();
    expect([...body!.signature]).toEqual([...signature]);
    expect([...body!.peerPublicKey]).toEqual([...publicKey]);

    const proofRejected = stepSplitLinkProofBodyWithActions(initialSplitLinkProofBodyState(), {
      kind: "link-proof/split-body-gate",
      data: new Uint8Array(10)
    });
    expect(shouldRejectSplitLinkProofBody(proofRejected.actions)).toBe(true);
    expect(shouldUseSplitLinkProofBody(proofRejected.actions)).toBe(false);
    expect(linkProofBodyFieldsFromActions(proofRejected.actions)).toBeNull();

    const signaturePublicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(3);
    const signalling = new Uint8Array([3, 4, 5]);
    const requestPacked = packLinkRequestData(publicKey, signaturePublicKey, signalling);
    const requestOk = stepSplitLinkRequestDataWithActions(initialSplitLinkRequestDataState(), {
      kind: "link-request/split-gate",
      data: requestPacked
    });
    expect(shouldUseSplitLinkRequestData(requestOk.actions)).toBe(true);
    expect(shouldRejectSplitLinkRequestData(requestOk.actions)).toBe(false);
    const fields = linkRequestKeyFieldsFromActions(requestOk.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.publicKey]).toEqual([...publicKey]);
    expect([...fields!.signaturePublicKey]).toEqual([...signaturePublicKey]);
    expect([...fields!.signallingBytes]).toEqual([...signalling]);

    const requestRejected = stepSplitLinkRequestDataWithActions(initialSplitLinkRequestDataState(), {
      kind: "link-request/split-gate",
      data: new Uint8Array(10)
    });
    expect(shouldRejectSplitLinkRequestData(requestRejected.actions)).toBe(true);
    expect(shouldUseSplitLinkRequestData(requestRejected.actions)).toBe(false);
    expect(linkRequestKeyFieldsFromActions(requestRejected.actions)).toBeNull();
  });
});
