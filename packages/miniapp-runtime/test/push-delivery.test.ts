import { describe, expect, it } from "vitest";
import {
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  type GrantKeyValueStore,
  type LaunchManifest,
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

function treeText(host: MiniappHost, appId: string): string {
  const snapshot = host.running().find((entry) => entry.appId === appId);
  const walk = (node: unknown): string => {
    if (node === null || typeof node !== "object") return "";
    const record = node as {
      props?: { value?: unknown };
      children?: unknown[];
    };
    const value =
      typeof record.props?.value === "string" ? record.props.value : "";
    return [value, ...(record.children ?? []).map(walk)].join(" ");
  };
  return snapshot?.widgetTree === null || snapshot === undefined
    ? ""
    : walk(snapshot.widgetTree.root);
}

function manifest(name: string, capabilities: string[]): LaunchManifest {
  return {
    name,
    version: "1.0.0",
    entry: "bundle.js",
    capabilities,
    publisherPublicKey: "publisher",
  };
}

describe("push delivery", () => {
  it("delivers lxmf.onMessage without polling, including across suspend", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
    });
    const sender = manifest("app-a", ["lxmf:send"]);
    const receiver = manifest("app-b", ["lxmf:receive"]);
    await host.setGrants("app-a", "publisher", sender.capabilities, [
      "lxmf:send",
    ]);
    await host.setGrants("app-b", "publisher", receiver.capabilities, [
      "lxmf:receive",
    ]);
    host.grantEgressOffer({
      appId: "app-a",
      capability: "lxmf:send",
      targetKind: "peer",
      targetId: "app-b",
      ttlMs: 60_000,
    });
    await host.launch(
      receiver,
      new TextEncoder().encode(`
sdk.lxmf.onMessage(async (message) => {
  await sdk.ui.render({
    root: { id: "root", type: "text", props: { value: message.body } }
  });
});
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "waiting" } }
});
`),
    );
    await waitUntil(() => treeText(host, "app-b").includes("waiting"));
    await host.launch(
      sender,
      new TextEncoder().encode(`
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "sender" } }
});
`),
    );
    await host.suspend();
    const sent = await host.dispatchRaw(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "app-b", subject: "hi", body: "pushed" },
      },
      sender,
      ["lxmf:send"],
    );
    expect(sent.ok).toBe(true);
    await host.resume();
    await waitUntil(() => treeText(host, "app-b").includes("pushed"));
    const drained = await host.dispatchRaw(
      {
        id: "2",
        namespace: "lxmf",
        method: "receive",
        capability: "lxmf:receive",
      },
      receiver,
      ["lxmf:receive"],
    );
    expect(drained.ok).toBe(true);
    expect(drained.result).toEqual(
      expect.arrayContaining([expect.objectContaining({ body: "pushed" })]),
    );
    await host.stopAll();
  });

  it("delivers announce.onEvent for a local publish", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
    });
    const app = manifest("announcer", [
      "announce:publish",
      "announce:subscribe",
    ]);
    await host.setGrants("announcer", "publisher", app.capabilities, [
      "announce:publish",
      "announce:subscribe",
    ]);
    await host.launch(
      app,
      new TextEncoder().encode(`
sdk.announce.onEvent(async () => {
  await sdk.ui.render({
    root: { id: "root", type: "text", props: { value: "heard" } }
  });
});
await sdk.ui.render({
  root: { id: "root", type: "text", props: { value: "waiting" } }
});
`),
    );
    await waitUntil(() => treeText(host, "announcer").includes("waiting"));
    const published = await host.dispatchRaw(
      {
        id: "1",
        namespace: "announce",
        method: "publish",
        capability: "announce:publish",
        payload: {},
      },
      app,
      ["announce:publish"],
    );
    expect(published.ok).toBe(true);
    await waitUntil(() => treeText(host, "announcer").includes("heard"));
    await host.stopAll();
  });
});
