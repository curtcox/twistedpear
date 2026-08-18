import { describe, expect, it } from "vitest";
import { GrantStore, MemoryKvStoreBackend, MiniappHost } from "../src/index.js";

describe("stale launch-time grant fallback", () => {
  const unusedBackend = {
    name: "unused",
    async spawn() {
      throw new Error("not used");
    },
  };

  it("denies immediately after GrantStore.delete without waiting for relaunch", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
    });
    const manifest = {
      name: "board",
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities: ["identity"],
    };
    await host.setGrants("board", "publisher", ["identity"], ["identity"]);

    const before = await host.dispatchRaw(
      {
        id: "before",
        namespace: "identity",
        method: "destinationHash",
        payload: {},
      },
      manifest,
      ["identity"],
    );
    expect(before.ok).toBe(true);

    await host.deleteGrants("board", "publisher");
    const after = await host.dispatchRaw(
      {
        id: "after",
        namespace: "identity",
        method: "destinationHash",
        payload: {},
      },
      manifest,
      ["identity"],
    );
    expect(after.ok).toBe(false);
    expect(after.error?.code).toBe("CAPABILITY_DENIED");
  });
});
