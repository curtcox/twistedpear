import { describe, expect, it } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  CapabilityError,
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  assertCapabilityAllowed,
  type GrantKeyValueStore,
  type MiniappCapability
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

const helloBundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [
      { id: "title", type: "text", props: { value: "Hello" } }
    ]
  }
});
`);

const manifest = {
  name: "hello",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: [] as string[],
  publisherPublicKey: "publisher"
};

async function waitUntil(condition: () => boolean, timeoutMs = 2_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (!condition()) {
    if (Date.now() >= deadline) {
      throw new Error("Timed out waiting for sandbox output");
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}

describe("grant matrix", () => {
  const capabilities = CAPABILITY_DEFINITIONS.map((entry) => entry.id);

  for (const capability of capabilities) {
    it(`denies ${capability} when undeclared`, () => {
      expect(() =>
        assertCapabilityAllowed({
          capability,
          declared: [],
          granted: [capability]
        })
      ).toThrow(CapabilityError);
    });

    it(`denies ${capability} when declared but not granted`, () => {
      expect(() =>
        assertCapabilityAllowed({
          capability,
          declared: [capability],
          granted: []
        })
      ).toThrow(CapabilityError);
    });
  }

  it("allows declared and granted capabilities", () => {
    for (const capability of capabilities) {
      expect(
        assertCapabilityAllowed({
          capability,
          declared: [capability],
          granted: [capability]
        })
      ).toBe(capability);
    }
  });
});

describe("mini-app host", () => {
  it("does not report healthy watchdog pings as lifecycle changes", async () => {
    const store = new MemoryStore();
    const lifecycleStates: string[] = [];
    let alive = true;
    const host = new MiniappHost({
      backend: {
        name: "healthy-watchdog-test",
        async spawn() {
          alive = true;
          return {
            id: "healthy-watchdog-instance",
            async postMessage() {},
            async ping() {
              return true;
            },
            isAlive() {
              return alive;
            },
            async kill() {
              alive = false;
            }
          };
        }
      },
      grantStore: new GrantStore(store),
      kvBackend: store,
      callbacks: {
        onLifecycle: (snapshot) => {
          lifecycleStates.push(snapshot.state);
        }
      }
    });

    await host.launch(manifest, helloBundle);
    expect(lifecycleStates).toEqual(["running"]);

    await host.watchdogPing();
    await host.watchdogPing();
    expect(lifecycleStates).toEqual(["running"]);

    await host.stop();
    expect(lifecycleStates).toEqual(["running", "stopped"]);
  });

  it("launches a hello bundle and renders a widget tree", async () => {
    const store = new MemoryStore();
    let tree: unknown = null;
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      callbacks: {
        onWidgetTree: (next) => {
          tree = next;
        }
      }
    });

    const snapshot = await host.launch(manifest, helloBundle);
    await waitUntil(() => tree !== null);
    await host.stop();

    expect(snapshot.appId).toBe("hello");
    expect(tree).toMatchObject({
      root: {
        id: "root",
        type: "view"
      }
    });
  });

  it("streams AI deltas through the broker into the sandbox", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    const aiManifest = { ...manifest, name: "stream-app", capabilities: ["ai:chat"] };
    await grants.set("stream-app", "publisher", ["ai:chat"], ["ai:chat"], 1);
    const bundle = new TextEncoder().encode(`import { ai, ui } from "@twistedpear/miniapp-sdk";
let text = "";
for await (const event of ai.chatStream({ messages: [{ role: "user", content: "hi" }] })) {
  if (event.type === "delta") text += event.delta;
}
await ui.render({ root: { id: "root", type: "text", props: { value: text } } });
`);
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: store,
      aiBackend: {
        chat: async () => ({ message: { role: "assistant", content: "hello" }, model: "m", usage: null }),
        stream: async function* () {
          yield { delta: "hel", model: "m" };
          yield { delta: "lo" };
        }
      }
    });

    await host.launch(aiManifest, bundle);
    await waitUntil(() => host.snapshot().widgetTree?.root.props?.value === "hello");
    expect(host.snapshot().widgetTree?.root.props?.value).toBe("hello");
    await host.stop();
  });

  it("embeds and ranks documents through the separately granted broker surface", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    const aiManifest = { ...manifest, name: "search-app", capabilities: ["ai:embed"] };
    await grants.set("search-app", "publisher", ["ai:embed"], ["ai:embed"], 1);
    const bundle = new TextEncoder().encode(`import { ai, ui } from "@twistedpear/miniapp-sdk";
