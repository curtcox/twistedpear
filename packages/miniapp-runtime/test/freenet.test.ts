import { describe, expect, it, vi } from "vitest";
import {
  CAPABILITY_DEFINITIONS,
  GrantStore,
  HOST_API_VERSION,
  MemoryKvStoreBackend,
  MiniappHost
} from "../src/index.js";
import type { FreenetContractBackend } from "../src/services/freenet.js";

describe("freenet:contract capability", () => {
  const unusedBackend = {
    name: "unused",
    async spawn() {
      throw new Error("not used");
    }
  };
  const manifest = {
    name: "freenet-app",
    version: "1",
    entry: "bundle.js",
    publisherPublicKey: "publisher",
    capabilities: ["freenet:contract"]
  };

  it("is declared in CAPABILITY_DEFINITIONS with irreversible wording", () => {
    const entry = CAPABILITY_DEFINITIONS.find((item) => item.id === "freenet:contract");
    expect(entry).toBeDefined();
    expect(entry?.description).toContain("cannot be recalled");
    expect(HOST_API_VERSION).toBe("0.12.0");
  });

  it("returns FREENET_UNCONFIGURED when freenetBackend is not injected", async () => {
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store
    });
    await host.setGrants("freenet-app", "publisher", ["freenet:contract"], ["freenet:contract"]);
    const response = await host.dispatchRaw(
      { id: "1", namespace: "freenet", method: "get", payload: { keyHex: "ab" } },
      manifest,
      ["freenet:contract"]
    );
    expect(response.error?.code).toBe("FREENET_UNCONFIGURED");
  });

  it("gates put behind confirmation and allows get without confirmation", async () => {
    const puts: string[] = [];
    const backend: FreenetContractBackend = {
      async get(keyHex) {
        return { keyHex, stateHex: "aa" };
      },
      async put(options) {
        puts.push(options.stateHex);
        return { keyHex: "bb" };
      },
      async update() {}
    };
    const confirm = vi.fn(async () => ({ approved: true }));
    const store = new MemoryKvStoreBackend();
    const host = new MiniappHost({
      backend: unusedBackend,
      grantStore: new GrantStore(store),
      kvBackend: store,
      freenetBackend: backend,
      confirmationChannel: { confirm }
    });
    await host.setGrants("freenet-app", "publisher", ["freenet:contract"], ["freenet:contract"]);

    const got = await host.dispatchRaw(
      { id: "1", namespace: "freenet", method: "get", payload: { keyHex: "abcd" } },
      manifest,
      ["freenet:contract"]
    );
    expect(got.result).toEqual({ keyHex: "abcd", stateHex: "aa" });
    expect(confirm).not.toHaveBeenCalled();

    const put = await host.dispatchRaw(
      {
        id: "2",
        namespace: "freenet",
        method: "put",
        payload: { wasmHex: "00", parametersHex: "01", stateHex: "02" }
      },
      manifest,
      ["freenet:contract"]
    );
    expect(put.result).toEqual({ keyHex: "bb" });
    expect(puts).toEqual(["02"]);
    expect(confirm).toHaveBeenCalledOnce();
    expect(confirm.mock.calls[0]![0].kind).toBe("freenet-update");
    expect(confirm.mock.calls[0]![0].summary.note).toContain("cannot be recalled");
  });
});
