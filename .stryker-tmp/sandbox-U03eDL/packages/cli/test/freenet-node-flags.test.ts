// @ts-nocheck
import { describe, expect, it } from "vitest";
import { resolveFreenetNodeFlags } from "../src/commands/index.js";

describe("resolveFreenetNodeFlags", () => {
  it("returns null when Freenet flags are absent", () => {
    expect(resolveFreenetNodeFlags(["--propagation"])).toEqual({
      config: null,
      supervise: null,
      logLines: []
    });
  });

  it("configures URL-only mode for contracts without enabling HDLC", () => {
    const result = resolveFreenetNodeFlags(["--freenet"]);
    expect(result.config).toMatchObject({
      enabled: false,
      url: "ws://127.0.0.1:50509/v1/contract/command"
    });
    expect(result.supervise).toBeNull();
    expect(result.logLines.some((line) => line.includes("not bundled"))).toBe(true);
  });

  it("accepts the external node URL directly after --freenet", () => {
    const result = resolveFreenetNodeFlags([
      "--freenet",
      "ws://127.0.0.1:50510/v1/contract/command",
      "--propagation"
    ]);
    expect(result.config).toMatchObject({
      enabled: false,
      url: "ws://127.0.0.1:50510/v1/contract/command"
    });
  });

  it("enables the HDLC interface and generates a rendezvous when omitted", () => {
    const result = resolveFreenetNodeFlags([
      "--freenet-interface",
      "--freenet-node",
      "ws://127.0.0.1:9/v1/contract/command",
      "--freenet-direction",
      "1"
    ]);
    expect(result.config?.enabled).toBe(true);
    expect(result.config?.url).toBe("ws://127.0.0.1:9/v1/contract/command");
    expect(result.config?.rendezvousHex).toMatch(/^[0-9a-f]{64}$/);
    expect(result.config?.localDirection).toBe(1);
    expect(result.logLines.some((line) => line.includes("rendezvous"))).toBe(true);
  });

  it("configures supervision for a user-supplied binary", () => {
    const result = resolveFreenetNodeFlags([
      "--freenet-binary",
      "/opt/freenet/freenet",
      "--freenet-binary-sha256",
      "a".repeat(64),
      "--freenet-interface"
    ]);
    expect(result.supervise).toEqual({
      binaryPath: "/opt/freenet/freenet",
      expectedSha256: "a".repeat(64)
    });
    expect(result.config?.enabled).toBe(true);
    expect(result.logLines.some((line) => line.includes("supervision"))).toBe(true);
  });

  it("rejects --freenet-supervise without a binary path", () => {
    expect(() => resolveFreenetNodeFlags(["--freenet-supervise"])).toThrow(
      /requires --freenet-binary/
    );
  });

  it("rejects a malformed rendezvous", () => {
    expect(() =>
      resolveFreenetNodeFlags(["--freenet", "--freenet-rendezvous", "abcd"])
    ).toThrow(/64 hex/);
  });

  it("rejects an invalid packet-log direction", () => {
    expect(() =>
      resolveFreenetNodeFlags([
        "--freenet-interface",
        "--freenet-direction",
        "2"
      ])
    ).toThrow(/must be 0 or 1/);
  });
});
