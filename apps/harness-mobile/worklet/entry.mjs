/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
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
import { BleInterface } from "../../../packages/reticulum-interfaces/dist/ble/interface.js";
import { createIpcMulticastBridge } from "./ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "./ipc-bonjour-bridge.mjs";
import { createIpcBleBridge } from "./ipc-ble-bridge.mjs";
import { createIpcSerialBridge } from "./ipc-serial-bridge.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import { CatalogStore, InstalledPackageStore, decodeAppAnnounceData, unpackPackage, verifyPackage } from "../../../packages/app-registry/dist/index.js";
import { DriveManager, PackageResourceClient, assessFetchBudget, createSwarm, fetchPackage } from "../../../packages/bridge-hyper/dist/index.js";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { HOST_API_VERSION, validateManifestCapabilities } from "../../../packages/miniapp-runtime/dist/index.js";
import { createWorkletMiniappHost } from "./miniapp-host.mjs";
import { createDevChannelClient } from "./dev-channel.mjs";
import { refuseStorePosture, shouldRefuseDeveloperMode } from "./store-posture-policy.mjs";

const { IPC } = BareKit;

function createProvider() {
  try {
    return new BareCryptoProvider();
  } catch {
    return new PureCryptoProvider();
  }
}

const provider = createProvider();
const runtime = bareRuntime({ storePath: "reticulum-store" });
const IDENTITY_STORE_KEY = "harness-identity";

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
  cryptoProvider: provider.name,
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
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

function ensureMiniappHost() {
  if (miniappHost === null) {
    miniappHost = createWorkletMiniappHost({
      kvStore: runtimeKeyValueStore(),
      beeStoragePath: "miniapp-bee-store",
      getPresenceSnapshot: () => status,
      send,
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

function send(message) {
  IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

function log(line) {
  send({ type: "log", line });
}

function refuseStoreAction(action) {
  return refuseStorePosture(action, send);
}

function pushStatus() {
  if (reticulum !== null) {
    const interfaces = reticulum.listInterfaces();
    const preferred = selectPreferredInterface(interfaces);
    status.preferredInterface = preferred?.name ?? null;
    status.onlineInterfaces = interfaces.filter((iface) => iface.online).length;
  } else {
    status.preferredInterface = null;
    status.onlineInterfaces = 0;
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
  if (bleIface !== null) {
    if (reticulum !== null) {
      reticulum.unregisterInterface(bleIface);
    }

    await bleIface.close();
    bleIface = null;
  }

  if (bleBridge !== null) {
    await bleBridge.stop();
    bleBridge = null;
  }

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

  reticulum = Reticulum.create({ provider, runtime });
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
    name: "docker-peer",
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
  const node = await ensureReticulum();
  if (bleIface !== null) {
    status.bleConnected = bleBridge?.connected ?? false;
    pushStatus();
    return;
  }

  const identity = await resolveIdentity();
  if (identity === null) {
    log("BLE requires an identity (create one first)");
    status.bleEnabled = false;
    pushStatus();
    return;
  }

  log("Starting BLE interface (native GATT bridge via IPC)");
  bleBridge = createIpcBleBridge(identity.hash);
  bleIface = await BleInterface.open(provider, {
    name: "harness-ble",
    provider,
    pipe: bleBridge
  });
  node.registerInterface(bleIface);

  status.bleConnected = bleBridge.connected;
  if (bleIface.online) {
    log("BLE interface online");
  } else {
    log("BLE interface started; waiting for GATT connection from host");
  }

  pushStatus();
}

async function startRnodeInterface() {
  const node = await ensureReticulum();
  if (rnodeIface !== null) {
    status.rnodeConnected = serialBridge?.connected ?? false;
    pushStatus();
    return;
  }

  if (pendingRnodeDeviceId === null) {
    log("RNode requires a USB device (select one in the harness UI)");
    status.rnodeEnabled = false;
    pushStatus();
    return;
  }

  log(`Starting RNode interface over USB device ${pendingRnodeDeviceId}`);
  serialBridge = createIpcSerialBridge(pendingRnodeDeviceId, pendingRnodeBaudRate);
  rnodeIface = await RNodeInterface.open(provider, {
    name: "harness-rnode",
    provider,
    pipe: serialBridge
  });
  node.registerInterface(rnodeIface);

  status.rnodeConnected = serialBridge.connected;
  status.rnodeDeviceName = status.rnodeConnected ? `usb-${pendingRnodeDeviceId}` : null;
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
    pendingRnodeBaudRate = message.rnodeBaudRate ?? 115_200;
    pushStatus();
    await applyInterfaceConfig();
    return;
  }

  if (multicastBridge !== null && (message.type === "multicast-packet" || message.type === "multicast-interfaces")) {
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

  if (bonjourBridge !== null && message.type === "bonjour-interfaces") {
    bonjourBridge.handleHostMessage(message);
    return;
  }

  if (bleBridge !== null && (message.type === "ble-data" || message.type === "ble-connect" || message.type === "ble-disconnect" || message.type === "ble-error")) {
    bleBridge.handleHostMessage(message);
    if (message.type === "ble-connect") {
      status.bleConnected = true;
      log("BLE pipe connected");
      pushStatus();
    } else if (message.type === "ble-disconnect") {
      status.bleConnected = false;
      log("BLE pipe disconnected");
      pushStatus();
    } else if (message.type === "ble-error") {
      log(`BLE pipe error: ${message.message}`);
    }
    return;
  }

  if (serialBridge !== null && (
    message.type === "serial-data" ||
    message.type === "serial-connect" ||
    message.type === "serial-disconnect" ||
    message.type === "serial-error"
  )) {
    serialBridge.handleHostMessage(message);
    if (message.type === "serial-connect") {
      status.rnodeConnected = true;
      status.rnodeDeviceName = message.deviceName;
      log(`RNode USB serial connected (${message.deviceName})`);
      pushStatus();
    } else if (message.type === "serial-disconnect") {
      status.rnodeConnected = false;
      status.rnodeDeviceName = null;
      log("RNode USB serial disconnected");
      pushStatus();
    } else if (message.type === "serial-error") {
      log(`RNode USB serial error: ${message.message}`);
    }
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
log(`Harness worklet ready (crypto: ${provider.name})`);
