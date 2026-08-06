import {
  DEFAULT_INTERFACE_BITRATES,
  inferInterfaceKind,
  selectPreferredInterface,
} from "../../../packages/reticulum-interfaces/dist/policy.js";

/** Push the current desktop worklet status snapshot to the renderer. */
export function createPushStatus({ state, status, send }) {
  return function pushStatus() {
    if (state.reticulum !== null) {
      const interfaces = state.reticulum.listInterfaces();
      const preferred = selectPreferredInterface(interfaces);
      status.preferredInterface = preferred?.name ?? null;
      status.onlineInterfaces = interfaces.filter(
        (iface) => iface.online,
      ).length;
      status.pathTableCount = state.reticulum.pathTableCount;
      status.activeLinkCount = state.reticulum.activeLinkCount;
      status.bandwidthBytesIn = state.reticulum.bandwidthBytesIn;
      status.bandwidthBytesOut = state.reticulum.bandwidthBytesOut;
      status.transportEnabled = state.reticulum.isTransportEnabled;
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
      status.relayInterfaces = relayKinds.map((kind) => {
        const matching = interfaces.filter(
          (iface) =>
            inferInterfaceKind(iface.name) === kind ||
            (kind === "bluetooth" && inferInterfaceKind(iface.name) === "ble"),
        );
        const enabled =
          kind === "tcp"
            ? status.tcpEnabled
            : kind === "auto"
              ? status.autoEnabled
              : kind === "bluetooth"
                ? status.bleEnabled
                : kind === "rnode"
                  ? status.rnodeEnabled
                  : kind === "freenet"
                    ? status.freenetInterfaceEnabled
                    : false;
        return {
          kind,
          enabled,
          online: matching.some((iface) => iface.online),
          direction: status.relayDirections?.[kind] ?? "both",
          bitrate:
            matching.find((iface) => iface.bitrate !== null)?.bitrate ??
            DEFAULT_INTERFACE_BITRATES[kind] ??
            null,
          bytesIn: matching.reduce(
            (sum, iface) => sum + (iface.bytesIn ?? 0),
            0,
          ),
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
      status.preferredInterface = null;
      status.onlineInterfaces = 0;
      status.pathTableCount = 0;
      status.activeLinkCount = 0;
      status.bandwidthBytesIn = 0;
      status.bandwidthBytesOut = 0;
    }

    if (state.propagationServer !== null) {
      status.propagationStoreBytes = state.propagationServer.stats.usedBytes;
      status.propagationMessageCount =
        state.propagationServer.stats.messageCount;
    } else {
      status.propagationStoreBytes = 0;
      status.propagationMessageCount = 0;
    }

    send({ type: "status", status: { ...status } });
  };
}
