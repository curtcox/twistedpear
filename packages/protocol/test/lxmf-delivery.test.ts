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
  shouldIncludeLxmfStamp,
  shouldRememberLxmfMessage,
  canRegisterLxmfDeliveryIdentity,
  shouldTeardownLxmfPropagationLink
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
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.PACKET
      })
    ).toBe("ok");
    expect(
      planLxmfPropagatedSend({
        hasPropagationPacked: false,
        representation: LxmfDeliveryRepresentation.PACKET
      })
    ).toBe("missing-packed");
    expect(
      planLxmfPropagatedSend({
        hasPropagationPacked: true,
        representation: LxmfDeliveryRepresentation.RESOURCE
      })
    ).toBe("resource-unimplemented");
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
  });
});
