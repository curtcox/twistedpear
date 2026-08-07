/* global Buffer, Headers, setTimeout */
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

export async function ensureBareWebSocketImpl(context) {
  if (context.bareWebSocketReady === null) {
    context.bareWebSocketReady =
      import("../../../conformance/freenet-spike/bare-websocket-shim.mjs").then(
        ({ installBareWebSocketGlobal }) => {
          installBareWebSocketGlobal();
        },
      );
  }
  await context.bareWebSocketReady;
}

export function createProviderImpl(context) {
  try {
    // Mobile BareKit ESM worklets do not provide CommonJS `require`; sodium-native
    // loading in BareCryptoProvider needs it. Probe before claiming the bare path.
    if (typeof require !== "function") {
      return new PureCryptoProvider();
    }
    const candidate = new BareCryptoProvider();
    candidate.ed25519PublicFromPrivate(candidate.randomBytes(32));
    return candidate;
  } catch {
    return new PureCryptoProvider();
  }
}

export function mobileStorePathImpl(context) {
  try {
    // Linked Bare addons expose bare-os via require when available.
    // eslint-disable-next-line no-undef
    const bareOs = typeof require === "function" ? require("bare-os") : null;
    if (bareOs?.tmpdir) {
      return `${bareOs.tmpdir()}/twistedpear-reticulum-store`;
    }
  } catch {
    // ignore
  }
  // Absolute fallback: relative cwd on iOS Bare often cannot host the store.
  return "/tmp/twistedpear-reticulum-store";
}

export function runtimeKeyValueStoreImpl(context) {
  return createRuntimeKeyValueStore(context.runtime, context.runtimeStoreKeys);
}

export async function importTrustedPublisherImpl(
  context,
  identityString,
  label,
  source = "paste",
) {
  const publisherPublicKey = decodePublisherIdentity256t(identityString);
  const confirmation = await context.requestHostReply({
    type: "confirm-request",
    token: generateConfirmationToken((length) =>
      context.provider.randomBytes(length),
    ),
    kind: "trust-import",
    appId: "host",
    publisherPublicKey,
    summary: { label, source },
  });
  if (confirmation?.approved !== true)
    throw new Error("Publisher trust import denied");
  await context.ensureTrustStore().add({
    publisherPublicKey,
    label,
    addedAt: Date.now(),
    source,
  });
}

