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

export function ensureInstallServiceImpl(context) {
    if (context.installService === null) {
        context.installService = createWebInstallService({
            provider: context.cryptoProvider,
            kvStore: context.ensureMiniappKvStore(),
            getHostSession: () => context.hostSession,
            requestCasLocator: async (t256) => {
                const session = context.hostSession;
                if (session === null) {
                    throw new Error("Gateway link is offline — cannot request locator");
                }
                let destination = context.locatorRequestDestinations.get(t256);
                if (destination === undefined) {
                    destination = session.reticulum.registerDestination({
                        provider: context.cryptoProvider,
                        identity: session.identity,
                        direction: DestinationDirection.IN,
                        type: DestinationType.SINGLE,
                        appName: "tp",
                        aspects: casRequestAspects(t256)
                    });
                    context.locatorRequestDestinations.set(t256, destination);
                }
                await destination.announce({ appData: encodeCasLocatorRequest(t256) });
                context.log(`Requested CAS locator for ${t256.slice(0, 16)}…`);
            },
            ensurePackageStorage,
            miniappHost: () => context.ensureMiniappHost(),
            send,
            log,
            pushInstalled: () => {
                void context.pushInstalledList();
            },
            requestHostReply: context.requestHostReply,
            tryHyperdriveFetch: async (locator) => {
                if (context.webConfig.gatewayUrl.length === 0) {
                    return null;
                }
                if (locator.driveKey.length === 0 || /^0+$/.test(locator.driveKey)) {
                    return null;
                }
                const hyperFetch = await context.loadHyperFetch();
                return hyperFetch.fetchDriveVersionForWeb({
                    gatewayUrl: context.webConfig.gatewayUrl,
                    driveKeyHex: locator.driveKey,
                    version: locator.version,
                    timeoutMs: 90000
                });
            }
        });
    }
    return context.installService;
}
