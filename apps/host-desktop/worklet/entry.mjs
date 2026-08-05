/**
 * Desktop host Bare worklet entry (stdio IPC, transport role enabled by default).
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { BandwidthLimiter } from "../../../packages/reticulum-ts/dist/transport/bandwidth.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createDesktopPeerChrome } from "./peer-chrome.mjs";
import { createPeerSessionOps } from "./peer-session.mjs";
import { createMiniappHostOps } from "./miniapp-host-ops.mjs";
import { createIdentityOps } from "./identity-ops.mjs";
import { createNodeLifecycleOps } from "./node-lifecycle.mjs";
import { createNodeMessageHandlers } from "./messages-node.mjs";
import { createIdentityMessageHandlers } from "./messages-identity.mjs";
import { createCatalogMessageHandlers } from "./messages-catalog.mjs";
import { createMiniappMessageHandlers } from "./messages-miniapp.mjs";
import { createTestAgentHandler } from "./test-agent-handler.mjs";
import {
  createCryptoProvider,
  envValue,
  hostDataPath,
  refuseStorePosture,
  shouldRefuseDeveloperMode
} from "./host-environment.mjs";
import { createModerationOps, normalizedSourceHash } from "./moderation.mjs";
import { createTestSupportOps } from "./test-support.mjs";
import { createHarnessPeerPair } from "../../../packages/worklet-core/src/harness-peer-pair.mjs";
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
  createWorkletPropagationPersistenceOps
} from "../../../packages/worklet-core/src/index.mjs";
import { IPC } from "./ipc-stdio.mjs";

const NODE_FALLBACK = globalThis.process?.env?.TWISTEDPEAR_WORKLET_NODE_FALLBACK === "1";
if (!NODE_FALLBACK) {
  const { installBareWebSocketGlobal } = await import("../../../conformance/freenet-spike/bare-websocket-shim.mjs");
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
  crossDeviceTestDriver: null
};

const provider = await createCryptoProvider(IS_DESKTOP_HOST);
const runtime = NODE_FALLBACK
  ? (await import("../../../packages/reticulum-ts/dist/runtime/node/runtime.js")).nodeRuntime()
  : bareRuntime({ storePath: hostDataPath("host-desktop-store") });
const inboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, HOST_BANDWIDTH_BYTES_PER_SECOND);
const outboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, HOST_BANDWIDTH_BYTES_PER_SECOND);
const IDENTITY_STORE_KEY = "host-identity";
const MODERATION_STORE_KEY = "host-moderation-v1";

const { persistModerationState, pushModerationState, loadModerationState } = createModerationOps({
  state,
  runtime,
  send,
  moderationStoreKey: MODERATION_STORE_KEY
});

const NodeWorkerSandboxBackend = NODE_FALLBACK
  ? (await import("../../../packages/miniapp-runtime/dist/sandbox/node-worker.js")).NodeWorkerSandboxBackend
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

const PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;
const PROPAGATION_STORE_KEY = "propagation-store";

const freenetBackendProxy = {
  async get(keyHex) {
    if (state.freenetBackendImpl === null) {
      throw new Error("Freenet is not configured on this host (enable it in Settings)");
    }
    return state.freenetBackendImpl.get(keyHex);
  },
  async put(options) {
    if (state.freenetBackendImpl === null) {
      throw new Error("Freenet is not configured on this host (enable it in Settings)");
    }
    return state.freenetBackendImpl.put(options);
  },
  async update(options) {
    if (state.freenetBackendImpl === null) {
      throw new Error("Freenet is not configured on this host (enable it in Settings)");
    }
    return state.freenetBackendImpl.update(options);
  }
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
  resolveIdentity
} = createIdentityOps({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  identityStoreKey: IDENTITY_STORE_KEY
});

const {
  ensureEntryCasStore,
  ingestCasLocator,
  respondToCasLocatorRequest,
  waitForCasLocator
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
  logReannounce: (t256) => log(`Re-announced CAS locator for ${t256.slice(0, 16)}…`)
});

const { ensureTrustStore, pushTrustList } = createTrustStoreOps({ runtimeKeyValueStore, send });

const { ensureCatalog, persistCatalogState, loadCatalogState, pushCatalog } = createCatalogOps({
  provider,
  packageQuotaBytes: PACKAGE_QUOTA_BYTES,
  runtimeKeyValueStore,
  status,
  pushStatus,
  send
});

const { ensurePeerLinkDestination, automaticReticulumChannel } = createAutomaticReticulumDiscovery({
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
  automaticOfferKeys
});

const { loadPropagationCache, createPersistence: createWorkletPropagationPersistence } =
  createWorkletPropagationPersistenceOps({
    runtime,
    propagationStoreKey: PROPAGATION_STORE_KEY,
    getPropagationStoreCache: () => state.propagationStoreCache,
    setPropagationStoreCache: (cache) => {
      state.propagationStoreCache = cache;
    }
  });

const { publishArchiveAsIdentity, publishArchiveFromWorklet } = createPublishArchiveOps({
  provider,
  DestinationDirection,
  DestinationType,
  nodeFallback: NODE_FALLBACK,
  casLocators,
  casResponseDestinations,
  ensureReticulum: (...args) => ensureReticulum(...args),
  resolveIdentity,
  ensurePackageDriveManager: (...args) => ensurePackageDriveManager(...args),
  log
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
    `Installed ${appId} v${version} from 256t via ${source} (trusted: ${trusted})`
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
  dropCensus
});

const ensureDevChannel = createEnsureDevChannel({
  createDevChannelClient,
  ensureMiniappHost: (...args) => ensureMiniappHost(...args),
  send,
  log
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
  createIpcBonjourBridge
});

const quiesceInterfaces = createQuiesceInterfaces({
  log,
  pushStatus,
  stopTcpInterface: (...args) => stopTcpInterface(...args),
  stopAutoInterface,
  stopBleInterface: (...args) => stopBleInterface(...args),
  stopRnodeInterface: (...args) => stopRnodeInterface(...args),
  stopFreenetInterface: (...args) => stopFreenetInterface(...args)
});

const {
  startPropagation,
  stopPropagation,
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
  reconnectTcpAfterNetworkChange
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
  createWorkletPropagationPersistence
});

const peerChromeBase = createDesktopPeerChrome({
  requestReply: requestRendererReply,
  send,
  createToken: () => generateConfirmationToken((length) => provider.randomBytes(length)),
  ntfyServer: envValue("TWISTEDPEAR_NTFY_URL")
});
const harnessPeerPair = createHarnessPeerPair();
const peerChrome = {
  ...peerChromeBase,
  get manual() {
    return harnessPeerPair.enabled ? harnessPeerPair.channel : peerChromeBase.manual;
  },
  qr: peerChromeBase.qr,
  audio: peerChromeBase.audio,
  ntfy: peerChromeBase.ntfy,
  async confirm(peer, pairingRequest) {
    if (harnessPeerPair.enabled) return true;
    return peerChromeBase.confirm(peer, pairingRequest);
  }
};

const { ensurePeerSessionManager, peerSessionManagerProxy } = createPeerSessionOps({
  state,
  provider,
  send,
  log,
  envValue,
  peerChrome,
  requestRendererReply,
  outboundBandwidthLimiter,
  webRtcSessionByFingerprint,
  webRtcRouteListeners,
  webRtcRoutePending,
  peerLinks,
  resolveIdentity,
  ensureReticulum,
  ensurePeerLinkDestination,
  automaticReticulumChannel
});

const {
  ensureMiniappHost,
  seedBundledCatalogIfNeeded,
  ensurePackageDriveManager
} = createMiniappHostOps({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  hostDataPath,
  bundledCatalogModule,
  NodeWorkerSandboxBackend,
  freenetBackendProxy,
  peerSessionManagerProxy,
  requestRendererReply,
  inboundBandwidthLimiter,
  outboundBandwidthLimiter,
  webRtcSessionByFingerprint,
  applyInterfaceConfig,
  runtimeKeyValueStore,
  ensureReticulum,
  resolveIdentity,
  ensureCatalog,
  persistCatalogState,
  pushCatalog,
  ensureTrustStore,
  pushTrustList,
  ensureEntryCasStore,
  publishArchiveFromWorklet,
  publishArchiveAsIdentity,
  installFromT256
});

const { importTrustedPublisherForTest, ensureCrossDeviceTestDriver } = createTestSupportOps({
  state,
  provider,
  runtime,
  requestRendererReply,
  ensureTrustStore,
  ensureMiniappHost,
  ensureCatalog,
  ensureEntryCasStore,
  installFromT256,
  resolveIdentity
});

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
  if (state.reticulum !== null) {
    const interfaces = state.reticulum.listInterfaces();
    const preferred = selectPreferredInterface(interfaces);
    status.preferredInterface = preferred?.name ?? null;
    status.onlineInterfaces = interfaces.filter((iface) => iface.online).length;
    status.pathTableCount = state.reticulum.pathTableCount;
    status.activeLinkCount = state.reticulum.activeLinkCount;
    status.bandwidthBytesIn = state.reticulum.bandwidthBytesIn;
    status.bandwidthBytesOut = state.reticulum.bandwidthBytesOut;
    status.transportEnabled = state.reticulum.isTransportEnabled;
  } else {
    status.preferredInterface = null;
    status.onlineInterfaces = 0;
    status.pathTableCount = 0;
    status.activeLinkCount = 0;
    status.bandwidthBytesIn = 0;
    status.bandwidthBytesOut = 0;
  }

  if (state.propagationServer !== null) {
    status.propagationStoreBytes = state.propagationServer.stats.usedBytes;
    status.propagationMessageCount = state.propagationServer.stats.messageCount;
  } else {
    status.propagationStoreBytes = 0;
    status.propagationMessageCount = 0;
  }

  send({ type: "status", status: { ...status } });
}

const nodeMessages = createNodeMessageHandlers({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  freenetBackendProxy,
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
  loadPacketLogWasm
});

const identityMessages = createIdentityMessageHandlers({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  identityStoreKey: IDENTITY_STORE_KEY,
  applyInterfaceConfig,
  createIdentity,
  persistIdentity,
  resetIdentity,
  updateIdentityStatus,
  ensureMiniappHost,
  pushModerationState,
  persistModerationState,
  normalizedSourceHash
});

const catalogMessages = createCatalogMessageHandlers({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  refuseStoreAction,
  ensureCatalog,
  persistCatalogState,
  pushCatalog,
  ensureTrustStore,
  pushTrustList,
  ensureEntryCasStore,
  ensurePackageDriveManager,
  resolveIdentity,
  installFromT256,
  importTrustedPublisherForTest
});

const miniappMessages = createMiniappMessageHandlers({
  state,
  provider,
  runtime,
  status,
  send,
  log,
  pushStatus,
  hostReplyChannel,
  webRtcRouteListeners,
  webRtcRoutePending,
  refuseStoreAction,
  shouldRefuseDeveloperMode,
  ensureMiniappHost,
  ensureCatalog,
  ensureDevChannel,
  runtimeKeyValueStore
});

const handleConnectTestAgent = createTestAgentHandler({
  state,
  provider,
  status,
  log,
  harnessPeerPair,
  requestRendererReply,
  resolveIdentity,
  ensureReticulum,
  startTcpInterface,
  ensureHostLxmfDelivery,
  ensureMiniappHost,
  ensurePeerSessionManager,
  ensureCrossDeviceTestDriver
});

const hostMessageHandlers = {
  ...nodeMessages.handlers,
  ...identityMessages.handlers,
  ...catalogMessages.handlers,
  ...miniappMessages.handlers,
  "connect-test-agent": handleConnectTestAgent
};

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

  const handler = hostMessageHandlers[message.type];
  if (handler !== undefined) {
    await handler(message);
    return;
  }

  if (message.type.startsWith("moderation-")) {
    await identityMessages.handleModerationUpdate(message);
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
const HOST_REPLY_TYPES = new Set([
  "confirm-response",
  "launch-confirm",
  "install-confirm",
  "peer-chrome-response",
  "device-bridge-response",
  "media-codec-response",
  "media-opus-play-response"
]);
IPC.on("data", (data) => {
  hostMessageBuffer += data.toString();
  const lines = hostMessageBuffer.split("\n");
  hostMessageBuffer = lines.pop() ?? "";
  for (const line of lines) {
    // Replies must not wait behind other host-message handlers: those handlers
    // (and test-agent commands) often await requestRendererReply, which would
    // deadlock if the matching peer-chrome-response sat on this queue.
    try {
      const parsed = JSON.parse(line);
      if (parsed && HOST_REPLY_TYPES.has(parsed.type)) {
        if (!hostReplyChannel.resolveReply(parsed)) {
          log(`Orphan host reply ${parsed.type} token=${typeof parsed.token === "string" ? parsed.token.slice(0, 12) : "?"}`);
        }
        continue;
      }
    } catch {
      // Fall through to the ordered handler for malformed lines.
    }
    hostMessageQueue = hostMessageQueue
      .then(() => handleHostMessage(line))
      .catch((error) => {
        log(`Worklet error: ${error instanceof Error ? error.message : String(error)}`);
        pushStatus();
      });
  }
});
