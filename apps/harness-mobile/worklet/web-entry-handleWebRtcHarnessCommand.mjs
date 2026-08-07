/* global setTimeout */
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

/**
 * WebRTC GUI-call harness commands (mirrors desktop test-agent handleCommand).
 * Driven via `__TP_CROSS_DEVICE__` / the Node control bridge — not DevStudio.
 * @param {Record<string, unknown>} request
 */
export async function handleWebRtcHarnessCommandImpl(context, request) {
  switch (request.cmd) {
    case "harness-info":
      return {
        lxmfAddress:
          context.hostLxmfDelivery?.lxmfAddress ??
          context.status.lxmfAddress ??
          null,
        identityHash: context.status.identityHash,
        linkOnline: context.status.linkOnline === true,
      };
    case "announce":
      if (context.hostLxmfDelivery === null)
        throw new Error("Host LXMF delivery is not ready");
      await context.hostLxmfDelivery.announce();
      return {};
    case "invite-state":
      return { invites: [...context.harnessInviteEntries] };
    case "send-invite": {
      if (context.hostLxmfDelivery === null)
        throw new Error("Host LXMF delivery is not ready");
      if (typeof request.toLxmfAddress !== "string")
        throw new Error("send-invite requires toLxmfAddress");
      const appId =
        typeof request.appId === "string" ? request.appId : "line-check";
      const requestedClasses = Array.isArray(request.requestedClasses)
        ? request.requestedClasses
        : ["microphone"];
      const id = `invite-web-${context.nextHarnessInvite++}`;
      const expiresAt = Date.now() + 120000;
      const envelope = encodeSessionInviteEnvelope({
        id,
        appId,
        requestedClasses,
        expiresAt,
      });
      const hash = hexToBytes(request.toLxmfAddress);
      const recipient = Identity.recall(context.cryptoProvider, hash);
      if (recipient === null) {
        throw new Error(
          `No announced identity for ${request.toLxmfAddress}; peer not discovered yet`,
        );
      }
      await context.hostLxmfDelivery.router.packAndSend({
        destination:
          context.hostLxmfDelivery.router.createOutboundDestination(recipient),
        source: context.hostLxmfDelivery.delivery,
        title: SESSION_INVITE_TITLE,
        content: sessionInviteContent(envelope),
        desiredMethod: LXMessageMethod.OPPORTUNISTIC,
        deferStamp: true,
      });
      context.harnessInviteEntries.push({
        kind: "sent",
        id,
        appId,
        peerLabel: request.toLxmfAddress.slice(0, 12),
        requestedClasses,
        expiresAt,
        at: Date.now(),
        peerDestinationHash: request.toLxmfAddress,
      });
      return { inviteId: id, appId, expiresAt, bytes: envelope.length };
    }
    case "accept-invite": {
      const inviteId =
        typeof request.inviteId === "string" ? request.inviteId : undefined;
      if (inviteId === undefined)
        throw new Error("accept-invite requires inviteId");
      const raised = context.harnessInviteEntries.findLast(
        (entry) => entry.kind === "raised" && entry.id === inviteId,
      );
      if (raised === undefined) throw new Error(`No raised invite ${inviteId}`);
      try {
        await context.ensureMiniappHost().acceptSessionInvite(inviteId);
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        if (!detail.startsWith("No installed version for ")) throw error;
        context.log(
          `Session invite ${inviteId} accepted without launch (${detail})`,
        );
      }
      context.harnessInviteEntries.push({
        ...raised,
        kind: "accepted",
        at: Date.now(),
      });
      return {
        accepted: true,
        inviteId,
        peerDestinationHash: raised.peerDestinationHash ?? null,
      };
    }
    case "renderer-ping": {
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
    case "peer-pair-start": {
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
    case "peer-pair-code-out": {
      const taken = await context.harnessPeerPair.takeOutboundCode(
        typeof request.timeoutMs === "number" ? request.timeoutMs : 60000,
      );
      return { code: taken.code, sessionId: taken.sessionId };
    }
    case "peer-pair-code-in": {
      if (typeof request.code !== "string")
        throw new Error("peer-pair-code-in requires code");
      context.harnessPeerPair.giveInboundCode(
        request.code,
        typeof request.sessionId === "string" ? request.sessionId : undefined,
      );
      return { ok: true };
    }
    case "peer-pair-wait": {
      const paired = await context.harnessPeerPair.wait(
        typeof request.timeoutMs === "number" ? request.timeoutMs : 120000,
      );
      return paired;
    }
    case "webrtc-open-media": {
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
        encoding,
      };
    }
    case "media-opus-duplex": {
      const configuration = {
        codec: "opus",
        sampleKind: "audio",
        bitrateBps: 24000,
        sampleRate: 16000,
        channels: 1,
        voiceDuplex: true,
      };
      // Chromium Opus emits ~60ms frames; send a full frame of float32 PCM.
      const sampleCount = 960;
      const samples = new Float32Array(sampleCount);
      for (let index = 0; index < sampleCount; index += 1) {
        samples[index] = Math.sin((2 * Math.PI * 440 * index) / 16000) * 0.25;
      }
      const pcmBytes = new Uint8Array(
        samples.buffer.slice(
          samples.byteOffset,
          samples.byteOffset + samples.byteLength,
        ),
      );
      const captureAtUs = Date.now() * 1000;
      const encoded = await context.requestHostReply(
        {
          type: "media-codec-request",
          token: context.peerToken(),
          op: "encode",
          configuration,
          captureAtUs,
          dataHex: bytesToHex(pcmBytes),
        },
        15000,
      );
      if (
        encoded?.error !== undefined ||
        typeof encoded?.dataHex !== "string"
      ) {
        throw new Error(encoded?.error ?? "Opus encode timed out");
      }
      const opusBytes = hexToBytes(encoded.dataHex);
      if (opusBytes.length === 0)
        throw new Error("Opus encode produced empty payload");
      const decoded = await context.requestHostReply(
        {
          type: "media-codec-request",
          token: context.peerToken(),
          op: "decode",
          configuration,
          captureAtUs,
          dataHex: encoded.dataHex,
        },
        15000,
      );
      if (
        decoded?.error !== undefined ||
        typeof decoded?.dataHex !== "string"
      ) {
        throw new Error(decoded?.error ?? "Opus decode timed out");
      }
      const decodedBytes = hexToBytes(decoded.dataHex);
      if (decodedBytes.length < 4)
        throw new Error("Opus decode produced empty PCM");
      const frame = encodeDeviceStreamFrame({
        version: 2,
        sampleKind: 2,
        sessionToken: 7,
        sequence: 0,
        captureAtUs,
        clockId: 7,
        payload: opusBytes,
      });
      const played = await context.requestHostReply(
        {
          type: "media-opus-play-request",
          token: context.peerToken(),
          encoding: "16k-opus",
          dataHex: bytesToHex(frame),
        },
        15000,
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
        played: true,
      };
    }
    case "media-opus-play": {
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
        15000,
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
    default:
      throw new Error(`Unknown WebRTC harness command: ${request.cmd}`);
  }
}
