import { describe, expect, it } from "vitest";
import {
  DIAGNOSTICS_RING_CAPACITY,
  DiagnosticsRing,
  GrantStore,
  MiniappBroker,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type BrokerAuditEntry,
  type GrantKeyValueStore,
} from "../src/index.js";

class MemoryStore implements GrantKeyValueStore {
  readonly values = new Map<string, Uint8Array>();

  async get(key: string): Promise<Uint8Array | null> {
    return this.values.get(key) ?? null;
  }

  async set(key: string, value: Uint8Array): Promise<void> {
    this.values.set(key, value);
  }

  async delete(key: string): Promise<void> {
    this.values.delete(key);
  }

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

async function waitUntil(
  condition: () => boolean,
  timeoutMs = 3_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for diagnostics");
    }
    await new Promise((resolve) => setTimeout(resolve, 15));
  }
}

describe("diagnostics ring", () => {
  it("drops oldest entries and retains the drop count", () => {
    const ring = new DiagnosticsRing(() => 1, 3, 32);
    ring.push("app", "log", "one");
    ring.push("app", "log", "two");
    ring.push("app", "log", "three");
    ring.push("app", "warn", "four");
    const snapshot = ring.snapshot();
    expect(snapshot.entries.map((entry) => entry.message)).toEqual([
      "two",
      "three",
      "four",
    ]);
    expect(snapshot.dropped).toBe(1);
    expect(snapshot.entries[0]?.authored).toBe(true);
  });

  it("truncates oversized lines", () => {
    const ring = new DiagnosticsRing(() => 1, 10, 8);
    ring.push("app", "log", "abcdefghijklmnop");
    expect(ring.snapshot().entries[0]?.message.length).toBeLessThanOrEqual(8);
  });

  it("floods console without tripping the broker rate limiter", async () => {
    const store = new MemoryStore();
    const audit: BrokerAuditEntry[] = [];
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      brokerAudit: (entry) => audit.push(entry),
    });
    host.setResourceLimits("log-app", { maxMessagesPerSecond: 2 });
    const flood = DIAGNOSTICS_RING_CAPACITY + 40;
    const bundle = new TextEncoder().encode(`
await sdk.ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "go", type: "button", props: { label: "Go", event: "ping" } }]
  }
});
sdk.ui.onEvent(() => {});
for (let i = 0; i < ${flood}; i++) console.log("flood-" + i);
`);
    try {
      await host.launch(
        {
          name: "log-app",
          version: "1.0.0",
          entry: "bundle.js",
          capabilities: [],
          publisherPublicKey: "publisher",
        },
        bundle,
      );
      await waitUntil(
        () => host.diagnostics("log-app").dropped >= 40,
        4_000,
      );
      const before = audit.filter((entry) => entry.outcome === "allowed").length;
      await host.handleUiEvent("go", "ping");
      const after = audit.filter((entry) => entry.outcome === "allowed").length;
      expect(after).toBe(before + 1);
      expect(
        audit.some((entry) => entry.error?.code === "RATE_LIMITED"),
      ).toBe(false);
      const ring = host.diagnostics("log-app");
      expect(ring.entries).toHaveLength(DIAGNOSTICS_RING_CAPACITY);
      expect(ring.dropped).toBeGreaterThanOrEqual(40);
      expect(ring.entries[0]?.message.startsWith("flood-")).toBe(true);
    } finally {
      await host.stop();
    }
  });

  it("does not expose the ring on the broker", () => {
    const broker = new MiniappBroker({ now: () => 1 });
    expect(broker.capabilityFor("diagnostics", "read")).toBeUndefined();
    expect(broker.capabilityFor("console", "log")).toBeUndefined();
  });
});
