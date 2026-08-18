import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
  type LaunchManifest,
  type MiniappHostOptions,
  type SandboxBackend,
  type SandboxInstance,
} from "../src/index.js";
import { grantTtlMsForCapabilities } from "../src/grant-ttl.js";

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

function textBundle(source: string): Uint8Array {
  return new TextEncoder().encode(source);
}

function helloBundle(label: string): Uint8Array {
  return textBundle(`import { ui } from "@twistedpear/miniapp-sdk";
await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [
      { id: "title", type: "text", props: { value: ${JSON.stringify(label)} } }
    ]
  }
});
`);
}

async function grantCapabilities(
  grants: GrantStore,
  appIds: ReadonlyArray<string>,
  capability: string,
): Promise<void> {
  const now = Date.now();
  const ttlMs = grantTtlMsForCapabilities([capability]);
  for (const appId of appIds) {
    await grants.set({
      appId,
      publisherPublicKey: "publisher",
      declared: [capability],
      requestedGrants: [capability],
      now,
      ttlMs,
    });
  }
}

function manifestFor(
  name: string,
  capabilities: ReadonlyArray<string> = [],
): LaunchManifest {
  return {
    name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities,
    publisherPublicKey: "publisher",
  };
}

async function waitUntil(
  condition: () => boolean,
  timeoutMs = 2_000,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for sandbox output");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

function mockBackend(ping: (appId: string) => boolean): SandboxBackend {
  return {
    name: "concurrent-mock",
    async spawn(options): Promise<SandboxInstance> {
      let alive = true;
      return {
        id: options.appId,
        async postMessage() {},
        async ping() {
          return alive && ping(options.appId);
        },
        isAlive() {
          return alive && ping(options.appId);
        },
        async kill() {
          alive = false;
        },
      };
    },
  };
}

async function createHost(
  overrides: Partial<MiniappHostOptions> = {},
): Promise<{ host: MiniappHost; store: MemoryStore }> {
  const store = new MemoryStore();
  const host = new MiniappHost({
    backend: new NodeWorkerSandboxBackend(),
    grantStore: new GrantStore(store),
    kvBackend: store,
    ...overrides,
  });
  return { host, store };
}

describe("concurrent mini-apps", () => {
  it("keeps the first app running when a second launches", async () => {
    const { host } = await createHost();
    await host.launch(manifestFor("alpha"), helloBundle("alpha"));
    await waitUntil(
      () =>
        host.snapshot().widgetTree?.root.children?.[0]?.props?.value ===
        "alpha",
    );
    await host.launch(manifestFor("beta"), helloBundle("beta"));
    await waitUntil(
      () =>
        host.snapshot().widgetTree?.root.children?.[0]?.props?.value === "beta",
    );

    expect(host.snapshot().appId).toBe("beta");
    expect(
      host
        .running()
        .map((item) => item.appId)
        .sort(),
    ).toEqual(["alpha", "beta"]);
    expect(host.running().find((item) => item.appId === "alpha")?.state).toBe(
      "running",
    );

    const switched = host.switchForeground("alpha");
    expect(switched.appId).toBe("alpha");
    expect(switched.widgetTree?.root.children?.[0]?.props?.value).toBe("alpha");
    expect(host.snapshot().appId).toBe("alpha");

    await host.stop();
    expect(host.snapshot().appId).toBe("beta");
    expect(host.running()).toHaveLength(1);

    await host.stopAll();
    expect(host.running()).toHaveLength(0);
    expect(host.snapshot().state).toBe("stopped");
  });

  it("isolates kv writes and rate limits per app", async () => {
    const { store } = await createHost();
    const grants = new GrantStore(store);
    await grantCapabilities(grants, ["alpha", "beta"], "storage:kv");
    const kvHost = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: store,
    });
    const kvBundle = (value: string) =>
      textBundle(`import { storage, ui } from "@twistedpear/miniapp-sdk";
await storage.kv.set("note", new TextEncoder().encode(${JSON.stringify(value)}));
const got = await storage.kv.get("note");
await ui.render({
  root: {
    id: "root",
    type: "text",
    props: { value: new TextDecoder().decode(got) },
  },
});
`);
    await kvHost.launch(
      manifestFor("alpha", ["storage:kv"]),
      kvBundle("from-alpha"),
    );
    await kvHost.launch(
      manifestFor("beta", ["storage:kv"]),
      kvBundle("from-beta"),
    );
    await waitUntil(
      () => kvHost.snapshot().widgetTree?.root.props?.value === "from-beta",
    );
    kvHost.switchForeground("alpha");
    await waitUntil(
      () => kvHost.snapshot().widgetTree?.root.props?.value === "from-alpha",
    );
    expect(kvHost.getResourceLimits("alpha").maxMessagesPerSecond).toBe(
      kvHost.getResourceLimits("beta").maxMessagesPerSecond,
    );
    kvHost.setResourceLimits("alpha", { maxMessagesPerSecond: 3 });
    expect(kvHost.getResourceLimits("alpha").maxMessagesPerSecond).toBe(3);
    expect(kvHost.getResourceLimits("beta").maxMessagesPerSecond).not.toBe(3);
    await kvHost.stopAll();
  });

  it("kills a wedged app without taking the other session", async () => {
    const alive = new Map<string, boolean>([
      ["alpha", true],
      ["beta", true],
    ]);
    const host = new MiniappHost({
      backend: mockBackend((appId) => alive.get(appId) === true),
      grantStore: new GrantStore(new MemoryStore()),
      kvBackend: new MemoryStore(),
    });

    await host.launch(manifestFor("alpha"), helloBundle("alpha"));
    await host.launch(manifestFor("beta"), helloBundle("beta"));
    expect(host.running()).toHaveLength(2);

    alive.set("alpha", false);
    await host.watchdogPing();

    expect(host.running().map((item) => item.appId)).toEqual(["beta"]);
    expect(host.snapshot().appId).toBe("beta");
    await host.stopAll();
  });

  it("refuses user-visible confirmations from a background app", async () => {
    const confirmations: string[] = [];
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    await grantCapabilities(grants, ["alpha", "beta"], "apps:package");
    const host = new MiniappHost({
      backend: mockBackend(() => true),
      grantStore: grants,
      kvBackend: store,
      confirmationChannel: {
        async confirm(request) {
          confirmations.push(request.appId);
          return { approved: true };
        },
      },
      appsBackend: {
        package: async () => ({
          packageHash: "hash",
          size: 1,
          t256: "packaged",
        }),
        publish: async () => ({
          t256: "published",
          driveKey: "drive",
          version: "1.0.0",
        }),
        install: async () => ({
          appId: "x",
          version: "1.0.0",
          trusted: false,
        }),
        preview: async () => ({ launched: true }),
        stopPreview: async () => {},
      },
    });

    const packManifest = (name: string): LaunchManifest =>
      manifestFor(name, ["apps:package"]);
    const packPayload = (name: string) => ({
      projectPrefix: "src",
      manifest: {
        name,
        version: "1.0.0",
        entry: "bundle.js",
        capabilities: ["apps:package"],
      },
    });
    await host.launch(packManifest("alpha"), helloBundle("alpha"));
    await host.launch(packManifest("beta"), helloBundle("beta"));

    const background = await host.dispatchRaw(
      {
        id: "pkg-alpha",
        namespace: "apps",
        method: "package",
        payload: packPayload("alpha"),
      },
      packManifest("alpha"),
      ["apps:package"],
    );
    expect(background.ok).toBe(false);
    expect(background.error?.code).toBe("FOREGROUND_REQUIRED");
    expect(confirmations).toEqual([]);

    const foreground = await host.dispatchRaw(
      {
        id: "pkg-beta",
        namespace: "apps",
        method: "package",
        payload: packPayload("beta"),
      },
      packManifest("beta"),
      ["apps:package"],
    );
    expect(foreground.ok).toBe(true);
    expect(confirmations).toEqual(["beta"]);
    await host.stopAll();
  });
});
