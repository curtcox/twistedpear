/* Concat part 2 of entry.mjs; assembled by build scripts. */
  get startFreenetInterface() {
    return startFreenetInterface;
  },
  get startFreenetPropagationRole() {
    return startFreenetPropagationRole;
  },
  get startRnodeInterface() {
    return startRnodeInterface;
  },
  get startStatusTimer() {
    return startStatusTimer;
  },
  get startTcpInterface() {
    return startTcpInterface;
  },
  get status() {
    return status;
  },
  get stopAutoInterface() {
    return stopAutoInterface;
  },
  set stopAutoInterface(value) {
    stopAutoInterface = value;
  },
  get stopBleInterface() {
    return stopBleInterface;
  },
  get stopFreenetInterface() {
    return stopFreenetInterface;
  },
  get stopFreenetPropagationRole() {
    return stopFreenetPropagationRole;
  },
  get stopHostLxmfDelivery() {
    return stopHostLxmfDelivery;
  },
  get stopNode() {
    return stopNode;
  },
  get stopRnodeInterface() {
    return stopRnodeInterface;
  },
  get stopStatusTimer() {
    return stopStatusTimer;
  },
  get stopTcpInterface() {
    return stopTcpInterface;
  },
  get tcpIface() {
    return tcpIface;
  },
  set tcpIface(value) {
    tcpIface = value;
  },
  get testAgent() {
    return testAgent;
  },
  set testAgent(value) {
    testAgent = value;
  },
  get transportAnnounceService() {
    return transportAnnounceService;
  },
  get updateIdentityStatus() {
    return updateIdentityStatus;
  },
  get webRtcRouteListeners() {
    return webRtcRouteListeners;
  },
  get webRtcRoutePending() {
    return webRtcRoutePending;
  },
  get webRtcSessionByFingerprint() {
    return webRtcSessionByFingerprint;
  },
};

// Opus encode/decode runs on the RN host (Hermes/JSC). Packing opusscript into the
// Bare worklet breaks identity boot on BareKit; duplex is delegated via IPC.

const { IPC } = BareKit;
const HOST_BANDWIDTH_BYTES_PER_SECOND = 512 * 1024;

let bareWebSocketReady = null;
async function ensureBareWebSocket() {
  return ensureBareWebSocketImpl(extractedContext);
}
function createProvider() {
  return createProviderImpl(extractedContext);
}

const provider = createProvider();
function mobileStorePath() {
  return mobileStorePathImpl(extractedContext);
}

const runtime = bareRuntime({ storePath: mobileStorePath() });
const inboundBandwidthLimiter = new BandwidthLimiter(
  runtime.clock,
  HOST_BANDWIDTH_BYTES_PER_SECOND,
);
const outboundBandwidthLimiter = new BandwidthLimiter(
  runtime.clock,
  HOST_BANDWIDTH_BYTES_PER_SECOND,
);
const IDENTITY_STORE_KEY = "harness-identity";

/** @type {import("./protocol.ts").WorkletStatus} */
const status = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  dropCensus: { byReason: {}, byPeer: {} },
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
  relayMode: "off",
  relayDirections: {
    tcp: "both",
    auto: "both",
    bluetooth: "both",
    rnode: "both",
  },
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  developerMode: false,
  miniappRunning: false,
  freenetEnabled: false,
  freenetConfigured: false,
  freenetUrl: null,
  freenetContractReads: false,
  freenetContractWrites: false,
  freenetPacketTunnel: false,
  freenetPropagation: false,
  freenetInterfaceOnline: false,
  freenetPropagationAttached: false,
  freenetPropagationRole: false,
  freenetRendezvousHex: null,
  propagationEnabled: false,
  propagationStoreBytes: 0,
  propagationMessageCount: 0,
};

