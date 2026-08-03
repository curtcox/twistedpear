// @ts-nocheck
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { verifyPackage } from "@twistedpear/app-registry";
import { verify256t } from "@twistedpear/cas-256t";
import { PureCryptoProvider } from "@twistedpear/reticulum-ts/web";
import type { WebIndexedDB } from "@twistedpear/reticulum-ts/web";
import type { WebOpfsRootDirectory, WebStorageManager } from "../src/web-package-storage.js";
import { createWebPackageStorage, resetWebPackageStorage } from "../src/web-package-storage.js";

type IndexedDbRequest<T> = {
  readonly result: T;
  error: Error | null;
  onsuccess: (() => void) | null;
  onerror: (() => void) | null;
};

type IndexedDbStore = {
  get(key: string): IndexedDbRequest<Uint8Array | undefined>;
  put(value: Uint8Array, key: string): IndexedDbRequest<undefined>;
  delete(key: string): IndexedDbRequest<undefined>;
  getAllKeys(): IndexedDbRequest<ReadonlyArray<string>>;
};

class MemoryIndexedDb implements WebIndexedDB {
  private readonly stores = new Map<string, Map<string, Uint8Array>>();

  open(name: string) {
    if (!this.stores.has(name)) {
      this.stores.set(name, new Map());
    }

    const store = this.stores.get(name)!;
    const request: IndexedDbRequest<{
      createObjectStore(name: string): void;
      transaction(_name: string, mode: "readonly" | "readwrite"): { objectStore(): IndexedDbStore };
    }> = {
      result: {
        createObjectStore() {},
        transaction(_name: string, mode: "readonly" | "readwrite") {
          return {
            objectStore() {
              return {
                get(key: string) {
                  return createRequest(store.get(key));
                },
                put(value: Uint8Array, key: string) {
                  if (mode !== "readwrite") {
                    throw new Error("read-only transaction");
                  }

                  store.set(key, Uint8Array.from(value));
                  return createRequest(undefined);
                },
                delete(key: string) {
                  if (mode !== "readwrite") {
                    throw new Error("read-only transaction");
                  }

                  store.delete(key);
                  return createRequest(undefined);
                },
                getAllKeys() {
                  return createRequest([...store.keys()]);
                }
              };
            }
          };
        }
      },
      error: null,
      onsuccess: null,
      onerror: null
    };

    let upgradeHandler: ((event: { readonly target: typeof request | null }) => void) | null = null;
    let successHandler: (() => void) | null = null;
    return {
      ...request,
      get onupgradeneeded() {
        return upgradeHandler;
      },
      set onupgradeneeded(handler) {
        upgradeHandler = handler;
        handler?.({ target: request });
      },
      get onsuccess() {
        return successHandler;
      },
      set onsuccess(handler) {
        successHandler = handler;
        handler?.();
      }
    };
  }

  deleteDatabase(name: string) {
    this.stores.delete(name);
    return createRequest(undefined);
  }
}

class MemoryOpfsRoot implements WebOpfsRootDirectory {
  private readonly entries = new Map<string, MemoryOpfsRoot | MemoryOpfsFile>();

  async getDirectoryHandle(name: string, options?: { create?: boolean }): Promise<WebOpfsRootDirectory> {
    const existing = this.entries.get(name);
    if (existing instanceof MemoryOpfsRoot) {
      return existing;
    }

    if (existing !== undefined || options?.create !== true) {
      throw new Error(`Missing OPFS directory: ${name}`);
    }

    const created = new MemoryOpfsRoot();
    this.entries.set(name, created);
    return created;
  }

  async getFileHandle(name: string, options?: { create?: boolean }): Promise<{
    getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }>;
    createWritable(): Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }>;
  }> {
    const existing = this.entries.get(name);
    if (existing instanceof MemoryOpfsFile) {
      return existing;
    }

    if (existing !== undefined || options?.create !== true) {
      throw new Error(`Missing OPFS file: ${name}`);
    }

    const created = new MemoryOpfsFile();
    this.entries.set(name, created);
    return created;
  }
}

