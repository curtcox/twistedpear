import { describe, expect, it } from "vitest";
import { NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  APP_DATA_ARCHIVE_MAGIC,
  AppDataArchiveError,
  decodeAppDataArchive,
  encodeAppDataArchive,
  snapshotAppData,
  type AppDataKeyStore,
  type AppDataRecord,
  type AppDataSnapshot,
} from "../src/index.js";

const PASSPHRASE = "correct horse battery staple";
const provider = new NodeCryptoProvider();

function utf8(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function record(
  key: string,
  value: string,
  seq = 1,
): AppDataRecord {
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
        [
          "miniapp-kv:hello:greeting",
          { seq: 4, value: utf8("hi") },
        ],
        [
          "miniapp-grants:publisher:hello",
          { seq: 1, value: utf8("grant") },
        ],
        [
          "miniapp-lxmf-inbox:hello",
          { seq: 1, value: utf8("mail") },
        ],
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

  it("rejects truncated, tampered, and wrong-passphrase archives with pinned codes", () => {
    const bytes = encodeAppDataArchive(
      provider,
      cookbook,
      PASSPHRASE,
      PASSPHRASE,
    );
    expect(() => decodeAppDataArchive(bytes.subarray(0, 3), PASSPHRASE)).toThrow(
      expect.objectContaining({ code: "MAGIC" }),
    );
    expect(() => decodeAppDataArchive(bytes.subarray(0, 20), PASSPHRASE)).toThrow(
      expect.objectContaining({ code: "TRUNCATED" }),
    );
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
