import { describe, expect, it, vi } from "vitest";
import type { PacketInterface } from "@twistedpear/reticulum-ts";
import { Identity, PureCryptoProvider, bytesToHex } from "@twistedpear/reticulum-ts";
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
});

describe("fetchPackage path selection", () => {
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
});
