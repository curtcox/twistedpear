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
  if (crossDeviceTestDriver === null) {
    crossDeviceTestDriver = createCrossDeviceTestDriver({
      miniappHost: () => ensureMiniappHost(),
      installFromT256: (t256) => ensureInstallService().installFromT256(t256),
      async importTrust(identity256t, label) {
        const publisherPublicKey = decodePublisherIdentity256t(identity256t);
        const reply = await requestHostReply({
          type: "confirm-request",
          token: bytesToHex(cryptoProvider.randomBytes(16)),
          kind: "trust-import",
          appId: "host",
          publisherPublicKey,
          summary: { label, source: "paste" }
        });
        if (reply?.approved !== true) throw new Error("Publisher trust import denied");
        await ensureInstallService().trustStore.add({
          publisherPublicKey,
          label,
          addedAt: Date.now(),
          source: "paste"
        });
      },
      async runApp(appId) {
        await ensureMiniappHost().launch(await ensurePackageStorage(), appId);
      },
      casStore: () => new CasStore(ensureMiniappKvStore(), (data) => cryptoProvider.sha512(data)),
      sha512: (bytes) => cryptoProvider.sha512(bytes),
      async casHas(t256) {
        const cas = new CasStore(ensureMiniappKvStore(), (data) => cryptoProvider.sha512(data));
        return cas.has(t256);
      },
      async publisherIdentity256t() {
        const identity = await loadOrCreateWebIdentity(cryptoProvider, identityOptions());
        return encodePublisherIdentity256t(identity.getPublicKey());
      }
    });
  }
  return crossDeviceTestDriver;
}

/**
 * WebRTC GUI-call harness commands (mirrors desktop test-agent handleCommand).
 * Driven via `__TP_CROSS_DEVICE__` / the Node control bridge — not DevStudio.
 * @param {Record<string, unknown>} request
 */
