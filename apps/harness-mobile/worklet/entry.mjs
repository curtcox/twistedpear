/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import { installBareWebSocketGlobal } from "../../../conformance/freenet-spike/bare-websocket-shim.mjs";
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
  createDevChannelClient,
  createHostReplyChannel,
  createMiniappAnnounceService,
  createStatusTimer,
  createWorkletMiniappHost
} from "../../../packages/worklet-core/src/index.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import { CatalogStore, InstalledPackageStore, decodeAppAnnounceData, unpackPackage, verifyPackage } from "../../../packages/app-registry/dist/index.js";
import { PackageResourceClient, assessFetchBudget, fetchPackage } from "../../../packages/bridge-hyper/dist/worklet.js";
import { HOST_API_VERSION, createWorkletFlagRelayService, validateManifestCapabilities } from "../../../packages/miniapp-runtime/dist/worklet.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "../../../packages/lxmf-ts/dist/index.js";
import { decodePeerAudioFrame, decodePeerInvitation, framePeerAudioPayload, initialPeerAudioAssemblyState, stepPeerAudioAssembly } from "../../../packages/protocol/dist/index.js";
import { refuseStorePosture, shouldRefuseDeveloperMode } from "./store-posture-policy.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";
import { AudioPeerDiscoveryAdapter, BluetoothPeerDiscoveryAdapter, CryptoPeerPairingBackend, InvitationPairingDriver, ManualPeerDiscoveryAdapter, NtfyPeerDiscoveryAdapter, NtfyRendezvousClient, PeerDiscoveryRegistry, PeerSessionManager, QrPeerDiscoveryAdapter, ReticulumPeerDiscoveryAdapter, UnavailablePeerDiscoveryAdapter } from "../../../packages/peer-discovery/dist/index.js";

const { IPC } = BareKit;
const HOST_BANDWIDTH_BYTES_PER_SECOND = 512 * 1024;
installBareWebSocketGlobal();

function createProvider() {
  try {
    return new BareCryptoProvider();
  } catch {
    return new PureCryptoProvider();
  }
}

const provider = createProvider();
const runtime = bareRuntime({ storePath: "reticulum-store" });
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
      browserDeviceClasses: ["location", "camera", "haptics"],
      enableBenchmark: true,
      getPresenceSnapshot: () => ({ ...status, autoPeers: status.autoPeers + (peerSessionManager?.routes.list().length ?? 0) }),
      peerSessionManager: peerSessionManagerProxy,
      relayService,
      freenetBackend: freenetBackendProxy,
      announceService: transportAnnounceService,
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

const hostReplyChannel = createHostReplyChannel({ send });
const requestHostReply = hostReplyChannel.requestReply;

