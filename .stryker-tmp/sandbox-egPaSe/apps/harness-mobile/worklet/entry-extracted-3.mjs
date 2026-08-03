/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
// @ts-nocheck

import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import {
  FreenetClient,
  FreenetClientContractBackend,
  FreenetContractPacketLogBackend,
  FreenetPropagationStore
} from "../../../packages/bridge-freenet/dist/index.js";
import { FreenetInterface } from "../../../packages/reticulum-interfaces/dist/freenet.js";
import { PACKET_LOG_WASM_BASE64 } from "./packet-log-wasm.generated.mjs";
import { PROPAGATION_SET_WASM_BASE64 } from "./propagation-set-wasm.generated.mjs";
import { bytesToHex, hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { BareCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/bare.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
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
  sleep
} from "../../../packages/worklet-core/src/index.mjs";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { selectPreferredInterface } from "../../../packages/reticulum-interfaces/dist/policy.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  verifyPackage
} from "../../../packages/app-registry/dist/index.js";
import {
  PackageResourceClient,
  assessFetchBudget,
  fetchPackage
} from "../../../packages/bridge-hyper/dist/worklet.js";
import {
  HOST_API_VERSION,
  createWorkletFlagRelayService,
  generateConfirmationToken,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import {
  PropagationServer,
  createPropagationDestination,
  DEFAULT_PROPAGATION_QUOTAS
} from "../../../packages/lxmf-ts/dist/index.js";
import { decodePeerAudioFrame, decodePeerInvitation, framePeerAudioPayload, initialPeerAudioAssemblyState, stepPeerAudioAssembly } from "../../../packages/protocol/dist/index.js";
import { SimulatedMediaCodecDriver } from "../../../packages/effects/dist/media-codec.js";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import { refuseStorePosture, shouldRefuseDeveloperMode } from "./store-posture-policy.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { AudioPeerDiscoveryAdapter, BluetoothPeerDiscoveryAdapter, CryptoPeerPairingBackend, InvitationPairingDriver, ManualPeerDiscoveryAdapter, meterHostPeerRoute, NtfyPeerDiscoveryAdapter, NtfyRendezvousClient, PeerDiscoveryRegistry, PeerSessionManager, QrPeerDiscoveryAdapter, ReticulumPeerDiscoveryAdapter, UnavailablePeerDiscoveryAdapter } from "../../../packages/peer-discovery/dist/index.js";

export async function startBleInterfaceImpl(context) {
    const node = await context.ensureReticulum();
    if (context.bleIface !== null) {
        context.status.bleConnected = context.bleBridge?.connected ?? false;
        context.pushStatus();
        return;
    }
    const identity = await context.resolveIdentity();
    if (identity === null) {
        context.log("BLE requires an identity (create one first)");
        context.status.bleEnabled = false;
        context.pushStatus();
        return;
    }
    context.log("Starting BLE interface (native GATT bridge via IPC)");
    context.bleBridge = createIpcBleBridge(identity.hash);
    context.bleIface = await BleInterface.open(context.provider, {
        name: "harness-ble",
        provider,
        pipe: context.bleBridge
    });
    node.registerInterface(context.bleIface);
    context.status.bleConnected = context.bleBridge.connected;
    if (context.bleIface.online) {
        context.log("BLE interface online");
    }
    else {
        context.log("BLE interface started; waiting for GATT connection from host");
    }
    context.pushStatus();
}

export async function startRnodeInterfaceImpl(context) {
    const node = await context.ensureReticulum();
    if (context.rnodeIface !== null) {
        context.status.rnodeConnected = context.serialBridge?.connected ?? false;
        context.pushStatus();
        return;
    }
    if (context.pendingRnodeDeviceId === null) {
        context.log("RNode requires a USB device (select one in the harness UI)");
        context.status.rnodeEnabled = false;
        context.pushStatus();
        return;
    }
    context.log(`Starting RNode interface over USB device ${context.pendingRnodeDeviceId}`);
    context.serialBridge = createIpcSerialBridge({
        deviceId: context.pendingRnodeDeviceId,
        baudRate: context.pendingRnodeBaudRate
    });
    context.rnodeIface = await RNodeInterface.open(context.provider, {
        name: "harness-rnode",
        provider,
        pipe: context.serialBridge
    });
    node.registerInterface(context.rnodeIface);
    context.status.rnodeConnected = context.serialBridge.connected;
    context.status.rnodeDeviceName = context.status.rnodeConnected ? `usb-${context.pendingRnodeDeviceId}` : null;
    if (context.rnodeIface.online) {
        context.log(`RNode interface online (firmware: ${context.rnodeIface.rnodeStatus.firmwareVersion ?? "unknown"})`);
    }
    else {
        context.log("RNode interface started; waiting for USB serial connection from host");
    }
    context.pushStatus();
}

export async function applyInterfaceConfigImpl(context) {
    if (context.nodeSuspended) {
        context.log("Interface restart deferred while node is suspended");
        return;
    }
    if (!context.anyRelayOrFreenetEnabled()) {
        await context.stopNode();
        context.log("All interfaces disabled; node stopped");
        return;
    }
    if (context.status.autoEnabled) {
        await context.startAutoInterface();
    }
    else {
        await context.stopAutoInterface();
    }
    if (context.status.bleEnabled) {
        await context.startBleInterface();
    }
    else {
        await context.stopBleInterface();
    }
    if (context.status.rnodeEnabled) {
        await context.startRnodeInterface();
    }
    else {
        await context.stopRnodeInterface();
    }
    if (context.status.freenetEnabled && context.freenetCapabilities.packetTunnel) {
        await context.startFreenetInterface();
    }
    else {
        await context.stopFreenetInterface();
    }
    if (context.status.tcpEnabled) {
        if (context.pendingTarget === null) {
            context.log("TCP enabled but no target host configured yet");
            return;
        }
        await context.startTcpInterface(context.pendingTarget.targetHost, context.pendingTarget.targetPort);
        return;
    }
    await context.stopTcpInterface();
}
