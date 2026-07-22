import { describe, expect, it } from "vitest";
import { WebRtcRouteController } from "../src/index.js";
import type { PeerInvitation } from "@twistedpear/protocol";

class FakeChannel {
  readyState = "open"; sent: unknown[] = []; send(value: unknown) { this.sent.push(value); } close() { this.readyState = "closed"; }
}
class FakePeerConnection {
  iceGatheringState = "complete"; connectionState = "connected"; localDescription: RTCSessionDescriptionInit | null = null; channel = new FakeChannel();
  createDataChannel() { return this.channel as unknown as RTCDataChannel; }
  async createOffer() { return { type: "offer" as const, sdp: "offer-sdp" }; }
  async createAnswer() { return { type: "answer" as const, sdp: "answer-sdp" }; }
  async setLocalDescription(value: RTCSessionDescriptionInit) { this.localDescription = value; }
  async setRemoteDescription(_value: RTCSessionDescriptionInit) {}
  addEventListener() {} removeEventListener() {} close() { this.connectionState = "closed"; }
}
const sessionId = new Uint8Array(16).fill(7);
const invitation = (candidate: Uint8Array): PeerInvitation => ({ version: 1, sessionId, service: "app", role: "answer", peerEphemeralKey: new Uint8Array(32), identityProof: new Uint8Array(64), candidates: [{ kind: "webrtc", value: candidate }], display: "peer", issuedAt: 1, expiresAt: 2, capabilities: ["webrtc"], signature: new Uint8Array(64) });

describe("host-owned WebRTC route", () => {
  it("keeps SDP and the data channel behind an authenticated route", async () => {
    const fake = new FakePeerConnection(); const controller = new WebRtcRouteController({ createPeerConnection: () => fake as unknown as RTCPeerConnection, openTimeoutMs: 100 });
    const candidates = await controller.candidates({ service: "app", purpose: "test", mechanisms: ["manual"], timeoutMs: 1_000 }, { role: "offer", sessionId });
    expect(new TextDecoder().decode(candidates[0]?.value)).toContain("offer-sdp");
    const answer = new TextEncoder().encode(JSON.stringify({ type: "answer", sdp: "answer-sdp" }));
    const established = await controller.establish({ sharedSecret: new Uint8Array(32), remoteInvitation: invitation(answer), localCandidates: candidates }, { fingerprint: "peer-fp", displayLabel: "Peer", matchingWords: ["one", "two", "three"], dataPlane: "webrtc" }, { kind: "manual" } as never);
    expect(established).toMatchObject({ authenticated: true, confirmed: true, dataPlane: "webrtc" });
    const route = controller.route("peer-fp"); route?.send(new Uint8Array([1, 2, 3])); expect(fake.channel.sent).toHaveLength(1); await established.close?.(); expect(controller.route("peer-fp")).toBeUndefined();
  });
});
