import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_MTU_SIZE,
  classifyLinkProofPayload,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  modeFromLinkProofData,
  mtuFromLinkProofData,
  splitLinkProofBody,
} from "../src/link-proof.js";

describe("protocol link proof framing", () => {
  it("classifies proof payload sizes", () => {
    expect(classifyLinkProofPayload(LINK_PROOF_BODY_SIZE)).toBe("body-only");
    expect(
      classifyLinkProofPayload(LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE),
    ).toBe("body-with-mtu");
    expect(classifyLinkProofPayload(10)).toBe("invalid");
  });

  it("round-trips signalling / mtu helpers", () => {
    const signalling = encodeLinkSignallingBytes(500, 0x01);
    expect(signalling).toHaveLength(3);
    const data = new Uint8Array(LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE);
    data.set(signalling, LINK_PROOF_BODY_SIZE);
    expect(modeFromLinkProofData(data, 0)).toBe(0x01);
    expect(mtuFromLinkProofData(data)).toBe(
      ((signalling[0]! << 16) | (signalling[1]! << 8) | signalling[2]!) &
        0x1fffff,
    );
    expect([...encodeLinkMtuBytes(0x123456)]).toEqual([0x12, 0x34, 0x56]);
  });

  it("splits proof body", () => {
    const body = new Uint8Array(LINK_PROOF_BODY_SIZE).map((_, i) => i);
    const split = splitLinkProofBody(body);
    expect(split).not.toBeNull();
    expect(split!.signature).toHaveLength(64);
    expect(split!.peerPublicKey).toHaveLength(32);
  });
});
