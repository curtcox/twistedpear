import { describe, expect, it } from "vitest";
import { Identity, NodeCryptoProvider } from "@twistedpear/reticulum-ts";
import {
  CasQuotaError,
  CasStore,
  T256Error,
  T256_ID_LENGTH,
  casAnnounceAspects,
  casRequestAspects,
  decode256t,
  decodeCasLocator,
  decodeCasLocatorRequest,
  encode256t,
  encodeCasLocator,
  encodeCasLocatorRequest,
  signCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../src/index.js";

const provider = new NodeCryptoProvider();
const sha512 = (data: Uint8Array) => provider.sha512(data);

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

  async list(prefix: string): Promise<ReadonlyArray<string>> {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

describe("256t codec", () => {
  it("is always 94 base64url characters", () => {
    for (const size of [0, 1, 63, 64, 65, 1000]) {
      const id = encode256t(new Uint8Array(size).fill(7), sha512);
      expect(id).toHaveLength(T256_ID_LENGTH);
      expect(id).toMatch(/^[A-Za-z0-9_-]{94}$/);
    }
  });

  it("inlines content at the 64-byte boundary and hashes above it", () => {
    const at64 = encode256t(new Uint8Array(64).fill(9), sha512);
    const decoded64 = decode256t(at64);
    expect(decoded64.length).toBe(64);
    expect(decoded64.inline).toEqual(new Uint8Array(64).fill(9));
    expect(decoded64.sha512).toBeNull();

    const content65 = new Uint8Array(65).fill(9);
    const at65 = encode256t(content65, sha512);
    const decoded65 = decode256t(at65);
    expect(decoded65.length).toBe(65);
    expect(decoded65.inline).toBeNull();
    expect(decoded65.sha512).toEqual(sha512(content65));
  });

  it("round-trips and verifies content", () => {
    const small = new TextEncoder().encode("hello 256t");
    const smallId = encode256t(small, sha512);
    expect(decode256t(smallId).inline).toEqual(small);
    expect(verify256t(smallId, small, sha512)).toBe(true);
    expect(verify256t(smallId, new TextEncoder().encode("hello 256T"), sha512)).toBe(false);

    const large = new Uint8Array(10_000).map((_, index) => index % 251);
    const largeId = encode256t(large, sha512);
    expect(verify256t(largeId, large, sha512)).toBe(true);
    const tampered = large.slice();
    tampered[5000] ^= 1;
    expect(verify256t(largeId, tampered, sha512)).toBe(false);
  });

  it("rejects malformed ids", () => {
    expect(() => decode256t("short")).toThrow(T256Error);
    expect(() => decode256t("!".repeat(94))).toThrow(T256Error);
    const valid = encode256t(new Uint8Array(100), sha512);
    expect(() => decode256t(valid.slice(0, 93))).toThrow(T256Error);

    // Inline id whose zero padding was tampered with is non-canonical.
    const inline = encode256t(new TextEncoder().encode("x"), sha512);
    const tampered = `${inline.slice(0, 20)}Z${inline.slice(21)}`;
    expect(() => decode256t(tampered)).toThrow(T256Error);
  });
});

describe("cas store", () => {
  it("stores large blobs and answers inline ids without storage", async () => {
    const backend = new MemoryStore();
    const store = new CasStore(backend, sha512);

    const small = new TextEncoder().encode("tiny");
    const smallId = await store.put(small);
    expect(backend.values.size).toBe(0);
    expect(await store.get(smallId)).toEqual(small);
    expect(await store.has(smallId)).toBe(true);

    const large = new Uint8Array(500).fill(3);
    const largeId = await store.put(large);
    expect(backend.values.size).toBe(1);
    expect(await store.get(largeId)).toEqual(large);

    await store.delete(largeId);
    expect(await store.get(largeId)).toBeNull();
  });

  it("enforces blob and total quotas", async () => {
    const store = new CasStore(new MemoryStore(), sha512, { maxBlobBytes: 256, maxTotalBytes: 384 });
    await expect(store.put(new Uint8Array(257))).rejects.toBeInstanceOf(CasQuotaError);
    await store.put(new Uint8Array(200).fill(1));
    await expect(store.put(new Uint8Array(200).fill(2))).rejects.toBeInstanceOf(CasQuotaError);
  });

  it("detects corrupted stored content", async () => {
    const backend = new MemoryStore();
    const store = new CasStore(backend, sha512);
    const id = await store.put(new Uint8Array(100).fill(4));
    const key = [...backend.values.keys()][0]!;
    backend.values.set(key, new Uint8Array(100).fill(5));
    await expect(store.get(id)).rejects.toMatchObject({ code: "HASH_MISMATCH" });
  });
});

describe("cas locator", () => {
  const identity = new Identity(provider);
  const archive = new Uint8Array(4_096).map((_, index) => (index * 7) % 256);
  const t256 = encode256t(archive, sha512);

  const locator = signCasLocator(identity, {
    t256,
    appId: "hello",
    version: "1.2.3",
    driveKey: "ab".repeat(32),
    packageHash: "cd".repeat(32),
    packageSize: archive.length
  });

  it("signs, encodes within the announce budget, and round-trips", () => {
    const encoded = encodeCasLocator(locator);
    expect(encoded.length).toBeLessThanOrEqual(383);

    const decoded = decodeCasLocator(encoded);
    expect(decoded).toEqual(locator);
    expect(verifyCasLocator(provider, decoded)).toBe(true);
  });

  it("rejects tampered locators", () => {
    expect(verifyCasLocator(provider, { ...locator, version: "9.9.9" })).toBe(false);
    expect(verifyCasLocator(provider, { ...locator, packageHash: "ee".repeat(32) })).toBe(false);
    const otherIdentity = new Identity(provider);
    expect(
      verifyCasLocator(provider, {
        ...locator,
        publisherPublicKey: Buffer.from(otherIdentity.getPublicKey()).toString("hex")
      })
    ).toBe(false);
  });

  it("maps onto the CatalogEntry fetch shape and derives announce aspects", () => {
    const entryLike = toCatalogEntryLike(locator);
    expect(entryLike.packageHash).toBe(locator.packageHash);
    expect(entryLike.driveKey).toBe(locator.driveKey);
    expect(entryLike.version).toBe("1.2.3");

    const [aspect, hash] = casAnnounceAspects(t256);
    expect(aspect).toBe("cas");
    expect(hash).toMatch(/^[0-9a-f]{16}$/);

    const inlineId = encode256t(new Uint8Array(10), sha512);
    expect(() => casAnnounceAspects(inlineId)).toThrow(T256Error);
  });

  it("round-trips an on-demand locator request on a distinct aspect", () => {
    const encoded = encodeCasLocatorRequest(t256);
    expect(decodeCasLocatorRequest(encoded)).toBe(t256);
    expect(casRequestAspects(t256)).toEqual(["cas-request", casAnnounceAspects(t256)[1]]);

    const tampered = Uint8Array.from(encoded);
    tampered[0] ^= 0xff;
    expect(() => decodeCasLocatorRequest(tampered)).toThrow(T256Error);
  });
});
