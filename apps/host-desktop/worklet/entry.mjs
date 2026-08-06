/**
 * Desktop host Bare worklet entry (stdio IPC, transport role enabled by default).
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/destination.js";
import { BandwidthLimiter } from "../../../packages/reticulum-ts/dist/transport/bandwidth.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import { createIdentityOps } from "./identity-ops.mjs";
import { createNodeLifecycleOps } from "./node-lifecycle.mjs";
import {
  createCryptoProvider,
  envValue,
  hostDataPath,
  refuseStorePosture,
  shouldRefuseDeveloperMode,
} from "./host-environment.mjs";
import { createModerationOps, normalizedSourceHash } from "./moderation.mjs";
import {
  createAutoInterfaceOps,
  createAutomaticReticulumDiscovery,
  createCasLocatorOps,
  createCatalogOps,
  createDevChannelClient,
  createEnsureDevChannel,
  createHostReplyChannel,
  createInstallFromT256,
  createPublishArchiveOps,
  createQuiesceInterfaces,
  createRegisterAnnounceHandler,
  createDropCensus,
  createRuntimeKeyValueStore,
  createStatusTimer,
  createTrustStoreOps,
  createWorkletPropagationPersistenceOps,
} from "../../../packages/worklet-core/src/index.mjs";
import { IPC } from "./ipc-stdio.mjs";
import { createPushStatus } from "./entry-status.mjs";
import { attachHostIpc } from "./entry-host-ipc.mjs";
import { createDesktopHostMessagePlane } from "./entry-message-plane.mjs";

const NODE_FALLBACK =
  globalThis.process?.env?.TWISTEDPEAR_WORKLET_NODE_FALLBACK === "1";
if (!NODE_FALLBACK) {
  const { installBareWebSocketGlobal } =
    await import("../../../conformance/freenet-spike/bare-websocket-shim.mjs");
  installBareWebSocketGlobal();
}

const HOST_BANDWIDTH_BYTES_PER_SECOND = 512 * 1024;

let bundledCatalogModule = null;
try {
  bundledCatalogModule = await import("./bundled-catalog.generated.mjs");
} catch {
  // Generated during worklet build; absent in partial checkouts until build-worklet runs.
}

const IS_DESKTOP_HOST = true;

/** Mutable worklet state shared with the extracted desktop host modules. */
const state = {
  reticulum: null,
  activeIdentity: null,
  legacyIdentity: null,
  pendingTarget: null,
  tcpIface: null,
  autoIface: null,
  multicastBridge: null,
  bonjourBridge: null,
  bonjourDiscoveryEnabled: true,
  multicastEntitled: true,
  nodeSuspended: false,
  bleBridge: null,
  bleIface: null,
  serialBridge: null,
  rnodeIface: null,
  pendingRnodeDeviceId: null,
  pendingRnodePortPath: null,
  pendingRnodeBaudRate: 115_200,
  packageDriveManager: null,
  packageSwarm: null,
  propagationServer: null,
  propagationDestination: null,
  propagationStoreCache: null,
  freenetIface: null,
  freenetBackendImpl: null,
  pendingFreenetAuthToken: null,
  pendingFreenetLocalDirection: 0,
  packetLogWasmCache: null,
  miniappHost: null,
  hostLxmfDelivery: null,
  peerSessionManager: null,
  attachWebRtcMediaTrack: null,
  moderationState: { version: 1, blocked: [], muted: [], reports: [] },
  testAgent: null,
  crossDeviceTestDriver: null,
  relayService: null,
  relayBridge: null,
  relayPolicy: {},
};

const provider = await createCryptoProvider(IS_DESKTOP_HOST);
const runtime = NODE_FALLBACK
  ? (
      await import("../../../packages/reticulum-ts/dist/runtime/node/runtime.js")
    ).nodeRuntime()
  : bareRuntime({ storePath: hostDataPath("host-desktop-store") });
