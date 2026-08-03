/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */
// @ts-nocheck


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

export function ensureMiniappHostImpl(context) {
    if (context.miniappHost === null) {
        context.miniappHost = createWebWorkletMiniappHost({
            provider: context.cryptoProvider,
            kvStore: context.ensureMiniappKvStore(),
            async launchInstalledApp(appId) {
                await context.ensureMiniappHost().launch(await context.ensurePackageStorage(), appId);
            },
            getPresenceSnapshot: () => ({ ...context.status, autoPeers: context.status.autoPeers + (context.peerSessionManager?.routes.list().length ?? 0) }),
            getHostInfoSnapshot: () => {
                const interfaceTypes = [];
                if (context.status.wsEnabled)
                    interfaceTypes.push("websocket");
                if (context.status.rnodeEnabled)
                    interfaceTypes.push("rnode");
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
                        seedStorageUsedBytes: context.status.storageUsedBytes ?? null,
                        seedStorageQuotaBytes: null,
                        memoryBytes: null
                    }
                };
            },
            send,
            requestHostReply,
            peerSessionManager: context.peerSessionManagerProxy,
            realtimeReservations: { reserveRealtime: (bytesPerSecond) => context.webOutboundBandwidthLimiter.reserve("realtime", bytesPerSecond) },
            openCasPlane: {
                put: (frame) => new CasStore(context.ensureMiniappKvStore(), (data) => context.cryptoProvider.sha512(data)).put(frame)
            },
            openWebRtcMediaPlane: createDelegatedWebRtcMediaPlaneOpener((context.attachWebRtcMediaTrack = async ({ appId, peer, demand }) => {
                const confirmed = context.peerSessionManagerProxy.route(appId, { id: peer });
                if (confirmed?.dataPlane !== "webrtc") {
                    throw new Error("No authenticated WebRTC route for media tracks.");
                }
                const sessionId = context.webRtcSessionByFingerprint.get(confirmed.fingerprint);
                if (sessionId === undefined) {
                    throw new Error("WebRTC session is missing for media track attach.");
                }
                const reply = await context.requestHostReply({
                    type: "peer-webrtc-media-attach",
                    token: context.peerToken(),
                    sessionId,
                    classId: demand.classId,
                    tierId: demand.tierId
                }, 30000);
                if (reply?.attached !== true) {
                    throw new Error(typeof reply?.error === "string" ? reply.error : "WebRTC media track attach failed.");
                }
                return {
                    sessionId,
                    bytesSent: typeof reply.bytesSent === "number" ? reply.bytesSent : 0,
                    voiceProcessing: reply.voiceProcessing ?? null,
                    quality: () => ({
                        goodputBps: 2000000,
                        rttMs: 50,
                        jitterMs: 10,
                        lossRatio: 0,
                        mtu: 1200,
                        source: "declared",
                        samples: 1,
                        confidence: "low"
                    }),
                    close: async () => {
                        await context.requestHostReply({ type: "peer-webrtc-media-detach", token: context.peerToken(), sessionId, classId: demand.classId }, 10000);
                    }
                };
            })),
            controlReservations: { reserveControl: (bytesPerSecond) => context.webOutboundBandwidthLimiter.reserve("control", bytesPerSecond) },
            onInboundMediaFrame(appId, stream, frame, offer) { context.send({ type: "inbound-media-frame", appId, handle: stream.handle, sink: stream.sink, encoding: offer.encoding, dataHex: bytesToHex(frame) }); },
            async requestShareOffer({ appId, purpose }) {
                const peer = context.peerSessionManagerProxy.list(appId)[0];
                if (peer === undefined)
                    return null;
                const reply = await context.requestHostReply({ type: "confirm-request", token: context.peerToken(), kind: "device-share-offer", appId, publisherPublicKey: "host-authenticated-peer", summary: { purpose, peer: peer.displayLabel, class: "microphone", tier: "pcm", quality: "16k-opus", duration: "15 minutes" } });
                return reply?.approved === true ? { targetKind: "peer", targetId: peer.handle.id, displayLabel: peer.displayLabel, classId: "microphone", tierId: "pcm", maxRung: "16k-opus", ttlMs: 15 * 60000 } : null;
            },
            async confirmShareOfferRevoke(offer) { const reply = await context.requestHostReply({ type: "confirm-request", token: context.peerToken(), kind: "device-share-revoke", appId: offer.appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: offer.displayLabel, class: offer.classId } }); return reply?.approved === true; },
            async confirmCostlyLinkProbe({ appId, peer, budgetBytes }) { const reply = await context.requestHostReply({ type: "confirm-request", token: context.peerToken(), kind: "link-probe", appId, publisherPublicKey: "host-authenticated-peer", summary: { peer: peer.displayLabel, budgetBytes } }); return reply?.approved === true; },
            announceService: context.transportAnnounceService,
            getPublisherIdentity: async () => {
                if (!(await hasWebIdentity(context.identityOptions()))) {
                    return null;
                }
                return loadOrCreateWebIdentity(context.cryptoProvider, context.identityOptions());
            },
            publishArchive: async ({ t256, archive }) => {
                const session = context.hostSession;
                if (session === null) {
                    if (!context.mockLocalPublish) {
                        throw new Error("Gateway link is offline — enable WS gateway before publishing");
                    }
                    const unpacked = unpackPackage(context.cryptoProvider, archive);
                    return {
                        t256,
                        driveKey: "0".repeat(64),
                        version: unpacked.manifest.version
                    };
                }
                return context.ensurePublishService().publish(session, { t256, archive });
            },
            installFromT256: async (t256) => context.ensureInstallService().installFromT256(t256),
            aiBackend: context.mockAiChat ? {
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
                context.status.developerMode = enabled;
                context.pushStatus();
            },
            onMiniappStateChange(running) {
                context.status.miniappRunning = running;
                context.pushStatus();
            }
        });
    }
    return context.miniappHost;
}
