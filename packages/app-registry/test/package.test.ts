import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  Identity,
  NodeCryptoProvider,
  PureCryptoProvider,
  bytesToHex,
  hexToBytes,
  type CryptoProvider
} from "@twistedpear/reticulum-ts";
import {
  CatalogStore,
  InstalledPackageStore,
  PackageError,
  buildAppAnnounceSummary,
  buildUnsignedManifest,
  compareSemver,
  decodeAppAnnounceData,
  encodeAppAnnounceData,
  packPackage,
  serializeCanonicalJson,
  signManifest,
  unpackPackage,
  verifyManifestSignature,
  verifyPackage
} from "../src/index.js";

const FIXTURE_DIR = resolve(dirname(fileURLToPath(import.meta.url)), "../../../conformance/fixtures/packages");

function providers(): CryptoProvider[] {
  return [new NodeCryptoProvider(), new PureCryptoProvider()];
}

function sampleFiles(): { path: string; content: Uint8Array }[] {
  return [
    { path: "bundle.js", content: new TextEncoder().encode('console.log("hello twistedpear");') },
    { path: "icon.png", content: new Uint8Array([0x89, 0x50, 0x4e, 0x47]) }
  ];
}

function buildSignedPackage(provider: CryptoProvider, identity: Identity, version = "1.0.0") {
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
      files: sampleFiles()
    },
    provider
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
  files: sampleFiles()
  });
}

describe("app-registry package format", () => {
  for (const provider of providers()) {
    const label = provider.constructor.name;

    it(`${label}: pack → unpack → verify round-trips`, () => {
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);
    const unpacked = unpackPackage(provider, packed.archiveBytes);

    expect(unpacked.packageHash).toBe(packed.packageHash);
    expect(unpacked.manifest).toEqual(packed.manifest);
    expect(unpacked.files.get("bundle.js")).toEqual(sampleFiles()[0]!.content);
    });

    it(`${label}: produces identical package hash from same inputs`, () => {
    const identity = new Identity(provider);
    const first = buildSignedPackage(provider, identity);
    const second = buildSignedPackage(provider, identity);
    expect(first.packageHash).toBe(second.packageHash);
    expect(first.archiveBytes).toEqual(second.archiveBytes);
    });

    it(`${label}: rejects modified file content`, () => {
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);
    const tampered = new Uint8Array(packed.archiveBytes);
    tampered[tampered.length - 5] ^= 0xff;

    expect(() => unpackPackage(provider, tampered)).toThrow(PackageError);
    });

    it(`${label}: rejects wrong signing key`, () => {
    const identity = new Identity(provider);
    const other = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);

    expect(() =>
      verifyPackage(provider, packed.archiveBytes, {
        expectedPublisherKey: other.getPublicKey()
      })
    ).toThrowError(expect.objectContaining({ code: "WRONG_KEY" }));
    });

    it(`${label}: rejects downgrade`, () => {
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity, "2.0.0");

    expect(() =>
      verifyPackage(provider, packed.archiveBytes, {
        minVersion: "2.1.0"
      })
    ).toThrowError(expect.objectContaining({ code: "DOWNGRADE" }));
    });

    it(`${label}: rejects minHostApi violation`, () => {
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);

    expect(() =>
      verifyPackage(provider, packed.archiveBytes, {
        hostApiVersion: "0.0.1"
      })
    ).toThrowError(expect.objectContaining({ code: "MIN_HOST_API" }));
    });
  }
});

