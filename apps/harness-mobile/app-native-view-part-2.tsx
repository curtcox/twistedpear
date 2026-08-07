import { useEffect, useState } from "react";
import { Platform, Text, TextInput, View } from "react-native";
import type { useNativeHarnessController } from "./app-native-controller.js";
import {
  ANDROID_EMULATOR_HOST,
  ActionButton,
  DEFAULT_DOCKER_PORT,
  LOCAL_HOST,
  Row,
  TEST_AGENT_PORT,
  styles,
} from "./app-native-shared.js";

export type NativeHarnessScope = ReturnType<typeof useNativeHarnessController>;

export function NativeHarnessViewPart2({
  scope,
}: {
  scope: NativeHarnessScope;
}) {
  const {
    status,
    tcpEnabled,
    setTcpEnabled,
    ntfyUrl,
    setNtfyUrl,
    ntfyToken,
    setNtfyToken,
    relayNotice,
    setRelayNotice,
    appendLog,
    sendToWorklet,
    seedShareOfferChrome,
    startWorklet,
    workletRef,
  } = scope;

  const [relayMode, setRelayMode] = useState<
    "off" | "bridge" | "transport-node"
  >("off");
  const [relayDirections, setRelayDirections] = useState<
    Record<"tcp" | "auto" | "bluetooth" | "rnode", "tx" | "rx" | "both">
  >({
    tcp: "both",
    auto: "both",
    bluetooth: "both",
    rnode: "both",
  });

  useEffect(() => {
    if (status.relayMode !== undefined) {
      setRelayMode(status.relayMode);
    }
    if (status.relayDirections !== undefined) {
      setRelayDirections((previous) => ({
        ...previous,
        ...status.relayDirections,
      }));
    }
  }, [status.relayMode, status.relayDirections]);

  const selectRelayMode = (mode: "off" | "bridge" | "transport-node") => {
    setRelayMode(mode);
    void startWorklet().then((ready) => {
      if (ready) {
        sendToWorklet({ type: "set-relay-config", mode });
      }
    });
  };

  const cycleDirection = (kind: keyof typeof relayDirections) => {
    const current = relayDirections[kind];
    const direction =
      current === "both" ? "rx" : current === "rx" ? "tx" : "both";
    setRelayDirections((previous) => ({ ...previous, [kind]: direction }));
    void startWorklet().then((ready) => {
      if (ready) {
        sendToWorklet({
          type: "set-relay-config",
          directions: { [kind]: direction },
        });
      }
    });
  };

  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Relay &amp; Interfaces</Text>
      {relayNotice === null ? null : (
        <View style={styles.card}>
          <Text>
            Mini-app {relayNotice.appId} changed relay settings (
            {relayNotice.method}
            {relayNotice.kind === undefined ? "" : `: ${relayNotice.kind}`}).
          </Text>
          <ActionButton label="Dismiss" onPress={() => setRelayNotice(null)} />
        </View>
      )}
      <Text style={styles.muted}>
        Off keeps this device online without forwarding peer traffic.
      </Text>
      <View style={styles.buttonRow}>
        <ActionButton
          label={relayMode === "off" ? "✓ Off" : "Off"}
          onPress={() => selectRelayMode("off")}
        />
        <ActionButton
          label={relayMode === "bridge" ? "✓ Bridge" : "Bridge"}
          onPress={() => selectRelayMode("bridge")}
        />
        <ActionButton
          label={relayMode === "transport-node" ? "✓ Transport" : "Transport"}
          onPress={() => selectRelayMode("transport-node")}
        />
      </View>
      <View style={styles.buttonRow}>
        <ActionButton
          testID="create-identity"
          label="Create identity"
          onPress={() => {
            void (async () => {
              const ready = await startWorklet();
              if (!ready) {
                return;
              }
              sendToWorklet({ type: "create-identity" });
            })();
          }}
        />
        <ActionButton
          label="Reset identity"
          onPress={() => sendToWorklet({ type: "reset-identity" })}
        />
      </View>
      <Row
        testID="tcp-client-switch"
        label="TCP client"
        value={tcpEnabled}
        onChange={setTcpEnabled}
      />
      {(["tcp", "auto", "bluetooth", "rnode"] as const).map((kind) => (
        <ActionButton
          key={`relay-direction-${kind}`}
          label={`${kind} direction: ${relayDirections[kind].toUpperCase()}`}
          onPress={() => cycleDirection(kind)}
        />
      ))}
      {(status.relayInterfaces ?? []).map((entry) => (
        <Text key={`relay-status-${entry.kind}`} style={styles.muted}>
          {entry.kind}:{" "}
          {entry.supported
            ? entry.enabled
              ? entry.online
                ? "online"
                : "offline"
              : "disabled"
            : "unsupported"}{" "}
          · {entry.direction.toUpperCase()} · {entry.bitrate ?? "—"} bps · ↓
          {entry.bytesIn} ↑{entry.bytesOut}
        </Text>
      ))}
      <View style={styles.buttonRow}>
        <ActionButton
          testID="connect-test-agent"
          label="Connect peer agent"
          onPress={() => {
            sendToWorklet({
              type: "connect-test-agent",
              host:
                Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
              port: TEST_AGENT_PORT,
              label: Platform.OS === "android" ? "android" : "ios",
              platform: Platform.OS,
            });
            appendLog(`Peer agent requested on port ${TEST_AGENT_PORT}`);
          }}
        />
        <ActionButton
          testID="seed-share-offer"
          label="Seed share offer"
          onPress={() => {
            seedShareOfferChrome({
              appId: "line-check",
              displayLabel: "Ana",
              classId: "microphone",
              ttlMs: 15 * 60_000,
            });
            appendLog("Seeded share offer for chrome probe");
          }}
        />
        <ActionButton
          testID="seed-share-offer-short"
          label="Seed short share"
          onPress={() => {
            seedShareOfferChrome({
              appId: "line-check",
              displayLabel: "Ana",
              classId: "microphone",
              ttlMs: 3_000,
            });
            appendLog("Seeded short-TTL share offer");
          }}
        />
      </View>
      <View style={styles.buttonRow}>
        <ActionButton
          testID="join-community-network"
          label="Join community network"
          onPress={() => {
            setTcpEnabled(true);
            void (async () => {
              const ready = await startWorklet();
              if (!ready) {
                return;
              }
              sendToWorklet({ type: "join-community-network" });
            })();
          }}
        />
      </View>
      <Text style={styles.muted}>
        Public transport operators can observe your IP address and traffic
        timing. Message contents remain encrypted.
      </Text>
      <Text style={styles.sectionTitle}>Optional ntfy rendezvous</Text>
      <Text style={styles.muted}>
        Invitation contents are end-to-end encrypted. The server still observes
        random topics, timing, and IP metadata.
      </Text>
      <TextInput
        style={styles.input}
        value={ntfyUrl}
        onChangeText={setNtfyUrl}
        autoCapitalize="none"
        placeholder="https://ntfy.example/"
        placeholderTextColor="#718096"
      />
      <TextInput
        style={styles.input}
        value={ntfyToken}
        onChangeText={setNtfyToken}
        autoCapitalize="none"
        secureTextEntry
        placeholder="Bearer token (optional)"
        placeholderTextColor="#718096"
      />
      <ActionButton
        label="Apply ntfy"
        onPress={() => {
          if (workletRef.current === null) {
            void startWorklet();
          } else {
            sendToWorklet({
              type: "start",
              targetHost:
                Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
              targetPort: DEFAULT_DOCKER_PORT,
              multicastEntitled: Platform.OS !== "ios",
              bonjourEnabled: true,
              ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() }),
            });
          }
        }}
      />
    </View>
  );
}
