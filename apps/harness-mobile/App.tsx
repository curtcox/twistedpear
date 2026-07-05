import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";

interface WorkletStatus {
  readonly running: boolean;
  readonly linkOnline: boolean;
  readonly announcesSeen: number;
  readonly logLines: ReadonlyArray<string>;
}

const initialStatus: WorkletStatus = {
  running: false,
  linkOnline: false,
  announcesSeen: 0,
  logLines: ["Harness UI ready. Start the worklet to connect to the docker peer."]
};

export default function App() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [tcpEnabled, setTcpEnabled] = useState(true);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [bleEnabled, setBleEnabled] = useState(false);

  useEffect(() => {
    // Worklet RPC wiring lands with react-native-bare-kit integration (M0/M2).
    // The UI surface is stable while native bridges are developed in parallel.
  }, []);

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
        <Row label="AutoInterface" value={autoEnabled} onChange={setAutoEnabled} />
        <Row label="BLE interface" value={bleEnabled} onChange={setBleEnabled} />
      </View>

      <ScrollView style={styles.log}>
        {status.logLines.map((line, index) => (
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
      <Text>{label}</Text>
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
