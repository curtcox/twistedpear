/**
 * Desktop host Bare worklet entry (stdio IPC, transport role enabled by default).
 */
import { bytesToHex } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { BareCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/bare.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { AutoInterfaceBridge } from "../../../packages/reticulum-interfaces/dist/auto-bridge.js";
import { AUTO_DEFAULT_DATA_PORT } from "../../../packages/reticulum-interfaces/dist/auto.js";
import { selectDiscoveryProviders } from "../../../packages/reticulum-interfaces/dist/auto-discovery.js";
import { createIpcMulticastBridge } from "./ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "./ipc-bonjour-bridge.mjs";
import { createIpcSerialBridge } from "./ipc-serial-bridge.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import { CatalogStore, InstalledPackageStore, TrustStore, decodeAppAnnounceData, decodePublisherIdentity256t, encodePublisherIdentity256t, unpackPackage, verifyPackage } from "../../../packages/app-registry/dist/index.js";
import { DriveManager, PackageResourceClient, assessFetchBudget, attachPackageResourceServer, createSwarm, fetchPackage } from "../../../packages/bridge-hyper/dist/index.js";
import {
  buildAppAnnounceSummary,
  encodeAppAnnounceData
} from "../../../packages/app-registry/dist/index.js";
import {
  CasStore,
  casAnnounceAspects,
  decodeCasLocator,
  encodeCasLocator,
  signCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../../../packages/cas-256t/dist/index.js";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { HOST_API_VERSION, generateConfirmationToken, validateManifestCapabilities } from "../../../packages/miniapp-runtime/dist/index.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "../../../packages/lxmf-ts/dist/index.js";
import { createWorkletMiniappHost } from "./miniapp-host.mjs";
import { createDevChannelClient } from "./dev-channel.mjs";
import { IPC } from "./ipc-stdio.mjs";

const IS_DESKTOP_HOST = process.env.TWISTEDPEAR_HOST_DESKTOP === "1";

function refuseStorePosture() {
  return false;
}

function shouldRefuseDeveloperMode() {
  return false;
}

function createProvider() {
  try {
    return new BareCryptoProvider();
  } catch {
    return new PureCryptoProvider();
  }
}

const provider = createProvider();
const runtime = bareRuntime({ storePath: "host-desktop-store" });
const IDENTITY_STORE_KEY = "host-identity";

/** @type {import("./protocol.ts").WorkletStatus} */
const status = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  identityHash: null,
  identityPersisted: false,
  tcpEnabled: IS_DESKTOP_HOST,
  autoEnabled: IS_DESKTOP_HOST,
  bleEnabled: false,
  bleConnected: false,
  rnodeEnabled: false,
  rnodeConnected: false,
  rnodeDeviceName: null,
  cryptoProvider: provider.name,
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  pathTableCount: 0,
  activeLinkCount: 0,
  bandwidthBytesIn: 0,
  bandwidthBytesOut: 0,
  transportEnabled: IS_DESKTOP_HOST,
  propagationEnabled: false,
  propagationStoreBytes: 0,
  propagationMessageCount: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  developerMode: false,
  miniappRunning: false
};

/** @type {Reticulum | null} */
let reticulum = null;
/** @type {import("@twistedpear/reticulum-ts").TcpClientInterface | null} */
let tcpIface = null;
/** @type {AutoInterfaceBridge | null} */
let autoIface = null;
/** @type {ReturnType<typeof createIpcMulticastBridge> | null} */
let multicastBridge = null;
/** @type {ReturnType<typeof createIpcBonjourBridge> | null} */
let bonjourBridge = null;
/** @type {boolean} */
let bonjourDiscoveryEnabled = true;
/** @type {boolean} */
let multicastEntitled = true;
/** @type {boolean} */
let nodeSuspended = false;
/** @type {ReturnType<typeof createIpcBleBridge> | null} */
let bleBridge = null;
/** @type {BleInterface | null} */
let bleIface = null;
/** @type {ReturnType<typeof createIpcSerialBridge> | null} */
let serialBridge = null;
/** @type {RNodeInterface | null} */
let rnodeIface = null;
/** @type {number | null} */
let pendingRnodeDeviceId = null;
/** @type {string | null} */
let pendingRnodePortPath = null;
/** @type {number} */
let pendingRnodeBaudRate = 115_200;
/** @type {ReturnType<typeof setInterval> | null} */
let statusTimer = null;
/** @type {Identity | null} */
let activeIdentity = null;
/** @type {{ targetHost: string; targetPort: number } | null} */
let pendingTarget = null;

/** @type {CatalogStore | null} */
let catalogStore = null;
/** @type {InstalledPackageStore | null} */
let installedStore = null;
/** @type {DriveManager | null} */
let packageDriveManager = null;
/** @type {ReturnType<typeof createSwarm> | null} */
let packageSwarm = null;
const PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;
const PROPAGATION_STORE_KEY = "propagation-store";

/** @type {PropagationServer | null} */
let propagationServer = null;
/** @type {import("@twistedpear/lxmf-ts").RegisteredDestination | null} */
let propagationDestination = null;

/** @type {ReturnType<typeof createWorkletMiniappHost> | null} */
let miniappHost = null;
/** @type {ReturnType<typeof createDevChannelClient> | null} */
let devChannel = null;

function ensureDevChannel() {
  if (devChannel === null) {
    devChannel = createDevChannelClient({
      isDeveloperMode: () => ensureMiniappHost().isDeveloperMode(),
      onConnected: (address) => {
        send({ type: "dev-channel", state: "connected", detail: address });
        log(`Dev channel connected to ${address}`);
      },
      onDisconnected: () => {
        send({ type: "dev-channel", state: "disconnected" });
        log("Dev channel disconnected");
      },
      onBundleLoaded: (name) => {
        send({ type: "dev-channel", state: "loaded", detail: name });
        log(`Dev side-loaded ${name}`);
      },
      onError: (message) => {
        send({ type: "dev-channel", state: "error", detail: message });
        log(`Dev channel error: ${message}`);
      },
      onBundle: async (manifest, bundleBytes) => {
        await ensureMiniappHost().devSideLoad(manifest, bundleBytes);
      }
    });
  }

  return devChannel;
}

/** @type {Map<string, (reply: any) => void>} */
const pendingRendererReplies = new Map();

/** @type {TrustStore | null} */
let trustStore = null;

/** @type {Map<string, import("../../../packages/cas-256t/dist/index.js").CasLocator>} */
const casLocators = new Map();
/** @type {CasStore | null} */
let entryCasStore = null;

function ensureEntryCasStore() {
  if (entryCasStore === null) {
    entryCasStore = new CasStore(runtimeKeyValueStore(), (data) => provider.sha512(data));
  }

  return entryCasStore;
}

function ingestCasLocator(appData) {
  try {
    const locator = decodeCasLocator(appData);
    if (verifyCasLocator(provider, locator)) {
      casLocators.set(locator.t256, locator);
      log(`CAS locator: ${locator.appId} v${locator.version}`);
    }
  } catch {
    // not a TPCL payload — ignore
  }
}

function waitForCasLocator(t256, timeoutMs = 30_000) {
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    const poll = () => {
      const locator = casLocators.get(t256);
      if (locator !== undefined) {
        resolve(locator);
        return;
      }

      if (Date.now() - startedAt > timeoutMs) {
        reject(new Error("No locator announce received for that 256t id"));
        return;
      }

      setTimeout(poll, 500);
    };
    poll();
  });
}

