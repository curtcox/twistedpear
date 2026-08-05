import { describe, expect, it } from "vitest";
import {
  encodePeerInvitation,
  type PeerInvitation,
} from "@twistedpear/protocol";
import {
  ManualPeerDiscoveryAdapter,
  type ManualDiscoveryChannel,
} from "../src/index.js";

function invitation(role: "offer" | "answer", service = "chat"): Uint8Array {
  const value: PeerInvitation = {
    version: 1,
    sessionId: new Uint8Array(16).fill(1),
    service,
    role,
    peerEphemeralKey: new Uint8Array(32).fill(role === "offer" ? 2 : 3),
    candidates: [],
    display: role,
    issuedAt: 1_000,
    expiresAt: 61_000,
    capabilities: [],
    signature: new Uint8Array(64).fill(4),
  };
  return encodePeerInvitation(value);
}

describe("manual discovery adapter", () => {
  it("performs a full-code two-round offer and answer without a service", async () => {
    let shown = "";
    let returned = "";
    const answerBytes = invitation("answer");
    const channel: ManualDiscoveryChannel = {
      async *offer(_session, code) {
        shown = code;
        const { encodePeerInvitationText } =
          await import("@twistedpear/protocol");
        yield encodePeerInvitationText(answerBytes);
      },
      async *accept() {},
      async answer(_session, code) {
        returned = code;
      },
      async cancel() {},
    };
    const adapter = new ManualPeerDiscoveryAdapter({
      channel,
      createSessionId: () => "manual-1",
      now: () => 2_000,
    });
    const events = [];
    for await (const event of adapter.offer(invitation("offer"), {
      timeoutMs: 1_000,
    }))
      events.push(event);
    expect(shown.length).toBeGreaterThan(0);
    expect(events.map((event) => event.kind)).toEqual(["ready", "invitation"]);
    await adapter.answer({ id: "manual-1", kind: "manual" }, answerBytes);
    expect(returned.length).toBeGreaterThan(0);
  });

  it("rejects cross-service pasted offers before yielding them", async () => {
    const { encodePeerInvitationText } = await import("@twistedpear/protocol");
    const channel: ManualDiscoveryChannel = {
      async *offer() {},
      async *accept() {
        yield {
          session: { id: "manual-2", kind: "manual" },
          code: encodePeerInvitationText(invitation("offer", "other")),
        };
      },
      async answer() {},
      async cancel() {},
    };
    const adapter = new ManualPeerDiscoveryAdapter({
      channel,
      createSessionId: () => "unused",
      now: () => 2_000,
    });
    const consume = async () => {
      for await (const _event of adapter.accept({
        service: "chat",
        timeoutMs: 1_000,
      })) {
        /* no-op */
      }
    };
    await expect(consume()).rejects.toThrow(/wrong role or service/);
  });
});
