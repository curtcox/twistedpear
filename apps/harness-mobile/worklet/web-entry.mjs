/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */

import { createWebLeafHost } from "../../../packages/host-core/dist/web.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { createWebPackageStorage } from "../../../packages/host-core/dist/web.js";
import {
  sessionInviteContent,
  SESSION_INVITE_TITLE
} from "../../../packages/host-core/dist/session-invite-carrier.js";
import { encodeDeviceStreamFrame, encodeSessionInviteEnvelope } from "../../../packages/protocol/dist/index.js";
import { LXMessageMethod } from "../../../packages/lxmf-ts/dist/index.js";
import {
  Identity,
  BandwidthLimiter,
  DestinationDirection,
  DestinationType,
  PureCryptoProvider,
  Reticulum,
  bytesToHex,
  hexToBytes,
  hasWebIdentity,
  loadOrCreateWebIdentity,
  persistWebIdentity,
  resetWebIdentity,
  webRuntime
} from "../../../packages/reticulum-ts/dist/web.js";
import { createWebWorkletMiniappHost } from "./web-miniapp-host.mjs";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import {
  createHostReplyChannel,
  createCrossDeviceTestDriver,
  createHarnessPeerPair,
  createMiniappAnnounceService,
  createStatusTimer
} from "../../../packages/worklet-core/src/index.mjs";
import { createWebInstallService } from "./web-install.mjs";
import { createWebPublishService } from "./web-publish.mjs";
import { createWebSerialPipe } from "./web-serial-pipe.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  unpackPackage
} from "../../../packages/app-registry/dist/index.js";
import {
  CasStore,
  casRequestAspects,
  encodeCasLocator,
  encodeCasLocatorRequest
} from "../../../packages/cas-256t/dist/index.js";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/dist/host-api.js";
import { reviveJsonWireValue } from "../../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import {
  AudioPeerDiscoveryAdapter,
  CryptoPeerPairingBackend,
  InvitationPairingDriver,
  ManualPeerDiscoveryAdapter,
  meterHostPeerRoute,
  NtfyPeerDiscoveryAdapter,
  NtfyRendezvousClient,
  PeerDiscoveryRegistry,
  PeerSessionManager,
  QrPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter
} from "../../../packages/peer-discovery/dist/index.js";
import { ensureCrossDeviceTestDriverImpl } from "./web-entry-ensureCrossDeviceTestDriver.mjs";
import { handleWebRtcHarnessCommandImpl } from "./web-entry-handleWebRtcHarnessCommand.mjs";
import { ensureMiniappHostImpl } from "./web-entry-ensureMiniappHost.mjs";
import { ensureInstallServiceImpl } from "./web-entry-ensureInstallService.mjs";
import { ensurePeerSessionManagerImpl } from "./web-entry-ensurePeerSessionManager.mjs";
import { startHostSessionImpl } from "./web-entry-startHostSession.mjs";
import { handleHostMessageImpl } from "./web-entry-handleHostMessage.mjs";