export function ensureCrossDeviceTestDriverImpl(context) {
  if (context.crossDeviceTestDriver === null) {
    const base = createCrossDeviceTestDriver({
      miniappHost: () => context.ensureMiniappHost(),
      installedStore: () => context.ensureCatalog().installedStore,
      runtime: context.runtime,
      installFromT256: context.installFromT256,
      importTrust: (identity256t, label) =>
        context.importTrustedPublisher(identity256t, label),
      casStore: () => context.ensureEntryCasStore(),
      sha512: (bytes) => context.provider.sha512(bytes),
      async publisherIdentity256t() {
        const identity = await context.resolveIdentity();
        if (identity === null) throw new Error("Host identity is unavailable");
        return encodePublisherIdentity256t(identity.getPublicKey());
      },
    });
    context.crossDeviceTestDriver = async (request) => {
      if (
        request?.cmd === "media-opus-duplex" ||
        request?.cmd === "media-opus-play"
      ) {
        return context.handleNativeMediaOpusCommand(request);
      }
      if (request?.cmd === "renderer-ping") {
        const reply = await context.requestHostReply(
          { type: "peer-qr-availability", token: context.peerToken() },
          10000,
        );
        return {
          ok: reply !== null,
          availability: reply?.availability ?? null,
          error: reply === null ? "renderer ping timed out" : reply?.error,
        };
      }
      if (request?.cmd === "peer-pair-start") {
        context.harnessPeerPair.enable();
        await context.ensurePeerSessionManager();
        context.ensureMiniappHost();
        const role = request.role === "listen" ? "listen" : "offer";
        const appId =
          typeof request.appId === "string" ? request.appId : "line-check";
        const runtimeId = "harness-webrtc";
        return context.harnessPeerPair.start(async () => {
          const manager = await context.ensurePeerSessionManager();
          const connect = {
            service: appId,
            purpose: "WebRTC media conformance",
            mechanisms: ["manual"],
            timeoutMs: 120000,
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
            displayLabel: info.displayLabel,
          };
        });
      }
      if (request?.cmd === "peer-pair-code-out") {
        const taken = await context.harnessPeerPair.takeOutboundCode(
          typeof request.timeoutMs === "number" ? request.timeoutMs : 60000,
        );
        return { code: taken.code, sessionId: taken.sessionId };
      }
      if (request?.cmd === "peer-pair-code-in") {
        if (typeof request.code !== "string")
          throw new Error("peer-pair-code-in requires code");
        context.harnessPeerPair.giveInboundCode(
          request.code,
          typeof request.sessionId === "string" ? request.sessionId : undefined,
        );
        return { ok: true };
      }
      if (request?.cmd === "peer-pair-wait") {
        return context.harnessPeerPair.wait(
          typeof request.timeoutMs === "number" ? request.timeoutMs : 120000,
        );
      }
      if (request?.cmd === "webrtc-open-media") {
        context.ensureMiniappHost();
        if (context.attachWebRtcMediaTrack === null) {
          throw new Error("WebRTC media attach is not configured");
        }
        const appId =
          typeof request.appId === "string" ? request.appId : "line-check";
        const handleId =
          typeof request.handleId === "string" ? request.handleId : undefined;
        if (handleId === undefined)
          throw new Error("webrtc-open-media requires handleId");
        const classId = request.classId === "camera" ? "camera" : "microphone";
        const encoding = classId === "camera" ? "480p15" : "16k-opus";
        const attached = await context.attachWebRtcMediaTrack({
          appId,
          peer: handleId,
          demand: {
            classId,
            tierId: classId === "camera" ? "frames" : "pcm",
            encoding,
          },
        });
        let bytesSent = attached.bytesSent ?? 0;
        let voiceProcessing = attached.voiceProcessing ?? null;
        if (bytesSent === 0 && typeof attached.sessionId === "string") {
          for (let attempt = 0; attempt < 20 && bytesSent === 0; attempt += 1) {
            await new Promise((resolve) => setTimeout(resolve, 250));
            const stats = await context.requestHostReply(
              {
                type: "peer-webrtc-media-stats",
                token: context.peerToken(),
                sessionId: attached.sessionId,
              },
              10000,
            );
            if (typeof stats?.bytesSent === "number")
              bytesSent = stats.bytesSent;
          }
        }
        return {
          attached: true,
          plane: "webrtc-track",
          handleId,
          sessionId: attached.sessionId,
          bytesSent,
          voiceProcessing,
          encoding,
        };
      }
      return base(request);
    };
  }
  return context.crossDeviceTestDriver;
}

export async function handleNativeMediaOpusCommandImpl(context, request) {
  // Encode/decode lives on the RN host — BareKit cannot safely pack opusscript.
  if (request.cmd === "media-opus-play") {
    if (typeof request.dataHex !== "string" || request.dataHex.length < 72) {
      throw new Error("media-opus-play requires TPD2 dataHex");
    }
    const encoding =
      typeof request.encoding === "string" ? request.encoding : "16k-opus";
    const played = await context.requestHostReply(
      {
        type: "media-opus-play-request",
        token: context.peerToken(),
        encoding,
        dataHex: request.dataHex,
      },
      30000,
    );
    if (played?.error !== undefined || played?.played !== true) {
      throw new Error(played?.error ?? "Opus speaker playback failed");
    }
    return {
      played: true,
      encoding,
      bytes: Math.floor(request.dataHex.length / 2),
    };
  }
  // First Hermes asm.js Opus load can take tens of seconds; keep above the host encode budget.
  const duplex = await context.requestHostReply(
    { type: "media-opus-duplex-request", token: context.peerToken() },
    90000,
  );
  if (duplex?.error !== undefined || duplex?.ok !== true) {
    throw new Error(
      duplex?.error ??
        (duplex === null
          ? "Opus duplex timed out waiting for host"
          : "Opus duplex failed on host"),
    );
  }
  return {
    ok: true,
    implementation: duplex.implementation ?? "bundled-opus",
    voiceDuplex: duplex.voiceDuplex === true,
    encoding: duplex.encoding ?? "16k-opus",
    pcmBytes: duplex.pcmBytes,
    opusBytes: duplex.opusBytes,
    decodedBytes: duplex.decodedBytes,
    frameBytes: duplex.frameBytes,
    frameHex: duplex.frameHex,
    played: duplex.played === true,
  };
}

