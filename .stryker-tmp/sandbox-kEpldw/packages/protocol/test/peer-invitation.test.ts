// @ts-nocheck
import { describe, expect, it } from "vitest";
import { decodePeerInvitation, decodePeerInvitationText, encodePeerInvitation, encodePeerInvitationText, initialPeerPairingState, peerInvitationSigningBytes, stepPeerPairing, type PeerInvitation } from "../src/index.js";

function invitation(overrides: Partial<PeerInvitation> = {}): PeerInvitation {
  return { version: 1, sessionId: new Uint8Array(16).fill(1), service: "chat", role: "offer", peerEphemeralKey: new Uint8Array(32).fill(2), candidates: [{ kind: "reticulum", value: new Uint8Array([3, 4]) }], display: "Nearby peer", issuedAt: 1_000, expiresAt: 61_000, capabilities: ["reticulum"], signature: new Uint8Array(64).fill(5), ...overrides };
}

describe("peer invitation", () => {
  it("has stable canonical CBOR and checksummed text round trips", () => {
    const value = invitation(); const encoded = encodePeerInvitation(value);
    expect(Buffer.from(encoded).toString("hex")).toBe("ab6176016365787019ee48636961741903e8636b657958200202020202020202020202020202020202020202020202020202020202020202637369645001010101010101010101010101010101637369675840050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505050505056373766364636861746463616e648182697265746963756c756d420304646361707381697265746963756c756d64726f6c65656f6666657267646973706c61796b4e65617262792070656572");
    expect(encodePeerInvitation(decodePeerInvitation(encoded, 2_000))).toEqual(encoded);
    expect(decodePeerInvitationText(encodePeerInvitationText(encoded))).toEqual(encoded);
    expect(peerInvitationSigningBytes(value)).not.toEqual(encoded);
  });
  it("rejects expiry, checksum corruption, and oversized candidate lists", () => {
    expect(() => decodePeerInvitation(encodePeerInvitation(invitation()), 61_000)).toThrow(/expired/);
    const text = encodePeerInvitationText(encodePeerInvitation(invitation()));
    expect(() => decodePeerInvitationText(`${text.slice(0, -1)}A`)).toThrow(/checksum/);
    expect(() => encodePeerInvitation(invitation({ candidates: Array.from({ length: 9 }, () => ({ kind: "gateway", value: new Uint8Array([1]) })) }))).toThrow(/candidates/);
  });
  it("encodes answer envelopes through the same canonical contract", () => {
    expect(decodePeerInvitation(encodePeerInvitation(invitation({ role: "answer" })), 2_000).role).toBe("answer");
  });
});

describe("peer pairing machine", () => {
  it("connects a matching session and rejects replay", () => {
    let state = stepPeerPairing(initialPeerPairingState(), { kind: "accept", sessionId: "s", service: "chat", expiresAt: 10, replayed: false });
    state = stepPeerPairing(state, { kind: "confirm", sessionId: "s" });
    expect(state.phase).toBe("connected");
    expect(stepPeerPairing(initialPeerPairingState(), { kind: "accept", sessionId: "s", service: "chat", expiresAt: 10, replayed: true }).phase).toBe("rejected");
  });
  it("expires, cancels, and rejects session confusion deterministically", () => {
    const offered = stepPeerPairing(initialPeerPairingState(), { kind: "offer", sessionId: "a", service: "chat", expiresAt: 10 });
    expect(stepPeerPairing(offered, { kind: "time", now: 10 }).phase).toBe("expired");
    expect(stepPeerPairing(offered, { kind: "cancel" }).phase).toBe("cancelled");
    expect(stepPeerPairing(offered, { kind: "answer", sessionId: "b" }).phase).toBe("rejected");
  });
});
