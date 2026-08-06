import { describe, expect, it, vi } from "vitest";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
} from "@twistedpear/app-registry";
import { encode256t, signCasLocator } from "@twistedpear/cas-256t";
import {
  Identity,
  PureCryptoProvider,
  bytesToHex,
  type PacketInterface,
} from "@twistedpear/reticulum-ts";
import { createBridgeHyperFetchPlane } from "../src/fetch-plane-bridge-hyper.js";

function onlineTcpInterface(): PacketInterface {
  return {
    name: "tcp",
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

describe("bridge fetch plane Freenet path", () => {
  it("forwards a forced Freenet path instead of trying direct IP first", async () => {
    const provider = new PureCryptoProvider();
    const identity = new Identity(provider);
    const files = [
      {
        path: "bundle.js",
        content: new TextEncoder().encode("host fetch-plane Freenet test"),
      },
    ];
    const unsigned = buildUnsignedManifest(
      {
        name: "fetch-plane.freenet",
        version: "1.0.0",
        entry: "bundle.js",
        driveKey: "a".repeat(64),
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
    const locator = signCasLocator(identity, {
      t256: encode256t(packed.archiveBytes, (bytes) => provider.sha512(bytes)),
      appId: manifest.name,
      version: manifest.version,
      driveKey: manifest.driveKey,
      packageHash: packed.packageHash,
      packageSize: packed.archiveBytes.length,
    });
    const driveFetcher = {
      fetchDriveVersion: vi.fn(async () => packed.archiveBytes),
    };
    const freenetFetcher = {
      fetchLocator: vi.fn(async () => packed.archiveBytes),
    };
    const plane = createBridgeHyperFetchPlane({
      driveFetcher,
      freenetFetcher,
    });

    const result = await plane.fetchPackage(provider, {
      entry: {
        appId: "publisher:fetch-plane.freenet",
        publisherPublicKey: manifest.publisherPublicKey,
        name: manifest.name,
        version: manifest.version,
        packageSize: packed.archiveBytes.length,
        packageHash: packed.packageHash,
        driveKey: manifest.driveKey,
        resourceAvailable: false,
        destinationHash: "destination",
        receivedAt: 0,
        expiresAt: 60_000,
        manifest: packed.manifest,
      },
      version: manifest.version,
      interfaces: [onlineTcpInterface()],
      freenetLocator: locator,
      forcePath: "freenet",
    });

    expect(result.path).toBe("freenet");
    expect(freenetFetcher.fetchLocator).toHaveBeenCalledWith(locator);
    expect(driveFetcher.fetchDriveVersion).not.toHaveBeenCalled();
  });
});
