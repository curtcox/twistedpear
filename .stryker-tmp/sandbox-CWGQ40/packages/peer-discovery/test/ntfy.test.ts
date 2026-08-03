// @ts-nocheck
import { describe, expect, it } from "vitest";
import { encodePeerInvitation, type PeerInvitation } from "@twistedpear/protocol";
import {
  decodeNtfyRendezvousSecret,
  decryptNtfyRendezvousMessage,
  encodeNtfyRendezvousSecret,
  encryptNtfyRendezvousMessage,
  NtfyRendezvousClient,
  NtfyPeerDiscoveryAdapter,
  type NtfyRendezvousSecret
} from "../src/index.js";

const now = 1_900_000_000_000;
const bytes = (length: number, seed: number) => Uint8Array.from({ length }, (_, index) => (seed + index) & 255);
const secret: NtfyRendezvousSecret = { topic: bytes(16, 3), key: bytes(32, 40) };

function invitation(role: "offer" | "answer" = "offer"): Uint8Array {
  const value: PeerInvitation = {
    version: 1,
    sessionId: bytes(16, 1),
    service: "peer-link",
    role,
    peerEphemeralKey: bytes(32, 2),
    identityProof: bytes(64, 4),
    candidates: [{ kind: "reticulum", value: bytes(16, 7) }],
    display: "Test peer",
    issuedAt: now - 1_000,
    expiresAt: now + 60_000,
    capabilities: ["reticulum"],
    signature: bytes(64, 8)
  };
  return encodePeerInvitation(value);
}

describe("encrypted ntfy rendezvous", () => {
  it("round-trips checksummed secrets and authenticated invitations", () => {
    expect(decodeNtfyRendezvousSecret(encodeNtfyRendezvousSecret(secret))).toEqual(secret);
    const packet = encryptNtfyRendezvousMessage(secret, invitation(), bytes(16, 90), bytes(24, 110), now);
    const decoded = decryptNtfyRendezvousMessage(secret, packet, now);
    expect(decoded.role).toBe("offer");
    expect(decoded.envelope).toEqual(invitation());
    expect(() => decryptNtfyRendezvousMessage({ ...secret, key: bytes(32, 99) }, packet, now)).toThrow(/authentication failed/);
  });

  it("uses bearer headers, keeps secrets out of URLs, and rejects replayed cached messages", async () => {
    const stored: string[] = [];
    const requests: Array<{ url: string; authorization: string | null }> = [];
    let entropySeed = 10;
    const fakeFetch: typeof fetch = async (input, init) => {
      const url = String(input);
      const headers = new Headers(init?.headers);
      requests.push({ url, authorization: headers.get("authorization") });
      if (init?.method === "POST") {
        stored.push(String(init.body));
        return new Response("ok", { status: 200 });
      }
      const body = stored.map((message) => JSON.stringify({ event: "message", message })).join("\n");
      return new Response(body, { status: 200 });
    };
    const client = new NtfyRendezvousClient({
      baseUrl: "https://ntfy.example.test/root",
      bearerToken: "host-secret",
      fetch: fakeFetch,
      entropy: async (length) => bytes(length, entropySeed++),
      now: () => now
    });
    await client.publish(secret, invitation());
    expect(await client.poll(secret)).toHaveLength(1);
    expect(await client.poll(secret)).toHaveLength(0);
    expect(requests.every((request) => request.authorization === "Bearer host-secret")).toBe(true);
    expect(requests.every((request) => !request.url.includes("host-secret") && !request.url.includes(encodeNtfyRendezvousSecret(secret)))).toBe(true);
    expect(stored[0]).not.toContain("peer-link");
  });

  it("rejects expired packets and non-HTTPS remote servers", () => {
    const packet = encryptNtfyRendezvousMessage(secret, invitation(), bytes(16, 1), bytes(24, 2), now);
    expect(() => decryptNtfyRendezvousMessage(secret, packet, now + 60_001)).toThrow(/Expired/);
    expect(() => new NtfyRendezvousClient({ baseUrl: "http://ntfy.example.test", entropy: async (length) => bytes(length, 1) })).toThrow(/HTTPS/);
  });

  it("adapts encrypted service polling to the common offer/accept contract", async () => {
    const offerEnvelope = invitation("offer"); const answerEnvelope = invitation("answer"); const published: Uint8Array[] = []; let requestedCode = "";
    const client = { async createSecret() { return secret; }, async publish(_secret: NtfyRendezvousSecret, envelope: Uint8Array) { published.push(envelope); }, async poll() { return [{ id: bytes(16, 1), role: "answer" as const, expiresAt: now + 60_000, envelope: answerEnvelope }]; } };
    const adapter = new NtfyPeerDiscoveryAdapter({ client, createSessionId: () => "ntfy-session", now: () => now, channel: { async availability() { return { state: "available" }; }, async presentCode(_session, code) { requestedCode = code; }, async requestCode() { return { session: { id: "join-session", kind: "ntfy" }, code: requestedCode }; }, async cancel() {} } });
    const events = []; for await (const event of adapter.offer(offerEnvelope, { timeoutMs: 1_000 })) events.push(event);
    expect(events.map((event) => event.kind)).toEqual(["ready", "invitation"]); expect(published).toEqual([offerEnvelope]); expect(requestedCode).toMatch(/^TPN1-/);

    const listening = new NtfyPeerDiscoveryAdapter({ client: { ...client, async poll() { return [{ id: bytes(16, 2), role: "offer" as const, expiresAt: now + 60_000, envelope: offerEnvelope }]; } }, createSessionId: () => "unused", now: () => now, channel: { async availability() { return { state: "available" }; }, async presentCode() {}, async requestCode() { return { session: { id: "join-session", kind: "ntfy" }, code: requestedCode }; }, async cancel() {} } });
    const inbound = []; for await (const event of listening.accept({ service: "peer-link", timeoutMs: 1_000 })) inbound.push(event);
    expect(inbound[0]).toMatchObject({ kind: "invitation", envelope: offerEnvelope }); await listening.answer({ id: "join-session", kind: "ntfy" }, answerEnvelope); expect(published.at(-1)).toEqual(answerEnvelope);
  });
});
