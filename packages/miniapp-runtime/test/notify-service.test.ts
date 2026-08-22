import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
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
    if (Date.now() > deadline) throw new Error("timed out");
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
}

const manifest = {
  name: "notify-app",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["notify:post"],
  publisherPublicKey: "publisher",
};

describe("notify service", () => {
  it("posts an attributed notification and delivers the tap event", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
    });
    await host.setGrants("notify-app", "publisher", ["notify:post"], [
      "notify:post",
    ]);
    await host.launch(
      manifest,
      new TextEncoder().encode(`
sdk.ui.onEvent(async (event) => {
  await sdk.ui.render({
    root: { id: "root", type: "text", props: { value: event.event } }
  });
});
await sdk.notify.post({ title: "Hello", body: "from app", event: "ping" });
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "ready" } }
});
`),
    );
    await waitUntil(() => host.notifications().length === 1);
    const [notification] = host.notifications();
    expect(notification?.attributed).toBe(true);
    expect(notification?.appId).toBe("notify-app");
    expect(notification?.title).toBe("Hello");
    await host.tapNotification(notification!.id);
    await waitUntil(() =>
      JSON.stringify(host.snapshot().widgetTree).includes("ping"),
    );
    await host.stopAll();
  });

  it("enforces the per-host rate ceiling", async () => {
    const store = new MemoryStore();
    let now = 1_000;
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      now: () => now,
    });
    await host.setGrants("notify-app", "publisher", ["notify:post"], [
      "notify:post",
    ]);
    await host.launch(
      manifest,
      new TextEncoder().encode(`
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "ready" } }
});
`),
    );
    await waitUntil(() => host.snapshot().widgetTree !== null);
    const post = () =>
      host.dispatchRaw(
        {
          id: `n-${now}`,
          namespace: "notify",
          method: "post",
          capability: "notify:post",
          payload: { title: "n", body: "b", event: "e" },
        },
        manifest,
        ["notify:post"],
      );
    expect((await post()).ok).toBe(true);
    expect((await post()).ok).toBe(true);
    expect((await post()).ok).toBe(true);
    const limited = await post();
    expect(limited.ok).toBe(false);
    expect(limited.error?.code).toBe("NOTIFY_RATE_LIMITED");
    host.setNotifyEnabled("notify-app", false);
    now += 30_000;
    const disabled = await post();
    expect(disabled.ok).toBe(false);
    expect(disabled.error?.code).toBe("NOTIFY_DISABLED");
    await host.stopAll();
  });
});
