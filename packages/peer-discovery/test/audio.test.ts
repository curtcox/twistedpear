import { describe, expect, it } from "vitest";
import { encodePeerInvitation, framePeerAudioPayload, type PeerInvitation } from "@twistedpear/protocol";
import { AudioPeerDiscoveryAdapter } from "../src/index.js";

const now = 1_900_000_000_000;
const bytes = (length: number, seed: number) => Uint8Array.from({ length }, (_, index) => (seed + index) & 255);
function envelope(role: "offer" | "answer") { const value: PeerInvitation = { version: 1, sessionId: bytes(16, 1), service: "app", role, peerEphemeralKey: bytes(32, 2), identityProof: bytes(64, 3), candidates: [{ kind: "reticulum", value: bytes(16, 4) }], display: "peer", issuedAt: now - 1, expiresAt: now + 60_000, capabilities: ["reticulum"], signature: bytes(64, 5) }; return encodePeerInvitation(value); }

describe("audio discovery adapter", () => {
  it("uses shared frames and recovers a lost response frame", async () => {
    const answer = envelope("answer");
    const adapter = new AudioPeerDiscoveryAdapter({ now: () => now, createSessionId: () => "audio-session", channel: { async availability() { return { state: "permission-required" }; }, async *transmit(_session, frames) { expect(frames.length).toBeGreaterThan(1); const response = framePeerAudioPayload(bytes(16, 1), answer, 64); for (const [index, frame] of response.entries()) if (index !== 1) yield frame; }, async *receive() {}, async answer() {}, async cancel() {} } });
    const events = []; for await (const event of adapter.offer(envelope("offer"), { timeoutMs: 5_000 })) events.push(event);
    expect(events.at(-1)).toMatchObject({ kind: "invitation", envelope: answer });
  });

  it("does not prompt while checking availability", async () => {
    let effects = 0; const adapter = new AudioPeerDiscoveryAdapter({ createSessionId: () => "id", channel: { async availability() { return { state: "permission-required", reason: "Microphone starts after user action" }; }, async *transmit() { effects += 1; }, async *receive() { effects += 1; }, async answer() { effects += 1; }, async cancel() {} } });
    await expect(adapter.availability()).resolves.toMatchObject({ state: "permission-required" }); expect(effects).toBe(0);
  });
});
