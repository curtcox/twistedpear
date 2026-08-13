import { afterEach, describe, expect, it, vi } from "vitest";
import type { CatalogEntry } from "@twistedpear/app-registry";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
} from "@twistedpear/app-registry";
import {
  Identity,
  PureCryptoProvider,
  bytesToHex,
} from "@twistedpear/reticulum-ts";
import { createWebCompositeFetchPlane } from "../src/client/fetch-plane-web.js";
import type {
  WebFetchPlane,
  WebFetchProgress,
} from "../src/client/fetch-plane-web.js";

const DRIVE_KEY = "ab".repeat(32);

function buildPackage(name: string, driveKey: string) {
  const provider = new PureCryptoProvider();
  const identity = new Identity(provider);
  const files = [
    { path: "bundle.js", content: new TextEncoder().encode(name) },
  ];
  const unsigned = buildUnsignedManifest(
    {
      name,
      version: "1.0.0",
      entry: "bundle.js",
      driveKey,
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
  return { provider, manifest, packed };
}

function catalogEntry(
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, "packageHash">,
): CatalogEntry {
  return {
    appId: "pub:web.fetch",
    publisherPublicKey: "pub",
    name: "web.fetch",
    version: "1.0.0",
    packageSize: 128,
    driveKey: DRIVE_KEY,
    resourceAvailable: true,
    destinationHash: "dest",
    receivedAt: 0,
    expiresAt: 0,
    manifest: null,
    ...overrides,
  };
}

function resourcePlane(archiveBytes: Uint8Array, packageHash: string) {
  return {
    fetchPackage: vi.fn(async () => ({
      path: "resource" as const,
      archiveBytes,
      packageHash,
    })),
  } satisfies WebFetchPlane;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("web composite fetch plane", () => {
  it("returns hyperdrive bytes verified against the catalog hash", async () => {
    const { provider, packed } = buildPackage("web.hyperdrive", DRIVE_KEY);
    vi.stubGlobal(
      "fetch",
      async () => new Response(packed.archiveBytes, { status: 200 }),
    );
    const fallback = resourcePlane(new Uint8Array(0), "unused");
    const progress: WebFetchProgress[] = [];

    const result = await createWebCompositeFetchPlane({
      resourcePlane: fallback,
      gatewayUrl: "ws://127.0.0.1:9480",
    }).fetchPackage(provider, {
      entry: catalogEntry({ packageHash: packed.packageHash }),
      version: "1.0.0",
      onProgress: (update) => progress.push(update),
    });

    expect(result.path).toBe("hyperdrive");
    expect(result.packageHash).toBe(packed.packageHash);
    expect(result.archiveBytes).toEqual(packed.archiveBytes);
    expect(progress.map((update) => update.phase)).toEqual([
      "starting",
      "verifying",
      "complete",
    ]);
    expect(fallback.fetchPackage).not.toHaveBeenCalled();
  });

  it("skips the gateway entirely when the entry has no drive key", async () => {
    const { provider, packed } = buildPackage("web.nodrive", DRIVE_KEY);
    vi.stubGlobal("fetch", async () => {
      throw new Error("gateway must not be contacted");
    });
    const fallback = resourcePlane(packed.archiveBytes, packed.packageHash);

    const result = await createWebCompositeFetchPlane({
      resourcePlane: fallback,
      gatewayUrl: "ws://127.0.0.1:9480",
    }).fetchPackage(provider, {
      entry: catalogEntry({ packageHash: packed.packageHash, driveKey: "" }),
      version: "1.0.0",
    });

    expect(result.path).toBe("resource");
    expect(fallback.fetchPackage).toHaveBeenCalledTimes(1);
  });

  it("falls back to the resource plane when the gateway fetch fails", async () => {
    const { provider, packed } = buildPackage("web.gatewaydown", DRIVE_KEY);
    vi.stubGlobal("fetch", async () => new Response("down", { status: 502 }));
    const fallback = resourcePlane(packed.archiveBytes, packed.packageHash);
    const progress: WebFetchProgress[] = [];

    const result = await createWebCompositeFetchPlane({
      resourcePlane: fallback,
      gatewayUrl: "ws://127.0.0.1:9480",
    }).fetchPackage(provider, {
      entry: catalogEntry({ packageHash: packed.packageHash }),
      version: "1.0.0",
      onProgress: (update) => progress.push(update),
    });

    expect(result.path).toBe("resource");
    expect(progress.map((update) => update.phase)).toEqual([
      "starting",
      "failed",
    ]);
  });

  it("falls back when the hyperdrive archive hash does not match the catalog", async () => {
    const { provider, packed } = buildPackage("web.mismatch", DRIVE_KEY);
    vi.stubGlobal(
      "fetch",
      async () => new Response(packed.archiveBytes, { status: 200 }),
    );
    const fallback = resourcePlane(packed.archiveBytes, packed.packageHash);

    const result = await createWebCompositeFetchPlane({
      resourcePlane: fallback,
      gatewayUrl: "ws://127.0.0.1:9480",
    }).fetchPackage(provider, {
      entry: catalogEntry({ packageHash: "0".repeat(64) }),
      version: "1.0.0",
    });

    expect(result.path).toBe("resource");
    expect(fallback.fetchPackage).toHaveBeenCalledTimes(1);
  });
});
