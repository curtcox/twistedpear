import { describe, expect, it } from "vitest";
import { GrantStore, MemoryKvStoreBackend, MiniappHost } from "../src/index.js";
import { MAX_ANNOUNCE_APP_DATA_BYTES } from "../src/services/announce.js";

describe("announce namespace scope", () => {
  const unusedBackend = {
    name: "unused",
    async spawn() {
      throw new Error("not used");
    },
  };

  function hostWithAnnounceGrants(appId: string) {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
    });
    const capabilities = ["announce:publish", "announce:subscribe"];
    const manifest = {
      name: appId,
      version: "1",
      entry: "bundle.js",
      publisherPublicKey: "publisher",
      capabilities,
    };
    return { host, manifest, capabilities };
  }

  it("rejects publish and subscribe into another app's namespace", async () => {
    const { host, manifest, capabilities } = hostWithAnnounceGrants("board");
    await host.setGrants("board", "publisher", capabilities, capabilities);
    const payload = new TextEncoder().encode("hello");

    const published = await host.dispatchRaw(
      {
        id: "pub",
        namespace: "announce",
        method: "publish",
        payload: { appData: payload, namespace: "miniapp-announce:other" },
      },
      manifest,
      capabilities,
    );
    expect(published.ok).toBe(false);
    expect(published.error?.code).toBe("ANNOUNCE_CROSS_APP_SCOPE");

    const subscribed = await host.dispatchRaw(
      {
        id: "sub",
        namespace: "announce",
        method: "subscribe",
        payload: { namespace: "other" },
      },
      manifest,
      capabilities,
    );
    expect(subscribed.ok).toBe(false);
    expect(subscribed.error?.code).toBe("ANNOUNCE_CROSS_APP_SCOPE");
  });

  it("allows the app id, the default prefix, and omitted namespace", async () => {
    const { host, manifest, capabilities } = hostWithAnnounceGrants("board");
    await host.setGrants("board", "publisher", capabilities, capabilities);
    const payload = new TextEncoder().encode("hello");

    for (const namespace of [undefined, "board", "miniapp-announce:board"]) {
      const published = await host.dispatchRaw(
        {
          id: `pub-${String(namespace)}`,
          namespace: "announce",
          method: "publish",
          payload:
            namespace === undefined
              ? { appData: payload }
              : { appData: payload, namespace },
        },
        manifest,
        capabilities,
      );
      expect(published.ok, String(namespace)).toBe(true);
    }

    const heard = await host.dispatchRaw(
      {
        id: "sub",
        namespace: "announce",
        method: "subscribe",
        payload: { namespace: "board" },
      },
      manifest,
      capabilities,
    );
    expect(heard.ok).toBe(true);
    expect(heard.result).toHaveLength(3);
  });

  it("rejects appData larger than the RNS announce ceiling", async () => {
    const { host, manifest, capabilities } = hostWithAnnounceGrants("board");
    await host.setGrants("board", "publisher", capabilities, capabilities);
    const published = await host.dispatchRaw(
      {
        id: "big",
        namespace: "announce",
        method: "publish",
        payload: {
          appData: new Uint8Array(MAX_ANNOUNCE_APP_DATA_BYTES + 1),
        },
      },
      manifest,
      capabilities,
    );
    expect(published.ok).toBe(false);
    expect(published.error?.code).toBe("ANNOUNCE_BAD_REQUEST");
  });
});