const inboundBandwidthLimiter = new BandwidthLimiter(
  runtime.clock,
  HOST_BANDWIDTH_BYTES_PER_SECOND,
);
const outboundBandwidthLimiter = new BandwidthLimiter(
  runtime.clock,
  HOST_BANDWIDTH_BYTES_PER_SECOND,
);
const IDENTITY_STORE_KEY = "host-identity";
const MODERATION_STORE_KEY = "host-moderation-v1";

function send(message) {
  IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

function log(line) {
  send({ type: "log", line });
}

const NodeWorkerSandboxBackend = NODE_FALLBACK
  ? (
      await import("../../../packages/miniapp-runtime/dist/sandbox/node-worker.js")
    ).NodeWorkerSandboxBackend
  : null;

/** @type {import("./protocol.ts").WorkletStatus} */
const status = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  dropCensus: { byReason: {}, byPeer: {} },
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
  transportEnabled: false,
  relayMode: "off",
  relayDirections: {
    tcp: "both",
    auto: "both",
    bluetooth: "both",
    rnode: "both",
  },
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
  miniappRunning: false,
};

const pushStatus = createPushStatus({ state, status, send });

const { persistModerationState, pushModerationState, loadModerationState } =
  createModerationOps({
    state,
    runtime,
    send,
    moderationStoreKey: MODERATION_STORE_KEY,
  });

const PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;
const PROPAGATION_STORE_KEY = "propagation-store";

const freenetBackendProxy = {
  async get(keyHex) {
    if (state.freenetBackendImpl === null) {
      throw new Error(
        "Freenet is not configured on this host (enable it in Settings)",
      );
    }
    return state.freenetBackendImpl.get(keyHex);
  },
  async put(options) {
    if (state.freenetBackendImpl === null) {
      throw new Error(
        "Freenet is not configured on this host (enable it in Settings)",
      );
    }
    return state.freenetBackendImpl.put(options);
  },
  async update(options) {
    if (state.freenetBackendImpl === null) {
      throw new Error(
        "Freenet is not configured on this host (enable it in Settings)",
      );
    }
    return state.freenetBackendImpl.update(options);
  },
};
/** @type {Map<string, string>} fingerprint → WebRTC sessionId */
const webRtcSessionByFingerprint = new Map();
/** @type {Map<string, Set<(payload: Uint8Array) => void>>} */
const webRtcRouteListeners = new Map();
/** @type {Map<string, Uint8Array[]>} */
const webRtcRoutePending = new Map();
const peerLinkDestinations = new Map();
const peerLinks = new Map();
const automaticDiscoveryDestinations = new Map();
const automaticDiscoveryHandlers = new Set();
const automaticInboundBuckets = new Map();
const automaticInboundWaiters = new Map();
const automaticInboundRoutes = new Map();
const automaticAnswerWaiters = new Map();
const automaticOfferKeys = new Map();

/** @type {Map<string, import("../../../packages/cas-256t/dist/index.js").CasLocator>} */
const casLocators = new Map();
const casRequestDestinations = new Map();
const casResponseDestinations = new Map();
const runtimeStoreKeys = new Set();

const hostReplyChannel = createHostReplyChannel({ send });
const requestRendererReply = hostReplyChannel.requestReply;

function runtimeKeyValueStore() {
  return createRuntimeKeyValueStore(runtime, runtimeStoreKeys);
}

const statusTimer = createStatusTimer({ onTick: () => pushStatus() });
const startStatusTimer = statusTimer.start;
const stopStatusTimer = statusTimer.stop;

const {
  updateIdentityStatus,
  loadPersistedIdentity,
  persistIdentity,
  createIdentity,
  resetIdentity,
  resolveIdentity,
} = createIdentityOps({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  identityStoreKey: IDENTITY_STORE_KEY,
});

const {
  ensureEntryCasStore,
  ingestCasLocator,
  respondToCasLocatorRequest,
  waitForCasLocator,
} = createCasLocatorOps({
  provider,
  DestinationDirection,
  DestinationType,
  runtimeKeyValueStore,
  casLocators,
  casRequestDestinations,
  casResponseDestinations,
  getReticulum: () => state.reticulum,
  ensureReticulum: (...args) => ensureReticulum(...args),
  resolveIdentity,
  log,
  logReannounce: (t256) =>
    log(`Re-announced CAS locator for ${t256.slice(0, 16)}…`),
});

