import { describe, expect, it } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  buildUnsignedManifest,
  appDestinationName,
  packPackage,
  signManifest,
  unpackPackage
} from "@twistedpear/app-registry";
import { attachPackageResourceServer } from "@twistedpear/bridge-hyper";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  bytesToHex,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { createBridgeHyperFetchPlane } from "../src/fetch-plane-bridge-hyper.js";
import { createResourceFetchPlane } from "../src/fetch-plane-resource.js";
import { createNodeHost } from "../src/node-host.js";
import { createFilePropagationPersistence } from "../src/propagation-persistence.js";
import { PropagationServer, DEFAULT_PROPAGATION_QUOTAS } from "@twistedpear/lxmf-ts";
import { decodeMessages, encodeMessage } from "../src/protocol.js";
import {
  DEFAULT_WEB_LEAF_ROLES,
  assertWebLeafRoles,
  defaultHostConfig,
  defaultWebLeafConfig
} from "../src/types.js";

describe("host-core protocol", () => {
  it("round-trips newline-delimited JSON", () => {
    const encoded = encodeMessage({ type: "log", line: "hello" });
    const parsed = decodeMessages(encoded);
    expect(parsed.messages).toHaveLength(1);
    expect(parsed.messages[0]).toEqual({ type: "log", line: "hello" });
  });
});

describe("host-core config", () => {
  it("defaults desktop roles with transport and seeder on", () => {
    const config = defaultHostConfig();
    expect(config.roles.transport).toBe(true);
    expect(config.roles.seeder).toBe(true);
  });

  it("defaults web leaf roles with transport and seeder off", () => {
    const config = defaultWebLeafConfig();
    expect(config.roles).toEqual(DEFAULT_WEB_LEAF_ROLES);
    expect(config.interfaces.auto.enabled).toBe(false);
    expect(config.interfaces.websocket.enabled).toBe(false);
  });

  it("rejects non-leaf roles for web host", () => {
    expect(() => assertWebLeafRoles(DEFAULT_WEB_LEAF_ROLES)).not.toThrow();
    expect(() =>
      assertWebLeafRoles({ transport: true, seeder: false, propagation: false, attachRnsd: null })
    ).toThrow(/leaf-only/);
  });
});

