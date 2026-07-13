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
  planLxMessagePack,
  planLxmfDeliverableAccept,
  planLxmfPropagatedSend
} from "../src/lxmf-delivery.js";

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
});
