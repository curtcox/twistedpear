import { describe, expect, it } from "vitest";
import { CAPABILITY_DEFINITIONS, assertCapabilityAllowed, GrantStore, MemoryKvStoreBackend, MiniappHost } from "../src/index.js";
import { RelayBrokerService, RelayBrokerServiceError } from "../src/services/relay.js";
import type { RelayService, RelayStatus, InterfaceDiagnostic, InterfaceStatus } from "../src/services/relay.js";

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
  list(): ReadonlyArray<InterfaceStatus> {
    return [];
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

describe("MiniappHost relay broker path", () => {
  const unusedBackend = { name: "unused", async spawn() { throw new Error("not used"); } };
  const manifest = {
    name: "relay-app",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities: ["relay:configure", "relay:read"]
  };

  it("returns RELAY_UNCONFIGURED when relayService is not injected", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({ backend: unusedBackend, grantStore: new GrantStore(store), kvBackend: store });
    await host.setGrants("relay-app", "publisher", ["relay:read"], ["relay:read"]);
    const response = await host.dispatchRaw(
      { id: "1", namespace: "relay", method: "status", payload: {} },
      manifest,
      ["relay:read"]
    );
    expect(response.error?.code).toBe("RELAY_UNCONFIGURED");
  });

  it("enforces relay capabilities and forwards to the injected service", async () => {
    const store = new MemoryKvStoreBackend();
    const mock = new MockRelayService();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      relayService: mock
    });

    const denied = await host.dispatchRaw(
      { id: "denied", namespace: "relay", method: "status", payload: {} },
      manifest,
      []
    );
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");

    await host.setGrants("relay-app", "publisher", ["relay:read", "relay:configure"], ["relay:read", "relay:configure"]);
    const status = await host.dispatchRaw(
      { id: "status", namespace: "relay", method: "status", payload: {} },
      manifest,
      ["relay:read"]
    );
    expect(status.ok).toBe(true);
    expect(status.result).toMatchObject({ mode: "off", onlineCount: 0 });

    const setMode = await host.dispatchRaw(
      { id: "mode", namespace: "relay", method: "setMode", payload: { mode: "bridge" } },
      manifest,
      ["relay:configure"]
    );
    expect(setMode.ok).toBe(true);
    expect(mock.mode).toBe("bridge");
  });
});
