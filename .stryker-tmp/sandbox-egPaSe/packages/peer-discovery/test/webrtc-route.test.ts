// @ts-nocheck
import { describe, expect, it } from "vitest";
import { WebRtcRouteController } from "../src/index.js";
import type { PeerInvitation } from "@twistedpear/protocol";

class FakeChannel {
  readyState = "open";
  sent: unknown[] = [];
  send(value: unknown) {
    this.sent.push(value);
  }
  close() {
    this.readyState = "closed";
  }
}

class FakePeerConnection {
  iceGatheringState = "complete";
  connectionState = "connected";
  localDescription: RTCSessionDescriptionInit | null = null;
  channel = new FakeChannel();
  transceivers: Array<{ kind: string; direction: string }> = [];
  attached: MediaStreamTrack[] = [];
  private readonly trackListeners = new Set<(event: { track: MediaStreamTrack; streams: MediaStream[] }) => void>();

  createDataChannel() {
    return this.channel as unknown as RTCDataChannel;
  }
  addTransceiver(kind: string, init?: { direction?: string }) {
    this.transceivers.push({ kind, direction: init?.direction ?? "sendrecv" });
    return {};
  }
  addTrack(track: MediaStreamTrack) {
    this.attached.push(track);
    return { track } as RTCRtpSender;
  }
  async createOffer() {
    return { type: "offer" as const, sdp: "offer-sdp" };
  }
  async createAnswer() {
    return { type: "answer" as const, sdp: "answer-sdp" };
  }
  async setLocalDescription(value: RTCSessionDescriptionInit) {
    this.localDescription = value;
  }
  async setRemoteDescription(_value: RTCSessionDescriptionInit) {}
  addEventListener(type: string, listener: (...args: never[]) => void) {
    if (type === "track") {
      this.trackListeners.add(listener as (event: { track: MediaStreamTrack; streams: MediaStream[] }) => void);
    }
  }
  removeEventListener() {}
  emitTrack(track: MediaStreamTrack) {
    for (const listener of this.trackListeners) {
      listener({ track, streams: [] });
    }
  }
  close() {
    this.connectionState = "closed";
  }
}

const sessionId = new Uint8Array(16).fill(7);
const invitation = (candidate: Uint8Array): PeerInvitation => ({
  version: 1,
  sessionId,
  service: "app",
  role: "answer",
  peerEphemeralKey: new Uint8Array(32),
  identityProof: new Uint8Array(64),
  candidates: [{ kind: "webrtc", value: candidate }],
  display: "peer",
  issuedAt: 1,
  expiresAt: 2,
  capabilities: ["webrtc"],
  signature: new Uint8Array(64)
});

describe("host-owned WebRTC route", () => {
  it("keeps SDP and the data channel behind an authenticated route", async () => {
    const fake = new FakePeerConnection();
    const controller = new WebRtcRouteController({
      createPeerConnection: () => fake as unknown as RTCPeerConnection,
      openTimeoutMs: 100
    });
    const candidates = await controller.candidates(
      { service: "app", purpose: "test", mechanisms: ["manual"], timeoutMs: 1_000 },
      { role: "offer", sessionId }
    );
    expect(new TextDecoder().decode(candidates[0]?.value)).toContain("offer-sdp");
    const answer = new TextEncoder().encode(JSON.stringify({ type: "answer", sdp: "answer-sdp" }));
    const established = await controller.establish(
      { sharedSecret: new Uint8Array(32), remoteInvitation: invitation(answer), localCandidates: candidates },
      { fingerprint: "peer-fp", displayLabel: "Peer", matchingWords: ["one", "two", "three"], dataPlane: "webrtc" },
      { kind: "manual" } as never
    );
    expect(established).toMatchObject({ authenticated: true, confirmed: true, dataPlane: "webrtc" });
    const route = controller.route("peer-fp");
    route?.send(new Uint8Array([1, 2, 3]));
    expect(fake.channel.sent).toHaveLength(1);
    await established.close?.();
    expect(controller.route("peer-fp")).toBeUndefined();
  });

  it("negotiates media transceivers and attaches host tracks on the route", async () => {
    const fake = new FakePeerConnection();
    const controller = new WebRtcRouteController({
      createPeerConnection: () => fake as unknown as RTCPeerConnection,
      openTimeoutMs: 100,
      mediaTransceivers: ["audio", "video"]
    });
    const candidates = await controller.candidates(
      { service: "app", purpose: "call", mechanisms: ["manual"], timeoutMs: 1_000 },
      { role: "offer", sessionId }
    );
    expect(fake.transceivers).toEqual([
      { kind: "audio", direction: "sendrecv" },
      { kind: "video", direction: "sendrecv" }
    ]);
    const answer = new TextEncoder().encode(JSON.stringify({ type: "answer", sdp: "answer-sdp" }));
    await controller.establish(
      { sharedSecret: new Uint8Array(32), remoteInvitation: invitation(answer), localCandidates: candidates },
      { fingerprint: "peer-fp", displayLabel: "Peer", matchingWords: ["a", "b", "c"], dataPlane: "webrtc" },
      { kind: "manual" } as never
    );
    const route = controller.route("peer-fp");
    expect(route?.connection).toBe(fake as unknown as RTCPeerConnection);
    const local = { kind: "audio", id: "mic" } as MediaStreamTrack;
    route?.attachTrack(local);
    expect(fake.attached).toEqual([local]);
    const remote = { kind: "video", id: "cam" } as MediaStreamTrack;
    const seen: MediaStreamTrack[] = [];
    route?.onRemoteTrack((track) => {
      seen.push(track);
    });
    fake.emitTrack(remote);
    expect(seen).toEqual([remote]);
  });
});
