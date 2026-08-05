import { describe, expect, it } from "vitest";
import {
  acceptFreenetRemoteGrant,
  assertNoTokenInText,
} from "../src/freenet-remote-grant.js";
import {
  freenetRemoteSessionStatusLabel,
  freenetRemoteSessionLogSafe,
  idleFreenetRemoteSession,
  probeFreenetRemoteNode,
  reduceFreenetRemoteSession,
} from "../src/freenet-remote-session.js";

function enabledGrant(writes = false) {
  return acceptFreenetRemoteGrant(
    {
      nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
      operatorLabel: "companion",
      authToken: "secret-token-value",
      capabilities: {
        contractReads: true,
        contractWrites: writes,
        packetTunnel: false,
        propagation: false,
      },
    },
    { acceptedDisclosure: true, now: 1 },
  );
}

describe("freenet remote-node session", () => {
  it("starts idle and connects after a successful probe", async () => {
    let session = idleFreenetRemoteSession();
    const grant = enabledGrant();
    session = reduceFreenetRemoteSession(session, { type: "enable", grant });
    expect(session.status).toBe("connecting");

    const result = await probeFreenetRemoteNode(grant, {
      open: async () => ({ ok: true }),
    });
    session = reduceFreenetRemoteSession(session, {
      type: "probe-result",
      result,
    });
    expect(session.status).toBe("online");
    expect(freenetRemoteSessionStatusLabel(session)).toBe("Online");
  });

  it("records authentication failure without leaking the token", async () => {
    let session = idleFreenetRemoteSession();
    const grant = enabledGrant();
    session = reduceFreenetRemoteSession(session, { type: "enable", grant });
    const result = await probeFreenetRemoteNode(grant, {
      open: async () => ({
        ok: false,
        reason: "auth-failed",
        detail: "unauthorized",
      }),
    });
    session = reduceFreenetRemoteSession(session, {
      type: "probe-result",
      result,
    });
    expect(session.status).toBe("auth-failed");
    expect(freenetRemoteSessionStatusLabel(session)).toMatch(/Authentication/);
    assertNoTokenInText(
      JSON.stringify(freenetRemoteSessionLogSafe(session)),
      grant.authToken,
    );
  });

  it("passes the auth token to the open helper without logging it", async () => {
    const grant = enabledGrant();
    let seen: { url?: string; authToken?: string } = {};
    await probeFreenetRemoteNode(grant, {
      open: async (url, options) => {
        seen = { url, authToken: options?.authToken };
        return { ok: true };
      },
    });
    expect(seen.url).toBe(grant.nodeUrl);
    expect(seen.authToken).toBe("secret-token-value");
  });

  it("degrades on unavailable probe during reconnect", async () => {
    let session = idleFreenetRemoteSession();
    const grant = enabledGrant();
    session = reduceFreenetRemoteSession(session, { type: "enable", grant });
    session = reduceFreenetRemoteSession(session, {
      type: "probe-result",
      result: { ok: true },
    });
    session = reduceFreenetRemoteSession(session, { type: "disconnect" });
    expect(session.status).toBe("unavailable");
    session = reduceFreenetRemoteSession(session, { type: "reconnect" });
    expect(session.status).toBe("reconnecting");
    expect(session.reconnectAttempts).toBe(1);
    session = reduceFreenetRemoteSession(session, {
      type: "probe-result",
      result: { ok: false, reason: "unavailable" },
    });
    expect(session.status).toBe("degraded");
  });

  it("requires explicit confirmation before a contract write", () => {
    let session = idleFreenetRemoteSession();
    session = reduceFreenetRemoteSession(session, {
      type: "enable",
      grant: enabledGrant(true),
    });
    session = reduceFreenetRemoteSession(session, {
      type: "probe-result",
      result: { ok: true },
    });
    session = reduceFreenetRemoteSession(session, {
      type: "request-write-confirmation",
    });
    expect(session.pendingWriteConfirmation).toBe(true);
    session = reduceFreenetRemoteSession(session, { type: "confirm-write" });
    expect(session.pendingWriteConfirmation).toBe(false);
  });

  it("rejects malformed URLs before opening a socket", async () => {
    const grant = enabledGrant();
    const bad = { ...grant, nodeUrl: "http://example.com" };
    const result = await probeFreenetRemoteNode(bad, {
      open: async () => {
        throw new Error("should not open");
      },
    });
    expect(result).toEqual({
      ok: false,
      reason: "malformed-url",
      detail: expect.stringMatching(/non-ws/),
    });
  });

  it("returns to idle on revoke", () => {
    let session = idleFreenetRemoteSession();
    session = reduceFreenetRemoteSession(session, {
      type: "enable",
      grant: enabledGrant(),
    });
    session = reduceFreenetRemoteSession(session, { type: "revoke" });
    expect(session).toEqual(idleFreenetRemoteSession());
  });
});
