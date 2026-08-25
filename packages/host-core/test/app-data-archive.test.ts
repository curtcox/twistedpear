import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  APP_DATA_ARCHIVE_MAGIC,
  type AppDataKeyStore,
} from "../src/app-data-archive.js";
import {
  AppDataArchiveError,
  decodeAppDataArchive,
  encodeAppDataArchive,
  snapshotAppData,
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

class MemoryStore implements AppDataKeyStore {
  constructor(
    private readonly rows: ReadonlyMap<
      string,
      { seq: number; value: Uint8Array }
    >,
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
}

const cookbook = snapshot([record("miniapp-kv:hello:greeting", "hi")]);

describe("app data archive", () => {
  it("round-trips a cookbook snapshot through chunked authenticated framing", () => {
    const salt = Uint8Array.from({ length: 16 }, (_, index) => index);
    const nonce = Uint8Array.from({ length: 12 }, (_, index) => 32 + index);
    const bytes = encodeAppDataArchive(
      provider,
      cookbook,
      PASSPHRASE,
      PASSPHRASE,
      { salt, nonces: [nonce] },
    );
    expect(new TextDecoder().decode(bytes.subarray(0, 8))).toBe(
      APP_DATA_ARCHIVE_MAGIC,
    );
    const restored = decodeAppDataArchive(bytes, PASSPHRASE);
    expect(restored.appId).toBe("hello");
    expect(restored.records).toHaveLength(1);
    expect(restored.records[0]?.key).toBe("miniapp-kv:hello:greeting");
    expect(new TextDecoder().decode(restored.records[0]?.value)).toBe("hi");
  });

  it("snapshots user keys and refuses grants", async () => {
    const store = new MemoryStore(
      new Map([
        ["miniapp-kv:hello:greeting", { seq: 4, value: utf8("hi") }],
        ["miniapp-grants:publisher:hello", { seq: 1, value: utf8("grant") }],
        ["miniapp-lxmf-inbox:hello", { seq: 1, value: utf8("mail") }],
      ]),
    );
    const user = await snapshotAppData(store, "hello", { hostApi: "0.20.0" });
    expect(user.records.map((row) => row.key)).toEqual([
      "miniapp-kv:hello:greeting",
    ]);
    const pending = await snapshotAppData(store, "hello", {
      hostApi: "0.20.0",
      includePending: true,
    });
    expect(pending.records.map((row) => row.key)).toEqual([
      "miniapp-kv:hello:greeting",
      "miniapp-lxmf-inbox:hello",
    ]);
    expect(() =>
      encodeAppDataArchive(
        provider,
        snapshot([record("miniapp-grants:publisher:hello", "no")]),
        PASSPHRASE,
        PASSPHRASE,
      ),
    ).toThrow(AppDataArchiveError);
  });

  it("throws FORBIDDEN when a prefix list returns a grant key", async () => {
    const store = new MemoryStore(
      new Map([
        ["miniapp-grants:publisher:hello", { seq: 1, value: utf8("grant") }],
      ]),
    );
    store.list = async () => ["miniapp-grants:publisher:hello"];
    await expect(
      snapshotAppData(store, "hello", { hostApi: "0.20.0" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("snapshots bee and workspace keys, skips holes, and ignores non-matching list rows", async () => {
    const store = new MemoryStore(
      new Map([
        ["miniapp-bee:hello:feed", { seq: 2, value: utf8("bee") }],
        ["miniapp-workspace:hello:notes", { seq: 1, value: utf8("ws") }],
        ["miniapp-kv:hello:missing", { seq: 1, value: utf8("gone") }],
        ["miniapp-lxmf-inbox:hello-extra", { seq: 1, value: utf8("no") }],
      ]),
    );
    store.get = async (key) =>
      key === "miniapp-kv:hello:missing"
        ? null
        : MemoryStore.prototype.get.call(store, key);
    const listed = await snapshotAppData(store, "hello", {
      hostApi: "0.20.0",
      includePending: true,
    });
    expect(listed.records.map((row) => row.key)).toEqual([
      "miniapp-bee:hello:feed",
      "miniapp-workspace:hello:notes",
    ]);
    const withoutSeq = {
      list: (prefix = "") =>
        Promise.resolve(
          ["miniapp-kv:hello:greeting"].filter((key) => key.startsWith(prefix)),
        ),
      get: (key: string) =>
        Promise.resolve(
          key === "miniapp-kv:hello:greeting" ? utf8("hi") : null,
        ),
    };
    const zeroed = await snapshotAppData(withoutSeq, "hello", {
      hostApi: "0.20.0",
    });
    expect(zeroed.records[0]?.seq).toBe(0);
  });

  it("rejects empty app ids, mismatched passphrases, and undersized entropy", () => {
    expect(() =>
      encodeAppDataArchive(
        provider,
        snapshot([], false),
        PASSPHRASE,
        PASSPHRASE,
      ),
    ).not.toThrow();
    expect(() =>
      encodeAppDataArchive(
        provider,
        { ...cookbook, appId: "" },
        PASSPHRASE,
        PASSPHRASE,
      ),
    ).toThrow(expect.objectContaining({ code: "EMPTY" }));
    expect(() =>
      encodeAppDataArchive(provider, cookbook, PASSPHRASE, "other passphrase"),
    ).toThrow(/confirmation does not match/);
    expect(() =>
      encodeAppDataArchive(provider, cookbook, PASSPHRASE, PASSPHRASE, {
        salt: new Uint8Array(8),
      }),
    ).toThrow(/salt must be 16 bytes/);
    expect(() =>
      encodeAppDataArchive(provider, cookbook, PASSPHRASE, PASSPHRASE, {
        nonces: [new Uint8Array(4)],
      }),
    ).toThrow(/nonce must be 12 bytes/);
  });

  it("spans multiple chunks and rejects a version mismatch as MAGIC", () => {
    const bulky = snapshot([record("miniapp-kv:hello:blob", "x".repeat(5000))]);
    const bytes = encodeAppDataArchive(provider, bulky, PASSPHRASE, PASSPHRASE);
    const restored = decodeAppDataArchive(bytes, PASSPHRASE);
    expect(new TextDecoder().decode(restored.records[0]?.value).length).toBe(
      5000,
    );
    const mutated = bytes.slice();
    mutated[8] = 2;
    expect(() => decodeAppDataArchive(mutated, PASSPHRASE)).toThrow(
      expect.objectContaining({ code: "MAGIC" }),
    );
  });

  it("rejects truncated, tampered, and wrong-passphrase archives with pinned codes", () => {
    const bytes = encodeAppDataArchive(
      provider,
      cookbook,
      PASSPHRASE,
      PASSPHRASE,
    );
    expect(() =>
      decodeAppDataArchive(bytes.subarray(0, 3), PASSPHRASE),
    ).toThrow(expect.objectContaining({ code: "MAGIC" }));
    expect(() =>
      decodeAppDataArchive(bytes.subarray(0, 20), PASSPHRASE),
    ).toThrow(expect.objectContaining({ code: "TRUNCATED" }));
    const tampered = bytes.slice();
    tampered[tampered.length - 1] ^= 1;
    expect(() => decodeAppDataArchive(tampered, PASSPHRASE)).toThrow(
      expect.objectContaining({ code: "AUTH" }),
    );
    expect(() => decodeAppDataArchive(bytes, "wrong passphrase!!")).toThrow(
      expect.objectContaining({ code: "AUTH" }),
    );
  });
});
