import { describe, expect, it, vi } from "vitest";
import type { PacketInterface } from "@twistedpear/reticulum-ts";
import { Identity, PureCryptoProvider, bytesToHex } from "@twistedpear/reticulum-ts";
import { encode256t, signCasLocator } from "@twistedpear/cas-256t";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest
} from "@twistedpear/app-registry";
import { assessFetchBudget, BULK_BLOCK_RNODE_BYTES, fetchPackage } from "../src/fetch.js";
import type { DriveManager } from "../src/drive.js";

function mockIface(name: string, online: boolean): PacketInterface {
  return {
    name,
    mtu: 500,
    bitrate: null,
    incoming: true,
    outgoing: true,
    online,
    packets: (async function* () {})(),
    async send() {},
    async close() {}
  };
}

describe("fetch budget rules", () => {
  it("blocks bulk fetch over RNode-only links", () => {
    const assessment = assessFetchBudget(
      {
        appId: "a",
        publisherPublicKey: "b",
        name: "app",
        version: "1.0.0",
        packageSize: BULK_BLOCK_RNODE_BYTES + 1,
        packageHash: "hash",
        driveKey: "d".repeat(64),
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: null
      },
      [mockIface("rnode", true)]
    );

    expect(assessment.allowed).toBe(false);
  });

  it("warns on large BLE transfers", () => {
    const assessment = assessFetchBudget(
      {
        appId: "a",
        publisherPublicKey: "b",
        name: "app",
        version: "1.0.0",
        packageSize: 300_000,
        packageHash: "hash",
        driveKey: "d".repeat(64),
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: null
      },
      [mockIface("ble", true)]
    );

    expect(assessment.allowed).toBe(true);
    expect(assessment.warning).toContain("BLE");
  });

  it("treats an available Freenet node as an IP bulk path", () => {
    const assessment = assessFetchBudget(
      {
        appId: "a",
        publisherPublicKey: "b",
        name: "app",
        version: "1.0.0",
        packageSize: BULK_BLOCK_RNODE_BYTES + 1,
        packageHash: "hash",
        driveKey: "d".repeat(64),
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: null
      },
      [mockIface("rnode", true)],
      true
    );

    expect(assessment.allowed).toBe(true);
  });
});

