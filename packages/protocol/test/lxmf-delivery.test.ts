import { describe, expect, it } from "vitest";
import {
  LXMF_ENCRYPTED_PACKET_MAX_CONTENT,
  LXMF_ENCRYPTED_PACKET_MDU,
  LXMF_LINK_PACKET_MAX_CONTENT,
  LXMF_LINK_PACKET_MDU,
  LXMF_OVERHEAD,
  LxmfDeliveryMethod,
  LxmfDeliveryRepresentation,
  lxmfContentSizeFromPackedLength,
  canAcceptLxmfPropagationLocalDelivery,
  planLxmfDelivery,
  initialAcceptLxmfPropagationLocalDeliveryState,
  initialAwaitLxmfDeliveryReceiptState,
  initialInvokeLxmfDeliveryCallbackState,
  initialLxmfDeliveryPlanState,
  initialLxmfDeliveryState,
  initialUnpackLxmfPropagationLocalIngressState,
  lxmfDeliveryDeliverParams,
  lxmfDeliveryOpportunisticRejectSizes,
  lxmfDeliveryPlanDeliverParams,
  lxmfDeliveryPlanFromActions,
  lxmfDeliveryPlanOpportunisticRejectSizes,
  lxmfDeliveryPlanUnsupportedMethod,
  planLxMessageInstancePack,
  planLxMessagePack,
  planLxmfDeliverableAccept,
  planLxmfDirectSend,
  planLxmfOpportunisticSend,
  planLxmfPackTimestamp,
  planLxmfPropagatedPackPrep,
  planLxmfPropagatedSend,
  planLxmfPropagationLinkReady,
  planLxmfPropagationLocalIngress,
  planLxmfSendMethod,
  planLxmfSignatureOutcome,
  shouldAcceptLxmfWireFrame,
  shouldAcceptLxmfWireFrameNow,
  shouldCommitRememberedLxmfHash,
  shouldCommitRememberedLxmfHashNow,
  shouldDeliverLxmf,
  shouldDeliverLxmfDeliveryPlan,
  shouldDeliverLxmfPropagationLocalIngress,
  shouldEstablishLxmfPropagationLink,
  shouldExtractLxmfOpportunisticPayloadNow,
  shouldIncludeLxmfStamp,
  shouldIncludeLxmfStampNow,
  shouldProceedLxmfDirectSend,
  shouldProceedLxmfOpportunisticSend,
  shouldProceedLxmfPropagatedSend,
  shouldProceedLxmfPropagationSyncPrep,
  shouldRejectLxmfDirectMissingDestination,
  shouldRejectLxmfDirectMissingPacked,
  shouldRejectLxmfDeliveryPlanOpportunisticTooLarge,
  shouldRejectLxmfDeliveryPlanUnsupportedMethod,
  shouldRejectLxmfOpportunisticMissingDestination,
  shouldRejectLxmfOpportunisticTooLarge,
  shouldRejectLxmfPackEndpoints,
  shouldRejectLxmfPackTimestamp,
  shouldRejectLxmfPropagatedMissingNode,
  shouldRejectLxmfPropagatedMissingPacked,
  shouldRejectLxmfPropagatedResourceUnimplemented,
  shouldRejectLxmfPropagationMissingIdentity,
  shouldRejectLxmfPropagationMissingNode,
  shouldRejectLxmfPropagationSyncMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncMissingNode,
  shouldRejectLxmfSendUnpacked,
  shouldRejectLxmfSendUnsupported,
  shouldRejectLxmfUnsupportedMethod,
  shouldRememberLxmfMessage,
  shouldRememberLxmfMessageNow,
  shouldRegisterLxmfDeliveryIdentityNow,
  shouldReuseLxmfPropagationLink,
  shouldSelectLxmfDeliveryParametersNow,
  shouldSendLxmfDirect,
  shouldSendLxmfOpportunistic,
  shouldSendLxmfPropagated,
  shouldSkipAcceptLxmfWireFrame,
  shouldSkipCommitRememberedLxmfHash,
  shouldSkipExtractLxmfOpportunisticPayload,
  shouldSkipIncludeLxmfStamp,
  shouldSkipRegisterLxmfDeliveryIdentity,
  shouldSkipRememberLxmfMessage,
  shouldSkipSelectLxmfDeliveryParameters,
  shouldSkipTeardownLxmfPropagationLink,
  canRegisterLxmfDeliveryIdentity,
  canExtractLxmfOpportunisticPayload,
  canUnpackLxmfPropagationLocalIngress,
  shouldSelectLxmfDeliveryParameters,
  planLxmfPropagationSyncPrep,
  shouldAwaitLxmfDeliveryReceipt,
  shouldAwaitLxmfDeliveryReceiptNow,
  shouldInvokeLxmfDeliveryCallback,
  shouldInvokeLxmfDeliveryCallbackNow,
  shouldAcceptLxmfPropagationLocalDeliveryNow,
  shouldSkipAcceptLxmfPropagationLocalDelivery,
  shouldSkipAwaitLxmfDeliveryReceipt,
  shouldSkipInvokeLxmfDeliveryCallback,
  shouldSkipUnpackLxmfPropagationLocalIngress,
  shouldUnpackLxmfPropagationLocalIngressNow,
  shouldTeardownLxmfPropagationLink,
  shouldTeardownLxmfPropagationLinkNow,
  initialAcceptLxmfWireFrameState,
  initialCommitRememberedLxmfHashState,
  initialExtractLxmfOpportunisticPayloadState,
  initialIncludeLxmfStampState,
  initialLxmfDeliverableAcceptState,
  initialLxmfDirectSendState,
  initialLxmfOpportunisticSendState,
  initialLxmfPackTimestampState,
  initialLxmfPropagatedPackPrepState,
  initialLxmfPropagatedSendState,
  initialLxmfPropagationLinkReadyState,
  initialLxmfPropagationLocalIngressState,
  initialLxmfPropagationSyncPrepState,
  initialLxmfSendMethodState,
  initialLxmfSignatureState,
  initialLxMessageInstancePackState,
  initialLxMessagePackState,
  initialRegisterLxmfDeliveryIdentityState,
  initialRememberLxmfMessageState,
  initialSelectLxmfDeliveryParametersState,
  initialTeardownLxmfPropagationLinkState,
  lxmfSendUnsupportedMethod,
  lxmfSignatureOutcomeFromActions,
  shouldAcceptLxmfDeliverable,
  shouldApplyLxmfSignature,
  shouldProceedLxMessageInstancePack,
  shouldProceedLxMessagePack,
  shouldProceedLxmfPropagatedPackPrep,
  shouldRejectLxmfDeliverableSeen,
  shouldRejectLxmfDeliverableUnsigned,
  shouldRejectLxmfPackTimestampSelect,
  shouldRejectLxmfPropagatedPackMissingIdentity,
  shouldRejectLxmfPropagatedPackMissingTimestamp,
  shouldRejectLxmfPropagationLocalDecrypt,
  shouldRejectLxmfPropagationLocalDestination,
  shouldRejectLxmfPropagationLocalPrefix,
  shouldRejectLxMessageInstanceAlreadyPacked,
  shouldRejectLxMessageInstanceMissingEndpoints,
  shouldRejectLxMessageInstanceMissingTimestamp,
  shouldRejectLxMessagePackBadDestination,
  shouldRejectLxMessagePackBadSource,
  shouldSkipLxmfPropagatedPackPrep,
  shouldUseLxmfPackNow,
  shouldUseLxmfPackTimestamp,
  stepAcceptLxmfPropagationLocalDeliveryWithActions,
  stepAcceptLxmfWireFrameWithActions,
  stepAwaitLxmfDeliveryReceiptWithActions,
  stepCommitRememberedLxmfHashWithActions,
  stepExtractLxmfOpportunisticPayloadWithActions,
  stepIncludeLxmfStampWithActions,
  stepInvokeLxmfDeliveryCallbackWithActions,
  stepLxmfDeliverableAcceptWithActions,
  stepLxmfDeliveryPlanWithActions,
  stepLxmfDeliveryWithActions,
  stepLxmfDirectSendWithActions,
  stepLxmfOpportunisticSendWithActions,
  stepLxmfPackTimestampWithActions,
  stepLxmfPropagatedPackPrepWithActions,
  stepLxmfPropagatedSendWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfPropagationLocalIngressWithActions,
  stepLxmfPropagationSyncPrepWithActions,
  stepLxmfSendMethodWithActions,
  stepLxmfSignatureWithActions,
  stepLxMessageInstancePackWithActions,
  stepLxMessagePackWithActions,
  stepRegisterLxmfDeliveryIdentityWithActions,
  stepRememberLxmfMessageWithActions,
  stepSelectLxmfDeliveryParametersWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepUnpackLxmfPropagationLocalIngressWithActions
} from "../src/lxmf-delivery.js";
import { LxmfUnverifiedReason } from "../src/lxmf-fields.js";

