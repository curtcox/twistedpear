/**
 * Desktop host node lifecycle: the Reticulum node, its interfaces (TCP, RNode,
 * Freenet), LXMF delivery, and the LXMF propagation node.
 */
import { PACKET_LOG_WASM_BASE64 } from "./packet-log-wasm.generated.mjs";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { RNodeInterface } from "../../../packages/reticulum-interfaces/dist/rnode/interface.js";
import { FreenetInterface } from "../../../packages/reticulum-interfaces/dist/freenet.js";
import { FreenetContractPacketLogBackend } from "../../../packages/bridge-freenet/dist/index.js";
import {
  DEFAULT_PROPAGATION_QUOTAS,
  PropagationServer,
  createPropagationDestination
} from "../../../packages/lxmf-ts/dist/index.js";
import { createHostLxmfDelivery } from "../../../packages/host-core/dist/host-lxmf-delivery.js";
import { createIpcSerialBridge } from "../../../packages/worklet-core/src/ipc-serial-bridge.mjs";
import { sleep } from "../../../packages/worklet-core/src/index.mjs";

export function createNodeLifecycleOps(deps) {
  const {
    state,
    provider,
    runtime,
    status,
    log,
    pushStatus,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    startStatusTimer,
    stopStatusTimer
  } = deps;
  const resolveIdentity = (...args) => deps.resolveIdentity(...args);
  const registerAnnounceHandler = (...args) => deps.registerAnnounceHandler(...args);
  const startAutoInterface = (...args) => deps.startAutoInterface(...args);
  const stopAutoInterface = (...args) => deps.stopAutoInterface(...args);
  const ensureMiniappHost = (...args) => deps.ensureMiniappHost(...args);
  const ensureCatalog = (...args) => deps.ensureCatalog(...args);
  const loadPropagationCache = (...args) => deps.loadPropagationCache(...args);
  const createWorkletPropagationPersistence = (...args) => deps.createWorkletPropagationPersistence(...args);

  async function startPropagation() {
    if (state.propagationServer !== null) {
      return;
    }

    const node = await ensureReticulum();
    const identity = await resolveIdentity();
    if (identity === null) {
      throw new Error("Propagation requires a host identity");
    }

    await loadPropagationCache();
    state.propagationServer = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
          now: () => Date.now(),
          schedule: (ms, callback) => {
            const handle = setTimeout(callback, ms);
            return { cancel: () => clearTimeout(handle) };
          },
          persistence: createWorkletPropagationPersistence()
        });
    state.propagationDestination = createPropagationDestination(provider, node, identity);
    state.propagationServer.registerHandlers(state.propagationDestination);
    await state.propagationDestination.announce();
    status.propagationEnabled = true;
    log("Propagation node enabled");
    pushStatus();
  }

  async function stopPropagation() {
    if (state.propagationServer === null) {
      status.propagationEnabled = false;
      pushStatus();
      return;
    }

    state.propagationServer = null;
    state.propagationDestination = null;
    status.propagationEnabled = false;
    log("Propagation node disabled");
    pushStatus();
  }

  async function stopBleInterface() {
    status.bleConnected = false;
  }

  async function stopRnodeInterface() {
    if (state.rnodeIface !== null) {
      if (state.reticulum !== null) {
        state.reticulum.unregisterInterface(state.rnodeIface);
      }

      await state.rnodeIface.close();
      state.rnodeIface = null;
    }

    if (state.serialBridge !== null) {
      await state.serialBridge.close();
      state.serialBridge = null;
    }

    status.rnodeConnected = false;
    status.rnodeDeviceName = null;
  }

  async function stopFreenetInterface() {
    if (state.freenetIface !== null) {
      if (state.reticulum !== null) {
        state.reticulum.unregisterInterface(state.freenetIface);
      }
      await state.freenetIface.close().catch(() => {});
      state.freenetIface = null;
    }
    status.freenetInterfaceOnline = false;
  }

  async function loadPacketLogWasm() {
    if (state.packetLogWasmCache !== null) {
      return state.packetLogWasmCache;
    }
    state.packetLogWasmCache = Uint8Array.from(Buffer.from(PACKET_LOG_WASM_BASE64, "base64"));
    return state.packetLogWasmCache;
  }

  async function startFreenetInterface() {
    const url = status.freenetUrl;
    const rendezvousHex = status.freenetRendezvousHex;
    if (url === null || url.length === 0) {
      log("Freenet HDLC interface requires a WebSocket URL");
      status.freenetInterfaceEnabled = false;
      pushStatus();
      return;
    }
    if (typeof rendezvousHex !== "string" || !/^[0-9a-fA-F]{64}$/.test(rendezvousHex)) {
      log("Freenet HDLC interface requires a 64-character hex rendezvous");
      status.freenetInterfaceEnabled = false;
      pushStatus();
      return;
    }

    const node = await ensureReticulum();
    if (state.freenetIface !== null) {
      status.freenetInterfaceOnline = state.freenetIface.online === true;
      pushStatus();
      return;
    }

    try {
      const wasm = await loadPacketLogWasm();
      const backend = new FreenetContractPacketLogBackend({
        clientOptions: {
          url,
          ...(state.pendingFreenetAuthToken === null ? {} : { authToken: state.pendingFreenetAuthToken })
        },
        wasm,
        rendezvous: hexToBytes(rendezvousHex),
        localDirection: state.pendingFreenetLocalDirection,
        updateOptions: { fallbackCodeField: wasm }
      });
      state.freenetIface = await FreenetInterface.open(provider, {
        name: "host-freenet",
        provider,
        backend
      });
      node.registerInterface(state.freenetIface);
      status.freenetInterfaceOnline = state.freenetIface.online === true;
      log(
        status.freenetInterfaceOnline
          ? "Freenet HDLC interface online"
          : "Freenet HDLC interface started; waiting for Freenet node"
      );
    } catch (error) {
      state.freenetIface = null;
      status.freenetInterfaceOnline = false;
      status.freenetInterfaceEnabled = false;
      log(`Freenet HDLC interface failed: ${error instanceof Error ? error.message : String(error)}`);
    }
    pushStatus();
  }

  async function stopTcpInterface() {
    if (state.tcpIface !== null) {
      await state.tcpIface.close();
      state.tcpIface = null;
    }

    status.linkOnline = false;
  }

  async function stopNode() {
    stopStatusTimer();
    status.running = false;
    status.linkOnline = false;
    state.nodeSuspended = false;
    pushStatus();

    await stopTcpInterface();
    await stopAutoInterface();
    await stopBleInterface();
    await stopRnodeInterface();
    await stopFreenetInterface();
    await stopHostLxmfDelivery();

    if (state.reticulum !== null) {
      state.reticulum.stop();
      state.reticulum = null;
    }
  }

  async function resumeInterfaces() {
    if (!status.running) {
      return;
    }

    log("Resuming interfaces after iOS foreground transition");
    await applyInterfaceConfig();
  }

  async function ensureReticulum() {
    if (state.reticulum !== null) {
      return state.reticulum;
    }

    const identity = await resolveIdentity();
    if (identity === null) {
      throw new Error("Failed to resolve harness identity");
    }

    state.reticulum = Reticulum.create({
      provider,
      runtime,
      inboundBandwidthLimiter,
      outboundBandwidthLimiter
    });
    state.reticulum.start();
    status.running = true;
    registerAnnounceHandler();

    const inbound = state.reticulum.registerDestination({
      provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["echo"]
    });
    inbound.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
    await inbound.announce();
    log("Announced harness identity");

    startStatusTimer();
    pushStatus();
    await ensureHostLxmfDelivery().catch((error) => {
      log(`Host LXMF delivery deferred: ${error instanceof Error ? error.message : String(error)}`);
    });
    return state.reticulum;
  }

  /**
   * Always-on LXMF delivery so session invites raise chrome without a mounted
   * peer control agent. Desktop re-announces on a timer; the invite carrier itself never
   * runs mini-app code.
   */
  async function ensureHostLxmfDelivery() {
    if (state.hostLxmfDelivery !== null) {
      return state.hostLxmfDelivery;
    }
    const node = await ensureReticulum();
    const identity = await resolveIdentity();
    if (identity === null) {
      throw new Error("identity unavailable");
    }
    state.hostLxmfDelivery = await createHostLxmfDelivery({
      reticulum: node,
      provider,
      identity,
      announceIntervalMs: 60_000,
      receiveSessionInvite: (invite) => ensureMiniappHost().receiveSessionInvite(invite),
      isInvitableApp: (appId) => {
        const { installedStore: installed } = ensureCatalog();
        return installed.activeVersion(appId) !== undefined || appId === "line-check";
      },
      log
    });
    log(`Host LXMF delivery ready (${state.hostLxmfDelivery.lxmfAddress.slice(0, 12)}…)`);
    return state.hostLxmfDelivery;
  }

  async function stopHostLxmfDelivery() {
    if (state.hostLxmfDelivery === null) {
      return;
    }
    await state.hostLxmfDelivery.stop();
    state.hostLxmfDelivery = null;
  }

  async function startTcpInterface(targetHost, targetPort) {
    const node = await ensureReticulum();
    if (state.tcpIface === null) {
      log(`Starting TCP client to ${targetHost}:${targetPort}`);
      state.tcpIface = await node.addTcpClientInterface({
        name: "harness-tcp",
        targetHost,
        targetPort
      });
    }

    const deadline = Date.now() + 30_000;
    while (Date.now() < deadline) {
      status.linkOnline = state.tcpIface.online;
      pushStatus();
      if (state.tcpIface.online) {
        log("TCP interface online");
        return true;
      }

      await sleep(250);
    }

    log("Timed out waiting for TCP interface (peer may be unreachable)");
    return false;
  }

  async function startBleInterface() {
    status.bleEnabled = false;
    pushStatus();
    log("BLE is not supported on desktop host");
  }

  async function startRnodeInterface() {
    const node = await ensureReticulum();
    if (state.rnodeIface !== null) {
      status.rnodeConnected = state.serialBridge?.connected ?? false;
      pushStatus();
      return;
    }

    if (state.pendingRnodePortPath === null) {
      log("RNode requires a serial port path (configure in host settings)");
      status.rnodeEnabled = false;
      pushStatus();
      return;
    }

    log(`Starting RNode interface over ${state.pendingRnodePortPath}`);
    state.serialBridge = createIpcSerialBridge({
      portPath: state.pendingRnodePortPath,
      baudRate: state.pendingRnodeBaudRate
    });
    state.rnodeIface = await RNodeInterface.open(provider, {
      name: "host-rnode",
      provider,
      pipe: state.serialBridge
    });
    node.registerInterface(state.rnodeIface);

    status.rnodeConnected = state.serialBridge.connected;
    status.rnodeDeviceName = status.rnodeConnected ? state.pendingRnodePortPath : null;
    if (state.rnodeIface.online) {
      log(`RNode interface online (firmware: ${state.rnodeIface.rnodeStatus.firmwareVersion ?? "unknown"})`);
    } else {
      log("RNode interface started; waiting for USB serial connection from host");
    }

    pushStatus();
  }

  async function applyInterfaceConfig() {
    if (state.nodeSuspended) {
      log("Interface restart deferred while node is suspended");
      return;
    }

    if (
      !status.tcpEnabled &&
      !status.autoEnabled &&
      !status.bleEnabled &&
      !status.rnodeEnabled &&
      !status.freenetInterfaceEnabled
    ) {
      await stopNode();
      log("All interfaces disabled; node stopped");
      return;
    }

    if (status.autoEnabled) {
      await startAutoInterface();
    } else {
      await stopAutoInterface();
    }

    if (status.bleEnabled) {
      await startBleInterface();
    } else {
      await stopBleInterface();
    }

    if (status.rnodeEnabled) {
      await startRnodeInterface();
    } else {
      await stopRnodeInterface();
    }

    if (status.freenetInterfaceEnabled) {
      await startFreenetInterface();
    } else {
      await stopFreenetInterface();
    }

    if (status.tcpEnabled) {
      if (state.pendingTarget === null) {
        log("TCP enabled but no target host configured yet");
        return;
      }

      await startTcpInterface(state.pendingTarget.targetHost, state.pendingTarget.targetPort);
      return;
    }

    await stopTcpInterface();
  }

  async function reconnectTcpAfterNetworkChange() {
    if (state.nodeSuspended || !status.running || !status.tcpEnabled || state.pendingTarget === null) {
      return;
    }

    log("Network change detected; reconnecting TCP interface");
    await stopTcpInterface();
    await startTcpInterface(state.pendingTarget.targetHost, state.pendingTarget.targetPort);
  }

  return {
    startPropagation,
    stopPropagation,
    stopBleInterface,
    startBleInterface,
    stopRnodeInterface,
    startRnodeInterface,
    stopFreenetInterface,
    startFreenetInterface,
    loadPacketLogWasm,
    stopTcpInterface,
    startTcpInterface,
    stopNode,
    resumeInterfaces,
    ensureReticulum,
    ensureHostLxmfDelivery,
    stopHostLxmfDelivery,
    applyInterfaceConfig,
    reconnectTcpAfterNetworkChange
  };
}
