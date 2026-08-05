#!/usr/bin/env node
/**
 * DevStudio cross-version conformance: create a simple app in the Electron host
 * wrapper and in the web host wrapper, then send each app to the other wrapper.
 */

import { readFileSync, rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  InstalledPackageStore,
  buildUnsignedManifest,
  packPackage,
  signManifest,
  unpackPackage,
  verifyPackage,
} from "../../packages/app-registry/dist/index.js";
import { decode256t, verify256t } from "../../packages/cas-256t/dist/index.js";
import {
  Identity,
  NodeCryptoProvider,
  bytesToHex,
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";
import { HOST_API_VERSION } from "../../packages/miniapp-runtime/dist/index.js";
import { createSandboxBackend } from "../../packages/miniapp-runtime/dist/sandbox/factory.js";
import { reviveJsonWireValue } from "../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import { createWorkletMiniappHost as createElectronMiniappHost } from "../../apps/host-desktop/worklet/miniapp-host.mjs";
import { createWebWorkletMiniappHost } from "../../apps/harness-mobile/worklet/web-miniapp-host.mjs";

const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();
const sha512 = (data) => provider.sha512(data);
const devstudioDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/devstudio",
);
const T256_PATTERN = /^[A-Za-z0-9_-]{94}$/;

class MemoryKvStore {
  values = new Map();

  async get(key) {
    return this.values.get(key) ?? null;
  }

  async set(key, value) {
    this.values.set(key, value);
  }

  async delete(key) {
    this.values.delete(key);
  }

  async list(prefix) {
    return [...this.values.keys()].filter((key) => key.startsWith(prefix));
  }
}

class MemoryPackageStorage {
  records = [];
  archives = new Map();

  async installArchive(archiveBytes) {
    const verified = verifyPackage(provider, archiveBytes, {
      hostApiVersion: HOST_API_VERSION,
    });
    const appId = verified.manifest.name;
    const version = verified.manifest.version;
    const archivePath = `${appId}/${version}.tpkg`;
    const existingIndex = this.records.findIndex(
      (record) => record.appId === appId && record.version === version,
    );
    const record = {
      appId,
      version,
      packageHash: verified.packageHash,
      installedAt: Date.now(),
      manifest: verified.manifest,
      archivePath,
    };

    if (existingIndex >= 0) {
      this.records.splice(existingIndex, 1, record);
    } else {
      this.records.push(record);
    }
    this.archives.set(archivePath, archiveBytes);

    return { appId, version, archiveBytes: archiveBytes.length };
  }

  activeVersion(appId) {
    const record = [...this.records]
      .reverse()
      .find((entry) => entry.appId === appId);
    return record?.version ?? null;
  }

  listInstalled() {
    return [...this.records];
  }

  async readArchive(appId, version) {
    return this.archives.get(`${appId}/${version}.tpkg`) ?? null;
  }
}

function archiveStore() {
  const values = new Map();
  return {
    async get(key) {
      return values.get(key);
    },
    async set(key, value) {
      values.set(key, value);
    },
    async delete(key) {
      values.delete(key);
    },
  };
}

function sleep(ms) {
  return new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 20_000, what = "condition") {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate();
    if (value !== null && value !== undefined && value !== false) {
      return value;
    }
    await sleep(50);
  }

  throw new Error(`waitFor timeout: ${what}`);
}

function findNode(tree, predicate) {
  if (!tree?.root) {
    return null;
  }

  const walk = (node) => {
    if (predicate(node)) {
      return node;
    }

    for (const child of node.children ?? []) {
      const found = walk(child);
      if (found !== null) {
        return found;
      }
    }

    return null;
  };

  return walk(tree.root);
}

function latestRuntime(peer) {
  return [...peer.outbound]
    .reverse()
    .find(
      (message) =>
        message.type === "miniapp-runtime" &&
        (message.slot === undefined || message.slot === "main"),
    );
}

function latestText(peer, nodeId) {
  const tree = latestRuntime(peer)?.runtime?.widgetTree;
  return findNode(tree, (node) => node.id === nodeId)?.props?.value ?? "";
}

