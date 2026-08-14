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
  initialLxmfSignatureOutcomePlanState,
  initialLxmfDirectSendPlanState,
  initialLxmfOpportunisticSendPlanState,
  initialLxmfPackTimestampPlanState,
  initialLxmfPropagatedPackPrepPlanState,
  initialLxmfPropagatedSendPlanState,
  initialLxmfPropagationLinkReadyPlanState,
  initialLxmfPropagationLocalIngressPlanState,
  initialLxmfPropagationSyncPrepPlanState,
  initialLxmfSendMethodPlanState,
  initialLxMessageInstancePackPlanState,
  initialLxMessagePackPlanState,
  lxMessageInstancePackPlanFromActions,
  lxMessagePackPlanFromActions,
  lxmfDeliverableAcceptPlanFromActions,
  lxmfDirectSendPlanFromActions,
  lxmfOpportunisticSendPlanFromActions,
  lxmfPackTimestampPlanFromActions,
  lxmfPropagatedPackPrepPlanFromActions,
  lxmfPropagatedSendPlanFromActions,
  lxmfPropagationLinkReadyPlanFromActions,
  lxmfPropagationLocalIngressPlanFromActions,
  lxmfPropagationSyncPrepPlanFromActions,
  lxmfSendMethodPlanFromActions,
  shouldPlanLxMessageInstancePackOk,
  shouldPlanLxMessagePackOk,
  shouldPlanLxmfDeliverableAccept,
  shouldPlanLxmfDirectSendOk,
  shouldPlanLxmfOpportunisticSendOk,
  shouldPlanLxmfPackTimestampUseNow,
  shouldPlanLxmfPackTimestampUseTimestamp,
  shouldPlanLxmfPropagatedPackPrepOk,
  shouldPlanLxmfPropagatedPackPrepSkip,
  shouldPlanLxmfPropagatedSendOk,
  shouldPlanLxmfPropagationLinkReadyEstablish,
  shouldPlanLxmfPropagationLinkReadyReuse,
  shouldPlanLxmfPropagationLocalIngressDeliver,
  shouldPlanLxmfPropagationSyncPrepOk,
  shouldPlanLxmfSendMethodDirect,
  shouldPlanLxmfSendMethodOpportunistic,
  shouldPlanLxmfSendMethodPropagated,
  shouldRejectLxMessageInstancePackPlanAlreadyPacked,
  shouldRejectLxMessageInstancePackPlanMissingEndpoints,
  shouldRejectLxMessageInstancePackPlanMissingTimestamp,
  shouldRejectLxMessagePackPlanBadDestination,
  shouldRejectLxMessagePackPlanBadSource,
  shouldRejectLxmfDeliverableAcceptPlanSeen,
  shouldRejectLxmfDeliverableAcceptPlanUnsigned,
  shouldRejectLxmfDirectSendPlanMissingDestination,
  shouldRejectLxmfDirectSendPlanMissingPacked,
  shouldRejectLxmfOpportunisticSendPlanMissingDestination,
  shouldRejectLxmfPackTimestampPlan,
  shouldRejectLxmfPropagatedPackPrepPlanMissingIdentity,
  shouldRejectLxmfPropagatedPackPrepPlanMissingTimestamp,
  shouldRejectLxmfPropagatedSendPlanMissingNode,
  shouldRejectLxmfPropagatedSendPlanMissingPacked,
  shouldRejectLxmfPropagatedSendPlanResourceUnimplemented,
  shouldRejectLxmfPropagationLinkReadyPlanMissingIdentity,
  shouldRejectLxmfPropagationLinkReadyPlanMissingNode,
  shouldRejectLxmfPropagationLocalIngressPlanDecrypt,
  shouldRejectLxmfPropagationLocalIngressPlanDestination,
  shouldRejectLxmfPropagationLocalIngressPlanPrefix,
  shouldRejectLxmfPropagationSyncPrepPlanMissingDeliveryIdentity,
  shouldRejectLxmfPropagationSyncPrepPlanMissingNode,
  shouldRejectLxmfSendMethodPlanUnpacked,
  shouldRejectLxmfSendMethodPlanUnsupported,
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
  initialLxmfDeliverableAcceptPlanState,
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
  lxmfSignatureOutcomePlanFromActions,
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
  stepLxmfDeliverableAcceptPlanWithActions,
  stepLxmfDeliverableAcceptWithActions,
  stepLxmfDeliveryPlanWithActions,
  stepLxmfDeliveryWithActions,
  stepLxmfDirectSendPlanWithActions,
  stepLxmfDirectSendWithActions,
  stepLxmfOpportunisticSendPlanWithActions,
  stepLxmfOpportunisticSendWithActions,
  stepLxmfPackTimestampPlanWithActions,
  stepLxmfPackTimestampWithActions,
  stepLxmfPropagatedPackPrepPlanWithActions,
  stepLxmfPropagatedPackPrepWithActions,
  stepLxmfPropagatedSendPlanWithActions,
  stepLxmfPropagatedSendWithActions,
  stepLxmfPropagationLinkReadyPlanWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfPropagationLocalIngressPlanWithActions,
  stepLxmfPropagationLocalIngressWithActions,
  stepLxmfPropagationSyncPrepPlanWithActions,
  stepLxmfPropagationSyncPrepWithActions,
  stepLxmfSendMethodPlanWithActions,
  stepLxmfSendMethodWithActions,
  stepLxmfSignatureOutcomePlanWithActions,
  stepLxmfSignatureWithActions,
  stepLxMessageInstancePackPlanWithActions,
  stepLxMessageInstancePackWithActions,
  stepLxMessagePackPlanWithActions,
  stepLxMessagePackWithActions,
  stepRegisterLxmfDeliveryIdentityWithActions,
  stepRememberLxmfMessageWithActions,
  stepSelectLxmfDeliveryParametersWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepUnpackLxmfPropagationLocalIngressWithActions,
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
      LXMF_ENCRYPTED_PACKET_MDU - LXMF_OVERHEAD + 16,
    );
    expect(LXMF_LINK_PACKET_MAX_CONTENT).toBe(
      LXMF_LINK_PACKET_MDU - LXMF_OVERHEAD,
    );
  });

  it("plans opportunistic and direct representations", () => {
    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      }),
    ).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.OPPORTUNISTIC,
      representation: LxmfDeliveryRepresentation.PACKET,
    });

    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        contentSize: 80,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      }),
    ).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE,
    });
  });

  it("rejects oversized opportunistic content", () => {
    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
        contentSize: 200,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      }).kind,
    ).toBe("reject-opportunistic-too-large");
  });

  it("plans propagated representation from envelope size", () => {
    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
        propagationPackedLength: 40,
      }),
    ).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.PROPAGATED,
      representation: LxmfDeliveryRepresentation.PACKET,
    });

    expect(
      planLxmfDelivery({
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
        propagationPackedLength: 80,
      }).representation,
    ).toBe(LxmfDeliveryRepresentation.RESOURCE);
  });

  it("emits delivery-plan actions only from delivery/plan-gate", () => {
    const delivered = stepLxmfDeliveryPlanWithActions(
      initialLxmfDeliveryPlanState(),
      {
        kind: "delivery/plan-gate",
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        contentSize: 80,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      },
    );
    expect(shouldDeliverLxmfDeliveryPlan(delivered.actions)).toBe(true);
    expect(
      shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(delivered.actions),
    ).toBe(false);
    expect(lxmfDeliveryPlanDeliverParams(delivered.actions)).toEqual({
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE,
    });
    expect(lxmfDeliveryPlanFromActions(delivered.actions)).toEqual({
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE,
    });

    const rejected = stepLxmfDeliveryPlanWithActions(
      initialLxmfDeliveryPlanState(),
      {
        kind: "delivery/plan-gate",
        desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
        contentSize: 200,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      },
    );
    expect(
      shouldRejectLxmfDeliveryPlanOpportunisticTooLarge(rejected.actions),
    ).toBe(true);
    expect(shouldDeliverLxmfDeliveryPlan(rejected.actions)).toBe(false);
    expect(lxmfDeliveryPlanOpportunisticRejectSizes(rejected.actions)).toEqual({
      contentSize: 200,
      maxContent: 100,
    });

    const unsupported = stepLxmfDeliveryPlanWithActions(
      initialLxmfDeliveryPlanState(),
      {
        kind: "delivery/plan-gate",
        desiredMethod: 0xff,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      },
    );
    expect(
      shouldRejectLxmfDeliveryPlanUnsupportedMethod(unsupported.actions),
    ).toBe(true);
    expect(lxmfDeliveryPlanUnsupportedMethod(unsupported.actions)).toBe(0xff);
    expect(lxmfDeliveryPlanFromActions(unsupported.actions)).toEqual({
      kind: "reject-unsupported-method",
      method: 0xff,
    });

    expect(
      stepLxmfDeliveryPlanWithActions(initialLxmfDeliveryPlanState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits deliver / reject actions from delivery/select", () => {
    const delivered = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod: LxmfDeliveryMethod.DIRECT,
      contentSize: 80,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50,
    });
    expect(shouldDeliverLxmf(delivered.actions)).toBe(true);
    expect(shouldRejectLxmfOpportunisticTooLarge(delivered.actions)).toBe(
      false,
    );
    expect(lxmfDeliveryDeliverParams(delivered.actions)).toEqual({
      method: LxmfDeliveryMethod.DIRECT,
      representation: LxmfDeliveryRepresentation.RESOURCE,
    });

    const rejected = stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
      kind: "delivery/select",
      desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
      contentSize: 200,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50,
    });
    expect(shouldRejectLxmfOpportunisticTooLarge(rejected.actions)).toBe(true);
    expect(shouldDeliverLxmf(rejected.actions)).toBe(false);
    expect(lxmfDeliveryOpportunisticRejectSizes(rejected.actions)).toEqual({
      contentSize: 200,
      maxContent: 100,
    });

    const unsupported = stepLxmfDeliveryWithActions(
      initialLxmfDeliveryState(),
      {
        kind: "delivery/select",
        desiredMethod: 0xff,
        contentSize: 10,
        encryptedPacketMaxContent: 100,
        linkPacketMaxContent: 50,
      },
    );
    expect(shouldRejectLxmfUnsupportedMethod(unsupported.actions)).toBe(true);
    expect(shouldDeliverLxmf(unsupported.actions)).toBe(false);

    expect(
      stepLxmfDeliveryWithActions(initialLxmfDeliveryState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });

  it("is deterministic for delivery select events", () => {
    const state = initialLxmfDeliveryState();
    const event = {
      kind: "delivery/select" as const,
      desiredMethod: LxmfDeliveryMethod.OPPORTUNISTIC,
      contentSize: 10,
      encryptedPacketMaxContent: 100,
      linkPacketMaxContent: 50,
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
        sourceIdentityPresent: true,
      }),
    ).toBe("ok");
    expect(
      planLxMessagePack({
        destinationDirectionOut: false,
        sourceDirectionIn: true,
        sourceIdentityPresent: true,
      }),
    ).toBe("bad-destination");
    expect(
      planLxMessagePack({
        destinationDirectionOut: true,
        sourceDirectionIn: false,
        sourceIdentityPresent: true,
      }),
    ).toBe("bad-source");
    expect(
      planLxMessagePack({
        destinationDirectionOut: true,
        sourceDirectionIn: true,
        sourceIdentityPresent: false,
      }),
    ).toBe("bad-source");
  });

  it("emits LXMessage pack-plan actions only from lxmessage-pack/plan-gate", () => {
    const ok = stepLxMessagePackPlanWithActions(
      initialLxMessagePackPlanState(),
      {
        kind: "lxmessage-pack/plan-gate",
        destinationDirectionOut: true,
        sourceDirectionIn: true,
        sourceIdentityPresent: true,
      },
    );
    expect(shouldPlanLxMessagePackOk(ok.actions)).toBe(true);
    expect(lxMessagePackPlanFromActions(ok.actions)).toBe("ok");

    const badDest = stepLxMessagePackPlanWithActions(
      initialLxMessagePackPlanState(),
      {
        kind: "lxmessage-pack/plan-gate",
        destinationDirectionOut: false,
        sourceDirectionIn: true,
        sourceIdentityPresent: true,
      },
    );
    expect(shouldRejectLxMessagePackPlanBadDestination(badDest.actions)).toBe(
      true,
    );
    expect(lxMessagePackPlanFromActions(badDest.actions)).toBe(
      "bad-destination",
    );

    const badSource = stepLxMessagePackPlanWithActions(
      initialLxMessagePackPlanState(),
      {
        kind: "lxmessage-pack/plan-gate",
        destinationDirectionOut: true,
        sourceDirectionIn: true,
        sourceIdentityPresent: false,
      },
    );
    expect(shouldRejectLxMessagePackPlanBadSource(badSource.actions)).toBe(
      true,
    );
    expect(lxMessagePackPlanFromActions(badSource.actions)).toBe("bad-source");

    expect(
      stepLxMessagePackPlanWithActions(initialLxMessagePackPlanState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits LXMessage pack gate actions from stepLxMessagePackWithActions", () => {
    const ok = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut: true,
      sourceDirectionIn: true,
      sourceIdentityPresent: true,
    });
    expect(ok.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedLxMessagePack(ok.actions)).toBe(true);

    const badDest = stepLxMessagePackWithActions(initialLxMessagePackState(), {
      kind: "lxmessage-pack/gate",
      destinationDirectionOut: false,
      sourceDirectionIn: true,
      sourceIdentityPresent: true,
    });
    expect(badDest.actions).toEqual([{ kind: "reject-bad-destination" }]);
    expect(shouldRejectLxMessagePackBadDestination(badDest.actions)).toBe(true);

    const badSource = stepLxMessagePackWithActions(
      initialLxMessagePackState(),
      {
        kind: "lxmessage-pack/gate",
        destinationDirectionOut: true,
        sourceDirectionIn: true,
        sourceIdentityPresent: false,
      },
    );
    expect(badSource.actions).toEqual([{ kind: "reject-bad-source" }]);
    expect(shouldRejectLxMessagePackBadSource(badSource.actions)).toBe(true);
  });

  it("is deterministic for LXMessage pack gate events", () => {
    const state = initialLxMessagePackState();
    const event = {
      kind: "lxmessage-pack/gate" as const,
      destinationDirectionOut: true,
      sourceDirectionIn: true,
      sourceIdentityPresent: true,
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
        alreadySeen: false,
      }),
    ).toBe("accept");
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: false,
        hasHash: true,
        alreadySeen: false,
      }),
    ).toBe("reject-unsigned");
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: true,
        hasHash: true,
        alreadySeen: true,
      }),
    ).toBe("reject-seen");
    expect(
      planLxmfDeliverableAccept({
        signatureValidated: true,
        hasHash: false,
        alreadySeen: true,
      }),
    ).toBe("accept");
  });

  it("emits deliverable-accept-plan actions only from deliverable/plan-gate", () => {
    const accept = stepLxmfDeliverableAcceptPlanWithActions(
      initialLxmfDeliverableAcceptPlanState(),
      {
        kind: "deliverable/plan-gate",
        signatureValidated: true,
        hasHash: true,
        alreadySeen: false,
      },
    );
    expect(shouldPlanLxmfDeliverableAccept(accept.actions)).toBe(true);
    expect(lxmfDeliverableAcceptPlanFromActions(accept.actions)).toBe("accept");

    const unsigned = stepLxmfDeliverableAcceptPlanWithActions(
      initialLxmfDeliverableAcceptPlanState(),
      {
        kind: "deliverable/plan-gate",
        signatureValidated: false,
        hasHash: true,
        alreadySeen: false,
      },
    );
    expect(
      shouldRejectLxmfDeliverableAcceptPlanUnsigned(unsigned.actions),
    ).toBe(true);
    expect(lxmfDeliverableAcceptPlanFromActions(unsigned.actions)).toBe(
      "reject-unsigned",
    );

    const seen = stepLxmfDeliverableAcceptPlanWithActions(
      initialLxmfDeliverableAcceptPlanState(),
      {
        kind: "deliverable/plan-gate",
        signatureValidated: true,
        hasHash: true,
        alreadySeen: true,
      },
    );
    expect(shouldRejectLxmfDeliverableAcceptPlanSeen(seen.actions)).toBe(true);
    expect(lxmfDeliverableAcceptPlanFromActions(seen.actions)).toBe(
      "reject-seen",
    );

    expect(
      stepLxmfDeliverableAcceptPlanWithActions(
        initialLxmfDeliverableAcceptPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits deliverable accept-gate actions from stepLxmfDeliverableAcceptWithActions", () => {
    const accept = stepLxmfDeliverableAcceptWithActions(
      initialLxmfDeliverableAcceptState(),
      {
        kind: "deliverable/accept-gate",
        signatureValidated: true,
        hasHash: true,
        alreadySeen: false,
      },
    );
    expect(shouldAcceptLxmfDeliverable(accept.actions)).toBe(true);
    expect(shouldRejectLxmfDeliverableUnsigned(accept.actions)).toBe(false);

    const unsigned = stepLxmfDeliverableAcceptWithActions(
      initialLxmfDeliverableAcceptState(),
      {
        kind: "deliverable/accept-gate",
        signatureValidated: false,
        hasHash: true,
        alreadySeen: false,
      },
    );
    expect(shouldRejectLxmfDeliverableUnsigned(unsigned.actions)).toBe(true);
    expect(shouldAcceptLxmfDeliverable(unsigned.actions)).toBe(false);

    const seen = stepLxmfDeliverableAcceptWithActions(
      initialLxmfDeliverableAcceptState(),
      {
        kind: "deliverable/accept-gate",
        signatureValidated: true,
        hasHash: true,
        alreadySeen: true,
      },
    );
    expect(shouldRejectLxmfDeliverableSeen(seen.actions)).toBe(true);

    expect(
      stepLxmfDeliverableAcceptWithActions(
        initialLxmfDeliverableAcceptState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("is deterministic for deliverable/accept-gate events", () => {
    const state = initialLxmfDeliverableAcceptState();
    const event = {
      kind: "deliverable/accept-gate" as const,
      signatureValidated: true,
      hasHash: true,
      alreadySeen: false,
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
        destinationHashMatches: true,
      }),
    ).toBe(true);
    expect(
      canAcceptLxmfPropagationLocalDelivery({
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
      }),
    ).toBe(false);
    expect(
      canAcceptLxmfPropagationLocalDelivery({
        deliveryDestinationPresent: false,
        destinationHashMatches: true,
      }),
    ).toBe(false);

    const localOk = stepAcceptLxmfPropagationLocalDeliveryWithActions(
      initialAcceptLxmfPropagationLocalDeliveryState(),
      {
        kind: "propagation-local-delivery/accept-gate",
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
      },
    );
    expect(shouldAcceptLxmfPropagationLocalDeliveryNow(localOk.actions)).toBe(
      true,
    );
    expect(shouldSkipAcceptLxmfPropagationLocalDelivery(localOk.actions)).toBe(
      false,
    );
    const localSkip = stepAcceptLxmfPropagationLocalDeliveryWithActions(
      initialAcceptLxmfPropagationLocalDeliveryState(),
      {
        kind: "propagation-local-delivery/accept-gate",
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
      },
    );
    expect(
      shouldSkipAcceptLxmfPropagationLocalDelivery(localSkip.actions),
    ).toBe(true);

    expect(
      planLxmfPropagatedSend({
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET,
      }),
    ).toBe("ok");
    expect(
      planLxmfPropagatedSend({
        nodeConfigured: false,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET,
      }),
    ).toBe("missing-node");
    expect(
      planLxmfPropagatedSend({
        nodeConfigured: true,
        hasPropagationPacked: false,
        representation: LxmfDeliveryRepresentation.PACKET,
      }),
    ).toBe("missing-packed");
    expect(
      planLxmfPropagatedSend({
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.RESOURCE,
      }),
    ).toBe("resource-unimplemented");
    expect(shouldAwaitLxmfDeliveryReceipt(true)).toBe(true);
    expect(shouldAwaitLxmfDeliveryReceipt(false)).toBe(false);
    expect(shouldInvokeLxmfDeliveryCallback(true)).toBe(true);
    expect(shouldInvokeLxmfDeliveryCallback(false)).toBe(false);

    const awaitOk = stepAwaitLxmfDeliveryReceiptWithActions(
      initialAwaitLxmfDeliveryReceiptState(),
      { kind: "lxmf/await-delivery-receipt-gate", receiptPresent: true },
    );
    expect(shouldAwaitLxmfDeliveryReceiptNow(awaitOk.actions)).toBe(true);
    expect(shouldSkipAwaitLxmfDeliveryReceipt(awaitOk.actions)).toBe(false);
    const awaitSkip = stepAwaitLxmfDeliveryReceiptWithActions(
      initialAwaitLxmfDeliveryReceiptState(),
      { kind: "lxmf/await-delivery-receipt-gate", receiptPresent: false },
    );
    expect(shouldSkipAwaitLxmfDeliveryReceipt(awaitSkip.actions)).toBe(true);

    const invokeOk = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      { kind: "lxmf/invoke-delivery-callback-gate", messagePresent: true },
    );
    expect(shouldInvokeLxmfDeliveryCallbackNow(invokeOk.actions)).toBe(true);
    expect(shouldSkipInvokeLxmfDeliveryCallback(invokeOk.actions)).toBe(false);
    const invokeSkip = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      { kind: "lxmf/invoke-delivery-callback-gate", messagePresent: false },
    );
    expect(shouldSkipInvokeLxmfDeliveryCallback(invokeSkip.actions)).toBe(true);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits PROPAGATED send-plan actions only from propagated-send/plan-gate", () => {
    const ok = stepLxmfPropagatedSendPlanWithActions(
      initialLxmfPropagatedSendPlanState(),
      {
        kind: "propagated-send/plan-gate",
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET,
      },
    );
    expect(shouldPlanLxmfPropagatedSendOk(ok.actions)).toBe(true);
    expect(lxmfPropagatedSendPlanFromActions(ok.actions)).toBe("ok");

    const missingNode = stepLxmfPropagatedSendPlanWithActions(
      initialLxmfPropagatedSendPlanState(),
      {
        kind: "propagated-send/plan-gate",
        nodeConfigured: false,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET,
      },
    );
    expect(
      shouldRejectLxmfPropagatedSendPlanMissingNode(missingNode.actions),
    ).toBe(true);
    expect(lxmfPropagatedSendPlanFromActions(missingNode.actions)).toBe(
      "missing-node",
    );

    const missingPacked = stepLxmfPropagatedSendPlanWithActions(
      initialLxmfPropagatedSendPlanState(),
      {
        kind: "propagated-send/plan-gate",
        nodeConfigured: true,
        hasPropagationPacked: false,
        representation: LxmfDeliveryRepresentation.PACKET,
      },
    );
    expect(
      shouldRejectLxmfPropagatedSendPlanMissingPacked(missingPacked.actions),
    ).toBe(true);
    expect(lxmfPropagatedSendPlanFromActions(missingPacked.actions)).toBe(
      "missing-packed",
    );

    const resource = stepLxmfPropagatedSendPlanWithActions(
      initialLxmfPropagatedSendPlanState(),
      {
        kind: "propagated-send/plan-gate",
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.RESOURCE,
      },
    );
    expect(
      shouldRejectLxmfPropagatedSendPlanResourceUnimplemented(resource.actions),
    ).toBe(true);
    expect(lxmfPropagatedSendPlanFromActions(resource.actions)).toBe(
      "resource-unimplemented",
    );

    expect(
      stepLxmfPropagatedSendPlanWithActions(
        initialLxmfPropagatedSendPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("emits PROPAGATED send gate actions from stepLxmfPropagatedSendWithActions", () => {
    const ok = stepLxmfPropagatedSendWithActions(
      initialLxmfPropagatedSendState(),
      {
        kind: "propagated-send/gate",
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET,
      },
    );
    expect(shouldProceedLxmfPropagatedSend(ok.actions)).toBe(true);

    const missingNode = stepLxmfPropagatedSendWithActions(
      initialLxmfPropagatedSendState(),
      {
        kind: "propagated-send/gate",
        nodeConfigured: false,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET,
      },
    );
    expect(shouldRejectLxmfPropagatedMissingNode(missingNode.actions)).toBe(
      true,
    );

    const missingPacked = stepLxmfPropagatedSendWithActions(
      initialLxmfPropagatedSendState(),
      {
        kind: "propagated-send/gate",
        nodeConfigured: true,
        hasPropagationPacked: false,
        representation: LxmfDeliveryRepresentation.PACKET,
      },
    );
    expect(shouldRejectLxmfPropagatedMissingPacked(missingPacked.actions)).toBe(
      true,
    );

    const resource = stepLxmfPropagatedSendWithActions(
      initialLxmfPropagatedSendState(),
      {
        kind: "propagated-send/gate",
        nodeConfigured: true,
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.RESOURCE,
      },
    );
    expect(
      shouldRejectLxmfPropagatedResourceUnimplemented(resource.actions),
    ).toBe(true);

    expect(
      stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
        kind: "timer/fired",
        id: "x",
        at: 0,
      }).actions,
    ).toEqual([]);
  });

  it("is deterministic for propagated-send/gate events", () => {
    const state = initialLxmfPropagatedSendState();
    const event = {
      kind: "propagated-send/gate" as const,
      nodeConfigured: true,
      hasPropagationPacked: true,
      representation: LxmfDeliveryRepresentation.PACKET,
    };
    const a = stepLxmfPropagatedSendWithActions(state, event);
    const b = stepLxmfPropagatedSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("plans LXMF send method dispatch", () => {
    expect(
      planLxmfSendMethod({
        packed: false,
        method: LxmfDeliveryMethod.DIRECT,
      }),
    ).toBe("reject-unpacked");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.OPPORTUNISTIC,
      }),
    ).toBe("opportunistic");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.DIRECT,
      }),
    ).toBe("direct");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.PROPAGATED,
      }),
    ).toBe("propagated");
    expect(
      planLxmfSendMethod({
        packed: true,
        method: LxmfDeliveryMethod.PAPER,
      }),
    ).toBe("reject-unsupported");
  });
});
