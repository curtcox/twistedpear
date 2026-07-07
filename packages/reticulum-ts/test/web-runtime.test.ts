import { describe, expect, it } from "vitest";
import { PureCryptoProvider, Reticulum, bytesToHex, hasWebIdentity, loadOrCreateWebIdentity, persistWebIdentity, resetWebIdentity, webRuntime } from "../src/web.js";

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
};

class MemoryIndexedDb {
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
    const openRequest = {
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

    return openRequest;
  }
}

function createRequest<T>(result: T): IndexedDbRequest<T> {
  let successHandler: (() => void) | null = null;
  const request: IndexedDbRequest<T> = {
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

  return request;
}

describe("webRuntime", () => {
  it("persists key-value data through IndexedDB", async () => {
    const runtime = webRuntime({ indexedDB: new MemoryIndexedDb(), storeName: "test-web-runtime" });
    const key = "leaf-config";
    const value = Uint8Array.from([1, 2, 3, 4]);

    await runtime.store.set(key, value);
    const loaded = await runtime.store.get(key);
    expect(loaded).toEqual(value);

    await runtime.store.delete(key);
    expect(await runtime.store.get(key)).toBeUndefined();
  });

  it("rejects TCP and UDP factories", async () => {
    const runtime = webRuntime({ indexedDB: new MemoryIndexedDb() });
    await expect(runtime.tcp.connect({ host: "127.0.0.1", port: 1 })).rejects.toThrow(/WebSocketClientInterface/);
    await expect(runtime.tcp.listen({ host: "127.0.0.1", port: 1 })).rejects.toThrow(/unavailable/);
    await expect(runtime.udp.bind("127.0.0.1", 1)).rejects.toThrow(/unavailable/);
  });

  it("creates a leaf Reticulum instance from the browser entrypoint", () => {
    const provider = new PureCryptoProvider();
    const runtime = webRuntime({ indexedDB: new MemoryIndexedDb() });
    const reticulum = Reticulum.create({ provider, runtime });
    reticulum.start();
    expect(reticulum.isStarted).toBe(true);
    expect(reticulum.isTransportEnabled).toBe(false);
  });
});

describe("web identity", () => {
  it("creates, persists, and reloads an encrypted identity", async () => {
    const provider = new PureCryptoProvider();
    const indexedDB = new MemoryIndexedDb();
    const options = { indexedDB, storeName: "test-web-identity", passphrase: "phase-w-test" };

    const created = await loadOrCreateWebIdentity(provider, options);
    const createdHash = bytesToHex(created.hash);
    await persistWebIdentity(created, options);

    const reloaded = await loadOrCreateWebIdentity(provider, options);
    expect(bytesToHex(reloaded.hash)).toBe(createdHash);
    expect(reloaded.getPrivateKey()).toEqual(created.getPrivateKey());
  });

  it("rejects the wrong unlock passphrase", async () => {
    const provider = new PureCryptoProvider();
    const indexedDB = new MemoryIndexedDb();
    const created = await loadOrCreateWebIdentity(provider, {
      indexedDB,
      storeName: "test-web-identity-wrong-pass",
      passphrase: "correct-passphrase"
    });
    await persistWebIdentity(created, {
      indexedDB,
      storeName: "test-web-identity-wrong-pass",
      passphrase: "correct-passphrase"
    });

    await expect(
      loadOrCreateWebIdentity(provider, {
        indexedDB,
        storeName: "test-web-identity-wrong-pass",
        passphrase: "wrong-passphrase"
      })
    ).rejects.toThrow();
  });

  it("reports presence and clears stored identity", async () => {
    const provider = new PureCryptoProvider();
    const indexedDB = new MemoryIndexedDb();
    const options = { indexedDB, storeName: "test-web-identity-reset", passphrase: "phase-w-reset" };

    expect(await hasWebIdentity(options)).toBe(false);
    const created = await loadOrCreateWebIdentity(provider, options);
    expect(await hasWebIdentity(options)).toBe(true);

    await resetWebIdentity(options);
    expect(await hasWebIdentity(options)).toBe(false);

    const recreated = await loadOrCreateWebIdentity(provider, options);
    expect(bytesToHex(recreated.hash)).not.toBe(bytesToHex(created.hash));
  });
});
