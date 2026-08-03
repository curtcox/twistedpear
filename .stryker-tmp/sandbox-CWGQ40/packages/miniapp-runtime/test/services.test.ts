// @ts-nocheck
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  CorestoreBeeBackend,
  GrantStore,
  MiniappHost,
  NodeWorkerSandboxBackend,
  StorageBeeQuotaError,
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

const manifestA = {
  name: "app-a",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["storage:kv", "lxmf:send", "lxmf:receive", "storage:hyperbee"],
  publisherPublicKey: "publisher-a"
};

const manifestB = {
  name: "app-b",
  version: "1.0.0",
  entry: "bundle.js",
  capabilities: ["storage:kv", "lxmf:send", "lxmf:receive", "storage:hyperbee"],
  publisherPublicKey: "publisher-b"
};

describe("broker services", () => {
  it("isolates KV storage between apps", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store
    });

    await host.setGrants("app-a", "publisher-a", manifestA.capabilities, ["storage:kv"]);
    await host.setGrants("app-b", "publisher-b", manifestB.capabilities, ["storage:kv"]);

    const setA = await host.dispatchRaw(
      { id: "1", namespace: "storage.kv", method: "set", capability: "storage:kv", payload: { key: "secret", value: new Uint8Array([1]) } },
      manifestA,
      ["storage:kv"]
    );
    expect(setA.ok).toBe(true);

    const readB = await host.dispatchRaw(
      { id: "2", namespace: "storage.kv", method: "get", capability: "storage:kv", payload: { key: "secret" } },
      manifestB,
      ["storage:kv"]
    );
    expect(readB.ok).toBe(true);
    expect(readB.result).toBeNull();
  });

  it("isolates LXMF inboxes between apps", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store
    });

    await host.setGrants("app-a", "publisher-a", manifestA.capabilities, ["lxmf:send", "lxmf:receive"]);
    await host.setGrants("app-b", "publisher-b", manifestB.capabilities, ["lxmf:send", "lxmf:receive"]);

    const sent = await host.dispatchRaw(
      {
        id: "1",
        namespace: "lxmf",
        method: "send",
        capability: "lxmf:send",
        payload: { to: "app-b", subject: "hello", body: "from A" }
      },
      manifestA,
      ["lxmf:send"]
    );
    expect(sent.ok).toBe(true);

    const inboxB = await host.dispatchRaw(
      { id: "2", namespace: "lxmf", method: "receive", capability: "lxmf:receive" },
      manifestB,
      ["lxmf:receive"]
    );
    expect(inboxB.ok).toBe(true);
    expect(inboxB.result).toEqual([
      expect.objectContaining({ subject: "hello", body: "from A", from: "app-a" })
    ]);

    const inboxA = await host.dispatchRaw(
      { id: "3", namespace: "lxmf", method: "receive", capability: "lxmf:receive" },
      manifestA,
      ["lxmf:receive"]
    );
    expect(inboxA.ok).toBe(true);
    expect(inboxA.result).toEqual([]);
  });
});

describe("hyperbee storage", () => {
  let storagePath: string;
  let beeBackend: CorestoreBeeBackend;

  beforeAll(async () => {
    storagePath = mkdtempSync(join(tmpdir(), "miniapp-bee-"));
    beeBackend = new CorestoreBeeBackend(storagePath, 256);
    await beeBackend.ready();
  });

  afterAll(async () => {
    await beeBackend.close();
    rmSync(storagePath, { recursive: true, force: true });
  });

  it("keeps separate cores per app", async () => {
    await beeBackend.put("app-a", "post:1", new TextEncoder().encode("alpha"));
    await beeBackend.put("app-b", "post:1", new TextEncoder().encode("beta"));

    expect(await beeBackend.get("app-a", "post:1")).toEqual(new TextEncoder().encode("alpha"));
    expect(await beeBackend.get("app-b", "post:1")).toEqual(new TextEncoder().encode("beta"));
  });

  it("enforces quota pressure", async () => {
    const tiny = new CorestoreBeeBackend(join(storagePath, "quota"), 12);
    await tiny.ready();
    await tiny.put("quota-app", "a", new TextEncoder().encode("1234567890"));
    await expect(tiny.put("quota-app", "b", new TextEncoder().encode("1234567890"))).rejects.toBeInstanceOf(StorageBeeQuotaError);
    await tiny.close();
  });
});