/** @type {FreenetClient | null} */
let freenetSharedClient = null;
/** @type {FreenetClientContractBackend | null} */
let freenetBackendImpl = null;
/** @type {import("../../../packages/reticulum-interfaces/dist/freenet.js").FreenetInterface | null} */
let freenetIface = null;
/** @type {FreenetPropagationStore | null} */
let freenetPropagationStore = null;
/** @type {PropagationServer | null} */
let propagationServer = null;
/** @type {ReturnType<typeof createPropagationDestination> | null} */
let propagationDestination = null;
const PROPAGATION_STORE_KEY = "harness-propagation-store";
/** @type {{ entries: ReadonlyArray<{ transientIdHex: string; lxmfDataHex: string; storedAt: number }> } | null} */
let propagationStoreCache = null;
/** @type {string | null} */
let pendingFreenetAuthToken = null;
/** @type {0 | 1} */
let pendingFreenetLocalDirection = 0;
/** @type {Uint8Array | null} */
let packetLogWasmCache = null;
/** @type {Uint8Array | null} */
let propagationSetWasmCache = null;
/** @type {{ contractReads: boolean, contractWrites: boolean, packetTunnel: boolean, propagation: boolean }} */
let freenetCapabilities = {
  contractReads: false,
  contractWrites: false,
  packetTunnel: false,
  propagation: false,
};
const freenetBackendProxy = {
  async get(keyHex) {
    if (freenetBackendImpl === null || !freenetCapabilities.contractReads) {
      throw new Error("Freenet contract reads are not granted on this host");
    }
    return freenetBackendImpl.get(keyHex);
  },
  async put(options) {
    if (freenetBackendImpl === null || !freenetCapabilities.contractWrites) {
      throw new Error("Freenet contract writes are not granted on this host");
    }
    return freenetBackendImpl.put(options);
  },
  async update(options) {
    if (freenetBackendImpl === null || !freenetCapabilities.contractWrites) {
      throw new Error("Freenet contract writes are not granted on this host");
    }
    return freenetBackendImpl.update(options);
  },
};

/** @type {Reticulum | null} */
let reticulum = null;
let peerSessionManager = null;
/** @type {Map<string, Set<(payload: Uint8Array) => void>>} */
const webRtcRouteListeners = new Map();
/** @type {Map<string, Uint8Array[]>} */
const webRtcRoutePending = new Map();
/** @type {Map<string, string>} */
const webRtcSessionByFingerprint = new Map();
/** @type {null | ((input: { appId: string; peer: string; demand: any; admission?: any }) => Promise<{ quality?: () => any; close: () => Promise<void>; bytesSent?: number; sessionId?: string; voiceProcessing?: unknown }>)>} */
let attachWebRtcMediaTrack = null;
let ntfyUrl = null;
const peerLinkDestinations = new Map();
const peerLinks = new Map();
const automaticDiscoveryDestinations = new Map();
const automaticDiscoveryHandlers = new Set();
const automaticInboundBuckets = new Map();
const automaticInboundWaiters = new Map();
const automaticInboundRoutes = new Map();
const automaticAnswerWaiters = new Map();
const automaticOfferKeys = new Map();
const bluetoothAssemblies = new Map();
const bluetoothOfferQueue = [];
const bluetoothOfferWaiters = [];
const bluetoothAnswerWaiters = new Map();
const bluetoothOfferKeys = new Map();
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
/** @type {Identity | null} */
let activeIdentity = null;
/** @type {{ targetHost: string; targetPort: number } | null} */
let pendingTarget = null;

/** @type {import("../../../packages/bridge-hyper/dist/drive.js").DriveManager | null} */
let packageDriveManager = null;
/** @type {import("../../../packages/bridge-hyper/dist/swarm.js").SwarmSession | null} */
let packageSwarm = null;
const PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;

/** @type {Map<string, import("../../../packages/cas-256t/dist/index.js").CasLocator>} */
const casLocators = new Map();
const casRequestDestinations = new Map();
const casResponseDestinations = new Map();
const runtimeStoreKeys = new Set();
function runtimeKeyValueStore() {
  return runtimeKeyValueStoreImpl(extractedContext);
}

const casOps = createCasLocatorOps({
  provider,
  DestinationDirection,
  DestinationType,
  runtimeKeyValueStore,
  casLocators,
  casRequestDestinations,
  casResponseDestinations,
  getReticulum: () => reticulum,
  ensureReticulum,
  resolveIdentity,
  log,
});
const {
  ensureEntryCasStore,
  ingestCasLocator,
  respondToCasLocatorRequest,
  waitForCasLocator,
} = casOps;

const trustOps = createTrustStoreOps({ runtimeKeyValueStore, send });
const { ensureTrustStore, pushTrustList } = trustOps;