const extractedContext = {
  get DEFAULT_PASSPHRASE() { return DEFAULT_PASSPHRASE; },
  get applyInterfaceConfig() { return applyInterfaceConfig; },
  set applyInterfaceConfig(value) { applyInterfaceConfig = value; },
  get attachWebRtcMediaTrack() { return attachWebRtcMediaTrack; },
  set attachWebRtcMediaTrack(value) { attachWebRtcMediaTrack = value; },
  get createIdentity() { return createIdentity; },
  set createIdentity(value) { createIdentity = value; },
  get crossDeviceTestDriver() { return crossDeviceTestDriver; },
  set crossDeviceTestDriver(value) { crossDeviceTestDriver = value; },
  get cryptoProvider() { return cryptoProvider; },
  get ensureCrossDeviceTestDriver() { return ensureCrossDeviceTestDriver; },
  set ensureCrossDeviceTestDriver(value) { ensureCrossDeviceTestDriver = value; },
  get ensureInstallService() { return ensureInstallService; },
  set ensureInstallService(value) { ensureInstallService = value; },
  get ensureMiniappHost() { return ensureMiniappHost; },
  set ensureMiniappHost(value) { ensureMiniappHost = value; },
  get ensureMiniappKvStore() { return ensureMiniappKvStore; },
  set ensureMiniappKvStore(value) { ensureMiniappKvStore = value; },
  get ensurePackageStorage() { return ensurePackageStorage; },
  set ensurePackageStorage(value) { ensurePackageStorage = value; },
  get ensurePeerSessionManager() { return ensurePeerSessionManager; },
  set ensurePeerSessionManager(value) { ensurePeerSessionManager = value; },
  get ensurePublishService() { return ensurePublishService; },
  set ensurePublishService(value) { ensurePublishService = value; },
  get handleSandboxHostMessage() { return handleSandboxHostMessage; },
  set handleSandboxHostMessage(value) { handleSandboxHostMessage = value; },
  get handleSerialHostMessage() { return handleSerialHostMessage; },
  set handleSerialHostMessage(value) { handleSerialHostMessage = value; },
  get handleWebRtcHarnessCommand() { return handleWebRtcHarnessCommand; },
  set handleWebRtcHarnessCommand(value) { handleWebRtcHarnessCommand = value; },
  get harnessInviteEntries() { return harnessInviteEntries; },
  get harnessPeerPair() { return harnessPeerPair; },
  get helloDevBundle() { return helloDevBundle; },
  get hostLxmfDelivery() { return hostLxmfDelivery; },
  set hostLxmfDelivery(value) { hostLxmfDelivery = value; },
  get hostReplyChannel() { return hostReplyChannel; },
  get hostSession() { return hostSession; },
  set hostSession(value) { hostSession = value; },
  get identityOptions() { return identityOptions; },
  set identityOptions(value) { identityOptions = value; },
  get importIdentity() { return importIdentity; },
  set importIdentity(value) { importIdentity = value; },
  get installService() { return installService; },
  set installService(value) { installService = value; },
  get loadHyperFetch() { return loadHyperFetch; },
  set loadHyperFetch(value) { loadHyperFetch = value; },
  get locatorRequestDestinations() { return locatorRequestDestinations; },
  get log() { return log; },
  set log(value) { log = value; },
  get miniappHost() { return miniappHost; },
  set miniappHost(value) { miniappHost = value; },
  get mockAiChat() { return mockAiChat; },
  set mockAiChat(value) { mockAiChat = value; },
  get mockLocalPublish() { return mockLocalPublish; },
  set mockLocalPublish(value) { mockLocalPublish = value; },
  get nextHarnessInvite() { return nextHarnessInvite; },
  set nextHarnessInvite(value) { nextHarnessInvite = value; },
  get peerChrome() { return peerChrome; },
  get peerSessionManager() { return peerSessionManager; },
  set peerSessionManager(value) { peerSessionManager = value; },
  get peerSessionManagerProxy() { return peerSessionManagerProxy; },
  get peerToken() { return peerToken; },
  set peerToken(value) { peerToken = value; },
  get pendingRnodeBaudRate() { return pendingRnodeBaudRate; },
  set pendingRnodeBaudRate(value) { pendingRnodeBaudRate = value; },
  get pushInstalledList() { return pushInstalledList; },
  set pushInstalledList(value) { pushInstalledList = value; },
  get pushStatus() { return pushStatus; },
  set pushStatus(value) { pushStatus = value; },
  get refreshIdentityStatus() { return refreshIdentityStatus; },
  set refreshIdentityStatus(value) { refreshIdentityStatus = value; },
  get refreshStorageStatus() { return refreshStorageStatus; },
  set refreshStorageStatus(value) { refreshStorageStatus = value; },
  get requestHostReply() { return requestHostReply; },
  get resetIdentity() { return resetIdentity; },
  set resetIdentity(value) { resetIdentity = value; },
  get send() { return send; },
  set send(value) { send = value; },
  get startHostSession() { return startHostSession; },
  set startHostSession(value) { startHostSession = value; },
  get startStatusTimer() { return startStatusTimer; },
  get status() { return status; },
  get stopHostSession() { return stopHostSession; },
  set stopHostSession(value) { stopHostSession = value; },
  get transportAnnounceService() { return transportAnnounceService; },
  get webConfig() { return webConfig; },
  set webConfig(value) { webConfig = value; },
  get webOutboundBandwidthLimiter() { return webOutboundBandwidthLimiter; },
  get webRtcRouteListeners() { return webRtcRouteListeners; },
  get webRtcRoutePending() { return webRtcRoutePending; },
  get webRtcSessionByFingerprint() { return webRtcSessionByFingerprint; },
};


const IDENTITY_STORE_NAME = "twistedpear-harness-web-identity";
const PACKAGE_STORE_NAME = "twistedpear-harness-web-packages";
const MINIAPP_KV_STORE_NAME = "twistedpear-harness-web-miniapp-kv";
const DEFAULT_PASSPHRASE = "harness-web-dev";
const KV_OBJECT_STORE = "kv";
const HOST_BANDWIDTH_BYTES_PER_SECOND = 512 * 1024;
const webOutboundBandwidthLimiter = new BandwidthLimiter(webRuntime().clock, HOST_BANDWIDTH_BYTES_PER_SECOND);

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
  gatewayUrl: null,
  lxmfAddress: null
};