async function publishArchiveFromWorklet({ t256, archive }) {
  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("No publisher identity available");
  }

  const unpacked = unpackPackage(provider, archive);
  const driveManager = await ensurePackageDriveManager();
  let keyHex = unpacked.manifest.driveKey;
  if (keyHex === "0".repeat(64)) {
    const created = await driveManager.createDrive();
    keyHex = created.keyHex;
  } else {
    await driveManager.openDrive(keyHex);
  }

  const published = await driveManager.publishVersion(unpacked.manifest.version, archive, unpacked.packageHash);
  const node = await ensureReticulum();

  const publisherHash = bytesToHex(provider.sha256(identity.getPublicKey()).slice(0, 8));
  const nameHash = bytesToHex(provider.sha256(new TextEncoder().encode(unpacked.manifest.name)).slice(0, 8));
  const appDestination = node.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", publisherHash, nameHash]
  });
  attachPackageResourceServer(appDestination, {
    async listVersions() {
      return driveManager.listVersions();
    },
    async fetchArchive(version) {
      return driveManager.fetchVersion(version);
    }
  });
  const summary = buildAppAnnounceSummary(provider, identity, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true
  });
  await appDestination.announce({ appData: encodeAppAnnounceData(summary) });

  const locator = signCasLocator(identity, {
    t256,
    appId: unpacked.manifest.name,
    version: unpacked.manifest.version,
    driveKey: keyHex,
    packageHash: unpacked.packageHash,
    packageSize: archive.length
  });
  const casDestination = node.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: casAnnounceAspects(t256)
  });
  await casDestination.announce({ appData: encodeCasLocator(locator) });
  casLocators.set(t256, locator);

  log(`Published ${unpacked.manifest.name} v${published.version}; 256t ${t256.slice(0, 16)}…`);
  return { t256, driveKey: keyHex, version: published.version };
}