function packDevstudio(identity) {
  const devstudioManifest = JSON.parse(
    readFileSync(join(devstudioDir, "app.manifest.json"), "utf8"),
  );
  const devstudioFiles = [
    {
      path: "bundle.js",
      content: new Uint8Array(readFileSync(join(devstudioDir, "bundle.js"))),
    },
  ];
  const unsigned = buildUnsignedManifest(
    {
      name: devstudioManifest.name,
      version: devstudioManifest.version,
      entry: devstudioManifest.entry,
      capabilities: devstudioManifest.capabilities,
      icon: null,
      minHostApi: devstudioManifest.minHostApi,
      driveKey: "0".repeat(64),
      publisherPublicKey: bytesToHex(identity.getPublicKey()),
      files: devstudioFiles,
    },
    provider,
  );
  const signed = signManifest(provider, identity, unsigned);
  const packed = packPackage(provider, {
    ...signed,
    signature: signed.signature,
    files: devstudioFiles,
  });
  const verified = verifyPackage(provider, packed.archiveBytes, {
    hostApiVersion: HOST_API_VERSION,
  });
  return {
    archive: packed.archiveBytes,
    manifest: verified.manifest,
    packageHash: verified.packageHash,
  };
}

class PublishedExchange {
  archives = new Map();

  publish(source, { t256, archive }) {
    const unpacked = unpackPackage(provider, archive);
    this.archives.set(t256, {
      source,
      archive,
      appId: unpacked.manifest.name,
      version: unpacked.manifest.version,
      publisherPublicKey: unpacked.manifest.publisherPublicKey,
    });
    return { t256, version: unpacked.manifest.version };
  }

  get(t256) {
    return this.archives.get(t256) ?? null;
  }
}

class WebSandboxRelay {
  backend = createSandboxBackend("node-worker");
  instances = new Map();
  pendingBrokers = new Map();
  host = null;

  setHost(host) {
    this.host = host;
  }

  async handle(message) {
    if (this.host === null) {
      throw new Error("web sandbox relay host is not attached");
    }

    if (message.type === "sandbox-spawn") {
      try {
        const instance = await this.backend.spawn({
          appId: message.appId,
          version: message.version,
          entryPath: message.entryPath,
          bundle: hexToBytes(message.bundleHex),
          brokerEndpoint: {
            request: (request) =>
              this.requestBroker(message.instanceId, request),
          },
        });
        this.instances.set(message.instanceId, instance);
        this.host.sandboxController.handleSpawned(
          message.requestId,
          message.instanceId,
        );
      } catch (error) {
        this.host.sandboxController.handleSpawnFailed(
          message.requestId,
          error instanceof Error ? error.message : String(error),
        );
      }
      return;
    }

    if (message.type === "sandbox-post") {
      await this.instances
        .get(message.instanceId)
        ?.postMessage(message.payload);
      return;
    }

    if (message.type === "sandbox-ping") {
      const alive =
        (await this.instances
          .get(message.instanceId)
          ?.ping(message.timeoutMs)) ?? false;
      this.host.sandboxController.handlePingResult(message.requestId, alive);
      return;
    }

    if (message.type === "sandbox-kill") {
      await this.instances.get(message.instanceId)?.kill(message.reason);
      this.instances.delete(message.instanceId);
      return;
    }

    if (message.type === "sandbox-broker-response") {
      const waiter = this.pendingBrokers.get(message.requestId);
      if (waiter !== undefined) {
        this.pendingBrokers.delete(message.requestId);
        waiter.resolve(reviveJsonWireValue(message.response));
      }
    }
  }

