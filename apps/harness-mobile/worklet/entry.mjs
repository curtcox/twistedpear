/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  FreenetClient,
  FreenetClientContractBackend,
  FreenetContractPacketLogBackend,
  FreenetPropagationStore
} from "../../../packages/bridge-freenet/dist/index.js";
import { FreenetInterface } from "../../../packages/reticulum-interfaces/dist/freenet.js";
import { PACKET_LOG_WASM_BASE64 } from "./packet-log-wasm.generated.mjs";
import { PROPAGATION_SET_WASM_BASE64 } from "./propagation-set-wasm.generated.mjs";
import { bytesToHex, hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { BareCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/bare.js";
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
import { BleInterface } from "../../../packages/reticulum-interfaces/dist/ble/interface.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import { createIpcBleBridge } from "./ipc-ble-bridge.mjs";
import { createIpcSerialBridge } from "../../../packages/worklet-core/src/ipc-serial-bridge.mjs";
import {
  connectTestAgent,
  createAutoInterfaceOps,
  createAutomaticReticulumDiscovery,
  createCasLocatorOps,
  createCatalogOps,
  createCrossDeviceTestDriver,
  createDevChannelClient,
  createEnsureDevChannel,
  createHarnessPeerPair,
  createHostReplyChannel,
  createInstallFromT256,
  createMiniappAnnounceService,
  createPeerSessionManagerProxyFromState,
  createPublishArchiveOps,
  createQuiesceInterfaces,
  createRegisterAnnounceHandler,
  createRuntimeKeyValueStore,
  createStatusTimer,
  createTrustStoreOps,
  createWorkletMiniappHost,
  createWorkletPropagationPersistence,
  joinCommunityNetwork,
  peerServiceAspect,
  sleep
} from "../../../packages/worklet-core/src/index.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import {
  CatalogStore,
  InstalledPackageStore,
  TrustStore,
  buildAppAnnounceSummary,
  decodeAppAnnounceData,
  decodePublisherIdentity256t,
  encodeAppAnnounceData,
  encodePublisherIdentity256t,
  unpackPackage,
  verifyPackage
} from "../../../packages/app-registry/dist/index.js";
import {
  PackageResourceClient,
  assessFetchBudget,
  attachPackageResourceServer,
  fetchPackage
} from "../../../packages/bridge-hyper/dist/worklet.js";
import {
  CasStore,
  casAnnounceAspects,
  casRequestAspects,
  decodeCasLocator,
  decodeCasLocatorRequest,
  encodeCasLocator,
  encodeCasLocatorRequest,
  signCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../../../packages/cas-256t/dist/index.js";
import {
  HOST_API_VERSION,
  createWorkletFlagRelayService,
  generateConfirmationToken,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "../../../packages/lxmf-ts/dist/index.js";
import { decodePeerAudioFrame, decodePeerInvitation, encodeDeviceStreamFrame, framePeerAudioPayload, initialPeerAudioAssemblyState, stepPeerAudioAssembly } from "../../../packages/protocol/dist/index.js";
import { SimulatedMediaCodecDriver } from "../../../packages/effects/dist/media-codec.js";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import { refuseStorePosture, shouldRefuseDeveloperMode } from "./store-posture-policy.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { AudioPeerDiscoveryAdapter, BluetoothPeerDiscoveryAdapter, CryptoPeerPairingBackend, InvitationPairingDriver, ManualPeerDiscoveryAdapter, meterHostPeerRoute, NtfyPeerDiscoveryAdapter, NtfyRendezvousClient, PeerDiscoveryRegistry, PeerSessionManager, QrPeerDiscoveryAdapter, ReticulumPeerDiscoveryAdapter, UnavailablePeerDiscoveryAdapter } from "../../../packages/peer-discovery/dist/index.js";

// Opus encode/decode runs on the RN host (Hermes/JSC). Packing opusscript into the
// Bare worklet breaks identity boot on BareKit; duplex is delegated via IPC.

const { IPC } = BareKit;
const HOST_BANDWIDTH_BYTES_PER_SECOND = 512 * 1024;

let bareWebSocketReady = null;
async function ensureBareWebSocket() {
  if (bareWebSocketReady === null) {
    bareWebSocketReady = import("../../../conformance/freenet-spike/bare-websocket-shim.mjs").then(
      ({ installBareWebSocketGlobal }) => {
        installBareWebSocketGlobal();
      }
    );
  }
  await bareWebSocketReady;
}

function createProvider() {
  try {
    // Mobile BareKit ESM worklets do not provide CommonJS `require`; sodium-native
    // loading in BareCryptoProvider needs it. Probe before claiming the bare path.
    if (typeof require !== "function") {
      return new PureCryptoProvider();
    }
    const candidate = new BareCryptoProvider();
    candidate.ed25519PublicFromPrivate(candidate.randomBytes(32));
    return candidate;
  } catch {
    return new PureCryptoProvider();
  }
}

const provider = createProvider();

function mobileStorePath() {
  try {
    // Linked Bare addons expose bare-os via require when available.
    // eslint-disable-next-line no-undef
    const bareOs = typeof require === "function" ? require("bare-os") : null;
    if (bareOs?.tmpdir) {
      return `${bareOs.tmpdir()}/twistedpear-reticulum-store`;
    }
  } catch {
    // ignore
  }
  // Absolute fallback: relative cwd on iOS Bare often cannot host the store.
  return "/tmp/twistedpear-reticulum-store";
}

const runtime = bareRuntime({ storePath: mobileStorePath() });
const inboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, HOST_BANDWIDTH_BYTES_PER_SECOND);
const outboundBandwidthLimiter = new BandwidthLimiter(runtime.clock, HOST_BANDWIDTH_BYTES_PER_SECOND);
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
  propagationMessageCount: 0
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
  propagation: false
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
  }
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

/** @type {CatalogStore | null} */
let catalogStore = null;
/** @type {InstalledPackageStore | null} */
let installedStore = null;
/** @type {import("../../../packages/bridge-hyper/dist/drive.js").DriveManager | null} */
let packageDriveManager = null;
/** @type {import("../../../packages/bridge-hyper/dist/swarm.js").SwarmSession | null} */
let packageSwarm = null;
const PACKAGE_QUOTA_BYTES = 64 * 1024 * 1024;

/** @type {TrustStore | null} */
let trustStore = null;
/** @type {Map<string, import("../../../packages/cas-256t/dist/index.js").CasLocator>} */
const casLocators = new Map();
const casRequestDestinations = new Map();
const casResponseDestinations = new Map();
const runtimeStoreKeys = new Set();

function runtimeKeyValueStore() {
  return createRuntimeKeyValueStore(runtime, runtimeStoreKeys);
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
  log
});
const {
  ensureEntryCasStore,
  ingestCasLocator,
  announceCasLocatorRequest,
  respondToCasLocatorRequest,
  waitForCasLocator
} = casOps;

const trustOps = createTrustStoreOps({ runtimeKeyValueStore, send });
const { ensureTrustStore, pushTrustList } = trustOps;