function peerToken() { return bytesToHex(provider.randomBytes(16)); }
const peerChrome = {
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

function peerServiceAspect(service) { return bytesToHex(provider.sha256(new TextEncoder().encode(service)).subarray(0, 16)); }
function receiveAutomaticAnswer(data) {
  try {
    const invitation = decodePeerInvitation(data, Date.now()); if (invitation.role !== "answer") return;
    const key = bytesToHex(invitation.sessionId); const waiter = automaticAnswerWaiters.get(key); if (waiter === undefined) return;
    automaticAnswerWaiters.delete(key); automaticOfferKeys.delete(waiter.adapterSessionId); waiter.resolve(data);
  } catch { /* Drop hostile signaling payloads. */ }
}
async function ensurePeerLinkDestination(identity, service) {
  const node = await ensureReticulum(); const aspect = peerServiceAspect(service); let destination = peerLinkDestinations.get(aspect);
  if (destination === undefined) {
    destination = node.registerDestination({ provider, identity, direction: DestinationDirection.IN, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", aspect] });
    destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    destination.setLinkEstablishedCallback((link) => { const existing = link.callbacks.packet; link.callbacks.packet = (data, packet) => { receiveAutomaticAnswer(data); existing?.(data, packet); }; });
    peerLinkDestinations.set(aspect, destination);
  }
  return destination;
}
async function ensureAutomaticDiscoveryListener(service, identity) {
  const node = await ensureReticulum(); const aspect = peerServiceAspect(service); if (automaticDiscoveryHandlers.has(aspect)) return aspect;
  node.registerAnnounceHandler({ aspectFilter: `tp.peer-discovery.${aspect}`, receivedAnnounce(info) {
    if (info.appData === null || bytesToHex(info.announcedIdentity.hash) === bytesToHex(identity.hash)) return;
    try {
      const offer = decodePeerInvitation(info.appData, Date.now()); if (offer.role !== "offer" || offer.service !== service) return;
      const session = { id: `auto:${bytesToHex(offer.sessionId)}`, kind: "reticulum" }; const inbound = { session, envelope: info.appData }; automaticInboundRoutes.set(session.id, offer);
      const waiters = automaticInboundWaiters.get(aspect) ?? []; const waiter = waiters.shift();
      if (waiter !== undefined) waiter(inbound); else { const bucket = automaticInboundBuckets.get(aspect) ?? []; bucket.push(inbound); automaticInboundBuckets.set(aspect, bucket.slice(-32)); }
      automaticInboundWaiters.set(aspect, waiters);
    } catch { /* Drop malformed announce data. */ }
  } });
  automaticDiscoveryHandlers.add(aspect); return aspect;
}
function automaticReticulumChannel(identity) {
  return {
    async availability() { return reticulum !== null && status.onlineInterfaces > 0 ? { state: "available", reason: "Reticulum announce and Link signaling are online" } : { state: "offline", reason: "No online Reticulum interface is available for automatic discovery" }; },
    async *offer(session, envelope) {
      const node = await ensureReticulum(); const invitation = decodePeerInvitation(envelope, Date.now()); const key = bytesToHex(invitation.sessionId); automaticOfferKeys.set(session.id, key);
      const answer = new Promise((resolve, reject) => automaticAnswerWaiters.set(key, { resolve, reject, adapterSessionId: session.id })); const aspect = peerServiceAspect(invitation.service); let destination = automaticDiscoveryDestinations.get(aspect);
      if (destination === undefined) { destination = node.registerDestination({ provider, identity, direction: DestinationDirection.IN, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer-discovery", aspect] }); automaticDiscoveryDestinations.set(aspect, destination); }
      await destination.announce({ appData: envelope }); yield await answer;
    },
    async *listen(options) {
      const aspect = await ensureAutomaticDiscoveryListener(options.service, identity); const bucket = automaticInboundBuckets.get(aspect) ?? []; const immediate = bucket.shift(); automaticInboundBuckets.set(aspect, bucket);
      if (immediate !== undefined) { yield immediate; return; }
      yield await new Promise((resolve) => { const waiters = automaticInboundWaiters.get(aspect) ?? []; waiters.push(resolve); automaticInboundWaiters.set(aspect, waiters); });
    },
    async answer(session, envelope) {
      const offer = automaticInboundRoutes.get(session.id); automaticInboundRoutes.delete(session.id); const candidate = offer?.candidates.find((entry) => entry.kind === "reticulum"); const remoteIdentity = offer?.identityProof === undefined ? null : Identity.fromPublicKey(provider, offer.identityProof);
      if (offer === undefined || candidate === undefined || remoteIdentity === null) throw new Error("Automatic Reticulum offer has no authenticated return destination");
      const node = await ensureReticulum(); const outbound = node.registerDestination({ provider, identity: remoteIdentity, direction: DestinationDirection.OUT, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", peerServiceAspect(offer.service)] });
      if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) throw new Error("Automatic Reticulum return destination does not match the signed offer");
      if (!node.hasPath(outbound.hash)) { node.requestPath(outbound.hash); if (!await node.awaitPath(outbound.hash, 15)) throw new Error("No Reticulum path for automatic discovery answer"); }
      const link = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Automatic Reticulum answer link timed out")), 30_000); outbound.requestLink({ linkEstablished(established) { clearTimeout(timer); resolve(established); }, linkClosed() { clearTimeout(timer); reject(new Error("Automatic Reticulum answer link closed")); } }); });
      await link.send(envelope); setTimeout(() => { void link.teardown(); }, 1_000);
    },
    async cancel(sessionId) { automaticInboundRoutes.delete(sessionId); const key = automaticOfferKeys.get(sessionId); if (key !== undefined) { automaticOfferKeys.delete(sessionId); const waiter = automaticAnswerWaiters.get(key); automaticAnswerWaiters.delete(key); waiter?.reject(new Error("Automatic Reticulum discovery cancelled")); } }
  };
}

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
    displayLabel: `TwistedPear ${bytesToHex(identity.hash).slice(0, 8)}`, capabilities: ["reticulum"], entropy: async (length) => provider.randomBytes(length), candidates: async (request) => { const destination = await ensurePeerLinkDestination(identity, request.service); await destination.announce(); return [{ kind: "reticulum", value: destination.hash }]; }, confirm: (peer, request) => peerChrome.confirm(peer, request),
    async establish(context, peer, adapter) {
      const node = await ensureReticulum(); const candidate = context.remoteInvitation.candidates.find((entry) => entry.kind === "reticulum"); const remoteIdentity = context.remoteInvitation.identityProof === undefined ? null : Identity.fromPublicKey(provider, context.remoteInvitation.identityProof);
      if (candidate === undefined || remoteIdentity === null) throw new Error("Authenticated Reticulum candidate is missing");
      const outbound = node.registerDestination({ provider, identity: remoteIdentity, direction: DestinationDirection.OUT, type: DestinationType.SINGLE, appName: "tp", aspects: ["peer", peerServiceAspect(context.remoteInvitation.service)] });
      if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) throw new Error("Reticulum candidate does not match the signed peer identity and service");
      if (!node.hasPath(outbound.hash)) { node.requestPath(outbound.hash); if (!await node.awaitPath(outbound.hash, 15)) throw new Error("No Reticulum path to the confirmed peer"); }
      const link = await new Promise((resolve, reject) => { const timer = setTimeout(() => reject(new Error("Reticulum peer link timed out")), 30_000); outbound.requestLink({ linkEstablished(established) { clearTimeout(timer); resolve(established); }, linkClosed() { clearTimeout(timer); reject(new Error("Reticulum peer link closed during establishment")); } }); });
      peerLinks.set(peer.fingerprint, link); return { authenticated: true, confirmed: true, fingerprint: peer.fingerprint, displayLabel: peer.displayLabel, rendezvous: adapter.kind, dataPlane: peer.dataPlane, route: { async send(payload) { await link.send(payload); } }, async close() { peerLinks.delete(peer.fingerprint); await link.teardown(); } };
    }
  });
  peerSessionManager = new PeerSessionManager(registry, new InvitationPairingDriver({ backend })); return peerSessionManager;
}

const peerSessionManagerProxy = {
  async request(appId, runtimeId, request) { return (await ensurePeerSessionManager()).request(appId, runtimeId, request); },
  async listen(appId, runtimeId, request) { return (await ensurePeerSessionManager()).listen(appId, runtimeId, request); },
  async diagnostics() { return (await ensurePeerSessionManager()).diagnostics(); },
  info(appId, runtimeId, handle) { if (peerSessionManager === null) throw new Error("Unknown peer handle"); return peerSessionManager.info(appId, runtimeId, handle); },
  async close(appId, runtimeId, handle) { if (peerSessionManager !== null) await peerSessionManager.close(appId, runtimeId, handle); },
  async closeRuntime(appId, runtimeId) { if (peerSessionManager !== null) await peerSessionManager.closeRuntime(appId, runtimeId); }
};

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
  return reticulum;
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

  if (message.type === "peer-chrome-response" || message.type === "confirm-response" || message.type === "device-bridge-response") {
    hostReplyChannel.resolveReply(message);
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

IPC.on("data", (data) => {
  handleHostMessage(data).catch((error) => {
    log(`Worklet error: ${error instanceof Error ? error.message : String(error)}`);
    pushStatus();
  });
});

void loadPersistedIdentity().then(() => loadCatalogState().then(pushCatalog));
pushStatus();
log(`Harness worklet ready (crypto: ${provider.name})`);
