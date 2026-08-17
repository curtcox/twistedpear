/**
 * Bare worklet entry (bundled with bare-pack for react-native-bare-kit).
 * Runs reticulum-ts with the Bare runtime adapter and reports status over IPC.
 */
import "../../../conformance/bare-interop/bare-globals.mjs";
import "bare-encoding/global";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import {
  connectTestAgent,
  joinCommunityNetwork,
} from "../../../packages/worklet-core/src/index.mjs";
import { shouldRefuseDeveloperMode } from "./store-posture-policy.mjs";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";

export async function handleHostMessageTailImpl(context, message) {
  if (message.type === "session-invite-accept") {
    try {
      await context.ensureMiniappHost().acceptSessionInvite(message.id);
      context.log(`Accepted session invite ${message.id}`);
    } catch (error) {
      context.log(
        `Session invite accept failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "session-invite-decline") {
    try {
      context.ensureMiniappHost().declineSessionInvite(message.id);
      context.log(`Declined session invite ${message.id}`);
    } catch (error) {
      context.log(
        `Session invite decline failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "set-developer-mode") {
    if (shouldRefuseDeveloperMode(message.enabled)) {
      context.log("Developer mode refused in store posture variant");
      context.ensureMiniappHost().setDeveloperMode(false);
      return;
    }
    context.ensureMiniappHost().setDeveloperMode(message.enabled);
    context.log(`Developer mode ${message.enabled ? "enabled" : "disabled"}`);
    return;
  }
  if (message.type === "get-grants") {
    await context
      .ensureMiniappHost()
      .getGrants(
        message.appId,
        message.publisherPublicKey,
        message.declaredCapabilities,
      );
    return;
  }
  if (message.type === "set-grants") {
    await context
      .ensureMiniappHost()
      .setGrants(
        message.appId,
        message.publisherPublicKey,
        message.declaredCapabilities,
        message.grantedCapabilities,
      );
    context.log(`Saved grants for ${message.appId}`);
    return;
  }
  if (message.type === "revoke-grant") {
    await context
      .ensureMiniappHost()
      .revokeGrant(
        message.appId,
        message.publisherPublicKey,
        message.capability,
        message.declaredCapabilities,
      );
    context.log(`Revoked ${message.capability} for ${message.appId}`);
    return;
  }
  if (message.type === "launch-miniapp") {
    const { installedStore: installed } = context.ensureCatalog();
    try {
      await context
        .ensureMiniappHost()
        .launch(installed, context.runtime, message.appId);
      context.log(`Launched mini-app ${message.appId}`);
    } catch (error) {
      context.log(
        `Launch failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "benchmark-miniapp") {
    try {
      const result = await context.ensureMiniappHost().benchmark();
      context.send({ type: "miniapp-benchmark", result });
      context.log(
        `Bare worker benchmark: spawn ${result.spawnMs}ms, kill ${result.killMs}ms, ` +
          `busy-loop ${result.busyLoopKillMs}ms, wasm=${result.wasmExecuted}`,
      );
    } catch (error) {
      context.log(
        `Benchmark failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "switch-miniapp") {
    context
      .ensureMiniappHost()
      .switchForeground(message.appId, message.publisherPublicKey);
    context.log(`Switched mini-app ${message.appId}`);
    return;
  }
  if (message.type === "stop-miniapp") {
    await context.ensureMiniappHost().stop();
    context.log("Stopped mini-app");
    return;
  }
  if (message.type === "suspend-miniapp") {
    await context.ensureMiniappHost().suspend();
    return;
  }
  if (message.type === "resume-miniapp") {
    await context.ensureMiniappHost().resume();
    return;
  }
  if (message.type === "miniapp-ui-event") {
    try {
      await context
        .ensureMiniappHost()
        .handleUiEvent(message.nodeId, message.event, message.value);
    } catch (error) {
      context.log(
        `UI event failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "workspace-read") {
    try {
      const content = await context
        .ensureMiniappHost()
        .readWorkspaceFile(message.documentId);
      context.send({
        type: "workspace-file",
        token: message.token,
        documentId: message.documentId,
        content,
      });
    } catch (error) {
      context.send({
        type: "workspace-file",
        token: message.token,
        documentId: message.documentId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
    return;
  }
  if (message.type === "dev-side-load") {
    if (context.refuseStoreAction("Dev side-load")) {
      return;
    }
    try {
      await context
        .ensureMiniappHost()
        .devSideLoad(message.manifest, hexToBytes(message.bundleHex));
      context.log(`Dev side-loaded ${message.manifest.name ?? "mini-app"}`);
    } catch (error) {
      context.log(
        `Dev side-load failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "connect-dev-channel") {
    if (context.refuseStoreAction("Dev channel")) {
      return;
    }
    try {
      await context.ensureDevChannel().connect(message.host, message.port);
    } catch (error) {
      context.send({
        type: "dev-channel",
        state: "error",
        detail: error instanceof Error ? error.message : String(error),
      });
      context.log(
        `Dev channel connect failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "disconnect-dev-channel") {
    await context.ensureDevChannel().disconnect();
    return;
  }
  if (message.type === "connect-test-agent") {
    if (context.testAgent !== null) {
      context.log("Peer agent already mounted");
      return;
    }
    try {
      const node = await context.ensureReticulum();
      const identity = await context.resolveIdentity();
      if (identity === null) {
        throw new Error("identity unavailable");
      }
      context.testAgent = await connectTestAgent({
        reticulum: node,
        provider: context.provider,
        identity,
        label: message.label,
        platform: message.platform ?? "mobile",
        host: message.host,
        port: message.port,
        log: context.log,
        handleCommand: (request) =>
          context.ensureCrossDeviceTestDriver()(request),
        delivery: await context.ensureHostLxmfDelivery(),
        receiveSessionInvite: (invite) =>
          context.ensureMiniappHost().receiveSessionInvite(invite),
        acceptSessionInvite: async (inviteId) => {
          try {
            await context.ensureMiniappHost().acceptSessionInvite(inviteId);
          } catch (error) {
            const message =
              error instanceof Error ? error.message : String(error);
            if (!message.startsWith("No installed version for ")) {
              throw error;
            }
            context.log(
              `Session invite ${inviteId} accepted without launch (${message})`,
            );
          }
        },
      });
      context.log(
        `Peer agent mounted as ${message.label} (lxmf ${context.testAgent.lxmfAddress})`,
      );
    } catch (error) {
      context.log(
        `Peer agent mount failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (message.type === "join-community-network") {
    await joinCommunityNetwork({
      status: context.status,
      pushStatus: context.pushStatus,
      log: context.log,
      communityNetwork: RETICULUM_COMMUNITY_NETWORK,
      stopTcpInterface: context.stopTcpInterface,
      startTcpInterface: context.startTcpInterface,
      setPendingTarget: (target) => {
        context.pendingTarget = target;
      },
    });
    return;
  }
  if (message.type === "set-interfaces") {
    context.status.tcpEnabled = message.tcp;
    context.status.autoEnabled = message.auto;
    context.status.bleEnabled = message.ble;
    context.status.rnodeEnabled = message.rnode;
    context.pendingRnodeDeviceId = message.rnodeDeviceId ?? null;
    context.pendingRnodeBaudRate = message.rnodeBaudRate ?? 115200;
    context.pushStatus();
    await context.applyInterfaceConfig();
    await context.persistRelayConfig();
    return;
  }
  if (message.type === "set-relay-config") {
    context.ensureMiniappHost();
    if (context.relayService === null)
      throw new Error("Relay service is unavailable");
    if (typeof message.mode === "string")
      await context.relayService.setMode(message.mode);
    if (message.directions && typeof message.directions === "object") {
      for (const [kind, direction] of Object.entries(message.directions))
        await context.relayService.setDirection(kind, direction);
    }
    return;
  }
  if (message.type === "set-freenet-config") {
    const enabled = message.enabled === true;
    const url =
      typeof message.url === "string" && message.url.length > 0
        ? message.url
        : null;
    const authToken =
      typeof message.authToken === "string" && message.authToken.length > 0
        ? message.authToken
        : undefined;
    const rendezvousHex =
      typeof message.rendezvousHex === "string" &&
      message.rendezvousHex.length > 0
        ? message.rendezvousHex
        : null;
    const localDirection = message.localDirection === 1 ? 1 : 0;
    const caps = message.capabilities ?? {
      contractReads: false,
      contractWrites: false,
      packetTunnel: false,
      propagation: false,
    };
    context.freenetCapabilities = {
      contractReads: caps.contractReads === true,
      contractWrites: caps.contractWrites === true,
      packetTunnel: caps.packetTunnel === true,
      propagation: caps.propagation === true,
    };
    context.status.freenetEnabled = enabled;
    context.status.freenetUrl = url;
    context.status.freenetRendezvousHex = rendezvousHex;
    context.status.freenetContractReads =
      context.freenetCapabilities.contractReads;
    context.status.freenetContractWrites =
      context.freenetCapabilities.contractWrites;
    context.status.freenetPacketTunnel =
      context.freenetCapabilities.packetTunnel;
    context.status.freenetPropagation = context.freenetCapabilities.propagation;
    context.pendingFreenetAuthToken = authToken ?? null;
    context.pendingFreenetLocalDirection = localDirection;
    await context.attachFreenetBackends();
    return;
  }
  if (
    context.multicastBridge !== null &&
    (message.type === "multicast-packet" ||
      message.type === "multicast-interfaces")
  ) {
    context.multicastBridge.handleHostMessage(message);
    return;
  }
  if (context.bonjourBridge !== null && message.type === "bonjour-peer") {
    context.autoIface?.notifyPeerDiscovered(message.address, message.ifname);
    context.status.autoPeers =
      context.autoIface?.peerInterfaces.length ?? context.status.autoPeers;
    context.pushStatus();
    context.log(`Bonjour peer discovered: ${message.address}`);
    return;
  }
  if (context.bonjourBridge !== null && message.type === "bonjour-interfaces") {
    context.bonjourBridge.handleHostMessage(message);
    return;
  }
  if (message.type === "peer-bluetooth-frame") {
    try {
      context.receiveBluetoothFrame(hexToBytes(message.frameHex));
    } catch (error) {
      context.log(
        `Rejected BLE invitation frame: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  }
  if (
    context.bleBridge !== null &&
    (message.type === "ble-data" ||
      message.type === "ble-connect" ||
      message.type === "ble-disconnect" ||
      message.type === "ble-error")
  ) {
    context.bleBridge.handleHostMessage(message);
    if (message.type === "ble-connect") {
      context.status.bleConnected = true;
      context.log("BLE pipe connected");
      context.pushStatus();
    } else if (message.type === "ble-disconnect") {
      context.status.bleConnected = false;
      context.log("BLE pipe disconnected");
      context.pushStatus();
    } else if (message.type === "ble-error") {
      context.log(`BLE pipe error: ${message.message}`);
    }
    return;
  }
  if (
    context.serialBridge !== null &&
    (message.type === "serial-data" ||
      message.type === "serial-connect" ||
      message.type === "serial-disconnect" ||
      message.type === "serial-error")
  ) {
    context.serialBridge.handleHostMessage(message);
    if (message.type === "serial-connect") {
      context.status.rnodeConnected = true;
      context.status.rnodeDeviceName = message.deviceName;
      context.log(`RNode USB serial connected (${message.deviceName})`);
      context.pushStatus();
    } else if (message.type === "serial-disconnect") {
      context.status.rnodeConnected = false;
      context.status.rnodeDeviceName = null;
      context.log("RNode USB serial disconnected");
      context.pushStatus();
    } else if (message.type === "serial-error") {
      context.log(`RNode USB serial error: ${message.message}`);
    }
  }
}
