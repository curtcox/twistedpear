import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { validateWidgetTree, type WidgetTree } from "@twistedpear/miniapp-runtime";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { createWebCoreBridge } from "./host/web-core-bridge";
import type { AnnounceEntry, HostToWorkletMessage, WebStorageQuotaView, WorkletStatus, WorkletToHostMessage } from "./worklet/protocol";

const DEFAULT_PASSPHRASE = "harness-web-dev";
const MAX_ANNOUNCES = 50;

const helloWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
    ]
  }
});

const chatWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
      {
        id: "peer-input",
        type: "text-input",
        props: { value: "", placeholder: "Peer app id", event: "chat.peer" }
      },
      { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } },
      {
        id: "inbox-scroll",
        type: "scroll",
        children: [{ id: "inbox", type: "text", props: { value: "No messages yet" } }]
      }
    ]
  }
});

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
  cryptoProvider: "pure",
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  wsEnabled: false,
  gatewayUrl: null
};

function defaultGatewayUrl(): string {
  const location = (globalThis as { location?: { protocol: string; host: string } }).location;
  if (location === undefined) {
    return "ws://127.0.0.1:9480";
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export default function App() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Web leaf host ready. Configure the gateway URL, create an identity, then enable the WS gateway."
  ]);
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl());
  const [sharedToken, setSharedToken] = useState("");
  const [wsEnabled, setWsEnabled] = useState(false);
  const [previewTree, setPreviewTree] = useState<WidgetTree>(helloWidgetTree);
  const [lastWidgetEvent, setLastWidgetEvent] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<WebStorageQuotaView | null>(null);

  const previewOptions = useMemo(
    () =>
      [
        { id: "hello", label: "Hello", tree: helloWidgetTree },
        { id: "chat", label: "Chat panel", tree: chatWidgetTree }
      ] as const,
    []
  );

  const bridgeRef = useRef<ReturnType<typeof createWebCoreBridge> | null>(null);

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const sendToWorker = useCallback((message: HostToWorkletMessage) => {
    bridgeRef.current?.send(message);
  }, []);

  const handleWorkerMessage = useCallback(
    (message: WorkletToHostMessage) => {
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
        return;
      }

      if (message.type === "storage-quota") {
        setStorageQuota(message.quota);
        return;
      }
    },
    [appendLog]
  );

  const ensureBridge = useCallback(() => {
    if (bridgeRef.current !== null) {
      return bridgeRef.current;
    }

    const bridge = createWebCoreBridge();
    bridge.setMessageHandler(handleWorkerMessage);
    bridge.worklet.start("/web-core.worker.js");
    bridgeRef.current = bridge;
    return bridge;
  }, [handleWorkerMessage]);

  const pushGatewayConfig = useCallback(() => {
    ensureBridge();
    sendToWorker({
      type: "start",
      targetHost: "127.0.0.1",
      targetPort: 9480,
      gatewayUrl,
      identityPassphrase: DEFAULT_PASSPHRASE,
      ...(sharedToken.trim().length === 0 ? {} : { sharedToken: sharedToken.trim() })
    });
  }, [ensureBridge, gatewayUrl, sendToWorker, sharedToken]);

  useEffect(() => {
    ensureBridge();
    pushGatewayConfig();
  }, [ensureBridge, pushGatewayConfig]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "refresh-storage" });
  }, [ensureBridge, sendToWorker]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({
      type: "set-interfaces",
      tcp: wsEnabled,
      auto: false,
      ble: false,
      rnode: false
    });
  }, [ensureBridge, sendToWorker, wsEnabled]);

  useEffect(
    () => () => {
      bridgeRef.current?.stop();
      bridgeRef.current = null;
    },
    []
  );

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>TwistedPear Web Host</Text>
      <Text style={styles.subtitle}>Reticulum leaf peer in the browser (Phase W1 · W-S3 preview · W-S4 storage)</Text>

      <View style={styles.card}>
        <Text>Core worker: {status.running ? "running" : "stopped"}</Text>
        <Text>Gateway link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Crypto: {status.cryptoProvider}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
        <Text>Online interfaces: {status.onlineInterfaces}</Text>
        <Text>Identity: {status.identityHash ?? "none"}</Text>
        <Text>Persisted: {status.identityPersisted ? "yes" : "no"}</Text>
        <Text>Gateway: {status.gatewayUrl ?? gatewayUrl}</Text>
        <Text>Installed packages: {status.installedPackages}</Text>
        <Text>Package storage: {formatBytes(status.storageUsedBytes)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Browser storage (W-S4)</Text>
        <Text style={styles.muted}>
          Package archives in OPFS (IndexedDB fallback) · CAS blobs in IndexedDB · quota from{" "}
          <Text style={styles.mono}>navigator.storage</Text>.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Refresh quota" onPress={() => sendToWorker({ type: "refresh-storage" })} />
        </View>
        {storageQuota === null ? (
          <Text style={styles.muted}>Quota not loaded yet.</Text>
        ) : (
          <>
            <Text>Archive backend: {storageQuota.archiveBackend}</Text>
            <Text>Persisted: {storageQuota.persisted ? "yes" : "no"}</Text>
            <Text>
              Package quota: {formatBytes(storageQuota.packageUsedBytes)} /{" "}
              {formatBytes(storageQuota.packageQuotaBytes)}
            </Text>
            <Text>
              Browser estimate: {formatBytes(storageQuota.usageBytes)} / {formatBytes(storageQuota.quotaBytes)}
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Gateway</Text>
        <Text style={styles.muted}>Connect through a node with `--ws-listen` (same origin when using `--serve-web`).</Text>
        <TextInput
          style={styles.input}
          value={gatewayUrl}
          onChangeText={setGatewayUrl}
          autoCapitalize="none"
          placeholder="ws://127.0.0.1:9480"
        />
        <TextInput
          style={styles.input}
          value={sharedToken}
          onChangeText={setSharedToken}
          autoCapitalize="none"
          placeholder="Shared token (optional)"
        />
        <View style={styles.buttonRow}>
          <ActionButton label="Apply gateway" onPress={pushGatewayConfig} />
        </View>
        <Row
          testID="ws-gateway-switch"
          label="WS gateway"
          value={wsEnabled}
          onChange={setWsEnabled}
        />
      </View>

      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="create-identity"
            label="Create identity"
            onPress={() => sendToWorker({ type: "create-identity" })}
          />
          <ActionButton label="Reset identity" onPress={() => sendToWorker({ type: "reset-identity" })} />
        </View>
        <Text style={styles.muted}>
          Identity keys are encrypted in IndexedDB under passphrase `{DEFAULT_PASSPHRASE}` (dev harness only).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Widget preview (W-S3)</Text>
        <Text style={styles.muted}>
          Shared `@twistedpear/widget-renderer-rn` via react-native-web — same renderer as mobile harness.
        </Text>
        <View style={styles.buttonRow}>
          {previewOptions.map((option) => (
            <ActionButton
              key={option.id}
              testID={`widget-preview-${option.id}`}
              label={option.label}
              onPress={() => setPreviewTree(option.tree)}
            />
          ))}
        </View>
        <MiniappWidgetTree
          tree={previewTree}
          onEvent={(nodeId, event, value) => {
            const detail =
              value === undefined ? `${nodeId}:${event}` : `${nodeId}:${event}:${JSON.stringify(value)}`;
            setLastWidgetEvent(detail);
          }}
        />
        <Text testID="widget-last-event" style={styles.muted}>
          Last event: {lastWidgetEvent ?? "none"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Unavailable on web (Phase W1)</Text>
        <Text style={styles.muted}>AutoInterface / multicast / Bonjour — not available in browser tabs.</Text>
        <Text style={styles.muted}>BLE / USB RNode — requires native host bridges.</Text>
        <Text style={styles.muted}>Mini-app runtime / catalog — Phase W2.</Text>
      </View>

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

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "unknown";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function Row({
  label,
  value,
  onChange,
  testID
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  readonly testID?: string;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch testID={testID} value={value} onValueChange={onChange} />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  testID
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly testID?: string;
}) {
  return (
    <Pressable testID={testID} style={styles.button} onPress={onPress}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101418",
    paddingTop: Platform.OS === "web" ? 24 : 64,
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
  mono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo"
  },
  announceLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
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
  input: {
    backgroundColor: "#0f141b",
    color: "#f4f7fb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13
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
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 24
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12,
    marginBottom: 6
  }
});
