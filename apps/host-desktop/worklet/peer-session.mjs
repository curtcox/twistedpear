/**
 * Desktop host peer-session wiring: discovery adapters, WebRTC/Reticulum data
 * planes, and the lazily created PeerSessionManager the mini-app host consumes.
 */
import { bytesToHex } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/worklet.js";
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
  ReticulumPeerDiscoveryAdapter,
  UnavailablePeerDiscoveryAdapter
} from "../../../packages/peer-discovery/dist/index.js";

export function createPeerSessionOps(deps) {
  const {
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
    peerLinks
  } = deps;
  const resolveIdentity = (...args) => deps.resolveIdentity(...args);
  const ensureReticulum = (...args) => deps.ensureReticulum(...args);
  const ensurePeerLinkDestination = (...args) => deps.ensurePeerLinkDestination(...args);
  const automaticReticulumChannel = (...args) => deps.automaticReticulumChannel(...args);

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

  async function ensurePeerSessionManager() {
    if (state.peerSessionManager !== null) return state.peerSessionManager;
    const identity = await resolveIdentity();
    if (identity === null) throw new Error("Unlock the host identity before connecting to a peer");
    const registry = new PeerDiscoveryRegistry();
    const createSessionId = () => generateConfirmationToken((length) => provider.randomBytes(length));
    registry.register(new ManualPeerDiscoveryAdapter({
      channel: {
        offer: (session, code, options) => peerChrome.manual.offer(session, code, options),
        accept: (options) => peerChrome.manual.accept(options),
        answer: (session, code) => peerChrome.manual.answer(session, code),
        cancel: (sessionId) => peerChrome.manual.cancel(sessionId)
      },
      createSessionId
    }));
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
      capabilities: ["webrtc", "reticulum"],
      entropy: async (length) => provider.randomBytes(length),
      candidates: async (request, context) => {
        const candidates = [];
        try {
          const remote = context.remoteInvitation?.candidates.find((entry) => entry.kind === "webrtc");
          const token = generateConfirmationToken((length) => provider.randomBytes(length));
          const reply = await requestRendererReply({
            type: "peer-webrtc-signal",
            token,
            sessionId: bytesToHex(context.sessionId),
            role: context.role,
            ...(remote === undefined ? {} : { remoteSignal: new TextDecoder().decode(remote.value) })
          }, 15_000);
          if (typeof reply?.signal === "string") {
            candidates.push({ kind: "webrtc", value: new TextEncoder().encode(reply.signal) });
          } else if (reply === null) {
            log("WebRTC signal timed out waiting for the renderer");
          } else if (typeof reply?.error === "string") {
            log(`WebRTC signal failed: ${reply.error}`);
          } else {
            log(`WebRTC signal returned no SDP (${JSON.stringify(reply)})`);
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
          const token = generateConfirmationToken((length) => provider.randomBytes(length));
          const reply = await requestRendererReply({
            type: "peer-webrtc-establish",
            token,
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
                const sendToken = generateConfirmationToken((length) => provider.randomBytes(length));
                const sent = await requestRendererReply({
                  type: "peer-webrtc-data-send",
                  token: sendToken,
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
          // The link reports its interface's nameplate bitrate, which is a
          // declaration; the meter turns the bytes that actually move into the
          // observed half of the hybrid measurement.
          route: meterHostPeerRoute({ async send(payload) { await link.send(payload); }, subscribe(listener) { routeListeners.add(listener); for (const pending of routePending.splice(0)) listener(pending); return () => routeListeners.delete(listener); }, quality() { return { goodputBps: link.attachedInterface?.bitrate ?? 2_000_000, rttMs: (link.rtt ?? 0) * 1_000, mtu: link.mtu, queueDepthBytes: outboundBandwidthLimiter.queueDepthBytes() }; } }, { now: () => Date.now(), declaredBps: link.attachedInterface?.bitrate ?? 2_000_000, declaredMtu: link.mtu }),
          async close() { peerLinks.delete(peer.fingerprint); await link.teardown(); }
        };
      }
    });
    state.peerSessionManager = new PeerSessionManager(registry, new InvitationPairingDriver({ backend }));
    return state.peerSessionManager;
  }

  const peerSessionManagerProxy = {
    async request(appId, runtimeId, request) { return (await ensurePeerSessionManager()).request(appId, runtimeId, request); },
    async listen(appId, runtimeId, request) { return (await ensurePeerSessionManager()).listen(appId, runtimeId, request); },
    async diagnostics() { return (await ensurePeerSessionManager()).diagnostics(); },
    list(appId) { return state.peerSessionManager?.list(appId) ?? []; },
    route(appId, handle) { return state.peerSessionManager?.route(appId, handle); },
    info(appId, runtimeId, handle) {
      if (state.peerSessionManager === null) throw new Error("Unknown peer handle");
      return state.peerSessionManager.info(appId, runtimeId, handle);
    },
    async close(appId, runtimeId, handle) {
      if (state.peerSessionManager !== null) await state.peerSessionManager.close(appId, runtimeId, handle);
    },
    async closeRuntime(appId, runtimeId) {
      if (state.peerSessionManager !== null) await state.peerSessionManager.closeRuntime(appId, runtimeId);
    }
  };

  return { ensurePeerSessionManager, peerSessionManagerProxy };
}