/** @type {{ gatewayUrl: string; sharedToken?: string; identityPassphrase: string; ntfyUrl?: string; ntfyToken?: string }} */
let webConfig = {
  gatewayUrl: "",
  identityPassphrase: DEFAULT_PASSPHRASE
};

/** @type {Awaited<ReturnType<typeof createWebLeafHost>> | null} */
let hostSession = null;
/** @type {Awaited<ReturnType<typeof createHostLxmfDelivery>> | null} */
let hostLxmfDelivery = null;
/** @type {Array<Record<string, unknown>>} */
const harnessInviteEntries = [];
let nextHarnessInvite = 0;
/** @type {import("../../../packages/reticulum-ts/dist/web.js").Reticulum | null} */
let standaloneReticulum = null;
/** @type {Awaited<ReturnType<typeof createWebPackageStorage>> | null} */
let packageStorage = null;
/** @type {ReturnType<typeof createWebWorkletMiniappHost> | null} */
let miniappHost = null;
/** @type {ReturnType<typeof createWebInstallService> | null} */
let installService = null;
/** @type {ReturnType<typeof createWebPublishService> | null} */
let publishService = null;
const locatorRequestDestinations = new Map();
/** @type {ReturnType<typeof createWebSerialPipe> | null} */
let serialBridge = null;
/** @type {import("../../../packages/reticulum-interfaces/dist/rnode/interface.js").RNodeInterface | null} */
let rnodeIface = null;
/** @type {number} */
let pendingRnodeBaudRate = 115_200;
/** @type {Promise<{ fetchDriveVersionForWeb: Function; dhtRelayUrlFromGateway: Function }> | null} */
let hyperFetchModule = null;
/** @type {PureCryptoProvider} */
const cryptoProvider = new PureCryptoProvider();
/** @type {ReturnType<typeof createMiniappKvStore> | null} */
let miniappKvStore = null;
let peerSessionManager = null;
const webRtcRouteListeners = new Map();
const webRtcRoutePending = new Map();
/** @type {Map<string, string>} fingerprint → WebRTC sessionId */
const webRtcSessionByFingerprint = new Map();
let crossDeviceTestDriver = null;
function ensureCrossDeviceTestDriver() {
  return ensureCrossDeviceTestDriverImpl(extractedContext);
}
async function handleWebRtcHarnessCommand(request) {
  return handleWebRtcHarnessCommandImpl(extractedContext, request);
}

const hostReplyChannel = createHostReplyChannel({ send });
const requestHostReply = hostReplyChannel.requestReply;
const statusTimer = createStatusTimer({ onTick: () => pushStatus() });
const startStatusTimer = statusTimer.start;
const stopStatusTimer = statusTimer.stop;

