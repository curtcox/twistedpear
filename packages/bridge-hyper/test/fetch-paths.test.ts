import { describe, expect, it, vi } from "vitest";
import { InterfaceKind } from "@twistedpear/reticulum-interfaces/policy";
import {
  Identity,
  PureCryptoProvider,
  bytesToHex,
  type PacketInterface,
} from "@twistedpear/reticulum-ts";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
  type CatalogEntry,
} from "@twistedpear/app-registry";
import {
  estimateTransferSeconds,
  fetchPackage,
  type FetchPackageOptions,
} from "../src/core/fetch.js";
import type { DriveManager } from "../src/core/drive.js";

const provider = new PureCryptoProvider();

function mockIface(name: string): PacketInterface {
  return {
    name,
    mtu: 500,
    bitrate: null,
    incoming: true,
    outgoing: true,
    online: true,
    packets: (async function* () {})(),
    async send() {},
    async close() {},
  };
}

function packageFixture() {
  const identity = new Identity(provider);
  const files = [
    { path: "bundle.js", content: new TextEncoder().encode("fetch-paths") },
  ];
  const unsigned = buildUnsignedManifest(
    {
      name: "fetch.paths",
      version: "1.0.0",
      entry: "bundle.js",
      driveKey: "ab".repeat(32),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files,
    },
    provider,
  );
  const manifest = signManifest(provider, identity, unsigned);
  const packed = packPackage(provider, {
    ...manifest,
    signature: manifest.signature,
    files,
  });
  const entry: CatalogEntry = {
    appId: "pub:fetch.paths",
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
    manifest: packed.manifest,
  };
  return { packed, entry };
}

function fetchWith(
  entry: CatalogEntry,
  options: Partial<FetchPackageOptions> = {},
) {
  return fetchPackage(provider, {
    entry,
    version: "1.0.0",
    interfaces: [mockIface("tcp")],
    ...options,
  });
}

describe("fetch path availability", () => {
  it("uses an injected drive fetcher ahead of a drive manager", async () => {
    const { packed, entry } = packageFixture();
    const driveFetcher = {
      fetchDriveVersion: vi.fn(async () => packed.archiveBytes),
    };

    const result = await fetchWith(entry, { driveFetcher });

    expect(result.path).toBe("hyperdrive");
    expect(driveFetcher.fetchDriveVersion).toHaveBeenCalledWith(
      entry.driveKey,
      "1.0.0",
    );
  });

  it("opens the drive when the manager has no active drive", async () => {
    const { packed, entry } = packageFixture();
    const driveManager = {
      activeDrive: null,
      openDrive: vi.fn(async () => {}),
      fetchVersion: vi.fn(async () => packed.archiveBytes),
    } as unknown as DriveManager;

    const result = await fetchWith(entry, { driveManager });

    expect(result.path).toBe("hyperdrive");
    expect(driveManager.openDrive).toHaveBeenCalledWith(entry.driveKey);
  });

  it("reuses an already open drive", async () => {
    const { packed, entry } = packageFixture();
    const driveManager = {
      activeDrive: {},
      openDrive: vi.fn(async () => {}),
      fetchVersion: vi.fn(async () => packed.archiveBytes),
    } as unknown as DriveManager;

    await fetchWith(entry, { driveManager });

    expect(driveManager.openDrive).not.toHaveBeenCalled();
  });

  it("reports each unwired path as unavailable", async () => {
    const { entry } = packageFixture();

    await expect(fetchWith(entry, { forcePath: "hyperdrive" })).rejects.toThrow(
      "hyperdrive path unavailable",
    );
    await expect(fetchWith(entry, { forcePath: "lan-mirror" })).rejects.toThrow(
      "lan mirror path unavailable",
    );
    await expect(fetchWith(entry, { forcePath: "freenet" })).rejects.toThrow(
      "freenet path unavailable",
    );
    await expect(fetchWith(entry, { forcePath: "resource" })).rejects.toThrow(
      "resource path unavailable",
    );
  });

  it("treats a drive manager without a mirror key as no lan-mirror path", async () => {
    const { entry } = packageFixture();
    const driveManager = { mirrorFrom: vi.fn() } as unknown as DriveManager;

    await expect(
      fetchWith(entry, { driveManager, forcePath: "lan-mirror" }),
    ).rejects.toThrow("lan mirror path unavailable");
    expect(driveManager.mirrorFrom).not.toHaveBeenCalled();
  });

  it("stops before contacting a path when the caller aborts", async () => {
    const { packed, entry } = packageFixture();
    const controller = new AbortController();
    controller.abort();
    const driveFetcher = {
      fetchDriveVersion: vi.fn(async () => packed.archiveBytes),
    };

    await expect(
      fetchWith(entry, { driveFetcher, signal: controller.signal }),
    ).rejects.toThrow("fetch aborted");
    expect(driveFetcher.fetchDriveVersion).not.toHaveBeenCalled();
  });

  it("offers only the resource path when no IP interface is online", async () => {
    const { packed, entry } = packageFixture();
    const driveFetcher = {
      fetchDriveVersion: vi.fn(async () => packed.archiveBytes),
    };
    const resourceClient = {
      fetchVersion: vi.fn(async () => ({ archiveBytes: packed.archiveBytes })),
    };

    const result = await fetchWith(entry, {
      interfaces: [mockIface("rnode")],
      driveFetcher,
      resourceClient: resourceClient as never,
    });

    expect(result.path).toBe("resource");
    expect(driveFetcher.fetchDriveVersion).not.toHaveBeenCalled();
  });

  it("rejects a package whose bytes do not match the catalog hash", async () => {
    const { packed, entry } = packageFixture();
    const driveFetcher = {
      fetchDriveVersion: vi.fn(async () => packed.archiveBytes),
    };

    await expect(
      fetchWith(
        { ...entry, packageHash: "0".repeat(64) },
        { driveFetcher, forcePath: "hyperdrive" },
      ),
    ).rejects.toThrow("Package hash mismatch after fetch");
  });
});

describe("estimateTransferSeconds", () => {
  it("divides the payload by the interface bitrate", () => {
    expect(estimateTransferSeconds(1_000, InterfaceKind.TCP)).toBeGreaterThan(
      0,
    );
  });

  it("falls back to a conservative bitrate for unknown interfaces", () => {
    expect(estimateTransferSeconds(5_000, "unknown" as never)).toBe(8);
  });
});
