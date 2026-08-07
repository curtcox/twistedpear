/* global Buffer, clearTimeout, setTimeout */
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
import {
  DEFAULT_INTERFACE_BITRATES,
  inferInterfaceKind,
  selectPreferredInterface,
} from "../../../packages/reticulum-interfaces/dist/policy.js";
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

export function logImpl(context, line) {
  context.send({ type: "log", line });
}

export function refuseStoreActionImpl(context, action) {
  return refuseStorePosture(action, context.send);
}

export function pushStatusImpl(context) {
  if (context.reticulum !== null) {
    const interfaces = context.reticulum.listInterfaces();
    const preferred = selectPreferredInterface(interfaces);
    context.status.preferredInterface = preferred?.name ?? null;
    context.status.onlineInterfaces = interfaces.filter(
      (iface) => iface.online,
    ).length;
    const relayKinds = [
      "tcp",
      "websocket",
      "auto",
      "i2p",
      "rnode",
      "bluetooth",
      "optical",
      "acoustic",
      "ntfy",
      "freenet",
    ];
    context.status.relayInterfaces = relayKinds.map((kind) => {
      const matching = interfaces.filter(
        (iface) =>
          inferInterfaceKind(iface.name) === kind ||
          (kind === "bluetooth" && inferInterfaceKind(iface.name) === "ble"),
      );
      const enabled =
        kind === "tcp"
          ? context.status.tcpEnabled
          : kind === "auto"
            ? context.status.autoEnabled
            : kind === "bluetooth"
              ? context.status.bleEnabled
              : kind === "rnode"
                ? context.status.rnodeEnabled
                : kind === "freenet"
                  ? context.status.freenetInterfaceOnline
                  : false;
      return {
        kind,
        enabled,
        online: matching.some((iface) => iface.online),
        direction: context.status.relayDirections?.[kind] ?? "both",
        bitrate:
          matching.find((iface) => iface.bitrate !== null)?.bitrate ??
          DEFAULT_INTERFACE_BITRATES[kind] ??
          null,
        bytesIn: matching.reduce((sum, iface) => sum + (iface.bytesIn ?? 0), 0),
        bytesOut: matching.reduce(
          (sum, iface) => sum + (iface.bytesOut ?? 0),
          0,
        ),
        supported: ["tcp", "auto", "rnode", "bluetooth", "freenet"].includes(
          kind,
        ),
      };
    });
  } else {
    context.status.preferredInterface = null;
    context.status.onlineInterfaces = 0;
  }
  if (context.propagationServer !== null) {
    context.status.propagationStoreBytes =
      context.propagationServer.stats.usedBytes;
    context.status.propagationMessageCount =
      context.propagationServer.stats.messageCount;
    context.status.propagationEnabled = true;
    context.status.freenetPropagationRole = true;
  } else {
    context.status.propagationEnabled = false;
    context.status.freenetPropagationRole = false;
    context.status.propagationStoreBytes = 0;
    context.status.propagationMessageCount = 0;
  }
  context.send({ type: "status", status: { ...context.status } });
}

export function updateIdentityStatusImpl(context, identity) {
  context.activeIdentity = identity;
  context.status.identityHash = bytesToHex(identity.hash);
  context.status.identityPersisted = true;
  context.pushStatus();
}

export async function loadPersistedIdentityImpl(context) {
  const stored = await context.runtime.store.get(context.IDENTITY_STORE_KEY);
  if (stored === undefined) {
    context.status.identityHash = null;
    context.status.identityPersisted = false;
    context.pushStatus();
    return null;
  }
  const identity = Identity.fromBytes(context.provider, stored);
  if (identity === null) {
    await context.runtime.store.delete(context.IDENTITY_STORE_KEY);
    context.status.identityHash = null;
    context.status.identityPersisted = false;
    context.pushStatus();
    return null;
  }
  context.updateIdentityStatus(identity);
  return identity;
}

export async function persistIdentityImpl(context, identity) {
  await context.runtime.store.set(
    context.IDENTITY_STORE_KEY,
    identity.getPrivateKey(),
  );
  context.updateIdentityStatus(identity);
}

export async function createIdentityImpl(context) {
  const identity = new Identity(context.provider);
  await context.persistIdentity(identity);
  context.log(`Created harness identity ${context.status.identityHash}`);
}

export async function resetIdentityImpl(context) {
  await context.runtime.store.delete(context.IDENTITY_STORE_KEY);
  context.activeIdentity = null;
  context.status.identityHash = null;
  context.status.identityPersisted = false;
  context.pushStatus();
  context.log("Harness identity cleared");
}

