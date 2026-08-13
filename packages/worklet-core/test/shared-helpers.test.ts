import { afterEach, describe, expect, it, vi } from "vitest";
import { createStatusTimer } from "../src/status-timer.mjs";
import {
  catalogEntryView,
  createPeerSessionManagerProxy,
  createPeerSessionManagerProxyFromState,
  createRuntimeKeyValueStore,
  peerServiceAspect,
  sleep,
} from "../src/worklet-entry-shared-helpers.mjs";

afterEach(() => {
  vi.useRealTimers();
});

describe("sleep", () => {
  it("resolves after the requested delay", async () => {
    vi.useFakeTimers();
    let done = false;
    const pending = sleep(25).then(() => {
      done = true;
    });

    await vi.advanceTimersByTimeAsync(24);
    expect(done).toBe(false);

    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(done).toBe(true);
  });
});

describe("catalogEntryView", () => {
  it("projects exactly the published catalog fields", () => {
    const entry = {
      appId: "hello",
      name: "Hello",
      version: "1.0.0",
      publisherPublicKey: "pub",
      packageSize: 128,
      packageHash: "hash",
      driveKey: "drive",
      resourceAvailable: true,
      receivedAt: 1234,
      secretInternalField: "nope",
    };

    expect(catalogEntryView(entry)).toEqual({
      appId: "hello",
      name: "Hello",
      version: "1.0.0",
      publisherPublicKey: "pub",
      packageSize: 128,
      packageHash: "hash",
      driveKey: "drive",
      resourceAvailable: true,
      receivedAt: 1234,
    });
  });

  it("keeps absent fields undefined rather than dropping them", () => {
    expect(Object.keys(catalogEntryView({ appId: "x" }))).toEqual([
      "appId",
      "name",
      "version",
      "publisherPublicKey",
      "packageSize",
      "packageHash",
      "driveKey",
      "resourceAvailable",
      "receivedAt",
    ]);
  });
});

describe("peerServiceAspect", () => {
  it("is the hex of the first 16 bytes of the service-name digest", () => {
    const digest = new Uint8Array(32).map((_byte, index) => index);
    const provider = { sha256: () => digest };

    expect(peerServiceAspect(provider, "chat")).toBe(
      "000102030405060708090a0b0c0d0e0f",
    );
  });

  it("hashes the UTF-8 encoding of the service name", () => {
    const seen: Uint8Array[] = [];
    const provider = {
      sha256: (input: Uint8Array) => {
        seen.push(input);
        return new Uint8Array(32);
      },
    };

    peerServiceAspect(provider, "chat");
    expect(seen).toEqual([new TextEncoder().encode("chat")]);
  });
});

describe("createRuntimeKeyValueStore", () => {
  function harness() {
    const values = new Map<string, unknown>();
    const keys = new Set<string>();
    const runtime = {
      store: {
        get: async (key: string) => values.get(key),
        set: async (key: string, value: unknown) => {
          values.set(key, value);
        },
        delete: async (key: string) => {
          values.delete(key);
        },
      },
    };
    return { store: createRuntimeKeyValueStore(runtime, keys), keys, values };
  }

  it("normalizes a missing value to null", async () => {
    const { store } = harness();
    await expect(store.get("absent")).resolves.toBeNull();
  });

  it("round-trips a value and tracks its key", async () => {
    const { store, keys } = harness();
    await store.set("a", 1);

    await expect(store.get("a")).resolves.toBe(1);
    expect([...keys]).toEqual(["a"]);
  });

  it("forgets the key on delete", async () => {
    const { store, keys, values } = harness();
    await store.set("a", 1);
    await store.delete("a");

    expect([...keys]).toEqual([]);
    expect(values.has("a")).toBe(false);
  });

  it("lists every key by default and filters by prefix", async () => {
    const { store } = harness();
    await store.set("app:a", 1);
    await store.set("app:b", 2);
    await store.set("other", 3);

    await expect(store.list()).resolves.toEqual(["app:a", "app:b", "other"]);
    await expect(store.list("app:")).resolves.toEqual(["app:a", "app:b"]);
  });
});

const MANAGER_CALLS = {
  request: async () => "request",
  listen: async () => "listen",
  diagnostics: async () => "diagnostics",
  list: () => ["handle"],
  route: () => "route",
  info: () => "info",
  close: async () => {},
  closeRuntime: async () => {},
};