async function installFromT256(t256) {
  const cas = ensureEntryCasStore();
  let archive = await cas.get(t256).catch(() => null);

  if (archive === null) {
    const locator = await waitForCasLocator(t256);
    const identity = await resolveIdentity();
    if (identity === null) {
      throw new Error("No host identity available for fetch");
    }

    const driveManager = await ensurePackageDriveManager();
    const resourceClient = new PackageResourceClient({
      provider,
      runtime,
      publisherPublicKeyHex: locator.publisherPublicKey,
      appName: locator.appId,
      identity
    });
    await resourceClient.start();
    try {
      const result = await fetchPackage(provider, {
        entry: toCatalogEntryLike(locator),
        version: locator.version,
        interfaces: reticulum?.listInterfaces() ?? [],
        driveManager,
        resourceClient
      });
      archive = result.archiveBytes;
    } finally {
      await resourceClient.stop();
    }

    if (!verify256t(t256, archive, (data) => provider.sha512(data))) {
      throw new Error("Fetched archive does not match its 256t id");
    }

    await cas.put(archive);
  }

  const { installedStore: installed } = ensureCatalog();
  const appId = unpackPackage(provider, archive).manifest.name;
  const verified = verifyPackage(provider, archive, {
    hostApiVersion: HOST_API_VERSION,
    minVersion: installed.latestVersion(appId) ?? undefined
  });
  const declared = validateManifestCapabilities(verified.manifest.capabilities);
  const trusted = await ensureTrustStore().isTrusted(verified.manifest.publisherPublicKey);
  const trustedEntry = trusted
    ? (await ensureTrustStore().list()).find(
        (entry) => entry.publisherPublicKey === verified.manifest.publisherPublicKey
      )
    : undefined;

  const review = await requestRendererReply({
    type: "install-review",
    token: generateConfirmationToken(),
    appId,
    version: verified.manifest.version,
    publisherPublicKey: verified.manifest.publisherPublicKey,
    trusted,
    trustedLabel: trustedEntry?.label ?? null,
    capabilities: declared.map((id) => ({ id, description: id, granted: false }))
  });
  if (review === null || review.accept !== true) {
    throw new Error("Install cancelled at capability review");
  }

  const archivePath = `packages/${appId}/${verified.manifest.version}.tpkg`;
  await runtime.store.set(archivePath, archive);
  installed.install(
    {
      appId,
      version: verified.manifest.version,
      packageHash: verified.packageHash,
      installedAt: Date.now(),
      manifest: verified.manifest,
      archivePath
    },
    archive.length
  );
  await persistCatalogState();
  pushCatalog();

  if (Array.isArray(review.grants) && review.grants.length > 0) {
    await ensureMiniappHost().setGrants(
      appId,
      verified.manifest.publisherPublicKey,
      verified.manifest.capabilities,
      review.grants
    );
  }

  log(`Installed ${appId} v${verified.manifest.version} from 256t (trusted: ${trusted})`);
  return { appId, version: verified.manifest.version, trusted };
}

function ensureTrustStore() {
  if (trustStore === null) {
    trustStore = new TrustStore(runtimeKeyValueStore());
  }

  return trustStore;
}

async function pushTrustList() {
  const entries = await ensureTrustStore().list();
  send({ type: "trust", entries });
}

function requestRendererReply(message, timeoutMs = 120_000) {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      pendingRendererReplies.delete(message.token);
      resolve(null);
    }, timeoutMs);
    pendingRendererReplies.set(message.token, (reply) => {
      clearTimeout(timer);
      pendingRendererReplies.delete(message.token);
      resolve(reply);
    });
    send(message);
  });
}

