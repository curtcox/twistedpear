import { describe, expect, it } from "vitest";
import { resolveFreenetNodeFlags } from "../src/commands/index.js";

describe("resolveFreenetNodeFlags", () => {
  it("returns null when Freenet flags are absent", () => {
    expect(resolveFreenetNodeFlags(["--propagation"])).toEqual({
      config: null,
      logLines: []
    });
  });

  it("configures URL-only mode for contracts without enabling HDLC", () => {
    const result = resolveFreenetNodeFlags(["--freenet"]);
    expect(result.config).toMatchObject({
      enabled: false,
      url: "ws://127.0.0.1:50509/v1/contract/command"
    });
    expect(result.logLines.some((line) => line.includes("not bundled"))).toBe(true);
  });

  it("enables the HDLC interface and generates a rendezvous when omitted", () => {
    const result = resolveFreenetNodeFlags([
      "--freenet-interface",
      "--freenet-node",
      "ws://127.0.0.1:9/v1/contract/command"
    ]);
    expect(result.config?.enabled).toBe(true);
    expect(result.config?.url).toBe("ws://127.0.0.1:9/v1/contract/command");
    expect(result.config?.rendezvousHex).toMatch(/^[0-9a-f]{64}$/);
    expect(result.logLines.some((line) => line.includes("rendezvous"))).toBe(true);
  });

  it("rejects a malformed rendezvous", () => {
    expect(() =>
      resolveFreenetNodeFlags(["--freenet", "--freenet-rendezvous", "abcd"])
    ).toThrow(/64 hex/);
  });
});
