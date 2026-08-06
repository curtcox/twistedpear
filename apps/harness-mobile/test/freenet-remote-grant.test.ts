import { describe, expect, it } from "vitest";
import {
  acceptFreenetRemoteGrant,
  assertNoTokenInText,
  defaultFreenetRemoteGrant,
  freenetGrantLogSafe,
  FREENET_REMOTE_DISCLOSURE,
  generateFreenetRendezvousHex,
  revokeFreenetRemoteGrant,
  validateFreenetNodeUrl,
  validateFreenetRemoteGrant,
} from "../src/freenet-remote-grant.js";

describe("freenet remote-node grant", () => {
  it("defaults to off with no capabilities", () => {
    const grant = defaultFreenetRemoteGrant();
    expect(grant.enabled).toBe(false);
    expect(grant.capabilities.contractReads).toBe(false);
    expect(FREENET_REMOTE_DISCLOSURE.length).toBeGreaterThan(0);
  });

  it("rejects malformed and unsafe URLs", () => {
    expect(validateFreenetNodeUrl("http://example.com").ok).toBe(false);
    expect(validateFreenetNodeUrl("ws://user:pass@example.com/v1").ok).toBe(
      false,
    );
    expect(
      validateFreenetNodeUrl("ws://127.0.0.1:50509/v1?token=secret").ok,
    ).toBe(false);
    expect(
      validateFreenetNodeUrl("ws://127.0.0.1:50509/v1/contract/command").ok,
    ).toBe(true);
  });

  it("requires label, disclosure, and at least one capability to enable", () => {
    const draft = {
      nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
      operatorLabel: "",
      capabilities: {
        contractReads: true,
        contractWrites: false,
        packetTunnel: false,
        propagation: false,
      },
    };
    expect(validateFreenetRemoteGrant(draft).ok).toBe(false);

    expect(() =>
      acceptFreenetRemoteGrant(
        { ...draft, operatorLabel: "home node" },
        { acceptedDisclosure: false },
      ),
    ).toThrow(/disclosure/);

    const enabled = acceptFreenetRemoteGrant(
      { ...draft, operatorLabel: "home node" },
      { acceptedDisclosure: true, now: 42 },
    );
    expect(enabled.enabled).toBe(true);
    expect(enabled.acceptedAt).toBe(42);
  });

  it("starts read-only: writes require reads", () => {
    const result = validateFreenetRemoteGrant({
      nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
      operatorLabel: "lab",
      capabilities: {
        contractReads: false,
        contractWrites: true,
        packetTunnel: false,
        propagation: false,
      },
    });
    expect(result.ok).toBe(false);
    expect(result.errors.some((line) => line.includes("reads"))).toBe(true);
  });

  it("requires a 64-hex rendezvous when packet tunnel is enabled", () => {
    const missing = validateFreenetRemoteGrant({
      nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
      operatorLabel: "lab",
      capabilities: {
        contractReads: false,
        contractWrites: false,
        packetTunnel: true,
        propagation: false,
      },
    });
    expect(missing.ok).toBe(false);
    expect(missing.errors.some((line) => line.includes("rendezvous"))).toBe(
      true,
    );

    const rendezvousHex = generateFreenetRendezvousHex(() =>
      new Uint8Array(32).fill(7),
    );
    expect(rendezvousHex).toHaveLength(64);
    const ok = validateFreenetRemoteGrant({
      nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
      operatorLabel: "lab",
      rendezvousHex,
      localDirection: 1,
      capabilities: {
        contractReads: false,
        contractWrites: false,
        packetTunnel: true,
        propagation: false,
      },
    });
    expect(ok.ok).toBe(true);

    const enabled = acceptFreenetRemoteGrant(
      {
        nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
        operatorLabel: "lab",
        rendezvousHex,
        localDirection: 1,
        capabilities: {
          contractReads: false,
          contractWrites: false,
          packetTunnel: true,
          propagation: true,
        },
      },
      { acceptedDisclosure: true, now: 99 },
    );
    expect(enabled.capabilities.packetTunnel).toBe(true);
    expect(enabled.capabilities.propagation).toBe(true);
    expect(enabled.rendezvousHex).toBe(rendezvousHex);
    expect(enabled.localDirection).toBe(1);
  });

  it("revokes back to disabled without clearing the operator label", () => {
    const enabled = acceptFreenetRemoteGrant(
      {
        nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
        operatorLabel: "companion",
        capabilities: {
          contractReads: true,
          contractWrites: false,
          packetTunnel: false,
          propagation: false,
        },
      },
      { acceptedDisclosure: true },
    );
    const revoked = revokeFreenetRemoteGrant(enabled);
    expect(revoked.enabled).toBe(false);
    expect(revoked.operatorLabel).toBe("companion");
    expect(revoked.capabilities.contractReads).toBe(false);
  });

  it("keeps tokens out of log-safe snapshots and dump text", () => {
    const grant = {
      ...defaultFreenetRemoteGrant(),
      enabled: true,
      nodeUrl: "ws://127.0.0.1:50509/v1/contract/command",
      operatorLabel: "lab",
      authToken: "super-secret-token",
      capabilities: {
        contractReads: true,
        contractWrites: false,
        packetTunnel: false,
        propagation: false,
      },
      acceptedAt: 1,
    };
    const safe = freenetGrantLogSafe(grant);
    expect(JSON.stringify(safe)).not.toContain("super-secret-token");
    expect(safe.authTokenPresent).toBe(true);
    expect(() =>
      assertNoTokenInText(
        "status ok token=super-secret-token",
        grant.authToken,
      ),
    ).toThrow(/leaked/);
  });
});
