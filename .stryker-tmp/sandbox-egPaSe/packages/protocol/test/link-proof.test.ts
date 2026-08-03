// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_MTU_SIZE,
  LINK_PROOF_PUBLIC_KEY_SIZE,
  LINK_PROOF_SIGNATURE_SIZE,
  LINK_REQUEST_ECPUB_SIZE,
  encodeLinkMtuBytes,
  encodeLinkMtuBytesRawFromActions,
  encodeLinkSignallingBytes,
  encodeLinkSignallingBytesRawFromActions,
  initialClassifyLinkProofPayloadState,
  initialEncodeLinkMtuBytesState,
  initialEncodeLinkSignallingBytesState,
  initialLinkProofSignedMaterialState,
  initialLinkRequestHashablePartState,
  initialModeFromLinkProofDataState,
  initialModeFromLinkRequestDataState,
  initialMtuFromLinkProofDataState,
  initialMtuFromLinkRequestDataState,
  initialPackLinkProofDataState,
  initialPackLinkRequestDataState,
  initialSplitLinkProofBodyState,
  initialSplitLinkRequestDataState,
  linkProofBodyFieldsFromActions,
  linkProofSignedMaterial,
  linkProofSignedMaterialRawFromActions,
  linkRequestHashablePart,
  linkRequestHashablePartRawFromActions,
  linkRequestKeyFieldsFromActions,
  modeFromLinkProofData,
  modeFromLinkProofDataFromActions,
  modeFromLinkRequestData,
  modeFromLinkRequestDataFromActions,
  mtuFromLinkProofData,
  mtuFromLinkProofDataFromActions,
  mtuFromLinkRequestData,
  mtuFromLinkRequestDataFromActions,
  packLinkProofData,
  packLinkProofDataRawFromActions,
  packLinkRequestData,
  packLinkRequestDataRawFromActions,
  shouldClassifyLinkProofPayloadBodyOnly,
  shouldClassifyLinkProofPayloadBodyWithMtu,
  shouldRejectClassifyLinkProofPayload,
  shouldRejectMtuFromLinkProofData,
  shouldRejectMtuFromLinkRequestData,
  shouldRejectSplitLinkProofBody,
  shouldRejectSplitLinkRequestData,
  shouldUseEncodeLinkMtuBytes,
  shouldUseEncodeLinkSignallingBytes,
  shouldUseLinkProofSignedMaterial,
  shouldUseLinkRequestHashablePart,
  shouldUseModeFromLinkProofData,
  shouldUseModeFromLinkRequestData,
  shouldUseMtuFromLinkProofData,
  shouldUseMtuFromLinkRequestData,
  shouldUsePackLinkProofData,
  shouldUsePackLinkRequestData,
  shouldUseSplitLinkProofBody,
  shouldUseSplitLinkRequestData,
  splitLinkRequestData,
  stepClassifyLinkProofPayloadWithActions,
  stepEncodeLinkMtuBytesWithActions,
  stepEncodeLinkSignallingBytesWithActions,
  stepLinkProofSignedMaterialWithActions,
  stepLinkRequestHashablePartWithActions,
  stepModeFromLinkProofDataWithActions,
  stepModeFromLinkRequestDataWithActions,
  stepMtuFromLinkProofDataWithActions,
  stepMtuFromLinkRequestDataWithActions,
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

    const signedStepped = stepLinkProofSignedMaterialWithActions(
      initialLinkProofSignedMaterialState(),
      {
        kind: "link-proof/signed-material-gate",
        linkId,
        publicKey,
        ownerSigPublicKey: ownerSig,
        signallingBytes: signalling
      }
    );
    expect(shouldUseLinkProofSignedMaterial(signedStepped.actions)).toBe(true);
    const signedFromActions = linkProofSignedMaterialRawFromActions(signedStepped.actions);
    expect(signedFromActions).not.toBeNull();
    expect([...signedFromActions!]).toEqual([...signed]);

    const signature = new Uint8Array(LINK_PROOF_SIGNATURE_SIZE).fill(7);
    const packed = packLinkProofData(signature, publicKey, signalling);
    expect(packed.length).toBe(LINK_PROOF_BODY_SIZE + signalling.length);
    expect([...packed.subarray(0, LINK_PROOF_SIGNATURE_SIZE)]).toEqual([...signature]);
  });

  it("emits signalling and MTU encode bytes from WithActions steps", () => {
    const signallingStepped = stepEncodeLinkSignallingBytesWithActions(
      initialEncodeLinkSignallingBytesState(),
      {
        kind: "link-proof/encode-signalling-gate",
        mtu: 500,
        mode: 0x01
      }
    );
    expect(shouldUseEncodeLinkSignallingBytes(signallingStepped.actions)).toBe(true);
    const signalling = encodeLinkSignallingBytesRawFromActions(signallingStepped.actions);
    expect(signalling).not.toBeNull();
    expect([...signalling!]).toEqual([...encodeLinkSignallingBytes(500, 0x01)]);

    const mtuStepped = stepEncodeLinkMtuBytesWithActions(initialEncodeLinkMtuBytesState(), {
      kind: "link-proof/encode-mtu-gate",
      mtu: 0x123456
    });
    expect(shouldUseEncodeLinkMtuBytes(mtuStepped.actions)).toBe(true);
    const mtuBytes = encodeLinkMtuBytesRawFromActions(mtuStepped.actions);
    expect(mtuBytes).not.toBeNull();
    expect([...mtuBytes!]).toEqual([...encodeLinkMtuBytes(0x123456)]);
  });

  it("emits mode / MTU decode and proof-payload classify from WithActions steps", () => {
    const signalling = encodeLinkSignallingBytes(500, 0x01);
    const publicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(2);
    const signaturePublicKey = new Uint8Array(LINK_PROOF_PUBLIC_KEY_SIZE).fill(3);
    const requestData = packLinkRequestData(publicKey, signaturePublicKey, signalling);
    const proofData = packLinkProofData(
      new Uint8Array(LINK_PROOF_SIGNATURE_SIZE).fill(7),
      publicKey,
      signalling
    );

    const requestModeStepped = stepModeFromLinkRequestDataWithActions(
      initialModeFromLinkRequestDataState(),
      {
        kind: "link-proof/mode-from-request-gate",
        data: requestData,
        defaultMode: 0
      }
    );
    expect(shouldUseModeFromLinkRequestData(requestModeStepped.actions)).toBe(true);
    expect(modeFromLinkRequestDataFromActions(requestModeStepped.actions)).toBe(
      modeFromLinkRequestData(requestData, 0)
    );

    const proofModeStepped = stepModeFromLinkProofDataWithActions(initialModeFromLinkProofDataState(), {
      kind: "link-proof/mode-from-proof-gate",
      data: proofData,
      defaultMode: 0
    });
    expect(shouldUseModeFromLinkProofData(proofModeStepped.actions)).toBe(true);
    expect(modeFromLinkProofDataFromActions(proofModeStepped.actions)).toBe(
      modeFromLinkProofData(proofData, 0)
    );

    const requestMtuOk = stepMtuFromLinkRequestDataWithActions(initialMtuFromLinkRequestDataState(), {
      kind: "link-proof/mtu-from-request-gate",
      data: requestData
    });
    expect(shouldUseMtuFromLinkRequestData(requestMtuOk.actions)).toBe(true);
    expect(shouldRejectMtuFromLinkRequestData(requestMtuOk.actions)).toBe(false);
    expect(mtuFromLinkRequestDataFromActions(requestMtuOk.actions)).toBe(mtuFromLinkRequestData(requestData));

    const requestMtuRejected = stepMtuFromLinkRequestDataWithActions(
      initialMtuFromLinkRequestDataState(),
      {
        kind: "link-proof/mtu-from-request-gate",
        data: new Uint8Array(LINK_REQUEST_ECPUB_SIZE)
      }
    );
    expect(shouldRejectMtuFromLinkRequestData(requestMtuRejected.actions)).toBe(true);
    expect(mtuFromLinkRequestDataFromActions(requestMtuRejected.actions)).toBeNull();

    const proofMtuOk = stepMtuFromLinkProofDataWithActions(initialMtuFromLinkProofDataState(), {
      kind: "link-proof/mtu-from-proof-gate",
      data: proofData
    });
    expect(shouldUseMtuFromLinkProofData(proofMtuOk.actions)).toBe(true);
    expect(shouldRejectMtuFromLinkProofData(proofMtuOk.actions)).toBe(false);
    expect(mtuFromLinkProofDataFromActions(proofMtuOk.actions)).toBe(mtuFromLinkProofData(proofData));

    const proofMtuRejected = stepMtuFromLinkProofDataWithActions(initialMtuFromLinkProofDataState(), {
      kind: "link-proof/mtu-from-proof-gate",
      data: new Uint8Array(LINK_PROOF_BODY_SIZE)
    });
    expect(shouldRejectMtuFromLinkProofData(proofMtuRejected.actions)).toBe(true);
    expect(mtuFromLinkProofDataFromActions(proofMtuRejected.actions)).toBeNull();

    const bodyOnly = stepClassifyLinkProofPayloadWithActions(initialClassifyLinkProofPayloadState(), {
      kind: "link-proof/classify-payload-gate",
      dataLength: LINK_PROOF_BODY_SIZE
    });
    expect(shouldClassifyLinkProofPayloadBodyOnly(bodyOnly.actions)).toBe(true);
    expect(shouldRejectClassifyLinkProofPayload(bodyOnly.actions)).toBe(false);

    const bodyWithMtu = stepClassifyLinkProofPayloadWithActions(initialClassifyLinkProofPayloadState(), {
      kind: "link-proof/classify-payload-gate",
      dataLength: LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE
    });
    expect(shouldClassifyLinkProofPayloadBodyWithMtu(bodyWithMtu.actions)).toBe(true);

    const rejected = stepClassifyLinkProofPayloadWithActions(initialClassifyLinkProofPayloadState(), {
      kind: "link-proof/classify-payload-gate",
      dataLength: 10
    });
    expect(shouldRejectClassifyLinkProofPayload(rejected.actions)).toBe(true);
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

    const hashableStepped = stepLinkRequestHashablePartWithActions(
      initialLinkRequestHashablePartState(),
      {
        kind: "link-proof/request-hashable-gate",
        hashablePart: hashable,
        requestDataLength: LINK_REQUEST_ECPUB_SIZE + 3
      }
    );
    expect(shouldUseLinkRequestHashablePart(hashableStepped.actions)).toBe(true);
    const truncated = linkRequestHashablePartRawFromActions(hashableStepped.actions);
    expect(truncated).not.toBeNull();
    expect(truncated!.length).toBe(17);
    expect([...truncated!]).toEqual([
      ...linkRequestHashablePart(hashable, LINK_REQUEST_ECPUB_SIZE + 3)
    ]);
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