async function handleWebRtcHarnessCommand(request) {
  switch (request.cmd) {
    case "harness-info":
      return {
        lxmfAddress: hostLxmfDelivery?.lxmfAddress ?? status.lxmfAddress ?? null,
        identityHash: status.identityHash,
        linkOnline: status.linkOnline === true
      };
    case "announce":
      if (hostLxmfDelivery === null) throw new Error("Host LXMF delivery is not ready");
      await hostLxmfDelivery.announce();
      return {};
    case "invite-state":
      return { invites: [...harnessInviteEntries] };
    case "send-invite": {
      if (hostLxmfDelivery === null) throw new Error("Host LXMF delivery is not ready");
      if (typeof request.toLxmfAddress !== "string") throw new Error("send-invite requires toLxmfAddress");
      const appId = typeof request.appId === "string" ? request.appId : "line-check";
      const requestedClasses = Array.isArray(request.requestedClasses)
        ? request.requestedClasses
        : ["microphone"];
      const id = `invite-web-${nextHarnessInvite++}`;
      const expiresAt = Date.now() + 120_000;
      const envelope = encodeSessionInviteEnvelope({ id, appId, requestedClasses, expiresAt });
      const hash = hexToBytes(request.toLxmfAddress);
      const recipient = Identity.recall(cryptoProvider, hash);
      if (recipient === null) {
        throw new Error(`No announced identity for ${request.toLxmfAddress}; peer not discovered yet`);
      }
      await hostLxmfDelivery.router.packAndSend({
        destination: hostLxmfDelivery.router.createOutboundDestination(recipient),
        source: hostLxmfDelivery.delivery,
        title: SESSION_INVITE_TITLE,
        content: sessionInviteContent(envelope),
        desiredMethod: LXMessageMethod.OPPORTUNISTIC,
        deferStamp: true
      });
      harnessInviteEntries.push({
        kind: "sent",
        id,
        appId,
        peerLabel: request.toLxmfAddress.slice(0, 12),
        requestedClasses,
        expiresAt,
        at: Date.now(),
        peerDestinationHash: request.toLxmfAddress
      });
      return { inviteId: id, appId, expiresAt, bytes: envelope.length };
    }
    case "accept-invite": {
      const inviteId = typeof request.inviteId === "string" ? request.inviteId : undefined;
      if (inviteId === undefined) throw new Error("accept-invite requires inviteId");
      const raised = harnessInviteEntries.findLast((entry) => entry.kind === "raised" && entry.id === inviteId);
      if (raised === undefined) throw new Error(`No raised invite ${inviteId}`);
      try {
        await ensureMiniappHost().acceptSessionInvite(inviteId);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (!detail.startsWith("No installed version for ")) throw error;
        log(`Session invite ${inviteId} accepted without launch (${detail})`);
      }
      harnessInviteEntries.push({ ...raised, kind: "accepted", at: Date.now() });
      return { accepted: true, inviteId, peerDestinationHash: raised.peerDestinationHash ?? null };
    }
    case "renderer-ping": {
      const reply = await requestHostReply({ type: "peer-qr-availability", token: peerToken() }, 10_000);
      return {
        ok: reply !== null,
        availability: reply?.availability ?? null,
        error: reply === null ? "renderer ping timed out" : reply?.error
      };
    }
    case "peer-pair-start": {
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
    case "peer-pair-code-out": {
      const taken = await harnessPeerPair.takeOutboundCode(
        typeof request.timeoutMs === "number" ? request.timeoutMs : 60_000
      );
      return { code: taken.code, sessionId: taken.sessionId };
    }
    case "peer-pair-code-in": {
      if (typeof request.code !== "string") throw new Error("peer-pair-code-in requires code");
      harnessPeerPair.giveInboundCode(
        request.code,
        typeof request.sessionId === "string" ? request.sessionId : undefined
      );
      return { ok: true };
    }
    case "peer-pair-wait": {
      const paired = await harnessPeerPair.wait(
        typeof request.timeoutMs === "number" ? request.timeoutMs : 120_000
      );
      return paired;
    }
    case "webrtc-open-media": {
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
        voiceProcessing: attached.voiceProcessing ?? null,
        encoding
      };
    }
    case "media-opus-duplex": {
      const configuration = {
        codec: "opus",
        sampleKind: "audio",
        bitrateBps: 24_000,
        sampleRate: 16_000,
        channels: 1,
        voiceDuplex: true
      };
      // Chromium Opus emits ~60ms frames; send a full frame of float32 PCM.
      const sampleCount = 960;
      const samples = new Float32Array(sampleCount);
      for (let index = 0; index < sampleCount; index += 1) {
        samples[index] = Math.sin((2 * Math.PI * 440 * index) / 16_000) * 0.25;
      }
      const pcmBytes = new Uint8Array(
        samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength)
      );
      const captureAtUs = Date.now() * 1_000;
      const encoded = await requestHostReply(
        {
          type: "media-codec-request",
          token: peerToken(),
          op: "encode",
          configuration,
          captureAtUs,
          dataHex: bytesToHex(pcmBytes)
        },
        15_000
      );
      if (encoded?.error !== undefined || typeof encoded?.dataHex !== "string") {
        throw new Error(encoded?.error ?? "Opus encode timed out");
      }
      const opusBytes = hexToBytes(encoded.dataHex);
      if (opusBytes.length === 0) throw new Error("Opus encode produced empty payload");
      const decoded = await requestHostReply(
        {
          type: "media-codec-request",
          token: peerToken(),
          op: "decode",
          configuration,
          captureAtUs,
          dataHex: encoded.dataHex
        },
        15_000
      );
      if (decoded?.error !== undefined || typeof decoded?.dataHex !== "string") {
        throw new Error(decoded?.error ?? "Opus decode timed out");
      }
      const decodedBytes = hexToBytes(decoded.dataHex);
      if (decodedBytes.length < 4) throw new Error("Opus decode produced empty PCM");
      const frame = encodeDeviceStreamFrame({
        version: 2,
        sampleKind: 2,
        sessionToken: 7,
        sequence: 0,
        captureAtUs,
        clockId: 7,
        payload: opusBytes
      });
      const played = await requestHostReply(
        {
          type: "media-opus-play-request",
          token: peerToken(),
          encoding: "16k-opus",
          dataHex: bytesToHex(frame)
        },
        15_000
      );
      if (played?.error !== undefined || played?.played !== true) {
        throw new Error(played?.error ?? "Opus speaker playback failed");
      }
      return {
        ok: true,
        implementation: "webcodecs",
        voiceDuplex: true,
        encoding: "16k-opus",
        pcmBytes: pcmBytes.length,
        opusBytes: opusBytes.length,
        decodedBytes: decodedBytes.length,
        frameBytes: frame.length,
        frameHex: bytesToHex(frame),
        played: true
      };
    }
    case "media-opus-play": {
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
        15_000
      );
      if (played?.error !== undefined || played?.played !== true) {
        throw new Error(played?.error ?? "Opus speaker playback failed");
      }
      return { played: true, encoding, bytes: Math.floor(request.dataHex.length / 2) };
    }
    default:
      throw new Error(`Unknown WebRTC harness command: ${request.cmd}`);
  }
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
    async requestCode(options) { const session = { id: peerToken(), kind: "ntfy" }; const reply = await requestHostReply({ type: "peer-ntfy-enter", token: peerToken(), sessionId: session.id, service: options.service, server: webConfig.ntfyUrl }, options.timeoutMs); if (reply?.accepted !== true || typeof reply.code !== "string") throw new Error("ntfy rendezvous was cancelled"); return { session, code: reply.code }; },
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
  if (peerSessionManager !== null) return peerSessionManager;
  if (!(await hasWebIdentity(identityOptions()))) throw new Error("Create or import a host identity before connecting to a peer");
  const identity = await loadOrCreateWebIdentity(cryptoProvider, identityOptions());
  const registry = new PeerDiscoveryRegistry(); registry.register(new ManualPeerDiscoveryAdapter({ channel: peerChrome.manual, createSessionId: peerToken })); registry.register(new QrPeerDiscoveryAdapter({ channel: peerChrome.qr, createSessionId: peerToken }));
  registry.register(new UnavailablePeerDiscoveryAdapter("reticulum", { state: "offline", reason: "Automatic Reticulum rendezvous requires a connected gateway or RNode; use QR/manual for signaling" }));
  registry.register(new AudioPeerDiscoveryAdapter({ channel: peerChrome.audio, createSessionId: peerToken }));
  registry.register(new UnavailablePeerDiscoveryAdapter("bluetooth", { state: "unsupported", reason: "Ordinary web pages cannot advertise as BLE peripherals" }));
  if (webConfig.ntfyUrl === undefined) registry.register(new UnavailablePeerDiscoveryAdapter("ntfy", { state: "offline", reason: "No ntfy rendezvous server is configured" }));
  else {
    try {
      const client = new NtfyRendezvousClient({ baseUrl: webConfig.ntfyUrl, ...(webConfig.ntfyToken === undefined ? {} : { bearerToken: webConfig.ntfyToken }), entropy: async (length) => cryptoProvider.randomBytes(length) });
      registry.register(new NtfyPeerDiscoveryAdapter({ client, channel: peerChrome.ntfy, createSessionId: peerToken }));
    } catch (error) {
      registry.register(new UnavailablePeerDiscoveryAdapter("ntfy", { state: "policy-disabled", reason: error instanceof Error ? error.message : String(error) }));
    }
  }
  registry.register(new UnavailablePeerDiscoveryAdapter("local-peer-to-peer", { state: "unsupported", reason: "This browser does not implement LP2PRequest/LP2PReceiver" }));
  const backend = new CryptoPeerPairingBackend({
    identity: { publicKey: identity.getPublicKey(), async sign(payload) { return identity.sign(payload); }, async verify(publicKey, payload, signature) { const remote = Identity.fromPublicKey(cryptoProvider, publicKey); return remote !== null && remote.validate(signature, payload); } },
    displayLabel: `TwistedPear Web ${bytesToHex(identity.hash).slice(0, 8)}`,
    capabilities: ["webrtc", "gateway", "reticulum"], entropy: async (length) => cryptoProvider.randomBytes(length),
    candidates: async (_request, context) => {
      const remote = context.remoteInvitation?.candidates.find((entry) => entry.kind === "webrtc");
      const reply = await requestHostReply({ type: "peer-webrtc-signal", token: peerToken(), sessionId: bytesToHex(context.sessionId), role: context.role, ...(remote === undefined ? {} : { remoteSignal: new TextDecoder().decode(remote.value) }) }, 15_000);
      const candidates = typeof reply?.signal === "string" ? [{ kind: "webrtc", value: new TextEncoder().encode(reply.signal) }] : [];
      if (hostSession !== null) candidates.push({ kind: "gateway", value: new TextEncoder().encode(webConfig.gatewayUrl) }); else if (status.rnodeConnected) candidates.push({ kind: "reticulum", value: identity.hash });
      return candidates;
    },
    confirm: (peer, request) => peerChrome.confirm(peer, request),
    async establish(context, peer, adapter) {
      if (peer.dataPlane === "webrtc") { const remote = context.remoteInvitation.candidates.find((entry) => entry.kind === "webrtc"); const sessionId = bytesToHex(context.remoteInvitation.sessionId); const reply = await requestHostReply({ type: "peer-webrtc-establish", token: peerToken(), sessionId, ...(remote === undefined ? {} : { remoteSignal: new TextDecoder().decode(remote.value) }) }, 30_000); if (reply?.opened !== true) throw new Error("WebRTC data channel did not open"); const listeners = new Set(); webRtcRouteListeners.set(sessionId, listeners); if (!webRtcRoutePending.has(sessionId)) webRtcRoutePending.set(sessionId, []); webRtcSessionByFingerprint.set(peer.fingerprint, sessionId); return { authenticated: true, confirmed: true, fingerprint: peer.fingerprint, displayLabel: peer.displayLabel, rendezvous: adapter.kind, dataPlane: "webrtc", route: meterHostPeerRoute({ async send(payload) { const sent = await requestHostReply({ type: "peer-webrtc-data-send", token: peerToken(), sessionId, dataHex: bytesToHex(payload) }, 10_000); if (sent?.sent !== true) throw new Error("WebRTC data channel send failed"); }, subscribe(listener) { listeners.add(listener); for (const pending of webRtcRoutePending.get(sessionId)?.splice(0) ?? []) listener(pending); return () => listeners.delete(listener); }, quality() { return { goodputBps: 2_000_000, rttMs: 50, mtu: 1_200, queueDepthBytes: webOutboundBandwidthLimiter.queueDepthBytes() }; } }, { now: () => Date.now(), declaredBps: 2_000_000, declaredMtu: 1_200 }), async close() { webRtcRouteListeners.delete(sessionId); webRtcRoutePending.delete(sessionId); webRtcSessionByFingerprint.delete(peer.fingerprint); send({ type: "peer-webrtc-close", sessionId }); } }; }
      return { authenticated: true, confirmed: true, fingerprint: peer.fingerprint, displayLabel: peer.displayLabel, rendezvous: adapter.kind, dataPlane: peer.dataPlane };
    }
  });
  peerSessionManager = new PeerSessionManager(registry, new InvitationPairingDriver({ backend })); return peerSessionManager;
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
  if (miniappHost === null) {
    miniappHost = createWebWorkletMiniappHost({
      provider: cryptoProvider,
      kvStore: ensureMiniappKvStore(),
      async launchInstalledApp(appId) {
        await ensureMiniappHost().launch(await ensurePackageStorage(), appId);
      },
      getPresenceSnapshot: () => ({ ...status, autoPeers: status.autoPeers + (peerSessionManager?.routes.list().length ?? 0) }),
      getHostInfoSnapshot: () => {
        const interfaceTypes = [];
        if (status.wsEnabled) interfaceTypes.push("websocket");
        if (status.rnodeEnabled) interfaceTypes.push("rnode");
        return {
          platform: "web",
          hostVersion: HOST_API_VERSION,
          roles: {
            transport: false,
            seeder: false,
            propagation: false
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
      requestHostReply,
      peerSessionManager: peerSessionManagerProxy,
      realtimeReservations: { reserveRealtime: (bytesPerSecond) => webOutboundBandwidthLimiter.reserve("realtime", bytesPerSecond) },
      openCasPlane: {
        put: (frame) => new CasStore(ensureMiniappKvStore(), (data) => cryptoProvider.sha512(data)).put(frame)
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
      controlReservations: { reserveControl: (bytesPerSecond) => webOutboundBandwidthLimiter.reserve("control", bytesPerSecond) },
      onInboundMediaFrame(appId, stream, frame, offer) { send({ type: "inbound-media-frame", appId, handle: stream.handle, sink: stream.sink, encoding: offer.encoding, dataHex: bytesToHex(frame) }); },
      async requestShareOffer({ appId, purpose }) {
        const peer = peerSessionManagerProxy.list(appId)[0]; if (peer === undefined) return null;
        const reply = await requestHostReply({ type: "confirm-request", token: peerToken(), kind: "device-share-offer", appId, publisherPublicKey: "host-authenticated-peer", summary: { purpose, peer: peer.displayLabel, class: "microphone", tier: "pcm", quality: "16k-opus", duration: "15 minutes" } });
        return reply?.approved === true ? { targetKind: "peer", targetId: peer.handle.id, displayLabel: peer.displayLabel, classId: "microphone", tierId: "pcm", maxRung: "16k-opus", ttlMs: 15 * 60_000 } : null;
      },
      async confirmShareOfferRevoke(offer) { const reply = await requestHostReply({ type: "confirm-request", token: peerToken(), kind: "device-share-revoke", appId: offer.appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: offer.displayLabel, class: offer.classId } }); return reply?.approved === true; },
      async confirmCostlyLinkProbe({ appId, peer, budgetBytes }) { const reply = await requestHostReply({ type: "confirm-request", token: peerToken(), kind: "link-probe", appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: peer.displayLabel, budgetBytes } }); return reply?.approved === true; },
      announceService: transportAnnounceService,
      getPublisherIdentity: async () => {
        if (!(await hasWebIdentity(identityOptions()))) {
          return null;
        }

        return loadOrCreateWebIdentity(cryptoProvider, identityOptions());
      },
      publishArchive: async ({ t256, archive }) => {
        const session = hostSession;
        if (session === null) {
          if (!mockLocalPublish) {
            throw new Error("Gateway link is offline — enable WS gateway before publishing");
          }
          const unpacked = unpackPackage(cryptoProvider, archive);
          return {
            t256,
            driveKey: "0".repeat(64),
            version: unpacked.manifest.version
          };
        }

        return ensurePublishService().publish(session, { t256, archive });
      },
      installFromT256: async (t256) => ensureInstallService().installFromT256(t256),
      aiBackend: mockAiChat
        ? {
            chat: async (_appId, request) => {
              const last = request.messages.at(-1)?.content ?? "";
              return {
                message: {
                  role: "assistant",
                  content: typeof last === "string" && last.includes("handbook") ? "handbook" : "ok"
                },
                model: "web-handbook-mock",
                usage: { promptTokens: 8, completionTokens: 1 }
              };
            }
          }
        : undefined,
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
  provider: cryptoProvider,
  bytesToHex,
  DestinationDirection,
  DestinationType,
  getNode: () => ensureReticulumForInterfaces(),
  getIdentity: () => loadOrCreateWebIdentity(cryptoProvider, identityOptions()),
  copyAppData: true
});

function ensureInstallService() {
  if (installService === null) {
    installService = createWebInstallService({
      provider: cryptoProvider,
      kvStore: ensureMiniappKvStore(),
      getHostSession: () => hostSession,
      requestCasLocator: async (t256) => {
        const session = hostSession;
        if (session === null) {
          throw new Error("Gateway link is offline — cannot request locator");
        }
        let destination = locatorRequestDestinations.get(t256);
        if (destination === undefined) {
          destination = session.reticulum.registerDestination({
            provider: cryptoProvider,
            identity: session.identity,
            direction: DestinationDirection.IN,
            type: DestinationType.SINGLE,
            appName: "tp",
            aspects: casRequestAspects(t256)
          });
          locatorRequestDestinations.set(t256, destination);
        }
        await destination.announce({ appData: encodeCasLocatorRequest(t256) });
        log(`Requested CAS locator for ${t256.slice(0, 16)}…`);
      },
      ensurePackageStorage,
      miniappHost: () => ensureMiniappHost(),
      send,
      log,
      pushInstalled: () => {
        void pushInstalledList();
      },
      requestHostReply: requestHostReply,
      tryHyperdriveFetch: async (locator) => {
        if (webConfig.gatewayUrl.length === 0) {
          return null;
        }

        if (locator.driveKey.length === 0 || /^0+$/.test(locator.driveKey)) {
          return null;
        }

        const hyperFetch = await loadHyperFetch();
        return hyperFetch.fetchDriveVersionForWeb({
          gatewayUrl: webConfig.gatewayUrl,
          driveKeyHex: locator.driveKey,
          version: locator.version,
          timeoutMs: 90_000
        });
      }
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

  hostLxmfDelivery = await createHostLxmfDelivery({
    reticulum: hostSession.reticulum,
    provider: cryptoProvider,
    identity: hostSession.identity,
    announceIntervalMs: 0,
    receiveSessionInvite: (invite) => ensureMiniappHost().receiveSessionInvite(invite),
    isInvitableApp: (appId) => appId === "line-check",
    log
  });
  hostLxmfDelivery.onInvite((invite) => {
    harnessInviteEntries.push({
      kind: "raised",
      id: invite.id,
      appId: invite.appId,
      peerLabel: invite.verifiedPeerLabel,
      requestedClasses: invite.requestedClasses,
      expiresAt: invite.expiresAt,
      at: Date.now(),
      peerDestinationHash: typeof invite.peer?.id === "string" ? invite.peer.id : invite.id.slice(0, 16)
    });
  });
  status.lxmfAddress = hostLxmfDelivery.lxmfAddress;
  log(`Host LXMF delivery ready (${hostLxmfDelivery.lxmfAddress.slice(0, 12)}…)`);

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
        void ensurePublishService().respondToLocatorRequest(hostSession, info.appData).catch((error) => {
          log(`CAS locator response failed: ${error instanceof Error ? error.message : String(error)}`);
        });
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
    controller.handleBrokerRequest(
      message.requestId,
      message.instanceId,
      reviveJsonWireValue(message.request)
    );
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

  if (
    message.type === "serial-data" ||
    message.type === "serial-connect" ||
    message.type === "serial-disconnect" ||
    message.type === "serial-error"
  ) {
    handleSerialHostMessage(message);
    return;
  }

  if (message.type === "start") {
    if (message.mockAiChat === true) {
      mockAiChat = true;
    }
    if (message.mockLocalPublish === true) {
      mockLocalPublish = true;
    }
    if (message.gatewayUrl !== undefined) {
      webConfig = {
        gatewayUrl: message.gatewayUrl,
        identityPassphrase: message.identityPassphrase ?? DEFAULT_PASSPHRASE,
        ...(message.sharedToken === undefined ? {} : { sharedToken: message.sharedToken }),
        ...(message.ntfyUrl === undefined || message.ntfyUrl.trim() === "" ? {} : { ntfyUrl: message.ntfyUrl.trim() }),
        ...(message.ntfyToken === undefined || message.ntfyToken.trim() === "" ? {} : { ntfyToken: message.ntfyToken.trim() })
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
    pendingRnodeBaudRate = message.rnodeBaudRate ?? 115_200;
    pushStatus();

    if (message.tcp) {
      await startHostSession();
    } else {
      await stopHostSession();
      log("WS gateway disabled");
    }

    await applyInterfaceConfig();
    return;
  }

  if (message.type === "confirm-response" || message.type === "launch-confirm" || message.type === "install-confirm" || message.type === "peer-chrome-response" || message.type === "device-bridge-response" || message.type === "media-opus-play-response" || message.type === "media-opus-duplex-response" || message.type === "media-codec-response") {
    hostReplyChannel.resolveReply(message);
    return;
  }

  if (message.type === "peer-webrtc-data") {
    const payload = hexToBytes(message.dataHex);
    const listeners = webRtcRouteListeners.get(message.sessionId);
    if (listeners === undefined || listeners.size === 0) {
      const pending = webRtcRoutePending.get(message.sessionId) ?? [];
      pending.push(payload.slice());
      if (pending.length > 16) pending.shift();
      webRtcRoutePending.set(message.sessionId, pending);
    } else {
      for (const listener of listeners) listener(payload.slice());
    }
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

  if (message.type === "cross-device-command") {
    try {
      const cmd = typeof message.command?.cmd === "string" ? message.command.cmd : "";
      const result =
        cmd === "renderer-ping" ||
        cmd === "peer-pair-start" ||
        cmd === "peer-pair-code-out" ||
        cmd === "peer-pair-code-in" ||
        cmd === "peer-pair-wait" ||
        cmd === "webrtc-open-media" ||
        cmd === "media-opus-duplex" ||
        cmd === "media-opus-play" ||
        cmd === "harness-info" ||
        cmd === "announce" ||
        cmd === "send-invite" ||
        cmd === "accept-invite" ||
        cmd === "invite-state"
          ? await handleWebRtcHarnessCommand(message.command)
          : await ensureCrossDeviceTestDriver()(message.command);
      send({ type: "cross-device-result", token: message.token, ok: true, result });
    } catch (error) {
      send({
        type: "cross-device-result",
        token: message.token,
        ok: false,
        error: error instanceof Error ? error.message : String(error)
      });
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
log("Web core worker ready (Phase W4 WebSerial RNode + Hyperdrive-over-relay install)");