function ensureMiniappHost() {
  if (miniappHost === null) {
    miniappHost = createWorkletMiniappHost({
      provider,
      kvStore: runtimeKeyValueStore(),
      beeStoragePath: "miniapp-bee-store",
      getPresenceSnapshot: () => status,
      getHostInfoSnapshot: () => {
        const interfaceTypes = [];
        if (status.tcpEnabled) interfaceTypes.push("tcp");
        if (status.autoEnabled) interfaceTypes.push("auto");
        if (status.bleEnabled) interfaceTypes.push("ble");
        if (status.rnodeEnabled) interfaceTypes.push("rnode");
        return {
          platform: "desktop",
          hostVersion: HOST_API_VERSION,
          roles: {
            transport: status.transportEnabled === true,
            seeder: true,
            propagation: status.propagationEnabled === true
          },
          interfaceTypes,
          quotas: {
            kvQuotaBytes: null,
            seedStorageUsedBytes: status.storageUsedBytes ?? null,
            seedStorageQuotaBytes: null,
            memoryBytes: null
          }
        };
      },
      send,
      getPublisherIdentity: () => resolveIdentity(),
      publishArchive: publishArchiveFromWorklet,
      installFromT256,
      async requestUserConfirmation(request) {
        const reply = await requestRendererReply({
          type: "confirm-request",
          token: request.token,
          kind: request.kind,
          appId: request.appId,
          publisherPublicKey: request.publisherPublicKey,
          summary: request.summary
        });
        return { approved: reply?.approved === true, detail: reply?.detail };
      },
      async requestLaunchReview(review) {
        return requestRendererReply({
          type: "launch-review",
          token: review.token,
          appId: review.appId,
          publisherPublicKey: review.publisherPublicKey,
          version: review.version,
          capabilities: review.capabilities
        });
      },
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

function runtimeKeyValueStore() {
  return {
    async get(key) {
      const value = await runtime.store.get(key);
      return value === undefined ? null : value;
    },
    async set(key, value) {
      await runtime.store.set(key, value);
    },
    async delete(key) {
      await runtime.store.delete(key);
    },
    async list() {
      return [];
    }
  };
}

async function persistCatalogState() {
  const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
  const kv = runtimeKeyValueStore();
  await catalog.save(kv);
  await installed.save(kv);
}

async function loadCatalogState() {
  const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
  const kv = runtimeKeyValueStore();
  await catalog.load(kv);
  await installed.load(kv);
}

async function ensurePackageDriveManager() {
  if (packageDriveManager === null) {
    packageSwarm = createSwarm();
    packageDriveManager = new DriveManager({
      storagePath: "hyper-storage",
      swarm: packageSwarm
    });
    await packageDriveManager.ready();
  }

  return packageDriveManager;
}

function ensureCatalog() {
  if (catalogStore === null) {
    catalogStore = new CatalogStore(provider);
  }

  if (installedStore === null) {
    installedStore = new InstalledPackageStore(PACKAGE_QUOTA_BYTES);
  }

  return { catalogStore, installedStore };
}

function catalogEntryView(entry) {
  return {
    appId: entry.appId,
    name: entry.name,
    version: entry.version,
    publisherPublicKey: entry.publisherPublicKey,
    packageSize: entry.packageSize,
    packageHash: entry.packageHash,
    driveKey: entry.driveKey,
    resourceAvailable: entry.resourceAvailable,
    receivedAt: entry.receivedAt
  };
}

function pushCatalog() {
  const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
  status.catalogEntries = catalog.list().length;
  status.installedPackages = installed.list().length;
  status.storageUsedBytes = installed.usedBytes;
  pushStatus();
  send({ type: "catalog", entries: catalog.list().map(catalogEntryView) });
  send({
    type: "installed",
    packages: [...new Set(installed.list().map((record) => record.appId))].map((appId) => {
      const active = installed.activeVersion(appId);
      const record = active === null ? null : installed.get(appId, active);
      const previous = installed.previousVersion(appId);
      return {
        appId,
        version: record?.version ?? active ?? "",
        activeVersion: active ?? "",
        packageHash: record?.packageHash ?? "",
        installedAt: record?.installedAt ?? 0,
        rollbackAvailable: previous !== null && active !== null && active !== previous,
        capabilities: record?.manifest.capabilities ?? [],
        publisherPublicKey: record?.manifest.publisherPublicKey ?? ""
      };
    })
  });
}

/** @type {{ entries: ReadonlyArray<{ transientIdHex: string; lxmfDataHex: string; storedAt: number }> } | null} */
let propagationStoreCache = null;

async function loadPropagationCache() {
  const raw = await runtime.store.get(PROPAGATION_STORE_KEY);
  if (raw === undefined) {
    propagationStoreCache = { entries: [] };
    return;
  }

  propagationStoreCache = JSON.parse(new TextDecoder().decode(raw));
}

function createWorkletPropagationPersistence() {
  return {
    load() {
      return (propagationStoreCache?.entries ?? []).map((entry) => ({
        transientId: hexToBytes(entry.transientIdHex),
        lxmfData: hexToBytes(entry.lxmfDataHex),
        storedAt: entry.storedAt
      }));
    },
    save(entries) {
      propagationStoreCache = {
        entries: entries.map((entry) => ({
          transientIdHex: bytesToHex(entry.transientId),
          lxmfDataHex: bytesToHex(entry.lxmfData),
          storedAt: entry.storedAt
        }))
      };
      void runtime.store.set(
        PROPAGATION_STORE_KEY,
        new TextEncoder().encode(JSON.stringify(propagationStoreCache))
      );
    }
  };
}

async function startPropagation() {
  if (propagationServer !== null) {
    return;
  }

  const node = await ensureReticulum();
  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("Propagation requires a host identity");
  }

  await loadPropagationCache();
  propagationServer = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
    persistence: createWorkletPropagationPersistence()
  });
  propagationDestination = createPropagationDestination(provider, node, identity);
  propagationServer.registerHandlers(propagationDestination);
  await propagationDestination.announce();
  status.propagationEnabled = true;
  log("Propagation node enabled");
  pushStatus();
}

async function stopPropagation() {
  if (propagationServer === null) {
    status.propagationEnabled = false;
    pushStatus();
    return;
  }

  propagationServer = null;
  propagationDestination = null;
  status.propagationEnabled = false;
  log("Propagation node disabled");
  pushStatus();
}

function send(message) {
  IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

function log(line) {
  send({ type: "log", line });
}

function refuseStoreAction(action) {
  if (refuseStorePosture()) {
    log(`${action} refused in store posture variant`);
    return true;
  }

  return false;
}

function pushStatus() {
  if (reticulum !== null) {
    const interfaces = reticulum.listInterfaces();
    const preferred = selectPreferredInterface(interfaces);
    status.preferredInterface = preferred?.name ?? null;
    status.onlineInterfaces = interfaces.filter((iface) => iface.online).length;
    status.pathTableCount = reticulum.pathTableCount;
    status.activeLinkCount = reticulum.activeLinkCount;
    status.bandwidthBytesIn = reticulum.bandwidthBytesIn;
    status.bandwidthBytesOut = reticulum.bandwidthBytesOut;
    status.transportEnabled = reticulum.isTransportEnabled;
  } else {
    status.preferredInterface = null;
    status.onlineInterfaces = 0;
    status.pathTableCount = 0;
    status.activeLinkCount = 0;
    status.bandwidthBytesIn = 0;
    status.bandwidthBytesOut = 0;
  }

  if (propagationServer !== null) {
    status.propagationStoreBytes = propagationServer.stats.usedBytes;
    status.propagationMessageCount = propagationServer.stats.messageCount;
  } else {
    status.propagationStoreBytes = 0;
    status.propagationMessageCount = 0;
  }

  send({ type: "status", status: { ...status } });
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

function updateIdentityStatus(identity) {
  activeIdentity = identity;
  status.identityHash = bytesToHex(identity.hash);
  status.identityPersisted = true;
  pushStatus();
}

async function loadPersistedIdentity() {
  const stored = await runtime.store.get(IDENTITY_STORE_KEY);
  if (stored === undefined) {
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return null;
  }

  const identity = Identity.fromBytes(provider, stored);
  if (identity === null) {
    await runtime.store.delete(IDENTITY_STORE_KEY);
    status.identityHash = null;
    status.identityPersisted = false;
    pushStatus();
    return null;
  }

  updateIdentityStatus(identity);
  return identity;
}

async function persistIdentity(identity) {
  await runtime.store.set(IDENTITY_STORE_KEY, identity.getPrivateKey());
  updateIdentityStatus(identity);
}

async function createIdentity() {
  const identity = new Identity(provider);
  await persistIdentity(identity);
  log(`Created harness identity ${status.identityHash}`);
}

async function resetIdentity() {
  await runtime.store.delete(IDENTITY_STORE_KEY);
  activeIdentity = null;
  status.identityHash = null;
  status.identityPersisted = false;
  pushStatus();
  log("Harness identity cleared");
}

async function stopBleInterface() {
  status.bleConnected = false;
}

async function stopRnodeInterface() {
  if (rnodeIface !== null) {
    if (reticulum !== null) {
      reticulum.unregisterInterface(rnodeIface);
    }

    await rnodeIface.close();
    rnodeIface = null;
  }

  if (serialBridge !== null) {
    await serialBridge.close();
    serialBridge = null;
  }

  status.rnodeConnected = false;
  status.rnodeDeviceName = null;
}

async function stopAutoInterface() {
  if (autoIface !== null) {
    await autoIface.close();
    autoIface = null;
  }

  if (multicastBridge !== null) {
    await multicastBridge.stop();
    multicastBridge = null;
  }

  if (bonjourBridge !== null) {
    await bonjourBridge.stop();
    bonjourBridge = null;
  }

  status.autoPeers = 0;
}

async function stopTcpInterface() {
  if (tcpIface !== null) {
    await tcpIface.close();
    tcpIface = null;
  }

  status.linkOnline = false;
}

async function stopNode() {
  stopStatusTimer();
  status.running = false;
  status.linkOnline = false;
  nodeSuspended = false;
  pushStatus();

  await stopTcpInterface();
  await stopAutoInterface();
  await stopBleInterface();
  await stopRnodeInterface();

  if (reticulum !== null) {
    reticulum.stop();
    reticulum = null;
  }
}

async function quiesceInterfaces() {
  log("Quiescing interfaces for iOS background transition");
  await stopTcpInterface();
  await stopAutoInterface();
  await stopBleInterface();
  await stopRnodeInterface();
  pushStatus();
}

async function resumeInterfaces() {
  if (!status.running) {
    return;
  }

  log("Resuming interfaces after iOS foreground transition");
  await applyInterfaceConfig();
}

async function resolveIdentity() {
  if (activeIdentity !== null) {
    return activeIdentity;
  }

  const loaded = await loadPersistedIdentity();
  if (loaded !== null) {
    return loaded;
  }

  await createIdentity();
  return activeIdentity;
}

function registerAnnounceHandler() {
  if (reticulum === null) {
    return;
  }

  reticulum.registerAnnounceHandler({
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
        ingestCasLocator(info.appData);
        const { catalogStore: catalog } = ensureCatalog();
        const ingested = catalog.ingest({
          destinationHash: bytesToHex(info.destinationHash),
          appData: info.appData
        });
        if (ingested !== null) {
          log(`Catalog: ${ingested.name} v${ingested.version}`);
          void persistCatalogState();
          pushCatalog();
        }
      }
    }
  });
}

async function ensureReticulum() {
  if (reticulum !== null) {
    return reticulum;
  }

  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("Failed to resolve harness identity");
  }

  reticulum = Reticulum.create({
    provider,
    runtime,
    ...(IS_DESKTOP_HOST ? { transportEnabled: true } : {})
  });
  reticulum.start();
  status.running = true;
  registerAnnounceHandler();

  const inbound = reticulum.registerDestination({
    provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  inbound.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
  await inbound.announce();
  log("Announced harness identity");

  startStatusTimer();
  pushStatus();
  return reticulum;
}

async function startTcpInterface(targetHost, targetPort) {
  const node = await ensureReticulum();
  if (tcpIface !== null) {
    status.linkOnline = tcpIface.online;
    pushStatus();
    return;
  }

  log(`Starting TCP client to ${targetHost}:${targetPort}`);
  tcpIface = await node.addTcpClientInterface({
    name: "harness-tcp",
    targetHost,
    targetPort
  });

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    status.linkOnline = tcpIface.online;
    pushStatus();
    if (tcpIface.online) {
      log("TCP interface online");
      return;
    }

    await sleep(250);
  }

  log("Timed out waiting for TCP interface (peer may be unreachable)");
}

async function startAutoInterface() {
  const node = await ensureReticulum();
  if (autoIface !== null) {
    status.autoPeers = autoIface.peerInterfaces.length;
    pushStatus();
    return;
  }

  log("Starting AutoInterface (native multicast bridge via IPC)");
  multicastBridge = createIpcMulticastBridge();
  const discovery = selectDiscoveryProviders({
    multicastAvailable: true,
    multicastEntitled,
    bonjourAvailable: bonjourDiscoveryEnabled,
    allowConcurrent: multicastEntitled
  });

  if (discovery.active.includes("bonjour")) {
    bonjourBridge = createIpcBonjourBridge();
    await bonjourBridge.start();
    log("Bonjour discovery provider enabled");
  }

  autoIface = await AutoInterfaceBridge.open(provider, {
    name: "harness-auto",
    provider,
    runtime,
    bridge: multicastBridge,
    onAdvertiseInterface: async (iface) => {
      if (bonjourBridge !== null) {
        await bonjourBridge.advertise(iface.name, iface.linkLocalAddress, AUTO_DEFAULT_DATA_PORT);
      }
    },
    onPeerSpawn: (peer) => {
      node.registerInterface(peer);
      status.autoPeers = autoIface?.peerInterfaces.length ?? 0;
      pushStatus();
      log(`AutoInterface peer online: ${peer.peerAddress}`);
    },
    onPeerDetach: (peer) => {
      node.unregisterInterface(peer);
      status.autoPeers = autoIface?.peerInterfaces.length ?? 0;
      pushStatus();
      log(`AutoInterface peer detached: ${peer.peerAddress}`);
    }
  });

  status.autoPeers = autoIface.peerInterfaces.length;
  if (autoIface.online) {
    log(`AutoInterface online (${status.autoPeers} peer(s))`);
  } else {
    log("AutoInterface started; waiting for link-local interfaces from host");
  }

  pushStatus();
}

async function startBleInterface() {
  status.bleEnabled = false;
  pushStatus();
  log("BLE is not supported on desktop host");
}

async function startRnodeInterface() {
  const node = await ensureReticulum();
  if (rnodeIface !== null) {
    status.rnodeConnected = serialBridge?.connected ?? false;
    pushStatus();
    return;
  }

  if (pendingRnodePortPath === null) {
    log("RNode requires a serial port path (configure in host settings)");
    status.rnodeEnabled = false;
    pushStatus();
    return;
  }

  log(`Starting RNode interface over ${pendingRnodePortPath}`);
  serialBridge = createIpcSerialBridge(pendingRnodePortPath, pendingRnodeBaudRate);
  rnodeIface = await RNodeInterface.open(provider, {
    name: "host-rnode",
    provider,
    pipe: serialBridge
  });
  node.registerInterface(rnodeIface);

  status.rnodeConnected = serialBridge.connected;
  status.rnodeDeviceName = status.rnodeConnected ? pendingRnodePortPath : null;
  if (rnodeIface.online) {
    log(`RNode interface online (firmware: ${rnodeIface.rnodeStatus.firmwareVersion ?? "unknown"})`);
  } else {
    log("RNode interface started; waiting for USB serial connection from host");
  }

  pushStatus();
}

async function applyInterfaceConfig() {
  if (nodeSuspended) {
    log("Interface restart deferred while node is suspended");
    return;
  }

  if (!status.tcpEnabled && !status.autoEnabled && !status.bleEnabled && !status.rnodeEnabled) {
    await stopNode();
    log("All interfaces disabled; node stopped");
    return;
  }

  if (status.autoEnabled) {
    await startAutoInterface();
  } else {
    await stopAutoInterface();
  }

  if (status.bleEnabled) {
    await startBleInterface();
  } else {
    await stopBleInterface();
  }

  if (status.rnodeEnabled) {
    await startRnodeInterface();
  } else {
    await stopRnodeInterface();
  }

  if (status.tcpEnabled) {
    if (pendingTarget === null) {
      log("TCP enabled but no target host configured yet");
      return;
    }

    await startTcpInterface(pendingTarget.targetHost, pendingTarget.targetPort);
    return;
  }

  await stopTcpInterface();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reconnectTcpAfterNetworkChange() {
  if (nodeSuspended || !status.running || !status.tcpEnabled || pendingTarget === null) {
    return;
  }

  log("Network change detected; reconnecting TCP interface");
  await stopTcpInterface();
  await startTcpInterface(pendingTarget.targetHost, pendingTarget.targetPort);
}

async function handleHostMessage(raw) {
  const line = raw.toString().trim();
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

  if (message.type === "start") {
    pendingTarget = { targetHost: message.targetHost, targetPort: message.targetPort };
    multicastEntitled = message.multicastEntitled !== false;
    bonjourDiscoveryEnabled = message.bonjourEnabled !== false;
    if (status.tcpEnabled) {
      await applyInterfaceConfig();
    } else {
      log(`Target set to ${message.targetHost}:${message.targetPort} (enable TCP to connect)`);
    }
    return;
  }

  if (message.type === "suspend-node") {
    if (nodeSuspended) {
      return;
    }

    nodeSuspended = true;
    await quiesceInterfaces();
    return;
  }

  if (message.type === "resume-node") {
    if (!nodeSuspended) {
      return;
    }

    nodeSuspended = false;
    await resumeInterfaces();
    return;
  }

  if (message.type === "network-change") {
    if (status.autoEnabled) {
      await stopAutoInterface();
      await startAutoInterface();
    }

    await reconnectTcpAfterNetworkChange();
    return;
  }

  if (message.type === "stop") {
    await stopNode();
    log("Worklet stopped");
    return;
  }

  if (message.type === "create-identity") {
    await createIdentity();
    return;
  }

  if (message.type === "reset-identity") {
    await resetIdentity();
    return;
  }

  if (message.type === "list-catalog" || message.type === "list-installed") {
    pushCatalog();
    return;
  }

  if (message.type === "install-app") {
    if (refuseStoreAction("Catalog install")) {
      send({
        type: "install-progress",
        progress: {
          appId: message.appId,
          phase: "failed",
          bytesReceived: 0,
          totalBytes: 0,
          path: null,
          verified: false
        }
      });
      return;
    }

    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    const entry = catalog.get(message.appId);
    if (entry === null) {
      log(`Install failed: unknown app ${message.appId}`);
      return;
    }

    const interfaces = reticulum?.listInterfaces() ?? [];
    const budget = assessFetchBudget(entry, interfaces);
    if (!budget.allowed) {
      log(`Install blocked: ${budget.blockedReason}`);
      return;
    }

    if (budget.warning !== null) {
      log(budget.warning);
    }

    send({
      type: "install-progress",
      progress: {
        appId: entry.appId,
        phase: "starting",
        bytesReceived: 0,
        totalBytes: entry.packageSize,
        path: message.forcePath ?? null,
        verified: false
      }
    });

    const installVerifiedPackage = async (archive, path) => {
      send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "verifying",
          bytesReceived: archive.length,
          totalBytes: archive.length,
          path,
          verified: false
        }
      });

      const verified = verifyPackage(provider, archive, {
        hostApiVersion: HOST_API_VERSION,
        minVersion: installed.latestVersion(entry.appId) ?? undefined
      });
      validateManifestCapabilities(verified.manifest.capabilities);
      const archivePath = `packages/${entry.appId}/${verified.manifest.version}.tpkg`;
      await runtime.store.set(archivePath, archive);
      installed.install(
        {
          appId: entry.appId,
          version: verified.manifest.version,
          packageHash: verified.packageHash,
          installedAt: Date.now(),
          manifest: verified.manifest,
          archivePath
        },
        archive.length
      );
      await persistCatalogState();
      send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "complete",
          bytesReceived: archive.length,
          totalBytes: archive.length,
          path,
          verified: true
        }
      });
      pushCatalog();
      log(`Installed ${entry.name} v${verified.manifest.version} via ${path} (verified)`);
    };

    try {
      if (message.archiveHex) {
        await installVerifiedPackage(hexToBytes(message.archiveHex), message.forcePath ?? "resource");
        return;
      }

      const identity = await resolveIdentity();
      if (identity === null) {
        throw new Error("No harness identity available for fetch");
      }

      const driveManager = await ensurePackageDriveManager();
      let resourceClient = null;
      const publisherPublicKeyHex =
        entry.manifest?.publisherPublicKey ?? (entry.publisherPublicKey.length === 128 ? entry.publisherPublicKey : null);
      if (publisherPublicKeyHex !== null) {
        resourceClient = new PackageResourceClient({
          provider,
          runtime,
          publisherPublicKeyHex,
          appName: entry.name,
          identity
        });
        await resourceClient.start();
      }

      const result = await fetchPackage(provider, {
        entry,
        version: entry.version,
        interfaces,
        driveManager,
        resourceClient: resourceClient ?? undefined,
        forcePath: message.forcePath,
        onProgress(progress) {
          send({
            type: "install-progress",
            progress: {
              appId: entry.appId,
              phase: progress.phase === "verifying" ? "verifying" : progress.phase === "complete" ? "complete" : "downloading",
              bytesReceived: progress.bytesReceived,
              totalBytes: progress.totalBytes,
              path: progress.path,
              verified: progress.phase === "complete"
            }
          });
        }
      });

      if (resourceClient !== null) {
        await resourceClient.stop();
      }

      await installVerifiedPackage(result.archiveBytes, result.path);
    } catch (error) {
      send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "failed",
          bytesReceived: 0,
          totalBytes: entry.packageSize,
          path: message.forcePath ?? null,
          verified: false
        }
      });
      log(`Install failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "delete-package") {
    const { installedStore: installed } = ensureCatalog();
    installed.remove(message.appId, message.version, 0);
    void persistCatalogState();
    pushCatalog();
    return;
  }

  if (message.type === "rollback-package") {
    const { installedStore: installed } = ensureCatalog();
    const rolledBack = installed.rollback(message.appId);
    if (rolledBack === null) {
      log(`Rollback failed: no previous version for ${message.appId}`);
      return;
    }

    void persistCatalogState();
    pushCatalog();
    log(`Rolled back ${message.appId} to v${rolledBack}`);
    return;
  }

  if (message.type === "set-developer-mode") {
    if (shouldRefuseDeveloperMode(message.enabled)) {
      log("Developer mode refused in store posture variant");
      ensureMiniappHost().setDeveloperMode(false);
      return;
    }

    ensureMiniappHost().setDeveloperMode(message.enabled);
    log(`Developer mode ${message.enabled ? "enabled" : "disabled"}`);
    return;
  }

  if (message.type === "set-propagation") {
    if (message.enabled) {
      try {
        await startPropagation();
      } catch (error) {
        log(`Propagation enable failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    } else {
      await stopPropagation();
    }
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
    const { installedStore: installed } = ensureCatalog();
    try {
      await ensureMiniappHost().launch(installed, runtime, message.appId);
      log(`Launched mini-app ${message.appId}`);
    } catch (error) {
      log(`Launch failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "stop-miniapp") {
    await ensureMiniappHost().stop(message.reason ?? "stopped");
    log(`Stopped mini-app${message.reason ? ` (${message.reason})` : ""}`);
    return;
  }

  if (message.type === "confirm-response" || message.type === "launch-confirm" || message.type === "install-confirm") {
    pendingRendererReplies.get(message.token)?.(message);
    return;
  }

  if (message.type === "install-from-256t") {
    if (refuseStoreAction("Install from 256t")) {
      return;
    }

    try {
      const result = await installFromT256(message.t256.trim());
      send({ type: "install-256t-result", ok: true, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      send({ type: "install-256t-result", ok: false, error: detail });
      log(`Install from 256t failed: ${detail}`);
    }
    return;
  }

  if (message.type === "stop-preview-miniapp") {
    await ensureMiniappHost().stopPreview();
    return;
  }

  if (message.type === "set-limits") {
    try {
      ensureMiniappHost().setLimits(message.appId, message.limits);
      log(`Updated resource limits for ${message.appId}`);
    } catch (error) {
      log(`Set limits failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "get-limits") {
    ensureMiniappHost().getLimits(message.appId);
    return;
  }

  if (message.type === "workspace-read") {
    try {
      const content = await ensureMiniappHost().readWorkspaceFile(message.documentId);
      send({ type: "workspace-file", token: message.token, documentId: message.documentId, content });
    } catch (error) {
      send({
        type: "workspace-file",
        token: message.token,
        documentId: message.documentId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
    return;
  }

  if (message.type === "set-ai-config") {
    ensureMiniappHost().setAiConfig(message.config ?? null);
    log("AI configuration updated");
    return;
  }

  if (message.type === "trust-list") {
    await pushTrustList();
    return;
  }

  if (message.type === "trust-add") {
    try {
      const publisherPublicKey = decodePublisherIdentity256t(message.identityString);
      await ensureTrustStore().add({
        publisherPublicKey,
        label: message.label ?? "Unnamed publisher",
        addedAt: Date.now(),
        source: message.source ?? "paste"
      });
      log(`Trusted publisher ${message.label ?? publisherPublicKey.slice(0, 16)}`);
    } catch (error) {
      log(`Trust add failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    await pushTrustList();
    return;
  }

  if (message.type === "trust-remove") {
    await ensureTrustStore().remove(message.publisherPublicKey);
    log("Removed trusted publisher");
    await pushTrustList();
    return;
  }

  if (message.type === "trust-show") {
    const identity = await resolveIdentity();
    if (identity === null) {
      send({ type: "trust-identity", identity256t: null });
      return;
    }

    send({ type: "trust-identity", identity256t: encodePublisherIdentity256t(identity.getPublicKey()) });
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
      if (message.slot === "preview") {
        await ensureMiniappHost().handlePreviewUiEvent(message.nodeId, message.event, message.value);
      } else {
        await ensureMiniappHost().handleUiEvent(message.nodeId, message.event, message.value);
      }
    } catch (error) {
      log(`UI event failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "dev-side-load") {
    if (refuseStoreAction("Dev side-load")) {
      return;
    }

    try {
      await ensureMiniappHost().devSideLoad(message.manifest, hexToBytes(message.bundleHex));
      log(`Dev side-loaded ${message.manifest.name ?? "mini-app"}`);
    } catch (error) {
      log(`Dev side-load failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "connect-dev-channel") {
    if (refuseStoreAction("Dev channel")) {
      return;
    }

    try {
      await ensureDevChannel().connect(message.host, message.port);
    } catch (error) {
      send({
        type: "dev-channel",
        state: "error",
        detail: error instanceof Error ? error.message : String(error)
      });
      log(`Dev channel connect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "disconnect-dev-channel") {
    await ensureDevChannel().disconnect();
    return;
  }

  if (message.type === "set-interfaces") {
    status.tcpEnabled = message.tcp;
    status.autoEnabled = message.auto;
    status.bleEnabled = message.ble;
    status.rnodeEnabled = message.rnode;
    pendingRnodeDeviceId = message.rnodeDeviceId ?? null;
    pendingRnodePortPath = message.rnodePortPath ?? null;
    pendingRnodeBaudRate = message.rnodeBaudRate ?? 115_200;
    pushStatus();
    await applyInterfaceConfig();
    return;
  }

  if (message.type === "multicast-interfaces" || message.type === "bonjour-interfaces") {
    if (multicastBridge !== null && message.type === "multicast-interfaces") {
      multicastBridge.handleHostMessage(message);
    }

    if (bonjourBridge !== null && message.type === "bonjour-interfaces") {
      bonjourBridge.handleHostMessage(message);
    }

    await reconnectTcpAfterNetworkChange();
    return;
  }

  if (multicastBridge !== null && message.type === "multicast-packet") {
    multicastBridge.handleHostMessage(message);
    return;
  }

  if (bonjourBridge !== null && message.type === "bonjour-peer") {
    autoIface?.notifyPeerDiscovered(message.address, message.ifname);
    status.autoPeers = autoIface?.peerInterfaces.length ?? status.autoPeers;
    pushStatus();
    log(`Bonjour peer discovered: ${message.address}`);
    return;
  }

  if (serialBridge !== null && (
    message.type === "serial-data" ||
    message.type === "serial-connect" ||
    message.type === "serial-disconnect" ||
    message.type === "serial-error"
  )) {
    serialBridge.handleHostMessage(message);
  }
}

IPC.on("data", (data) => {
  handleHostMessage(data).catch((error) => {
    log(`Worklet error: ${error instanceof Error ? error.message : String(error)}`);
    pushStatus();
  });
});

void loadPersistedIdentity().then(() => loadCatalogState().then(pushCatalog));
pushStatus();
log(`Desktop host worklet ready (crypto: ${provider.name})`);
