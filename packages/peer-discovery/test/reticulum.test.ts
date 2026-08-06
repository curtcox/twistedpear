import { describe, expect, it } from "vitest";
import {
  encodePeerInvitation,
  type PeerInvitation,
} from "@twistedpear/protocol";
import { ReticulumPeerDiscoveryAdapter } from "../src/index.js";

const now = 1_700_000_000_000;
const sessionId = Uint8Array.from({ length: 16 }, (_, index) => index + 1);
const base = {
  version: 1 as const,
  sessionId,
  service: "chat",
  display: "Nearby peer",
  issuedAt: now,
  expiresAt: now + 60_000,
  capabilities: ["reticulum"],
  candidates: [
    { kind: "reticulum" as const, value: new Uint8Array(16).fill(7) },
  ],
  peerEphemeralKey: new Uint8Array(32).fill(8),
  signature: new Uint8Array(64).fill(10),
};
const invitation = (role: PeerInvitation["role"]) =>
  encodePeerInvitation({ ...base, role });

describe("automatic Reticulum discovery adapter", () => {
  it("offers and validates the answer correlation before yielding", async () => {
    const adapter = new ReticulumPeerDiscoveryAdapter({
      createSessionId: () => "auto-offer",
      now: () => now,
      channel: {
        async availability() {
          return { state: "available" };
        },
        async *offer(session, envelope) {
          expect(session).toEqual({ id: "auto-offer", kind: "reticulum" });
          expect(envelope).toEqual(invitation("offer"));
          yield invitation("answer");
        },
        async *listen() {},
        async answer() {},
        async cancel() {},
      },
    });
    const events = [];
    for await (const event of adapter.offer(invitation("offer"), {
      timeoutMs: 1_000,
    }))
      events.push(event.kind);
    expect(events).toEqual(["ready", "invitation"]);
  });

  it("listens by service and routes answers through the same opaque session", async () => {
    let answered = false;
    const adapter = new ReticulumPeerDiscoveryAdapter({
      createSessionId: () => "unused",
      now: () => now,
      channel: {
        async availability() {
          return { state: "available" };
        },
        async *offer() {},
        async *listen() {
          yield {
            session: { id: "inbound-route", kind: "reticulum" },
            envelope: invitation("offer"),
          };
        },
        async answer(session, envelope) {
          expect(session.id).toBe("inbound-route");
          expect(envelope).toEqual(invitation("answer"));
          answered = true;
        },
        async cancel() {},
      },
    });
    const events = [];
    for await (const event of adapter.accept({
      service: "chat",
      timeoutMs: 1_000,
    }))
      events.push(event.kind);
    await adapter.answer(
      { id: "inbound-route", kind: "reticulum" },
      invitation("answer"),
    );
    expect(events).toEqual(["invitation"]);
    expect(answered).toBe(true);
  });
});
