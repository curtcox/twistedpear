import { describe, expect, it } from "vitest";
import { encodePeerInvitation, type PeerInvitation } from "@twistedpear/protocol";
import { encodePeerQrCodes, QrPeerDiscoveryAdapter, type QrDiscoveryChannel } from "../src/index.js";

function invitation(role: "offer" | "answer", large = false, sessionByte = 1): Uint8Array {
  const value: PeerInvitation = { version: 1, sessionId: new Uint8Array(16).fill(sessionByte), service: "chat", role, peerEphemeralKey: new Uint8Array(32).fill(2), candidates: large ? [{ kind: "webrtc", value: new Uint8Array(2_000).fill(3) }] : [], display: "Peer", issuedAt: 1_000, expiresAt: 61_000, capabilities: [], signature: new Uint8Array(64).fill(4) };
  return encodePeerInvitation(value);
}

describe("QR discovery adapter", () => {
  it("uses one static QR for small invitations and bounded animated frames for large ones", () => {
    expect(encodePeerQrCodes(invitation("offer"))).toHaveLength(1);
    const animated = encodePeerQrCodes(invitation("offer", true));
    expect(animated.length).toBeGreaterThan(1);
    expect(Math.max(...animated.map((code) => code.length))).toBeLessThanOrEqual(512);
  });

  it("accepts reordered and duplicated animated frames", async () => {
    const codes = encodePeerQrCodes(invitation("offer", true));
    const session = { id: "camera-1", kind: "qr" as const };
    const channel: QrDiscoveryChannel = {
      async availability() { return { state: "permission-required" }; },
      async *present() {},
      async *scan() { yield { session, code: codes.at(-1)! }; yield { session, code: codes.at(-1)! }; for (const code of codes.slice(0, -1).reverse()) yield { session, code }; },
      async answer() {}, async cancel() {}
    };
    const adapter = new QrPeerDiscoveryAdapter({ channel, createSessionId: () => "unused", now: () => 2_000 });
    const events = []; for await (const event of adapter.accept({ service: "chat", timeoutMs: 1_000 })) events.push(event);
    expect(events.at(-1)?.kind).toBe("invitation");
    expect(events.filter((event) => event.kind === "invitation")).toHaveLength(1);
  });

  it("rejects mixed animated sessions and exposes side-effect-free availability", async () => {
    const first = encodePeerQrCodes(invitation("offer", true, 1)); const second = encodePeerQrCodes(invitation("offer", true, 2));
    const session = { id: "camera-2", kind: "qr" as const };
    const channel: QrDiscoveryChannel = {
      async availability() { return { state: "permission-required", reason: "Camera permission is required" }; },
      async *present() {}, async *scan() { yield { session, code: first[0]! }; yield { session, code: second[1]! }; }, async answer() {}, async cancel() {}
    };
    const adapter = new QrPeerDiscoveryAdapter({ channel, createSessionId: () => "unused", now: () => 2_000 });
    await expect(adapter.availability()).resolves.toMatchObject({ state: "permission-required" });
    const consume = async () => { for await (const _event of adapter.accept({ service: "chat", timeoutMs: 1_000 })) { /* no-op */ } };
    await expect(consume()).rejects.toThrow(/different sessions/);
  });
});