export async function stopBleInterfaceImpl(context) {
  if (context.bleIface !== null) {
    if (context.reticulum !== null) {
      context.reticulum.unregisterInterface(context.bleIface);
    }
    await context.bleIface.close();
    context.bleIface = null;
  }
  if (context.bleBridge !== null) {
    await context.bleBridge.stop();
    context.bleBridge = null;
  }
  context.status.bleConnected = false;
}

export async function stopRnodeInterfaceImpl(context) {
  if (context.rnodeIface !== null) {
    if (context.reticulum !== null) {
      context.reticulum.unregisterInterface(context.rnodeIface);
    }
    await context.rnodeIface.close();
    context.rnodeIface = null;
  }
  if (context.serialBridge !== null) {
    await context.serialBridge.close();
    context.serialBridge = null;
  }
  context.status.rnodeConnected = false;
  context.status.rnodeDeviceName = null;
}

export async function stopTcpInterfaceImpl(context) {
  if (context.tcpIface !== null) {
    await context.tcpIface.close();
    context.tcpIface = null;
  }
  context.status.linkOnline = false;
}

export function loadPacketLogWasmImpl(context) {
  if (context.packetLogWasmCache !== null) {
    return context.packetLogWasmCache;
  }
  context.packetLogWasmCache = Uint8Array.from(
    Buffer.from(PACKET_LOG_WASM_BASE64, "base64"),
  );
  return context.packetLogWasmCache;
}

export function loadPropagationSetWasmImpl(context) {
  if (context.propagationSetWasmCache !== null) {
    return context.propagationSetWasmCache;
  }
  context.propagationSetWasmCache = Uint8Array.from(
    Buffer.from(PROPAGATION_SET_WASM_BASE64, "base64"),
  );
  return context.propagationSetWasmCache;
}

export async function stopFreenetInterfaceImpl(context) {
  if (context.freenetIface !== null) {
    if (context.reticulum !== null) {
      context.reticulum.unregisterInterface(context.freenetIface);
    }
    await context.freenetIface.close().catch(() => {});
    context.freenetIface = null;
  }
  context.status.freenetInterfaceOnline = false;
}

