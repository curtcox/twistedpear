import { AutoInterfaceBridge } from "../../reticulum-interfaces/dist/auto-bridge.js";
import { AUTO_DEFAULT_DATA_PORT } from "../../reticulum-interfaces/dist/auto-common.js";
import { selectDiscoveryProviders } from "../../reticulum-interfaces/dist/auto-discovery.js";

export function createAutoInterfaceOps(deps) {
  async function startAutoInterface() {
    const node = await deps.ensureReticulum();
    if (deps.getAutoIface() !== null) {
      deps.status.autoPeers = deps.getAutoIface().peerInterfaces.length;
      deps.pushStatus();
      return;
    }

    deps.log("Starting AutoInterface (native multicast bridge via IPC)");
    deps.setMulticastBridge(deps.createIpcMulticastBridge());
    const discovery = selectDiscoveryProviders({
      multicastAvailable: true,
      multicastEntitled: deps.getMulticastEntitled(),
      bonjourAvailable: deps.getBonjourDiscoveryEnabled(),
      allowConcurrent: deps.getMulticastEntitled()
    });

    if (discovery.active.includes("bonjour")) {
      deps.setBonjourBridge(deps.createIpcBonjourBridge());
      await deps.getBonjourBridge().start();
      deps.log("Bonjour discovery provider enabled");
    }

    const autoIface = await AutoInterfaceBridge.open(deps.provider, {
      name: "harness-auto",
      provider: deps.provider,
      runtime: deps.runtime,
      bridge: deps.getMulticastBridge(),
      onAdvertiseInterface: async (iface) => {
        if (deps.getBonjourBridge() !== null) {
          await deps.getBonjourBridge().advertise(iface.name, iface.linkLocalAddress, AUTO_DEFAULT_DATA_PORT);
        }
      },
      onPeerSpawn: (peer) => {
        node.registerInterface(peer);
        deps.status.autoPeers = deps.getAutoIface()?.peerInterfaces.length ?? 0;
        deps.pushStatus();
        deps.log(`AutoInterface peer online: ${peer.peerAddress}`);
      },
      onPeerDetach: (peer) => {
        node.unregisterInterface(peer);
        deps.status.autoPeers = deps.getAutoIface()?.peerInterfaces.length ?? 0;
        deps.pushStatus();
        deps.log(`AutoInterface peer detached: ${peer.peerAddress}`);
      }
    });
    deps.setAutoIface(autoIface);

    deps.status.autoPeers = autoIface.peerInterfaces.length;
    if (autoIface.online) {
      deps.log(`AutoInterface online (${deps.status.autoPeers} peer(s))`);
    } else {
      deps.log("AutoInterface started; waiting for link-local interfaces from host");
    }
    deps.pushStatus();
  }

  async function stopAutoInterface() {
    const autoIface = deps.getAutoIface();
    if (autoIface !== null) {
      await autoIface.close();
      deps.setAutoIface(null);
    }
    const multicastBridge = deps.getMulticastBridge();
    if (multicastBridge !== null) {
      await multicastBridge.stop();
      deps.setMulticastBridge(null);
    }
    const bonjourBridge = deps.getBonjourBridge();
    if (bonjourBridge !== null) {
      await bonjourBridge.stop();
      deps.setBonjourBridge(null);
    }
    deps.status.autoPeers = 0;
  }

  return { startAutoInterface, stopAutoInterface };
}
