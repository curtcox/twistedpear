import { describe, expect, it } from "vitest";
import {
  LINK_IDENTIFY_PAYLOAD_SIZE,
  canAcceptLinkIdentify,
  linkIdentifySignedMaterial,
  packLinkIdentifyPayload,
  planLinkIdentifyOutcome,
  splitLinkIdentifyPayload
} from "../src/link-identify.js";
import { computeLinkMdu, linkHopsMatch, linkPayloadFitsMdu } from "../src/link-metrics.js";
import { PATHFINDER_MAX_HOPS } from "../src/path-table.js";

describe("protocol link identify", () => {
  it("accepts identify only on responder links", () => {
    expect(canAcceptLinkIdentify(false)).toBe(true);
    expect(canAcceptLinkIdentify(true)).toBe(false);
  });

  it("plans identify outcome from crypto edge flags", () => {
    expect(
      planLinkIdentifyOutcome({
        canAccept: true,
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: true
      })
    ).toBe("accept");
    expect(
      planLinkIdentifyOutcome({
        canAccept: false,
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: true
      })
    ).toBe("reject");
    expect(
      planLinkIdentifyOutcome({
        canAccept: true,
        plaintextPresent: true,
        partsPresent: true,
        identityPresent: true,
        signatureValid: false
      })
    ).toBe("reject");
  });

  it("splits and packs identify payloads", () => {
    const publicKey = new Uint8Array(64).map((_, i) => i);
    const signature = new Uint8Array(64).map((_, i) => 200 - i);
    const packed = packLinkIdentifyPayload(publicKey, signature);
    expect(packed).toHaveLength(LINK_IDENTIFY_PAYLOAD_SIZE);
    const split = splitLinkIdentifyPayload(packed);
    expect(split).not.toBeNull();
    expect([...split!.publicKey]).toEqual([...publicKey]);
    expect([...split!.signature]).toEqual([...signature]);
    expect(splitLinkIdentifyPayload(new Uint8Array(10))).toBeNull();
  });

  it("builds signed material as linkId || publicKey", () => {
    const linkId = Uint8Array.from([1, 2, 3]);
    const publicKey = Uint8Array.from([4, 5]);
    expect([...linkIdentifySignedMaterial(linkId, publicKey)]).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("protocol link metrics", () => {
  it("computes MDU from MTU", () => {
    expect(computeLinkMdu(500)).toBe(
      Math.floor((500 - 18 - 48) / 16) * 16 - 1
    );
  });

  it("matches hops with pathfinder wildcard", () => {
    expect(
      linkHopsMatch({ expectedHops: null, packetHops: 3, pathfinderMaxHops: PATHFINDER_MAX_HOPS })
    ).toBe(true);
    expect(
      linkHopsMatch({ expectedHops: 2, packetHops: 2, pathfinderMaxHops: PATHFINDER_MAX_HOPS })
    ).toBe(true);
    expect(
      linkHopsMatch({ expectedHops: 2, packetHops: 3, pathfinderMaxHops: PATHFINDER_MAX_HOPS })
    ).toBe(false);
    expect(
      linkHopsMatch({
        expectedHops: PATHFINDER_MAX_HOPS,
        packetHops: 9,
        pathfinderMaxHops: PATHFINDER_MAX_HOPS
      })
    ).toBe(true);
  });

  it("gates packed payload size against MDU", () => {
    expect(linkPayloadFitsMdu(100, 100)).toBe(true);
    expect(linkPayloadFitsMdu(101, 100)).toBe(false);
  });
});