const result = await ai.search({ query: "pear", documents: [{ id: "a", text: "apple" }, { id: "b", text: "pear" }], limit: 1 });
await ui.render({ root: { id: "root", type: "text", props: { value: result.matches[0].id } } });
`);
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: store,
      aiBackend: {
        chat: async () => ({ message: { role: "assistant", content: "" }, model: "m", usage: null }),
        embed: async (_appId, request) => ({
          vectors: request.inputs.map((input) => input === "apple" ? [0, 1] : [1, 0]),
          model: "embed/model",
          usage: null
        })
      }
    });
    await host.launch(aiManifest, bundle);
    await waitUntil(() => host.snapshot().widgetTree?.root.props?.value === "b");
    expect(host.snapshot().widgetTree?.root.props?.value).toBe("b");
    await host.stop();
  });

  it("fails broker calls after grant revocation on the next dispatch", async () => {
    const store = new MemoryStore();
    const grants = new GrantStore(store);
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: grants,
      kvBackend: store
    });

    await grants.set("app", "publisher", ["storage:kv"], ["storage:kv"], 1_000);
    const allowed = await host.dispatchRaw(
      { id: "1", namespace: "storage.kv", method: "set", capability: "storage:kv", payload: { key: "a", value: new Uint8Array([1]) } },
      { name: "app", version: "1.0.0", entry: "bundle.js", capabilities: ["storage:kv"], publisherPublicKey: "publisher" },
      ["storage:kv"]
    );
    expect(allowed.ok).toBe(true);

    await grants.revoke("app", "publisher", "storage:kv" as MiniappCapability, 1_001);
    const denied = await host.dispatchRaw(
      { id: "2", namespace: "storage.kv", method: "set", capability: "storage:kv", payload: { key: "b", value: new Uint8Array([2]) } },
      { name: "app", version: "1.0.0", entry: "bundle.js", capabilities: ["storage:kv"], publisherPublicKey: "publisher" },
      ["storage:kv"]
    );
    expect(denied.ok).toBe(false);
    expect(denied.error?.code).toBe("CAPABILITY_DENIED");
  });

  it("delivers UI events into the sandbox", async () => {
    const interactiveBundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

let label = "waiting";

async function paint() {
  await ui.render({
    root: {
      id: "root",
      type: "view",
      children: [
        { id: "tap", type: "button", props: { label, event: "demo.tap" } }
      ]
    }
  });
}

ui.onEvent(async ({ event }) => {
  if (event === "demo.tap") {
    label = "tapped";
    await paint();
  }
});

await paint();
`);

    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store
    });

    await host.launch(manifest, interactiveBundle);
    await waitUntil(() => host.snapshot().widgetTree?.root.children?.some((node) => node.id === "tap") === true);
    await host.handleUiEvent("tap", "demo.tap");
    await waitUntil(
      () => host.snapshot().widgetTree?.root.children?.find((node) => node.id === "tap")?.props?.label === "tapped"
    );

    const tree = host.snapshot().widgetTree;
    await host.stop();

    const button = tree?.root.children?.find((node) => node.id === "tap");
    expect(button?.props?.label).toBe("tapped");
  });

  it("rejects UI events for nodes that were never rendered", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store
    });

    await host.launch(manifest, helloBundle);
    await waitUntil(() => host.snapshot().widgetTree !== null);
    await expect(host.handleUiEvent("missing-node", "tap")).rejects.toThrow("Unknown widget node");
    await host.stop();
  });

  it("computes widget patches between renders", async () => {
    const patches: unknown[] = [];
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      callbacks: {
        onWidgetTree: (_tree, nextPatches) => {
          patches.push(nextPatches);
        }
      }
    });

    await host.launch(manifest, helloBundle);
    await waitUntil(() => patches.length > 0);
    await host.dispatchRaw(
      {
        id: "render-2",
        namespace: "ui",
        method: "render",
        payload: {
          tree: {
            root: {
              id: "root",
              type: "view",
              children: [{ id: "title", type: "text", props: { value: "Updated" } }]
            }
          }
        }
      },
      manifest,
      []
    );
    await host.stop();

    expect(patches.length).toBeGreaterThanOrEqual(2);
    expect(patches.some((entry) => Array.isArray(entry) && entry.length > 0)).toBe(true);
  });
});
