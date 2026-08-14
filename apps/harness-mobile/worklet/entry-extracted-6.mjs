/* global TextDecoder, TextEncoder, clearTimeout, setTimeout */
/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  bytesToHex,
} from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/destination.js";
import {
  peerServiceAspect,
} from "../../../packages/worklet-core/src/index.mjs";
import {
  AudioPeerDiscoveryAdapter,
  BluetoothPeerDiscoveryAdapter,
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
  UnavailablePeerDiscoveryAdapter,
} from "../../../packages/peer-discovery/dist/index.js";

export async function ensurePeerSessionManagerImpl(context) {
  if (context.peerSessionManager !== null) return context.peerSessionManager;
  const identity = await context.resolveIdentity();
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
    new ReticulumPeerDiscoveryAdapter({
      channel: context.automaticReticulumChannel(identity),
      createSessionId: context.peerToken,
    }),
  );
  registry.register(
    new AudioPeerDiscoveryAdapter({
      channel: context.peerChrome.audio,
      createSessionId: context.peerToken,
    }),
  );
  registry.register(
    new BluetoothPeerDiscoveryAdapter({
      channel: context.bluetoothDiscoveryChannel,
      createSessionId: context.peerToken,
    }),
  );
  if (context.ntfyUrl === null)
    registry.register(
      new UnavailablePeerDiscoveryAdapter("ntfy", {
        state: "offline",
        reason: "No ntfy rendezvous server is configured",
      }),
    );
  else {
    try {
      registry.register(
        new NtfyPeerDiscoveryAdapter({
          client: new NtfyRendezvousClient({
            baseUrl: context.ntfyUrl,
            fetch: context.ntfyHostFetch,
            entropy: async (length) => context.provider.randomBytes(length),
          }),
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
      reason: "LP2PRequest/LP2PReceiver is a browser proposal",
    }),
  );
  const backend = new CryptoPeerPairingBackend({
    identity: {
      publicKey: identity.getPublicKey(),
      async sign(payload) {
        return identity.sign(payload);
      },
      async verify(publicKey, payload, signature) {
        const remote = Identity.fromPublicKey(context.provider, publicKey);
        return remote !== null && remote.validate(signature, payload);
      },
    },
    displayLabel: `TwistedPear ${bytesToHex(identity.hash).slice(0, 8)}`,
    capabilities: ["webrtc", "reticulum"],
    entropy: async (length) => context.provider.randomBytes(length),
    candidates: async (request, context) => {
      const candidates = [];
      try {
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
        if (typeof reply?.signal === "string") {
          candidates.push({
            kind: "webrtc",
            value: new TextEncoder().encode(reply.signal),
          });
        } else if (reply === null) {
          context.log("WebRTC signal timed out waiting for the host");
        } else if (typeof reply?.error === "string") {
          context.log(`WebRTC signal failed: ${reply.error}`);
        }
      } catch (error) {
        context.log(
          `WebRTC signal unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
      const destination = await context.ensurePeerLinkDestination(
        identity,
        request.service,
      );
      await destination.announce();
      candidates.push({ kind: "reticulum", value: destination.hash });
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
          throw new Error(
            typeof reply?.error === "string"
              ? reply.error
              : "WebRTC data channel did not open",
          );
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
                    context.outboundBandwidthLimiter.queueDepthBytes(),
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
      const node = await context.ensureReticulum();
      const candidate = context.remoteInvitation.candidates.find(
        (entry) => entry.kind === "reticulum",
      );
      const remoteIdentity =
        context.remoteInvitation.identityProof === undefined
          ? null
          : Identity.fromPublicKey(
              context.provider,
              context.remoteInvitation.identityProof,
            );
      if (candidate === undefined || remoteIdentity === null)
        throw new Error("Authenticated Reticulum candidate is missing");
      const outbound = node.registerDestination({
        provider: context.provider,
        identity: remoteIdentity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: "tp",
        aspects: ["peer", peerServiceAspect(context.remoteInvitation.service)],
      });
      if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value))
        throw new Error(
          "Reticulum candidate does not match the signed peer identity and service",
        );
      if (!node.hasPath(outbound.hash)) {
        node.requestPath(outbound.hash);
        if (!(await node.awaitPath(outbound.hash, 15)))
          throw new Error("No Reticulum path to the confirmed peer");
      }
      const link = await new Promise((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Reticulum peer link timed out")),
          30000,
        );
        outbound.requestLink({
          linkEstablished(established) {
            clearTimeout(timer);
            resolve(established);
          },
          linkClosed() {
            clearTimeout(timer);
            reject(
              new Error("Reticulum peer link closed during establishment"),
            );
          },
        });
      });
      context.peerLinks.set(peer.fingerprint, link);
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
        route: meterHostPeerRoute(
          {
            async send(payload) {
              await link.send(payload);
            },
            subscribe(listener) {
              routeListeners.add(listener);
              for (const pending of routePending.splice(0)) listener(pending);
              return () => routeListeners.delete(listener);
            },
            quality() {
              return {
                goodputBps: link.attachedInterface?.bitrate ?? 2000000,
                rttMs: (link.rtt ?? 0) * 1000,
                mtu: link.mtu,
                queueDepthBytes:
                  context.outboundBandwidthLimiter.queueDepthBytes(),
              };
            },
          },
          {
            now: () => Date.now(),
            declaredBps: link.attachedInterface?.bitrate ?? 2000000,
            declaredMtu: link.mtu,
          },
        ),
        async close() {
          context.peerLinks.delete(peer.fingerprint);
          await link.teardown();
        },
      };
    },
  });
  context.peerSessionManager = new PeerSessionManager(
    registry,
    new InvitationPairingDriver({ backend }),
  );
  return context.peerSessionManager;
}
