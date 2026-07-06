import { useCallback, useEffect, useRef, useState } from "react";
import {
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { Worklet } from "react-native-bare-kit";
import b4a from "b4a";
import bundle from "../worklet/worklet.bundle.mjs";
import { isNodeServiceRunning, startNodeService, stopNodeService } from "@twistedpear/node-service";
import { HostMulticastIpc } from "./host/multicast-ipc";
import { HostBleIpc } from "./host/ble-ipc";
import { HostUsbIpc } from "./host/usb-ipc";
import {
  hasUsbSerialPermission,
  listUsbSerialDevices,
  requestUsbSerialPermission,
  type UsbSerialDeviceInfo
} from "@twistedpear/usb-serial";
import {
  decodeMessages,
  encodeMessage,
  type AnnounceEntry,
  type HostToWorkletMessage,
  type WorkletStatus,
  type WorkletToHostMessage
} from "./worklet/protocol";

const DEFAULT_DOCKER_PORT = 4_242;
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const LOCAL_HOST = "127.0.0.1";
const MAX_ANNOUNCES = 50;

async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  if (Number(Platform.Version) >= 31) {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
    ]);
    return;
  }

  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
}

const initialStatus: WorkletStatus = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  identityHash: null,
  identityPersisted: false,
  tcpEnabled: false,
  autoEnabled: false,
  bleEnabled: false,
  bleConnected: false,
  rnodeEnabled: false,
  rnodeConnected: false,
  rnodeDeviceName: null,
  cryptoProvider: "unknown",
  autoPeers: 0
};

