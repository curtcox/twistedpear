import { describe, expect, it, vi } from "vitest";
import { encodeSessionInviteEnvelope } from "@twistedpear/protocol";
import {
  createSessionInviteReceiver,
  sessionInviteContent,
  SESSION_INVITE_TITLE,
  type DeliveredSessionInvite,
  type SessionInviteCarrierMessage,
} from "../src/session-invite-carrier.js";

const SOURCE = new Uint8Array(16).fill(0xab);

function message(
  overrides: Partial<{
    title: string;
    content: string;
    sourceHash: Uint8Array;
    signatureValidated: boolean;
  }> = {},
): SessionInviteCarrierMessage {
  const content =
    overrides.content ??
    sessionInviteContent(
      encodeSessionInviteEnvelope({
        id: "invite-1",
        appId: "line-check",
        requestedClasses: ["microphone"],
        expiresAt: 90_000,
      }),
    );
  return {
    titleAsString: () => overrides.title ?? SESSION_INVITE_TITLE,
    contentAsString: () => content,
    sourceHash: overrides.sourceHash ?? SOURCE,
    signatureValidated: overrides.signatureValidated ?? true,
  };
}

function receiver(
  overrides: Partial<Parameters<typeof createSessionInviteReceiver>[0]> = {},
) {
  const delivered: DeliveredSessionInvite[] = [];
  const receive = createSessionInviteReceiver({
    deliver: async (invite) => {
      delivered.push(invite);
    },
    isInvitableApp: (appId) => appId === "line-check",
    resolvePeer: () => ({ handleId: "opaque-peer-1", displayLabel: "Ana" }),
    now: () => 1_000,
    ...overrides,
  });
  return { delivered, receive };
}

describe("inbound session-invite carrier", () => {
  it("raises a verified invite into host chrome", () => {
    const { delivered, receive } = receiver();
    receive(message());
    expect(delivered).toEqual([
      {
        id: "abababababababab-invite-1",
        appId: "line-check",
        peer: { id: "opaque-peer-1" },
        verifiedPeerLabel: "Ana",
        requestedClasses: ["microphone"],
        expiresAt: 90_000,
        verified: true,
      },
    ]);
  });

  it("names the peer from the verified source, never from the sender", () => {
    const { delivered, receive } = receiver({
      resolvePeer: (sourceHashHex) => ({
        handleId: `handle-${sourceHashHex.slice(0, 4)}`,
        displayLabel: "Ana (verified)",
      }),
    });
    receive(message());
    expect(delivered[0]?.verifiedPeerLabel).toBe("Ana (verified)");
    expect(delivered[0]?.peer.id).toBe("handle-abab");
  });

  it("drops an unsigned message however well-formed its body is", () => {
    const { delivered, receive } = receiver();
    receive(message({ signatureValidated: false }));
    expect(delivered).toEqual([]);
  });

  it("ignores mail that is not an invite", () => {
    const { delivered, receive } = receiver();
    receive(message({ title: "tp-probe" }));
    receive(message({ content: "hello" }));
    receive(message({ content: "tp-invite:zzzz" }));
    receive(message({ content: "tp-invite:00" }));
    expect(delivered).toEqual([]);
  });

  it("drops an expired invite rather than ringing for a dead session", () => {
    const { delivered, receive } = receiver({ now: () => 200_000 });
    receive(message());
    expect(delivered).toEqual([]);
  });

  it("drops an invite for an app this host will not ring", () => {
    const { delivered, receive } = receiver({ isInvitableApp: () => false });
    receive(message());
    expect(delivered).toEqual([]);
  });

  it("drops an invite from a peer the host cannot name", () => {
    const { delivered, receive } = receiver({ resolvePeer: () => null });
    receive(message());
    expect(delivered).toEqual([]);
  });

  it("bounds how often one peer can raise chrome", () => {
    const log = vi.fn();
    const { delivered, receive } = receiver({ maxInvitesPerWindow: 2, log });
    for (let index = 0; index < 5; index += 1) receive(message());
    expect(delivered).toHaveLength(2);
    expect(log).toHaveBeenCalled();
  });

  it("keeps a hostile peer from starving another peer's invites", () => {
    const { delivered, receive } = receiver({
      maxInvitesPerWindow: 1,
      resolvePeer: (sourceHashHex) => ({
        handleId: sourceHashHex.slice(0, 4),
        displayLabel: sourceHashHex.slice(0, 4),
      }),
    });
    for (let index = 0; index < 4; index += 1) receive(message());
    receive(message({ sourceHash: new Uint8Array(16).fill(0xcd) }));
    expect(delivered.map((invite) => invite.peer.id)).toEqual(["abab", "cdcd"]);
  });

  it("namespaces the id so one peer cannot spoof another peer's invite", () => {
    const { delivered, receive } = receiver({
      resolvePeer: (sourceHashHex) => ({
        handleId: sourceHashHex.slice(0, 4),
        displayLabel: "Peer",
      }),
    });
    receive(message());
    receive(message({ sourceHash: new Uint8Array(16).fill(0xcd) }));
    expect(new Set(delivered.map((invite) => invite.id)).size).toBe(2);
  });

  it("never throws when chrome rejects", () => {
    const log = vi.fn();
    const receive = createSessionInviteReceiver({
      deliver: async () => {
        throw new Error("chrome is busy");
      },
      isInvitableApp: () => true,
      resolvePeer: () => ({ handleId: "peer", displayLabel: "Peer" }),
      now: () => 1_000,
      log,
    });
    expect(() => receive(message())).not.toThrow();
  });
});