const catalogOps = createCatalogOps({
  provider,
  packageQuotaBytes: PACKAGE_QUOTA_BYTES,
  runtimeKeyValueStore,
  status,
  pushStatus,
  send,
});
const { ensureCatalog, persistCatalogState, loadCatalogState, pushCatalog } =
  catalogOps;

const reticulumDiscovery = createAutomaticReticulumDiscovery({
  provider,
  DestinationDirection,
  DestinationType,
  status,
  getReticulum: () => reticulum,
  ensureReticulum,
  peerLinkDestinations,
  automaticDiscoveryDestinations,
  automaticDiscoveryHandlers,
  automaticInboundBuckets,
  automaticInboundWaiters,
  automaticInboundRoutes,
  automaticAnswerWaiters,
  automaticOfferKeys,
});
const { ensurePeerLinkDestination, automaticReticulumChannel } =
  reticulumDiscovery;

let registerAnnounceHandler;
let installFromT256;
let publishArchiveFromWorklet;
let ensureDevChannel;
let loadPropagationCache;
let createWorkletPropagationPersistence;
let startAutoInterface;
let stopAutoInterface;
let quiesceInterfaces;

/** @type {ReturnType<typeof createWorkletMiniappHost> | null} */
let miniappHost = null;
/** @type {Awaited<ReturnType<typeof createHostLxmfDelivery>> | null} */
let hostLxmfDelivery = null;
/** Test-only peer control agent; mounted only by `connect-test-agent`. */
let testAgent = null;
let crossDeviceTestDriver = null;
let relayBridge = null;
let relayPolicy = {};
let relayService = null;
let relayConfigLoaded = false;
const RELAY_CONFIG_STORE_KEY = "relay-config-v1";
async function persistRelayConfig() {
  await runtime.store.set(
    RELAY_CONFIG_STORE_KEY,
    new TextEncoder().encode(
      JSON.stringify({
        mode: status.relayMode,
        directions: status.relayDirections,
        policy: relayPolicy,
        enabled: {
          tcp: status.tcpEnabled,
          auto: status.autoEnabled,
          bluetooth: status.bleEnabled,
          rnode: status.rnodeEnabled,
        },
      }),
    ),
  );
}
async function loadRelayConfig() {
  if (relayConfigLoaded) return;
  relayConfigLoaded = true;
  const stored = await runtime.store.get(RELAY_CONFIG_STORE_KEY);
  if (stored === undefined) return;
  try {
    const saved = JSON.parse(new TextDecoder().decode(stored));
    ensureMiniappHost();
    if (saved.enabled && typeof saved.enabled === "object") {
      for (const kind of ["tcp", "auto", "bluetooth", "rnode"]) {
        if (saved.enabled[kind] === true) await relayService.enable(kind);
        else if (saved.enabled[kind] === false)
          await relayService.disable(kind);
      }
    }
    if (["off", "bridge", "transport-node"].includes(saved.mode))
      await relayService.setMode(saved.mode);
    if (saved.directions && typeof saved.directions === "object") {
      for (const [kind, direction] of Object.entries(saved.directions)) {
        if (["tx", "rx", "both"].includes(direction))
          await relayService.setDirection(kind, direction);
      }
    }
    if (saved.policy && typeof saved.policy === "object")
      await relayService.setPolicy(saved.policy);
  } catch (error) {
    log(
      `Ignored invalid persisted relay config: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
}
async function importTrustedPublisher(identityString, label, source = "paste") {
  return importTrustedPublisherImpl(
    extractedContext,
    identityString,
    label,
    source,
  );
}
function ensureCrossDeviceTestDriver() {
  return ensureCrossDeviceTestDriverImpl(extractedContext);
}
async function handleNativeMediaOpusCommand(request) {
  return handleNativeMediaOpusCommandImpl(extractedContext, request);
}
function ensureMiniappHost() {
  return ensureMiniappHostImpl(extractedContext);
}

const transportAnnounceService = createMiniappAnnounceService({
  provider,
  bytesToHex,
  DestinationDirection,
  DestinationType,
  getNode: () => ensureReticulum(),
  getIdentity: () => resolveIdentity(),
  copyAppData: true,
});
async function ensurePackageDriveManager() {
  return ensurePackageDriveManagerImpl(extractedContext);
}
function send(message) {
  return sendImpl(extractedContext, message);
}

