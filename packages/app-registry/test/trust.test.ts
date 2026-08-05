import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import {
  TrustStore,
  TrustStoreError,
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
} from "../src/index.js";

const provider = new NodeCryptoProvider();

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
}

describe("trust store", () => {
  const key = bytesToHex(new Identity(provider).getPublicKey());

  it("adds, lists, deduplicates, and removes trusted publishers", async () => {
    const store = new TrustStore(new MemoryStore());
    expect(await store.list()).toEqual([]);
    expect(await store.isTrusted(key)).toBe(false);

    await store.add({
      publisherPublicKey: key,
      label: "Alice",
      addedAt: 1,
      source: "paste",
    });
    await store.add({
      publisherPublicKey: key,
      label: "Alice (updated)",
      addedAt: 2,
      source: "qr",
    });
    const entries = await store.list();
    expect(entries).toHaveLength(1);
    expect(entries[0]?.label).toBe("Alice (updated)");
    expect(await store.isTrusted(key)).toBe(true);

    await store.remove(key);
    expect(await store.isTrusted(key)).toBe(false);
  });

  it("rejects malformed keys", async () => {
    const store = new TrustStore(new MemoryStore());
    await expect(
      store.add({
        publisherPublicKey: "zz",
        label: "bad",
        addedAt: 0,
        source: "manual",
      }),
    ).rejects.toBeInstanceOf(TrustStoreError);
  });
});

describe("publisher identity 256t strings", () => {
  it("round-trips a 64-byte identity public key inline", () => {
    const identity = new Identity(provider);
    const keyHex = bytesToHex(identity.getPublicKey());
    const id = encodePublisherIdentity256t(keyHex);
    expect(id).toHaveLength(94);
    expect(decodePublisherIdentity256t(id)).toBe(keyHex);
    expect(decodePublisherIdentity256t(`  ${id}\n`)).toBe(keyHex);
  });

  it("rejects strings that are not inline 64-byte keys", () => {
    expect(() => decodePublisherIdentity256t("nonsense")).toThrow(
      TrustStoreError,
    );
    expect(() => encodePublisherIdentity256t("ab".repeat(16))).toThrow(
      TrustStoreError,
    );
  });
});