const catalogOps = createCatalogOps({
  provider,
  packageQuotaBytes: PACKAGE_QUOTA_BYTES,
  runtimeKeyValueStore,
  status,
  pushStatus,
  send
});
const { ensureCatalog, persistCatalogState, loadCatalogState, pushCatalog } = catalogOps;

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
  automaticOfferKeys
});
const {
  ensurePeerLinkDestination,
  automaticReticulumChannel
} = reticulumDiscovery;

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
/** @type {ReturnType<typeof createDevChannelClient> | null} */
let devChannel = null;
/** Test-only peer control agent; mounted only by `connect-test-agent`. */
let testAgent = null;
let crossDeviceTestDriver = null;

async function importTrustedPublisher(identityString, label, source = "paste") {
  const publisherPublicKey = decodePublisherIdentity256t(identityString);
  const confirmation = await requestHostReply({
    type: "confirm-request",
    token: generateConfirmationToken((length) => provider.randomBytes(length)),
    kind: "trust-import",
    appId: "host",
    publisherPublicKey,
    summary: { label, source }
  });
  if (confirmation?.approved !== true) throw new Error("Publisher trust import denied");
  await ensureTrustStore().add({ publisherPublicKey, label, addedAt: Date.now(), source });
}

function ensureCrossDeviceTestDriver() {
  if (crossDeviceTestDriver === null) {
    const base = createCrossDeviceTestDriver({
      miniappHost: () => ensureMiniappHost(),
      installedStore: () => ensureCatalog().installedStore,
      runtime,
      installFromT256,
      importTrust: (identity256t, label) => importTrustedPublisher(identity256t, label),
      casStore: () => ensureEntryCasStore(),
      sha512: (bytes) => provider.sha512(bytes),
      async publisherIdentity256t() {
        const identity = await resolveIdentity();
        if (identity === null) throw new Error("Host identity is unavailable");
        return encodePublisherIdentity256t(identity.getPublicKey());
      }
    });
    crossDeviceTestDriver = async (request) => {
      if (request?.cmd === "media-opus-duplex" || request?.cmd === "media-opus-play") {
        return handleNativeMediaOpusCommand(request);
      }
      if (request?.cmd === "renderer-ping") {
        const reply = await requestHostReply({ type: "peer-qr-availability", token: peerToken() }, 10_000);
        return {
          ok: reply !== null,
          availability: reply?.availability ?? null,
          error: reply === null ? "renderer ping timed out" : reply?.error
        };
      }
      if (request?.cmd === "peer-pair-start") {
        harnessPeerPair.enable();
        await ensurePeerSessionManager();
        ensureMiniappHost();
        const role = request.role === "listen" ? "listen" : "offer";
        const appId = typeof request.appId === "string" ? request.appId : "line-check";
        const runtimeId = "harness-webrtc";
        return harnessPeerPair.start(async () => {
          const manager = await ensurePeerSessionManager();
          const connect = {
            service: appId,
            purpose: "WebRTC media conformance",
            mechanisms: ["manual"],
            timeoutMs: 120_000
          };
          const handle =
            role === "listen"
              ? await manager.listen(appId, runtimeId, connect)
              : await manager.request(appId, runtimeId, connect);
          const info = manager.info(appId, runtimeId, handle);
          return {
            handleId: handle.id,
            dataPlane: info.dataPlane,
            fingerprint: info.fingerprint,
            displayLabel: info.displayLabel
          };
        });
      }
      if (request?.cmd === "peer-pair-code-out") {
        const taken = await harnessPeerPair.takeOutboundCode(
          typeof request.timeoutMs === "number" ? request.timeoutMs : 60_000
        );
        return { code: taken.code, sessionId: taken.sessionId };
      }
      if (request?.cmd === "peer-pair-code-in") {
        if (typeof request.code !== "string") throw new Error("peer-pair-code-in requires code");
        harnessPeerPair.giveInboundCode(
          request.code,
          typeof request.sessionId === "string" ? request.sessionId : undefined
        );
        return { ok: true };
      }
      if (request?.cmd === "peer-pair-wait") {
        return harnessPeerPair.wait(
          typeof request.timeoutMs === "number" ? request.timeoutMs : 120_000
        );
      }
      if (request?.cmd === "webrtc-open-media") {
        ensureMiniappHost();
        if (attachWebRtcMediaTrack === null) {
          throw new Error("WebRTC media attach is not configured");
        }
        const appId = typeof request.appId === "string" ? request.appId : "line-check";
        const handleId = typeof request.handleId === "string" ? request.handleId : undefined;
        if (handleId === undefined) throw new Error("webrtc-open-media requires handleId");
        const classId = request.classId === "camera" ? "camera" : "microphone";
        const encoding = classId === "camera" ? "480p15" : "16k-opus";
        const attached = await attachWebRtcMediaTrack({
          appId,
          peer: handleId,
          demand: { classId, tierId: classId === "camera" ? "frames" : "pcm", encoding }
        });
        let bytesSent = attached.bytesSent ?? 0;
        let voiceProcessing = attached.voiceProcessing ?? null;
        if (bytesSent === 0 && typeof attached.sessionId === "string") {
          for (let attempt = 0; attempt < 20 && bytesSent === 0; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            const stats = await requestHostReply(
              { type: "peer-webrtc-media-stats", token: peerToken(), sessionId: attached.sessionId },
              10_000
            );
            if (typeof stats?.bytesSent === "number") bytesSent = stats.bytesSent;
          }
        }
        return {
          attached: true,
          plane: "webrtc-track",
          handleId,
          sessionId: attached.sessionId,
          bytesSent,
          voiceProcessing,
          encoding
        };
      }
      return base(request);
    };
  }
  return crossDeviceTestDriver;
}

async function handleNativeMediaOpusCommand(request) {
  // Encode/decode lives on the RN host — BareKit cannot safely pack opusscript.
  if (request.cmd === "media-opus-play") {
    if (typeof request.dataHex !== "string" || request.dataHex.length < 72) {
      throw new Error("media-opus-play requires TPD2 dataHex");
    }
    const encoding = typeof request.encoding === "string" ? request.encoding : "16k-opus";
    const played = await requestHostReply(
      {
        type: "media-opus-play-request",
        token: peerToken(),
        encoding,
        dataHex: request.dataHex
      },
      30_000
    );
    if (played?.error !== undefined || played?.played !== true) {
      throw new Error(played?.error ?? "Opus speaker playback failed");
    }
    return { played: true, encoding, bytes: Math.floor(request.dataHex.length / 2) };
  }

  // First Hermes asm.js Opus load can take tens of seconds; keep above the host encode budget.
  const duplex = await requestHostReply({ type: "media-opus-duplex-request", token: peerToken() }, 90_000);
  if (duplex?.error !== undefined || duplex?.ok !== true) {
    throw new Error(duplex?.error ?? (duplex === null ? "Opus duplex timed out waiting for host" : "Opus duplex failed on host"));
  }
  return {
    ok: true,
    implementation: duplex.implementation ?? "bundled-opus",
    voiceDuplex: duplex.voiceDuplex === true,
    encoding: duplex.encoding ?? "16k-opus",
    pcmBytes: duplex.pcmBytes,
    opusBytes: duplex.opusBytes,
    decodedBytes: duplex.decodedBytes,
    frameBytes: duplex.frameBytes,
    frameHex: duplex.frameHex,
    played: duplex.played === true
  };
}

