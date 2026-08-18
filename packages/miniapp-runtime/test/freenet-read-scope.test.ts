import { describe, expect, it } from "vitest";
import { GrantStore, MemoryKvStoreBackend, MiniappHost } from "../src/index.js";
import type { FreenetContractBackend } from "../src/services/freenet.js";

describe("freenet get scope", () => {
  const unusedBackend = {
    name: "unused",
    async spawn() {
      throw new Error("not used");
    },
  };
  const manifest = {
    name: "reader",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities: ["freenet:contract"],
  };
  const backend: FreenetContractBackend = {
    async get(keyHex) {
      return { keyHex, stateHex: "aa" };
    },
    async put() {
      return { keyHex: "ab" };
    },
    async update() {},
  };

  it("refuses an arbitrary contract key", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      freenetBackend: backend,
    });
    await host.setGrants(
      "reader",
      "publisher",
      ["freenet:contract"],
      ["freenet:contract"],
    );
    const response = await host.dispatchRaw(
      {
        id: "get",
        namespace: "freenet",
        method: "get",
        payload: { keyHex: "ffff" },
      },
      manifest,
      ["freenet:contract"],
    );
    expect(response.ok).toBe(false);
    expect(response.error?.code).toBe("FREENET_KEY_DENIED");
  });

  it("allows a host-authored allowlist key", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      freenetBackend: backend,
      freenetReadAllowlist: ["FFFF"],
    });
    await host.setGrants(
      "reader",
      "publisher",
      ["freenet:contract"],
      ["freenet:contract"],
    );
    const response = await host.dispatchRaw(
      {
        id: "get",
        namespace: "freenet",
        method: "get",
        payload: { keyHex: "ffff" },
      },
      manifest,
      ["freenet:contract"],
    );
    expect(response.ok).toBe(true);
    expect(response.result).toEqual({ keyHex: "ffff", stateHex: "aa" });
  });
});