describe("host-core status endpoint", () => {
  it("serves localhost JSON when enabled", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-host-test-"));
    try {
      const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
        config: defaultHostConfig({
          dataDir,
          roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          },
          statusEndpoint: true
        })
      });

      const response = await fetch("http://127.0.0.1:9473/status");
      expect(response.ok).toBe(true);
      const status = (await response.json()) as {
        running: boolean;
        transportEnabled: boolean;
        dropCensus: { byReason: Record<string, number>; byPeer: Record<string, unknown> };
      };
      expect(status.running).toBe(true);
      expect(status.transportEnabled).toBe(false);
      expect(status.dropCensus).toEqual({ byReason: {}, byPeer: {} });
      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("host-core websocket gateway", () => {
  it("starts a WebSocket gateway and reports the listen port", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-host-ws-"));
    try {
      const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
        config: defaultHostConfig({
          dataDir,
          roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            websocket: { enabled: true, listenHost: "127.0.0.1", listenPort: 0 },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        })
      });

      const status = session.getStatus();
      expect(status.websocketGatewayPort).toBeGreaterThan(0);
      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("host-core interface manager exposure", () => {
  it("exposes InterfaceManager with the RelayService method surface", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-host-relay-"));
    try {
      const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
        config: defaultHostConfig({
          dataDir,
          roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
          relay: { mode: "off" },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        })
      });

      expect(session.interfaceManager).toBeDefined();
      expect(session.interfaceManager.status().mode).toBe("off");
      await session.interfaceManager.setMode("transport-node");
      expect(session.interfaceManager.status().mode).toBe("transport-node");
      expect(Array.isArray(session.interfaceManager.list())).toBe(true);
      await expect(session.interfaceManager.diagnostics()).resolves.toEqual(expect.any(Array));
      await session.stop();
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("host-core propagation persistence", () => {
  it("writes propagation store to disk and reloads it", async () => {
    const dataDir = mkdtempSync(join(tmpdir(), "tp-prop-persist-"));
    try {
      const storePath = join(dataDir, "propagation", "store.json");
      const provider = new NodeCryptoProvider();
      const persistence = createFilePropagationPersistence(storePath);
      const first = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
        now: () => Date.now(),
        schedule: (ms: number, callback: () => void) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
        persistence
      });
      const payload = new Uint8Array(32);
      payload[0] = 7;
      first.storePropagationData(payload);
      await new Promise((resolve) => setTimeout(resolve, 300));

      const restarted = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
        now: () => Date.now(),
        schedule: (ms: number, callback: () => void) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
        persistence
      });
      expect(restarted.stats.messageCount).toBe(1);
    } finally {
      rmSync(dataDir, { recursive: true, force: true });
    }
  });
});

describe("host-core fetch plane", () => {
  it("fetches a package over the resource path", async () => {
    const provider = new NodeCryptoProvider();
    const runtime = nodeRuntime();
    const publisher = new Identity(provider);
    const files = [{ path: "index.js", content: new TextEncoder().encode("ok") }];
    const unsigned = buildUnsignedManifest(
      {
        name: "fetch-plane-test",
        version: "1.0.0",
        entry: "index.js",
        driveKey: "a".repeat(64),
        publisherPublicKey: bytesToHex(publisher.getPublicKey()),
        capabilities: [],
        files
      },
      provider
    );
    const manifest = signManifest(provider, publisher, unsigned);
    const packed = packPackage(provider, { ...manifest, signature: manifest.signature, files });
    const unpacked = unpackPackage(provider, packed.archiveBytes);

    const publisherNode = Reticulum.create({ provider, runtime });
    publisherNode.start();
    const clientNode = Reticulum.create({ provider, runtime });
    clientNode.start();

    const [leftPipe, rightPipe] = PipeInterface.pair(provider);
    publisherNode.registerInterface(leftPipe);
    clientNode.registerInterface(rightPipe);

    const publisherKeyHex = bytesToHex(publisher.getPublicKey());
    const destinationParts = appDestinationName(provider, publisherKeyHex, "fetch-plane-test").split(".");

    const destination = publisherNode.registerDestination({
      provider,
      identity: publisher,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: destinationParts[0] ?? "tp",
      aspects: destinationParts.slice(1)
    });

    attachPackageResourceServer(destination, {
      async listVersions() {
        return [{ version: "1.0.0", packageHash: unpacked.packageHash, size: packed.archiveBytes.length }];
      },
      async fetchArchive() {
        return packed.archiveBytes;
      }
    });

    const fetchPlane = createResourceFetchPlane({ reticulum: clientNode, provider });
    const entry = {
      appId: "fetch-plane-test",
      publisherPublicKey: bytesToHex(publisher.getPublicKey()),
      name: "fetch-plane-test",
      version: "1.0.0",
      packageSize: packed.archiveBytes.length,
      packageHash: unpacked.packageHash,
      driveKey: unpacked.manifest.driveKey,
      resourceAvailable: true,
      destinationHash: "",
      receivedAt: Date.now(),
      expiresAt: Date.now() + 60_000,
      manifest: unpacked.manifest
    };

    const result = await fetchPlane.fetchPackage(provider, {
      entry,
      version: "1.0.0",
      interfaces: clientNode.listInterfaces()
    });

    expect(result.path).toBe("resource");
    expect(result.packageHash).toBe(unpacked.packageHash);
    expect(unpackPackage(provider, result.archiveBytes).manifest.name).toBe("fetch-plane-test");

    await clientNode.stop();
    await publisherNode.stop();
  });

  it("creates a bridge-hyper fetch plane adapter", () => {
    const plane = createBridgeHyperFetchPlane({});
    expect(typeof plane.fetchPackage).toBe("function");
  });
});
