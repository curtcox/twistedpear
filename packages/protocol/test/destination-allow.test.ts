import { describe, expect, it } from "vitest";
import {
  DestinationAllowPolicyCode,
  canAcceptDestinationLinkRequest,
  canAnnounceDestination,
  canAnnounceWithIdentity,
  canDestinationSend,
  canOperateAttachedDestination,
  canRequestLinkDestination,
  initialAcceptDestinationLinkRequestState,
  initialAnnounceDestinationState,
  initialAnnounceWithIdentityState,
  initialDestinationConstructionState,
  initialDestinationDecryptState,
  initialDestinationEncryptState,
  initialDestinationIdentityBindingValidState,
  initialDestinationLinkEstablishedCallbackState,
  initialDestinationProofCallbackState,
  initialDestinationRequestAllowState,
  initialDestinationRequestPathValidState,
  initialDestinationSendState,
  initialOperateAttachedDestinationState,
  initialRegisterDestinationLinkState,
  initialRequestLinkDestinationState,
  isValidDestinationIdentityBinding,
  isValidDestinationRequestPath,
  planDestinationConstruction,
  planDestinationDecrypt,
  planDestinationEncrypt,
  planDestinationRequestAllow,
  shouldAcceptDestinationIdentityBinding,
  shouldAcceptDestinationRequestPath,
  shouldAllowAnnounceWithIdentity,
  shouldAllowDestinationAnnounce,
  shouldAllowDestinationLinkRequest,
  shouldAllowDestinationRequest,
  shouldAllowDestinationSend,
  shouldAllowOperateAttachedDestination,
  shouldAllowRequestLinkDestination,
  shouldDecryptDestinationWithIdentity,
  shouldDenyAnnounceWithIdentity,
  shouldDenyDestinationAnnounce,
  shouldDenyDestinationLinkRequest,
  shouldDenyDestinationRequest,
  shouldDenyDestinationSend,
  shouldDenyOperateAttachedDestination,
  shouldDenyRequestLinkDestination,
  shouldEncryptDestinationWithIdentity,
  shouldInvokeDestinationLinkEstablishedCallback,
  shouldInvokeDestinationLinkEstablishedCallbackNow,
  shouldInvokeDestinationProofCallback,
  shouldInvokeDestinationProofCallbackNow,
  shouldProceedDestinationConstruction,
  shouldRegisterDestinationLink,
  shouldRegisterDestinationLinkNow,
  shouldRejectDestinationConstructionBadDirection,
  shouldRejectDestinationConstructionBadIdentityBinding,
  shouldRejectDestinationConstructionBadType,
  shouldRejectDestinationDecrypt,
  shouldRejectDestinationEncrypt,
  shouldRejectDestinationIdentityBinding,
  shouldRejectDestinationRequestPath,
  shouldReturnDestinationDecryptCiphertext,
  shouldSkipDestinationLinkEstablishedCallback,
  shouldSkipDestinationLinkRegister,
  shouldSkipDestinationProofCallback,
  shouldUseDestinationEncryptPlaintext,
  stepAcceptDestinationLinkRequestWithActions,
  stepAnnounceDestinationWithActions,
  stepAnnounceWithIdentityWithActions,
  stepDestinationConstructionWithActions,
  stepDestinationDecryptWithActions,
  stepDestinationEncryptWithActions,
  stepDestinationIdentityBindingValidWithActions,
  stepDestinationLinkEstablishedCallbackWithActions,
  stepDestinationProofCallbackWithActions,
  stepDestinationRequestAllowWithActions,
  stepDestinationRequestPathValidWithActions,
  stepDestinationSendWithActions,
  stepOperateAttachedDestinationWithActions,
  stepRegisterDestinationLinkWithActions,
  stepRequestLinkDestinationWithActions
} from "../src/destination-allow.js";
import { DestinationDirectionCode, DestinationTypeCode } from "../src/packet-header.js";
import {
  LinkRequestReceiptStatus,
  initialAttachLinkRequestPacketReceiptState,
  shouldAttachLinkRequestPacketReceipt,
  shouldAttachLinkRequestPacketReceiptNow,
  shouldSkipLinkRequestPacketReceiptAttach,
  stepAttachLinkRequestPacketReceiptWithActions
} from "../src/link-request-receipt.js";

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

    const allowAll = stepDestinationRequestAllowWithActions(
      initialDestinationRequestAllowState(),
      {
        kind: "destination/request-allow-gate",
        allow: DestinationAllowPolicyCode.ALLOW_ALL,
        allowedList: [],
        remoteIdentityHash: null
      }
    );
    expect(shouldAllowDestinationRequest(allowAll.actions)).toBe(true);
    expect(shouldDenyDestinationRequest(allowAll.actions)).toBe(false);

    const denyNone = stepDestinationRequestAllowWithActions(
      initialDestinationRequestAllowState(),
      {
        kind: "destination/request-allow-gate",
        allow: DestinationAllowPolicyCode.ALLOW_NONE,
        allowedList: [hash],
        remoteIdentityHash: hash
      }
    );
    expect(shouldAllowDestinationRequest(denyNone.actions)).toBe(false);
    expect(shouldDenyDestinationRequest(denyNone.actions)).toBe(true);

    const allowList = stepDestinationRequestAllowWithActions(
      initialDestinationRequestAllowState(),
      {
        kind: "destination/request-allow-gate",
        allow: DestinationAllowPolicyCode.ALLOW_LIST,
        allowedList: [hash],
        remoteIdentityHash: hash
      }
    );
    expect(shouldAllowDestinationRequest(allowList.actions)).toBe(true);
    expect(shouldDenyDestinationRequest(allowList.actions)).toBe(false);
  });

  it("rejects empty request-handler paths", () => {
    expect(isValidDestinationRequestPath("")).toBe(false);
    expect(isValidDestinationRequestPath("/echo")).toBe(true);

    const valid = stepDestinationRequestPathValidWithActions(
      initialDestinationRequestPathValidState(),
      {
        kind: "destination/request-path-valid-gate",
        path: "/echo"
      }
    );
    expect(shouldAcceptDestinationRequestPath(valid.actions)).toBe(true);
    expect(shouldRejectDestinationRequestPath(valid.actions)).toBe(false);

    const invalid = stepDestinationRequestPathValidWithActions(
      initialDestinationRequestPathValidState(),
      {
        kind: "destination/request-path-valid-gate",
        path: ""
      }
    );
    expect(shouldAcceptDestinationRequestPath(invalid.actions)).toBe(false);
    expect(shouldRejectDestinationRequestPath(invalid.actions)).toBe(true);
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

    const allow = stepAcceptDestinationLinkRequestWithActions(
      initialAcceptDestinationLinkRequestState(),
      {
        kind: "destination/accept-link-request-gate",
        acceptLinkRequests: true,
        directionIn: true
      }
    );
    expect(shouldAllowDestinationLinkRequest(allow.actions)).toBe(true);
    expect(shouldDenyDestinationLinkRequest(allow.actions)).toBe(false);

    const deny = stepAcceptDestinationLinkRequestWithActions(
      initialAcceptDestinationLinkRequestState(),
      {
        kind: "destination/accept-link-request-gate",
        acceptLinkRequests: false,
        directionIn: true
      }
    );
    expect(shouldAllowDestinationLinkRequest(deny.actions)).toBe(false);
    expect(shouldDenyDestinationLinkRequest(deny.actions)).toBe(true);
  });

  it("allows announces only for IN SINGLE destinations", () => {
    expect(canAnnounceDestination({ typeSingle: true, directionIn: true })).toBe(true);
    expect(canAnnounceDestination({ typeSingle: false, directionIn: true })).toBe(false);
    expect(canAnnounceDestination({ typeSingle: true, directionIn: false })).toBe(false);

    const allow = stepAnnounceDestinationWithActions(initialAnnounceDestinationState(), {
      kind: "destination/announce-gate",
      typeSingle: true,
      directionIn: true
    });
    expect(shouldAllowDestinationAnnounce(allow.actions)).toBe(true);
    expect(shouldDenyDestinationAnnounce(allow.actions)).toBe(false);

    const deny = stepAnnounceDestinationWithActions(initialAnnounceDestinationState(), {
      kind: "destination/announce-gate",
      typeSingle: false,
      directionIn: true
    });
    expect(shouldAllowDestinationAnnounce(deny.actions)).toBe(false);
    expect(shouldDenyDestinationAnnounce(deny.actions)).toBe(true);
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

    const attached = stepOperateAttachedDestinationWithActions(
      initialOperateAttachedDestinationState(),
      {
        kind: "destination/operate-attached-gate",
        transportPresent: true
      }
    );
    expect(shouldAllowOperateAttachedDestination(attached.actions)).toBe(true);
    expect(shouldDenyOperateAttachedDestination(attached.actions)).toBe(false);

    const detached = stepOperateAttachedDestinationWithActions(
      initialOperateAttachedDestinationState(),
      {
        kind: "destination/operate-attached-gate",
        transportPresent: false
      }
    );
    expect(shouldAllowOperateAttachedDestination(detached.actions)).toBe(false);
    expect(shouldDenyOperateAttachedDestination(detached.actions)).toBe(true);

    const withIdentity = stepAnnounceWithIdentityWithActions(initialAnnounceWithIdentityState(), {
      kind: "destination/announce-with-identity-gate",
      identityPresent: true
    });
    expect(shouldAllowAnnounceWithIdentity(withIdentity.actions)).toBe(true);
    expect(shouldDenyAnnounceWithIdentity(withIdentity.actions)).toBe(false);

    const withoutIdentity = stepAnnounceWithIdentityWithActions(
      initialAnnounceWithIdentityState(),
      {
        kind: "destination/announce-with-identity-gate",
        identityPresent: false
      }
    );
    expect(shouldAllowAnnounceWithIdentity(withoutIdentity.actions)).toBe(false);
    expect(shouldDenyAnnounceWithIdentity(withoutIdentity.actions)).toBe(true);

    const proofInvoke = stepDestinationProofCallbackWithActions(
      initialDestinationProofCallbackState(),
      {
        kind: "destination/proof-callback-gate",
        callbackPresent: true
      }
    );
    expect(shouldInvokeDestinationProofCallbackNow(proofInvoke.actions)).toBe(true);
    expect(shouldSkipDestinationProofCallback(proofInvoke.actions)).toBe(false);

    const proofSkip = stepDestinationProofCallbackWithActions(
      initialDestinationProofCallbackState(),
      {
        kind: "destination/proof-callback-gate",
        callbackPresent: false
      }
    );
    expect(shouldInvokeDestinationProofCallbackNow(proofSkip.actions)).toBe(false);
    expect(shouldSkipDestinationProofCallback(proofSkip.actions)).toBe(true);

    const establishedInvoke = stepDestinationLinkEstablishedCallbackWithActions(
      initialDestinationLinkEstablishedCallbackState(),
      {
        kind: "destination/link-established-callback-gate",
        callbackPresent: true
      }
    );
    expect(shouldInvokeDestinationLinkEstablishedCallbackNow(establishedInvoke.actions)).toBe(
      true
    );
    expect(shouldSkipDestinationLinkEstablishedCallback(establishedInvoke.actions)).toBe(false);

    const establishedSkip = stepDestinationLinkEstablishedCallbackWithActions(
      initialDestinationLinkEstablishedCallbackState(),
      {
        kind: "destination/link-established-callback-gate",
        callbackPresent: false
      }
    );
    expect(shouldInvokeDestinationLinkEstablishedCallbackNow(establishedSkip.actions)).toBe(
      false
    );
    expect(shouldSkipDestinationLinkEstablishedCallback(establishedSkip.actions)).toBe(true);
  });

  it("allows sends only for OUT destinations", () => {
    expect(canDestinationSend(true)).toBe(true);
    expect(canDestinationSend(false)).toBe(false);

    const allow = stepDestinationSendWithActions(initialDestinationSendState(), {
      kind: "destination/send-gate",
      directionOut: true
    });
    expect(shouldAllowDestinationSend(allow.actions)).toBe(true);
    expect(shouldDenyDestinationSend(allow.actions)).toBe(false);

    const deny = stepDestinationSendWithActions(initialDestinationSendState(), {
      kind: "destination/send-gate",
      directionOut: false
    });
    expect(shouldAllowDestinationSend(deny.actions)).toBe(false);
    expect(shouldDenyDestinationSend(deny.actions)).toBe(true);
  });

  it("allows link requests only to OUT SINGLE destinations", () => {
    expect(canRequestLinkDestination({ typeSingle: true, directionOut: true })).toBe(true);
    expect(canRequestLinkDestination({ typeSingle: false, directionOut: true })).toBe(false);
    expect(canRequestLinkDestination({ typeSingle: true, directionOut: false })).toBe(false);

    const allow = stepRequestLinkDestinationWithActions(initialRequestLinkDestinationState(), {
      kind: "destination/request-link-gate",
      typeSingle: true,
      directionOut: true
    });
    expect(shouldAllowRequestLinkDestination(allow.actions)).toBe(true);
    expect(shouldDenyRequestLinkDestination(allow.actions)).toBe(false);

    const deny = stepRequestLinkDestinationWithActions(initialRequestLinkDestinationState(), {
      kind: "destination/request-link-gate",
      typeSingle: false,
      directionOut: true
    });
    expect(shouldAllowRequestLinkDestination(deny.actions)).toBe(false);
    expect(shouldDenyRequestLinkDestination(deny.actions)).toBe(true);
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

    const valid = stepDestinationIdentityBindingValidWithActions(
      initialDestinationIdentityBindingValidState(),
      {
        kind: "destination/identity-binding-valid-gate",
        typePlain: true,
        identityPresent: false
      }
    );
    expect(valid.actions).toEqual([{ kind: "valid" }]);
    expect(shouldAcceptDestinationIdentityBinding(valid.actions)).toBe(true);
    expect(shouldRejectDestinationIdentityBinding(valid.actions)).toBe(false);

    const invalid = stepDestinationIdentityBindingValidWithActions(
      initialDestinationIdentityBindingValidState(),
      {
        kind: "destination/identity-binding-valid-gate",
        typePlain: true,
        identityPresent: true
      }
    );
    expect(invalid.actions).toEqual([{ kind: "invalid" }]);
    expect(shouldAcceptDestinationIdentityBinding(invalid.actions)).toBe(false);
    expect(shouldRejectDestinationIdentityBinding(invalid.actions)).toBe(true);
  });

  it("plans destination construction", () => {
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.IN,
        type: DestinationTypeCode.SINGLE,
        identityBindingValid: true
      })
    ).toBe("ok");
    expect(
      planDestinationConstruction({
        direction: 0,
        type: DestinationTypeCode.SINGLE,
        identityBindingValid: true
      })
    ).toBe("bad-direction");
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.OUT,
        type: 99,
        identityBindingValid: true
      })
    ).toBe("bad-type");
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.OUT,
        type: DestinationTypeCode.PLAIN,
        identityBindingValid: false
      })
    ).toBe("bad-identity-binding");
    expect(
      planDestinationConstruction({
        direction: DestinationDirectionCode.OUT,
        type: DestinationTypeCode.SINGLE,
        identityBindingValid: false
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

    const register = stepRegisterDestinationLinkWithActions(initialRegisterDestinationLinkState(), {
      kind: "destination/register-link-gate",
      validatedLinkPresent: true
    });
    expect(shouldRegisterDestinationLinkNow(register.actions)).toBe(true);
    expect(shouldSkipDestinationLinkRegister(register.actions)).toBe(false);

    const skip = stepRegisterDestinationLinkWithActions(initialRegisterDestinationLinkState(), {
      kind: "destination/register-link-gate",
      validatedLinkPresent: false
    });
    expect(shouldRegisterDestinationLinkNow(skip.actions)).toBe(false);
    expect(shouldSkipDestinationLinkRegister(skip.actions)).toBe(true);
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

    const attach = stepAttachLinkRequestPacketReceiptWithActions(
      initialAttachLinkRequestPacketReceiptState(),
      {
        kind: "link/attach-request-packet-receipt-gate",
        packetReceiptPresent: true
      }
    );
    expect(shouldAttachLinkRequestPacketReceiptNow(attach.actions)).toBe(true);
    expect(shouldSkipLinkRequestPacketReceiptAttach(attach.actions)).toBe(false);

    const skip = stepAttachLinkRequestPacketReceiptWithActions(
      initialAttachLinkRequestPacketReceiptState(),
      {
        kind: "link/attach-request-packet-receipt-gate",
        packetReceiptPresent: false
      }
    );
    expect(shouldAttachLinkRequestPacketReceiptNow(skip.actions)).toBe(false);
    expect(shouldSkipLinkRequestPacketReceiptAttach(skip.actions)).toBe(true);
  });
});
