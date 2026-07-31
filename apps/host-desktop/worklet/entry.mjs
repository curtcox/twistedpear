/**
 * Desktop host Bare worklet entry (stdio IPC, transport role enabled by default).
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import { PACKET_LOG_WASM_BASE64 } from "./packet-log-wasm.generated.mjs";
import { bytesToHex } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { BandwidthLimiter } from "../../../packages/reticulum-ts/dist/transport/bandwidth.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { AutoInterfaceBridge } from "../../../packages/reticulum-interfaces/dist/auto-bridge.js";
import { AUTO_DEFAULT_DATA_PORT } from "../../../packages/reticulum-interfaces/dist/auto-common.js";
import { selectDiscoveryProviders } from "../../../packages/reticulum-interfaces/dist/auto-discovery.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import { createIpcSerialBridge } from "../../../packages/worklet-core/src/ipc-serial-bridge.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import { CatalogStore, InstalledPackageStore, TrustStore, decodeAppAnnounceData, decodePublisherIdentity256t, encodePublisherIdentity256t, unpackPackage, verifyPackage } from "../../../packages/app-registry/dist/index.js";
import { PackageResourceClient, assessFetchBudget, attachPackageResourceServer, fetchPackage } from "../../../packages/bridge-hyper/dist/worklet.js";
import {
  FreenetClientContractBackend,
  FreenetContractPacketLogBackend
} from "../../../packages/bridge-freenet/dist/index.js";
import { FreenetInterface } from "../../../packages/reticulum-interfaces/dist/freenet.js";
import {
  buildAppAnnounceSummary,
  encodeAppAnnounceData
} from "../../../packages/app-registry/dist/index.js";
import {
  CasStore,
  casAnnounceAspects,
  casRequestAspects,
  decodeCasLocatorRequest,
  decodeCasLocator,
  encodeCasLocatorRequest,
  encodeCasLocator,
  signCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../../../packages/cas-256t/dist/index.js";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { HOST_API_VERSION, createWorkletFlagRelayService, generateConfirmationToken, validateManifestCapabilities } from "../../../packages/miniapp-runtime/dist/worklet.js";
import { decodePeerInvitation } from "../../../packages/protocol/dist/index.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "../../../packages/lxmf-ts/dist/index.js";
import { createDesktopPeerChrome } from "./peer-chrome.mjs";
import {
  AudioPeerDiscoveryAdapter,
  CryptoPeerPairingBackend,
  InvitationPairingDriver,
  ManualPeerDiscoveryAdapter,
  NtfyPeerDiscoveryAdapter,
  NtfyRendezvousClient,
  PeerDiscoveryRegistry,
  PeerSessionManager,
  QrPeerDiscoveryAdapter,
  ReticulumPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter
} from "../../../packages/peer-discovery/dist/index.js";
import {
  connectTestAgent,
  createCrossDeviceTestDriver,
  createDevChannelClient,
  createHostReplyChannel,
  createMiniappAnnounceService,
  createStatusTimer,
  createWorkletMiniappHost
} from "../../../packages/worklet-core/src/index.mjs";
import { IPC } from "./ipc-stdio.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";

const NODE_FALLBACK = globalThis.process?.env?.TWISTEDPEAR_WORKLET_NODE_FALLBACK === "1";
if (!NODE_FALLBACK) {
  const { installBareWebSocketGlobal } = await import("../../../conformance/freenet-spike/bare-websocket-shim.mjs");
  installBareWebSocketGlobal();
}

const HOST_BANDWIDTH_BYTES_PER_SECOND = 512 * 1024;
import {
  decryptIdentityBackup,
  encryptIdentityBackup,
  identityFromRecoveryWords,
  identityToRecoveryWords,
  isEncryptedIdentityBackup,
  validateNewIdentityPassphrase
} from "../../../packages/host-core/dist/identity-backup.js";

let bundledCatalogModule = null;
try {
  bundledCatalogModule = await import("./bundled-catalog.generated.mjs");
} catch {
  // Generated during worklet build; absent in partial checkouts until build-worklet runs.
}

const IS_DESKTOP_HOST = true;

function envValue(name) {
  const value = globalThis.process?.env?.[name];
  return typeof value === "string" && value.length > 0 ? value : null;
}

function defaultDesktopDataDir() {
  const configured = envValue("TWISTEDPEAR_HOST_DATA_DIR");
  if (configured !== null) return configured;
  const platform = globalThis.process?.platform ?? "";

  if (platform === "win32") {
    return `${envValue("APPDATA") ?? `${envValue("USERPROFILE") ?? "."}\\AppData\\Roaming`}\\TwistedPear\\host`;
  }

  const home = envValue("HOME") ?? ".";
  if (platform === "darwin") {
    return `${home}/Library/Application Support/TwistedPear/host`;
  }

  return `${home}/.local/share/twistedpear/host`;
}

const HOST_DATA_DIR = defaultDesktopDataDir();
const HOST_DATA_SEPARATOR = HOST_DATA_DIR.includes("\\") ? "\\" : "/";

function hostDataPath(...segments) {
  return [HOST_DATA_DIR, ...segments].join(HOST_DATA_SEPARATOR);
}

function refuseStorePosture() {
  return false;
}

function shouldRefuseDeveloperMode() {
  return false;
}

async function createProvider() {
  if (IS_DESKTOP_HOST) {
    return new PureCryptoProvider();
  }

  try {
    const { BareCryptoProvider } = await import("../../../packages/reticulum-ts/dist/crypto/bare.js");
    const bare = new BareCryptoProvider();
    bare.ed25519PublicFromPrivate(bare.randomBytes(32));
    return bare;
  } catch {
    return new PureCryptoProvider();
  }
}

const provider = await createProvider();
const runtime = NODE_FALLBACK
  ? (await import("../../../packages/reticulum-ts/dist/runtime/node/runtime.js")).nodeRuntime()
  : bareRuntime({ storePath: hostDataPath("host-desktop-store") });
const inboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, HOST_BANDWIDTH_BYTES_PER_SECOND);
const outboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, HOST_BANDWIDTH_BYTES_PER_SECOND);
const IDENTITY_STORE_KEY = "host-identity";
const MODERATION_STORE_KEY = "host-moderation-v1";
let moderationState = { version: 1, blocked: [], muted: [], reports: [] };

function normalizedSourceHash(value) {
  const normalized = String(value).trim().toLowerCase();
  if (!/^[0-9a-f]{32}$/.test(normalized)) throw new Error("LXMF source hash must be 32 hexadecimal characters");
  return normalized;
}

async function persistModerationState() {
  await runtime.store.set(MODERATION_STORE_KEY, new TextEncoder().encode(JSON.stringify(moderationState)));
}

function pushModerationState() {
  send({ type: "moderation-state", blocked: moderationState.blocked, muted: moderationState.muted, reports: moderationState.reports });
}

async function loadModerationState() {
  const stored = await runtime.store.get(MODERATION_STORE_KEY);
  if (stored !== undefined) {
    const parsed = JSON.parse(new TextDecoder().decode(stored));
    if (parsed.version === 1 && Array.isArray(parsed.blocked) && Array.isArray(parsed.muted) && Array.isArray(parsed.reports)) {
      moderationState = parsed;
    }
  }
  pushModerationState();
}
const NodeWorkerSandboxBackend = NODE_FALLBACK
  ? (await import("../../../packages/miniapp-runtime/dist/sandbox/node-worker.js")).NodeWorkerSandboxBackend
  : null;

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
  freenetEnabled: false,
  freenetUrl: null,
  freenetConfigured: false,
  freenetInterfaceEnabled: false,
  freenetInterfaceOnline: false,
  freenetRendezvousHex: null,
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
/** Test-only peer control agent; mounted only by `connect-test-agent`. */
let testAgent = null;
let crossDeviceTestDriver = null;