describe("createPeerSessionManagerProxy", () => {
  it("routes the async calls through the ensure hook", async () => {
    let ensured = 0;
    const ensure = Object.assign(
      async () => {
        ensured += 1;
        return MANAGER_CALLS;
      },
      { peek: () => MANAGER_CALLS },
    );
    const proxy = createPeerSessionManagerProxy(ensure);

    await expect(proxy.request("app", "rt", {})).resolves.toBe("request");
    await expect(proxy.listen("app", "rt", {})).resolves.toBe("listen");
    await expect(proxy.diagnostics()).resolves.toBe("diagnostics");
    expect(ensured).toBe(3);
  });

  it("answers the synchronous calls from the peeked manager", () => {
    const ensure = Object.assign(async () => MANAGER_CALLS, {
      peek: () => MANAGER_CALLS,
    });
    const proxy = createPeerSessionManagerProxy(ensure);

    expect(proxy.route("app", "h")).toBe("route");
    expect(proxy.info("app", "rt", "h")).toBe("info");
  });

  it("degrades gracefully when no manager has been started", async () => {
    const proxy = createPeerSessionManagerProxy(async () => MANAGER_CALLS);

    expect(proxy.list()).toEqual([]);
    expect(proxy.route("app", "h")).toBeUndefined();
    expect(() => proxy.info("app", "rt", "h")).toThrow("Unknown peer handle");
    await expect(proxy.close("app", "rt", "h")).resolves.toBeUndefined();
    await expect(proxy.closeRuntime("app", "rt")).resolves.toBeUndefined();
  });

  it("closes through the peeked manager when one exists", async () => {
    const closed: string[] = [];
    const manager = {
      ...MANAGER_CALLS,
      close: async () => {
        closed.push("close");
      },
      closeRuntime: async () => {
        closed.push("closeRuntime");
      },
    };
    const ensure = Object.assign(async () => manager, { peek: () => manager });
    const proxy = createPeerSessionManagerProxy(ensure);

    await proxy.close("app", "rt", "h");
    await proxy.closeRuntime("app", "rt");
    expect(closed).toEqual(["close", "closeRuntime"]);
  });
});

describe("createPeerSessionManagerProxyFromState", () => {
  function proxyOver(manager: typeof MANAGER_CALLS | null) {
    return createPeerSessionManagerProxyFromState({
      getManager: () => manager,
      ensurePeerSessionManager: async () => MANAGER_CALLS,
    });
  }

  it("routes the async calls through the ensure hook", async () => {
    const proxy = proxyOver(null);

    await expect(proxy.request("app", "rt", {})).resolves.toBe("request");
    await expect(proxy.listen("app", "rt", {})).resolves.toBe("listen");
    await expect(proxy.diagnostics()).resolves.toBe("diagnostics");
  });

  it("answers the synchronous calls from the current manager", () => {
    const proxy = proxyOver(MANAGER_CALLS);

    expect(proxy.list("app")).toEqual(["handle"]);
    expect(proxy.route("app", "h")).toBe("route");
    expect(proxy.info("app", "rt", "h")).toBe("info");
  });

  it("degrades gracefully when the manager is absent", async () => {
    const proxy = proxyOver(null);

    expect(proxy.list("app")).toEqual([]);
    expect(proxy.route("app", "h")).toBeUndefined();
    expect(() => proxy.info("app", "rt", "h")).toThrow("Unknown peer handle");
    await expect(proxy.close("app", "rt", "h")).resolves.toBeUndefined();
    await expect(proxy.closeRuntime("app", "rt")).resolves.toBeUndefined();
  });
});

describe("createStatusTimer", () => {
  it("starts once, ticks on the interval, and stops", () => {
    vi.useFakeTimers();
    let ticks = 0;
    const timer = createStatusTimer({
      onTick: () => {
        ticks += 1;
      },
      intervalMs: 100,
    });

    expect(timer.isRunning()).toBe(false);
    timer.stop();

    timer.start();
    timer.start();
    expect(timer.isRunning()).toBe(true);

    vi.advanceTimersByTime(250);
    expect(ticks).toBe(2);

    timer.stop();
    expect(timer.isRunning()).toBe(false);
    vi.advanceTimersByTime(500);
    expect(ticks).toBe(2);
  });

  it("defaults to a one-second interval", () => {
    vi.useFakeTimers();
    let ticks = 0;
    const timer = createStatusTimer({
      onTick: () => {
        ticks += 1;
      },
    });
    timer.start();

    vi.advanceTimersByTime(999);
    expect(ticks).toBe(0);

    vi.advanceTimersByTime(1);
    expect(ticks).toBe(1);
    timer.stop();
  });
});
