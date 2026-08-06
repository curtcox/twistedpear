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

import { handleHostMessageTailImpl } from "./entry-extracted-9.mjs";

export async function handleHostMessageImpl(context, raw) {
  const line = raw.toString().trim();
  if (line.length === 0) {
    return;
  }
  let message;
  try {
    message = JSON.parse(line);
  } catch {
    context.log(`Ignored host message: ${line}`);
    return;
  }
  if (message.type === "start") {
    context.pendingTarget = {
      targetHost: message.targetHost,
      targetPort: message.targetPort,
    };
    await context.loadRelayConfig();
    const nextNtfyUrl =
      typeof message.ntfyUrl === "string" && message.ntfyUrl.trim() !== ""
        ? message.ntfyUrl.trim()
        : null;
    if (nextNtfyUrl !== context.ntfyUrl) {
      context.ntfyUrl = nextNtfyUrl;
      context.peerSessionManager = null;
    }
    context.multicastEntitled = message.multicastEntitled !== false;
    context.bonjourDiscoveryEnabled = message.bonjourEnabled !== false;
    if (context.status.tcpEnabled) {
      await context.applyInterfaceConfig();
    } else {
      context.log(
        `Target set to ${message.targetHost}:${message.targetPort} (enable TCP to connect)`,
      );
    }
    return;
  }
  if (
    message.type === "peer-chrome-response" ||
    message.type === "confirm-response" ||
    message.type === "launch-confirm" ||
    message.type === "install-confirm" ||
    message.type === "device-bridge-response" ||
    message.type === "media-opus-duplex-response" ||
    message.type === "media-opus-play-response" ||
    message.type === "media-codec-response"
  ) {
    context.hostReplyChannel.resolveReply(message);
    return;
  }
  if (message.type === "peer-webrtc-data") {
    const listeners = context.webRtcRouteListeners.get(message.sessionId);
    const payload = hexToBytes(message.dataHex);
    if (listeners === undefined || listeners.size === 0) {
      const pending = context.webRtcRoutePending.get(message.sessionId) ?? [];
      pending.push(payload);
      if (pending.length > 16) pending.shift();
      context.webRtcRoutePending.set(message.sessionId, pending);
    } else {
      for (const listener of listeners) listener(payload);
    }
    return;
  }
  if (message.type === "suspend-node") {
    if (context.nodeSuspended) {
      return;
    }
    context.nodeSuspended = true;
    await context.quiesceInterfaces();
    return;
  }
  if (message.type === "resume-node") {
    if (!context.nodeSuspended) {
      return;
    }
    context.nodeSuspended = false;
    await context.resumeInterfaces();
    return;
  }
  if (message.type === "stop") {
    await context.stopNode();
    context.log("Worklet stopped");
    return;
  }
  if (message.type === "create-identity") {
    await context.createIdentity();
    return;
  }
  if (message.type === "reset-identity") {
    await context.resetIdentity();
    return;
  }
  if (message.type === "install-from-256t") {
    try {
      const result = await context.installFromT256(message.t256.trim());
      context.send({ type: "install-256t-result", ok: true, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      context.log(`Install from 256t failed: ${detail}`);
      context.send({ type: "install-256t-result", ok: false, error: detail });
    }
    return;
  }
  if (message.type === "trust-list") {
    await pushTrustList();
    return;
  }
  if (message.type === "trust-add") {
    try {
      await context.importTrustedPublisher(
        message.identityString,
        message.label ?? "Unnamed publisher",
        message.source ?? "paste",
      );
      context.log(`Trusted publisher ${message.label ?? "Unnamed publisher"}`);
    } catch (error) {
      context.log(
        `Trust add failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await pushTrustList();
    return;
  }
  if (message.type === "trust-remove") {
    await ensureTrustStore().remove(message.publisherPublicKey);
    await pushTrustList();
    return;
  }
  if (message.type === "trust-show") {
    const identity = await context.resolveIdentity();
    context.send({
      type: "trust-identity",
      identity256t:
        identity === null
          ? null
          : encodePublisherIdentity256t(identity.getPublicKey()),
    });
    return;
  }
  if (message.type === "list-catalog" || message.type === "list-installed") {
    pushCatalog();
    return;
  }
  if (message.type === "install-app") {
    if (context.refuseStoreAction("Catalog install")) {
      context.send({
        type: "install-progress",
        progress: {
          appId: message.appId,
          phase: "failed",
          bytesReceived: 0,
          totalBytes: 0,
          path: null,
          verified: false,
        },
      });
      return;
    }
    const { catalogStore: catalog, installedStore: installed } =
      ensureCatalog();
    const entry = catalog.get(message.appId);
    if (entry === null) {
      context.log(`Install failed: unknown app ${message.appId}`);
      return;
    }
    const interfaces = context.reticulum?.listInterfaces() ?? [];
    const budget = assessFetchBudget(entry, interfaces);
    if (!budget.allowed) {
      context.log(`Install blocked: ${budget.blockedReason}`);
      return;
    }
    if (budget.warning !== null) {
      context.log(budget.warning);
    }
    context.send({
      type: "install-progress",
      progress: {
        appId: entry.appId,
        phase: "starting",
        bytesReceived: 0,
        totalBytes: entry.packageSize,
        path: message.forcePath ?? null,
        verified: false,
      },
    });
    const installVerifiedPackage = async (archive, path) => {
      context.send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "verifying",
          bytesReceived: archive.length,
          totalBytes: archive.length,
          path,
          verified: false,
        },
      });
      const verified = verifyPackage(context.provider, archive, {
        hostApiVersion: HOST_API_VERSION,
        minVersion: installed.latestVersion(entry.appId) ?? undefined,
      });
      validateManifestCapabilities(verified.manifest.capabilities);
      const archivePath = `packages/${entry.appId}/${verified.manifest.version}.tpkg`;
      await context.runtime.store.set(archivePath, archive);
      installed.install(
        {
          appId: entry.appId,
          version: verified.manifest.version,
          packageHash: verified.packageHash,
          installedAt: Date.now(),
          manifest: verified.manifest,
          archivePath,
        },
        archive.length,
      );
      await persistCatalogState();
      context.send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "complete",
          bytesReceived: archive.length,
          totalBytes: archive.length,
          path,
          verified: true,
        },
      });
      pushCatalog();
      context.log(
        `Installed ${entry.name} v${verified.manifest.version} via ${path} (verified)`,
      );
    };
    try {
      if (message.archiveHex) {
        await installVerifiedPackage(
          hexToBytes(message.archiveHex),
          message.forcePath ?? "resource",
        );
        return;
      }
      const identity = await context.resolveIdentity();
      if (identity === null) {
        throw new Error("No harness identity available for fetch");
      }
      const driveManager = await context.ensurePackageDriveManager();
      let resourceClient = null;
      const publisherPublicKeyHex =
        entry.manifest?.publisherPublicKey ??
        (entry.publisherPublicKey.length === 128
          ? entry.publisherPublicKey
          : null);
      if (publisherPublicKeyHex !== null) {
        resourceClient = new PackageResourceClient({
          provider,
          runtime,
          publisherPublicKeyHex,
          appName: entry.name,
          identity,
        });
        await resourceClient.start();
      }
      const result = await fetchPackage(context.provider, {
        entry,
        version: entry.version,
        interfaces,
        driveManager,
        resourceClient: resourceClient ?? undefined,
        forcePath: message.forcePath,
        onProgress(progress) {
          context.send({
            type: "install-progress",
            progress: {
              appId: entry.appId,
              phase:
                progress.phase === "verifying"
                  ? "verifying"
                  : progress.phase === "complete"
                    ? "complete"
                    : "downloading",
              bytesReceived: progress.bytesReceived,
              totalBytes: progress.totalBytes,
              path: progress.path,
              verified: progress.phase === "complete",
            },
          });
        },
      });
      if (resourceClient !== null) {
        await resourceClient.stop();
      }
      await installVerifiedPackage(result.archiveBytes, result.path);
    } catch (error) {
      context.send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "failed",
          bytesReceived: 0,
          totalBytes: entry.packageSize,
          path: message.forcePath ?? null,
          verified: false,
        },
      });
      context.log(
        `Install failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "delete-package") {
    const { installedStore: installed } = ensureCatalog();
    installed.remove(message.appId, message.version, 0);
    void persistCatalogState();
    pushCatalog();
    return;
  }
  if (message.type === "rollback-package") {
    const { installedStore: installed } = ensureCatalog();
    const rolledBack = installed.rollback(message.appId);
    if (rolledBack === null) {
      context.log(`Rollback failed: no previous version for ${message.appId}`);
      return;
    }
    void persistCatalogState();
    pushCatalog();
    context.log(`Rolled back ${message.appId} to v${rolledBack}`);
    return;
  }
  if (message.type === "device-list") {
    try {
      await context.ensureMiniappHost().pushDeviceState();
    } catch (error) {
      context.log(
        `Device list failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "device-set-class-disabled") {
    try {
      await context
        .ensureMiniappHost()
        .setDeviceClassDisabled(message.classId, message.disabled === true);
    } catch (error) {
      context.log(
        `Device policy update failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "device-set-remote") {
    try {
      await context
        .ensureMiniappHost()
        .setRemoteAcquisitionEnabled(message.enabled === true);
    } catch (error) {
      context.log(
        `Remote acquisition update failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "device-kill-session") {
    try {
      await context.ensureMiniappHost().forceCloseDeviceSession(message.handle);
    } catch (error) {
      context.log(
        `Device session kill failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "device-revoke-share") {
    await context
      .ensureMiniappHost()
      .revokeShareOffer(message.appId, message.id);
    return;
  }
  if (message.type === "device-test-seed-share") {
    try {
      const offer = await context.ensureMiniappHost().seedShareOfferForTest({
        appId: message.appId,
        displayLabel: message.displayLabel,
        classId: message.classId,
        ttlMs: message.ttlMs,
      });
      context.log(`Seeded share offer ${offer.id} for ${offer.displayLabel}`);
    } catch (error) {
      context.log(
        `Seed share offer failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  return handleHostMessageTailImpl(context, message);
}
