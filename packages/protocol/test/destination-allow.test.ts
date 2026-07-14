import { describe, expect, it } from "vitest";
import {
  DestinationAllowPolicyCode,
  canAcceptDestinationLinkRequest,
  canAnnounceDestination,
  canAnnounceWithIdentity,
  canDestinationSend,
  canOperateAttachedDestination,
  canRequestLinkDestination,
  initialDestinationConstructionState,
  initialDestinationDecryptState,
  initialDestinationEncryptState,
  isValidDestinationIdentityBinding,
  isValidDestinationRequestPath,
  planDestinationConstruction,
  planDestinationDecrypt,
  planDestinationEncrypt,
  planDestinationRequestAllow,
  shouldDecryptDestinationWithIdentity,
  shouldEncryptDestinationWithIdentity,
  shouldInvokeDestinationLinkEstablishedCallback,
  shouldInvokeDestinationProofCallback,
  shouldProceedDestinationConstruction,
  shouldRegisterDestinationLink,
  shouldRejectDestinationConstructionBadDirection,
  shouldRejectDestinationConstructionBadIdentityBinding,
  shouldRejectDestinationConstructionBadType,
  shouldRejectDestinationDecrypt,
  shouldRejectDestinationEncrypt,
  shouldReturnDestinationDecryptCiphertext,
  shouldUseDestinationEncryptPlaintext,
  stepDestinationConstructionWithActions,
  stepDestinationDecryptWithActions,
  stepDestinationEncryptWithActions
} from "../src/destination-allow.js";
import { DestinationDirectionCode, DestinationTypeCode } from "../src/packet-header.js";
import { LinkRequestReceiptStatus, shouldAttachLinkRequestPacketReceipt } from "../src/link-request-receipt.js";