async function importTrustedPublisherForTest(identityString, label) {
  const publisherPublicKey = decodePublisherIdentity256t(identityString);
  const confirmation = await requestRendererReply({
    type: "confirm-request",
    token: generateConfirmationToken((length) => provider.randomBytes(length)),
    kind: "trust-import",
    appId: "host",
    publisherPublicKey,
    summary: { label, source: "paste" }
  });
  if (confirmation?.approved !== true) throw new Error("Publisher trust import denied");
  await ensureTrustStore().add({
    publisherPublicKey,
    label,
    addedAt: Date.now(),
    source: "paste"
  });
}

function ensureCrossDeviceTestDriver() {
  if (crossDeviceTestDriver === null) {
    crossDeviceTestDriver = createCrossDeviceTestDriver({
      miniappHost: () => ensureMiniappHost(),
      installedStore: () => ensureCatalog().installedStore,
      runtime,
      installFromT256,
      importTrust: importTrustedPublisherForTest,
      casStore: () => ensureEntryCasStore(),
      sha512: (bytes) => provider.sha512(bytes),
      async publisherIdentity256t() {
        const identity = await resolveIdentity();
        if (identity === null) throw new Error("Host identity is unavailable");
        return encodePublisherIdentity256t(identity.getPublicKey());
      }
    });
  }
  return crossDeviceTestDriver;
}
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
/** @type {Identity | null} */
let activeIdentity = null;
let legacyIdentity = null;
/** @type {{ targetHost: string; targetPort: number } | null} */
let pendingTarget = null;

/** @type {CatalogStore | null} */
let catalogStore = null;
/** @type {InstalledPackageStore | null} */
let installedStore = null;
/** @type {import("../../../packages/bridge-hyper/dist/drive.js").DriveManager | null} */
let packageDriveManager = null;
/** @type {import("../../../packages/bridge-hyper/dist/swarm.js").SwarmSession | null} */
let packageSwarm = null;
const PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;
const PROPAGATION_STORE_KEY = "propagation-store";

/** @type {PropagationServer | null} */
let propagationServer = null;
/** @type {import("@twistedpear/lxmf-ts").RegisteredDestination | null} */
let propagationDestination = null;

/** @type {import("../../../packages/reticulum-interfaces/dist/freenet.js").FreenetInterface | null} */
let freenetIface = null;
/** @type {string | null} */
let pendingFreenetAuthToken = null;
/** @type {0 | 1} */
let pendingFreenetLocalDirection = 0;
/** @type {Uint8Array | null} */
let packetLogWasmCache = null;
/** @type {ReturnType<typeof createWorkletMiniappHost> | null} */
let miniappHost = null;
/** @type {FreenetClientContractBackend | null} */
let freenetBackendImpl = null;
const freenetBackendProxy = {
  async get(keyHex) {
    if (freenetBackendImpl === null) {
      throw new Error("Freenet is not configured on this host (enable it in Settings)");
    }
    return freenetBackendImpl.get(keyHex);
  },
  async put(options) {
    if (freenetBackendImpl === null) {
      throw new Error("Freenet is not configured on this host (enable it in Settings)");
    }
    return freenetBackendImpl.put(options);
  },
  async update(options) {
    if (freenetBackendImpl === null) {
      throw new Error("Freenet is not configured on this host (enable it in Settings)");
    }
    return freenetBackendImpl.update(options);
  }
};
/** @type {PeerSessionManager | null} */
let peerSessionManager = null;
const peerLinkDestinations = new Map();
const peerLinks = new Map();
const automaticDiscoveryDestinations = new Map();
const automaticDiscoveryHandlers = new Set();
const automaticInboundBuckets = new Map();
const automaticInboundWaiters = new Map();
const automaticInboundRoutes = new Map();
const automaticAnswerWaiters = new Map();
const automaticOfferKeys = new Map();
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

/** @type {TrustStore | null} */
let trustStore = null;

/** @type {Map<string, import("../../../packages/cas-256t/dist/index.js").CasLocator>} */
const casLocators = new Map();
const casRequestDestinations = new Map();
const casResponseDestinations = new Map();
/** @type {CasStore | null} */
let entryCasStore = null;
const runtimeStoreKeys = new Set();

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

async function announceCasLocatorRequest(t256) {
  const node = await ensureReticulum();
  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("No host identity available for locator request");
  }
  let destination = casRequestDestinations.get(t256);
  if (destination === undefined) {
    destination = node.registerDestination({
      provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: casRequestAspects(t256)
    });
    casRequestDestinations.set(t256, destination);
  }
  await destination.announce({ appData: encodeCasLocatorRequest(t256) });
  log(`Requested CAS locator for ${t256.slice(0, 16)}…`);
}

async function respondToCasLocatorRequest(appData) {
  let t256;
  try {
    t256 = decodeCasLocatorRequest(appData);
  } catch {
    return;
  }
  const locator = casLocators.get(t256);
  if (locator === undefined || reticulum === null) {
    return;
  }
  const identity = await resolveIdentity();
  if (identity === null) {
    return;
  }
  let destination = casResponseDestinations.get(t256);
  if (destination === undefined) {
    destination = reticulum.registerDestination({
      provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: casAnnounceAspects(t256)
    });
    casResponseDestinations.set(t256, destination);
  }
  await destination.announce({ appData: encodeCasLocator(locator) });
  log(`Re-announced CAS locator for ${t256.slice(0, 16)}…`);
}

