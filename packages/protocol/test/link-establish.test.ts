import { describe, expect, it } from "vitest";
import {
  LINK_PROOF_BODY_SIZE,
  LINK_PROOF_MTU_SIZE,
  classifyLinkProofPayload,
  encodeLinkMtuBytes,
  encodeLinkSignallingBytes,
  modeFromLinkProofData,
  mtuFromLinkProofData,
  splitLinkProofBody
} from "../src/link-proof.js";
import { LinkStatus } from "../src/link-watchdog.js";
import {
  applyLinkEstablishEvent,
  canIdentifyOnLink,
  canLinkRequest,
  canLinkSend,
  canValidateLinkProof,
  computeLinkRttSeconds,
  initialLinkEstablishState,
  mergeLinkRtt
} from "../src/link-establish.js";

describe("protocol link proof framing", () => {
  it("classifies proof payload sizes", () => {
    expect(classifyLinkProofPayload(LINK_PROOF_BODY_SIZE)).toBe("body-only");
    expect(classifyLinkProofPayload(LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE)).toBe(
      "body-with-mtu"
    );
    expect(classifyLinkProofPayload(10)).toBe("invalid");
  });

  it("round-trips signalling / mtu helpers", () => {
    const signalling = encodeLinkSignallingBytes(500, 0x01);
    expect(signalling).toHaveLength(3);
    const data = new Uint8Array(LINK_PROOF_BODY_SIZE + LINK_PROOF_MTU_SIZE);
    data.set(signalling, LINK_PROOF_BODY_SIZE);
    expect(modeFromLinkProofData(data, 0)).toBe(0x01);
    expect(mtuFromLinkProofData(data)).toBe(
      ((signalling[0]! << 16) | (signalling[1]! << 8) | signalling[2]!) & 0x1fffff
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

describe("protocol link establish", () => {
  it("gates proof validation and identify", () => {
    expect(canValidateLinkProof({ status: LinkStatus.PENDING, initiator: true })).toBe(true);
    expect(canValidateLinkProof({ status: LinkStatus.PENDING, initiator: false })).toBe(false);
    expect(canIdentifyOnLink({ status: LinkStatus.ACTIVE, initiator: true })).toBe(true);
    expect(canIdentifyOnLink({ status: LinkStatus.ACTIVE, initiator: false })).toBe(false);
  });

  it("gates application requests on ACTIVE with RTT", () => {
    expect(canLinkRequest({ status: LinkStatus.ACTIVE, rtt: 0.1 })).toBe(true);
    expect(canLinkRequest({ status: LinkStatus.ACTIVE, rtt: null })).toBe(false);
    expect(canLinkRequest({ status: LinkStatus.PENDING, rtt: 0.1 })).toBe(false);
  });

  it("gates sends on ACTIVE only", () => {
    expect(canLinkSend(LinkStatus.ACTIVE)).toBe(true);
    expect(canLinkSend(LinkStatus.PENDING)).toBe(false);
    expect(canLinkSend(LinkStatus.HANDSHAKE)).toBe(false);
    expect(canLinkSend(LinkStatus.CLOSED)).toBe(false);
  });

  it("transitions handshake → active and merges RTT", () => {
    let state = initialLinkEstablishState({ initiator: true });
    state = applyLinkEstablishEvent(state, { kind: "establish/handshake" });
    expect(state.status).toBe(LinkStatus.HANDSHAKE);

    const rtt = computeLinkRttSeconds(10.5, 10);
    state = applyLinkEstablishEvent(state, {
      kind: "establish/activated",
      atSeconds: 10.5,
      rtt
    });
    expect(state.status).toBe(LinkStatus.ACTIVE);
    expect(state.rtt).toBe(0.5);
    expect(state.activatedAt).toBe(10.5);
    expect(mergeLinkRtt(0.4, 0.7)).toBe(0.7);
  });

  it("fails closed", () => {
    const state = applyLinkEstablishEvent(
      initialLinkEstablishState({ initiator: true }),
      { kind: "establish/failed" }
    );
    expect(state.status).toBe(LinkStatus.CLOSED);
  });
});
