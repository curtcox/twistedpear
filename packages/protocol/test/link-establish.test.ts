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
import {
  applyLinkEstablishEvent,
  canAcceptLinkRequestOwner,
  canIdentifyOnLink,
  canLinkRequest,
  canLinkSend,
  canPerformLinkHandshake,
  canProveLink,
  canSendLinkAppResponse,
  canValidateLinkProof,
  computeLinkRttSeconds,
  initialLinkEstablishState,
  isLinkClosed,
  mergeLinkRtt,
  planLinkAppRequest,
  planLinkValidateRequest,
  shouldAcceptLinkPacketInterface,
  shouldEncryptLinkPayload,
  shouldReuseActiveLink
} from "../src/link-establish.js";
import { planLinkInitiatorMtu } from "../src/link-metrics.js";
import { LinkStatus } from "../src/link-watchdog.js";

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
    expect(
      canValidateLinkProof({
        status: LinkStatus.PENDING,
        initiator: true,
        destinationPresent: false
      })
    ).toBe(false);
    expect(canIdentifyOnLink({ status: LinkStatus.ACTIVE, initiator: true })).toBe(true);
    expect(canIdentifyOnLink({ status: LinkStatus.ACTIVE, initiator: false })).toBe(false);
  });

  it("gates handshake / prove / request-owner material", () => {
    expect(
      canPerformLinkHandshake({
        status: LinkStatus.PENDING,
        privateKeyPresent: true,
        peerPublicKeyPresent: true
      })
    ).toBe(true);
    expect(
      canPerformLinkHandshake({
        status: LinkStatus.HANDSHAKE,
        privateKeyPresent: true,
        peerPublicKeyPresent: true
      })
    ).toBe(false);
    expect(
      canPerformLinkHandshake({
        status: LinkStatus.PENDING,
        privateKeyPresent: false,
        peerPublicKeyPresent: true
      })
    ).toBe(false);
    expect(
      canProveLink({
        ownerPresent: true,
        publicKeyPresent: true,
        ownerIdentityPresent: true
      })
    ).toBe(true);
    expect(
      canProveLink({
        ownerPresent: true,
        publicKeyPresent: true,
        ownerIdentityPresent: false
      })
    ).toBe(false);
    expect(canAcceptLinkRequestOwner(true)).toBe(true);
    expect(canAcceptLinkRequestOwner(false)).toBe(false);
  });

  it("gates application requests on ACTIVE with RTT", () => {
    expect(canLinkRequest({ status: LinkStatus.ACTIVE, rtt: 0.1 })).toBe(true);
    expect(canLinkRequest({ status: LinkStatus.ACTIVE, rtt: null })).toBe(false);
    expect(canLinkRequest({ status: LinkStatus.PENDING, rtt: 0.1 })).toBe(false);
    expect(
      planLinkAppRequest({
        status: LinkStatus.ACTIVE,
        rtt: 0.1,
        packedLength: 10,
        mdu: 100
      })
    ).toBe("send");
    expect(
      planLinkAppRequest({
        status: LinkStatus.ACTIVE,
        rtt: null,
        packedLength: 10,
        mdu: 100
      })
    ).toBe("reject");
    expect(
      planLinkAppRequest({
        status: LinkStatus.ACTIVE,
        rtt: 0.1,
        packedLength: 200,
        mdu: 100
      })
    ).toBe("reject");
    expect(canSendLinkAppResponse({ packedLength: 10, mdu: 100 })).toBe(true);
    expect(canSendLinkAppResponse({ packedLength: 200, mdu: 100 })).toBe(false);
  });

  it("gates sends on ACTIVE only", () => {
    expect(canLinkSend(LinkStatus.ACTIVE)).toBe(true);
    expect(canLinkSend(LinkStatus.PENDING)).toBe(false);
    expect(canLinkSend(LinkStatus.HANDSHAKE)).toBe(false);
    expect(canLinkSend(LinkStatus.CLOSED)).toBe(false);
  });

  it("reuses present ACTIVE links", () => {
    expect(shouldReuseActiveLink({ linkPresent: true, status: LinkStatus.ACTIVE })).toBe(true);
    expect(shouldReuseActiveLink({ linkPresent: false, status: LinkStatus.ACTIVE })).toBe(false);
    expect(shouldReuseActiveLink({ linkPresent: true, status: LinkStatus.PENDING })).toBe(false);
  });

  it("plans link validate-request gates", () => {
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityPresent: true,
        modeEnabled: true
      })
    ).toBe("ok");
    expect(
      planLinkValidateRequest({
        requestPresent: false,
        ownerIdentityPresent: true,
        modeEnabled: true
      })
    ).toBe("bad-request");
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityPresent: false,
        modeEnabled: true
      })
    ).toBe("owner-missing-identity");
    expect(
      planLinkValidateRequest({
        requestPresent: true,
        ownerIdentityPresent: true,
        modeEnabled: false
      })
    ).toBe("mode-disabled");
  });

  it("plans initiator MTU from discovery and next-hop", () => {
    expect(
      planLinkInitiatorMtu({
        discoveryEnabled: true,
        nextHopMtu: 420,
        defaultMtu: 500
      })
    ).toBe(420);
    expect(
      planLinkInitiatorMtu({
        discoveryEnabled: true,
        nextHopMtu: null,
        defaultMtu: 500
      })
    ).toBe(500);
    expect(
      planLinkInitiatorMtu({
        discoveryEnabled: false,
        nextHopMtu: 420,
        defaultMtu: 500
      })
    ).toBe(500);
  });

  it("accepts link packets from matching or unbound interfaces", () => {
    expect(
      shouldAcceptLinkPacketInterface({ hasAttachedInterface: false, sameInterface: false })
    ).toBe(true);
    expect(
      shouldAcceptLinkPacketInterface({ hasAttachedInterface: true, sameInterface: true })
    ).toBe(true);
    expect(
      shouldAcceptLinkPacketInterface({ hasAttachedInterface: true, sameInterface: false })
    ).toBe(false);
  });

  it("encrypts link payloads unless encrypt option is false", () => {
    expect(shouldEncryptLinkPayload(undefined)).toBe(true);
    expect(shouldEncryptLinkPayload(true)).toBe(true);
    expect(shouldEncryptLinkPayload(false)).toBe(false);
  });

  it("detects CLOSED status", () => {
    expect(isLinkClosed(LinkStatus.CLOSED)).toBe(true);
    expect(isLinkClosed(LinkStatus.ACTIVE)).toBe(false);
    expect(isLinkClosed(LinkStatus.PENDING)).toBe(false);
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
