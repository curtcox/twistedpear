import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  APP_DATA_ADDRESS_WARNING,
  AppDataArchiveError,
  decodeAppDataArchive,
  encodeAppDataArchive,
  restoreAppData,
  snapshotAppData,
  type AppDataMutableStore,
  type AppDataRecord,
  type AppDataSnapshot,
} from "../src/index.js";

const PASSPHRASE = "correct horse battery staple";
const provider = new NodeCryptoProvider();

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function record(key: string, value: string, seq = 1): AppDataRecord {
  return { key, seq, value: utf8(value) };
}

function snapshot(
  records: readonly AppDataRecord[],
  includePending = false,
): AppDataSnapshot {
  return {
    appId: "hello",
    hostApi: "0.20.0",
    includePending,
    records,
  };
}

class MemoryStore implements AppDataMutableStore {
  constructor(
    private readonly rows = new Map<
      string,
      { seq: number; value: Uint8Array }
    >(),
  ) {}

  list(prefix = ""): Promise<readonly string[]> {
    return Promise.resolve(
      [...this.rows.keys()].filter((key) => key.startsWith(prefix)).sort(),
    );
  }

  get(key: string): Promise<Uint8Array | null> {
    return Promise.resolve(this.rows.get(key)?.value ?? null);
  }

  seq(key: string): Promise<number> {
    return Promise.resolve(this.rows.get(key)?.seq ?? 0);
  }

  put(key: string, value: Uint8Array, seq: number): Promise<void> {
    this.rows.set(key, { seq, value: value.slice() });
    return Promise.resolve();
  }

  delete(key: string): Promise<void> {
    this.rows.delete(key);
    return Promise.resolve();
  }

  throwOnPutOnce(predicate: (key: string) => boolean): void {
    const original = this.put.bind(this);
    let thrown = false;
    this.put = async (key, value, seq) => {
      if (!thrown && predicate(key)) {
        thrown = true;
        throw new Error("injected put failure");
      }
      await original(key, value, seq);
    };
  }
}

const cookbook = snapshot([record("miniapp-kv:hello:greeting", "hi")]);

describe("restoreAppData", () => {
  it("writes a cookbook snapshot and warns that the app address does not follow", async () => {
    const store = new MemoryStore();
    const result = await restoreAppData(store, cookbook);
    expect(result).toEqual({
      appId: "hello",
      restored: 1,
      replaced: false,
      parked: true,
    });
    expect(new TextDecoder().decode(await store.get("miniapp-kv:hello:greeting"))).toBe(
      "hi",
    );
    expect(APP_DATA_ADDRESS_WARNING).toMatch(/address does not/);
  });

  it("refuses an existing app unless replace is set, then overwrites", async () => {
    const store = new MemoryStore(
      new Map([
        ["miniapp-kv:hello:greeting", { seq: 1, value: utf8("old") }],
      ]),
    );
    await expect(restoreAppData(store, cookbook)).rejects.toThrow(
      expect.objectContaining({ code: "COLLISION" }),
    );
    expect(new TextDecoder().decode(await store.get("miniapp-kv:hello:greeting"))).toBe(
      "old",
    );
    const replaced = await restoreAppData(store, cookbook, {
      collision: "replace",
    });
    expect(replaced.replaced).toBe(true);
    expect(new TextDecoder().decode(await store.get("miniapp-kv:hello:greeting"))).toBe(
      "hi",
    );
  });

  it("refuses when the archive would exceed quota, before writing", async () => {
    const store = new MemoryStore();
    await expect(
      restoreAppData(store, cookbook, { quotaBytes: 4 }),
    ).rejects.toThrow(expect.objectContaining({ code: "QUOTA" }));
    expect(await store.list("miniapp-kv:hello:")).toEqual([]);
  });

  it("does not leave partial keys when a later put fails after replace", async () => {
    const store = new MemoryStore(
      new Map([
        ["miniapp-kv:hello:greeting", { seq: 1, value: utf8("old") }],
      ]),
    );
    store.throwOnPutOnce((key) => key === "miniapp-kv:hello:greeting");
    await expect(
      restoreAppData(store, cookbook, { collision: "replace" }),
    ).rejects.toThrow(/injected put failure/);
    expect(new TextDecoder().decode(await store.get("miniapp-kv:hello:greeting"))).toBe(
      "hi",
    );
    expect(await store.list("__tp-restore:")).toEqual([]);
  });

  it("round-trips a decoded archive without carrying grants", async () => {
    const bytes = encodeAppDataArchive(
      provider,
      cookbook,
      PASSPHRASE,
      PASSPHRASE,
    );
    const restored = decodeAppDataArchive(bytes, PASSPHRASE);
    const store = new MemoryStore();
    await restoreAppData(store, restored);
    expect(await store.list("miniapp-grants:")).toEqual([]);
    expect(await snapshotAppData(store, "hello", { hostApi: "0.20.0" })).toEqual(
      cookbook,
    );
  });

  it("rejects a snapshot that smuggles a grant row", async () => {
    const store = new MemoryStore();
    await expect(
      restoreAppData(
        store,
        snapshot([record("miniapp-grants:publisher:hello", "no")]),
      ),
    ).rejects.toBeInstanceOf(AppDataArchiveError);
    expect(await store.list()).toEqual([]);
  });
});
