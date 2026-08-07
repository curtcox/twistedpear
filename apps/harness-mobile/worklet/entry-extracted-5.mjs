/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  FreenetClient,
  FreenetClientContractBackend,
  FreenetContractPacketLogBackend,
  FreenetPropagationStore,
} from "../../../packages/bridge-freenet/dist/index.js";
import { FreenetInterface } from "../../../packages/reticulum-interfaces/dist/freenet.js";
import { PACKET_LOG_WASM_BASE64 } from "./packet-log-wasm.generated.mjs";
import { PROPAGATION_SET_WASM_BASE64 } from "./propagation-set-wasm.generated.mjs";
import {
  bytesToHex,
  hexToBytes,
} from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { BareCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/bare.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { BandwidthLimiter } from "../../../packages/reticulum-ts/dist/transport/bandwidth.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { AutoInterfaceBridge } from "../../../packages/reticulum-interfaces/dist/auto-bridge.js";
import { BleInterface } from "../../../packages/reticulum-interfaces/dist/ble/interface.js";
import { createIpcMulticastBridge } from "../../../packages/worklet-core/src/ipc-multicast-bridge.mjs";
import { createIpcBonjourBridge } from "../../../packages/worklet-core/src/ipc-bonjour-bridge.mjs";
import { createIpcBleBridge } from "./ipc-ble-bridge.mjs";
import { createIpcSerialBridge } from "../../../packages/worklet-core/src/ipc-serial-bridge.mjs";
import {
  connectTestAgent,
  createAutoInterfaceOps,
  createAutomaticReticulumDiscovery,
  createCasLocatorOps,
  createCatalogOps,
  createCrossDeviceTestDriver,
  createDevChannelClient,
  createEnsureDevChannel,
  createHarnessPeerPair,
  createHostReplyChannel,
  createInstallFromT256,
  createMiniappAnnounceService,
  createPeerSessionManagerProxyFromState,
  createPublishArchiveOps,
  createQuiesceInterfaces,
  createRegisterAnnounceHandler,
  createRuntimeKeyValueStore,
  createStatusTimer,
  createTrustStoreOps,
  createWorkletMiniappHost,
  createWorkletPropagationPersistenceOps,
  joinCommunityNetwork,
  peerServiceAspect,
  sleep,
} from "../../../packages/worklet-core/src/index.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  verifyPackage,
} from "../../../packages/app-registry/dist/index.js";
import {
  PackageResourceClient,
  assessFetchBudget,
  fetchPackage,
} from "../../../packages/bridge-hyper/dist/worklet.js";
import {
  HOST_API_VERSION,
  createWorkletFlagRelayService,
  generateConfirmationToken,
  validateManifestCapabilities,
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS,
} from "../../../packages/lxmf-ts/dist/index.js";
import {
  decodePeerAudioFrame,
  decodePeerInvitation,
  framePeerAudioPayload,
  initialPeerAudioAssemblyState,
  stepPeerAudioAssembly,
} from "../../../packages/protocol/dist/index.js";
import { SimulatedMediaCodecDriver } from "../../../packages/effects/dist/media-codec.js";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import {
  refuseStorePosture,
  shouldRefuseDeveloperMode,
} from "./store-posture-policy.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { BridgeForwarder } from "../../../packages/host-core/dist/bridge-forwarder.js";
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