describe("fetchPackage path selection", () => {
  it("ranks an available Freenet node after direct IP paths and before Resource", async () => {
    const provider = new PureCryptoProvider();
    const identity = new Identity(provider);
    const files = [{ path: "bundle.js", content: new TextEncoder().encode("freenet-fetch-test") }];
    const unsigned = buildUnsignedManifest(
      {
        name: "fetch.freenet",
        version: "1.0.0",
        entry: "bundle.js",
        driveKey: "e".repeat(64),
        publisherPublicKey: bytesToHex(identity.getPublicKey()),
        files
      },
      provider
    );
    const manifest = signManifest(provider, identity, unsigned);
    const packed = packPackage(provider, { ...manifest, signature: manifest.signature, files });
    const t256 = encode256t(packed.archiveBytes, (bytes) => provider.sha512(bytes));
    const locator = signCasLocator(identity, {
      t256,
      appId: manifest.name,
      version: manifest.version,
      driveKey: manifest.driveKey,
      packageHash: packed.packageHash,
      packageSize: packed.archiveBytes.length
    });
    const driveManager = {
      activeDrive: null,
      openDrive: vi.fn(async () => {}),
      fetchVersion: vi.fn(async () => {
        throw new Error("hyperswarm unavailable");
      }),
      mirrorFrom: vi.fn(async () => {
        throw new Error("lan mirror unavailable");
      })
    } as unknown as DriveManager;
    const freenetFetcher = {
      fetchLocator: vi.fn(async () => packed.archiveBytes)
    };
    const resourceClient = {
      fetchVersion: vi.fn(async () => {
        throw new Error("resource should not be used");
      })
    };

    const result = await fetchPackage(provider, {
      entry: {
        appId: "pub:fetch.freenet",
        publisherPublicKey: manifest.publisherPublicKey,
        name: manifest.name,
        version: manifest.version,
        packageSize: packed.archiveBytes.length,
        packageHash: packed.packageHash,
        driveKey: manifest.driveKey,
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: packed.manifest
      },
      version: manifest.version,
      interfaces: [mockIface("tcp", true)],
      driveManager,
      lanMirrorKeyHex: "f".repeat(64),
      freenetFetcher,
      freenetLocator: locator,
      resourceClient: resourceClient as never
    });

    expect(result.path).toBe("freenet");
    expect(freenetFetcher.fetchLocator).toHaveBeenCalledWith(locator);
    expect(resourceClient.fetchVersion).not.toHaveBeenCalled();
  });

  it("falls through from hyperdrive to resource", async () => {
    const provider = new PureCryptoProvider();
    const identity = new Identity(provider);
    const files = [{ path: "bundle.js", content: new TextEncoder().encode("fetch-test") }];
    const unsigned = buildUnsignedManifest(
      {
        name: "fetch.test",
        version: "1.0.0",
        entry: "bundle.js",
        driveKey: "b".repeat(64),
        publisherPublicKey: bytesToHex(identity.getPublicKey()),
        files
      },
      provider
    );
    const manifest = signManifest(provider, identity, unsigned);
    const packed = packPackage(provider, { ...manifest, signature: manifest.signature, files });

    const driveManager = {
      openDrive: vi.fn(async () => {}),
      fetchVersion: vi.fn(async () => {
        throw new Error("dht blocked");
      })
    } as unknown as DriveManager;

    const resourceClient = {
      fetchVersion: vi.fn(async () => ({
        packageHash: packed.packageHash,
        manifest: packed.manifest,
        files: packed.files,
        archiveBytes: packed.archiveBytes
      }))
    };

    const result = await fetchPackage(provider, {
      entry: {
        appId: "pub:fetch.test",
        publisherPublicKey: manifest.publisherPublicKey,
        name: "fetch.test",
        version: "1.0.0",
        packageSize: packed.archiveBytes.length,
        packageHash: packed.packageHash,
        driveKey: manifest.driveKey,
        resourceAvailable: true,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: packed.manifest
      },
      version: "1.0.0",
      interfaces: [mockIface("tcp", true)],
      driveManager,
      resourceClient: resourceClient as never
    });

    expect(result.path).toBe("resource");
    expect(result.verified.packageHash).toBe(packed.packageHash);
  });

  it("uses lan-mirror when hyperdrive fails", async () => {
    const provider = new PureCryptoProvider();
    const identity = new Identity(provider);
    const files = [{ path: "bundle.js", content: new TextEncoder().encode("lan-mirror-test") }];
    const unsigned = buildUnsignedManifest(
      {
        name: "fetch.lan",
        version: "1.0.0",
        entry: "bundle.js",
        driveKey: "c".repeat(64),
        publisherPublicKey: bytesToHex(identity.getPublicKey()),
        files
      },
      provider
    );
    const manifest = signManifest(provider, identity, unsigned);
    const packed = packPackage(provider, { ...manifest, signature: manifest.signature, files });

    const driveManager = {
      activeDrive: null,
      openDrive: vi.fn(async () => {}),
      fetchVersion: vi.fn(async () => packed.archiveBytes),
      mirrorFrom: vi.fn(async () => {})
    } as unknown as DriveManager;

    const result = await fetchPackage(provider, {
      entry: {
        appId: "pub:fetch.lan",
        publisherPublicKey: manifest.publisherPublicKey,
        name: "fetch.lan",
        version: "1.0.0",
        packageSize: packed.archiveBytes.length,
        packageHash: packed.packageHash,
        driveKey: manifest.driveKey,
        resourceAvailable: false,
        destinationHash: "dest",
        receivedAt: 0,
        expiresAt: 0,
        manifest: packed.manifest
      },
      version: "1.0.0",
      interfaces: [mockIface("tcp", true)],
      driveManager,
      lanMirrorKeyHex: "d".repeat(64),
      forcePath: "lan-mirror"
    });

    expect(result.path).toBe("lan-mirror");
    expect(driveManager.mirrorFrom).toHaveBeenCalledWith("d".repeat(64));
    expect(result.verified.packageHash).toBe(packed.packageHash);
  });
});
