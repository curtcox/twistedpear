/**
 * Desktop host message handlers for node lifecycle: interface configuration,
 * suspend/resume, propagation, Freenet configuration, and host bridges.
 */
import { FreenetClientContractBackend } from "../../../packages/bridge-freenet/dist/index.js";
import { RETICULUM_COMMUNITY_NETWORK } from "../../../packages/host-core/dist/community-network.js";
import { joinCommunityNetwork } from "../../../packages/worklet-core/src/index.mjs";

export function createNodeMessageHandlers(deps) {
  const { state, status, log, pushStatus } = deps;
  const applyInterfaceConfig = (...args) => deps.applyInterfaceConfig(...args);
  const startTcpInterface = (...args) => deps.startTcpInterface(...args);
  const stopTcpInterface = (...args) => deps.stopTcpInterface(...args);
  const startAutoInterface = (...args) => deps.startAutoInterface(...args);
  const stopAutoInterface = (...args) => deps.stopAutoInterface(...args);
  const quiesceInterfaces = (...args) => deps.quiesceInterfaces(...args);
  const resumeInterfaces = (...args) => deps.resumeInterfaces(...args);
  const reconnectTcpAfterNetworkChange = (...args) =>
    deps.reconnectTcpAfterNetworkChange(...args);
  const stopNode = (...args) => deps.stopNode(...args);
  const startPropagation = (...args) => deps.startPropagation(...args);
  const stopPropagation = (...args) => deps.stopPropagation(...args);
  const ensureMiniappHost = (...args) => deps.ensureMiniappHost(...args);
  const loadRelayConfig = (...args) => deps.loadRelayConfig(...args);
  const persistRelayConfig = (...args) => deps.persistRelayConfig(...args);

  const handleStart = async (message) => {
    state.pendingTarget = {
      targetHost: message.targetHost,
      targetPort: message.targetPort,
    };
    await loadRelayConfig();
    state.multicastEntitled = message.multicastEntitled !== false;
    state.bonjourDiscoveryEnabled = message.bonjourEnabled !== false;
    if (status.tcpEnabled) {
      await applyInterfaceConfig();
    } else {
      log(
        `Target set to ${message.targetHost}:${message.targetPort} (enable TCP to connect)`,
      );
    }
    return;
  };

  const handleSuspendNode = async (message) => {
    if (state.nodeSuspended) {
      return;
    }

    state.nodeSuspended = true;
    await quiesceInterfaces();
    return;
  };

  const handleResumeNode = async (message) => {
    if (!state.nodeSuspended) {
      return;
    }

    state.nodeSuspended = false;
    await resumeInterfaces();
    return;
  };

  const handleNetworkChange = async (message) => {
    if (status.autoEnabled) {
      await stopAutoInterface();
      await startAutoInterface();
    }

    await reconnectTcpAfterNetworkChange();
    return;
  };

  const handleStop = async (message) => {
    await stopNode();
    log("Worklet stopped");
    return;
  };

  const handleSetPropagation = async (message) => {
    if (message.enabled) {
      try {
        await startPropagation();
      } catch (error) {
        log(
          `Propagation enable failed: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    } else {
      await stopPropagation();
    }
    return;
  };

  const handleSetRelayConfig = async (message) => {
    ensureMiniappHost();
    const relay = state.relayService;
    if (relay === null) throw new Error("Relay service is unavailable");
    if (typeof message.mode === "string") await relay.setMode(message.mode);
    if (message.directions && typeof message.directions === "object") {
      for (const [kind, direction] of Object.entries(message.directions)) {
        await relay.setDirection(kind, direction);
      }
    }
    status.relayMode = relay.status().mode;
    pushStatus();
  };

  const handleSetFreenetConfig = async (message) => {
    const enabled = message.enabled === true;
    const interfaceEnabled = message.interfaceEnabled === true;
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
    status.freenetEnabled = enabled;
    status.freenetInterfaceEnabled = interfaceEnabled;
    status.freenetUrl = url;
    status.freenetRendezvousHex = rendezvousHex;
    state.pendingFreenetAuthToken = authToken ?? null;
    state.pendingFreenetLocalDirection = localDirection;
    if (state.freenetBackendImpl !== null) {
      await state.freenetBackendImpl.close().catch(() => {});
      state.freenetBackendImpl = null;
    }
    if (enabled && url !== null) {
      state.freenetBackendImpl = new FreenetClientContractBackend({
        clientOptions: {
          url,
          ...(authToken === undefined ? {} : { authToken }),
        },
      });
      status.freenetConfigured = true;
    } else {
      status.freenetConfigured = false;
    }
    pushStatus();
    await applyInterfaceConfig();
    await persistRelayConfig();
    return;
  };

  const handleJoinCommunityNetwork = async (message) => {
    await joinCommunityNetwork({
      status,
      pushStatus,
      log,
      communityNetwork: RETICULUM_COMMUNITY_NETWORK,
      stopTcpInterface,
      startTcpInterface,
      setPendingTarget: (target) => {
        state.pendingTarget = target;
      },
    });
    return;
  };

  const handleSetInterfaces = async (message) => {
    status.tcpEnabled = message.tcp;
    status.autoEnabled = message.auto;
    status.bleEnabled = message.ble;
    status.rnodeEnabled = message.rnode;
    state.pendingRnodeDeviceId = message.rnodeDeviceId ?? null;
    state.pendingRnodePortPath = message.rnodePortPath ?? null;
    state.pendingRnodeBaudRate = message.rnodeBaudRate ?? 115_200;
    pushStatus();
    await applyInterfaceConfig();
    return;
  };

  const handleMulticastInterfaces = async (message) => {
    if (
      state.multicastBridge !== null &&
      message.type === "multicast-interfaces"
    ) {
      state.multicastBridge.handleHostMessage(message);
    }

    if (state.bonjourBridge !== null && message.type === "bonjour-interfaces") {
      state.bonjourBridge.handleHostMessage(message);
    }

    await reconnectTcpAfterNetworkChange();
    return;
  };

  const handleMulticastPacket = async (message) => {
    if (!(state.multicastBridge !== null)) return;
    state.multicastBridge.handleHostMessage(message);
    return;
  };

  const handleBonjourPeer = async (message) => {
    if (!(state.bonjourBridge !== null)) return;
    state.autoIface?.notifyPeerDiscovered(message.address, message.ifname);
    status.autoPeers =
      state.autoIface?.peerInterfaces.length ?? status.autoPeers;
    pushStatus();
    log(`Bonjour peer discovered: ${message.address}`);
    return;
  };

  const handleSerialData = async (message) => {
    if (!(state.serialBridge !== null)) return;
    state.serialBridge.handleHostMessage(message);
  };

  return {
    handlers: {
      start: handleStart,
      "suspend-node": handleSuspendNode,
      "resume-node": handleResumeNode,
      "network-change": handleNetworkChange,
      stop: handleStop,
      "set-propagation": handleSetPropagation,
      "set-relay-config": handleSetRelayConfig,
      "set-freenet-config": handleSetFreenetConfig,
      "join-community-network": handleJoinCommunityNetwork,
      "set-interfaces": handleSetInterfaces,
      "multicast-interfaces": handleMulticastInterfaces,
      "bonjour-interfaces": handleMulticastInterfaces,
      "multicast-packet": handleMulticastPacket,
      "bonjour-peer": handleBonjourPeer,
      "serial-data": handleSerialData,
      "serial-connect": handleSerialData,
      "serial-disconnect": handleSerialData,
      "serial-error": handleSerialData,
    },
  };
}