describe("destination allow policy", () => {
  it("allows ALL and LIST matches", () => {
    const hash = new Uint8Array([1, 2, 3]);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_ALL,
        allowedList: [],
        remoteIdentityHash: null
      })
    ).toBe(true);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_NONE,
        allowedList: [hash],
        remoteIdentityHash: hash
      })
    ).toBe(false);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_LIST,
        allowedList: [hash],
        remoteIdentityHash: hash
      })
    ).toBe(true);
    expect(
      planDestinationRequestAllow({
        allow: DestinationAllowPolicyCode.ALLOW_LIST,
        allowedList: [hash],
        remoteIdentityHash: new Uint8Array([9, 9, 9])
      })
    ).toBe(false);
  });

  it("rejects empty request-handler paths", () => {
    expect(isValidDestinationRequestPath("")).toBe(false);
    expect(isValidDestinationRequestPath("/echo")).toBe(true);
  });

  it("accepts inbound link requests only when enabled and IN", () => {
    expect(
      canAcceptDestinationLinkRequest({ acceptLinkRequests: true, directionIn: true })
    ).toBe(true);
    expect(
      canAcceptDestinationLinkRequest({ acceptLinkRequests: false, directionIn: true })
    ).toBe(false);
    expect(
      canAcceptDestinationLinkRequest({ acceptLinkRequests: true, directionIn: false })
    ).toBe(false);
  });

  it("allows announces only for IN SINGLE destinations", () => {
    expect(canAnnounceDestination({ typeSingle: true, directionIn: true })).toBe(true);
    expect(canAnnounceDestination({ typeSingle: false, directionIn: true })).toBe(false);
    expect(canAnnounceDestination({ typeSingle: true, directionIn: false })).toBe(false);
  });

  it("gates attached ops, announce identity, and proof/link-established callbacks", () => {
    expect(canOperateAttachedDestination(true)).toBe(true);
    expect(canOperateAttachedDestination(false)).toBe(false);
    expect(canAnnounceWithIdentity(true)).toBe(true);
    expect(canAnnounceWithIdentity(false)).toBe(false);
    expect(shouldInvokeDestinationProofCallback(true)).toBe(true);
    expect(shouldInvokeDestinationProofCallback(false)).toBe(false);
    expect(shouldInvokeDestinationLinkEstablishedCallback(true)).toBe(true);
    expect(shouldInvokeDestinationLinkEstablishedCallback(false)).toBe(false);
  });

  it("allows sends only for OUT destinations", () => {
    expect(canDestinationSend(true)).toBe(true);
    expect(canDestinationSend(false)).toBe(false);
  });

  it("allows link requests only to OUT SINGLE destinations", () => {
    expect(canRequestLinkDestination({ typeSingle: true, directionOut: true })).toBe(true);
    expect(canRequestLinkDestination({ typeSingle: false, directionOut: true })).toBe(false);
    expect(canRequestLinkDestination({ typeSingle: true, directionOut: false })).toBe(false);
  });

  it("validates destination identity binding by type", () => {
    expect(
      isValidDestinationIdentityBinding({ typePlain: true, identityPresent: false })
    ).toBe(true);
    expect(
      isValidDestinationIdentityBinding({ typePlain: true, identityPresent: true })
    ).toBe(false);
    expect(
      isValidDestinationIdentityBinding({ typePlain: false, identityPresent: true })
    ).toBe(true);
    expect(
      isValidDestinationIdentityBinding({ typePlain: false, identityPresent: false })
    ).toBe(false);
  });

  it("plans destination construction", () => {
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.IN,
        type: DestinationTypeCode.SINGLE,
        identityPresent: true
      })
    ).toBe("ok");
    expect(
      planDestinationConstruction({
        direction: 0,
        type: DestinationTypeCode.SINGLE,
        identityPresent: true
      })
    ).toBe("bad-direction");
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.OUT,
        type: 99,
        identityPresent: true
      })
    ).toBe("bad-type");
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.OUT,
        type: DestinationTypeCode.PLAIN,
        identityPresent: true
      })
    ).toBe("bad-identity-binding");
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.OUT,
        type: DestinationTypeCode.SINGLE,
        identityPresent: false
      })
    ).toBe("bad-identity-binding");
  });

  it("plans destination decrypt by type and identity", () => {
    expect(planDestinationDecrypt({ typePlain: true, identityPresent: false })).toBe(
      "return-ciphertext"
    );
    expect(planDestinationDecrypt({ typePlain: false, identityPresent: false })).toBe("reject");
    expect(planDestinationDecrypt({ typePlain: false, identityPresent: true })).toBe(
      "decrypt-with-identity"
    );
  });

  it("plans destination encrypt by type and identity", () => {
    expect(planDestinationEncrypt({ typePlain: true, identityPresent: false })).toBe(
      "use-plaintext"
    );
    expect(planDestinationEncrypt({ typePlain: false, identityPresent: false })).toBe("reject");
    expect(planDestinationEncrypt({ typePlain: false, identityPresent: true })).toBe(
      "encrypt-with-identity"
    );
  });

  it("emits destination construction actions from stepDestinationConstructionWithActions", () => {
    const ok = stepDestinationConstructionWithActions(initialDestinationConstructionState(), {
      kind: "destination/construction-gate",
      direction: DestinationDirectionCode.IN,
      type: DestinationTypeCode.SINGLE,
      identityPresent: true
    });
    expect(ok.actions).toEqual([{ kind: "ok" }]);
    expect(shouldProceedDestinationConstruction(ok.actions)).toBe(true);

    const badDirection = stepDestinationConstructionWithActions(
      initialDestinationConstructionState(),
      {
        kind: "destination/construction-gate",
        direction: 0,
        type: DestinationTypeCode.SINGLE,
        identityPresent: true
      }
    );
    expect(shouldRejectDestinationConstructionBadDirection(badDirection.actions)).toBe(true);

    const badType = stepDestinationConstructionWithActions(initialDestinationConstructionState(), {
      kind: "destination/construction-gate",
      direction: DestinationDirectionCode.OUT,
      type: 99,
      identityPresent: true
    });
    expect(shouldRejectDestinationConstructionBadType(badType.actions)).toBe(true);

    const badBinding = stepDestinationConstructionWithActions(
      initialDestinationConstructionState(),
      {
        kind: "destination/construction-gate",
        direction: DestinationDirectionCode.OUT,
        type: DestinationTypeCode.PLAIN,
        identityPresent: true
      }
    );
    expect(shouldRejectDestinationConstructionBadIdentityBinding(badBinding.actions)).toBe(true);
  });

  it("emits destination decrypt/encrypt actions from WithActions steps", () => {
    const plain = stepDestinationDecryptWithActions(initialDestinationDecryptState(), {
      kind: "destination/decrypt-gate",
      typePlain: true,
      identityPresent: false
    });
    expect(plain.actions).toEqual([{ kind: "return-ciphertext" }]);
    expect(shouldReturnDestinationDecryptCiphertext(plain.actions)).toBe(true);

    const reject = stepDestinationDecryptWithActions(initialDestinationDecryptState(), {
      kind: "destination/decrypt-gate",
      typePlain: false,
      identityPresent: false
    });
    expect(shouldRejectDestinationDecrypt(reject.actions)).toBe(true);

    const decrypt = stepDestinationDecryptWithActions(initialDestinationDecryptState(), {
      kind: "destination/decrypt-gate",
      typePlain: false,
      identityPresent: true
    });
    expect(shouldDecryptDestinationWithIdentity(decrypt.actions)).toBe(true);

    const usePlain = stepDestinationEncryptWithActions(initialDestinationEncryptState(), {
      kind: "destination/encrypt-gate",
      typePlain: true,
      identityPresent: false
    });
    expect(shouldUseDestinationEncryptPlaintext(usePlain.actions)).toBe(true);

    const encryptReject = stepDestinationEncryptWithActions(initialDestinationEncryptState(), {
      kind: "destination/encrypt-gate",
      typePlain: false,
      identityPresent: false
    });
    expect(shouldRejectDestinationEncrypt(encryptReject.actions)).toBe(true);

    const encrypt = stepDestinationEncryptWithActions(initialDestinationEncryptState(), {
      kind: "destination/encrypt-gate",
      typePlain: false,
      identityPresent: true
    });
    expect(shouldEncryptDestinationWithIdentity(encrypt.actions)).toBe(true);
  });

  it("is deterministic for identical destination gate events", () => {
    const event = {
      kind: "destination/construction-gate" as const,
      direction: DestinationDirectionCode.IN,
      type: DestinationTypeCode.SINGLE,
      identityPresent: true
    };
    const a = stepDestinationConstructionWithActions(initialDestinationConstructionState(), event);
    const b = stepDestinationConstructionWithActions(initialDestinationConstructionState(), event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("registers destination links when validation succeeded", () => {
    expect(shouldRegisterDestinationLink(true)).toBe(true);
    expect(shouldRegisterDestinationLink(false)).toBe(false);
  });
});

describe("link request receipt status", () => {
  it("exposes receipt status codes", () => {
    expect(LinkRequestReceiptStatus.SENT).toBe(0x01);
    expect(LinkRequestReceiptStatus.READY).toBe(0x04);
  });

  it("attaches packet receipts when present", () => {
    expect(shouldAttachLinkRequestPacketReceipt(true)).toBe(true);
    expect(shouldAttachLinkRequestPacketReceipt(false)).toBe(false);
  });
});