  requestBroker(instanceId, request) {
    if (this.host === null) {
      return Promise.reject(
        new Error("web sandbox relay host is not attached"),
      );
    }

    const requestId = `broker-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pendingBrokers.delete(requestId);
        reject(new Error(`timeout waiting for broker response ${requestId}`));
      }, 20_000);

      this.pendingBrokers.set(requestId, {
        resolve: (value) => {
          clearTimeout(timer);
          resolve(value);
        },
        reject: (error) => {
          clearTimeout(timer);
          reject(error);
        },
      });
      this.host.sandboxController.handleBrokerRequest(
        requestId,
        instanceId,
        request,
      );
    });
  }

  async close() {
    for (const [requestId, waiter] of this.pendingBrokers) {
      this.pendingBrokers.delete(requestId);
      waiter.reject(new Error("web sandbox relay closed"));
    }
    await Promise.all(
      [...this.instances.values()].map((instance) =>
        instance.kill("test-cleanup").catch(() => {}),
      ),
    );
    this.instances.clear();
  }
}

function hexToBytes(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function createElectronPeer(exchange, tmp, name) {
  const identity = new Identity(provider);
  const kvStore = new MemoryKvStore();
  const installed = new InstalledPackageStore(64 * 1024 * 1024);
  const peerRuntime = { ...runtime, store: archiveStore() };
  const outbound = [];
  const peer = {
    kind: "electron",
    name,
    identity,
    kvStore,
    installed,
    runtime: peerRuntime,
    outbound,
    host: null,
  };

  peer.host = createElectronMiniappHost({
    provider,
    kvStore,
    createSandboxBackend,
    sandboxBackend: "node-worker",
    beeStoragePath: join(tmp, `${name}-bee`),
    send: (message) => outbound.push(message),
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({
      autoPeers: 1,
      onlineInterfaces: 1,
      preferredInterface: "test",
    }),
    getPublisherIdentity: async () => identity,
    publishArchive: (request) => exchange.publish(name, request),
    installFromT256: (t256) => installIntoElectronPeer(peer, exchange, t256),
    async requestUserConfirmation() {
      return { approved: true };
    },
    async requestLaunchReview(review) {
      return {
        accept: true,
        grants: review.capabilities.map((capability) => capability.id),
      };
    },
  });

  return peer;
}

function createWebPeer(exchange, tmp, name) {
  const identity = new Identity(provider);
  const kvStore = new MemoryKvStore();
  const packageStorage = new MemoryPackageStorage();
  const outbound = [];
  const relay = new WebSandboxRelay();
  const peer = {
    kind: "web",
    name,
    identity,
    kvStore,
    packageStorage,
    outbound,
    relay,
    host: null,
  };

  peer.host = createWebWorkletMiniappHost({
    provider,
    kvStore,
    beeStoragePath: join(tmp, `${name}-bee`),
    send: (message) => {
      outbound.push(message);
      if (
        typeof message.type === "string" &&
        message.type.startsWith("sandbox-")
      ) {
        void relay.handle(message);
      }
    },
    onDeveloperModeChange() {},
    onMiniappStateChange() {},
    getPresenceSnapshot: () => ({
      autoPeers: 1,
      onlineInterfaces: 1,
      preferredInterface: "test",
    }),
    getPublisherIdentity: async () => identity,
    publishArchive: (request) => exchange.publish(name, request),
    installFromT256: (t256) => installIntoWebPeer(peer, exchange, t256),
    async requestHostReply(message) {
      if (
        message.type === "launch-review" ||
        message.type === "install-review"
      ) {
        return {
          accept: true,
          grants: message.capabilities.map((capability) => capability.id),
        };
      }
      return { approved: true };
    },
  });
  relay.setHost(peer.host);

  return peer;
}

async function installDevstudio(peer) {
  const packed = packDevstudio(peer.identity);

  if (peer.kind === "electron") {
    const archivePath = "packages/devstudio/0.1.0.tpkg";
    await peer.runtime.store.set(archivePath, packed.archive);
    peer.installed.install(
      {
        appId: "devstudio",
        version: packed.manifest.version,
        packageHash: packed.packageHash,
        installedAt: Date.now(),
        manifest: packed.manifest,
        archivePath,
      },
      packed.archive.length,
    );
    await peer.host.setGrants(
      "devstudio",
      packed.manifest.publisherPublicKey,
      packed.manifest.capabilities,
      packed.manifest.capabilities,
    );
    await peer.host.launch(peer.installed, peer.runtime, "devstudio");
  } else {
    await peer.packageStorage.installArchive(packed.archive);
    await peer.host.setGrants(
      "devstudio",
      packed.manifest.publisherPublicKey,
      packed.manifest.capabilities,
      packed.manifest.capabilities,
    );
    await peer.host.launch(peer.packageStorage, "devstudio");
  }

  await waitFor(
    () => {
      const tree = latestRuntime(peer)?.runtime?.widgetTree;
      return tree && findNode(tree, (node) => node.id === "new-project")
        ? true
        : null;
    },
    20_000,
    `${peer.name} DevStudio launch`,
  );
}

async function createAndPublishHello(peer) {
  await peer.host.handleUiEvent("new-project", "ds.newproject");
  await waitFor(
    () => {
      const tree = latestRuntime(peer)?.runtime?.widgetTree;
      return tree && findNode(tree, (node) => node.type === "code-editor")
        ? true
        : null;
    },
    20_000,
    `${peer.name} project creation`,
  );

  const bundle = await peer.host.readWorkspaceFile("hello-app/bundle.js");
  if (!bundle.includes("Hello from DevStudio")) {
    throw new Error(`${peer.name} hello template was not created`);
  }

  const manifestBefore =
    await peer.host.readWorkspaceFile("hello-app/app.json");
  await peer.host.handleUiEvent("editor", "ds.edit", {
    documentId: "hello-app/app.json",
    baseLength: manifestBefore.length,
    edits: [
      {
        start: 0,
        end: manifestBefore.length,
        text: JSON.stringify(
          {
            name: "hello-app",
            version: "0.1.0",
            entry: "bundle.js",
            capabilities: ["storage:kv"],
          },
          null,
          2,
        ),
      },
    ],
  });

  await peer.host.handleUiEvent("package", "ds.package");
  const qrTree = await waitFor(
    () => {
      const tree = latestRuntime(peer)?.runtime?.widgetTree;
      const qr = findNode(tree, (node) => node.type === "qr-code");
      return qr !== null && T256_PATTERN.test(String(qr.props?.value ?? ""))
        ? tree
        : null;
    },
    30_000,
    `${peer.name} package QR`,
  );
  const t256 = String(
    findNode(qrTree, (node) => node.type === "qr-code").props.value,
  );
  if (decode256t(t256).sha512 === null) {
    throw new Error(`${peer.name} package should use a hashed 256t id`);
  }

  await peer.host.handleUiEvent("publish", "ds.publish");
  await waitFor(
    () => {
      const status = latestText(peer, "status");
      if (status.startsWith("Publish failed")) {
        throw new Error(`${peer.name} ${status}`);
      }
      return status.startsWith("Published") ? true : null;
    },
    30_000,
    `${peer.name} publish`,
  );

  return t256;
}

async function installViaDevstudio(peer, t256, expectedPublisherPublicKey) {
  await peer.host.handleUiEvent("install-input", "ds.installinput", t256);
  await peer.host.handleUiEvent("install", "ds.install");
  await waitFor(
    () => {
      const status = latestText(peer, "status");
      if (status.startsWith("Install failed")) {
        throw new Error(`${peer.name} ${status}`);
      }
      return status.startsWith("Installed hello-app") ? true : null;
    },
    30_000,
    `${peer.name} install from 256t`,
  );

  const record = installedRecord(peer, "hello-app");
  if (record === null) {
    throw new Error(`${peer.name} did not install hello-app`);
  }
  if (record.manifest.publisherPublicKey !== expectedPublisherPublicKey) {
    throw new Error(
      `${peer.name} installed hello-app from the wrong publisher`,
    );
  }
}

function installedRecord(peer, appId) {
  if (peer.kind === "electron") {
    const version = peer.installed.activeVersion(appId);
    return version === null ? null : peer.installed.get(appId, version);
  }

  const version = peer.packageStorage.activeVersion(appId);
  return version === null
    ? null
    : (peer.packageStorage
        .listInstalled()
        .find(
          (record) => record.appId === appId && record.version === version,
        ) ?? null);
}

async function installIntoElectronPeer(peer, exchange, t256) {
  const published = exchange.get(t256);
  if (published === null) {
    throw new Error(`No published archive for ${t256}`);
  }
  if (!verify256t(t256, published.archive, sha512)) {
    throw new Error("published archive does not match 256t id");
  }

  const verified = verifyPackage(provider, published.archive, {
    hostApiVersion: HOST_API_VERSION,
  });
  const archivePath = `packages/${verified.manifest.name}/${verified.manifest.version}.tpkg`;
  await peer.runtime.store.set(archivePath, published.archive);
  peer.installed.install(
    {
      appId: verified.manifest.name,
      version: verified.manifest.version,
      packageHash: verified.packageHash,
      installedAt: Date.now(),
      manifest: verified.manifest,
      archivePath,
    },
    published.archive.length,
  );
  await peer.host.setGrants(
    verified.manifest.name,
    verified.manifest.publisherPublicKey,
    verified.manifest.capabilities,
    verified.manifest.capabilities,
  );
  return {
    appId: verified.manifest.name,
    version: verified.manifest.version,
    trusted: true,
  };
}

async function installIntoWebPeer(peer, exchange, t256) {
  const published = exchange.get(t256);
  if (published === null) {
    throw new Error(`No published archive for ${t256}`);
  }
  if (!verify256t(t256, published.archive, sha512)) {
    throw new Error("published archive does not match 256t id");
  }

  const installed = await peer.packageStorage.installArchive(published.archive);
  const record = installedRecord(peer, installed.appId);
  await peer.host.setGrants(
    installed.appId,
    record.manifest.publisherPublicKey,
    record.manifest.capabilities,
    record.manifest.capabilities,
  );
  return { appId: installed.appId, version: installed.version, trusted: true };
}

async function launchReceivedHello(peer) {
  await peer.host.stop("switch-to-received-app");

  if (peer.kind === "electron") {
    await peer.host.launch(peer.installed, peer.runtime, "hello-app");
  } else {
    await peer.host.launch(peer.packageStorage, "hello-app");
  }

  await waitFor(
    () => {
      const tree = latestRuntime(peer)?.runtime?.widgetTree;
      return tree &&
        findNode(tree, (node) => node.props?.value === "Hello from DevStudio")
        ? true
        : null;
    },
    20_000,
    `${peer.name} launch received hello-app`,
  );
}

export async function runDevstudioCrossVersion() {
  const tmp = mkdtempSync(join(tmpdir(), "tp-devstudio-cross-version-"));
  const exchange = new PublishedExchange();
  const electron = createElectronPeer(exchange, tmp, "electron");
  const web = createWebPeer(exchange, tmp, "web");

  const cleanup = async () => {
    await Promise.all([
      electron.host.stop("cleanup").catch(() => {}),
      web.host.stop("cleanup").catch(() => {}),
      web.relay.close().catch(() => {}),
    ]);
    rmSync(tmp, { recursive: true, force: true });
  };

  try {
    await installDevstudio(electron);
    await installDevstudio(web);

    const electronT256 = await createAndPublishHello(electron);
    await installViaDevstudio(
      web,
      electronT256,
      bytesToHex(electron.identity.getPublicKey()),
    );

    const webT256 = await createAndPublishHello(web);
    await installViaDevstudio(
      electron,
      webT256,
      bytesToHex(web.identity.getPublicKey()),
    );

    await launchReceivedHello(web);
    await launchReceivedHello(electron);

    console.log(
      "devstudio-cross-version: electron create -> web install/run and web create -> electron install/run passed",
    );
  } catch (error) {
    console.error(error);
    await cleanup();
    throw error;
  }

  await cleanup();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const deadline = setTimeout(() => {
    console.error("devstudio-cross-version: global timeout (240s)");
    process.exit(2);
  }, 240_000);

  runDevstudioCrossVersion()
    .then(() => {
      clearTimeout(deadline);
      process.exit(0);
    })
    .catch(() => {
      clearTimeout(deadline);
      process.exit(1);
    });
}
