import { useCallback, useEffect, useRef, useState } from "react";
import { Platform, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Worklet } from "react-native-bare-kit";
import b4a from "b4a";
import bundle from "../worklet/worklet.bundle.mjs";
import {
  decodeMessages,
  encodeMessage,
  type HostToWorkletMessage,
  type WorkletStatus,
  type WorkletToHostMessage
} from "./worklet/protocol";

const DEFAULT_DOCKER_PORT = 4_242;
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const LOCAL_HOST = "127.0.0.1";

const initialStatus: WorkletStatus = {
  running: false,
  linkOnline: false,
  announcesSeen: 0
};

export default function App() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Harness UI ready. Toggle TCP to start the worklet."
  ]);
  const [tcpEnabled, setTcpEnabled] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [bleEnabled, setBleEnabled] = useState(false);

  const workletRef = useRef<Worklet | null>(null);
  const ipcBufferRef = useRef("");

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const handleWorkletMessage = useCallback((message: WorkletToHostMessage) => {
    if (message.type === "status") {
      setStatus(message.status);
      return;
    }

    if (message.type === "log") {
      appendLog(message.line);
    }
  }, [appendLog]);

  const sendToWorklet = useCallback((message: HostToWorkletMessage) => {
    const worklet = workletRef.current;
    if (worklet === null) {
      return;
    }

    worklet.IPC.write(b4a.from(encodeMessage(message)));
  }, []);

  const stopWorklet = useCallback(() => {
    sendToWorklet({ type: "stop" });
    workletRef.current?.terminate();
    workletRef.current = null;
    setStatus(initialStatus);
  }, [sendToWorklet]);

  const startWorklet = useCallback(() => {
    if (workletRef.current !== null) {
      return;
    }

    const worklet = new Worklet();
    worklet.start("/app.bundle", bundle);

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
    appendLog(`Worklet started (target ${targetHost}:${DEFAULT_DOCKER_PORT})`);
  }, [appendLog, handleWorkletMessage, sendToWorklet]);

  useEffect(() => {
    if (tcpEnabled) {
      startWorklet();
      return;
    }

    stopWorklet();
  }, [tcpEnabled, startWorklet, stopWorklet]);

  useEffect(() => () => stopWorklet(), [stopWorklet]);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>TwistedPear Harness</Text>
      <Text style={styles.subtitle}>Reticulum node dev shell (Phase 2)</Text>

      <View style={styles.card}>
        <Text>Worklet: {status.running ? "running" : "stopped"}</Text>
        <Text>Link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
      </View>

      <View style={styles.card}>
        <Row label="TCP client" value={tcpEnabled} onChange={setTcpEnabled} />
        <Row
          label="AutoInterface"
          value={autoEnabled}
          onChange={(next) => {
            setAutoEnabled(next);
            if (next) {
              appendLog("AutoInterface toggle reserved for M3 native bridge");
            }
          }}
        />
        <Row
          label="BLE interface"
          value={bleEnabled}
          onChange={(next) => {
            setBleEnabled(next);
            if (next) {
              appendLog("BLE toggle reserved for M5 native bridge");
            }
          }}
        />
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
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  rowLabel: {
    color: "#f4f7fb"
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
