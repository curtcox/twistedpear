import { describe, expect, it } from "vitest";
import {
  GrantStore,
  HOST_API_VERSION,
  MiniappHost,
  NodeWorkerSandboxBackend
} from "../src/index.js";

class MemoryStore {
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

describe("host.info", () => {
  it("returns backend host info when presence is granted", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store,
      hostInfoBackend: {
        info: async () => ({
          platform: "desktop",
          hostVersion: "1.2.3",
          hostApiVersion: HOST_API_VERSION,
          roles: { transport: true, seeder: true, propagation: false },
          interfaceTypes: ["tcp", "auto"],
          quotas: {
            kvQuotaBytes: 1024,
            seedStorageUsedBytes: 10,
            seedStorageQuotaBytes: 1000,
            memoryBytes: null
          }
        })
      }
    });

    const manifest = {
      name: "info-app",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: ["presence"],
      publisherPublicKey: "pub"
    };
    await host.setGrants("info-app", "pub", ["presence"], ["presence"]);

    const response = await host.dispatchRaw(
      { id: "1", namespace: "host", method: "info", capability: "presence" },
      manifest,
      ["presence"]
    );

    expect(response.ok).toBe(true);
    expect(response.result).toMatchObject({
      platform: "desktop",
      hostVersion: "1.2.3",
      hostApiVersion: HOST_API_VERSION,
      roles: { transport: true, seeder: true, propagation: false },
      interfaceTypes: ["tcp", "auto"]
    });
  });

  it("denies host.info without presence grant", async () => {
    const store = new MemoryStore();
    const host = new MiniappHost({
      backend: new NodeWorkerSandboxBackend(),
      grantStore: new GrantStore(store),
      kvBackend: store
    });

    const manifest = {
      name: "info-app",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: ["presence"],
      publisherPublicKey: "pub"
    };
    await host.setGrants("info-app", "pub", ["presence"], []);

    const response = await host.dispatchRaw(
      { id: "1", namespace: "host", method: "info", capability: "presence" },
      manifest,
      []
    );

    expect(response.ok).toBe(false);
  });
});
