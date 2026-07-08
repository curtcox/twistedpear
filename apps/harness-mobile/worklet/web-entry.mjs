/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */

import { createWebLeafHost } from "../../../packages/host-core/dist/web.js";
import { createWebPackageStorage } from "../../../packages/host-core/dist/web.js";
import {
  Identity,
  PureCryptoProvider,
  bytesToHex,
  hasWebIdentity,
  loadOrCreateWebIdentity,
  persistWebIdentity,
  resetWebIdentity
} from "../../../packages/reticulum-ts/dist/web.js";
import { createWebWorkletMiniappHost, hexToBytes } from "./web-miniapp-host.mjs";
import { createWebInstallService } from "./web-install.mjs";
import { createWebPublishService } from "./web-publish.mjs";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t
} from "../../../packages/app-registry/dist/index.js";
import { encodeCasLocator } from "../../../packages/cas-256t/dist/index.js";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/dist/host-api.js";

const IDENTITY_STORE_NAME = "twistedpear-harness-web-identity";
const PACKAGE_STORE_NAME = "twistedpear-harness-web-packages";
const MINIAPP_KV_STORE_NAME = "twistedpear-harness-web-miniapp-kv";
const DEFAULT_PASSPHRASE = "harness-web-dev";
const KV_OBJECT_STORE = "kv";

const helloDevBundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      { id: "title", type: "text", props: { value: "Hello from web sandbox" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
    ]
  }
});

