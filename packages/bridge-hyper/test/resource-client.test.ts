import { describe, expect, it, vi } from "vitest";
import {
  Identity,
  LinkStatus,
  PureCryptoProvider,
  bytesToHex,
  type Link,
  type Reticulum,
  type Runtime,
} from "@twistedpear/reticulum-ts";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
} from "@twistedpear/app-registry";
import { PackageResourceClient } from "../src/client/resource-client.js";

const provider = new PureCryptoProvider();
const publisher = new Identity(provider);
const PUBLISHER_KEY_HEX = bytesToHex(publisher.getPublicKey());

function packageFixture() {
  const files = [
    { path: "bundle.js", content: new TextEncoder().encode("resource-client") },
  ];
  const unsigned = buildUnsignedManifest(
    {
      name: "resource.client",
      version: "1.0.0",
      entry: "bundle.js",
      driveKey: "ab".repeat(32),
      publisherPublicKey: PUBLISHER_KEY_HEX,
      files,
    },
    provider,
  );
  const manifest = signManifest(provider, publisher, unsigned);
  return packPackage(provider, {
    ...manifest,
    signature: manifest.signature,
    files,
  });
}

interface Responder {
  (request: { type: string; version?: string }): Uint8Array;
}

/**
 * A link that is active immediately and answers each request from `responder`,
 * standing in for a peer that has already established the resource link.
 */
function fakeReticulum(
  responder: Responder,
  options: { activeAfterMs?: number } = {},
) {
  const registrations: Array<{ appName: string; aspects: string[] }> = [];
  const reticulum = {
    started: 0,
    stopped: 0,
    registrations,
    start() {
      reticulum.started += 1;
    },
    stop() {
      reticulum.stopped += 1;
    },
    registerDestination(request: { appName: string; aspects: string[] }) {
      registrations.push({
        appName: request.appName,
        aspects: request.aspects,
      });
      return {
        requestLink() {
          const link = {
            status:
              options.activeAfterMs === undefined
                ? LinkStatus.ACTIVE
                : LinkStatus.PENDING,
            callbacks: {} as {
              resourceConcluded?: (resource: { data?: Uint8Array }) => void;
            },
            send(data: Uint8Array) {
              const request = JSON.parse(new TextDecoder().decode(data)) as {
                type: string;
                version?: string;
              };
              link.callbacks.resourceConcluded?.({ data: responder(request) });
              return Promise.resolve();
            },
          };
          if (options.activeAfterMs !== undefined) {
            setTimeout(() => {
              link.status = LinkStatus.ACTIVE;
            }, options.activeAfterMs);
          }
          return link as unknown as Link;
        },
      };
    },
  };
  return reticulum;
}

function clientFor(
  reticulum: ReturnType<typeof fakeReticulum>,
  overrides: { servingPublicKeyHex?: string } = {},
) {
  return new PackageResourceClient({
    provider,
    runtime: {} as Runtime,
    publisherPublicKeyHex: PUBLISHER_KEY_HEX,
    appName: "resource.client",
    identity: new Identity(provider),
    reticulum: reticulum as unknown as Reticulum,
    ...overrides,
  });
}

describe("PackageResourceClient", () => {
  it("leaves a borrowed node's lifecycle to its owner", async () => {
    const reticulum = fakeReticulum(() => new Uint8Array(0));
    const client = clientFor(reticulum);

    await client.start();
    await client.stop();

    expect(reticulum.started).toBe(0);
    expect(reticulum.stopped).toBe(0);
    expect(client.node).toBe(reticulum as unknown as Reticulum);
  });

  it("lists the versions advertised by the publisher", async () => {
    const versions = [{ version: "1.0.0", packageHash: "hash", size: 7 }];
    const reticulum = fakeReticulum((request) => {
      expect(request.type).toBe("list");
      return new TextEncoder().encode(JSON.stringify({ versions }));
    });

    expect(await clientFor(reticulum).listVersions()).toEqual(versions);
    expect(reticulum.registrations[0]?.aspects.length).toBeGreaterThan(0);
  });

  it("unpacks a fetched archive", async () => {
    const packed = packageFixture();
    const reticulum = fakeReticulum((request) => {
      expect(request).toEqual({ v: 1, type: "fetch", version: "1.0.0" });
      return packed.archiveBytes;
    });

    const result = await clientFor(reticulum).fetchVersion("1.0.0");

    expect(result.packageHash).toBe(packed.packageHash);
  });

  it("retries a failed fetch before succeeding", async () => {
    const packed = packageFixture();
    let attempts = 0;
    const reticulum = fakeReticulum(() => {
      attempts += 1;
      return attempts < 3 ? new Uint8Array([0, 1, 2]) : packed.archiveBytes;
    });

    const result = await clientFor(reticulum).fetchVersion("1.0.0");

    expect(attempts).toBe(3);
    expect(result.packageHash).toBe(packed.packageHash);
  });

  it("gives up after the configured number of attempts", async () => {
    const reticulum = fakeReticulum(() => new Uint8Array([0, 1, 2]));

    await expect(
      clientFor(reticulum).fetchVersion("1.0.0", {
        maxAttempts: 2,
        requestTimeoutMs: 50,
      }),
    ).rejects.toThrow();
  });

  it("waits for the link to become active", async () => {
    const reticulum = fakeReticulum(
      () => new TextEncoder().encode(JSON.stringify({ versions: [] })),
      { activeAfterMs: 60 },
    );

    expect(await clientFor(reticulum).listVersions()).toEqual([]);
  });

  it("rejects a serving key that is not a valid identity", async () => {
    const reticulum = fakeReticulum(() => new Uint8Array(0));

    await expect(
      clientFor(reticulum, {
        servingPublicKeyHex: "ab".repeat(16),
      }).listVersions(),
    ).rejects.toThrow("Invalid serving public key");
  });

  it("starts and stops a node it created itself", async () => {
    const created = fakeReticulum(() => new Uint8Array(0));
    const { Reticulum: ReticulumClass } =
      await import("@twistedpear/reticulum-ts");
    const create = vi
      .spyOn(ReticulumClass, "create")
      .mockReturnValue(created as unknown as Reticulum);

    const client = new PackageResourceClient({
      provider,
      runtime: {} as Runtime,
      publisherPublicKeyHex: PUBLISHER_KEY_HEX,
      appName: "resource.client",
      identity: new Identity(provider),
    });
    await client.start();
    await client.stop();

    expect(created.started).toBe(1);
    expect(created.stopped).toBe(1);
    create.mockRestore();
  });
});