class MemoryOpfsFile {
  private bytes: Uint8Array | null = null;

  async getFile(): Promise<{ arrayBuffer(): Promise<ArrayBuffer> }> {
    if (this.bytes === null) {
      throw new Error("Missing OPFS file contents");
    }

    const snapshot = Uint8Array.from(this.bytes);
    return {
      async arrayBuffer() {
        return snapshot.buffer.slice(snapshot.byteOffset, snapshot.byteOffset + snapshot.byteLength);
      }
    };
  }

  async createWritable(): Promise<{ write(data: Uint8Array): Promise<void>; close(): Promise<void> }> {
    const file = this;
    return {
      async write(data: Uint8Array) {
        file.bytes = Uint8Array.from(data);
      },
      async close() {}
    };
  }
}

function createRequest<T>(result: T): IndexedDbRequest<T> {
  let successHandler: (() => void) | null = null;
  return {
    result,
    error: null,
    get onsuccess() {
      return successHandler;
    },
    set onsuccess(handler) {
      successHandler = handler;
      handler?.();
    },
    onerror: null
  };
}

function createMemoryStorage(): WebStorageManager {
  const root = new MemoryOpfsRoot();
  return {
    async estimate() {
      return { usage: 4096, quota: 1024 * 1024 * 1024 };
    },
    async persist() {
      return true;
    },
    async persisted() {
      return true;
    },
    async getDirectory() {
      return root;
    }
  };
}

const fixtureRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../conformance/fixtures/packages");
const tinyArchive = new Uint8Array(readFileSync(join(fixtureRoot, "tiny.tpkg")));

describe("web package storage", () => {
  it("installs a .tpkg into CAS + OPFS and survives reload", async () => {
    const indexedDB = new MemoryIndexedDb();
    const storage = createMemoryStorage();
    const dbName = "test-web-package-storage";
    await resetWebPackageStorage({ dbName, indexedDB });

    const first = await createWebPackageStorage({
      dbName,
      indexedDB,
      storage
    });

    const installed = await first.installArchive(tinyArchive);
    expect(installed.appId).toBe("com.example.hello");
    expect(installed.version).toBe("1.0.0");
    expect(first.archiveBackend).toBe("opfs");
    expect(verify256t(installed.t256, tinyArchive, (data) => new PureCryptoProvider().sha512(data))).toBe(true);

    const quota = await first.getQuotaInfo();
    expect(quota.packageUsedBytes).toBe(tinyArchive.length);
    expect(quota.usageBytes).toBe(4096);
    expect(quota.quotaBytes).toBe(1024 * 1024 * 1024);
    expect(quota.persisted).toBe(true);

    const second = await createWebPackageStorage({
      dbName,
      indexedDB,
      storage
    });
    expect(second.listInstalled()).toHaveLength(1);
    expect(second.activeVersion("com.example.hello")).toBe("1.0.0");

    const reloaded = await second.readArchive("com.example.hello", "1.0.0");
    expect(reloaded).not.toBeNull();
    verifyPackage(new PureCryptoProvider(), reloaded!, { hostApiVersion: "0.1.0" });
  });

  it("falls back to IndexedDB archives when OPFS is unavailable", async () => {
    const indexedDB = new MemoryIndexedDb();
    const dbName = "test-web-package-storage-idb-fallback";
    await resetWebPackageStorage({ dbName, indexedDB });

    const session = await createWebPackageStorage({
      dbName,
      indexedDB,
      storage: {
        async estimate() {
          return { usage: 1, quota: 1000 };
        },
        async persisted() {
          return false;
        }
      }
    });

    expect(session.archiveBackend).toBe("indexeddb");
    const installed = await session.installArchive(tinyArchive);
    const reloaded = await session.readArchive(installed.appId, installed.version);
    expect(reloaded).toEqual(tinyArchive);
  });
});