export async function ensurePackageDriveManagerImpl(context) {
  if (context.packageDriveManager === null) {
    const { createSwarm, DriveManager } =
      await import("../../../packages/bridge-hyper/dist/worklet-hyper.js");
    context.packageSwarm = createSwarm({
      inboundBandwidthLimiter: context.inboundBandwidthLimiter,
      outboundBandwidthLimiter: context.outboundBandwidthLimiter,
    });
    context.packageDriveManager = new DriveManager({
      storagePath: "hyper-storage",
      swarm: context.packageSwarm,
    });
    await context.packageDriveManager.ready();
  }
  return context.packageDriveManager;
}

export function sendImpl(context, message) {
  context.IPC.write(Buffer.from(`${JSON.stringify(message)}\n`));
}

export function peerTokenImpl(context) {
  return bytesToHex(context.provider.randomBytes(16));
}

export function ntfyHostFetchImpl(context, input, init = {}) {
  const headers = {};
  new Headers(init.headers).forEach((value, name) => {
    headers[name] = value;
  });
  return context
    .requestHostReply(
      {
        type: "peer-ntfy-http",
        token: context.peerToken(),
        request: {
          url: String(input),
          method: init.method ?? "GET",
          headers,
          ...(typeof init.body === "string" ? { body: init.body } : {}),
        },
      },
      30000,
    )
    .then((reply) => {
      if (
        reply === null ||
        reply.error !== undefined ||
        reply.http === undefined
      )
        throw new Error(reply?.error ?? "ntfy host request timed out");
      const result = reply.http;
      return {
        ok: result.status >= 200 && result.status < 300,
        status: result.status,
        headers: {
          get(name) {
            return name.toLowerCase() === "content-length"
              ? result.contentLength
              : null;
          },
        },
        async text() {
          return result.body;
        },
      };
    });
}

export function sendBluetoothInvitationImpl(context, envelope) {
  const invitation = decodePeerInvitation(envelope, Date.now());
  context.send({
    type: "peer-bluetooth-send",
    framesHex: framePeerAudioPayload(invitation.sessionId, envelope, 192).map(
      bytesToHex,
    ),
  });
}

export function receiveBluetoothFrameImpl(context, frameBytes) {
  const frame = decodePeerAudioFrame(frameBytes);
  const key = bytesToHex(frame.sessionId);
  const current =
    context.bluetoothAssemblies.get(key) ??
    initialPeerAudioAssemblyState(Date.now() + 120000);
  const result = stepPeerAudioAssembly(current, frameBytes, Date.now());
  if (result.payload === null) {
    context.bluetoothAssemblies.set(key, result.state);
    return;
  }
  context.bluetoothAssemblies.delete(key);
  const invitation = decodePeerInvitation(result.payload, Date.now());
  if (invitation.role === "answer") {
    const waiter = context.bluetoothAnswerWaiters.get(key);
    if (waiter !== undefined) {
      context.bluetoothAnswerWaiters.delete(key);
      context.bluetoothOfferKeys.delete(waiter.adapterSessionId);
      waiter.resolve(result.payload);
    }
    return;
  }
  const inbound = {
    session: { id: `ble:${key}`, kind: "bluetooth" },
    envelope: result.payload,
  };
  const waiter = context.bluetoothOfferWaiters.shift();
  if (waiter !== undefined) waiter(inbound);
  else {
    context.bluetoothOfferQueue.push(inbound);
    if (context.bluetoothOfferQueue.length > 16)
      context.bluetoothOfferQueue.shift();
  }
}
