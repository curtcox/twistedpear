import { describe, expect, it } from "vitest";
import { createCatalogOps } from "../src/worklet-entry-catalog.mjs";
import { createTrustStoreOps } from "../src/worklet-entry-trust.mjs";

class MemoryKeyValueStore {
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

describe("createTrustStoreOps", () => {
  function ops() {
    const kv = new MemoryKeyValueStore();
    const sent: Record<string, unknown>[] = [];
    return {
      kv,
      sent,
      ...createTrustStoreOps({
        runtimeKeyValueStore: () => kv,
        send: (message: Record<string, unknown>) => sent.push(message),
      }),
    };
  }

  it("reuses one trust store across calls", () => {
    const { ensureTrustStore } = ops();
    expect(ensureTrustStore()).toBe(ensureTrustStore());
  });

  it("pushes an empty list before anything is trusted", async () => {
    const { pushTrustList, sent } = ops();
    await pushTrustList();
    expect(sent).toEqual([{ type: "trust", entries: [] }]);
  });

  it("pushes the publishers the store holds", async () => {
    const { ensureTrustStore, pushTrustList, sent } = ops();
    await ensureTrustStore().add({
      publisherPublicKey: "ab".repeat(64),
      label: "Alice",
      addedAt: 5,
    });

    await pushTrustList();

    expect(sent).toEqual([
      {
        type: "trust",
        entries: [
          {
            publisherPublicKey: "ab".repeat(64),
            label: "Alice",
            addedAt: 5,
          },
        ],
      },
    ]);
  });
});

describe("createCatalogOps", () => {
  function ops() {
    const kv = new MemoryKeyValueStore();
    const sent: Record<string, unknown>[] = [];
    const status: Record<string, unknown> = {};
    let pushes = 0;
    return {
      kv,
      sent,
      status,
      pushes: () => pushes,
      ...createCatalogOps({
        provider: { sha256: (data: Uint8Array) => data.slice(0, 32) },
        packageQuotaBytes: 1_024,
        runtimeKeyValueStore: () => kv,
        status,
        pushStatus: () => {
          pushes += 1;
        },
        send: (message: Record<string, unknown>) => sent.push(message),
      }),
    };
  }

  function install(
    installed: {
      install: (record: Record<string, unknown>, sizeBytes: number) => void;
    },
    appId: string,
    version: string,
    installedAt: number,
  ) {
    installed.install(
      {
        appId,
        version,
        packageHash: `${appId}-${version}`,
        installedAt,
        archivePath: `/apps/${appId}-${version}.tpkg`,
        manifest: {
          appId,
          name: appId,
          version,
          capabilities: ["storage"],
          publisherPublicKey: "ab".repeat(64),
        },
      },
      16,
    );
  }

  it("reuses both stores across calls", () => {
    const { ensureCatalog } = ops();
    const first = ensureCatalog();
    const second = ensureCatalog();
    expect(second.catalogStore).toBe(first.catalogStore);
    expect(second.installedStore).toBe(first.installedStore);
  });

  it("reports empty counts and lists", () => {
    const { pushCatalog, sent, status, pushes } = ops();
    pushCatalog();

    expect(status).toEqual({
      catalogEntries: 0,
      installedPackages: 0,
      storageUsedBytes: 0,
    });
    expect(pushes()).toBe(1);
    expect(sent).toEqual([
      { type: "catalog", entries: [] },
      { type: "installed", packages: [] },
    ]);
  });

  it("summarises the active version and rollback availability", () => {
    const { ensureCatalog, pushCatalog, sent, status } = ops();
    const { installedStore } = ensureCatalog();
    install(installedStore, "hello", "1.0.0", 10);
    install(installedStore, "hello", "1.1.0", 20);

    pushCatalog();

    expect(status.installedPackages).toBe(2);
    expect(status.storageUsedBytes).toBe(32);
    expect(sent[1]).toEqual({
      type: "installed",
      packages: [
        {
          appId: "hello",
          version: "1.1.0",
          activeVersion: "1.1.0",
          packageHash: "hello-1.1.0",
          installedAt: 20,
          rollbackAvailable: true,
          capabilities: ["storage"],
          publisherPublicKey: "ab".repeat(64),
        },
      ],
    });
  });

  it("round-trips catalog and installed state through the key-value store", async () => {
    const first = ops();
    const { installedStore } = first.ensureCatalog();
    install(installedStore, "hello", "1.0.0", 10);
    await first.persistCatalogState();
    expect(first.kv.values.size).toBeGreaterThan(0);

    const second = createCatalogOps({
      provider: { sha256: (data: Uint8Array) => data.slice(0, 32) },
      packageQuotaBytes: 1_024,
      runtimeKeyValueStore: () => first.kv,
      status: {},
      pushStatus: () => {},
      send: () => {},
    });
    await second.loadCatalogState();

    expect(second.ensureCatalog().installedStore.list()).toHaveLength(1);
  });

  it("swallows truncated catalog JSON when no logger is provided", async () => {
    const kv = {
      get: async () => new TextEncoder().encode("{"),
      set: async () => {},
      delete: async () => {},
    };
    const catalog = createCatalogOps({
      provider: { sha256: (data: Uint8Array) => data.slice(0, 32) },
      packageQuotaBytes: 1_024,
      runtimeKeyValueStore: () => kv,
      status: {},
      pushStatus: () => {},
      send: () => {},
    });
    await expect(catalog.loadCatalogState()).resolves.toBeUndefined();
  });
});