describe("protocol lxmf delivery", () => {
  it("computes content size from packed length", () => {
    // 2*16 + 64 + 8 + 8 + 10 content = 122
    expect(lxmfContentSizeFromPackedLength(122)).toBe(10);
  });

  it("exposes encrypted and link packet max-content sizes", () => {
    expect(LXMF_OVERHEAD).toBe(2 * 16 + 64 + 8 + 8);
    expect(LXMF_ENCRYPTED_PACKET_MDU).toBe(391);
    expect(LXMF_LINK_PACKET_MDU).toBe(431);
    expect(LXMF_ENCRYPTED_PACKET_MAX_CONTENT).toBe(
      LXMF_ENCRYPTED_PACKET_MDU - LXMF_OVERHEAD + 16
    );
    expect(LXMF_LINK_PACKET_MAX_CONTENT).toBe(LXMF_LINK_PACKET_MDU - LXMF_OVERHEAD);
  });

  it("plans opportunistic and direct representations", () => {
    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50
      })
    ).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.OPPORTUNISTIC,
      representation: LxmfDeliveryRepresentation.PACKET
    });

    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        contentSize: 80,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50
      })
    ).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE
    });
  });

  it("rejects oversized opportunistic content", () => {
    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
        contentSize: 200,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50
      }).kind
    ).toBe("reject-opportunistic-too-large");
  });

  it("plans propagated representation from envelope size", () => {
    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
        propagationPackedLength: 40
      })
    ).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.PROPAGATED,
      representation: LxmfDeliveryRepresentation.PACKET
    });

    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
        propagationPackedLength: 80
      }).representation
    ).toBe(LxmfDeliveryRepresentation.RESOURCE);
  });

  it("emits delivery-plan actions only from delivery/plan-gate", () => {
    const delivered = stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), {
      kind: "delivery/plan-gate",
      desiredMethod: LxmfDeliveryMethod.DIRECT,
      contentSize: 80,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    });
    expect(shouldDeliverLxmfDeliveryPlan(delivered.actions)).toBe(true);
    expect(shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(delivered.actions)).toBe(false);
    expect(lxmfDeliveryPlanDeliverParams(delivered.actions)).toEqual({
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE
    });
    expect(lxmfDeliveryPlanFromActions(delivered.actions)).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE
    });

    const rejected = stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), {
      kind: "delivery/plan-gate",
      desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
      contentSize: 200,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    });
    expect(shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(rejected.actions)).toBe(true);
    expect(shouldDeliverLxmfDeliveryPlan(rejected.actions)).toBe(false);
    expect(lxmfDeliveryPlanOpportunisticRejectSizes(rejected.actions)).toEqual({
      contentSize: 200,
      maxContent: 100
    });

    const unsupported = stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), {
      kind: "delivery/plan-gate",
      desiredMethod: 0xff,
      contentSize: 10,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    });
    expect(shouldRejectLxmfDeliveryPlanUnsupportedMethod(unsupported.actions)).toBe(true);
    expect(lxmfDeliveryPlanUnsupportedMethod(unsupported.actions)).toBe(0xff);
    expect(lxmfDeliveryPlanFromActions(unsupported.actions)).toEqual({
      kind: "reject-unsupported-method",
      method: 0xff
    });

    expect(
      stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("emits deliver / reject actions from delivery/select", () => {
    const delivered = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod: LxmfDeliveryMethod.DIRECT,
      contentSize: 80,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    });
    expect(shouldDeliverLxmf(delivered.actions)).toBe(true);
    expect(shouldRejectLxmfOpportunisticTooLarge(delivered.actions)).toBe(false);
    expect(lxmfDeliveryDeliverParams(delivered.actions)).toEqual({
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE
    });

    const rejected = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
      contentSize: 200,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    });
    expect(shouldRejectLxmfOpportunisticTooLarge(rejected.actions)).toBe(true);
    expect(shouldDeliverLxmf(rejected.actions)).toBe(false);
    expect(lxmfDeliveryOpportunisticRejectSizes(rejected.actions)).toEqual({
      contentSize: 200,
      maxContent: 100
    });

    const unsupported = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod: 0xff,
      contentSize: 10,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    });
    expect(shouldRejectLxmfUnsupportedMethod(unsupported.actions)).toBe(true);
    expect(shouldDeliverLxmf(unsupported.actions)).toBe(false);

    expect(
      stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for delivery select events", () => {
    const state = initialLxmfDeliveryState();
    const event = {
      kind: "delivery/select" as const,
      desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
      contentSize: 10,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50
    };
    const a = stepLxmfDeliveryWithActions(state, event);
    const b = stepLxmfDeliveryWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans LXMessage pack gates for destination and source", () => {
    expect(
      planLxMessagePack({
        destinationDirectionOut: true,
        sourceDirectionIn: true,
        sourceIdentityPresent: true
      })
    ).toBe("ok");
    expect(
      planLxMessagePack({
        destinationDirectionOut: false,
        sourceDirectionIn: true,
        sourceIdentityPresent: true
      })
    ).toBe("bad-destination");
    expect(
      planLxMessagePack({
        destinationDirectionOut: true,
        sourceDirectionIn: false,
        sourceIdentityPresent: true
      })
    ).toBe("bad-source");
    expect(
      planLxMessagePack({
        destinationDirectionOut: true,
        sourceDirectionIn: true,
        sourceIdentityPresent: false
      })
    ).toBe("bad-source");
  });

  it("emits LXMessage pack gate actions from stepLxMessagePackWithActions", () => {
    const ok = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut: true,
      sourceDirectionIn: true,
      sourceIdentityPresent: true
    });
    expect(ok.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedLxMessagePack(ok.actions)).toBe(true);

    const badDest = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut: false,
      sourceDirectionIn: true,
      sourceIdentityPresent: true
    });
    expect(badDest.actions).toEqual([{ kind: "reject-bad-destination" }]);
    expect(shouldRejectLxMessagePackBadDestination(badDest.actions)).toBe(true);

    const badSource = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut: true,
      sourceDirectionIn: true,
      sourceIdentityPresent: false
    });
    expect(badSource.actions).toEqual([{ kind: "reject-bad-source" }]);
    expect(shouldRejectLxMessagePackBadSource(badSource.actions)).toBe(true);
  });

  it("is deterministic for LXMessage pack gate events", () => {
    const state = initialLxMessagePackState();
    const event = {
      kind: "lxmessage-pack/gate" as const,
      destinationDirectionOut: true,
      sourceDirectionIn: true,
      sourceIdentityPresent: true
    };
    const a = stepLxMessagePackWithActions(state, event);
    const b = stepLxMessagePackWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans LXMF deliverable accept from signature and seen-hash", () => {
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: true,
        hasHash: true,
        alreadySeen: false
      })
    ).toBe("accept");
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: false,
        hasHash: true,
        alreadySeen: false
      })
    ).toBe("reject-unsigned");
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: true,
        hasHash: true,
        alreadySeen: true
      })
    ).toBe("reject-seen");
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: true,
        hasHash: false,
        alreadySeen: true
      })
    ).toBe("accept");
  });

  it("emits deliverable accept-gate actions from stepLxmfDeliverableAcceptWithActions", () => {
    const accept = stepLxmfDeliverableAcceptWithActions(initialLxmfDeliverableAcceptState(), {
      kind: "deliverable/accept-gate",
      signatureValidated: true,
      hasHash: true,
      alreadySeen: false
    });
    expect(shouldAcceptLxmfDeliverable(accept.actions)).toBe(true);
    expect(shouldRejectLxmfDeliverableUnsigned(accept.actions)).toBe(false);

    const unsigned = stepLxmfDeliverableAcceptWithActions(initialLxmfDeliverableAcceptState(), {
      kind: "deliverable/accept-gate",
      signatureValidated: false,
      hasHash: true,
      alreadySeen: false
    });
    expect(shouldRejectLxmfDeliverableUnsigned(unsigned.actions)).toBe(true);
    expect(shouldAcceptLxmfDeliverable(unsigned.actions)).toBe(false);

    const seen = stepLxmfDeliverableAcceptWithActions(initialLxmfDeliverableAcceptState(), {
      kind: "deliverable/accept-gate",
      signatureValidated: true,
      hasHash: true,
      alreadySeen: true
    });
    expect(shouldRejectLxmfDeliverableSeen(seen.actions)).toBe(true);

    expect(
      stepLxmfDeliverableAcceptWithActions(initialLxmfDeliverableAcceptState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for deliverable/accept-gate events", () => {
    const state = initialLxmfDeliverableAcceptState();
    const event = {
      kind: "deliverable/accept-gate" as const,
      signatureValidated: true,
      hasHash: true,
      alreadySeen: false
    };
    const a = stepLxmfDeliverableAcceptWithActions(state, event);
    const b = stepLxmfDeliverableAcceptWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("gates propagation local delivery and propagated send", () => {
    expect(
      canAcceptLxmfPropagationLocalDelivery({
        deliveryDestinationPresent: true,
        destinationHashMatches: true
      })
    ).toBe(true);
    expect(
      canAcceptLxmfPropagationLocalDelivery({
        deliveryDestinationPresent: true,
        destinationHashMatches: false
      })
    ).toBe(false);
    expect(
      canAcceptLxmfPropagationLocalDelivery({
        deliveryDestinationPresent: false,
        destinationHashMatches: true
      })
    ).toBe(false);

    const localOk = stepAcceptLxmfPropagationLocalDeliveryWithActions(
      initialAcceptLxmfPropagationLocalDeliveryState(),
      {
        kind: "propagation-local-delivery/accept-gate",
        deliveryDestinationPresent: true,
        destinationHashMatches: true
      }
    );
    expect(shouldAcceptLxmfPropagationLocalDeliveryNow(localOk.actions)).toBe(true);
    expect(shouldSkipAcceptLxmfPropagationLocalDelivery(localOk.actions)).toBe(false);
    const localSkip = stepAcceptLxmfPropagationLocalDeliveryWithActions(
      initialAcceptLxmfPropagationLocalDeliveryState(),
      {
        kind: "propagation-local-delivery/accept-gate",
        deliveryDestinationPresent: true,
        destinationHashMatches: false
      }
    );
    expect(shouldSkipAcceptLxmfPropagationLocalDelivery(localSkip.actions)).toBe(true);

    expect(
      planLxmfPropagatedSend({
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET
      })
    ).toBe("ok");
    expect(
      planLxmfPropagatedSend({
        nodeConfigured: false,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET
      })
    ).toBe("missing-node");
    expect(
      planLxmfPropagatedSend({
        nodeConfigured: true,
        hasPropagationPacked: false,
        representation: LxmfDeliveryRepresentation.PACKET
      })
    ).toBe("missing-packed");
    expect(
      planLxmfPropagatedSend({
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.RESOURCE
      })
    ).toBe("resource-unimplemented");
    expect(shouldAwaitLxmfDeliveryReceipt(true)).toBe(true);
    expect(shouldAwaitLxmfDeliveryReceipt(false)).toBe(false);
    expect(shouldInvokeLxmfDeliveryCallback(true)).toBe(true);
    expect(shouldInvokeLxmfDeliveryCallback(false)).toBe(false);

    const awaitOk = stepAwaitLxmfDeliveryReceiptWithActions(
      initialAwaitLxmfDeliveryReceiptState(),
      { kind: "lxmf/await-delivery-receipt-gate", receiptPresent: true }
    );
    expect(shouldAwaitLxmfDeliveryReceiptNow(awaitOk.actions)).toBe(true);
    expect(shouldSkipAwaitLxmfDeliveryReceipt(awaitOk.actions)).toBe(false);
    const awaitSkip = stepAwaitLxmfDeliveryReceiptWithActions(
      initialAwaitLxmfDeliveryReceiptState(),
      { kind: "lxmf/await-delivery-receipt-gate", receiptPresent: false }
    );
    expect(shouldSkipAwaitLxmfDeliveryReceipt(awaitSkip.actions)).toBe(true);

    const invokeOk = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      { kind: "lxmf/invoke-delivery-callback-gate", messagePresent: true }
    );
    expect(shouldInvokeLxmfDeliveryCallbackNow(invokeOk.actions)).toBe(true);
    expect(shouldSkipInvokeLxmfDeliveryCallback(invokeOk.actions)).toBe(false);
    const invokeSkip = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      { kind: "lxmf/invoke-delivery-callback-gate", messagePresent: false }
    );
    expect(shouldSkipInvokeLxmfDeliveryCallback(invokeSkip.actions)).toBe(true);
  });

  it("emits PROPAGATED send gate actions from stepLxmfPropagatedSendWithActions", () => {
    const ok = stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
      kind: "propagated-send/gate",
      nodeConfigured: true,
      hasPropagationPacked: true,
      representation: LxmfDeliveryRepresentation.PACKET
    });
    expect(shouldProceedLxmfPropagatedSend(ok.actions)).toBe(true);

    const missingNode = stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
      kind: "propagated-send/gate",
      nodeConfigured: false,
      hasPropagationPacked: true,
      representation: LxmfDeliveryRepresentation.PACKET
    });
    expect(shouldRejectLxmfPropagatedMissingNode(missingNode.actions)).toBe(true);

    const missingPacked = stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
      kind: "propagated-send/gate",
      nodeConfigured: true,
      hasPropagationPacked: false,
      representation: LxmfDeliveryRepresentation.PACKET
    });
    expect(shouldRejectLxmfPropagatedMissingPacked(missingPacked.actions)).toBe(true);

    const resource = stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
      kind: "propagated-send/gate",
      nodeConfigured: true,
      hasPropagationPacked: true,
      representation: LxmfDeliveryRepresentation.RESOURCE
    });
    expect(shouldRejectLxmfPropagatedResourceUnimplemented(resource.actions)).toBe(true);

    expect(
      stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for propagated-send/gate events", () => {
    const state = initialLxmfPropagatedSendState();
    const event = {
      kind: "propagated-send/gate" as const,
      nodeConfigured: true,
      hasPropagationPacked: true,
      representation: LxmfDeliveryRepresentation.PACKET
    };
    const a = stepLxmfPropagatedSendWithActions(state, event);
    const b = stepLxmfPropagatedSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans LXMF send method dispatch", () => {
    expect(
      planLxmfSendMethod({
        packed: false,
        method: LxmfDeliveryMethod.DIRECT
      })
    ).toBe("reject-unpacked");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.OPPORTUNISTIC
      })
    ).toBe("opportunistic");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.DIRECT
      })
    ).toBe("direct");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.PROPAGATED
      })
    ).toBe("propagated");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.PAPER
      })
    ).toBe("reject-unsupported");
  });

  it("emits send / reject actions from send/dispatch", () => {
    const unpacked = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: false,
      method: LxmfDeliveryMethod.DIRECT
    });
    expect(shouldRejectLxmfSendUnpacked(unpacked.actions)).toBe(true);
    expect(shouldSendLxmfDirect(unpacked.actions)).toBe(false);

    const opportunistic = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: true,
      method: LxmfDeliveryMethod.OPPORTUNISTIC
    });
    expect(shouldSendLxmfOpportunistic(opportunistic.actions)).toBe(true);

    const direct = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: true,
      method: LxmfDeliveryMethod.DIRECT
    });
    expect(shouldSendLxmfDirect(direct.actions)).toBe(true);

    const propagated = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: true,
      method: LxmfDeliveryMethod.PROPAGATED
    });
    expect(shouldSendLxmfPropagated(propagated.actions)).toBe(true);

    const unsupported = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: true,
      method: LxmfDeliveryMethod.PAPER
    });
    expect(shouldRejectLxmfSendUnsupported(unsupported.actions)).toBe(true);
    expect(lxmfSendUnsupportedMethod(unsupported.actions)).toBe(LxmfDeliveryMethod.PAPER);

    expect(
      stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for send/dispatch events", () => {
    const state = initialLxmfSendMethodState();
    const event = {
      kind: "send/dispatch" as const,
      packed: true,
      method: LxmfDeliveryMethod.DIRECT
    };
    const a = stepLxmfSendMethodWithActions(state, event);
    const b = stepLxmfSendMethodWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans DIRECT send preconditions", () => {
    expect(
      planLxmfDirectSend({
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: true
      })
    ).toBe("ok");
    expect(
      planLxmfDirectSend({
        destinationPresent: false,
        destinationIdentityPresent: true,
        packed: true
      })
    ).toBe("missing-destination");
    expect(
      planLxmfDirectSend({
        destinationPresent: true,
        destinationIdentityPresent: false,
        packed: true
      })
    ).toBe("missing-destination");
    expect(
      planLxmfDirectSend({
        destinationPresent: true,
        destinationIdentityPresent: true,
        packed: false
      })
    ).toBe("missing-packed");
  });

  it("emits DIRECT send gate actions from stepLxmfDirectSendWithActions", () => {
    const ok = stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
      kind: "direct-send/gate",
      destinationPresent: true,
      destinationIdentityPresent: true,
      packed: true
    });
    expect(shouldProceedLxmfDirectSend(ok.actions)).toBe(true);

    const missingDestination = stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
      kind: "direct-send/gate",
      destinationPresent: false,
      destinationIdentityPresent: true,
      packed: true
    });
    expect(shouldRejectLxmfDirectMissingDestination(missingDestination.actions)).toBe(true);
    expect(shouldProceedLxmfDirectSend(missingDestination.actions)).toBe(false);

    const missingPacked = stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
      kind: "direct-send/gate",
      destinationPresent: true,
      destinationIdentityPresent: true,
      packed: false
    });
    expect(shouldRejectLxmfDirectMissingPacked(missingPacked.actions)).toBe(true);

    expect(
      stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for direct-send/gate events", () => {
    const state = initialLxmfDirectSendState();
    const event = {
      kind: "direct-send/gate" as const,
      destinationPresent: true,
      destinationIdentityPresent: true,
      packed: true
    };
    const a = stepLxmfDirectSendWithActions(state, event);
    const b = stepLxmfDirectSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans LXMessage instance pack gates", () => {
    expect(
      planLxMessageInstancePack({
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true
      })
    ).toBe("ok");
    expect(
      planLxMessageInstancePack({
        alreadyPacked: true,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true
      })
    ).toBe("already-packed");
    expect(
      planLxMessageInstancePack({
        alreadyPacked: false,
        destinationPresent: false,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: true
      })
    ).toBe("missing-endpoints");
    expect(
      planLxMessageInstancePack({
        alreadyPacked: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true,
        timestampPresent: false
      })
    ).toBe("missing-timestamp");
    expect(
      shouldRejectLxmfPackEndpoints({
        gateMissingEndpoints: true,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true
      })
    ).toBe(true);
    expect(
      shouldRejectLxmfPackEndpoints({
        gateMissingEndpoints: false,
        destinationPresent: true,
        sourcePresent: true,
        sourceIdentityPresent: true
      })
    ).toBe(false);
    expect(
      shouldRejectLxmfPackTimestamp({
        gateMissingTimestamp: true,
        timestampPresent: true
      })
    ).toBe(true);
    expect(
      shouldRejectLxmfPackTimestamp({
        gateMissingTimestamp: false,
        timestampPresent: true
      })
    ).toBe(false);
  });

  it("emits LXMessage instance pack gate actions from stepLxMessageInstancePackWithActions", () => {
    const ok = stepLxMessageInstancePackWithActions(initialLxMessageInstancePackState(), {
      kind: "instance-pack/gate",
      alreadyPacked: false,
      destinationPresent: true,
      sourcePresent: true,
      sourceIdentityPresent: true,
      timestampPresent: true
    });
    expect(ok.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedLxMessageInstancePack(ok.actions)).toBe(true);

    const packed = stepLxMessageInstancePackWithActions(initialLxMessageInstancePackState(), {
      kind: "instance-pack/gate",
      alreadyPacked: true,
      destinationPresent: true,
      sourcePresent: true,
      sourceIdentityPresent: true,
      timestampPresent: true
    });
    expect(packed.actions).toEqual([{ kind: "reject-already-packed" }]);
    expect(shouldRejectLxMessageInstanceAlreadyPacked(packed.actions)).toBe(true);

    const endpoints = stepLxMessageInstancePackWithActions(initialLxMessageInstancePackState(), {
      kind: "instance-pack/gate",
      alreadyPacked: false,
      destinationPresent: false,
      sourcePresent: true,
      sourceIdentityPresent: true,
      timestampPresent: true
    });
    expect(endpoints.actions).toEqual([{ kind: "reject-missing-endpoints" }]);
    expect(shouldRejectLxMessageInstanceMissingEndpoints(endpoints.actions)).toBe(true);

    const timestamp = stepLxMessageInstancePackWithActions(initialLxMessageInstancePackState(), {
      kind: "instance-pack/gate",
      alreadyPacked: false,
      destinationPresent: true,
      sourcePresent: true,
      sourceIdentityPresent: true,
      timestampPresent: false
    });
    expect(timestamp.actions).toEqual([{ kind: "reject-missing-timestamp" }]);
    expect(shouldRejectLxMessageInstanceMissingTimestamp(timestamp.actions)).toBe(true);
  });

  it("is deterministic for LXMessage instance pack gate events", () => {
    const state = initialLxMessageInstancePackState();
    const event = {
      kind: "instance-pack/gate" as const,
      alreadyPacked: false,
      destinationPresent: true,
      sourcePresent: true,
      sourceIdentityPresent: true,
      timestampPresent: true
    };
    const a = stepLxMessageInstancePackWithActions(state, event);
    const b = stepLxMessageInstancePackWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans LXMF signature outcomes", () => {
    expect(
      planLxmfSignatureOutcome({
        sourceIdentityPresent: true,
        signatureValid: true
      })
    ).toEqual({ signatureValidated: true, unverifiedReason: null });
    expect(
      planLxmfSignatureOutcome({
        sourceIdentityPresent: true,
        signatureValid: false
      })
    ).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID
    });
    expect(
      planLxmfSignatureOutcome({
        sourceIdentityPresent: false,
        signatureValid: false
      })
    ).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN
    });
  });

  it("emits LXMF signature apply actions from stepLxmfSignatureWithActions", () => {
    const validated = stepLxmfSignatureWithActions(initialLxmfSignatureState(), {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: true,
      signatureValid: true
    });
    expect(validated.actions).toEqual([
      { kind: "apply", signatureValidated: true, unverifiedReason: null }
    ]);
    expect(shouldApplyLxmfSignature(validated.actions)).toBe(true);
    expect(lxmfSignatureOutcomeFromActions(validated.actions)).toEqual({
      signatureValidated: true,
      unverifiedReason: null
    });

    const invalid = stepLxmfSignatureWithActions(initialLxmfSignatureState(), {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: true,
      signatureValid: false
    });
    expect(invalid.actions).toEqual([
      {
        kind: "apply",
        signatureValidated: false,
        unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID
      }
    ]);
    expect(lxmfSignatureOutcomeFromActions(invalid.actions)).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SIGNATURE_INVALID
    });

    const unknown = stepLxmfSignatureWithActions(initialLxmfSignatureState(), {
      kind: "signature/outcome-gate",
      sourceIdentityPresent: false,
      signatureValid: false
    });
    expect(unknown.actions).toEqual([
      {
        kind: "apply",
        signatureValidated: false,
        unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN
      }
    ]);
    expect(lxmfSignatureOutcomeFromActions(unknown.actions)).toEqual({
      signatureValidated: false,
      unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN
    });
  });

  it("is deterministic for LXMF signature gate events", () => {
    const state = initialLxmfSignatureState();
    const event = {
      kind: "signature/outcome-gate" as const,
      sourceIdentityPresent: true,
      signatureValid: true
    };
    const a = stepLxmfSignatureWithActions(state, event);
    const b = stepLxmfSignatureWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans PROPAGATED pack prep gates", () => {
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        destinationIdentityPresent: true,
        timestampPresent: true
      })
    ).toBe("skip");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: false,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: true
      })
    ).toBe("skip");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: false,
        timestampPresent: true
      })
    ).toBe("missing-identity");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: false
      })
    ).toBe("missing-timestamp");
    expect(
      planLxmfPropagatedPackPrep({
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: true
      })
    ).toBe("ok");
  });

  it("emits PROPAGATED pack prep actions from stepLxmfPropagatedPackPrepWithActions", () => {
    const skip = stepLxmfPropagatedPackPrepWithActions(initialLxmfPropagatedPackPrepState(), {
      kind: "propagated-pack-prep/gate",
      packedPresent: true,
      desiredMethod: LxmfDeliveryMethod.DIRECT,
      destinationIdentityPresent: true,
      timestampPresent: true
    });
    expect(skip.actions).toEqual([{ kind: "skip" }]);
    expect(shouldSkipLxmfPropagatedPackPrep(skip.actions)).toBe(true);

    const ok = stepLxmfPropagatedPackPrepWithActions(initialLxmfPropagatedPackPrepState(), {
      kind: "propagated-pack-prep/gate",
      packedPresent: true,
      desiredMethod: LxmfDeliveryMethod.PROPAGATED,
      destinationIdentityPresent: true,
      timestampPresent: true
    });
    expect(ok.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedLxmfPropagatedPackPrep(ok.actions)).toBe(true);

    const missingIdentity = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: false,
        timestampPresent: true
      }
    );
    expect(missingIdentity.actions).toEqual([{ kind: "reject-missing-identity" }]);
    expect(shouldRejectLxmfPropagatedPackMissingIdentity(missingIdentity.actions)).toBe(true);

    const missingTimestamp = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: false
      }
    );
    expect(missingTimestamp.actions).toEqual([{ kind: "reject-missing-timestamp" }]);
    expect(shouldRejectLxmfPropagatedPackMissingTimestamp(missingTimestamp.actions)).toBe(true);
  });

  it("is deterministic for PROPAGATED pack prep gate events", () => {
    const state = initialLxmfPropagatedPackPrepState();
    const event = {
      kind: "propagated-pack-prep/gate" as const,
      packedPresent: true,
      desiredMethod: LxmfDeliveryMethod.PROPAGATED,
      destinationIdentityPresent: true,
      timestampPresent: true
    };
    const a = stepLxmfPropagatedPackPrepWithActions(state, event);
    const b = stepLxmfPropagatedPackPrepWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans opportunistic send destination gate", () => {
    expect(planLxmfOpportunisticSend({ destinationPresent: true })).toBe("ok");
    expect(planLxmfOpportunisticSend({ destinationPresent: false })).toBe(
      "missing-destination"
    );
  });

  it("emits OPPORTUNISTIC send gate actions from stepLxmfOpportunisticSendWithActions", () => {
    const ok = stepLxmfOpportunisticSendWithActions(initialLxmfOpportunisticSendState(), {
      kind: "opportunistic-send/gate",
      destinationPresent: true
    });
    expect(shouldProceedLxmfOpportunisticSend(ok.actions)).toBe(true);

    const missing = stepLxmfOpportunisticSendWithActions(initialLxmfOpportunisticSendState(), {
      kind: "opportunistic-send/gate",
      destinationPresent: false
    });
    expect(shouldRejectLxmfOpportunisticMissingDestination(missing.actions)).toBe(true);
    expect(shouldProceedLxmfOpportunisticSend(missing.actions)).toBe(false);

    expect(
      stepLxmfOpportunisticSendWithActions(initialLxmfOpportunisticSendState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for opportunistic-send/gate events", () => {
    const state = initialLxmfOpportunisticSendState();
    const event = {
      kind: "opportunistic-send/gate" as const,
      destinationPresent: true
    };
    const a = stepLxmfOpportunisticSendWithActions(state, event);
    const b = stepLxmfOpportunisticSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans propagation local ingress", () => {
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true
      })
    ).toBe("deliver");
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: false,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true
      })
    ).toBe("reject-prefix");
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
        decryptedPresent: true
      })
    ).toBe("reject-destination");
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: false
      })
    ).toBe("reject-decrypt");
    expect(
      canUnpackLxmfPropagationLocalIngress({
        deliver: true,
        prefixedPresent: true,
        decryptedPresent: true
      })
    ).toBe(true);
    expect(
      canUnpackLxmfPropagationLocalIngress({
        deliver: true,
        prefixedPresent: true,
        decryptedPresent: false
      })
    ).toBe(false);
    expect(
      canUnpackLxmfPropagationLocalIngress({
        deliver: false,
        prefixedPresent: true,
        decryptedPresent: true
      })
    ).toBe(false);

    const unpackOk = stepUnpackLxmfPropagationLocalIngressWithActions(
      initialUnpackLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/unpack-gate",
        deliver: true,
        prefixedPresent: true,
        decryptedPresent: true
      }
    );
    expect(shouldUnpackLxmfPropagationLocalIngressNow(unpackOk.actions)).toBe(true);
    expect(shouldSkipUnpackLxmfPropagationLocalIngress(unpackOk.actions)).toBe(false);
    const unpackSkip = stepUnpackLxmfPropagationLocalIngressWithActions(
      initialUnpackLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/unpack-gate",
        deliver: false,
        prefixedPresent: true,
        decryptedPresent: true
      }
    );
    expect(shouldSkipUnpackLxmfPropagationLocalIngress(unpackSkip.actions)).toBe(true);

    expect(shouldAcceptLxmfWireFrame(true)).toBe(true);
    expect(shouldAcceptLxmfWireFrame(false)).toBe(false);
    expect(shouldCommitRememberedLxmfHash(true)).toBe(true);
    expect(shouldCommitRememberedLxmfHash(false)).toBe(false);
    expect(
      shouldAcceptLxmfWireFrameNow(
        stepAcceptLxmfWireFrameWithActions(initialAcceptLxmfWireFrameState(), {
          kind: "lxmf/accept-wire-frame-gate",
          wirePresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipAcceptLxmfWireFrame(
        stepAcceptLxmfWireFrameWithActions(initialAcceptLxmfWireFrameState(), {
          kind: "lxmf/accept-wire-frame-gate",
          wirePresent: false
        }).actions
      )
    ).toBe(true);
    expect(
      shouldCommitRememberedLxmfHashNow(
        stepCommitRememberedLxmfHashWithActions(initialCommitRememberedLxmfHashState(), {
          kind: "lxmf/commit-remembered-hash-gate",
          hashPresent: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipCommitRememberedLxmfHash(
        stepCommitRememberedLxmfHashWithActions(initialCommitRememberedLxmfHashState(), {
          kind: "lxmf/commit-remembered-hash-gate",
          hashPresent: false
        }).actions
      )
    ).toBe(true);
  });

  it("emits propagation local-ingress gate actions from stepLxmfPropagationLocalIngressWithActions", () => {
    const deliver = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true
      }
    );
    expect(shouldDeliverLxmfPropagationLocalIngress(deliver.actions)).toBe(true);
    expect(shouldRejectLxmfPropagationLocalPrefix(deliver.actions)).toBe(false);

    const prefix = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: false,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true
      }
    );
    expect(shouldRejectLxmfPropagationLocalPrefix(prefix.actions)).toBe(true);

    const destination = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
        decryptedPresent: true
      }
    );
    expect(shouldRejectLxmfPropagationLocalDestination(destination.actions)).toBe(true);

    const decrypt = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: false
      }
    );
    expect(shouldRejectLxmfPropagationLocalDecrypt(decrypt.actions)).toBe(true);

    expect(
      stepLxmfPropagationLocalIngressWithActions(initialLxmfPropagationLocalIngressState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for propagation-local-ingress/gate events", () => {
    const state = initialLxmfPropagationLocalIngressState();
    const event = {
      kind: "propagation-local-ingress/gate" as const,
      prefixedPresent: true,
      deliveryDestinationPresent: true,
      destinationHashMatches: true,
      decryptedPresent: true
    };
    const a = stepLxmfPropagationLocalIngressWithActions(state, event);
    const b = stepLxmfPropagationLocalIngressWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans propagation link readiness", () => {
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: true,
        nodeConfigured: true,
        nodeIdentityPresent: true
      })
    ).toBe("reuse");
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: false,
        nodeConfigured: false,
        nodeIdentityPresent: false
      })
    ).toBe("missing-node");
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: false
      })
    ).toBe("missing-identity");
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: true
      })
    ).toBe("establish");
  });

  it("emits propagation link-ready gate actions from stepLxmfPropagationLinkReadyWithActions", () => {
    const reuse = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: true,
        nodeConfigured: true,
        nodeIdentityPresent: true
      }
    );
    expect(shouldReuseLxmfPropagationLink(reuse.actions)).toBe(true);
    expect(shouldEstablishLxmfPropagationLink(reuse.actions)).toBe(false);

    const missingNode = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: false,
        nodeIdentityPresent: false
      }
    );
    expect(shouldRejectLxmfPropagationMissingNode(missingNode.actions)).toBe(true);

    const missingIdentity = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: false
      }
    );
    expect(shouldRejectLxmfPropagationMissingIdentity(missingIdentity.actions)).toBe(true);

    const establish = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: true
      }
    );
    expect(shouldEstablishLxmfPropagationLink(establish.actions)).toBe(true);
    expect(shouldReuseLxmfPropagationLink(establish.actions)).toBe(false);

    expect(
      stepLxmfPropagationLinkReadyWithActions(initialLxmfPropagationLinkReadyState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for propagation-link/gate events", () => {
    const state = initialLxmfPropagationLinkReadyState();
    const event = {
      kind: "propagation-link/gate" as const,
      canReuseLink: false,
      nodeConfigured: true,
      nodeIdentityPresent: true
    };
    const a = stepLxmfPropagationLinkReadyWithActions(state, event);
    const b = stepLxmfPropagationLinkReadyWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans pack timestamp and stamp inclusion", () => {
    expect(planLxmfPackTimestamp({ hasTimestamp: true, hasNow: false })).toBe("use-timestamp");
    expect(planLxmfPackTimestamp({ hasTimestamp: false, hasNow: true })).toBe("use-now");
    expect(planLxmfPackTimestamp({ hasTimestamp: false, hasNow: false })).toBe("reject");
    expect(shouldIncludeLxmfStamp(undefined)).toBe(true);
    expect(shouldIncludeLxmfStamp(false)).toBe(true);
    expect(shouldIncludeLxmfStamp(true)).toBe(false);
    expect(shouldRememberLxmfMessage(true)).toBe(true);
    expect(shouldRememberLxmfMessage(false)).toBe(false);
    expect(
      shouldIncludeLxmfStampNow(
        stepIncludeLxmfStampWithActions(initialIncludeLxmfStampState(), {
          kind: "lxmf/include-stamp-gate",
          deferStamp: undefined
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipIncludeLxmfStamp(
        stepIncludeLxmfStampWithActions(initialIncludeLxmfStampState(), {
          kind: "lxmf/include-stamp-gate",
          deferStamp: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldRememberLxmfMessageNow(
        stepRememberLxmfMessageWithActions(initialRememberLxmfMessageState(), {
          kind: "lxmf/remember-message-gate",
          hasHash: true
        }).actions
      )
    ).toBe(true);
    expect(
      shouldSkipRememberLxmfMessage(
        stepRememberLxmfMessageWithActions(initialRememberLxmfMessageState(), {
          kind: "lxmf/remember-message-gate",
          hasHash: false
        }).actions
      )
    ).toBe(true);
  });

  it("emits pack timestamp actions from stepLxmfPackTimestampWithActions", () => {
    const useTimestamp = stepLxmfPackTimestampWithActions(initialLxmfPackTimestampState(), {
      kind: "pack-timestamp/select",
      hasTimestamp: true,
      hasNow: false
    });
    expect(useTimestamp.actions).toEqual([{ kind: "use-timestamp" }]);
    expect(shouldUseLxmfPackTimestamp(useTimestamp.actions)).toBe(true);

    const useNow = stepLxmfPackTimestampWithActions(initialLxmfPackTimestampState(), {
      kind: "pack-timestamp/select",
      hasTimestamp: false,
      hasNow: true
    });
    expect(useNow.actions).toEqual([{ kind: "use-now" }]);
    expect(shouldUseLxmfPackNow(useNow.actions)).toBe(true);

    const reject = stepLxmfPackTimestampWithActions(initialLxmfPackTimestampState(), {
      kind: "pack-timestamp/select",
      hasTimestamp: false,
      hasNow: false
    });
    expect(reject.actions).toEqual([{ kind: "reject" }]);
    expect(shouldRejectLxmfPackTimestampSelect(reject.actions)).toBe(true);
  });

  it("is deterministic for pack timestamp select events", () => {
    const state = initialLxmfPackTimestampState();
    const event = {
      kind: "pack-timestamp/select" as const,
      hasTimestamp: true,
      hasNow: false
    };
    const a = stepLxmfPackTimestampWithActions(state, event);
    const b = stepLxmfPackTimestampWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("gates delivery-identity registration and propagation-link teardown", () => {
    expect(canRegisterLxmfDeliveryIdentity(false)).toBe(true);
    expect(canRegisterLxmfDeliveryIdentity(true)).toBe(false);
    expect(shouldTeardownLxmfPropagationLink(true)).toBe(true);
    expect(shouldTeardownLxmfPropagationLink(false)).toBe(false);
    expect(canExtractLxmfOpportunisticPayload(true)).toBe(true);
    expect(canExtractLxmfOpportunisticPayload(false)).toBe(false);
    expect(shouldSelectLxmfDeliveryParameters(true)).toBe(true);
    expect(shouldSelectLxmfDeliveryParameters(false)).toBe(false);
    expect(
      shouldRegisterLxmfDeliveryIdentityNow(
        stepRegisterLxmfDeliveryIdentityWithActions(
          initialRegisterLxmfDeliveryIdentityState(),
          {
            kind: "lxmf/register-delivery-identity-gate",
            deliveryDestinationPresent: false
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSkipRegisterLxmfDeliveryIdentity(
        stepRegisterLxmfDeliveryIdentityWithActions(
          initialRegisterLxmfDeliveryIdentityState(),
          {
            kind: "lxmf/register-delivery-identity-gate",
            deliveryDestinationPresent: true
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldTeardownLxmfPropagationLinkNow(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: true
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSkipTeardownLxmfPropagationLink(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: false
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldExtractLxmfOpportunisticPayloadNow(
        stepExtractLxmfOpportunisticPayloadWithActions(
          initialExtractLxmfOpportunisticPayloadState(),
          {
            kind: "lxmf/extract-opportunistic-payload-gate",
            packedPresent: true
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSkipExtractLxmfOpportunisticPayload(
        stepExtractLxmfOpportunisticPayloadWithActions(
          initialExtractLxmfOpportunisticPayloadState(),
          {
            kind: "lxmf/extract-opportunistic-payload-gate",
            packedPresent: false
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSelectLxmfDeliveryParametersNow(
        stepSelectLxmfDeliveryParametersWithActions(
          initialSelectLxmfDeliveryParametersState(),
          {
            kind: "lxmf/select-delivery-parameters-gate",
            packedPresent: true
          }
        ).actions
      )
    ).toBe(true);
    expect(
      shouldSkipSelectLxmfDeliveryParameters(
        stepSelectLxmfDeliveryParametersWithActions(
          initialSelectLxmfDeliveryParametersState(),
          {
            kind: "lxmf/select-delivery-parameters-gate",
            packedPresent: false
          }
        ).actions
      )
    ).toBe(true);
    expect(
      planLxmfPropagationSyncPrep({
        nodeConfigured: false,
        deliveryIdentityPresent: false
      })
    ).toBe("missing-node");
    expect(
      planLxmfPropagationSyncPrep({
        nodeConfigured: true,
        deliveryIdentityPresent: false
      })
    ).toBe("missing-delivery-identity");
    expect(
      planLxmfPropagationSyncPrep({
        nodeConfigured: true,
        deliveryIdentityPresent: true
      })
    ).toBe("ok");
  });

  it("emits propagation sync-prep gate actions from stepLxmfPropagationSyncPrepWithActions", () => {
    const ok = stepLxmfPropagationSyncPrepWithActions(initialLxmfPropagationSyncPrepState(), {
      kind: "propagation-sync-prep/gate",
      nodeConfigured: true,
      deliveryIdentityPresent: true
    });
    expect(shouldProceedLxmfPropagationSyncPrep(ok.actions)).toBe(true);

    const missingNode = stepLxmfPropagationSyncPrepWithActions(
      initialLxmfPropagationSyncPrepState(),
      {
        kind: "propagation-sync-prep/gate",
        nodeConfigured: false,
        deliveryIdentityPresent: false
      }
    );
    expect(shouldRejectLxmfPropagationSyncMissingNode(missingNode.actions)).toBe(true);
    expect(shouldProceedLxmfPropagationSyncPrep(missingNode.actions)).toBe(false);

    const missingIdentity = stepLxmfPropagationSyncPrepWithActions(
      initialLxmfPropagationSyncPrepState(),
      {
        kind: "propagation-sync-prep/gate",
        nodeConfigured: true,
        deliveryIdentityPresent: false
      }
    );
    expect(shouldRejectLxmfPropagationSyncMissingDeliveryIdentity(missingIdentity.actions)).toBe(
      true
    );

    expect(
      stepLxmfPropagationSyncPrepWithActions(initialLxmfPropagationSyncPrepState(), {
        kind: "timer/fired",
        id: "x",
        at: 0
      }).actions
    ).toEqual([]);
  });

  it("is deterministic for propagation-sync-prep/gate events", () => {
    const state = initialLxmfPropagationSyncPrepState();
    const event = {
      kind: "propagation-sync-prep/gate" as const,
      nodeConfigured: true,
      deliveryIdentityPresent: true
    };
    const a = stepLxmfPropagationSyncPrepWithActions(state, event);
    const b = stepLxmfPropagationSyncPrepWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
