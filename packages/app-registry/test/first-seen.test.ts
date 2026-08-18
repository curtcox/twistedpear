import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
  type CryptoProvider,
} from "@twistedpear/reticulum-ts";
import {
  CatalogStore,
  FirstSeenLedger,
  buildAppAnnounceSummary,
  buildUnsignedManifest,
  encodeAppAnnounceData,
  firstSeenKey,
  packPackage,
  signManifest,
} from "../src/index.js";

function sampleFiles(): { path: string; content: Uint8Array }[] {
  return [
    {
      path: "bundle.js",
      content: new TextEncoder().encode('console.log("hello twistedpear");'),
    },
    { path: "icon.png", content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) },
  ];
}

function buildSignedPackage(
  provider: CryptoProvider,
  identity: Identity,
  version = "1.0.0",
) {
  const unsigned = buildUnsignedManifest(
    {
      name: "com.example.hello",
      version,
      entry: "bundle.js",
      capabilities: ["lxmf:send"],
      icon: "icon.png",
      minHostApi: "0.1.0",
      driveKey: "a".repeat(64),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files: sampleFiles(),
    },
    provider,
  );
  const manifest = signManifest(provider, identity, unsigned);
  return packPackage(provider, {
    name: manifest.name,
    version: manifest.version,
    entry: manifest.entry,
    capabilities: manifest.capabilities,
    icon: manifest.icon,
    minHostApi: manifest.minHostApi,
    driveKey: manifest.driveKey,
    publisherPublicKey: manifest.publisherPublicKey,
    signature: manifest.signature,
    files: sampleFiles(),
  });
}

function memoryKv() {
  const store = new Map<string, Uint8Array>();
  return {
    async get(key: string) {
      return store.get(key);
    },
    async set(key: string, value: Uint8Array) {
      store.set(key, value);
    },
    async delete(key: string) {
      store.delete(key);
    },
    async list() {
      return [...store.keys()];
    },
  };
}

describe("FirstSeenLedger", () => {
  const observation = {
    appId: "pub:com.example.hello",
    publisherPublicKey: "aa",
    packageHash: "hash-1",
  };

  it("keeps the first observation for a hash and resets on a new hash", () => {
    const ledger = new FirstSeenLedger();
    expect(ledger.record(observation, 10)).toBe(10);
    expect(ledger.record(observation, 50)).toBe(10);
    expect(ledger.get(observation)).toBe(10);
    expect(ledger.ageMs(observation, 40)).toBe(30);
    expect(
      ledger.record({ ...observation, packageHash: "hash-2" }, 80),
    ).toBe(80);
    expect(ledger.get(observation)).toBe(10);
  });

  it("round-trips a snapshot", () => {
    const ledger = new FirstSeenLedger();
    ledger.record(observation, 3);
    const restored = new FirstSeenLedger();
    restored.restore(ledger.snapshot());
    expect(restored.get(observation)).toBe(3);
    expect(firstSeenKey(observation)).toContain(observation.packageHash);
  });
});

describe("catalog first-seen ledger", () => {
  it("survives catalog TTL expiry and a later re-ingest of the same hash", async () => {
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);
    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: packed.manifest,
      packageSize: packed.archiveBytes.length,
      packageHash: packed.packageHash,
      resourceAvailable: true,
    });
    const catalog = new CatalogStore(provider, { entryTtlMs: 10 });
    const ingest = (now: number) =>
      catalog.ingest({
        destinationHash: "abc",
        appData: encodeAppAnnounceData(summary),
        manifest: packed.manifest,
        packageHash: packed.packageHash,
        now,
      });

    const entry = ingest(100);
    expect(entry).not.toBeNull();
    const lookup = {
      appId: entry!.appId,
      publisherPublicKey: entry!.publisherPublicKey,
      packageHash: packed.packageHash,
    };
    expect(catalog.firstSeenAt(
      lookup.appId,
      lookup.publisherPublicKey,
      lookup.packageHash,
    )).toBe(100);
    expect(catalog.pruneExpired(120)).toBe(1);
    expect(catalog.list()).toHaveLength(0);
    expect(catalog.firstSeenAt(
      lookup.appId,
      lookup.publisherPublicKey,
      lookup.packageHash,
    )).toBe(100);

    const kv = memoryKv();
    await catalog.save(kv);
    const restored = new CatalogStore(provider, { entryTtlMs: 10 });
    await restored.load(kv);
    expect(restored.list()).toHaveLength(0);
    expect(restored.firstSeenAt(
      lookup.appId,
      lookup.publisherPublicKey,
      lookup.packageHash,
    )).toBe(100);

    const again = restored.ingest({
      destinationHash: "abc",
      appData: encodeAppAnnounceData(summary),
      manifest: packed.manifest,
      packageHash: packed.packageHash,
      now: 500,
    });
    expect(again).not.toBeNull();
    expect(restored.firstSeenAt(
      lookup.appId,
      lookup.publisherPublicKey,
      lookup.packageHash,
    )).toBe(100);
    expect(
      restored.firstSeenAgeMs(
        lookup.appId,
        lookup.publisherPublicKey,
        lookup.packageHash,
        500,
      ),
    ).toBe(400);
  });

  it("starts a new clock when the package hash changes", () => {
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const first = buildSignedPackage(provider, identity, "1.0.0");
    const second = buildSignedPackage(provider, identity, "1.1.0");
    const catalog = new CatalogStore(provider);
    const ingest = (packed: typeof first, now: number) => {
      const summary = buildAppAnnounceSummary(provider, identity, {
        manifest: packed.manifest,
        packageSize: packed.archiveBytes.length,
        packageHash: packed.packageHash,
        resourceAvailable: true,
      });
      return catalog.ingest({
        destinationHash: "abc",
        appData: encodeAppAnnounceData(summary),
        manifest: packed.manifest,
        packageHash: packed.packageHash,
        now,
      });
    };

    const original = ingest(first, 10);
    const updated = ingest(second, 40);
    expect(original).not.toBeNull();
    expect(updated).not.toBeNull();
    expect(catalog.firstSeenAt(
      original!.appId,
      original!.publisherPublicKey,
      first.packageHash,
    )).toBe(10);
    expect(catalog.firstSeenAt(
      updated!.appId,
      updated!.publisherPublicKey,
      second.packageHash,
    )).toBe(40);
  });
});