function ensureMiniappHost() {
  if (miniappHost === null) {
    const relayService = createWorkletFlagRelayService({
      initialMode: "off",
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
        if (typeof options.baudRate === "number") pendingRnodeBaudRate = options.baudRate;
      }
    });
    miniappHost = createWorkletMiniappHost({
      provider,
      kvStore: runtimeKeyValueStore(),
      beeStoragePath: "miniapp-bee-store",
      defaultPlatform: "android",
      browserDeviceClasses: ["location", "camera", "microphone", "haptics"],
      enableBenchmark: true,
      async launchInstalledApp(appId) {
        const { installedStore: installed } = ensureCatalog();
        await ensureMiniappHost().launch(installed, runtime, appId);
      },
      getPresenceSnapshot: () => ({ ...status, autoPeers: status.autoPeers + (peerSessionManager?.routes.list().length ?? 0) }),
      peerSessionManager: peerSessionManagerProxy,
      realtimeReservations: { reserveRealtime: (bytesPerSecond) => outboundBandwidthLimiter.reserve("realtime", bytesPerSecond) },
      controlReservations: { reserveControl: (bytesPerSecond) => outboundBandwidthLimiter.reserve("control", bytesPerSecond) },
      onInboundMediaFrame(appId, stream, frame, offer) { send({ type: "inbound-media-frame", appId, handle: stream.handle, sink: stream.sink, encoding: offer.encoding, dataHex: bytesToHex(frame) }); },
      async openMediaCodec(configuration) {
        // Bare worklet cannot pack opusscript; keep the Effect boundary open via Simulated.
        // Host-side BundledOpus handles media-opus-duplex / media-opus-play IPC.
        void configuration;
        return new SimulatedMediaCodecDriver();
      },
      openCasPlane: {
        put: (frame) => ensureEntryCasStore().put(frame)
      },
      openWebRtcMediaPlane: createDelegatedWebRtcMediaPlaneOpener(
        (attachWebRtcMediaTrack = async ({ appId, peer, demand }) => {
          const confirmed = peerSessionManagerProxy.route(appId, { id: peer });
          if (confirmed?.dataPlane !== "webrtc") {
            throw new Error("No authenticated WebRTC route for media tracks.");
          }
          const sessionId = webRtcSessionByFingerprint.get(confirmed.fingerprint);
          if (sessionId === undefined) {
            throw new Error("WebRTC session is missing for media track attach.");
          }
          const reply = await requestHostReply(
            {
              type: "peer-webrtc-media-attach",
              token: peerToken(),
              sessionId,
              classId: demand.classId,
              tierId: demand.tierId
            },
            30_000
          );
          if (reply?.attached !== true) {
            throw new Error(typeof reply?.error === "string" ? reply.error : "WebRTC media track attach failed.");
          }
          return {
            sessionId,
            bytesSent: typeof reply.bytesSent === "number" ? reply.bytesSent : 0,
            voiceProcessing: reply.voiceProcessing ?? null,
            quality: () => ({
              goodputBps: 2_000_000,
              rttMs: 50,
              jitterMs: 10,
              lossRatio: 0,
              mtu: 1_200,
              source: "declared",
              samples: 1,
              confidence: "low"
            }),
            close: async () => {
              await requestHostReply(
                { type: "peer-webrtc-media-detach", token: peerToken(), sessionId, classId: demand.classId },
                10_000
              );
            }
          };
        })
      ),
      openPearsBulkPlane: {
        async append({ appId, peer, frame, sequence }) {
          const driveManager = await ensurePackageDriveManager();
          if (driveManager.activeDrive === null) {
            await driveManager.createDrive();
          }
          const drive = driveManager.activeDrive;
          if (drive === null) throw new Error("Hyperdrive is not initialized for pears-bulk media.");
          const safePeer = peer.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
          const path = `/media-streams/${appId}/${safePeer}/${String(sequence).padStart(8, "0")}.tpd2`;
          await drive.put(path, frame);
          return { path };
        }
      },
      async requestShareOffer({ appId, purpose }) {
        const peer = peerSessionManagerProxy.list(appId)[0]; if (peer === undefined) return null;
        const reply = await requestHostReply({ type: "confirm-request", token: peerToken(), kind: "device-share-offer", appId, publisherPublicKey: "host-authenticated-peer", summary: { purpose, peer: peer.displayLabel, class: "microphone", tier: "pcm", quality: "16k-opus", duration: "15 minutes" } });
        return reply?.approved === true ? { targetKind: "peer", targetId: peer.handle.id, displayLabel: peer.displayLabel, classId: "microphone", tierId: "pcm", maxRung: "16k-opus", ttlMs: 15 * 60_000 } : null;
      },
      async confirmShareOfferRevoke(offer) { const reply = await requestHostReply({ type: "confirm-request", token: peerToken(), kind: "device-share-revoke", appId: offer.appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: offer.displayLabel, class: offer.classId } }); return reply?.approved === true; },
      async confirmCostlyLinkProbe({ appId, peer, budgetBytes }) { const reply = await requestHostReply({ type: "confirm-request", token: peerToken(), kind: "link-probe", appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: peer.displayLabel, budgetBytes } }); return reply?.approved === true; },
      relayService,
      freenetBackend: freenetBackendProxy,
      announceService: transportAnnounceService,
      getPublisherIdentity: () => resolveIdentity(),
      publishArchive: publishArchiveFromWorklet,
      installFromT256,
      async requestUserConfirmation(request) {
        const reply = await requestHostReply({
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
        const token = peerToken();
        const reply = await requestHostReply(
          {
            type: "device-bridge-request",
            token,
            op: request.op,
            classId: request.classId,
            options: request.options ?? {},
            ...(request.command !== undefined ? { command: request.command } : {})
          },
          30_000
        );
        if (reply === null) throw new Error("Device bridge request timed out");
        if (reply.error) throw new Error(String(reply.error));
        return reply.result;
      },
      async requestLaunchReview(review) {
        return requestHostReply({
          type: "launch-review",
          token: review.token,
          appId: review.appId,
          publisherPublicKey: review.publisherPublicKey,
          version: review.version,
          capabilities: review.capabilities
        });
      },
      getHostInfoSnapshot: () => {
        const barePlatform =
          typeof Bare !== "undefined" && Bare !== null && typeof Bare.platform === "string"
            ? Bare.platform
            : "";
        const platform =
          barePlatform === "ios" || barePlatform === "ios-simulator"
            ? "ios"
            : barePlatform === "android"
              ? "android"
              : "android";
        const interfaceTypes = [];
        if (status.tcpEnabled) interfaceTypes.push("tcp");
        if (status.autoEnabled) interfaceTypes.push("auto");
        if (status.bleEnabled) interfaceTypes.push("ble");
        if (status.rnodeEnabled) interfaceTypes.push("rnode");
        return {
          platform,
          hostVersion: HOST_API_VERSION,
          roles: {
            transport: false,
            seeder: false,
            propagation: propagationServer !== null
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

const transportAnnounceService = createMiniappAnnounceService({
  provider,
  bytesToHex,
  DestinationDirection,
  DestinationType,
  getNode: () => ensureReticulum(),
  getIdentity: () => resolveIdentity(),
  copyAppData: true
});

async function ensurePackageDriveManager() {
  if (packageDriveManager === null) {
    const { createSwarm, DriveManager } = await import("../../../packages/bridge-hyper/dist/worklet-hyper.js");
    packageSwarm = createSwarm({ inboundBandwidthLimiter, outboundBandwidthLimiter });
    packageDriveManager = new DriveManager({
      storagePath: "hyper-storage",
      swarm: packageSwarm
    });
    await packageDriveManager.ready();
  }

  return packageDriveManager;
}

function send(message) {
  IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

const hostReplyChannel = createHostReplyChannel({ send });
const requestHostReply = hostReplyChannel.requestReply;

function peerToken() { return bytesToHex(provider.randomBytes(16)); }
const harnessPeerPair = createHarnessPeerPair();
const peerChromeBase = {
  manual: {
    async *offer(session, code, options) { const reply = await requestHostReply({ type: "peer-manual-present", token: peerToken(), sessionId: session.id, code, expectsResponse: true }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield reply.code; },
    async *accept(options) { const session = { id: peerToken(), kind: "manual" }; const reply = await requestHostReply({ type: "peer-manual-enter", token: peerToken(), sessionId: session.id, service: options.service }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield { session, code: reply.code }; },
    async answer(session, code) { await requestHostReply({ type: "peer-manual-present", token: peerToken(), sessionId: session.id, code, expectsResponse: false }); },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  qr: {
    async availability() { const reply = await requestHostReply({ type: "peer-qr-availability", token: peerToken() }, 5_000); return reply?.availability ?? { state: "unsupported", reason: "Native QR support could not be detected" }; },
    async *present(session, codes, options) { const reply = await requestHostReply({ type: "peer-qr-present", token: peerToken(), sessionId: session.id, codes, expectsResponse: true }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield reply.code; },
    async *scan(options) { const session = { id: peerToken(), kind: "qr" }; const reply = await requestHostReply({ type: "peer-qr-scan", token: peerToken(), sessionId: session.id, service: options.service }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield { session, code: reply.code }; },
    async answer(session, codes) { await requestHostReply({ type: "peer-qr-present", token: peerToken(), sessionId: session.id, codes, expectsResponse: false }); },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  audio: {
    async availability() { const reply = await requestHostReply({ type: "peer-audio-availability", token: peerToken() }, 5_000); return reply?.availability ?? { state: "unsupported", reason: "Native PCM support could not be detected" }; },
    async *transmit(session, frames, options) { const reply = await requestHostReply({ type: "peer-audio-transmit", token: peerToken(), sessionId: session.id, framesHex: frames.map(bytesToHex), expectsResponse: true }, options.timeoutMs); if (reply?.error !== undefined) throw new Error(reply.error); for (const frame of reply?.framesHex ?? []) yield hexToBytes(frame); },
    async *receive(options) { const session = { id: peerToken(), kind: "audio" }; const reply = await requestHostReply({ type: "peer-audio-receive", token: peerToken(), sessionId: session.id, service: options.service }, options.timeoutMs); if (reply?.error !== undefined) throw new Error(reply.error); for (const frame of reply?.framesHex ?? []) yield { session, frame: hexToBytes(frame) }; },
    async answer(session, frames) { const reply = await requestHostReply({ type: "peer-audio-transmit", token: peerToken(), sessionId: session.id, framesHex: frames.map(bytesToHex), expectsResponse: false }, 120_000); if (reply?.accepted !== true) throw new Error(reply?.error ?? "Audio answer playback was cancelled"); },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  ntfy: {
    async availability() { return ntfyUrl === null ? { state: "offline", reason: "No ntfy rendezvous server is configured" } : { state: "available", reason: `Encrypted rendezvous through ${ntfyUrl}` }; },
    async presentCode(session, code, options) { const reply = await requestHostReply({ type: "peer-ntfy-present", token: peerToken(), sessionId: session.id, code, server: ntfyUrl }, options.timeoutMs); if (reply?.accepted !== true) throw new Error("ntfy rendezvous was cancelled"); },
    async requestCode(options) { const session = { id: peerToken(), kind: "ntfy" }; const reply = await requestHostReply({ type: "peer-ntfy-enter", token: peerToken(), sessionId: session.id, service: options.service, server: ntfyUrl }, options.timeoutMs); if (reply?.accepted !== true || typeof reply.code !== "string") throw new Error("ntfy rendezvous was cancelled"); return { session, code: reply.code }; },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  async confirm(peer, request) { const reply = await requestHostReply({ type: "peer-confirm-request", token: peerToken(), appId: request.service, service: request.service, purpose: request.purpose, peer }); return reply?.approved === true; }
};
const peerChrome = {
  get manual() {
    return harnessPeerPair.enabled ? harnessPeerPair.channel : peerChromeBase.manual;
  },
  qr: peerChromeBase.qr,
  audio: peerChromeBase.audio,
  ntfy: peerChromeBase.ntfy,
  async confirm(peer, request) {
    if (harnessPeerPair.enabled) return true;
    return peerChromeBase.confirm(peer, request);
  }
};

function ntfyHostFetch(input, init = {}) {
  const headers = {}; new Headers(init.headers).forEach((value, name) => { headers[name] = value; });
  return requestHostReply({ type: "peer-ntfy-http", token: peerToken(), request: { url: String(input), method: init.method ?? "GET", headers, ...(typeof init.body === "string" ? { body: init.body } : {}) } }, 30_000).then((reply) => {
    if (reply === null || reply.error !== undefined || reply.http === undefined) throw new Error(reply?.error ?? "ntfy host request timed out");
    const result = reply.http; return { ok: result.status >= 200 && result.status < 300, status: result.status, headers: { get(name) { return name.toLowerCase() === "content-length" ? result.contentLength : null; } }, async text() { return result.body; } };
  });
}

function sendBluetoothInvitation(envelope) {
  const invitation = decodePeerInvitation(envelope, Date.now());
  send({ type: "peer-bluetooth-send", framesHex: framePeerAudioPayload(invitation.sessionId, envelope, 192).map(bytesToHex) });
}

function receiveBluetoothFrame(frameBytes) {
  const frame = decodePeerAudioFrame(frameBytes); const key = bytesToHex(frame.sessionId); const current = bluetoothAssemblies.get(key) ?? initialPeerAudioAssemblyState(Date.now() + 120_000); const result = stepPeerAudioAssembly(current, frameBytes, Date.now());
  if (result.payload === null) { bluetoothAssemblies.set(key, result.state); return; }
  bluetoothAssemblies.delete(key); const invitation = decodePeerInvitation(result.payload, Date.now());
  if (invitation.role === "answer") { const waiter = bluetoothAnswerWaiters.get(key); if (waiter !== undefined) { bluetoothAnswerWaiters.delete(key); bluetoothOfferKeys.delete(waiter.adapterSessionId); waiter.resolve(result.payload); } return; }
  const inbound = { session: { id: `ble:${key}`, kind: "bluetooth" }, envelope: result.payload }; const waiter = bluetoothOfferWaiters.shift(); if (waiter !== undefined) waiter(inbound); else { bluetoothOfferQueue.push(inbound); if (bluetoothOfferQueue.length > 16) bluetoothOfferQueue.shift(); }
}

const bluetoothDiscoveryChannel = {
  async availability() { return status.bleConnected ? { state: "available", reason: "Native BLE invitation GATT multiplex is connected" } : status.bleEnabled ? { state: "offline", reason: "BLE is enabled but no peer GATT pipe is connected" } : { state: "permission-required", reason: "Enable BLE in trusted host settings to grant scan/advertise permission" }; },
  async *advertise(session, envelope) { const invitation = decodePeerInvitation(envelope, Date.now()); const key = bytesToHex(invitation.sessionId); bluetoothOfferKeys.set(session.id, key); const answer = new Promise((resolve, reject) => bluetoothAnswerWaiters.set(key, { resolve, reject, adapterSessionId: session.id })); sendBluetoothInvitation(envelope); yield await answer; },
  async *scan() { const immediate = bluetoothOfferQueue.shift(); if (immediate !== undefined) { yield immediate; return; } yield await new Promise((resolve) => bluetoothOfferWaiters.push(resolve)); },
  async answer(_session, envelope) { sendBluetoothInvitation(envelope); },
  async cancel(sessionId) { const key = bluetoothOfferKeys.get(sessionId); if (key !== undefined) { bluetoothOfferKeys.delete(sessionId); const waiter = bluetoothAnswerWaiters.get(key); bluetoothAnswerWaiters.delete(key); waiter?.reject(new Error("Bluetooth invitation exchange cancelled")); } }
};

async function ensurePeerSessionManager() {
  if (peerSessionManager !== null) return peerSessionManager;
  const identity = await resolveIdentity(); const registry = new PeerDiscoveryRegistry();
  registry.register(new ManualPeerDiscoveryAdapter({ channel: peerChrome.manual, createSessionId: peerToken }));
  registry.register(new QrPeerDiscoveryAdapter({ channel: peerChrome.qr, createSessionId: peerToken }));
  registry.register(new ReticulumPeerDiscoveryAdapter({ channel: automaticReticulumChannel(identity), createSessionId: peerToken }));
  registry.register(new AudioPeerDiscoveryAdapter({ channel: peerChrome.audio, createSessionId: peerToken }));
  registry.register(new BluetoothPeerDiscoveryAdapter({ channel: bluetoothDiscoveryChannel, createSessionId: peerToken }));
  if (ntfyUrl === null) registry.register(new UnavailablePeerDiscoveryAdapter("ntfy", { state: "offline", reason: "No ntfy rendezvous server is configured" }));
  else {
    try { registry.register(new NtfyPeerDiscoveryAdapter({ client: new NtfyRendezvousClient({ baseUrl: ntfyUrl, fetch: ntfyHostFetch, entropy: async (length) => provider.randomBytes(length) }), channel: peerChrome.ntfy, createSessionId: peerToken })); }
    catch (error) { registry.register(new UnavailablePeerDiscoveryAdapter("ntfy", { state: "policy-disabled", reason: error instanceof Error ? error.message : String(error) })); }
  }
  registry.register(new UnavailablePeerDiscoveryAdapter("local-peer-to-peer", { state: "unsupported", reason: "LP2PRequest/LP2PReceiver is a browser proposal" }));
  const backend = new CryptoPeerPairingBackend({
    identity: { publicKey: identity.getPublicKey(), async sign(payload) { return identity.sign(payload); }, async verify(publicKey, payload, signature) { const remote = Identity.fromPublicKey(provider, publicKey); return remote !== null && remote.validate(signature, payload); } },
    displayLabel: `TwistedPear ${bytesToHex(identity.hash).slice(0, 8)}`,
    capabilities: ["webrtc", "reticulum"],
    entropy: async (length) => provider.randomBytes(length),
    candidates: async (request, context) => {
      const candidates = [];
      try {
        const remote = context.remoteInvitation?.candidates.find((entry) => entry.kind === "webrtc");
        const reply = await requestHostReply({
          type: "peer-webrtc-signal",
          token: peerToken(),
          sessionId: bytesToHex(context.sessionId),
          role: context.role,
          ...(remote === undefined ? {} : { remoteSignal: new TextDecoder().decode(remote.value) })
        }, 15_000);
        if (typeof reply?.signal === "string") {
          candidates.push({ kind: "webrtc", value: new TextEncoder().encode(reply.signal) });
        } else if (reply === null) {
          log("WebRTC signal timed out waiting for the host");
        } else if (typeof reply?.error === "string") {
          log(`WebRTC signal failed: ${reply.error}`);
        }
      } catch (error) {
        log(`WebRTC signal unavailable: ${error instanceof Error ? error.message : String(error)}`);
      }
      const destination = await ensurePeerLinkDestination(identity, request.service);
      await destination.announce();
      candidates.push({ kind: "reticulum", value: destination.hash });
      return candidates;
    },
    confirm: (peer, request) => peerChrome.confirm(peer, request),
    async establish(context, peer, adapter) {
      if (peer.dataPlane === "webrtc") {
        const remote = context.remoteInvitation.candidates.find((entry) => entry.kind === "webrtc");
        const sessionId = bytesToHex(context.remoteInvitation.sessionId);
        const reply = await requestHostReply({
          type: "peer-webrtc-establish",
          token: peerToken(),
          sessionId,
          ...(remote === undefined ? {} : { remoteSignal: new TextDecoder().decode(remote.value) })
        }, 30_000);
        if (reply?.opened !== true) throw new Error(typeof reply?.error === "string" ? reply.error : "WebRTC data channel did not open");
        const listeners = new Set();
        webRtcRouteListeners.set(sessionId, listeners);
        if (!webRtcRoutePending.has(sessionId)) webRtcRoutePending.set(sessionId, []);
        webRtcSessionByFingerprint.set(peer.fingerprint, sessionId);
        return {
          authenticated: true,
          confirmed: true,
          fingerprint: peer.fingerprint,
          displayLabel: peer.displayLabel,
          rendezvous: adapter.kind,
          dataPlane: "webrtc",
          route: meterHostPeerRoute({
            async send(payload) {
              const sent = await requestHostReply({
                type: "peer-webrtc-data-send",
                token: peerToken(),
                sessionId,
                dataHex: bytesToHex(payload)
              }, 10_000);
              if (sent?.sent !== true) throw new Error("WebRTC data channel send failed");
            },
            subscribe(listener) {
              listeners.add(listener);
              for (const pending of webRtcRoutePending.get(sessionId)?.splice(0) ?? []) listener(pending);
              return () => listeners.delete(listener);
            },
            quality() {
              return {
                goodputBps: 2_000_000,
                rttMs: 50,
                mtu: 1_200,
                queueDepthBytes: outboundBandwidthLimiter.queueDepthBytes()
              };
            }
          }, { now: () => Date.now(), declaredBps: 2_000_000, declaredMtu: 1_200 }),
          async close() {
            webRtcRouteListeners.delete(sessionId);
            webRtcRoutePending.delete(sessionId);
            webRtcSessionByFingerprint.delete(peer.fingerprint);
            send({ type: "peer-webrtc-close", sessionId });
          }
        };
      }
      const node = await ensureReticulum(); const candidate = context.remoteInvitation.candidates.find((entry) => entry.kind === "reticulum"); const remoteIdentity = context.remoteInvitation.identityProof === undefined ? null : Identity.fromPublicKey(provider, context.remoteInvitation.identityProof);
      if (candidate === undefined || remoteIdentity === null) throw new Error("Authenticated Reticulum candidate is missing");
      const outbound = node.registerDestination({ provider, identity: remoteIdentity, direction: DestinationDirection.OUT, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", peerServiceAspect(context.remoteInvitation.service)] });
      if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) throw new Error("Reticulum candidate does not match the signed peer identity and service");
      if (!node.hasPath(outbound.hash)) { node.requestPath(outbound.hash); if (!await node.awaitPath(outbound.hash, 15)) throw new Error("No Reticulum path to the confirmed peer"); }
      const link = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Reticulum peer link timed out")), 30_000); outbound.requestLink({ linkEstablished(established) { clearTimeout(timer); resolve(established); }, linkClosed() { clearTimeout(timer); reject(new Error("Reticulum peer link closed during establishment")); } }); });
      peerLinks.set(peer.fingerprint, link); const routeListeners = new Set(); const routePending = []; const existingPacket = link.callbacks.packet; link.callbacks.packet = (data, packet) => { if (routeListeners.size === 0) { routePending.push(data.slice()); if (routePending.length > 16) routePending.shift(); } else { for (const listener of routeListeners) listener(data.slice()); } existingPacket?.(data, packet); }; return { authenticated: true, confirmed: true, fingerprint: peer.fingerprint, displayLabel: peer.displayLabel, rendezvous: adapter.kind, dataPlane: peer.dataPlane, route: meterHostPeerRoute({ async send(payload) { await link.send(payload); }, subscribe(listener) { routeListeners.add(listener); for (const pending of routePending.splice(0)) listener(pending); return () => routeListeners.delete(listener); }, quality() { return { goodputBps: link.attachedInterface?.bitrate ?? 2_000_000, rttMs: (link.rtt ?? 0) * 1_000, mtu: link.mtu, queueDepthBytes: outboundBandwidthLimiter.queueDepthBytes() }; } }, { now: () => Date.now(), declaredBps: link.attachedInterface?.bitrate ?? 2_000_000, declaredMtu: link.mtu }), async close() { peerLinks.delete(peer.fingerprint); await link.teardown(); } };
    }
  });
  peerSessionManager = new PeerSessionManager(registry, new InvitationPairingDriver({ backend })); return peerSessionManager;
}

const peerSessionManagerProxy = createPeerSessionManagerProxyFromState({
  getManager: () => peerSessionManager,
  ensurePeerSessionManager
});

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

  if (propagationServer !== null) {
    status.propagationStoreBytes = propagationServer.stats.usedBytes;
    status.propagationMessageCount = propagationServer.stats.messageCount;
    status.propagationEnabled = true;
    status.freenetPropagationRole = true;
  } else {
    status.propagationEnabled = false;
    status.freenetPropagationRole = false;
    status.propagationStoreBytes = 0;
    status.propagationMessageCount = 0;
  }

  send({ type: "status", status: { ...status } });
}

const statusTimer = createStatusTimer({ onTick: () => pushStatus() });
const startStatusTimer = statusTimer.start;
const stopStatusTimer = statusTimer.stop;

({ loadPropagationCache, createPersistence: createWorkletPropagationPersistence } =
  createWorkletPropagationPersistence({
    runtime,
    propagationStoreKey: PROPAGATION_STORE_KEY,
    getPropagationStoreCache: () => propagationStoreCache,
    setPropagationStoreCache: (cache) => {
      propagationStoreCache = cache;
    }
  }));

({ publishArchiveFromWorklet } = createPublishArchiveOps({
  provider,
  DestinationDirection,
  DestinationType,
  nodeFallback: false,
  casLocators,
  casResponseDestinations,
  ensureReticulum,
  resolveIdentity,
  ensurePackageDriveManager,
  log
}));

installFromT256 = createInstallFromT256({
  provider,
  runtime,
  nodeFallback: false,
  ensureEntryCasStore,
  waitForCasLocator,
  ensureReticulum,
  getReticulum: () => reticulum,
  resolveIdentity,
  ensurePackageDriveManager,
  ensureCatalog,
  ensureTrustStore,
  persistCatalogState,
  pushCatalog,
  ensureMiniappHost,
  requestHostReply
});

registerAnnounceHandler = createRegisterAnnounceHandler({
  getReticulum: () => reticulum,
  status,
  pushStatus,
  send,
  ingestCasLocator,
  respondToCasLocatorRequest,
  ensureCatalog,
  persistCatalogState,
  pushCatalog,
  log
});

ensureDevChannel = createEnsureDevChannel({
  createDevChannelClient,
  ensureMiniappHost,
  send,
  log
});

({ startAutoInterface, stopAutoInterface } = createAutoInterfaceOps({
  provider,
  runtime,
  status,
  pushStatus,
  log,
  ensureReticulum,
  getAutoIface: () => autoIface,
  setAutoIface: (value) => {
    autoIface = value;
  },
  getMulticastBridge: () => multicastBridge,
  setMulticastBridge: (value) => {
    multicastBridge = value;
  },
  getBonjourBridge: () => bonjourBridge,
  setBonjourBridge: (value) => {
    bonjourBridge = value;
  },
  getMulticastEntitled: () => multicastEntitled,
  getBonjourDiscoveryEnabled: () => bonjourDiscoveryEnabled,
  createIpcMulticastBridge,
  createIpcBonjourBridge
}));

quiesceInterfaces = createQuiesceInterfaces({
  log,
  pushStatus,
  stopTcpInterface,
  stopAutoInterface,
  stopBleInterface,
  stopRnodeInterface,
  stopFreenetInterface
});

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

function loadPacketLogWasm() {
  if (packetLogWasmCache !== null) {
    return packetLogWasmCache;
  }
  packetLogWasmCache = Uint8Array.from(Buffer.from(PACKET_LOG_WASM_BASE64, "base64"));
  return packetLogWasmCache;
}

function loadPropagationSetWasm() {
  if (propagationSetWasmCache !== null) {
    return propagationSetWasmCache;
  }
  propagationSetWasmCache = Uint8Array.from(
    Buffer.from(PROPAGATION_SET_WASM_BASE64, "base64")
  );
  return propagationSetWasmCache;
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

async function startFreenetInterface() {
  const url = status.freenetUrl;
  const rendezvousHex = status.freenetRendezvousHex;
  if (url === null || url.length === 0) {
    log("Freenet packet tunnel requires a WebSocket URL");
    status.freenetInterfaceOnline = false;
    pushStatus();
    return;
  }
  if (typeof rendezvousHex !== "string" || !/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
    log("Freenet packet tunnel requires a 64-character hex rendezvous");
    status.freenetInterfaceOnline = false;
    pushStatus();
    return;
  }
  if (freenetSharedClient === null) {
    log("Freenet packet tunnel requires an attached Freenet client");
    status.freenetInterfaceOnline = false;
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
    const wasm = loadPacketLogWasm();
    const backend = new FreenetContractPacketLogBackend({
      client: freenetSharedClient,
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
        ? "Freenet packet tunnel online"
        : "Freenet packet tunnel started; waiting for Freenet node"
    );
  } catch (error) {
    freenetIface = null;
    status.freenetInterfaceOnline = false;
    log(
      `Freenet packet tunnel failed: ${error instanceof Error ? error.message : String(error)}`
    );
  }
  pushStatus();
}

async function loadPropagationCache() {
  const raw = await runtime.store.get(PROPAGATION_STORE_KEY);
  if (raw === undefined) {
    propagationStoreCache = { entries: [] };
    return;
  }
  try {
    propagationStoreCache = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    propagationStoreCache = { entries: [] };
  }
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

async function stopFreenetPropagationRole() {
  propagationServer = null;
  propagationDestination = null;
  status.propagationEnabled = false;
  status.freenetPropagationRole = false;
  status.propagationStoreBytes = 0;
  status.propagationMessageCount = 0;
}

async function startFreenetPropagationRole(mirror) {
  await stopFreenetPropagationRole();
  await loadPropagationCache();
  await ensureReticulum();
  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("Propagation role requires a host identity");
  }
  const node = reticulum;
  if (node === null) {
    throw new Error("Propagation role requires a running Reticulum node");
  }

  propagationServer = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
    now: () => Date.now(),
    schedule: (ms, callback) => {
      const handle = setTimeout(callback, ms);
      return { cancel: () => clearTimeout(handle) };
    },
    persistence: createWorkletPropagationPersistence(),
    remoteMirror: mirror
  });
  propagationDestination = createPropagationDestination(provider, node, identity);
  propagationServer.registerHandlers(propagationDestination);
  await propagationDestination.announce();
  await propagationServer.pullRemoteMirror().catch(() => {
    // Offline Freenet must not block grant activation.
  });
  status.propagationEnabled = true;
  status.freenetPropagationRole = true;
  status.propagationStoreBytes = propagationServer.stats.usedBytes;
  status.propagationMessageCount = propagationServer.stats.messageCount;
  log("Freenet-backed LXMF propagation role started");
}

async function detachFreenetBackends() {
  await stopFreenetPropagationRole();
  await stopFreenetInterface();
  freenetPropagationStore = null;
  status.freenetPropagationAttached = false;
  if (freenetBackendImpl !== null) {
    await freenetBackendImpl.close().catch(() => {});
    freenetBackendImpl = null;
  }
  if (freenetSharedClient !== null) {
    await freenetSharedClient.close().catch(() => {});
    freenetSharedClient = null;
  }
  status.freenetConfigured = false;
}

async function attachFreenetBackends() {
  await detachFreenetBackends();
  await ensureBareWebSocket();

  const enabled = status.freenetEnabled === true;
  const url = status.freenetUrl;
  if (!enabled || url === null || url.length === 0) {
    if (enabled) {
      log("Freenet remote grant enabled without a URL; backends not attached");
    } else {
      log("Freenet remote node revoked");
    }
    pushStatus();
    return;
  }

  const clientOptions = {
    url,
    ...(pendingFreenetAuthToken === null ? {} : { authToken: pendingFreenetAuthToken })
  };
  freenetSharedClient = new FreenetClient(clientOptions);

  if (freenetCapabilities.contractReads) {
    freenetBackendImpl = new FreenetClientContractBackend({
      client: freenetSharedClient
    });
    status.freenetConfigured = true;
    log(
      `Freenet contract backend attached (reads=${freenetCapabilities.contractReads} writes=${freenetCapabilities.contractWrites})`
    );
  } else {
    status.freenetConfigured = false;
    log("Freenet grant has no contract reads; contract backend not attached");
  }

  if (freenetCapabilities.propagation) {
    try {
      const wasm = loadPropagationSetWasm();
      freenetPropagationStore = new FreenetPropagationStore({
        client: freenetSharedClient,
        wasm,
        updateOptions: { fallbackCodeField: wasm }
      });
      status.freenetPropagationAttached = true;
      log("Freenet propagation mirror attached");
      await startFreenetPropagationRole(freenetPropagationStore);
    } catch (error) {
      freenetPropagationStore = null;
      status.freenetPropagationAttached = false;
      await stopFreenetPropagationRole();
      log(
        `Freenet propagation attach failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  if (freenetCapabilities.packetTunnel) {
    await startFreenetInterface();
  }

  pushStatus();
}

function anyRelayOrFreenetEnabled() {
  return (
    status.tcpEnabled === true ||
    status.autoEnabled === true ||
    status.bleEnabled === true ||
    status.rnodeEnabled === true ||
    (status.freenetEnabled === true && freenetCapabilities.packetTunnel === true)
  );
}

async function stopNode() {
  stopStatusTimer();
  status.running = false;
  status.linkOnline = false;
  nodeSuspended = false;
  pushStatus();

  await stopFreenetPropagationRole();
  await stopTcpInterface();
  await stopAutoInterface();
  await stopBleInterface();
  await stopRnodeInterface();
  await stopFreenetInterface();
  await stopHostLxmfDelivery();

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
  if (hostLxmfDelivery !== null) {
    await hostLxmfDelivery.announce().catch((error) => {
      log(`Host LXMF re-announce deferred: ${error instanceof Error ? error.message : String(error)}`);
    });
  }
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
    outboundBandwidthLimiter
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
  await ensureHostLxmfDelivery().catch((error) => {
    log(`Host LXMF delivery deferred: ${error instanceof Error ? error.message : String(error)}`);
  });
  return reticulum;
}

/**
 * Always-on LXMF delivery so session invites raise chrome without a mounted
 * test agent. Mobile announces once at start and again on foreground resume —
 * no periodic timer (battery policy).
 */
async function ensureHostLxmfDelivery() {
  if (hostLxmfDelivery !== null) {
    return hostLxmfDelivery;
  }
  const node = await ensureReticulum();
  const identity = await resolveIdentity();
  if (identity === null) {
    throw new Error("identity unavailable");
  }
  hostLxmfDelivery = await createHostLxmfDelivery({
    reticulum: node,
    provider,
    identity,
    announceIntervalMs: 0,
    receiveSessionInvite: (invite) => ensureMiniappHost().receiveSessionInvite(invite),
    isInvitableApp: (appId) => {
      const { installedStore: installed } = ensureCatalog();
      return installed.activeVersion(appId) !== undefined || appId === "line-check";
    },
    log
  });
  log(`Host LXMF delivery ready (${hostLxmfDelivery.lxmfAddress.slice(0, 12)}…)`);
  return hostLxmfDelivery;
}

async function stopHostLxmfDelivery() {
  if (hostLxmfDelivery === null) {
    return;
  }
  await hostLxmfDelivery.stop();
  hostLxmfDelivery = null;
}

async function startTcpInterface(targetHost, targetPort) {
  const node = await ensureReticulum();
  if (tcpIface !== null) {
    status.linkOnline = tcpIface.online;
    pushStatus();
    return tcpIface.online;
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
  serialBridge = createIpcSerialBridge({
    deviceId: pendingRnodeDeviceId,
    baudRate: pendingRnodeBaudRate
  });
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

  if (!anyRelayOrFreenetEnabled()) {
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

  if (status.freenetEnabled && freenetCapabilities.packetTunnel) {
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
    const nextNtfyUrl = typeof message.ntfyUrl === "string" && message.ntfyUrl.trim() !== "" ? message.ntfyUrl.trim() : null;
    if (nextNtfyUrl !== ntfyUrl) { ntfyUrl = nextNtfyUrl; peerSessionManager = null; }
    multicastEntitled = message.multicastEntitled !== false;
    bonjourDiscoveryEnabled = message.bonjourEnabled !== false;
    if (status.tcpEnabled) {
      await applyInterfaceConfig();
    } else {
      log(`Target set to ${message.targetHost}:${message.targetPort} (enable TCP to connect)`);
    }
    return;
  }

  if (
    message.type === "peer-chrome-response" ||
    message.type === "confirm-response" ||
    message.type === "launch-confirm" ||
    message.type === "install-confirm" ||
    message.type === "device-bridge-response" ||
    message.type === "media-opus-duplex-response" ||
    message.type === "media-opus-play-response" ||
    message.type === "media-codec-response"
  ) {
    hostReplyChannel.resolveReply(message);
    return;
  }

  if (message.type === "peer-webrtc-data") {
    const listeners = webRtcRouteListeners.get(message.sessionId);
    const payload = hexToBytes(message.dataHex);
    if (listeners === undefined || listeners.size === 0) {
      const pending = webRtcRoutePending.get(message.sessionId) ?? [];
      pending.push(payload);
      if (pending.length > 16) pending.shift();
      webRtcRoutePending.set(message.sessionId, pending);
    } else {
      for (const listener of listeners) listener(payload);
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

  if (message.type === "install-from-256t") {
    try {
      const result = await installFromT256(message.t256.trim());
      send({ type: "install-256t-result", ok: true, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      log(`Install from 256t failed: ${detail}`);
      send({ type: "install-256t-result", ok: false, error: detail });
    }
    return;
  }

  if (message.type === "trust-list") {
    await pushTrustList();
    return;
  }

  if (message.type === "trust-add") {
    try {
      await importTrustedPublisher(
        message.identityString,
        message.label ?? "Unnamed publisher",
        message.source ?? "paste"
      );
      log(`Trusted publisher ${message.label ?? "Unnamed publisher"}`);
    } catch (error) {
      log(`Trust add failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    await pushTrustList();
    return;
  }

  if (message.type === "trust-remove") {
    await ensureTrustStore().remove(message.publisherPublicKey);
    await pushTrustList();
    return;
  }

  if (message.type === "trust-show") {
    const identity = await resolveIdentity();
    send({
      type: "trust-identity",
      identity256t: identity === null ? null : encodePublisherIdentity256t(identity.getPublicKey())
    });
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

  if (message.type === "device-test-seed-share") {
    try {
      const offer = await ensureMiniappHost().seedShareOfferForTest({
        appId: message.appId,
        displayLabel: message.displayLabel,
        classId: message.classId,
        ttlMs: message.ttlMs
      });
      log(`Seeded share offer ${offer.id} for ${offer.displayLabel}`);
    } catch (error) {
      log(`Seed share offer failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "session-invite-accept") {
    try {
      await ensureMiniappHost().acceptSessionInvite(message.id);
      log(`Accepted session invite ${message.id}`);
    } catch (error) {
      log(`Session invite accept failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "session-invite-decline") {
    try {
      ensureMiniappHost().declineSessionInvite(message.id);
      log(`Declined session invite ${message.id}`);
    } catch (error) {
      log(`Session invite decline failed: ${error instanceof Error ? error.message : String(error)}`);
    }
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

  if (message.type === "benchmark-miniapp") {
    try {
      const result = await ensureMiniappHost().benchmark();
      send({ type: "miniapp-benchmark", result });
      log(
        `Bare worker benchmark: spawn ${result.spawnMs}ms, kill ${result.killMs}ms, ` +
          `busy-loop ${result.busyLoopKillMs}ms, wasm=${result.wasmExecuted}`
      );
    } catch (error) {
      log(`Benchmark failed: ${error instanceof Error ? error.message : String(error)}`);
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

  if (message.type === "connect-test-agent") {
    if (testAgent !== null) {
      log("Test agent already mounted");
      return;
    }

    try {
      const node = await ensureReticulum();
      const identity = await resolveIdentity();
      if (identity === null) {
        throw new Error("identity unavailable");
      }

      testAgent = await connectTestAgent({
        reticulum: node,
        provider,
        identity,
        label: message.label,
        platform: message.platform ?? "mobile",
        host: message.host,
        port: message.port,
        log,
        handleCommand: (request) => ensureCrossDeviceTestDriver()(request),
        delivery: await ensureHostLxmfDelivery(),
        receiveSessionInvite: (invite) => ensureMiniappHost().receiveSessionInvite(invite),
        acceptSessionInvite: async (inviteId) => {
          try {
            await ensureMiniappHost().acceptSessionInvite(inviteId);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (!message.startsWith("No installed version for ")) {
              throw error;
            }
            log(`Session invite ${inviteId} accepted without launch (${message})`);
          }
        }
      });
      log(`Test agent mounted as ${message.label} (lxmf ${testAgent.lxmfAddress})`);
    } catch (error) {
      log(`Test agent mount failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    return;
  }

  if (message.type === "join-community-network") {
    await joinCommunityNetwork();
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

  if (message.type === "set-freenet-config") {
    const enabled = message.enabled === true;
    const url =
      typeof message.url === "string" && message.url.length > 0 ? message.url : null;
    const authToken =
      typeof message.authToken === "string" && message.authToken.length > 0
        ? message.authToken
        : undefined;
    const rendezvousHex =
      typeof message.rendezvousHex === "string" && message.rendezvousHex.length > 0
        ? message.rendezvousHex
        : null;
    const localDirection = message.localDirection === 1 ? 1 : 0;
    const caps = message.capabilities ?? {
      contractReads: false,
      contractWrites: false,
      packetTunnel: false,
      propagation: false
    };
    freenetCapabilities = {
      contractReads: caps.contractReads === true,
      contractWrites: caps.contractWrites === true,
      packetTunnel: caps.packetTunnel === true,
      propagation: caps.propagation === true
    };
    status.freenetEnabled = enabled;
    status.freenetUrl = url;
    status.freenetRendezvousHex = rendezvousHex;
    status.freenetContractReads = freenetCapabilities.contractReads;
    status.freenetContractWrites = freenetCapabilities.contractWrites;
    status.freenetPacketTunnel = freenetCapabilities.packetTunnel;
    status.freenetPropagation = freenetCapabilities.propagation;
    pendingFreenetAuthToken = authToken ?? null;
    pendingFreenetLocalDirection = localDirection;
    await attachFreenetBackends();
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

  if (message.type === "peer-bluetooth-frame") {
    try { receiveBluetoothFrame(hexToBytes(message.frameHex)); }
    catch (error) { log(`Rejected BLE invitation frame: ${error instanceof Error ? error.message : String(error)}`); }
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

let hostMessageBuffer = "";
let hostMessageQueue = Promise.resolve();
const HOST_REPLY_TYPES = new Set([
  "confirm-response",
  "launch-confirm",
  "install-confirm",
  "peer-chrome-response",
  "device-bridge-response",
  "media-codec-response",
  "media-opus-play-response",
  "media-opus-duplex-response"
]);

IPC.on("data", (data) => {
  hostMessageBuffer += data.toString();
  const lines = hostMessageBuffer.split("\n");
  hostMessageBuffer = lines.pop() ?? "";
  for (const line of lines) {
    if (line.trim().length === 0) {
      continue;
    }
    // Replies must not wait behind other host-message handlers: those handlers
    // often await requestHostReply, which would deadlock if the matching
    // device-bridge-response / peer-chrome-response sat on this queue.
    try {
      const parsed = JSON.parse(line);
      if (parsed && HOST_REPLY_TYPES.has(parsed.type)) {
        if (!hostReplyChannel.resolveReply(parsed)) {
          log(
            `Orphan host reply ${parsed.type} token=${typeof parsed.token === "string" ? parsed.token.slice(0, 12) : "?"}`
          );
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

void loadPersistedIdentity().then(() => loadCatalogState().then(pushCatalog));
pushStatus();
log(`Harness worklet ready (crypto: ${provider.name})`);