function peerToken() { return bytesToHex(cryptoProvider.randomBytes(16)); }
const harnessPeerPair = createHarnessPeerPair();
const peerChromeBase = {
  manual: {
    async *offer(session, code, options) { const reply = await requestHostReply({ type: "peer-manual-present", token: peerToken(), sessionId: session.id, code, expectsResponse: true }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield reply.code; },
    async *accept(options) { const session = { id: peerToken(), kind: "manual" }; const reply = await requestHostReply({ type: "peer-manual-enter", token: peerToken(), sessionId: session.id, service: options.service }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield { session, code: reply.code }; },
    async answer(session, code) { await requestHostReply({ type: "peer-manual-present", token: peerToken(), sessionId: session.id, code, expectsResponse: false }); },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  qr: {
    async availability() { const reply = await requestHostReply({ type: "peer-qr-availability", token: peerToken() }, 5_000); return reply?.availability ?? { state: "unsupported", reason: "QR support could not be detected" }; },
    async *present(session, codes, options) { const reply = await requestHostReply({ type: "peer-qr-present", token: peerToken(), sessionId: session.id, codes, expectsResponse: true }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield reply.code; },
    async *scan(options) { const session = { id: peerToken(), kind: "qr" }; const reply = await requestHostReply({ type: "peer-qr-scan", token: peerToken(), sessionId: session.id, service: options.service }, options.timeoutMs); if (reply?.accepted === true && typeof reply.code === "string") yield { session, code: reply.code }; },
    async answer(session, codes) { await requestHostReply({ type: "peer-qr-present", token: peerToken(), sessionId: session.id, codes, expectsResponse: false }); },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  audio: {
    async availability() { const reply = await requestHostReply({ type: "peer-audio-availability", token: peerToken() }, 5_000); return reply?.availability ?? { state: "unsupported", reason: "Web Audio support could not be detected" }; },
    async *transmit(session, frames, options) { const reply = await requestHostReply({ type: "peer-audio-transmit", token: peerToken(), sessionId: session.id, framesHex: frames.map(bytesToHex), expectsResponse: true }, options.timeoutMs); if (reply?.error !== undefined) throw new Error(reply.error); for (const frame of reply?.framesHex ?? []) yield hexToBytes(frame); },
    async *receive(options) { const session = { id: peerToken(), kind: "audio" }; const reply = await requestHostReply({ type: "peer-audio-receive", token: peerToken(), sessionId: session.id, service: options.service }, options.timeoutMs); if (reply?.error !== undefined) throw new Error(reply.error); for (const frame of reply?.framesHex ?? []) yield { session, frame: hexToBytes(frame) }; },
    async answer(session, frames) { const reply = await requestHostReply({ type: "peer-audio-transmit", token: peerToken(), sessionId: session.id, framesHex: frames.map(bytesToHex), expectsResponse: false }, 120_000); if (reply?.accepted !== true) throw new Error("Audio answer playback was cancelled"); },
    async cancel(sessionId) { send({ type: "peer-chrome-cancel", sessionId }); }
  },
  ntfy: {
    async availability() { return webConfig.ntfyUrl === undefined ? { state: "offline", reason: "No ntfy rendezvous server is configured" } : { state: "available", reason: `Encrypted rendezvous through ${webConfig.ntfyUrl}` }; },
    async presentCode(session, code, options) { const reply = await requestHostReply({ type: "peer-ntfy-present", token: peerToken(), sessionId: session.id, code, server: webConfig.ntfyUrl }, options.timeoutMs); if (reply?.accepted !== true) throw new Error("ntfy rendezvous was cancelled"); },
    async requestCode(session, options) { const reply = await requestHostReply({ type: "peer-ntfy-enter", token: peerToken(), sessionId: session.id, service: options.service, server: webConfig.ntfyUrl }, options.timeoutMs); if (reply?.accepted !== true || typeof reply.code !== "string") throw new Error("ntfy rendezvous was cancelled"); return reply.code; },
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

/** @type {null | ((input: { appId: string; peer: string; demand: any }) => Promise<{ quality?: () => any; close: () => Promise<void>; bytesSent?: number; sessionId?: string }>)>} */
let attachWebRtcMediaTrack = null;
async function ensurePeerSessionManager() {
  return ensurePeerSessionManagerImpl(extractedContext);
}
const peerSessionManagerProxy = {
  async request(appId, runtimeId, request) { return (await ensurePeerSessionManager()).request(appId, runtimeId, request); },
  async listen(appId, runtimeId, request) { return (await ensurePeerSessionManager()).listen(appId, runtimeId, request); },
  async diagnostics() { return (await ensurePeerSessionManager()).diagnostics(); },
  list(appId) { return peerSessionManager?.list(appId) ?? []; },
  route(appId, handle) { return peerSessionManager?.route(appId, handle); },
  info(appId, runtimeId, handle) { if (peerSessionManager === null) throw new Error("Unknown peer handle"); return peerSessionManager.info(appId, runtimeId, handle); },
  async close(appId, runtimeId, handle) { if (peerSessionManager !== null) await peerSessionManager.close(appId, runtimeId, handle); },
  async closeRuntime(appId, runtimeId) { if (peerSessionManager !== null) await peerSessionManager.closeRuntime(appId, runtimeId); }
};

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
  } else if (standaloneReticulum !== null) {
    status.running = true;
    status.onlineInterfaces = standaloneReticulum.listInterfaces().filter((iface) => iface.online).length;
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

async function loadHyperFetch() {
  if (hyperFetchModule === null) {
    const hyperFetchUrl = new URL("./web-hyper-fetch.js", import.meta.url).href;
    hyperFetchModule = import(hyperFetchUrl);
  }

  return hyperFetchModule;
}

function emitHostMessage(message) {
  send(message);
}

async function ensureReticulumForInterfaces() {
  if (hostSession !== null) {
    return hostSession.reticulum;
  }

  if (standaloneReticulum === null) {
    standaloneReticulum = Reticulum.create({
      provider: cryptoProvider,
      runtime: webRuntime(identityOptions()),
      bandwidthBytesPerSecond: HOST_BANDWIDTH_BYTES_PER_SECOND
    });
    standaloneReticulum.start();
    status.running = true;
    startStatusTimer();
  }

  return standaloneReticulum;
}

async function stopStandaloneReticulumIfIdle() {
  if (hostSession !== null || standaloneReticulum === null) {
    return;
  }

  if (!status.rnodeEnabled) {
    await standaloneReticulum.stop();
    standaloneReticulum = null;
    status.running = false;
    stopStatusTimer();
    pushStatus();
  }
}

async function stopRnodeInterface() {
  if (rnodeIface !== null) {
    const reticulum = hostSession?.reticulum ?? standaloneReticulum;
    if (reticulum !== null && reticulum !== undefined) {
      try {
        reticulum.unregisterInterface(rnodeIface);
      } catch {
        // Interface may already be unregistered.
      }
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
  await stopStandaloneReticulumIfIdle();
  pushStatus();
}

async function startRnodeInterface() {
  const reticulum = await ensureReticulumForInterfaces();

  if (rnodeIface !== null) {
    status.rnodeConnected = serialBridge?.connected ?? false;
    pushStatus();
    return;
  }

  log("Starting RNode interface over Web Serial");
  serialBridge = createWebSerialPipe(emitHostMessage, pendingRnodeBaudRate);
  rnodeIface = await RNodeInterface.open(cryptoProvider, {
    name: "web-rnode",
    provider: cryptoProvider,
    pipe: serialBridge
  });
  reticulum.registerInterface(rnodeIface);

  status.rnodeConnected = serialBridge.connected;
  status.rnodeDeviceName = status.rnodeConnected ? "webserial" : null;
  if (rnodeIface.online) {
    log(`RNode interface online (firmware: ${rnodeIface.rnodeStatus.firmwareVersion ?? "unknown"})`);
  } else {
    log("RNode interface started; waiting for Web Serial connection from host");
  }

  pushStatus();
}

async function applyInterfaceConfig() {
  if (status.rnodeEnabled) {
    await startRnodeInterface();
  } else {
    await stopRnodeInterface();
  }
}

function handleSerialHostMessage(message) {
  if (serialBridge === null) {
    return;
  }

  serialBridge.handleHostMessage(message);
  if (message.type === "serial-connect") {
    status.rnodeConnected = true;
    status.rnodeDeviceName = message.deviceName;
    log(`RNode Web Serial connected (${message.deviceName})`);
    pushStatus();
    return;
  }

  if (message.type === "serial-disconnect") {
    status.rnodeConnected = false;
    status.rnodeDeviceName = null;
    log("RNode Web Serial disconnected");
    pushStatus();
    return;
  }

  if (message.type === "serial-error") {
    log(`RNode Web Serial error: ${message.message}`);
  }
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

/** When true, ai.chat returns a fixed assistant reply (Playwright Handbook CI). */
let mockAiChat = false;
/** When true, apps.publish succeeds from local CAS without a live gateway (Handbook CI). */
let mockLocalPublish = false;
function ensureMiniappHost() {
  return ensureMiniappHostImpl(extractedContext);
}

const transportAnnounceService = createMiniappAnnounceService({
  provider: cryptoProvider,
  bytesToHex,
  DestinationDirection,
  DestinationType,
  getNode: () => ensureReticulumForInterfaces(),
  getIdentity: () => loadOrCreateWebIdentity(cryptoProvider, identityOptions()),
  copyAppData: true
});
function ensureInstallService() {
  return ensureInstallServiceImpl(extractedContext);
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

async function stopHostSession() {
  if (hostLxmfDelivery !== null) {
    await hostLxmfDelivery.stop();
    hostLxmfDelivery = null;
  }
  if (hostSession !== null) {
    await hostSession.stop();
    hostSession = null;
  }

  status.linkOnline = false;
  status.wsEnabled = false;
  status.tcpEnabled = false;
  if (standaloneReticulum === null && !status.rnodeEnabled) {
    stopStatusTimer();
    status.running = false;
    status.onlineInterfaces = 0;
  }
  pushStatus();
}
async function startHostSession() {
  return startHostSessionImpl(extractedContext);
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
    controller.handleBrokerRequest(
      message.requestId,
      message.instanceId,
      reviveJsonWireValue(message.request)
    );
  }
}
async function handleHostMessage(raw) {
  return handleHostMessageImpl(extractedContext, raw);
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
log("Web core worker ready (Phase W4 WebSerial RNode + Hyperdrive-over-relay install)");
