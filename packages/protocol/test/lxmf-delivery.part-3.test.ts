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
  it("emits PROPAGATED pack prep actions from stepLxmfPropagatedPackPrepWithActions", () => {
    const skip = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.DIRECT,
        destinationIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(skip.actions).toEqual([{ kind: "skip" }]);
    expect(shouldSkipLxmfPropagatedPackPrep(skip.actions)).toBe(true);

    const ok = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: true,
      },
    );
    expect(ok.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedLxmfPropagatedPackPrep(ok.actions)).toBe(true);

    const missingIdentity = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: false,
        timestampPresent: true,
      },
    );
    expect(missingIdentity.actions).toEqual([
      { kind: "reject-missing-identity" },
    ]);
    expect(
      shouldRejectLxmfPropagatedPackMissingIdentity(missingIdentity.actions),
    ).toBe(true);

    const missingTimestamp = stepLxmfPropagatedPackPrepWithActions(
      initialLxmfPropagatedPackPrepState(),
      {
        kind: "propagated-pack-prep/gate",
        packedPresent: true,
        desiredMethod: LxmfDeliveryMethod.PROPAGATED,
        destinationIdentityPresent: true,
        timestampPresent: false,
      },
    );
    expect(missingTimestamp.actions).toEqual([
      { kind: "reject-missing-timestamp" },
    ]);
    expect(
      shouldRejectLxmfPropagatedPackMissingTimestamp(missingTimestamp.actions),
    ).toBe(true);
  });

  it("is deterministic for PROPAGATED pack prep gate events", () => {
    const state = initialLxmfPropagatedPackPrepState();
    const event = {
      kind: "propagated-pack-prep/gate" as const,
      packedPresent: true,
      desiredMethod: LxmfDeliveryMethod.PROPAGATED,
      destinationIdentityPresent: true,
      timestampPresent: true,
    };
    const a = stepLxmfPropagatedPackPrepWithActions(state, event);
    const b = stepLxmfPropagatedPackPrepWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans opportunistic send destination gate", () => {
    expect(planLxmfOpportunisticSend({ destinationPresent: true })).toBe("ok");
    expect(planLxmfOpportunisticSend({ destinationPresent: false })).toBe(
      "missing-destination",
    );
  });

  it("emits OPPORTUNISTIC send-plan actions only from opportunistic-send/plan-gate", () => {
    const ok = stepLxmfOpportunisticSendPlanWithActions(
      initialLxmfOpportunisticSendPlanState(),
      {
        kind: "opportunistic-send/plan-gate",
        destinationPresent: true,
      },
    );
    expect(shouldPlanLxmfOpportunisticSendOk(ok.actions)).toBe(true);
    expect(lxmfOpportunisticSendPlanFromActions(ok.actions)).toBe("ok");

    const missing = stepLxmfOpportunisticSendPlanWithActions(
      initialLxmfOpportunisticSendPlanState(),
      {
        kind: "opportunistic-send/plan-gate",
        destinationPresent: false,
      },
    );
    expect(
      shouldRejectLxmfOpportunisticSendPlanMissingDestination(missing.actions),
    ).toBe(true);
    expect(lxmfOpportunisticSendPlanFromActions(missing.actions)).toBe(
      "missing-destination",
    );

    expect(
      stepLxmfOpportunisticSendPlanWithActions(
        initialLxmfOpportunisticSendPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("emits OPPORTUNISTIC send gate actions from stepLxmfOpportunisticSendWithActions", () => {
    const ok = stepLxmfOpportunisticSendWithActions(
      initialLxmfOpportunisticSendState(),
      {
        kind: "opportunistic-send/gate",
        destinationPresent: true,
      },
    );
    expect(shouldProceedLxmfOpportunisticSend(ok.actions)).toBe(true);

    const missing = stepLxmfOpportunisticSendWithActions(
      initialLxmfOpportunisticSendState(),
      {
        kind: "opportunistic-send/gate",
        destinationPresent: false,
      },
    );
    expect(
      shouldRejectLxmfOpportunisticMissingDestination(missing.actions),
    ).toBe(true);
    expect(shouldProceedLxmfOpportunisticSend(missing.actions)).toBe(false);

    expect(
      stepLxmfOpportunisticSendWithActions(
        initialLxmfOpportunisticSendState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("is deterministic for opportunistic-send/gate events", () => {
    const state = initialLxmfOpportunisticSendState();
    const event = {
      kind: "opportunistic-send/gate" as const,
      destinationPresent: true,
    };
    const a = stepLxmfOpportunisticSendWithActions(state, event);
    const b = stepLxmfOpportunisticSendWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("plans propagation local ingress", () => {
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true,
      }),
    ).toBe("deliver");
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: false,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true,
      }),
    ).toBe("reject-prefix");
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
        decryptedPresent: true,
      }),
    ).toBe("reject-destination");
    expect(
      planLxmfPropagationLocalIngress({
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: false,
      }),
    ).toBe("reject-decrypt");
    expect(
      canUnpackLxmfPropagationLocalIngress({
        deliver: true,
        prefixedPresent: true,
        decryptedPresent: true,
      }),
    ).toBe(true);
    expect(
      canUnpackLxmfPropagationLocalIngress({
        deliver: true,
        prefixedPresent: true,
        decryptedPresent: false,
      }),
    ).toBe(false);
    expect(
      canUnpackLxmfPropagationLocalIngress({
        deliver: false,
        prefixedPresent: true,
        decryptedPresent: true,
      }),
    ).toBe(false);

    const unpackOk = stepUnpackLxmfPropagationLocalIngressWithActions(
      initialUnpackLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/unpack-gate",
        deliver: true,
        prefixedPresent: true,
        decryptedPresent: true,
      },
    );
    expect(shouldUnpackLxmfPropagationLocalIngressNow(unpackOk.actions)).toBe(
      true,
    );
    expect(shouldSkipUnpackLxmfPropagationLocalIngress(unpackOk.actions)).toBe(
      false,
    );
    const unpackSkip = stepUnpackLxmfPropagationLocalIngressWithActions(
      initialUnpackLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/unpack-gate",
        deliver: false,
        prefixedPresent: true,
        decryptedPresent: true,
      },
    );
    expect(
      shouldSkipUnpackLxmfPropagationLocalIngress(unpackSkip.actions),
    ).toBe(true);

    expect(shouldAcceptLxmfWireFrame(true)).toBe(true);
    expect(shouldAcceptLxmfWireFrame(false)).toBe(false);
    expect(shouldCommitRememberedLxmfHash(true)).toBe(true);
    expect(shouldCommitRememberedLxmfHash(false)).toBe(false);
    expect(
      shouldAcceptLxmfWireFrameNow(
        stepAcceptLxmfWireFrameWithActions(initialAcceptLxmfWireFrameState(), {
          kind: "lxmf/accept-wire-frame-gate",
          wirePresent: true,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipAcceptLxmfWireFrame(
        stepAcceptLxmfWireFrameWithActions(initialAcceptLxmfWireFrameState(), {
          kind: "lxmf/accept-wire-frame-gate",
          wirePresent: false,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldCommitRememberedLxmfHashNow(
        stepCommitRememberedLxmfHashWithActions(
          initialCommitRememberedLxmfHashState(),
          {
            kind: "lxmf/commit-remembered-hash-gate",
            hashPresent: true,
          },
        ).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipCommitRememberedLxmfHash(
        stepCommitRememberedLxmfHashWithActions(
          initialCommitRememberedLxmfHashState(),
          {
            kind: "lxmf/commit-remembered-hash-gate",
            hashPresent: false,
          },
        ).actions,
      ),
    ).toBe(true);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits propagation local-ingress-plan actions only from propagation-local-ingress/plan-gate", () => {
    const deliver = stepLxmfPropagationLocalIngressPlanWithActions(
      initialLxmfPropagationLocalIngressPlanState(),
      {
        kind: "propagation-local-ingress/plan-gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true,
      },
    );
    expect(shouldPlanLxmfPropagationLocalIngressDeliver(deliver.actions)).toBe(
      true,
    );
    expect(lxmfPropagationLocalIngressPlanFromActions(deliver.actions)).toBe(
      "deliver",
    );

    const prefix = stepLxmfPropagationLocalIngressPlanWithActions(
      initialLxmfPropagationLocalIngressPlanState(),
      {
        kind: "propagation-local-ingress/plan-gate",
        prefixedPresent: false,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true,
      },
    );
    expect(
      shouldRejectLxmfPropagationLocalIngressPlanPrefix(prefix.actions),
    ).toBe(true);
    expect(lxmfPropagationLocalIngressPlanFromActions(prefix.actions)).toBe(
      "reject-prefix",
    );

    const destination = stepLxmfPropagationLocalIngressPlanWithActions(
      initialLxmfPropagationLocalIngressPlanState(),
      {
        kind: "propagation-local-ingress/plan-gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
        decryptedPresent: true,
      },
    );
    expect(
      shouldRejectLxmfPropagationLocalIngressPlanDestination(
        destination.actions,
      ),
    ).toBe(true);
    expect(
      lxmfPropagationLocalIngressPlanFromActions(destination.actions),
    ).toBe("reject-destination");

    const decrypt = stepLxmfPropagationLocalIngressPlanWithActions(
      initialLxmfPropagationLocalIngressPlanState(),
      {
        kind: "propagation-local-ingress/plan-gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationLocalIngressPlanDecrypt(decrypt.actions),
    ).toBe(true);
    expect(lxmfPropagationLocalIngressPlanFromActions(decrypt.actions)).toBe(
      "reject-decrypt",
    );

    expect(
      stepLxmfPropagationLocalIngressPlanWithActions(
        initialLxmfPropagationLocalIngressPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("emits propagation local-ingress gate actions from stepLxmfPropagationLocalIngressWithActions", () => {
    const deliver = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true,
      },
    );
    expect(shouldDeliverLxmfPropagationLocalIngress(deliver.actions)).toBe(
      true,
    );
    expect(shouldRejectLxmfPropagationLocalPrefix(deliver.actions)).toBe(false);

    const prefix = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: false,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: true,
      },
    );
    expect(shouldRejectLxmfPropagationLocalPrefix(prefix.actions)).toBe(true);

    const destination = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: false,
        decryptedPresent: true,
      },
    );
    expect(
      shouldRejectLxmfPropagationLocalDestination(destination.actions),
    ).toBe(true);

    const decrypt = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: true,
        deliveryDestinationPresent: true,
        destinationHashMatches: true,
        decryptedPresent: false,
      },
    );
    expect(shouldRejectLxmfPropagationLocalDecrypt(decrypt.actions)).toBe(true);

    expect(
      stepLxmfPropagationLocalIngressWithActions(
        initialLxmfPropagationLocalIngressState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("is deterministic for propagation-local-ingress/gate events", () => {
    const state = initialLxmfPropagationLocalIngressState();
    const event = {
      kind: "propagation-local-ingress/gate" as const,
      prefixedPresent: true,
      deliveryDestinationPresent: true,
      destinationHashMatches: true,
      decryptedPresent: true,
    };
    const a = stepLxmfPropagationLocalIngressWithActions(state, event);
    const b = stepLxmfPropagationLocalIngressWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("plans propagation link readiness", () => {
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: true,
        nodeConfigured: true,
        nodeIdentityPresent: true,
      }),
    ).toBe("reuse");
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: false,
        nodeConfigured: false,
        nodeIdentityPresent: false,
      }),
    ).toBe("missing-node");
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: false,
      }),
    ).toBe("missing-identity");
    expect(
      planLxmfPropagationLinkReady({
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: true,
      }),
    ).toBe("establish");
  });

  it("emits propagation link-ready-plan actions only from propagation-link/plan-gate", () => {
    const reuse = stepLxmfPropagationLinkReadyPlanWithActions(
      initialLxmfPropagationLinkReadyPlanState(),
      {
        kind: "propagation-link/plan-gate",
        canReuseLink: true,
        nodeConfigured: true,
        nodeIdentityPresent: true,
      },
    );
    expect(shouldPlanLxmfPropagationLinkReadyReuse(reuse.actions)).toBe(true);
    expect(lxmfPropagationLinkReadyPlanFromActions(reuse.actions)).toBe(
      "reuse",
    );

    const missingNode = stepLxmfPropagationLinkReadyPlanWithActions(
      initialLxmfPropagationLinkReadyPlanState(),
      {
        kind: "propagation-link/plan-gate",
        canReuseLink: false,
        nodeConfigured: false,
        nodeIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationLinkReadyPlanMissingNode(missingNode.actions),
    ).toBe(true);
    expect(lxmfPropagationLinkReadyPlanFromActions(missingNode.actions)).toBe(
      "missing-node",
    );

    const missingIdentity = stepLxmfPropagationLinkReadyPlanWithActions(
      initialLxmfPropagationLinkReadyPlanState(),
      {
        kind: "propagation-link/plan-gate",
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationLinkReadyPlanMissingIdentity(
        missingIdentity.actions,
      ),
    ).toBe(true);
    expect(
      lxmfPropagationLinkReadyPlanFromActions(missingIdentity.actions),
    ).toBe("missing-identity");

    const establish = stepLxmfPropagationLinkReadyPlanWithActions(
      initialLxmfPropagationLinkReadyPlanState(),
      {
        kind: "propagation-link/plan-gate",
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: true,
      },
    );
    expect(shouldPlanLxmfPropagationLinkReadyEstablish(establish.actions)).toBe(
      true,
    );
    expect(lxmfPropagationLinkReadyPlanFromActions(establish.actions)).toBe(
      "establish",
    );

    expect(
      stepLxmfPropagationLinkReadyPlanWithActions(
        initialLxmfPropagationLinkReadyPlanState(),
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
  it("emits propagation link-ready gate actions from stepLxmfPropagationLinkReadyWithActions", () => {
    const reuse = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: true,
        nodeConfigured: true,
        nodeIdentityPresent: true,
      },
    );
    expect(shouldReuseLxmfPropagationLink(reuse.actions)).toBe(true);
    expect(shouldEstablishLxmfPropagationLink(reuse.actions)).toBe(false);

    const missingNode = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: false,
        nodeIdentityPresent: false,
      },
    );
    expect(shouldRejectLxmfPropagationMissingNode(missingNode.actions)).toBe(
      true,
    );

    const missingIdentity = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: false,
      },
    );
    expect(
      shouldRejectLxmfPropagationMissingIdentity(missingIdentity.actions),
    ).toBe(true);

    const establish = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: false,
        nodeConfigured: true,
        nodeIdentityPresent: true,
      },
    );
    expect(shouldEstablishLxmfPropagationLink(establish.actions)).toBe(true);
    expect(shouldReuseLxmfPropagationLink(establish.actions)).toBe(false);

    expect(
      stepLxmfPropagationLinkReadyWithActions(
        initialLxmfPropagationLinkReadyState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("is deterministic for propagation-link/gate events", () => {
    const state = initialLxmfPropagationLinkReadyState();
    const event = {
      kind: "propagation-link/gate" as const,
      canReuseLink: false,
      nodeConfigured: true,
      nodeIdentityPresent: true,
    };
    const a = stepLxmfPropagationLinkReadyWithActions(state, event);
    const b = stepLxmfPropagationLinkReadyWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });

  it("plans pack timestamp and stamp inclusion", () => {
    expect(planLxmfPackTimestamp({ hasTimestamp: true, hasNow: false })).toBe(
      "use-timestamp",
    );
    expect(planLxmfPackTimestamp({ hasTimestamp: false, hasNow: true })).toBe(
      "use-now",
    );
    expect(planLxmfPackTimestamp({ hasTimestamp: false, hasNow: false })).toBe(
      "reject",
    );
    expect(shouldIncludeLxmfStamp(undefined)).toBe(true);
    expect(shouldIncludeLxmfStamp(false)).toBe(true);
    expect(shouldIncludeLxmfStamp(true)).toBe(false);
    expect(shouldRememberLxmfMessage(true)).toBe(true);
    expect(shouldRememberLxmfMessage(false)).toBe(false);
    expect(
      shouldIncludeLxmfStampNow(
        stepIncludeLxmfStampWithActions(initialIncludeLxmfStampState(), {
          kind: "lxmf/include-stamp-gate",
          deferStamp: undefined,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipIncludeLxmfStamp(
        stepIncludeLxmfStampWithActions(initialIncludeLxmfStampState(), {
          kind: "lxmf/include-stamp-gate",
          deferStamp: true,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldRememberLxmfMessageNow(
        stepRememberLxmfMessageWithActions(initialRememberLxmfMessageState(), {
          kind: "lxmf/remember-message-gate",
          hasHash: true,
        }).actions,
      ),
    ).toBe(true);
    expect(
      shouldSkipRememberLxmfMessage(
        stepRememberLxmfMessageWithActions(initialRememberLxmfMessageState(), {
          kind: "lxmf/remember-message-gate",
          hasHash: false,
        }).actions,
      ),
    ).toBe(true);
  });
});

describe("protocol lxmf delivery (continued)", () => {
  it("emits pack-timestamp-plan actions only from pack-timestamp/plan-gate", () => {
    const useTimestamp = stepLxmfPackTimestampPlanWithActions(
      initialLxmfPackTimestampPlanState(),
      {
        kind: "pack-timestamp/plan-gate",
        hasTimestamp: true,
        hasNow: false,
      },
    );
    expect(shouldPlanLxmfPackTimestampUseTimestamp(useTimestamp.actions)).toBe(
      true,
    );
    expect(lxmfPackTimestampPlanFromActions(useTimestamp.actions)).toBe(
      "use-timestamp",
    );

    const useNow = stepLxmfPackTimestampPlanWithActions(
      initialLxmfPackTimestampPlanState(),
      {
        kind: "pack-timestamp/plan-gate",
        hasTimestamp: false,
        hasNow: true,
      },
    );
    expect(shouldPlanLxmfPackTimestampUseNow(useNow.actions)).toBe(true);
    expect(lxmfPackTimestampPlanFromActions(useNow.actions)).toBe("use-now");

    const reject = stepLxmfPackTimestampPlanWithActions(
      initialLxmfPackTimestampPlanState(),
      {
        kind: "pack-timestamp/plan-gate",
        hasTimestamp: false,
        hasNow: false,
      },
    );
    expect(shouldRejectLxmfPackTimestampPlan(reject.actions)).toBe(true);
    expect(lxmfPackTimestampPlanFromActions(reject.actions)).toBe("reject");

    expect(
      stepLxmfPackTimestampPlanWithActions(
        initialLxmfPackTimestampPlanState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
  });

  it("emits pack timestamp actions from stepLxmfPackTimestampWithActions", () => {
    const useTimestamp = stepLxmfPackTimestampWithActions(
      initialLxmfPackTimestampState(),
      {
        kind: "pack-timestamp/select",
        hasTimestamp: true,
        hasNow: false,
      },
    );
    expect(useTimestamp.actions).toEqual([{ kind: "use-timestamp" }]);
    expect(shouldUseLxmfPackTimestamp(useTimestamp.actions)).toBe(true);

    const useNow = stepLxmfPackTimestampWithActions(
      initialLxmfPackTimestampState(),
      {
        kind: "pack-timestamp/select",
        hasTimestamp: false,
        hasNow: true,
      },
    );
    expect(useNow.actions).toEqual([{ kind: "use-now" }]);
    expect(shouldUseLxmfPackNow(useNow.actions)).toBe(true);

    const reject = stepLxmfPackTimestampWithActions(
      initialLxmfPackTimestampState(),
      {
        kind: "pack-timestamp/select",
        hasTimestamp: false,
        hasNow: false,
      },
    );
    expect(reject.actions).toEqual([{ kind: "reject" }]);
    expect(shouldRejectLxmfPackTimestampSelect(reject.actions)).toBe(true);
  });

  it("is deterministic for pack timestamp select events", () => {
    const state = initialLxmfPackTimestampState();
    const event = {
      kind: "pack-timestamp/select" as const,
      hasTimestamp: true,
      hasNow: false,
    };
    const a = stepLxmfPackTimestampWithActions(state, event);
    const b = stepLxmfPackTimestampWithActions(state, event);
    expect(a).toEqual(b);
    expect(JSON.stringify(a.actions)).toBe(JSON.stringify(b.actions));
  });
});
