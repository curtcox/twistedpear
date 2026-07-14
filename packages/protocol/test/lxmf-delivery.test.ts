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
  initialLxmfDeliveryState,
  lxmfDeliveryDeliverParams,
  lxmfDeliveryOpportunisticRejectSizes,
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
  shouldCommitRememberedLxmfHash,
  shouldDeliverLxmf,
  shouldDeliverLxmfPropagationLocalIngress,
  shouldIncludeLxmfStamp,
  shouldProceedLxmfDirectSend,
  shouldProceedLxmfOpportunisticSend,
  shouldProceedLxmfPropagatedSend,
  shouldRejectLxmfDirectMissingDestination,
  shouldRejectLxmfDirectMissingPacked,
  shouldRejectLxmfOpportunisticMissingDestination,
  shouldRejectLxmfOpportunisticTooLarge,
  shouldRejectLxmfPackEndpoints,
  shouldRejectLxmfPackTimestamp,
  shouldRejectLxmfPropagatedMissingNode,
  shouldRejectLxmfPropagatedMissingPacked,
  shouldRejectLxmfPropagatedResourceUnimplemented,
  shouldRejectLxmfSendUnpacked,
  shouldRejectLxmfSendUnsupported,
  shouldRejectLxmfUnsupportedMethod,
  shouldRememberLxmfMessage,
  shouldSendLxmfDirect,
  shouldSendLxmfOpportunistic,
  shouldSendLxmfPropagated,
  canRegisterLxmfDeliveryIdentity,
  canExtractLxmfOpportunisticPayload,
  shouldSelectLxmfDeliveryParameters,
  planLxmfPropagationSyncPrep,
  shouldAwaitLxmfDeliveryReceipt,
  shouldInvokeLxmfDeliveryCallback,
  shouldTeardownLxmfPropagationLink,
  initialLxmfDirectSendState,
  initialLxmfOpportunisticSendState,
  initialLxmfPropagatedSendState,
  initialLxmfSendMethodState,
  lxmfSendUnsupportedMethod,
  stepLxmfDeliveryWithActions,
  stepLxmfDirectSendWithActions,
  stepLxmfOpportunisticSendWithActions,
  stepLxmfPropagatedSendWithActions,
  stepLxmfSendMethodWithActions
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
      shouldDeliverLxmfPropagationLocalIngress({
        planDeliver: true,
        prefixedPresent: true,
        decryptedPresent: true
      })
    ).toBe(true);
    expect(
      shouldDeliverLxmfPropagationLocalIngress({
        planDeliver: true,
        prefixedPresent: true,
        decryptedPresent: false
      })
    ).toBe(false);
    expect(
      shouldDeliverLxmfPropagationLocalIngress({
        planDeliver: false,
        prefixedPresent: true,
        decryptedPresent: true
      })
    ).toBe(false);
    expect(shouldAcceptLxmfWireFrame(true)).toBe(true);
    expect(shouldAcceptLxmfWireFrame(false)).toBe(false);
    expect(shouldCommitRememberedLxmfHash(true)).toBe(true);
    expect(shouldCommitRememberedLxmfHash(false)).toBe(false);
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

  it("plans pack timestamp and stamp inclusion", () => {
    expect(planLxmfPackTimestamp({ hasTimestamp: true, hasNow: false })).toBe("use-timestamp");
    expect(planLxmfPackTimestamp({ hasTimestamp: false, hasNow: true })).toBe("use-now");
    expect(planLxmfPackTimestamp({ hasTimestamp: false, hasNow: false })).toBe("reject");
    expect(shouldIncludeLxmfStamp(undefined)).toBe(true);
    expect(shouldIncludeLxmfStamp(false)).toBe(true);
    expect(shouldIncludeLxmfStamp(true)).toBe(false);
    expect(shouldRememberLxmfMessage(true)).toBe(true);
    expect(shouldRememberLxmfMessage(false)).toBe(false);
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
});
