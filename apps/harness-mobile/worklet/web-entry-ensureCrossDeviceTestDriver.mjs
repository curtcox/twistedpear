/**
 * Browser core Web Worker (Phase W1/W2). Leaf peer + mini-app runtime via main-thread sandbox relay.
 */

import { createWebLeafHost } from "../../../packages/host-core/dist/web.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { createWebPackageStorage } from "../../../packages/host-core/dist/web.js";
import {
  sessionInviteContent,
  SESSION_INVITE_TITLE,
} from "../../../packages/host-core/dist/session-invite-carrier.js";
import {
  encodeDeviceStreamFrame,
  encodeSessionInviteEnvelope,
} from "../../../packages/protocol/dist/index.js";
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
  webRuntime,
} from "../../../packages/reticulum-ts/dist/web.js";
import { createWebWorkletMiniappHost } from "./web-miniapp-host.mjs";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import {
  createHostReplyChannel,
  createCrossDeviceTestDriver,
  createHarnessPeerPair,
  createMiniappAnnounceService,
  createStatusTimer,
} from "../../../packages/worklet-core/src/index.mjs";
import { createWebInstallService } from "./web-install.mjs";
import { createWebPublishService } from "./web-publish.mjs";
import { createWebSerialPipe } from "./web-serial-pipe.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  unpackPackage,
} from "../../../packages/app-registry/dist/index.js";
import {
  CasStore,
  casRequestAspects,
  encodeCasLocator,
  encodeCasLocatorRequest,
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
  UnavailablePeerDiscoveryAdapter,
} from "../../../packages/peer-discovery/dist/index.js";

export function ensureCrossDeviceTestDriverImpl(context) {
  if (context.crossDeviceTestDriver === null) {
    context.crossDeviceTestDriver = createCrossDeviceTestDriver({
      miniappHost: () => context.ensureMiniappHost(),
      installFromT256: (t256) =>
        context.ensureInstallService().installFromT256(t256),
      async importTrust(identity256t, label) {
        const publisherPublicKey = decodePublisherIdentity256t(identity256t);
        const reply = await context.requestHostReply({
          type: "confirm-request",
          token: bytesToHex(context.cryptoProvider.randomBytes(16)),
          kind: "trust-import",
          appId: "host",
          publisherPublicKey,
          summary: { label, source: "paste" },
        });
        if (reply?.approved !== true)
          throw new Error("Publisher trust import denied");
        await context.ensureInstallService().trustStore.add({
          publisherPublicKey,
          label,
          addedAt: Date.now(),
          source: "paste",
        });
      },
      async runApp(appId) {
        await context
          .ensureMiniappHost()
          .launch(await context.ensurePackageStorage(), appId);
      },
      casStore: () =>
        new CasStore(context.ensureMiniappKvStore(), (data) =>
          context.cryptoProvider.sha512(data),
        ),
      sha512: (bytes) => context.cryptoProvider.sha512(bytes),
      async casHas(t256) {
        const cas = new CasStore(context.ensureMiniappKvStore(), (data) =>
          context.cryptoProvider.sha512(data),
        );
        return cas.has(t256);
      },
      async publisherIdentity256t() {
        const identity = await loadOrCreateWebIdentity(
          context.cryptoProvider,
          context.identityOptions(),
        );
        return encodePublisherIdentity256t(identity.getPublicKey());
      },
    });
  }
  return context.crossDeviceTestDriver;
}