const { ensureTrustStore, pushTrustList } = createTrustStoreOps({
  runtimeKeyValueStore,
  send,
});

const { ensureCatalog, persistCatalogState, loadCatalogState, pushCatalog } =
  createCatalogOps({
    provider,
    packageQuotaBytes: PACKAGE_QUOTA_BYTES,
    runtimeKeyValueStore,
    status,
    pushStatus,
    send,
  });

const { ensurePeerLinkDestination, automaticReticulumChannel } =
  createAutomaticReticulumDiscovery({
    provider,
    DestinationDirection,
    DestinationType,
    status,
    getReticulum: () => state.reticulum,
    ensureReticulum: (...args) => ensureReticulum(...args),
    peerLinkDestinations,
    automaticDiscoveryDestinations,
    automaticDiscoveryHandlers,
    automaticInboundBuckets,
    automaticInboundWaiters,
    automaticInboundRoutes,
    automaticAnswerWaiters,
    automaticOfferKeys,
  });

const {
  loadPropagationCache,
  createPersistence: createWorkletPropagationPersistence,
} = createWorkletPropagationPersistenceOps({
  runtime,
  propagationStoreKey: PROPAGATION_STORE_KEY,
  getPropagationStoreCache: () => state.propagationStoreCache,
  setPropagationStoreCache: (cache) => {
    state.propagationStoreCache = cache;
  },
});

const { publishArchiveAsIdentity, publishArchiveFromWorklet } =
  createPublishArchiveOps({
    provider,
    DestinationDirection,
    DestinationType,
    nodeFallback: NODE_FALLBACK,
    casLocators,
    casResponseDestinations,
    ensureReticulum: (...args) => ensureReticulum(...args),
    resolveIdentity,
    ensurePackageDriveManager: (...args) => ensurePackageDriveManager(...args),
    log,
  });

const installFromT256 = createInstallFromT256({
  provider,
  runtime,
  nodeFallback: NODE_FALLBACK,
  ensureEntryCasStore,
  waitForCasLocator,
  ensureReticulum: (...args) => ensureReticulum(...args),
  getReticulum: () => state.reticulum,
  resolveIdentity,
  ensurePackageDriveManager: (...args) => ensurePackageDriveManager(...args),
  ensureCatalog,
  ensureTrustStore,
  persistCatalogState,
  pushCatalog,
  ensureMiniappHost: (...args) => ensureMiniappHost(...args),
  requestHostReply: requestRendererReply,
  installLogMessage: (appId, version, source, trusted) =>
    `Installed ${appId} v${version} from 256t via ${source} (trusted: ${trusted})`,
});

const dropCensus = createDropCensus();
const registerAnnounceHandler = createRegisterAnnounceHandler({
  getReticulum: () => state.reticulum,
  status,
  pushStatus,
  send,
  ingestCasLocator,
  respondToCasLocatorRequest,
  ensureCatalog,
  persistCatalogState,
  pushCatalog,
  log,
  dropCensus,
});

const ensureDevChannel = createEnsureDevChannel({
  createDevChannelClient,
  ensureMiniappHost: (...args) => ensureMiniappHost(...args),
  send,
  log,
});

const { startAutoInterface, stopAutoInterface } = createAutoInterfaceOps({
  provider,
  runtime,
  status,
  pushStatus,
  log,
  ensureReticulum: (...args) => ensureReticulum(...args),
  getAutoIface: () => state.autoIface,
  setAutoIface: (value) => {
    state.autoIface = value;
  },
  getMulticastBridge: () => state.multicastBridge,
  setMulticastBridge: (value) => {
    state.multicastBridge = value;
  },
  getBonjourBridge: () => state.bonjourBridge,
  setBonjourBridge: (value) => {
    state.bonjourBridge = value;
  },
  getMulticastEntitled: () => state.multicastEntitled,
  getBonjourDiscoveryEnabled: () => state.bonjourDiscoveryEnabled,
  createIpcMulticastBridge,
  createIpcBonjourBridge,
});

