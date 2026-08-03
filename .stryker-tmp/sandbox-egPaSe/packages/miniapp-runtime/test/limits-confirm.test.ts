// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  ConfirmationError,
  GrantStore,
  MiniappBroker,
  MiniappHost,
  NodeWorkerSandboxBackend,
  requestHostConfirmation,
  type BrokerContext,
  type ConfirmationRequest,
  type GrantKeyValueStore
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

const context: BrokerContext = {
  appId: "hello",
  publisherPublicKey: "publisher",
  declaredCapabilities: [],
  grantedCapabilities: []
};

function pingRequest(id: number) {
  return { id: `r${id}`, namespace: "test", method: "ping" };
}

describe("dynamic broker rate limits", () => {
  function brokerWithClock() {
    let nowValue = 1_000;
    const broker = new MiniappBroker({ maxMessagesPerSecond: 5, now: () => nowValue });
    broker.register("test", "ping", null, () => "pong");
    return { broker, advance: (ms: number) => (nowValue += ms) };
  }

  it("enforces the constructor default", async () => {
    const { broker } = brokerWithClock();
    for (let index = 0; index < 5; index += 1) {
      expect((await broker.dispatch(pingRequest(index), context)).ok).toBe(true);
    }

    const denied = await broker.dispatch(pingRequest(6), context);
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("RATE_LIMITED");
  });

  it("applies a live per-app override", async () => {
    const { broker, advance } = brokerWithClock();
    broker.setRateLimit("hello", 2);
    expect(broker.getRateLimit("hello")).toBe(2);

    expect((await broker.dispatch(pingRequest(1), context)).ok).toBe(true);
    expect((await broker.dispatch(pingRequest(2), context)).ok).toBe(true);
    const denied = await broker.dispatch(pingRequest(3), context);
    expect(denied.error?.code).toBe("RATE_LIMITED");

    advance(1_100);
    broker.setRateLimit("hello", null);
    expect(broker.getRateLimit("hello")).toBe(5);
    expect((await broker.dispatch(pingRequest(4), context)).ok).toBe(true);
  });

  it("rejects invalid rate values", () => {
    const { broker } = brokerWithClock();
    expect(() => broker.setRateLimit("hello", 0)).toThrow(RangeError);
    expect(() => broker.setRateLimit("hello", Number.NaN)).toThrow(RangeError);
  });
});

describe("host resource limits", () => {
  const manifest = {
    name: "hello",
    version: "1.0.0",
    entry: "bundle.js",
    capabilities: ["storage:kv"],
    publisherPublicKey: "publisher"
  };

  function makeHost(store = new MemoryStore()) {
    return {
      store,
      host: new MiniappHost({
        backend: new NodeWorkerSandboxBackend(),
        grantStore: new GrantStore(store),
        kvBackend: store
      })
    };
  }

  it("reports defaults when nothing is overridden", () => {
    const { host } = makeHost();
    const limits = host.getResourceLimits("hello");
    expect(limits.maxMessagesPerSecond).toBe(128);
    expect(limits.kvQuotaBytes).toBeNull();
    expect(limits.memoryBytes).toBeNull();
    expect(limits.memoryPendingRestart).toBe(false);
  });

  it("applies a kv quota shrink to the next storage call", async () => {
    const { host, store } = makeHost();
    await new GrantStore(store).set("hello", "publisher", manifest.capabilities, ["storage:kv"], 1_000);

    const write = (id: string, size: number) =>
      host.dispatchRaw(
        {
          id,
          namespace: "storage.kv",
          method: "set",
          payload: { key: "doc", value: new Uint8Array(size) }
        },
        manifest,
        ["storage:kv"]
      );

    expect((await write("w1", 128)).ok).toBe(true);

    host.setResourceLimits("hello", { kvQuotaBytes: 64 });
    const denied = await write("w2", 128);
    expect(denied.ok).toBe(false);
    expect(denied.error?.message).toContain("quota");

    host.setResourceLimits("hello", { kvQuotaBytes: null });
    expect((await write("w3", 128)).ok).toBe(true);
  });

  it("marks memory limits as pending restart while the app runs", async () => {
    const { host, store } = makeHost();
    await new GrantStore(store).set("hello", "publisher", manifest.capabilities, ["storage:kv"], 1_000);
    const bundle = new TextEncoder().encode("export {};\n");

    await host.launch(manifest, bundle);
    const limits = host.setResourceLimits("hello", { memoryBytes: 64 * 1024 * 1024 });
    expect(limits.memoryBytes).toBe(64 * 1024 * 1024);
    expect(limits.memoryPendingRestart).toBe(true);

    await host.stop();
    expect(host.getResourceLimits("hello").memoryPendingRestart).toBe(false);
  });

  it("rejects invalid limit values", () => {
    const { host } = makeHost();
    expect(() => host.setResourceLimits("hello", { kvQuotaBytes: -1 })).toThrow(RangeError);
    expect(() => host.setResourceLimits("hello", { memoryBytes: 0 })).toThrow(RangeError);
  });

  it("does not expose any limits method through the broker", async () => {
    const { host } = makeHost();
    const response = await host.dispatchRaw(
      { id: "x", namespace: "limits", method: "set", payload: { maxMessagesPerSecond: 100_000 } },
      manifest,
      ["storage:kv"]
    );
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("UNKNOWN_METHOD");
  });
});

describe("host confirmation channel", () => {
  const request = {
    kind: "publish" as const,
    appId: "devstudio",
    publisherPublicKey: "publisher",
    summary: { name: "hello", version: "1.0.0" }
  };

  let tokenCounter = 0;
  const effects = {
    randomBytes: (length: number) => {
      tokenCounter += 1;
      const bytes = new Uint8Array(length);
      bytes.fill(tokenCounter & 0xff);
      bytes[0] = tokenCounter;
      return bytes;
    },
    delay: (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))
  };

  it("denies when no channel is configured", async () => {
    await expect(requestHostConfirmation(undefined, request, effects)).rejects.toMatchObject({
      code: "CONFIRMATION_UNAVAILABLE"
    });
  });

  it("propagates a denial", async () => {
    const channel = { confirm: async () => ({ approved: false }) };
    await expect(requestHostConfirmation(channel, request, effects)).rejects.toMatchObject({
      code: "CONFIRMATION_DENIED"
    });
  });

  it("returns an approval and issues unique host-side tokens", async () => {
    const seen: ConfirmationRequest[] = [];
    const channel = {
      confirm: async (incoming: ConfirmationRequest) => {
        seen.push(incoming);
        return { approved: true };
      }
    };

    await requestHostConfirmation(channel, request, effects);
    await requestHostConfirmation(channel, request, effects);
    expect(seen).toHaveLength(2);
    expect(seen[0]?.token).toMatch(/^[0-9a-f]{32}$/);
    expect(seen[0]?.token).not.toBe(seen[1]?.token);
    expect(seen[0]?.summary).toEqual(request.summary);
  });

  it("times out into a denial", async () => {
    const channel = { confirm: () => new Promise<never>(() => {}) };
    await expect(requestHostConfirmation(channel, request, effects, 20)).rejects.toMatchObject({
      code: "CONFIRMATION_TIMEOUT"
    });
  });

  it("exposes a typed error", () => {
    const error = new ConfirmationError("CONFIRMATION_DENIED", "no");
    expect(error.name).toBe("ConfirmationError");
  });
});
