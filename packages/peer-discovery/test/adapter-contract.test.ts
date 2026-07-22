import { describe, expect, it } from "vitest";
import { encodePeerInvitation, type PeerInvitation } from "@twistedpear/protocol";
import { ManualPeerDiscoveryAdapter, QrPeerDiscoveryAdapter, type PeerDiscoveryAdapter } from "../src/index.js";

function offer(): Uint8Array {
  const value: PeerInvitation = { version: 1, sessionId: new Uint8Array(16).fill(1), service: "chat", role: "offer", peerEphemeralKey: new Uint8Array(32).fill(2), candidates: [], display: "Peer", issuedAt: 1_000, expiresAt: 61_000, capabilities: [], signature: new Uint8Array(64).fill(3) };
  return encodePeerInvitation(value);
}
async function consume(iterable: AsyncIterable<unknown>): Promise<void> { for await (const _event of iterable) { /* consume */ } }

describe.each([
  ["manual", () => { let cancelled = 0; const adapter = new ManualPeerDiscoveryAdapter({ createSessionId: () => "session", now: () => 2_000, channel: { async *offer() { await new Promise(() => {}); }, async *accept() { await new Promise(() => {}); }, async answer() {}, async cancel() { cancelled += 1; } } }); return { adapter, cancelled: () => cancelled }; }],
  ["qr", () => { let cancelled = 0; const adapter = new QrPeerDiscoveryAdapter({ createSessionId: () => "session", now: () => 2_000, channel: { async availability() { return { state: "available" }; }, async *present() { await new Promise(() => {}); }, async *scan() { await new Promise(() => {}); }, async answer() {}, async cancel() { cancelled += 1; } } }); return { adapter, cancelled: () => cancelled }; }]
] as const)("%s adapter contract", (_name, create) => {
  it("enforces timeout and invokes cancellation", async () => {
    const { adapter, cancelled } = create();
    await expect(consume((adapter as PeerDiscoveryAdapter).offer(offer(), { timeoutMs: 10 }))).rejects.toMatchObject({ code: "TIMEOUT" });
    expect(cancelled()).toBe(1);
  });
  it("enforces AbortSignal and invokes cancellation", async () => {
    const { adapter, cancelled } = create(); const controller = new AbortController();
    const pending = consume((adapter as PeerDiscoveryAdapter).offer(offer(), { timeoutMs: 1_000, signal: controller.signal }));
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: "CANCELLED" });
    expect(cancelled()).toBe(1);
  });
});