const quiesceInterfaces = createQuiesceInterfaces({
  log,
  pushStatus,
  stopTcpInterface: (...args) => stopTcpInterface(...args),
  stopAutoInterface,
  stopBleInterface: (...args) => stopBleInterface(...args),
  stopRnodeInterface: (...args) => stopRnodeInterface(...args),
  stopFreenetInterface: (...args) => stopFreenetInterface(...args),
});

const {
  startPropagation,
  stopPropagation,
  ensureMiniappHost,
  stopBleInterface,
  stopRnodeInterface,
  stopFreenetInterface,
  startFreenetInterface,
  loadPacketLogWasm,
  stopTcpInterface,
  startTcpInterface,
  stopNode,
  resumeInterfaces,
  ensureReticulum,
  ensureHostLxmfDelivery,
  applyInterfaceConfig,
  reconnectTcpAfterNetworkChange,
} = createNodeLifecycleOps({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  isDesktopHost: IS_DESKTOP_HOST,
  inboundBandwidthLimiter,
  outboundBandwidthLimiter,
  startStatusTimer,
  stopStatusTimer,
  resolveIdentity,
  registerAnnounceHandler,
  startAutoInterface,
  stopAutoInterface,
  ensureMiniappHost: (...args) => ensureMiniappHost(...args),
  ensureCatalog,
  loadPropagationCache,
  createWorkletPropagationPersistence,
});

function refuseStoreAction(action) {
  if (refuseStorePosture()) {
    log(`${action} refused in store posture variant`);
    return true;
  }

  return false;
}

const {
  loadRelayConfig,
  persistRelayConfig,
  seedBundledCatalogIfNeeded,
  ensurePackageDriveManager,
  identityMessages,
  hostMessageHandlers,
} = createDesktopHostMessagePlane({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  freenetBackendProxy,
  hostReplyChannel,
  webRtcRouteListeners,
  webRtcRoutePending,
  refuseStoreAction,
  shouldRefuseDeveloperMode,
  identityStoreKey: IDENTITY_STORE_KEY,
  applyInterfaceConfig,
  startTcpInterface,
  stopTcpInterface,
  startAutoInterface,
  stopAutoInterface,
  startFreenetInterface,
  stopFreenetInterface,
  quiesceInterfaces,
  resumeInterfaces,
  reconnectTcpAfterNetworkChange,
  stopNode,
  startPropagation,
  stopPropagation,
  ensureReticulum,
  ensureMiniappHost,
  loadPacketLogWasm,
  createIdentity,
  persistIdentity,
  resetIdentity,
  updateIdentityStatus,
  pushModerationState,
  persistModerationState,
  normalizedSourceHash,
  ensureCatalog,
  persistCatalogState,
  pushCatalog,
  ensureTrustStore,
  pushTrustList,
  ensureEntryCasStore,
  resolveIdentity,
  installFromT256,
  ensureDevChannel,
  runtimeKeyValueStore,
  envValue,
  requestRendererReply,
  outboundBandwidthLimiter,
  webRtcSessionByFingerprint,
  peerLinks,
  ensurePeerLinkDestination,
  automaticReticulumChannel,
  hostDataPath,
  bundledCatalogModule,
  NodeWorkerSandboxBackend,
  inboundBandwidthLimiter,
  publishArchiveFromWorklet,
  publishArchiveAsIdentity,
  ensureHostLxmfDelivery,
});

void loadPersistedIdentity().then(() =>
  loadCatalogState()
    .then(() => seedBundledCatalogIfNeeded())
    .then(pushCatalog),
);
void loadModerationState();
pushStatus();
log(`Desktop host worklet ready (crypto: ${provider.name})`);

attachHostIpc({
  IPC,
  hostReplyChannel,
  hostMessageHandlers,
  identityMessages,
  pushStatus,
  log,
});
