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

export async function startHostSessionImpl(context) {
    if (context.webConfig.gatewayUrl.length === 0) {
        context.log("Web gateway URL is not configured");
        return;
    }
    if (context.hostSession !== null) {
        context.pushStatus();
        return;
    }
    context.hostSession = await createWebLeafHost({
        gatewayUrl: context.webConfig.gatewayUrl,
        ...(context.webConfig.sharedToken === undefined ? {} : { sharedToken: context.webConfig.sharedToken }),
        identity: context.identityOptions()
    });
    context.hostLxmfDelivery = await createHostLxmfDelivery({
        reticulum: context.hostSession.reticulum,
        provider: context.cryptoProvider,
        identity: context.hostSession.identity,
        announceIntervalMs: 0,
        receiveSessionInvite: (invite) => context.ensureMiniappHost().receiveSessionInvite(invite),
        isInvitableApp: (appId) => appId === "line-check",
        log
    });
    context.hostLxmfDelivery.onInvite((invite) => {
        context.harnessInviteEntries.push({
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
    context.status.lxmfAddress = context.hostLxmfDelivery.lxmfAddress;
    context.log(`Host LXMF delivery ready (${context.hostLxmfDelivery.lxmfAddress.slice(0, 12)}…)`);
    context.hostSession.reticulum.registerAnnounceHandler({
        receivedAnnounce(info) {
            context.status.announcesSeen += 1;
            context.pushStatus();
            context.send({
                type: "announce",
                entry: {
                    destinationHash: bytesToHex(info.destinationHash),
                    hops: info.packet.hops,
                    receivedAt: Date.now(),
                    appDataHex: info.appData === null ? null : bytesToHex(info.appData)
                }
            });
            if (info.appData !== null) {
                context.ensureInstallService().ingestCasLocatorAppData(bytesToHex(info.appData));
                void context.ensurePublishService().respondToLocatorRequest(context.hostSession, info.appData).catch((error) => {
                    context.log(`CAS locator response failed: ${error instanceof Error ? error.message : String(error)}`);
                });
            }
        }
    });
    context.status.wsEnabled = true;
    context.status.tcpEnabled = true;
    context.status.running = true;
    context.startStatusTimer();
    context.pushStatus();
    context.log(`Web leaf host connected to ${context.webConfig.gatewayUrl}`);
}