export async function startFreenetInterfaceImpl(context) {
  const url = context.status.freenetUrl;
  const rendezvousHex = context.status.freenetRendezvousHex;
  if (url === null || url.length === 0) {
    context.log("Freenet packet tunnel requires a WebSocket URL");
    context.status.freenetInterfaceOnline = false;
    context.pushStatus();
    return;
  }
  if (
    typeof rendezvousHex !== "string" ||
    !/^[0-9a-fA-F]{64}$/.test(rendezvousHex)
  ) {
    context.log("Freenet packet tunnel requires a 64-character hex rendezvous");
    context.status.freenetInterfaceOnline = false;
    context.pushStatus();
    return;
  }
  if (context.freenetSharedClient === null) {
    context.log("Freenet packet tunnel requires an attached Freenet client");
    context.status.freenetInterfaceOnline = false;
    context.pushStatus();
    return;
  }
  const node = await context.ensureReticulum();
  if (context.freenetIface !== null) {
    context.status.freenetInterfaceOnline =
      context.freenetIface.online === true;
    context.pushStatus();
    return;
  }
  try {
    const wasm = context.loadPacketLogWasm();
    const backend = new FreenetContractPacketLogBackend({
      client: context.freenetSharedClient,
      wasm,
      rendezvous: hexToBytes(rendezvousHex),
      localDirection: context.pendingFreenetLocalDirection,
      updateOptions: { fallbackCodeField: wasm },
    });
    context.freenetIface = await FreenetInterface.open(context.provider, {
      name: "host-freenet",
      provider: context.provider,
      backend,
    });
    node.registerInterface(context.freenetIface);
    context.status.freenetInterfaceOnline =
      context.freenetIface.online === true;
    context.log(
      context.status.freenetInterfaceOnline
        ? "Freenet packet tunnel online"
        : "Freenet packet tunnel started; waiting for Freenet node",
    );
  } catch (error) {
    context.freenetIface = null;
    context.status.freenetInterfaceOnline = false;
    context.log(
      `Freenet packet tunnel failed: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  context.pushStatus();
}

export async function stopFreenetPropagationRoleImpl(context) {
  context.propagationServer = null;
  context.propagationDestination = null;
  context.status.propagationEnabled = false;
  context.status.freenetPropagationRole = false;
  context.status.propagationStoreBytes = 0;
  context.status.propagationMessageCount = 0;
}

export async function startFreenetPropagationRoleImpl(context, mirror) {
  await context.stopFreenetPropagationRole();
  await context.loadPropagationCache();
  await context.ensureReticulum();
  const identity = await context.resolveIdentity();
  if (identity === null) {
    throw new Error("Propagation role requires a host identity");
  }
  const node = context.reticulum;
  if (node === null) {
    throw new Error("Propagation role requires a running Reticulum node");
  }
  context.propagationServer = new PropagationServer(
    context.provider,
    DEFAULT_PROPAGATION_QUOTAS,
    {
      now: () => Date.now(),
      schedule: (ms, callback) => {
        const handle = setTimeout(callback, ms);
        return { cancel: () => clearTimeout(handle) };
      },
      persistence: context.createWorkletPropagationPersistence(),
      remoteMirror: mirror,
    },
  );
  context.propagationDestination = createPropagationDestination(
    context.provider,
    node,
    identity,
  );
  context.propagationServer.registerHandlers(context.propagationDestination);
  await context.propagationDestination.announce();
  await context.propagationServer.pullRemoteMirror().catch(() => {
    // Offline Freenet must not block grant activation.
  });
  context.status.propagationEnabled = true;
  context.status.freenetPropagationRole = true;
  context.status.propagationStoreBytes =
    context.propagationServer.stats.usedBytes;
  context.status.propagationMessageCount =
    context.propagationServer.stats.messageCount;
  context.log("Freenet-backed LXMF propagation role started");
}

export async function detachFreenetBackendsImpl(context) {
  await context.stopFreenetPropagationRole();
  await context.stopFreenetInterface();
  context.freenetPropagationStore = null;
  context.status.freenetPropagationAttached = false;
  if (context.freenetBackendImpl !== null) {
    await context.freenetBackendImpl.close().catch(() => {});
    context.freenetBackendImpl = null;
  }
  if (context.freenetSharedClient !== null) {
    await context.freenetSharedClient.close().catch(() => {});
    context.freenetSharedClient = null;
  }
  context.status.freenetConfigured = false;
}

export async function attachFreenetBackendsImpl(context) {
  await context.detachFreenetBackends();
  await context.ensureBareWebSocket();
  const enabled = context.status.freenetEnabled === true;
  const url = context.status.freenetUrl;
  if (!enabled || url === null || url.length === 0) {
    if (enabled) {
      context.log(
        "Freenet remote grant enabled without a URL; backends not attached",
      );
    } else {
      context.log("Freenet remote node revoked");
    }
    context.pushStatus();
    return;
  }
  const clientOptions = {
    url,
    ...(context.pendingFreenetAuthToken === null
      ? {}
      : { authToken: context.pendingFreenetAuthToken }),
  };
  context.freenetSharedClient = new FreenetClient(clientOptions);
  if (context.freenetCapabilities.contractReads) {
    context.freenetBackendImpl = new FreenetClientContractBackend({
      client: context.freenetSharedClient,
    });
    context.status.freenetConfigured = true;
    context.log(
      `Freenet contract backend attached (reads=${context.freenetCapabilities.contractReads} writes=${context.freenetCapabilities.contractWrites})`,
    );
  } else {
    context.status.freenetConfigured = false;
    context.log(
      "Freenet grant has no contract reads; contract backend not attached",
    );
  }
  if (context.freenetCapabilities.propagation) {
    try {
      const wasm = context.loadPropagationSetWasm();
      context.freenetPropagationStore = new FreenetPropagationStore({
        client: context.freenetSharedClient,
        wasm,
        updateOptions: { fallbackCodeField: wasm },
      });
      context.status.freenetPropagationAttached = true;
      context.log("Freenet propagation mirror attached");
      await context.startFreenetPropagationRole(
        context.freenetPropagationStore,
      );
    } catch (error) {
      context.freenetPropagationStore = null;
      context.status.freenetPropagationAttached = false;
      await context.stopFreenetPropagationRole();
      context.log(
        `Freenet propagation attach failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  if (context.freenetCapabilities.packetTunnel) {
    await context.startFreenetInterface();
  }
  context.pushStatus();
}

export function anyRelayOrFreenetEnabledImpl(context) {
  return (
    context.status.tcpEnabled === true ||
    context.status.autoEnabled === true ||
    context.status.bleEnabled === true ||
    context.status.rnodeEnabled === true ||
    (context.status.freenetEnabled === true &&
      context.freenetCapabilities.packetTunnel === true)
  );
}

export async function stopNodeImpl(context) {
  context.stopStatusTimer();
  context.status.running = false;
  context.status.linkOnline = false;
  context.nodeSuspended = false;
  context.pushStatus();
  await context.stopFreenetPropagationRole();
  await context.stopTcpInterface();
  await context.stopAutoInterface();
  await context.stopBleInterface();
  await context.stopRnodeInterface();
  await context.stopFreenetInterface();
  await context.stopHostLxmfDelivery();
  if (context.reticulum !== null) {
    context.reticulum.stop();
    context.reticulum = null;
  }
}

export async function resumeInterfacesImpl(context) {
  if (!context.status.running) {
    return;
  }
  context.log("Resuming interfaces after iOS foreground transition");
  await context.applyInterfaceConfig();
  if (context.hostLxmfDelivery !== null) {
    await context.hostLxmfDelivery.announce().catch((error) => {
      context.log(
        `Host LXMF re-announce deferred: ${error instanceof Error ? error.message : String(error)}`,
      );
    });
  }
}

export async function resolveIdentityImpl(context) {
  if (context.activeIdentity !== null) {
    return context.activeIdentity;
  }
  const loaded = await context.loadPersistedIdentity();
  if (loaded !== null) {
    return loaded;
  }
  await context.createIdentity();
  return context.activeIdentity;
}

export async function ensureReticulumImpl(context) {
  if (context.reticulum !== null) {
    return context.reticulum;
  }
  const identity = await context.resolveIdentity();
  if (identity === null) {
    throw new Error("Failed to resolve harness identity");
  }
  context.reticulum = Reticulum.create({
    provider: context.provider,
    runtime: context.runtime,
    inboundBandwidthLimiter: context.inboundBandwidthLimiter,
    outboundBandwidthLimiter: context.outboundBandwidthLimiter,
  });
  context.reticulum.start();
  context.status.running = true;
  context.registerAnnounceHandler();
  const inbound = context.reticulum.registerDestination({
    provider: context.provider,
    identity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"],
  });
  inbound.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
  await inbound.announce();
  context.log("Announced harness identity");
  context.startStatusTimer();
  context.pushStatus();
  await context.ensureHostLxmfDelivery().catch((error) => {
    context.log(
      `Host LXMF delivery deferred: ${error instanceof Error ? error.message : String(error)}`,
    );
  });
  return context.reticulum;
}

/**
 * Always-on LXMF delivery so session invites raise chrome without a mounted
 * peer control agent. Mobile announces once at start and again on foreground resume —
 * no periodic timer (battery policy).
 */
export async function ensureHostLxmfDeliveryImpl(context) {
  if (context.hostLxmfDelivery !== null) {
    return context.hostLxmfDelivery;
  }
  const node = await context.ensureReticulum();
  const identity = await context.resolveIdentity();
  if (identity === null) {
    throw new Error("identity unavailable");
  }
  context.hostLxmfDelivery = await createHostLxmfDelivery({
    reticulum: node,
    provider: context.provider,
    identity,
    announceIntervalMs: 0,
    receiveSessionInvite: (invite) =>
      context.ensureMiniappHost().receiveSessionInvite(invite),
    isInvitableApp: (appId) => {
      const { installedStore: installed } = context.ensureCatalog();
      return (
        installed.activeVersion(appId) !== undefined || appId === "line-check"
      );
    },
    log: context.log,
  });
  context.log(
    `Host LXMF delivery ready (${context.hostLxmfDelivery.lxmfAddress.slice(0, 12)}…)`,
  );
  return context.hostLxmfDelivery;
}

export async function stopHostLxmfDeliveryImpl(context) {
  if (context.hostLxmfDelivery === null) {
    return;
  }
  await context.hostLxmfDelivery.stop();
  context.hostLxmfDelivery = null;
}

export async function startTcpInterfaceImpl(context, targetHost, targetPort) {
  const node = await context.ensureReticulum();
  if (context.tcpIface !== null) {
    context.status.linkOnline = context.tcpIface.online;
    context.pushStatus();
    return context.tcpIface.online;
  }
  context.log(`Starting TCP client to ${targetHost}:${targetPort}`);
  context.tcpIface = await node.addTcpClientInterface({
    name: "harness-tcp",
    targetHost,
    targetPort,
  });
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    context.status.linkOnline = context.tcpIface.online;
    context.pushStatus();
    if (context.tcpIface.online) {
      context.log("TCP interface online");
      return true;
    }
    await sleep(250);
  }
  context.log("Timed out waiting for TCP interface (peer may be unreachable)");
  return false;
}
