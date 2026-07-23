import { describe, expect, it } from "vitest";
import { CAPABILITY_DEFINITIONS, assertCapabilityAllowed } from "../src/index.js";
import { RelayBrokerService, RelayBrokerServiceError } from "../src/services/relay.js";
import type { RelayService, RelayStatus, InterfaceDiagnostic } from "../src/services/relay.js";

class MockRelayService implements RelayService {
  mode: "off" | "bridge" | "transport-node" = "off";
  enabled: Array<{ kind: string; options?: Record<string, unknown> }> = [];
  disabled: string[] = [];
  directions: Array<{ kind: string; direction: string }> = [];
  policies: unknown[] = [];

  async setMode(mode: "off" | "bridge" | "transport-node") {
    this.mode = mode;
  }
  async enable(kind: string, options?: Record<string, unknown>) {
    this.enabled.push({ kind, options });
  }
  async disable(kind: string) {
    this.disabled.push(kind);
  }
  async setDirection(kind: string, direction: string) {
    this.directions.push({ kind, direction });
  }
  async configure() {}
  async setPolicy(policy: unknown) {
    this.policies.push(policy);
  }
  status(): RelayStatus {
    return { mode: this.mode, interfaces: [], onlineCount: 0 };
  }
  async diagnostics(): Promise<ReadonlyArray<InterfaceDiagnostic>> {
    return [];
  }
}

describe("relay capabilities", () => {
  it("includes relay:configure and relay:read in capability definitions", () => {
    const ids = CAPABILITY_DEFINITIONS.map((entry) => entry.id);
    expect(ids).toContain("relay:configure");
    expect(ids).toContain("relay:read");
  });

  it("denies relay:configure when not declared", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "relay:configure",
        declared: ["identity"],
        granted: ["relay:configure"]
      })
    ).toThrow();
  });

  it("denies relay:read when declared but not granted", () => {
    expect(() =>
      assertCapabilityAllowed({
        capability: "relay:read",
        declared: ["relay:read"],
        granted: []
      })
    ).toThrow();
  });
});

describe("RelayBrokerService", () => {
  it("validates and forwards setMode", async () => {
    const mock = new MockRelayService();
    const broker = new RelayBrokerService(mock);
    await broker.setMode("app", { mode: "bridge" });
    expect(mock.mode).toBe("bridge");
    await expect(broker.setMode("app", { mode: "invalid" as never })).rejects.toThrow(RelayBrokerServiceError);
  });

  it("validates interface kind on enable", async () => {
    const mock = new MockRelayService();
    const broker = new RelayBrokerService(mock);
    await broker.enable("app", { kind: "ntfy", options: { topic: "test" } });
    expect(mock.enabled).toContainEqual({ kind: "ntfy", options: { topic: "test" } });
    await expect(broker.enable("app", { kind: "bad" as never })).rejects.toThrow(RelayBrokerServiceError);
  });

  it("validates direction on setDirection", async () => {
    const mock = new MockRelayService();
    const broker = new RelayBrokerService(mock);
    await broker.setDirection("app", { kind: "ntfy", direction: "rx" });
    expect(mock.directions).toContainEqual({ kind: "ntfy", direction: "rx" });
    await expect(broker.setDirection("app", { kind: "ntfy", direction: "sideways" as never })).rejects.toThrow(
      RelayBrokerServiceError
    );
  });
});