export default function App() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Harness UI ready. Create an identity, then toggle TCP to start the worklet."
  ]);
  const [tcpEnabled, setTcpEnabled] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [bleEnabled, setBleEnabled] = useState(false);
  const [rnodeEnabled, setRnodeEnabled] = useState(false);
  const [usbDevices, setUsbDevices] = useState<ReadonlyArray<UsbSerialDeviceInfo>>([]);
  const [selectedUsbDeviceId, setSelectedUsbDeviceId] = useState<number | null>(null);

  const workletRef = useRef<Worklet | null>(null);
  const ipcBufferRef = useRef("");
  const multicastIpcRef = useRef<HostMulticastIpc | null>(null);
  const bleIpcRef = useRef<HostBleIpc | null>(null);
  const usbIpcRef = useRef<HostUsbIpc | null>(null);

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const sendToWorklet = useCallback((message: HostToWorkletMessage) => {
    const worklet = workletRef.current;
    if (worklet === null) {
      return;
    }

    worklet.IPC.write(b4a.from(encodeMessage(message)));
  }, []);

  const handleWorkletMessage = useCallback((message: WorkletToHostMessage) => {
    if (multicastIpcRef.current?.isMulticastMessage(message)) {
      void multicastIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (bleIpcRef.current?.isBleMessage(message)) {
      void bleIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (usbIpcRef.current?.isSerialMessage(message)) {
      void usbIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (message.type === "status") {
      setStatus(message.status);
      return;
    }

    if (message.type === "log") {
      appendLog(message.line);
      return;
    }

    if (message.type === "announce") {
      setAnnounces((current) => [message.entry, ...current].slice(0, MAX_ANNOUNCES));
    }
  }, [appendLog]);

  const pushInterfaceConfig = useCallback((next: {
    tcp: boolean;
    auto: boolean;
    ble: boolean;
    rnode: boolean;
    rnodeDeviceId?: number | null;
  }) => {
    sendToWorklet({ type: "set-interfaces", ...next });
  }, [sendToWorklet]);

  const stopWorklet = useCallback(() => {
    sendToWorklet({ type: "stop" });
    void multicastIpcRef.current?.stop();
    void bleIpcRef.current?.stop();
    void usbIpcRef.current?.stop();
    workletRef.current?.terminate();
    workletRef.current = null;
    setStatus((current) => ({
      ...current,
      running: false,
      linkOnline: false
    }));
  }, [sendToWorklet]);

  const startWorklet = useCallback(() => {
    if (workletRef.current !== null) {
      return;
    }

    const worklet = new Worklet();
    worklet.start("/app.bundle", bundle);
    multicastIpcRef.current = new HostMulticastIpc(sendToWorklet);
    bleIpcRef.current = new HostBleIpc(sendToWorklet);
    usbIpcRef.current = new HostUsbIpc(sendToWorklet);

    ipcBufferRef.current = "";
    worklet.IPC.on("data", (data) => {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayLike<number>);
      const decoded = decodeMessages(`${ipcBufferRef.current}${b4a.toString(bytes)}`);
      ipcBufferRef.current = decoded.remainder;
      for (const message of decoded.messages) {
        handleWorkletMessage(message);
      }
    });

    workletRef.current = worklet;
    const targetHost = Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST;
    sendToWorklet({ type: "start", targetHost, targetPort: DEFAULT_DOCKER_PORT });
    pushInterfaceConfig({
      tcp: tcpEnabled,
      auto: autoEnabled,
      ble: bleEnabled,
      rnode: rnodeEnabled,
      rnodeDeviceId: selectedUsbDeviceId
    });
    appendLog(`Worklet started (target ${targetHost}:${DEFAULT_DOCKER_PORT})`);
  }, [appendLog, autoEnabled, bleEnabled, rnodeEnabled, selectedUsbDeviceId, handleWorkletMessage, pushInterfaceConfig, sendToWorklet, tcpEnabled]);

  useEffect(() => {
    const shouldRun = tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled;
    if (shouldRun) {
      if (bleEnabled) {
        void requestBlePermissions().then(() => startWorklet());
      } else {
        startWorklet();
      }
      return;
    }

    stopWorklet();
  }, [tcpEnabled, autoEnabled, bleEnabled, rnodeEnabled, startWorklet, stopWorklet]);

  useEffect(() => {
    if (workletRef.current === null) {
      return;
    }

    pushInterfaceConfig({
      tcp: tcpEnabled,
      auto: autoEnabled,
      ble: bleEnabled,
      rnode: rnodeEnabled,
      rnodeDeviceId: selectedUsbDeviceId
    });
  }, [tcpEnabled, autoEnabled, bleEnabled, rnodeEnabled, selectedUsbDeviceId, pushInterfaceConfig]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const refreshDevices = () => {
      setUsbDevices(listUsbSerialDevices());
    };

    refreshDevices();
    const timer = setInterval(refreshDevices, 2_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const nodeActive = status.running && (tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled);
    if (!nodeActive) {
      void stopNodeService().then(() => setServiceRunning(isNodeServiceRunning()));
      return;
    }

    void (async () => {
      if (Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      await startNodeService();
      setServiceRunning(isNodeServiceRunning());
    })();
  }, [status.running, tcpEnabled, autoEnabled, bleEnabled, rnodeEnabled]);

  useEffect(() => () => {
    stopWorklet();
    if (Platform.OS === "android") {
      void stopNodeService();
    }
  }, [stopWorklet]);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>TwistedPear Harness</Text>
      <Text style={styles.subtitle}>Reticulum node dev shell (Phase 2)</Text>

      <View style={styles.card}>
        <Text>Worklet: {status.running ? "running" : "stopped"}</Text>
        <Text>Link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Crypto: {status.cryptoProvider}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
        <Text>Auto peers: {status.autoPeers}</Text>
        <Text>BLE: {status.bleConnected ? "connected" : status.bleEnabled ? "waiting" : "off"}</Text>
        <Text>
          RNode: {status.rnodeConnected
            ? `connected (${status.rnodeDeviceName ?? "usb"})`
            : status.rnodeEnabled
              ? "waiting"
              : "off"}
        </Text>
        <Text>Identity: {status.identityHash ?? "none"}</Text>
        <Text>Persisted: {status.identityPersisted ? "yes" : "no"}</Text>
        {Platform.OS === "android" ? (
          <Text>Foreground service: {serviceRunning ? "running" : "stopped"}</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <ActionButton
            label="Create identity"
            onPress={() => {
              if (workletRef.current === null) {
                startWorklet();
                setTimeout(() => sendToWorklet({ type: "create-identity" }), 250);
                return;
              }

              sendToWorklet({ type: "create-identity" });
            }}
          />
          <ActionButton
            label="Reset identity"
            onPress={() => sendToWorklet({ type: "reset-identity" })}
          />
        </View>
        <Row label="TCP client" value={tcpEnabled} onChange={setTcpEnabled} />
        <Row label="AutoInterface" value={autoEnabled} onChange={setAutoEnabled} />
        <Row label="BLE interface" value={bleEnabled} onChange={setBleEnabled} />
        <Row label="RNode (USB)" value={rnodeEnabled} onChange={setRnodeEnabled} />
      </View>

      {Platform.OS === "android" ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>USB serial devices</Text>
          {usbDevices.length === 0 ? (
            <Text style={styles.muted}>No CDC ACM USB devices attached.</Text>
          ) : (
            usbDevices.map((device) => (
              <Pressable
                key={device.deviceId}
                style={[
                  styles.deviceRow,
                  selectedUsbDeviceId === device.deviceId ? styles.deviceRowSelected : null
                ]}
                onPress={() => {
                  void (async () => {
                    if (!device.hasPermission && !hasUsbSerialPermission(device.deviceId)) {
                      const granted = await requestUsbSerialPermission(device.deviceId);
                      if (!granted) {
                        appendLog(`USB permission denied for device ${device.deviceId}`);
                        return;
                      }
                    }

                    setSelectedUsbDeviceId(device.deviceId);
                    appendLog(`Selected USB device ${device.deviceId} (${device.vendorId.toString(16)}:${device.productId.toString(16)})`);
                  })();
                }}
              >
                <Text style={styles.deviceLabel}>
                  {device.deviceName ?? `usb-${device.deviceId}`} · {device.isCdcAcm ? "CDC ACM" : "unknown"}
                </Text>
                <Text style={styles.deviceMeta}>
                  {device.hasPermission ? "permission granted" : "tap to request permission"}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Announce browser</Text>
        {announces.length === 0 ? (
          <Text style={styles.muted}>No announces received yet.</Text>
        ) : (
          announces.slice(0, 8).map((entry) => (
            <Text key={`${entry.destinationHash}-${entry.receivedAt}`} style={styles.announceLine}>
              {entry.destinationHash.slice(0, 16)}… · {entry.hops} hop{entry.hops === 1 ? "" : "s"}
            </Text>
          ))
        )}
      </View>

      <ScrollView style={styles.log}>
        {logLines.map((line, index) => (
          <Text key={`${index}-${line}`} style={styles.logLine}>
            {line}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

function Row({
  label,
  value,
  onChange
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
}

function ActionButton({
  label,
  onPress
}: {
  readonly label: string;
  readonly onPress: () => void;
}) {
  return (
    <Pressable style={styles.button} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101418",
    paddingTop: 64,
    paddingHorizontal: 20
  },
  title: {
    color: "#f4f7fb",
    fontSize: 24,
    fontWeight: "700"
  },
  subtitle: {
    color: "#9aa7b8",
    marginBottom: 16
  },
  card: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8
  },
  sectionTitle: {
    color: "#f4f7fb",
    fontWeight: "600",
    marginBottom: 4
  },
  muted: {
    color: "#9aa7b8",
    fontSize: 13
  },
  announceLine: {
    color: "#c5d0dc",
    fontFamily: "Menlo",
    fontSize: 11
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: "#f4f7fb"
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4
  },
  button: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  buttonLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  deviceRow: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#141a22",
    marginBottom: 6
  },
  deviceRowSelected: {
    borderWidth: 1,
    borderColor: "#4a90d9"
  },
  deviceLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  deviceMeta: {
    color: "#9aa7b8",
    fontSize: 11,
    marginTop: 2
  },
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: "Menlo",
    fontSize: 12,
    marginBottom: 6
  }
});