ui.onEvent(async ({ event }) => {
  if (event === "hello.tap") {
    await ui.render({
      root: {
        id: "root",
        type: "view",
        style: { padding: 16, gap: 8 },
        children: [
          { id: "title", type: "text", props: { value: "Tapped!" }, style: { fontSize: 20, fontWeight: "bold" } }
        ]
      }
    });
  }
});
`);

/** @type {import("./protocol.ts").WorkletStatus} */
const status = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  identityHash: null,
  identityPersisted: false,
  tcpEnabled: false,
  autoEnabled: false,
  bleEnabled: false,
  bleConnected: false,
  rnodeEnabled: false,
  rnodeConnected: false,
  rnodeDeviceName: null,
  cryptoProvider: "pure",
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  developerMode: false,
  miniappRunning: false,
  wsEnabled: false,
  gatewayUrl: null
};

/** @type {{ gatewayUrl: string; sharedToken?: string; identityPassphrase: string }} */
let webConfig = {
  gatewayUrl: "",
  identityPassphrase: DEFAULT_PASSPHRASE
};

/** @type {Awaited<ReturnType<typeof createWebLeafHost>> | null} */
let hostSession = null;
/** @type {Awaited<ReturnType<typeof createWebPackageStorage>> | null} */
let packageStorage = null;
/** @type {ReturnType<typeof createWebWorkletMiniappHost> | null} */
let miniappHost = null;
/** @type {ReturnType<typeof createWebInstallService> | null} */
let installService = null;
/** @type {ReturnType<typeof createWebPublishService> | null} */
let publishService = null;
/** @type {PureCryptoProvider} */
const cryptoProvider = new PureCryptoProvider();
/** @type {ReturnType<typeof setInterval> | null} */
let statusTimer = null;
/** @type {ReturnType<typeof createMiniappKvStore> | null} */
let miniappKvStore = null;

/** @type {Map<string, (reply: unknown) => void>} */
const pendingHostReplies = new Map();

function requestHostReply(message, timeoutMs = 120_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingHostReplies.delete(message.token);
      resolve(null);
    }, timeoutMs);
    pendingHostReplies.set(message.token, (reply) => {
      clearTimeout(timer);
      pendingHostReplies.delete(message.token);
      resolve(reply);
    });
    send(message);
  });
}

function identityOptions() {
  return {
    storeName: IDENTITY_STORE_NAME,
    passphrase: webConfig.identityPassphrase
  };
}

function send(message) {
  postMessage({ channel: "ipc", data: `${JSON.stringify(message)}\n` });
}

function log(line) {
  send({ type: "log", line });
}

function pushStatus() {
  if (hostSession !== null) {
    const hostStatus = hostSession.getStatus();
    status.running = hostStatus.running;
    status.linkOnline = hostStatus.linkOnline;
    status.identityHash = hostStatus.identityHash;
    status.identityPersisted = hostStatus.identityPersisted;
    status.onlineInterfaces = hostStatus.onlineInterfaces;
    status.gatewayUrl = hostStatus.gatewayUrl;
  }

  if (packageStorage !== null) {
    status.installedPackages = packageStorage.listInstalled().length;
    status.storageUsedBytes = packageStorage.getPackageUsedBytes();
  }

  send({ type: "status", status: { ...status } });
}

function createMiniappKvStore(dbName) {
  const ready = new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = (event) => {
      event.target.result.createObjectStore(KV_OBJECT_STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error(`Failed to open IndexedDB ${dbName}`));
  });

  async function withStore(mode, run) {
    const database = await ready;
    const transaction = database.transaction(KV_OBJECT_STORE, mode);
    const store = transaction.objectStore(KV_OBJECT_STORE);
    return new Promise((resolve, reject) => {
      const request = run(store);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
    });
  }

  return {
    async get(key) {
      const value = await withStore("readonly", (store) => store.get(key));
      if (value === undefined) {
        return null;
      }

      return value instanceof Uint8Array ? Uint8Array.from(value) : new Uint8Array(value);
    },
    async set(key, value) {
      await withStore("readwrite", (store) => store.put(Uint8Array.from(value), key));
    },
    async delete(key) {
      await withStore("readwrite", (store) => store.delete(key));
    },
    async list(prefix) {
      const keys = await withStore("readonly", (store) => store.getAllKeys());
      return keys.filter((key) => typeof key === "string" && key.startsWith(prefix));
    }
  };
}

function ensureMiniappKvStore() {
  if (miniappKvStore === null) {
    miniappKvStore = createMiniappKvStore(MINIAPP_KV_STORE_NAME);
  }

  return miniappKvStore;
}

function ensurePublishService() {
  if (publishService === null) {
    publishService = createWebPublishService({
      provider: cryptoProvider,
      log,
      onCasLocator(locator) {
        ensureInstallService().ingestCasLocatorAppData(bytesToHex(encodeCasLocator(locator)));
      }
    });
  }

  return publishService;
}

function ensureMiniappHost() {
  if (miniappHost === null) {
    miniappHost = createWebWorkletMiniappHost({
      provider: cryptoProvider,
      kvStore: ensureMiniappKvStore(),
      getPresenceSnapshot: () => status,
      send,
      requestHostReply,
      getPublisherIdentity: async () => {
        if (!(await hasWebIdentity(identityOptions()))) {
          return null;
        }

        return loadOrCreateWebIdentity(cryptoProvider, identityOptions());
      },
      publishArchive: async ({ t256, archive }) => {
        const session = hostSession;
        if (session === null) {
          throw new Error("Gateway link is offline — enable WS gateway before publishing");
        }

        return ensurePublishService().publish(session, { t256, archive });
      },
      installFromT256: async (t256) => ensureInstallService().installFromT256(t256),
      onDeveloperModeChange(enabled) {
        status.developerMode = enabled;
        pushStatus();
      },
      onMiniappStateChange(running) {
        status.miniappRunning = running;
        pushStatus();
      }
    });
  }

  return miniappHost;
}

function ensureInstallService() {
  if (installService === null) {
    installService = createWebInstallService({
      provider: cryptoProvider,
      kvStore: ensureMiniappKvStore(),
      getHostSession: () => hostSession,
      ensurePackageStorage,
      miniappHost: () => ensureMiniappHost(),
      send,
      log,
      pushInstalled: () => {
        void pushInstalledList();
      },
      requestHostReply: requestHostReply
    });
  }

  return installService;
}

async function pushInstalledList() {
  const storage = await ensurePackageStorage();
  send({
    type: "installed",
    packages: storage.listInstalled().map((record) => ({
      appId: record.appId,
      version: record.version,
      activeVersion: storage.activeVersion(record.appId) ?? record.version,
      packageHash: record.packageHash,
      installedAt: record.installedAt,
      rollbackAvailable: false,
      capabilities: record.manifest.capabilities,
      publisherPublicKey: record.manifest.publisherPublicKey
    }))
  });
  pushStatus();
}

async function ensurePackageStorage() {
  if (packageStorage !== null) {
    return packageStorage;
  }

  packageStorage = await createWebPackageStorage({
    dbName: PACKAGE_STORE_NAME,
    hostApiVersion: HOST_API_VERSION
  });
  await packageStorage.requestPersistence();
  status.installedPackages = packageStorage.listInstalled().length;
  return packageStorage;
}

async function refreshStorageStatus() {
  const storage = await ensurePackageStorage();
  const quota = await storage.getQuotaInfo();
  status.installedPackages = storage.listInstalled().length;
  status.storageUsedBytes = quota.packageUsedBytes;
  pushStatus();
  return quota;
}

function startStatusTimer() {
  if (statusTimer !== null) {
    return;
  }

  statusTimer = setInterval(pushStatus, 1_000);
}

function stopStatusTimer() {
  if (statusTimer === null) {
    return;
  }

  clearInterval(statusTimer);
  statusTimer = null;
}

async function stopHostSession() {
  stopStatusTimer();
  if (hostSession !== null) {
    await hostSession.stop();
    hostSession = null;
  }

  status.running = false;
  status.linkOnline = false;
  status.onlineInterfaces = 0;
  status.wsEnabled = false;
  status.tcpEnabled = false;
  pushStatus();
}

async function startHostSession() {
  if (webConfig.gatewayUrl.length === 0) {
    log("Web gateway URL is not configured");
    return;
  }

  if (hostSession !== null) {
    pushStatus();
    return;
  }

  hostSession = await createWebLeafHost({
    gatewayUrl: webConfig.gatewayUrl,
    ...(webConfig.sharedToken === undefined ? {} : { sharedToken: webConfig.sharedToken }),
    identity: identityOptions()
  });

  hostSession.reticulum.registerAnnounceHandler({
    receivedAnnounce(info) {
      status.announcesSeen += 1;
      pushStatus();
      send({
        type: "announce",
        entry: {
          destinationHash: bytesToHex(info.destinationHash),
          hops: info.packet.hops,
          receivedAt: Date.now(),
          appDataHex: info.appData === null ? null : bytesToHex(info.appData)
        }
      });
      if (info.appData !== null) {
        ensureInstallService().ingestCasLocatorAppData(bytesToHex(info.appData));
      }
    }
  });

  status.wsEnabled = true;
  status.tcpEnabled = true;
  status.running = true;
  startStatusTimer();
  pushStatus();
  log(`Web leaf host connected to ${webConfig.gatewayUrl}`);
}

async function refreshIdentityStatus() {
  if (!(await hasWebIdentity(identityOptions()))) {
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return;
  }

  const identity = await loadOrCreateWebIdentity(cryptoProvider, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
}

async function createIdentity() {
  await resetWebIdentity(identityOptions());
  const identity = new Identity(cryptoProvider);
  await persistWebIdentity(identity, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
  log(`Created web identity ${status.identityHash}`);
}

async function importIdentity(privateKeyHex) {
  const identity = Identity.fromBytes(cryptoProvider, hexToBytes(privateKeyHex));
  if (identity === null) {
    throw new Error("Invalid identity private key");
  }

  await resetWebIdentity(identityOptions());
  await persistWebIdentity(identity, identityOptions());
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
  log(`Imported web identity ${status.identityHash}`);
}

async function resetIdentity() {
  await resetWebIdentity(identityOptions());
  await stopHostSession();
  status.identityHash = null;
  status.identityPersisted = false;
  pushStatus();
  log("Web identity cleared");
}

function handleSandboxHostMessage(message) {
  const controller = ensureMiniappHost().sandboxController;
  if (message.type === "sandbox-spawned") {
    controller.handleSpawned(message.requestId, message.instanceId);
    return;
  }

  if (message.type === "sandbox-spawn-failed") {
    controller.handleSpawnFailed(message.requestId, message.message);
    return;
  }

  if (message.type === "sandbox-ping-result") {
    controller.handlePingResult(message.requestId, message.alive);
    return;
  }

  if (message.type === "sandbox-broker-request") {
    controller.handleBrokerRequest(message.requestId, message.instanceId, message.request);
  }
}

async function handleHostMessage(raw) {
  const line = raw.trim();
  if (line.length === 0) {
    return;
  }

  let message;
  try {
    message = JSON.parse(line);
  } catch {
    log(`Ignored host message: ${line}`);
    return;
  }

  if (
    message.type === "sandbox-spawned" ||
    message.type === "sandbox-spawn-failed" ||
    message.type === "sandbox-ping-result" ||
    message.type === "sandbox-broker-request"
  ) {
    handleSandboxHostMessage(message);
    return;
  }

  if (message.type === "start") {
    if (message.gatewayUrl !== undefined) {
      webConfig = {
        gatewayUrl: message.gatewayUrl,
        identityPassphrase: message.identityPassphrase ?? DEFAULT_PASSPHRASE,
        ...(message.sharedToken === undefined ? {} : { sharedToken: message.sharedToken })
      };
      status.gatewayUrl = message.gatewayUrl;
    }

    await refreshIdentityStatus();
    if (status.tcpEnabled || status.wsEnabled) {
      await startHostSession();
    } else {
      log(`Gateway configured (${webConfig.gatewayUrl || "unset"}); enable WS gateway to connect`);
    }
    return;
  }

  if (message.type === "stop") {
    await stopHostSession();
    log("Web core worker stopped");
    return;
  }

  if (message.type === "create-identity") {
    await createIdentity();
    return;
  }

  if (message.type === "import-identity") {
    try {
      await importIdentity(message.privateKeyHex);
    } catch (error) {
      log(`Import identity failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "reset-identity") {
    await resetIdentity();
    return;
  }

  if (message.type === "set-interfaces") {
    status.tcpEnabled = message.tcp;
    status.autoEnabled = message.auto;
    status.bleEnabled = message.ble;
    status.rnodeEnabled = message.rnode;
    pushStatus();

    if (message.tcp) {
      await startHostSession();
      return;
    }

    await stopHostSession();
    log("WS gateway disabled");
    return;
  }

  if (message.type === "confirm-response" || message.type === "launch-confirm" || message.type === "install-confirm") {
    pendingHostReplies.get(message.token)?.(message);
    return;
  }

  if (message.type === "install-from-256t") {
    try {
      const result = await ensureInstallService().installFromT256(message.t256);
      await pushInstalledList();
      send({ type: "install-256t-result", ok: true, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      send({ type: "install-256t-result", ok: false, error: detail });
      log(`Install from 256t failed: ${detail}`);
    }
    return;
  }

  if (message.type === "trust-list") {
    await ensureInstallService().pushTrustList();
    return;
  }

  if (message.type === "trust-add") {
    try {
      const publisherPublicKey = decodePublisherIdentity256t(message.identityString);
      await ensureInstallService().trustStore.add({
        publisherPublicKey,
        label: message.label ?? "Unnamed publisher",
        addedAt: Date.now(),
        source: message.source ?? "paste"
      });
      log(`Trusted publisher ${message.label ?? publisherPublicKey.slice(0, 16)}`);
    } catch (error) {
      log(`Trust add failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    await ensureInstallService().pushTrustList();
    return;
  }

  if (message.type === "trust-remove") {
    await ensureInstallService().trustStore.remove(message.publisherPublicKey);
    log("Removed trusted publisher");
    await ensureInstallService().pushTrustList();
    return;
  }

  if (message.type === "trust-show") {
    if (!(await hasWebIdentity(identityOptions()))) {
      send({ type: "trust-identity", identity256t: null });
      return;
    }

    const identity = await loadOrCreateWebIdentity(cryptoProvider, identityOptions());
    send({
      type: "trust-identity",
      identity256t: encodePublisherIdentity256t(identity.getPublicKey())
    });
    return;
  }

  if (message.type === "list-catalog" || message.type === "list-installed") {
    const storage = await ensurePackageStorage();
    send({ type: "catalog", entries: [] });
    send({
      type: "installed",
      packages: storage.listInstalled().map((record) => ({
        appId: record.appId,
        version: record.version,
        activeVersion: storage.activeVersion(record.appId) ?? record.version,
        packageHash: record.packageHash,
        installedAt: record.installedAt,
        rollbackAvailable: false,
        capabilities: record.manifest.capabilities,
        publisherPublicKey: record.manifest.publisherPublicKey
      }))
    });
    return;
  }

  if (message.type === "refresh-storage") {
    const quota = await refreshStorageStatus();
    send({
      type: "storage-quota",
      quota: {
        usageBytes: quota.usageBytes,
        quotaBytes: quota.quotaBytes,
        persisted: quota.persisted,
        packageUsedBytes: quota.packageUsedBytes,
        packageQuotaBytes: quota.packageQuotaBytes,
        archiveBackend: quota.archiveBackend
      }
    });
    return;
  }

  if (message.type === "install-app") {
    const storage = await ensurePackageStorage();
    if (message.archiveHex === undefined || message.archiveHex.length === 0) {
      log("Web install requires archiveHex or install-from-256t");
      return;
    }

    try {
      const installed = await storage.installArchive(hexToBytes(message.archiveHex));
      status.installedPackages = storage.listInstalled().length;
      status.storageUsedBytes = storage.getPackageUsedBytes();
      pushStatus();
      send({
        type: "installed",
        packages: storage.listInstalled().map((record) => ({
          appId: record.appId,
          version: record.version,
          activeVersion: storage.activeVersion(record.appId) ?? record.version,
          packageHash: record.packageHash,
          installedAt: record.installedAt,
          rollbackAvailable: false,
          capabilities: record.manifest.capabilities,
          publisherPublicKey: record.manifest.publisherPublicKey
        }))
      });
      log(`Installed ${installed.appId} v${installed.version} (${installed.archiveBytes} bytes)`);
    } catch (error) {
      log(`Install failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "seed-miniapp-kv") {
    await ensureMiniappKvStore().set(message.key, hexToBytes(message.valueHex));
    log(`Seeded mini-app KV key ${message.key}`);
    return;
  }

  if (message.type === "set-developer-mode") {
    ensureMiniappHost().setDeveloperMode(message.enabled);
    log(`Developer mode ${message.enabled ? "enabled" : "disabled"}`);
    return;
  }

  if (message.type === "get-grants") {
    await ensureMiniappHost().getGrants(message.appId, message.publisherPublicKey, message.declaredCapabilities);
    return;
  }

  if (message.type === "set-grants") {
    await ensureMiniappHost().setGrants(
      message.appId,
      message.publisherPublicKey,
      message.declaredCapabilities,
      message.grantedCapabilities
    );
    log(`Saved grants for ${message.appId}`);
    return;
  }

  if (message.type === "revoke-grant") {
    await ensureMiniappHost().revokeGrant(
      message.appId,
      message.publisherPublicKey,
      message.capability,
      message.declaredCapabilities
    );
    log(`Revoked ${message.capability} for ${message.appId}`);
    return;
  }

  if (message.type === "launch-miniapp") {
    const storage = await ensurePackageStorage();
    try {
      await ensureMiniappHost().launch(storage, message.appId);
      log(`Launched mini-app ${message.appId}`);
    } catch (error) {
      log(`Launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "stop-miniapp") {
    await ensureMiniappHost().stop();
    log("Stopped mini-app");
    return;
  }

  if (message.type === "suspend-miniapp") {
    await ensureMiniappHost().suspend();
    return;
  }

  if (message.type === "resume-miniapp") {
    await ensureMiniappHost().resume();
    return;
  }

  if (message.type === "miniapp-ui-event") {
    try {
      await ensureMiniappHost().handleUiEvent(message.nodeId, message.event, message.value);
    } catch (error) {
      log(`UI event failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "dev-side-load") {
    try {
      await ensureMiniappHost().devSideLoad(message.manifest, hexToBytes(message.bundleHex));
      log(`Dev side-loaded ${message.manifest.name ?? "mini-app"}`);
    } catch (error) {
      log(`Dev side-load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "dev-side-load-hello") {
    try {
      ensureMiniappHost().setDeveloperMode(true);
      await ensureMiniappHost().devSideLoad(
        {
          name: "hello-web",
          version: "0.0.1",
          entry: "bundle.js",
          capabilities: [],
          publisherPublicKey: "dev"
        },
        helloDevBundle
      );
      log("Dev side-loaded hello-web");
    } catch (error) {
      log(`Hello dev side-load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  log(`Web worker: unsupported message ${message.type}`);
}

self.onmessage = (event) => {
  if (event.data?.channel !== "host-ipc") {
    return;
  }

  const payload = event.data.data;
  const text = typeof payload === "string" ? payload : new TextDecoder().decode(payload);
  handleHostMessage(text).catch((error) => {
    log(`Web worker error: ${error instanceof Error ? error.message : String(error)}`);
    pushStatus();
  });
};

pushStatus();
refreshStorageStatus().catch((error) => {
  log(`Web package storage unavailable: ${error instanceof Error ? error.message : String(error)}`);
});
log("Web core worker ready (Phase W3 DevStudio + publish)");