async function waitForCasLocator(t256, timeoutMs = 30_000) {
  if (!casLocators.has(t256)) {
    await announceCasLocatorRequest(t256);
  }
  return new Promise((resolve, reject) => {
    const startedAt = Date.now();
    let lastRequestedAt = startedAt;
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

      if (Date.now() - lastRequestedAt >= 5_000) {
        lastRequestedAt = Date.now();
        void announceCasLocatorRequest(t256).catch((error) => {
          log(`CAS locator re-request failed: ${error instanceof Error ? error.message : String(error)}`);
        });
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

  return publishArchiveAsIdentity(identity, { t256, archive });
}

async function publishArchiveAsIdentity(identity, { t256, archive }) {
  const unpacked = unpackPackage(provider, archive);
  let keyHex = unpacked.manifest.driveKey;
  let driveManager = null;
  if (NODE_FALLBACK) {
    if (keyHex === "0".repeat(64)) {
      keyHex = bytesToHex(provider.sha256(archive));
    }
  } else {
    driveManager = await ensurePackageDriveManager();
    if (keyHex === "0".repeat(64)) {
      const created = await driveManager.createDrive();
      keyHex = created.keyHex;
    } else {
      await driveManager.openDrive(keyHex);
    }
  }

  const published = driveManager === null
    ? { version: unpacked.manifest.version }
    : await driveManager.publishVersion(unpacked.manifest.version, archive, unpacked.packageHash);
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
      return driveManager === null ? [published.version] : driveManager.listVersions();
    },
    async fetchArchive(version) {
      if (driveManager === null) {
        if (version !== published.version) throw new Error(`Version not found: ${version}`);
        return archive;
      }
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
  casResponseDestinations.set(t256, casDestination);
  await casDestination.announce({ appData: encodeCasLocator(locator) });
  casLocators.set(t256, locator);

  log(`Published ${unpacked.manifest.name} v${published.version}; 256t ${t256.slice(0, 16)}…`);
  return { t256, driveKey: keyHex, version: published.version };
}

async function installFromT256(t256) {
  const cas = ensureEntryCasStore();
  let archive = await cas.get(t256).catch(() => null);
  let fetchedFrom = "local-cas";
  let resolvedLocator = null;

  if (archive === null) {
    const locator = await waitForCasLocator(t256);
    resolvedLocator = locator;
    const identity = await resolveIdentity();
    if (identity === null) {
      throw new Error("No host identity available for fetch");
    }
    const node = await ensureReticulum();

    const driveManager = NODE_FALLBACK ? undefined : await ensurePackageDriveManager();
    const resourceClient = new PackageResourceClient({
      provider,
      runtime,
      publisherPublicKeyHex: locator.publisherPublicKey,
      servingPublicKeyHex: locator.servingPublicKey,
      appName: locator.appId,
      identity,
      reticulum: node
    });
    await resourceClient.start();
    try {
      const result = await fetchPackage(provider, {
        entry: toCatalogEntryLike(locator),
        version: locator.version,
        interfaces: reticulum?.listInterfaces() ?? [],
        driveManager,
        resourceClient,
        ...(NODE_FALLBACK ? { forcePath: "resource" } : {})
      });
      archive = result.archiveBytes;
      fetchedFrom = result.path ?? "resource";
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
    token: generateConfirmationToken((length) => provider.randomBytes(length)),
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

  log(`Installed ${appId} v${verified.manifest.version} from 256t via ${fetchedFrom} (trusted: ${trusted})`);
  return {
    appId,
    version: verified.manifest.version,
    trusted,
    source: fetchedFrom,
    publisherPublicKey: verified.manifest.publisherPublicKey,
    servingPublicKey: resolvedLocator?.servingPublicKey ?? null
  };
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

const hostReplyChannel = createHostReplyChannel({ send });
const requestRendererReply = hostReplyChannel.requestReply;

const peerChrome = createDesktopPeerChrome({
  requestReply: requestRendererReply,
  send,
  createToken: () => generateConfirmationToken((length) => provider.randomBytes(length)),
  ntfyServer: envValue("TWISTEDPEAR_NTFY_URL")
});

function ntfyHostFetch(input, init = {}) {
  const token = generateConfirmationToken((length) => provider.randomBytes(length));
  const headers = {};
  new Headers(init.headers).forEach((value, name) => { headers[name] = value; });
  return requestRendererReply({
    type: "peer-ntfy-http",
    token,
    request: {
      url: String(input),
      method: init.method ?? "GET",
      headers,
      ...(typeof init.body === "string" ? { body: init.body } : {})
    }
  }, 30_000).then((reply) => {
    if (reply === null || reply.error !== undefined || reply.http === undefined) throw new Error(reply?.error ?? "ntfy host request timed out");
    const result = reply.http;
    return {
      ok: result.status >= 200 && result.status < 300,
      status: result.status,
      headers: { get(name) { return name.toLowerCase() === "content-length" ? result.contentLength : null; } },
      async text() { return result.body; }
    };
  });
}

function peerServiceAspect(service) {
  return bytesToHex(provider.sha256(new TextEncoder().encode(service)).subarray(0, 16));
}

function receiveAutomaticAnswer(data) {
  try {
    const invitation = decodePeerInvitation(data, Date.now());
    if (invitation.role !== "answer") return;
    const key = bytesToHex(invitation.sessionId);
    const waiter = automaticAnswerWaiters.get(key);
    if (waiter === undefined) return;
    automaticAnswerWaiters.delete(key);
    automaticOfferKeys.delete(waiter.adapterSessionId);
    waiter.resolve(data);
  } catch {
    // Ignore unauthenticated or malformed link payloads. The pairing backend verifies again.
  }
}

async function ensurePeerLinkDestination(identity, service) {
  const node = await ensureReticulum();
  const aspect = peerServiceAspect(service);
  let destination = peerLinkDestinations.get(aspect);
  if (destination === undefined) {
    destination = node.registerDestination({ provider, identity, direction: DestinationDirection.IN, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", aspect] });
    destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    destination.setLinkEstablishedCallback((link) => {
      const existing = link.callbacks.packet;
      link.callbacks.packet = (data, packet) => { receiveAutomaticAnswer(data); existing?.(data, packet); };
    });
    peerLinkDestinations.set(aspect, destination);
  }
  return destination;
}

async function ensureAutomaticDiscoveryListener(service, identity) {
  const node = await ensureReticulum();
  const aspect = peerServiceAspect(service);
  if (automaticDiscoveryHandlers.has(aspect)) return aspect;
  node.registerAnnounceHandler({
    aspectFilter: `tp.peer-discovery.${aspect}`,
    receivedAnnounce(info) {
      if (info.appData === null || bytesToHex(info.announcedIdentity.hash) === bytesToHex(identity.hash)) return;
      try {
        const offer = decodePeerInvitation(info.appData, Date.now());
        if (offer.role !== "offer" || offer.service !== service) return;
        const session = { id: `auto:${bytesToHex(offer.sessionId)}`, kind: "reticulum" };
        const inbound = { session, envelope: info.appData };
        automaticInboundRoutes.set(session.id, offer);
        const waiters = automaticInboundWaiters.get(aspect) ?? [];
        const waiter = waiters.shift();
        if (waiter !== undefined) waiter(inbound);
        else {
          const bucket = automaticInboundBuckets.get(aspect) ?? [];
          bucket.push(inbound);
          automaticInboundBuckets.set(aspect, bucket.slice(-32));
        }
        automaticInboundWaiters.set(aspect, waiters);
      } catch {
        // Hostile announce data is discarded before it reaches the pairing coordinator.
      }
    }
  });
  automaticDiscoveryHandlers.add(aspect);
  return aspect;
}

function automaticReticulumChannel(identity) {
  return {
    async availability() {
      return reticulum !== null && status.onlineInterfaces > 0
        ? { state: "available", reason: "Reticulum announce and Link signaling are online" }
        : { state: "offline", reason: "No online Reticulum interface is available for automatic discovery" };
    },
    async *offer(session, envelope) {
      const node = await ensureReticulum();
      const invitation = decodePeerInvitation(envelope, Date.now());
      const key = bytesToHex(invitation.sessionId);
      automaticOfferKeys.set(session.id, key);
      const answer = new Promise((resolve, reject) => automaticAnswerWaiters.set(key, { resolve, reject, adapterSessionId: session.id }));
      const aspect = peerServiceAspect(invitation.service);
      let destination = automaticDiscoveryDestinations.get(aspect);
      if (destination === undefined) {
        destination = node.registerDestination({ provider, identity, direction: DestinationDirection.IN, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer-discovery", aspect] });
        automaticDiscoveryDestinations.set(aspect, destination);
      }
      await destination.announce({ appData: envelope });
      yield await answer;
    },
    async *listen(options) {
      const aspect = await ensureAutomaticDiscoveryListener(options.service, identity);
      const bucket = automaticInboundBuckets.get(aspect) ?? [];
      const immediate = bucket.shift();
      automaticInboundBuckets.set(aspect, bucket);
      if (immediate !== undefined) { yield immediate; return; }
      yield await new Promise((resolve) => {
        const waiters = automaticInboundWaiters.get(aspect) ?? [];
        waiters.push(resolve);
        automaticInboundWaiters.set(aspect, waiters);
      });
    },
    async answer(session, envelope) {
      const offer = automaticInboundRoutes.get(session.id);
      automaticInboundRoutes.delete(session.id);
      const candidate = offer?.candidates.find((entry) => entry.kind === "reticulum");
      const remoteIdentity = offer?.identityProof === undefined ? null : Identity.fromPublicKey(provider, offer.identityProof);
      if (offer === undefined || candidate === undefined || remoteIdentity === null) throw new Error("Automatic Reticulum offer has no authenticated return destination");
      const node = await ensureReticulum();
      const outbound = node.registerDestination({ provider, identity: remoteIdentity, direction: DestinationDirection.OUT, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", peerServiceAspect(offer.service)] });
      if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) throw new Error("Automatic Reticulum return destination does not match the signed offer");
      if (!node.hasPath(outbound.hash)) { node.requestPath(outbound.hash); if (!await node.awaitPath(outbound.hash, 15)) throw new Error("No Reticulum path for automatic discovery answer"); }
      const link = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Automatic Reticulum answer link timed out")), 30_000);
        outbound.requestLink({ linkEstablished(established) { clearTimeout(timer); resolve(established); }, linkClosed() { clearTimeout(timer); reject(new Error("Automatic Reticulum answer link closed")); } });
      });
      await link.send(envelope);
      setTimeout(() => { void link.teardown(); }, 1_000);
    },
    async cancel(sessionId) {
      automaticInboundRoutes.delete(sessionId);
      const key = automaticOfferKeys.get(sessionId);
      if (key !== undefined) {
        automaticOfferKeys.delete(sessionId);
        const waiter = automaticAnswerWaiters.get(key);
        automaticAnswerWaiters.delete(key);
        waiter?.reject(new Error("Automatic Reticulum discovery cancelled"));
      }
    }
  };
}

async function ensurePeerSessionManager() {
  if (peerSessionManager !== null) return peerSessionManager;
  const identity = await resolveIdentity();
  if (identity === null) throw new Error("Unlock the host identity before connecting to a peer");
  const registry = new PeerDiscoveryRegistry();
  const createSessionId = () => generateConfirmationToken((length) => provider.randomBytes(length));
  registry.register(new ManualPeerDiscoveryAdapter({ channel: peerChrome.manual, createSessionId }));
  registry.register(new QrPeerDiscoveryAdapter({ channel: peerChrome.qr, createSessionId }));
  registry.register(new ReticulumPeerDiscoveryAdapter({ channel: automaticReticulumChannel(identity), createSessionId }));
  registry.register(new AudioPeerDiscoveryAdapter({ channel: peerChrome.audio, createSessionId }));
  registry.register(new UnavailablePeerDiscoveryAdapter("bluetooth", { state: "policy-disabled", reason: "Native invitation GATT is not enabled; the BLE Reticulum interface remains available as a data path" }));
  const ntfyUrl = envValue("TWISTEDPEAR_NTFY_URL");
  if (ntfyUrl === null) {
    registry.register(new UnavailablePeerDiscoveryAdapter("ntfy", { state: "offline", reason: "No ntfy rendezvous server is configured" }));
  } else {
    registry.register(new NtfyPeerDiscoveryAdapter({
      client: new NtfyRendezvousClient({ baseUrl: ntfyUrl, fetch: ntfyHostFetch, entropy: async (length) => provider.randomBytes(length) }),
      channel: peerChrome.ntfy,
      createSessionId
    }));
  }
  registry.register(new UnavailablePeerDiscoveryAdapter("local-peer-to-peer", { state: "unsupported", reason: "This runtime does not implement LP2PRequest/LP2PReceiver" }));
  const backend = new CryptoPeerPairingBackend({
    identity: {
      publicKey: identity.getPublicKey(),
      async sign(payload) { return identity.sign(payload); },
      async verify(publicKey, payload, signature) {
        const remote = Identity.fromPublicKey(provider, publicKey);
        return remote !== null && remote.validate(signature, payload);
      }
    },
    displayLabel: `TwistedPear ${bytesToHex(identity.hash).slice(0, 8)}`,
    capabilities: ["reticulum"],
    entropy: async (length) => provider.randomBytes(length),
    candidates: async (request) => {
      const destination = await ensurePeerLinkDestination(identity, request.service);
      await destination.announce();
      return [{ kind: "reticulum", value: destination.hash }];
    },
    confirm: (peer, request) => peerChrome.confirm(peer, request),
    async establish(context, peer, adapter) {
      const node = await ensureReticulum();
      const candidate = context.remoteInvitation.candidates.find((entry) => entry.kind === "reticulum");
      const remoteIdentity = Identity.fromPublicKey(provider, context.remoteInvitation.identityProof);
      if (candidate === undefined || remoteIdentity === null) throw new Error("Authenticated Reticulum candidate is missing");
      const aspect = bytesToHex(provider.sha256(new TextEncoder().encode(context.remoteInvitation.service)).subarray(0, 16));
      const outbound = node.registerDestination({ provider, identity: remoteIdentity, direction: DestinationDirection.OUT, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", aspect] });
      if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) throw new Error("Reticulum candidate does not match the signed peer identity and service");
      if (!node.hasPath(outbound.hash)) { node.requestPath(outbound.hash); if (!await node.awaitPath(outbound.hash, 15)) throw new Error("No Reticulum path to the confirmed peer"); }
      const link = await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Reticulum peer link timed out")), 30_000);
        outbound.requestLink({ linkEstablished(established) { clearTimeout(timer); resolve(established); }, linkClosed() { clearTimeout(timer); reject(new Error("Reticulum peer link closed during establishment")); } });
      });
      peerLinks.set(peer.fingerprint, link);
      const routeListeners = new Set();
      const routePending = [];
      const existingPacket = link.callbacks.packet;
      link.callbacks.packet = (data, packet) => {
        if (routeListeners.size === 0) {
          routePending.push(data.slice());
          if (routePending.length > 16) routePending.shift();
        } else {
          for (const listener of routeListeners) listener(data.slice());
        }
        existingPacket?.(data, packet);
      };
      return {
        authenticated: true,
        confirmed: true,
        fingerprint: peer.fingerprint,
        displayLabel: peer.displayLabel,
        rendezvous: adapter.kind,
        dataPlane: peer.dataPlane,
        route: { async send(payload) { await link.send(payload); }, subscribe(listener) { routeListeners.add(listener); for (const pending of routePending.splice(0)) listener(pending); return () => routeListeners.delete(listener); }, quality() { return { goodputBps: link.attachedInterface?.bitrate ?? 2_000_000, rttMs: (link.rtt ?? 0) * 1_000, mtu: link.mtu, queueDepthBytes: outboundBandwidthLimiter.queueDepthBytes() }; } },
        async close() { peerLinks.delete(peer.fingerprint); await link.teardown(); }
      };
    }
  });
  peerSessionManager = new PeerSessionManager(registry, new InvitationPairingDriver({ backend }));
  return peerSessionManager;
}

const peerSessionManagerProxy = {
  async request(appId, runtimeId, request) { return (await ensurePeerSessionManager()).request(appId, runtimeId, request); },
  async listen(appId, runtimeId, request) { return (await ensurePeerSessionManager()).listen(appId, runtimeId, request); },
  async diagnostics() { return (await ensurePeerSessionManager()).diagnostics(); },
  list(appId) { return peerSessionManager?.list(appId) ?? []; },
  route(appId, handle) { return peerSessionManager?.route(appId, handle); },
  info(appId, runtimeId, handle) {
    if (peerSessionManager === null) throw new Error("Unknown peer handle");
    return peerSessionManager.info(appId, runtimeId, handle);
  },
  async close(appId, runtimeId, handle) {
    if (peerSessionManager !== null) await peerSessionManager.close(appId, runtimeId, handle);
  },
  async closeRuntime(appId, runtimeId) {
    if (peerSessionManager !== null) await peerSessionManager.closeRuntime(appId, runtimeId);
  }
};

const transportAnnounceService = createMiniappAnnounceService({
  provider,
  bytesToHex,
  DestinationDirection,
  DestinationType,
  getNode: () => ensureReticulum(),
  getIdentity: () => resolveIdentity(),
  requireIdentity: true,
  copyAppData: false
});

function ensureMiniappHost() {
  if (miniappHost === null) {
    const relayService = createWorkletFlagRelayService({
      initialMode: status.transportEnabled ? "transport-node" : "off",
      getFlags: () => ({
        tcpEnabled: status.tcpEnabled,
        autoEnabled: status.autoEnabled,
        bleEnabled: status.bleEnabled,
        rnodeEnabled: status.rnodeEnabled,
        tcpOnline: tcpIface?.online === true,
        autoOnline: autoIface?.online === true || status.autoPeers > 0,
        bleOnline: status.bleConnected === true,
        rnodeOnline: status.rnodeConnected === true
      }),
      setFlags(patch) {
        if (patch.tcpEnabled !== undefined) status.tcpEnabled = patch.tcpEnabled;
        if (patch.autoEnabled !== undefined) status.autoEnabled = patch.autoEnabled;
        if (patch.bleEnabled !== undefined) status.bleEnabled = patch.bleEnabled;
        if (patch.rnodeEnabled !== undefined) status.rnodeEnabled = patch.rnodeEnabled;
      },
      applyInterfaceConfig,
      setTcpTarget(host, port) {
        pendingTarget = { targetHost: host, targetPort: port };
      },
      setRnodeOptions(options) {
        if (typeof options.deviceId === "string") pendingRnodeDeviceId = options.deviceId;
        if (typeof options.portPath === "string") pendingRnodePortPath = options.portPath;
        if (typeof options.baudRate === "number") pendingRnodeBaudRate = options.baudRate;
      }
    });
    miniappHost = createWorkletMiniappHost({
      provider,
      kvStore: runtimeKeyValueStore(),
      beeStoragePath: hostDataPath("miniapp-bee-store"),
      ...(NodeWorkerSandboxBackend === null
        ? {}
        : { createSandboxBackend: () => new NodeWorkerSandboxBackend(), sandboxBackend: "node-worker" }),
      getPresenceSnapshot: () => ({ ...status, autoPeers: status.autoPeers + (peerSessionManager?.routes.list().length ?? 0) }),
      getHostInfoSnapshot: () => {
        const interfaceTypes = [];
        if (status.tcpEnabled) interfaceTypes.push("tcp");
        if (status.autoEnabled) interfaceTypes.push("auto");
        if (status.bleEnabled) interfaceTypes.push("ble");
        if (status.rnodeEnabled) interfaceTypes.push("rnode");
        if (
          (status.freenetEnabled && status.freenetConfigured) ||
          status.freenetInterfaceEnabled
        ) {
          interfaceTypes.push("freenet");
        }
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
      peerSessionManager: peerSessionManagerProxy,
      realtimeReservations: { reserveRealtime: (bytesPerSecond) => outboundBandwidthLimiter.reserve("realtime", bytesPerSecond) },
      controlReservations: { reserveControl: (bytesPerSecond) => outboundBandwidthLimiter.reserve("control", bytesPerSecond) },
      onInboundMediaFrame(appId, stream, frame, offer) { send({ type: "inbound-media-frame", appId, handle: stream.handle, sink: stream.sink, encoding: offer.encoding, dataHex: bytesToHex(frame) }); },
      async openMediaCodec(configuration) {
        const transact = async (op, sample) => {
          const token = generateConfirmationToken((length) => provider.randomBytes(length));
          const reply = await requestRendererReply({ type: "media-codec-request", token, op, configuration, captureAtUs: sample.captureAtUs, dataHex: bytesToHex(sample.bytes) }, 15_000);
          if (reply?.error !== undefined || typeof reply?.dataHex !== "string") throw new Error(reply?.error ?? "Desktop media codec request timed out.");
          return { captureAtUs: sample.captureAtUs, bytes: hexToBytes(reply.dataHex), ...(op === "encode" ? { codec: configuration.codec } : {}) };
        };
        return { implementation: "webcodecs", supports(candidate) { return candidate.sampleKind === "audio" && (candidate.codec === "opus" || candidate.codec === "pcm"); }, encode(_candidate, sample) { return transact("encode", sample); }, decode(_candidate, sample) { return transact("decode", sample); }, async close() {} };
      },
      async requestShareOffer({ appId, purpose }) {
        const peer = peerSessionManagerProxy.list(appId)[0];
        if (peer === undefined) return null;
        const token = generateConfirmationToken((length) => provider.randomBytes(length));
        const reply = await requestRendererReply({ type: "confirm-request", token, kind: "device-share-offer", appId, publisherPublicKey: "host-authenticated-peer", summary: { purpose, peer: peer.displayLabel, class: "microphone", tier: "pcm", quality: "16k-opus", duration: "15 minutes" } });
        return reply?.approved === true ? { targetKind: "peer", targetId: peer.handle.id, displayLabel: peer.displayLabel, classId: "microphone", tierId: "pcm", maxRung: "16k-opus", ttlMs: 15 * 60_000 } : null;
      },
      async confirmShareOfferRevoke(offer) {
        const token = generateConfirmationToken((length) => provider.randomBytes(length));
        const reply = await requestRendererReply({ type: "confirm-request", token, kind: "device-share-revoke", appId: offer.appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: offer.displayLabel, class: offer.classId } });
        return reply?.approved === true;
      },
      async confirmCostlyLinkProbe({ appId, peer, budgetBytes }) {
        const token = generateConfirmationToken((length) => provider.randomBytes(length));
        const reply = await requestRendererReply({ type: "confirm-request", token, kind: "link-probe", appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: peer.displayLabel, budgetBytes } });
        return reply?.approved === true;
      },
      relayService,
      freenetBackend: freenetBackendProxy,
      announceService: transportAnnounceService,
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
      async requestDeviceBridge(request) {
        const token = generateConfirmationToken((length) => provider.randomBytes(length));
        const reply = await requestRendererReply({
          type: "device-bridge-request",
          token,
          op: request.op,
          classId: request.classId,
          options: request.options ?? {}
        }, 30_000);
        if (reply === null) {
          throw new Error("Device bridge request timed out");
        }
        if (reply.error) {
          throw new Error(String(reply.error));
        }
        return reply.result;
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
      runtimeStoreKeys.add(key);
      await runtime.store.set(key, value);
    },
    async delete(key) {
      runtimeStoreKeys.delete(key);
      await runtime.store.delete(key);
    },
    async list(prefix) {
      return [...runtimeStoreKeys].filter((key) => key.startsWith(prefix));
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

const BUNDLED_SEEDED_KEY = "bundled-catalog:v1-seeded";

async function seedBundledCatalogIfNeeded() {
  if (bundledCatalogModule === null) {
    return;
  }

  const kv = runtimeKeyValueStore();
  if ((await kv.get(BUNDLED_SEEDED_KEY)) !== null) {
    return;
  }

  const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
  if (catalog.list().length > 0 || installed.list().length > 0) {
    return;
  }

  const platformIdentity = Identity.fromBytes(
    provider,
    hexToBytes(bundledCatalogModule.TWISTEDPEAR_PLATFORM_PUBLISHER.privateKeyHex)
  );
  if (platformIdentity === null) {
    log("Bundled catalog: invalid platform publisher identity");
    return;
  }

  const publisher = bundledCatalogModule.TWISTEDPEAR_PLATFORM_PUBLISHER;
  const alreadyTrusted = await ensureTrustStore().isTrusted(publisher.publisherPublicKey);
  if (!alreadyTrusted) {
    await ensureTrustStore().add({
      publisherPublicKey: publisher.publisherPublicKey,
      label: publisher.label,
      addedAt: Date.now()
    });
  }

  const cas = ensureEntryCasStore();
  for (const bundled of bundledCatalogModule.BUNDLED_APPS) {
    const archive = hexToBytes(bundled.archiveHex);
    await cas.put(archive);
    const unpacked = unpackPackage(provider, archive);
    const verified = verifyPackage(provider, archive, { hostApiVersion: HOST_API_VERSION });
    const summary = buildAppAnnounceSummary(provider, platformIdentity, {
      manifest: verified.manifest,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true
    });
    catalog.ingest({
      destinationHash: `bundled:${bundled.appId}`,
      appData: encodeAppAnnounceData(summary),
      manifest: verified.manifest,
      packageHash: unpacked.packageHash
    });
    const archivePath = `packages/${bundled.appId}/${verified.manifest.version}.tpkg`;
    await runtime.store.set(archivePath, archive);
    installed.install(
      {
        appId: bundled.appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath
      },
      archive.length
    );
    log(`Bundled seed: installed ${bundled.appId} v${verified.manifest.version}`);
  }

  await kv.set(BUNDLED_SEEDED_KEY, new TextEncoder().encode("1"));
  await persistCatalogState();
  pushCatalog();
  await pushTrustList();

  try {
    await ensureReticulum();
    for (const bundled of bundledCatalogModule.BUNDLED_APPS) {
      const archive = hexToBytes(bundled.archiveHex);
      await publishArchiveAsIdentity(platformIdentity, { t256: bundled.t256, archive });
    }
    log("Bundled catalog: platform announces published");
  } catch (error) {
    log(
      `Bundled catalog: local seed ok; announce deferred (${error instanceof Error ? error.message : String(error)})`
    );
  }
}

async function ensurePackageDriveManager() {
  if (packageDriveManager === null) {
    const { createSwarm, DriveManager } = await import("../../../packages/bridge-hyper/dist/worklet-hyper.js");
    packageSwarm = createSwarm({ inboundBandwidthLimiter, outboundBandwidthLimiter });
    packageDriveManager = new DriveManager({
      storagePath: hostDataPath("hyper-storage"),
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
        now: () => Date.now(),
        schedule: (ms, callback) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
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

const statusTimer = createStatusTimer({ onTick: () => pushStatus() });
const startStatusTimer = statusTimer.start;
const stopStatusTimer = statusTimer.stop;

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

  if (isEncryptedIdentityBackup(stored)) {
    send({ type: "identity-locked", legacy: false, creating: false });
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

  legacyIdentity = identity;
  send({ type: "identity-locked", legacy: true, creating: false });
  return null;
}

async function persistIdentity(identity, passphrase) {
  const encrypted = encryptIdentityBackup(provider, identity, passphrase);
  await runtime.store.set(IDENTITY_STORE_KEY, encrypted);
  encrypted.fill(0);
  updateIdentityStatus(identity);
}

async function createIdentity(passphrase) {
  const identity = new Identity(provider);
  await persistIdentity(identity, passphrase);
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

async function stopFreenetInterface() {
  if (freenetIface !== null) {
    if (reticulum !== null) {
      reticulum.unregisterInterface(freenetIface);
    }
    await freenetIface.close().catch(() => {});
    freenetIface = null;
  }
  status.freenetInterfaceOnline = false;
}

async function loadPacketLogWasm() {
  if (packetLogWasmCache !== null) {
    return packetLogWasmCache;
  }
  packetLogWasmCache = Uint8Array.from(Buffer.from(PACKET_LOG_WASM_BASE64, "base64"));
  return packetLogWasmCache;
}

async function startFreenetInterface() {
  const url = status.freenetUrl;
  const rendezvousHex = status.freenetRendezvousHex;
  if (url === null || url.length === 0) {
    log("Freenet HDLC interface requires a WebSocket URL");
    status.freenetInterfaceEnabled = false;
    pushStatus();
    return;
  }
  if (typeof rendezvousHex !== "string" || !/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
    log("Freenet HDLC interface requires a 64-character hex rendezvous");
    status.freenetInterfaceEnabled = false;
    pushStatus();
    return;
  }

  const node = await ensureReticulum();
  if (freenetIface !== null) {
    status.freenetInterfaceOnline = freenetIface.online === true;
    pushStatus();
    return;
  }

  try {
    const wasm = await loadPacketLogWasm();
    const backend = new FreenetContractPacketLogBackend({
      clientOptions: {
        url,
        ...(pendingFreenetAuthToken === null ? {} : { authToken: pendingFreenetAuthToken })
      },
      wasm,
      rendezvous: hexToBytes(rendezvousHex),
      localDirection: pendingFreenetLocalDirection,
      updateOptions: { fallbackCodeField: wasm }
    });
    freenetIface = await FreenetInterface.open(provider, {
      name: "host-freenet",
      provider,
      backend
    });
    node.registerInterface(freenetIface);
    status.freenetInterfaceOnline = freenetIface.online === true;
    log(
      status.freenetInterfaceOnline
        ? "Freenet HDLC interface online"
        : "Freenet HDLC interface started; waiting for Freenet node"
    );
  } catch (error) {
    freenetIface = null;
    status.freenetInterfaceOnline = false;
    status.freenetInterfaceEnabled = false;
    log(`Freenet HDLC interface failed: ${error instanceof Error ? error.message : String(error)}`);
  }
  pushStatus();
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
  await stopFreenetInterface();

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
  await stopFreenetInterface();
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

  send({ type: "identity-locked", legacy: false, creating: true });
  return null;
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
        void respondToCasLocatorRequest(info.appData).catch((error) => {
          log(`CAS locator response failed: ${error instanceof Error ? error.message : String(error)}`);
        });
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
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
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
  if (tcpIface === null) {
    log(`Starting TCP client to ${targetHost}:${targetPort}`);
    tcpIface = await node.addTcpClientInterface({
      name: "harness-tcp",
      targetHost,
      targetPort
    });
  }

  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    status.linkOnline = tcpIface.online;
    pushStatus();
    if (tcpIface.online) {
      log("TCP interface online");
      return true;
    }

    await sleep(250);
  }

  log("Timed out waiting for TCP interface (peer may be unreachable)");
  return false;
}

async function joinCommunityNetwork() {
  status.tcpEnabled = true;
  pushStatus();
  log(RETICULUM_COMMUNITY_NETWORK.privacyNotice);
  for (const endpoint of RETICULUM_COMMUNITY_NETWORK.endpoints) {
    await stopTcpInterface();
    pendingTarget = { targetHost: endpoint.host, targetPort: endpoint.port };
    log(`Trying ${endpoint.label}`);
    if (await startTcpInterface(endpoint.host, endpoint.port)) {
      log(`Joined ${RETICULUM_COMMUNITY_NETWORK.label} through ${endpoint.label}`);
      return;
    }
  }
  log("Community bootstrap unavailable; try again later or configure your own TCP peer");
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
  serialBridge = createIpcSerialBridge({
    portPath: pendingRnodePortPath,
    baudRate: pendingRnodeBaudRate
  });
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

  if (
    !status.tcpEnabled &&
    !status.autoEnabled &&
    !status.bleEnabled &&
    !status.rnodeEnabled &&
    !status.freenetInterfaceEnabled
  ) {
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

  if (status.freenetInterfaceEnabled) {
    await startFreenetInterface();
  } else {
    await stopFreenetInterface();
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

  if (message.type === "connect-test-agent") {
    if (testAgent !== null) {
      log("Test agent already mounted");
      return;
    }
    try {
      let identity = await resolveIdentity();
      // The Electron main process sends the isolated test identity unlock and
      // agent mount back-to-back. Host messages are handled concurrently, so
      // allow the unlock operation to finish without granting normal launches
      // any implicit identity access.
      for (let attempt = 0; identity === null && attempt < 100; attempt += 1) {
        await sleep(100);
        identity = await resolveIdentity();
      }
      if (identity === null) {
        throw new Error("identity unavailable");
      }
      const node = await ensureReticulum();
      // The test-agent attachment is also the readiness boundary used by the
      // multi-peer harness. Interface messages arrive concurrently over IPC,
      // so make the requested hub connection explicit here before advertising
      // this peer as ready.
      if (pendingTarget !== null) {
        status.tcpEnabled = true;
        await startTcpInterface(pendingTarget.targetHost, pendingTarget.targetPort);
      }
      testAgent = await connectTestAgent({
        reticulum: node,
        provider,
        identity,
        label: message.label,
        platform: "desktop",
        host: message.host,
        port: message.port,
        log,
        handleCommand: (request) => ensureCrossDeviceTestDriver()(request)
      });
      log(`Test agent mounted as ${message.label} (lxmf ${testAgent.lxmfAddress})`);
    } catch (error) {
      log(`Test agent mount failed: ${error instanceof Error ? error.message : String(error)}`);
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
    send({ type: "identity-locked", legacy: false, creating: true });
    return;
  }

  if (message.type === "identity-unlock") {
    try {
      const stored = await runtime.store.get(IDENTITY_STORE_KEY);
      if (stored === undefined) {
        validateNewIdentityPassphrase(message.passphrase, message.confirmation ?? "");
        await createIdentity(message.passphrase);
      } else if (legacyIdentity !== null) {
        validateNewIdentityPassphrase(message.passphrase, message.confirmation ?? "");
        await persistIdentity(legacyIdentity, message.passphrase);
        activeIdentity = legacyIdentity;
        legacyIdentity = null;
      } else {
        updateIdentityStatus(decryptIdentityBackup(provider, stored, message.passphrase));
      }
      send({ type: "identity-operation", operation: "unlock", ok: true, identityHash: status.identityHash });
      if (pendingTarget !== null) await applyInterfaceConfig();
    } catch (error) {
      send({ type: "identity-operation", operation: "unlock", ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (message.type === "identity-export" || message.type === "identity-recovery-show" ||
      message.type === "identity-import-inspect" || message.type === "identity-import" ||
      message.type === "identity-recovery-import-inspect" || message.type === "identity-recovery-import" ||
      message.type === "identity-change-passphrase") {
    try {
      const stored = await runtime.store.get(IDENTITY_STORE_KEY);
      if (stored === undefined) throw new Error("No identity exists");
      if (message.type === "identity-export") {
        const identity = decryptIdentityBackup(provider, stored, message.currentPassphrase);
        validateNewIdentityPassphrase(message.backupPassphrase, message.backupPassphraseConfirmation);
        const backup = encryptIdentityBackup(provider, identity, message.backupPassphrase);
        send({ type: "identity-operation", operation: "export", ok: true, identityHash: bytesToHex(identity.hash), backupHex: bytesToHex(backup) });
        backup.fill(0);
      } else if (message.type === "identity-recovery-show") {
        const identity = decryptIdentityBackup(provider, stored, message.currentPassphrase);
        const recovery = identityToRecoveryWords(identity);
        send({ type: "identity-operation", operation: "recovery-show", ok: true, identityHash: bytesToHex(identity.hash), ...recovery });
      } else if (message.type === "identity-import-inspect") {
        const identity = decryptIdentityBackup(provider, hexToBytes(message.backupHex), message.backupPassphrase);
        send({ type: "identity-operation", operation: "import-inspect", ok: true, candidateIdentityHash: bytesToHex(identity.hash) });
      } else if (message.type === "identity-import") {
        const identity = decryptIdentityBackup(provider, hexToBytes(message.backupHex), message.backupPassphrase);
        const candidateIdentityHash = bytesToHex(identity.hash);
        if (message.confirmedCandidateHash !== candidateIdentityHash) throw new Error("Identity replacement was not confirmed");
        validateNewIdentityPassphrase(message.vaultPassphrase, message.vaultPassphraseConfirmation);
        await persistIdentity(identity, message.vaultPassphrase);
        send({ type: "identity-operation", operation: "import", ok: true, identityHash: bytesToHex(identity.hash) });
      } else if (message.type === "identity-recovery-import-inspect") {
        const identity = identityFromRecoveryWords(provider, { first: message.first, second: message.second });
        send({ type: "identity-operation", operation: "recovery-import-inspect", ok: true, candidateIdentityHash: bytesToHex(identity.hash) });
      } else if (message.type === "identity-recovery-import") {
        const identity = identityFromRecoveryWords(provider, { first: message.first, second: message.second });
        const candidateIdentityHash = bytesToHex(identity.hash);
        if (message.confirmedCandidateHash !== candidateIdentityHash) throw new Error("Identity replacement was not confirmed");
        validateNewIdentityPassphrase(message.vaultPassphrase, message.vaultPassphraseConfirmation);
        await persistIdentity(identity, message.vaultPassphrase);
        send({ type: "identity-operation", operation: "recovery-import", ok: true, identityHash: bytesToHex(identity.hash) });
      } else {
        const identity = decryptIdentityBackup(provider, stored, message.currentPassphrase);
        validateNewIdentityPassphrase(message.nextPassphrase, message.nextPassphraseConfirmation);
        await persistIdentity(identity, message.nextPassphrase);
        send({ type: "identity-operation", operation: "change-passphrase", ok: true, identityHash: bytesToHex(identity.hash) });
      }
    } catch (error) {
      send({ type: "identity-operation", operation: message.type, ok: false, error: error instanceof Error ? error.message : String(error) });
    }
    return;
  }

  if (message.type === "moderation-list") {
    pushModerationState();
    return;
  }

  if (message.type === "device-list") {
    try {
      await ensureMiniappHost().pushDeviceState();
    } catch (error) {
      log(`Device list failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "device-set-class-disabled") {
    try {
      await ensureMiniappHost().setDeviceClassDisabled(message.classId, message.disabled === true);
    } catch (error) {
      log(`Device policy update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "device-set-remote") {
    try {
      await ensureMiniappHost().setRemoteAcquisitionEnabled(message.enabled === true);
    } catch (error) {
      log(`Remote acquisition update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "device-kill-session") {
    try {
      await ensureMiniappHost().forceCloseDeviceSession(message.handle);
    } catch (error) {
      log(`Device session kill failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "device-revoke-share") {
    await ensureMiniappHost().revokeShareOffer(message.appId, message.id);
    return;
  }

  if (message.type.startsWith("moderation-")) {
    try {
      if (message.type === "moderation-export-reports") {
        send({ type: "moderation-report-export", json: `${JSON.stringify({ format: "twistedpear-local-reports-v1", exportedAt: Date.now(), reports: moderationState.reports }, null, 2)}\n` });
        return;
      }
      const sourceHash = normalizedSourceHash(message.sourceHash);
      if (message.type === "moderation-block") {
        const existing = moderationState.blocked.find((entry) => entry.sourceHash === sourceHash);
        moderationState.blocked = [...moderationState.blocked.filter((entry) => entry.sourceHash !== sourceHash), { sourceHash, label: message.label?.trim() || null, createdAt: existing?.createdAt ?? Date.now() }];
        moderationState.muted = moderationState.muted.filter((entry) => entry.sourceHash !== sourceHash);
      } else if (message.type === "moderation-unblock") {
        moderationState.blocked = moderationState.blocked.filter((entry) => entry.sourceHash !== sourceHash);
      } else if (message.type === "moderation-mute") {
        if (!moderationState.blocked.some((entry) => entry.sourceHash === sourceHash)) {
          const existing = moderationState.muted.find((entry) => entry.sourceHash === sourceHash);
          moderationState.muted = [...moderationState.muted.filter((entry) => entry.sourceHash !== sourceHash), { sourceHash, label: message.label?.trim() || null, createdAt: existing?.createdAt ?? Date.now() }];
        }
      } else if (message.type === "moderation-unmute") {
        moderationState.muted = moderationState.muted.filter((entry) => entry.sourceHash !== sourceHash);
      } else if (message.type === "moderation-report") {
        moderationState.reports = [...moderationState.reports, {
          id: `${Date.now().toString(36)}-${moderationState.reports.length.toString(36)}`,
          sourceHash,
          reason: message.reason,
          note: String(message.note ?? "").slice(0, 4096),
          messageHash: message.messageHash?.trim().toLowerCase() || null,
          createdAt: Date.now()
        }];
      }
      await persistModerationState();
      pushModerationState();
    } catch (error) {
      log(`Moderation update failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  if (message.type === "confirm-response" || message.type === "launch-confirm" || message.type === "install-confirm" || message.type === "peer-chrome-response" || message.type === "device-bridge-response" || message.type === "media-codec-response") {
    hostReplyChannel.resolveReply(message);
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

  if (message.type === "set-freenet-config") {
    const enabled = message.enabled === true;
    const interfaceEnabled = message.interfaceEnabled === true;
    const url = typeof message.url === "string" && message.url.length > 0 ? message.url : null;
    const authToken =
      typeof message.authToken === "string" && message.authToken.length > 0
        ? message.authToken
        : undefined;
    const rendezvousHex =
      typeof message.rendezvousHex === "string" && message.rendezvousHex.length > 0
        ? message.rendezvousHex
        : null;
    const localDirection = message.localDirection === 1 ? 1 : 0;
    status.freenetEnabled = enabled;
    status.freenetInterfaceEnabled = interfaceEnabled;
    status.freenetUrl = url;
    status.freenetRendezvousHex = rendezvousHex;
    pendingFreenetAuthToken = authToken ?? null;
    pendingFreenetLocalDirection = localDirection;
    if (freenetBackendImpl !== null) {
      await freenetBackendImpl.close().catch(() => {});
      freenetBackendImpl = null;
    }
    if (enabled && url !== null) {
      freenetBackendImpl = new FreenetClientContractBackend({
        clientOptions: {
          url,
          ...(authToken === undefined ? {} : { authToken })
        }
      });
      status.freenetConfigured = true;
    } else {
      status.freenetConfigured = false;
    }
    pushStatus();
    await applyInterfaceConfig();
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

  if (message.type === "join-community-network") {
    await joinCommunityNetwork();
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

void loadPersistedIdentity().then(() =>
  loadCatalogState().then(() => seedBundledCatalogIfNeeded()).then(pushCatalog)
);
void loadModerationState();
pushStatus();
log(`Desktop host worklet ready (crypto: ${provider.name})`);

let hostMessageBuffer = "";
let hostMessageQueue = Promise.resolve();
IPC.on("data", (data) => {
  hostMessageBuffer += data.toString();
  const lines = hostMessageBuffer.split("\n");
  hostMessageBuffer = lines.pop() ?? "";
  for (const line of lines) {
    hostMessageQueue = hostMessageQueue
      .then(() => handleHostMessage(line))
      .catch((error) => {
        log(`Worklet error: ${error instanceof Error ? error.message : String(error)}`);
        pushStatus();
      });
  }
});
