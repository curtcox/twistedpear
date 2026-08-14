/* global TextDecoder, TextEncoder */
/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */

import {
  Identity,
  bytesToHex,
  hasWebIdentity,
  loadOrCreateWebIdentity,
} from "../../../packages/reticulum-ts/dist/web.js";
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
  UnavailablePeerDiscoveryAdapter,
} from "../../../packages/peer-discovery/dist/index.js";

export async function ensurePeerSessionManagerImpl(context) {
  if (context.peerSessionManager !== null) return context.peerSessionManager;
  if (!(await hasWebIdentity(context.identityOptions())))
    throw new Error(
      "Create or import a host identity before connecting to a peer",
    );
  const identity = await loadOrCreateWebIdentity(
    context.cryptoProvider,
    context.identityOptions(),
  );
  const registry = new PeerDiscoveryRegistry();
  registry.register(
    new ManualPeerDiscoveryAdapter({
      channel: context.peerChrome.manual,
      createSessionId: context.peerToken,
    }),
  );
  registry.register(
    new QrPeerDiscoveryAdapter({
      channel: context.peerChrome.qr,
      createSessionId: context.peerToken,
    }),
  );
  registry.register(
    new UnavailablePeerDiscoveryAdapter("reticulum", {
      state: "offline",
      reason:
        "Automatic Reticulum rendezvous requires a connected gateway or RNode; use QR/manual for signaling",
    }),
  );
  registry.register(
    new AudioPeerDiscoveryAdapter({
      channel: context.peerChrome.audio,
      createSessionId: context.peerToken,
    }),
  );
  registry.register(
    new UnavailablePeerDiscoveryAdapter("bluetooth", {
      state: "unsupported",
      reason: "Ordinary web pages cannot advertise as BLE peripherals",
    }),
  );
  if (context.webConfig.ntfyUrl === undefined)
    registry.register(
      new UnavailablePeerDiscoveryAdapter("ntfy", {
        state: "offline",
        reason: "No ntfy rendezvous server is configured",
      }),
    );
  else {
    try {
      const client = new NtfyRendezvousClient({
        baseUrl: context.webConfig.ntfyUrl,
        ...(context.webConfig.ntfyToken === undefined
          ? {}
          : { bearerToken: context.webConfig.ntfyToken }),
        entropy: async (length) => context.cryptoProvider.randomBytes(length),
      });
      registry.register(
        new NtfyPeerDiscoveryAdapter({
          client,
          channel: context.peerChrome.ntfy,
          createSessionId: context.peerToken,
        }),
      );
    } catch (error) {
      registry.register(
        new UnavailablePeerDiscoveryAdapter("ntfy", {
          state: "policy-disabled",
          reason: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
  registry.register(
    new UnavailablePeerDiscoveryAdapter("local-peer-to-peer", {
      state: "unsupported",
      reason: "This browser does not implement LP2PRequest/LP2PReceiver",
    }),
  );
  const backend = new CryptoPeerPairingBackend({
    identity: {
      publicKey: identity.getPublicKey(),
      async sign(payload) {
        return identity.sign(payload);
      },
      async verify(publicKey, payload, signature) {
        const remote = Identity.fromPublicKey(
          context.cryptoProvider,
          publicKey,
        );
        return remote !== null && remote.validate(signature, payload);
      },
    },
    displayLabel: `TwistedPear Web ${bytesToHex(identity.hash).slice(0, 8)}`,
    capabilities: ["webrtc", "gateway", "reticulum"],
    entropy: async (length) => context.cryptoProvider.randomBytes(length),
    candidates: async (_request, context) => {
      const remote = context.remoteInvitation?.candidates.find(
        (entry) => entry.kind === "webrtc",
      );
      const reply = await context.requestHostReply(
        {
          type: "peer-webrtc-signal",
          token: context.peerToken(),
          sessionId: bytesToHex(context.sessionId),
          role: context.role,
          ...(remote === undefined
            ? {}
            : { remoteSignal: new TextDecoder().decode(remote.value) }),
        },
        15000,
      );
      const candidates =
        typeof reply?.signal === "string"
          ? [{ kind: "webrtc", value: new TextEncoder().encode(reply.signal) }]
          : [];
      if (context.hostSession !== null)
        candidates.push({
          kind: "gateway",
          value: new TextEncoder().encode(context.webConfig.gatewayUrl),
        });
      else if (context.status.rnodeConnected)
        candidates.push({ kind: "reticulum", value: identity.hash });
      return candidates;
    },
    confirm: (peer, request) => context.peerChrome.confirm(peer, request),
    async establish(context, peer, adapter) {
      if (peer.dataPlane === "webrtc") {
        const remote = context.remoteInvitation.candidates.find(
          (entry) => entry.kind === "webrtc",
        );
        const sessionId = bytesToHex(context.remoteInvitation.sessionId);
        const reply = await context.requestHostReply(
          {
            type: "peer-webrtc-establish",
            token: context.peerToken(),
            sessionId,
            ...(remote === undefined
              ? {}
              : { remoteSignal: new TextDecoder().decode(remote.value) }),
          },
          30000,
        );
        if (reply?.opened !== true)
          throw new Error("WebRTC data channel did not open");
        const listeners = new Set();
        context.webRtcRouteListeners.set(sessionId, listeners);
        if (!context.webRtcRoutePending.has(sessionId))
          context.webRtcRoutePending.set(sessionId, []);
        context.webRtcSessionByFingerprint.set(peer.fingerprint, sessionId);
        return {
          authenticated: true,
          confirmed: true,
          fingerprint: peer.fingerprint,
          displayLabel: peer.displayLabel,
          rendezvous: adapter.kind,
          dataPlane: "webrtc",
          route: meterHostPeerRoute(
            {
              async send(payload) {
                const sent = await context.requestHostReply(
                  {
                    type: "peer-webrtc-data-send",
                    token: context.peerToken(),
                    sessionId,
                    dataHex: bytesToHex(payload),
                  },
                  10000,
                );
                if (sent?.sent !== true)
                  throw new Error("WebRTC data channel send failed");
              },
              subscribe(listener) {
                listeners.add(listener);
                for (const pending of context.webRtcRoutePending
                  .get(sessionId)
                  ?.splice(0) ?? [])
                  listener(pending);
                return () => listeners.delete(listener);
              },
              quality() {
                return {
                  goodputBps: 2000000,
                  rttMs: 50,
                  mtu: 1200,
                  queueDepthBytes:
                    context.webOutboundBandwidthLimiter.queueDepthBytes(),
                };
              },
            },
            { now: () => Date.now(), declaredBps: 2000000, declaredMtu: 1200 },
          ),
          async close() {
            context.webRtcRouteListeners.delete(sessionId);
            context.webRtcRoutePending.delete(sessionId);
            context.webRtcSessionByFingerprint.delete(peer.fingerprint);
            context.send({ type: "peer-webrtc-close", sessionId });
          },
        };
      }
      return {
        authenticated: true,
        confirmed: true,
        fingerprint: peer.fingerprint,
        displayLabel: peer.displayLabel,
        rendezvous: adapter.kind,
        dataPlane: peer.dataPlane,
      };
    },
  });
  context.peerSessionManager = new PeerSessionManager(
    registry,
    new InvitationPairingDriver({ backend }),
  );
  return context.peerSessionManager;
}