export function ensureMiniappHostImpl(context) {
  if (context.miniappHost === null) {
    const relayService = createWorkletFlagRelayService({
      initialMode: "off",
      getFlags: () => ({
        tcpEnabled: context.status.tcpEnabled,
        autoEnabled: context.status.autoEnabled,
        bleEnabled: context.status.bleEnabled,
        rnodeEnabled: context.status.rnodeEnabled,
        tcpOnline: context.tcpIface?.online === true,
        autoOnline:
          context.autoIface?.online === true || context.status.autoPeers > 0,
        bleOnline: context.status.bleConnected === true,
        rnodeOnline: context.status.rnodeConnected === true,
      }),
      setFlags(patch) {
        if (patch.tcpEnabled !== undefined)
          context.status.tcpEnabled = patch.tcpEnabled;
        if (patch.autoEnabled !== undefined)
          context.status.autoEnabled = patch.autoEnabled;
        if (patch.bleEnabled !== undefined)
          context.status.bleEnabled = patch.bleEnabled;
        if (patch.rnodeEnabled !== undefined)
          context.status.rnodeEnabled = patch.rnodeEnabled;
      },
      async applyInterfaceConfig() {
        await context.applyInterfaceConfig();
        context.relayBridge?.refresh();
        await context.persistRelayConfig();
      },
      setTcpTarget(host, port) {
        context.pendingTarget = { targetHost: host, targetPort: port };
      },
      setRnodeOptions(options) {
        if (typeof options.deviceId === "string")
          context.pendingRnodeDeviceId = options.deviceId;
        if (typeof options.baudRate === "number")
          context.pendingRnodeBaudRate = options.baudRate;
      },
      async setMode(mode) {
        const node = await context.ensureReticulum();
        context.relayBridge?.stop();
        context.relayBridge = null;
        node.setTransportEnabled(mode === "transport-node");
        context.status.relayMode = mode;
        if (mode === "bridge") {
          context.relayBridge = new BridgeForwarder({
            provider: context.provider,
            getInterfaces: () => node.listInterfaces(),
            getPolicy: () => context.relayPolicy,
          });
          context.relayBridge.start();
        }
        context.pushStatus();
        await context.persistRelayConfig();
      },
      async setDirection(kind, direction) {
        const iface =
          kind === "tcp"
            ? context.tcpIface
            : kind === "auto"
              ? context.autoIface
              : kind === "bluetooth"
                ? context.bleIface
                : kind === "rnode"
                  ? context.rnodeIface
                  : null;
        if (iface !== null) {
          iface.incoming = direction !== "tx";
          iface.outgoing = direction !== "rx";
        }
        context.status.relayDirections = {
          ...context.status.relayDirections,
          [kind]: direction,
        };
        context.relayBridge?.refresh();
        context.pushStatus();
        await context.persistRelayConfig();
      },
      async setPolicy(policy) {
        context.relayPolicy = policy;
        await context.persistRelayConfig();
      },
    });
    context.relayService = relayService;
    context.miniappHost = createWorkletMiniappHost({
      provider: context.provider,
      kvStore: context.runtimeKeyValueStore(),
      beeStoragePath: "miniapp-bee-store",
      defaultPlatform: "android",
      browserDeviceClasses: ["location", "camera", "microphone", "haptics"],
      enableBenchmark: true,
      async launchInstalledApp(appId) {
        const { installedStore: installed } = context.ensureCatalog();
        await context
          .ensureMiniappHost()
          .launch(installed, context.runtime, appId);
      },
      getPresenceSnapshot: () => ({
        ...context.status,
        autoPeers:
          context.status.autoPeers +
          (context.peerSessionManager?.routes.list().length ?? 0),
      }),
      relayMutation: (notice) =>
        context.send({ type: "relay-attribution", ...notice }),
      peerSessionManager: context.peerSessionManagerProxy,
      realtimeReservations: {
        reserveRealtime: (bytesPerSecond) =>
          context.outboundBandwidthLimiter.reserve("realtime", bytesPerSecond),
      },
      controlReservations: {
        reserveControl: (bytesPerSecond) =>
          context.outboundBandwidthLimiter.reserve("control", bytesPerSecond),
      },
      onInboundMediaFrame(appId, stream, frame, offer) {
        context.send({
          type: "inbound-media-frame",
          appId,
          handle: stream.handle,
          sink: stream.sink,
          encoding: offer.encoding,
          dataHex: bytesToHex(frame),
        });
      },
      async openMediaCodec(configuration) {
        // Bare worklet cannot pack opusscript; keep the Effect boundary open via Simulated.
        // Host-side BundledOpus handles media-opus-duplex / media-opus-play IPC.
        void configuration;
        return new SimulatedMediaCodecDriver();
      },
      openCasPlane: {
        put: (frame) => context.ensureEntryCasStore().put(frame),
      },
      openWebRtcMediaPlane: createDelegatedWebRtcMediaPlaneOpener(
        (context.attachWebRtcMediaTrack = async ({ appId, peer, demand }) => {
          const confirmed = context.peerSessionManagerProxy.route(appId, {
            id: peer,
          });
          if (confirmed?.dataPlane !== "webrtc") {
            throw new Error("No authenticated WebRTC route for media tracks.");
          }
          const sessionId = context.webRtcSessionByFingerprint.get(
            confirmed.fingerprint,
          );
          if (sessionId === undefined) {
            throw new Error(
              "WebRTC session is missing for media track attach.",
            );
          }
          const reply = await context.requestHostReply(
            {
              type: "peer-webrtc-media-attach",
              token: context.peerToken(),
              sessionId,
              classId: demand.classId,
              tierId: demand.tierId,
            },
            30000,
          );
          if (reply?.attached !== true) {
            throw new Error(
              typeof reply?.error === "string"
                ? reply.error
                : "WebRTC media track attach failed.",
            );
          }
          return {
            sessionId,
            bytesSent:
              typeof reply.bytesSent === "number" ? reply.bytesSent : 0,
            voiceProcessing: reply.voiceProcessing ?? null,
            quality: () => ({
              goodputBps: 2000000,
              rttMs: 50,
              jitterMs: 10,
              lossRatio: 0,
              mtu: 1200,
              source: "declared",
              samples: 1,
              confidence: "low",
            }),
            close: async () => {
              await context.requestHostReply(
                {
                  type: "peer-webrtc-media-detach",
                  token: context.peerToken(),
                  sessionId,
                  classId: demand.classId,
                },
                10000,
              );
            },
          };
        }),
      ),
      openPearsBulkPlane: {
        async append({ appId, peer, frame, sequence }) {
          const driveManager = await context.ensurePackageDriveManager();
          if (driveManager.activeDrive === null) {
            await driveManager.createDrive();
          }
          const drive = driveManager.activeDrive;
          if (drive === null)
            throw new Error(
              "Hyperdrive is not initialized for pears-bulk media.",
            );
          const safePeer = peer.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
          const path = `/media-streams/${appId}/${safePeer}/${String(sequence).padStart(8, "0")}.tpd2`;
          await drive.put(path, frame);
          return { path };
        },
      },
      async requestShareOffer({ appId, purpose }) {
        const peer = context.peerSessionManagerProxy.list(appId)[0];
        if (peer === undefined) return null;
        const reply = await context.requestHostReply({
          type: "confirm-request",
          token: context.peerToken(),
          kind: "device-share-offer",
          appId,
          publisherPublicKey: "host-authenticated-peer",
          summary: {
            purpose,
            peer: peer.displayLabel,
            class: "microphone",
            tier: "pcm",
            quality: "16k-opus",
            duration: "15 minutes",
          },
        });
        return reply?.approved === true
          ? {
              targetKind: "peer",
              targetId: peer.handle.id,
              displayLabel: peer.displayLabel,
              classId: "microphone",
              tierId: "pcm",
              maxRung: "16k-opus",
              ttlMs: 15 * 60000,
            }
          : null;
      },
      async confirmShareOfferRevoke(offer) {
        const reply = await context.requestHostReply({
          type: "confirm-request",
          token: context.peerToken(),
          kind: "device-share-revoke",
          appId: offer.appId,
          publisherPublicKey: "host-authenticated-peer",
          summary: { peer: offer.displayLabel, class: offer.classId },
        });
        return reply?.approved === true;
      },
      async confirmCostlyLinkProbe({ appId, peer, budgetBytes }) {
        const reply = await context.requestHostReply({
          type: "confirm-request",
          token: context.peerToken(),
          kind: "link-probe",
          appId,
          publisherPublicKey: "host-authenticated-peer",
          summary: { peer: peer.displayLabel, budgetBytes },
        });
        return reply?.approved === true;
      },
      relayService,
      freenetBackend: context.freenetBackendProxy,
      announceService: context.transportAnnounceService,
      getPublisherIdentity: () => context.resolveIdentity(),
      publishArchive: context.publishArchiveFromWorklet,
      installFromT256: context.installFromT256,
      async requestUserConfirmation(request) {
        const reply = await context.requestHostReply({
          type: "confirm-request",
          token: request.token,
          kind: request.kind,
          appId: request.appId,
          publisherPublicKey: request.publisherPublicKey,
          summary: request.summary,
        });
        return { approved: reply?.approved === true, detail: reply?.detail };
      },
      async requestDeviceBridge(request) {
        const token = context.peerToken();
        const reply = await context.requestHostReply(
          {
            type: "device-bridge-request",
            token,
            op: request.op,
            classId: request.classId,
            options: request.options ?? {},
            ...(request.command !== undefined
              ? { command: request.command }
              : {}),
          },
          30000,
        );
        if (reply === null) throw new Error("Device bridge request timed out");
        if (reply.error) throw new Error(String(reply.error));
        return reply.result;
      },
      async requestLaunchReview(review) {
        return context.requestHostReply({
          type: "launch-review",
          token: review.token,
          appId: review.appId,
          publisherPublicKey: review.publisherPublicKey,
          version: review.version,
          capabilities: review.capabilities,
        });
      },
      getHostInfoSnapshot: () => {
        const barePlatform =
          typeof Bare !== "undefined" &&
          Bare !== null &&
          typeof Bare.platform === "string"
            ? Bare.platform
            : "";
        const platform =
          barePlatform === "ios" || barePlatform === "ios-simulator"
            ? "ios"
            : barePlatform === "android"
              ? "android"
              : "android";
        const interfaceTypes = [];
        if (context.status.tcpEnabled) interfaceTypes.push("tcp");
        if (context.status.autoEnabled) interfaceTypes.push("auto");
        if (context.status.bleEnabled) interfaceTypes.push("ble");
        if (context.status.rnodeEnabled) interfaceTypes.push("rnode");
        return {
          platform,
          hostVersion: HOST_API_VERSION,
          roles: {
            transport: false,
            seeder: false,
            propagation: context.propagationServer !== null,
          },
          interfaceTypes,
          quotas: {
            kvQuotaBytes: null,
            seedStorageUsedBytes: context.status.storageUsedBytes ?? null,
            seedStorageQuotaBytes: null,
            memoryBytes: null,
          },
          dropCensus: context.status.dropCensus ?? { byReason: {}, byPeer: {} },
        };
      },
      send: context.send,
      onDeveloperModeChange(enabled) {
        context.status.developerMode = enabled;
        context.pushStatus();
      },
      onMiniappStateChange(running) {
        context.status.miniappRunning = running;
        context.pushStatus();
      },
    });
  }
  return context.miniappHost;
}
