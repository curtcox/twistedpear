import { describe, expect, it } from "vitest";
import {
  LxmfDeliveryMethod,
  LxmfDeliveryRepresentation,
  lxmfContentSizeFromPackedLength,
  planLxmfDelivery
} from "../src/lxmf-delivery.js";

describe("protocol lxmf delivery", () => {
  it("computes content size from packed length", () => {
    // 2*16 + 64 + 8 + 8 + 10 content = 122
    expect(lxmfContentSizeFromPackedLength(122)).toBe(10);
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
});