describe("semver", () => {
  it("compares versions correctly", () => {
    expect(compareSemver("1.0.0", "1.0.1")).toBeLessThan(0);
    expect(compareSemver("2.0.0", "1.9.9")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0", "1.0.0")).toBe(0);
  });
});

describe("catalog", () => {
  it("ingests announces with trust pinning and rejects downgrades", () => {
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);
    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: packed.manifest,
      packageSize: packed.archiveBytes.length,
      packageHash: packed.packageHash,
      resourceAvailable: true
    });

    const catalog = new CatalogStore(provider);
    const entry = catalog.ingest({
      destinationHash: "abc",
      appData: encodeAppAnnounceData(summary),
      manifest: packed.manifest,
      packageHash: packed.packageHash
    });

    expect(entry).not.toBeNull();
    expect(entry!.version).toBe("1.0.0");

    const downgraded = {
      ...summary,
      version: "0.9.0"
    };

    expect(
      catalog.ingest({
        destinationHash: "abc",
        appData: encodeAppAnnounceData(downgraded),
        manifest: { ...packed.manifest, version: "0.9.0" }
      })
    ).toBeNull();
  });

  it("survives save/load", async () => {
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);
    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: packed.manifest,
      packageSize: packed.archiveBytes.length,
      packageHash: packed.packageHash,
      resourceAvailable: true
    });

    const catalog = new CatalogStore(provider);
    catalog.ingest({
      destinationHash: "abc",
      appData: encodeAppAnnounceData(summary),
      manifest: packed.manifest,
      packageHash: packed.packageHash
    });

    const store = new Map<string, Uint8Array>();
    const kv = {
      async get(key: string) {
        return store.get(key) ?? null;
      },
      async set(key: string, value: Uint8Array) {
        store.set(key, value);
      },
      async delete(key: string) {
        store.delete(key);
      },
      async list() {
        return [...store.keys()];
      }
    };

    await catalog.save(kv);
    const restored = new CatalogStore(provider);
    await restored.load(kv);
    expect(restored.list()).toHaveLength(1);
  });
});

describe("installed package store", () => {
  it("keeps previous version for rollback", () => {
    const store = new InstalledPackageStore(10_000_000);
    const manifest = {
      formatVersion: 1,
      name: "app",
      version: "1.0.0",
      entry: "bundle.js",
      capabilities: [],
      icon: null,
      minHostApi: "0.1.0",
      files: [],
      driveKey: "a".repeat(64),
      publisherPublicKey: "b".repeat(128),
      signature: "c".repeat(128)
    };

    store.install(
      {
        appId: "pub:app",
        version: "1.0.0",
        packageHash: "hash1",
        installedAt: 1,
        manifest,
        archivePath: "/p1"
      },
      1000
    );

    store.install(
      {
        appId: "pub:app",
        version: "2.0.0",
        packageHash: "hash2",
        installedAt: 2,
        manifest: { ...manifest, version: "2.0.0" },
        archivePath: "/p2"
      },
      1000
    );

    expect(store.latestVersion("pub:app")).toBe("2.0.0");
    expect(store.previousVersion("pub:app")).toBe("1.0.0");
  });
});

describe("golden fixtures", () => {
  it("writes tiny fixture for conformance", () => {
    const provider = new NodeCryptoProvider();
    const identity = new Identity(provider);
    const packed = buildSignedPackage(provider, identity);
    const summary = buildAppAnnounceSummary(provider, identity, {
      manifest: packed.manifest,
      packageSize: packed.archiveBytes.length,
      packageHash: packed.packageHash,
      resourceAvailable: true
    });

    mkdirSync(FIXTURE_DIR, { recursive: true });
    writeFileSync(resolve(FIXTURE_DIR, "tiny.tpkg"), packed.archiveBytes);
    writeFileSync(
      resolve(FIXTURE_DIR, "tiny.manifest.json"),
      serializeCanonicalJson(packed.manifest)
    );
    writeFileSync(
      resolve(FIXTURE_DIR, "tiny.meta.json"),
      JSON.stringify(
        {
          packageHash: packed.packageHash,
          publisherPublicKey: packed.manifest.publisherPublicKey,
          publisherPrivateKey: bytesToHex(identity.getPrivateKey()),
          appDataHex: bytesToHex(encodeAppAnnounceData(summary))
        },
        null,
        2
      )
    );

    expect(verifyManifestSignature(provider, packed.manifest)).toBe(true);
    const roundTrip = unpackPackage(provider, readFileSync(resolve(FIXTURE_DIR, "tiny.tpkg")));
    expect(roundTrip.packageHash).toBe(packed.packageHash);
  });
});
