import { Platform, Text, TextInput, View } from "react-native";
import {
  acceptFreenetRemoteGrant,
  FREENET_REMOTE_DISCLOSURE,
  freenetGrantLogSafe,
  generateFreenetRendezvousHex,
  revokeFreenetRemoteGrant,
} from "./src/freenet-remote-grant";
import {
  freenetRemoteSessionStatusLabel,
  idleFreenetRemoteSession,
  probeFreenetRemoteNode,
  reduceFreenetRemoteSession,
} from "./src/freenet-remote-session";
import { freenetPropagationRoleLabel } from "./src/freenet-propagation-role";
import type { WidgetTree } from "@twistedpear/miniapp-runtime";
import { MiniappWidgetTree } from "./host/miniapp-renderer";
import {
  ActionButton,
  DEFAULT_DEV_PORT,
  Row,
  styles,
} from "./app-native-shared.js";
import type { NativeHarnessScope } from "./app-native-view-part-2.js";

export function NativeHarnessViewPart4({
  scope,
}: {
  scope: NativeHarnessScope;
}) {
  return (
    <>
      <NativeFreenetRemoteCard scope={scope} />
      <NativeFreenetCapabilityRows scope={scope} />
      <NativeFreenetGrantActions scope={scope} />
      <NativeHostInterfaceToggles scope={scope} />
      <NativeMiniappSurfaceCard scope={scope} />
    </>
  );
}

function NativeFreenetRemoteCard({ scope }: { scope: NativeHarnessScope }) {
  const {
    freenetGrant,
    setFreenetGrant,
    freenetDisclosureAccepted,
    setFreenetDisclosureAccepted,
  } = scope;

  return (
    <>
      <View style={styles.card}>
        <Text style={styles.sectionTitle} testID="freenet-remote-section">
          Freenet remote node
        </Text>
        <Text style={styles.muted}>
          Off by default. Point only at a companion node you control. No
          third-party gateway is preconfigured.
        </Text>
        {FREENET_REMOTE_DISCLOSURE.map((line) => (
          <Text key={line} style={styles.muted}>
            • {line}
          </Text>
        ))}
        <Row
          testID="freenet-disclosure-accepted"
          label="I understand the disclosure above"
          value={freenetDisclosureAccepted}
          onChange={setFreenetDisclosureAccepted}
        />
        <TextInput
          testID="freenet-node-url"
          style={styles.input}
          value={freenetGrant.nodeUrl}
          onChangeText={(nodeUrl) =>
            setFreenetGrant((current) => ({ ...current, nodeUrl }))
          }
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="ws://127.0.0.1:50509/v1/contract/command"
          placeholderTextColor="#718096"
        />
        <TextInput
          testID="freenet-operator-label"
          style={styles.input}
          value={freenetGrant.operatorLabel}
          onChangeText={(operatorLabel) =>
            setFreenetGrant((current) => ({ ...current, operatorLabel }))
          }
          placeholder="Operator label (e.g. home companion)"
          placeholderTextColor="#718096"
        />
        <TextInput
          testID="freenet-auth-token"
          style={styles.input}
          value={freenetGrant.authToken ?? ""}
          onChangeText={(authToken) =>
            setFreenetGrant((current) => ({
              ...current,
              authToken: authToken.length === 0 ? undefined : authToken,
            }))
          }
          autoCapitalize="none"
          secureTextEntry
          placeholder="Auth token (optional; never logged)"
          placeholderTextColor="#718096"
        />
        <Row
          testID="freenet-cap-reads"
          label="Contract reads"
          value={freenetGrant.capabilities.contractReads}
          onChange={(contractReads) =>
            setFreenetGrant((current) => ({
              ...current,
              capabilities: { ...current.capabilities, contractReads },
            }))
          }
        />
        <Row
          testID="freenet-cap-writes"
          label="Contract writes"
          value={freenetGrant.capabilities.contractWrites}
          onChange={(contractWrites) =>
            setFreenetGrant((current) => ({
              ...current,
              capabilities: { ...current.capabilities, contractWrites },
            }))
          }
        />
      </View>
      <NativeFreenetCapabilityRows scope={scope} />
    </>
  );
}

function NativeFreenetCapabilityRows({ scope }: { scope: NativeHarnessScope }) {
  const {
    freenetGrant,
    setFreenetGrant,
    freenetGrantError,
    freenetSession,
    status,
  } = scope;
  return (
    <View style={styles.card}>
      <NativeFreenetPacketTunnelFields scope={scope} />
      <Row
        testID="freenet-cap-propagation"
        label="Propagation"
        value={freenetGrant.capabilities.propagation}
        onChange={(propagation) =>
          setFreenetGrant((current) => ({
            ...current,
            capabilities: { ...current.capabilities, propagation },
          }))
        }
      />
      {freenetGrantError !== null ? (
        <Text testID="freenet-grant-error" style={styles.muted}>
          {freenetGrantError}
        </Text>
      ) : null}
      <Text testID="freenet-grant-status" style={styles.muted}>
        {freenetGrant.enabled
          ? `Enabled for ${freenetGrant.operatorLabel} · reads=${freenetGrant.capabilities.contractReads ? "on" : "off"} · packet=${freenetGrant.capabilities.packetTunnel ? "on" : "off"} · propagation=${freenetGrant.capabilities.propagation ? "on" : "off"}`
          : "Disabled"}
      </Text>
      <Text testID="freenet-session-status" style={styles.muted}>
        Session: {freenetRemoteSessionStatusLabel(freenetSession)}
        {freenetSession.lastError !== null
          ? ` · ${freenetSession.lastError}`
          : ""}
      </Text>
      <Text testID="freenet-propagation-role-status" style={styles.muted}>
        {freenetPropagationRoleLabel(status)}
      </Text>
      <NativeFreenetWriteConfirm scope={scope} />
    </View>
  );
}

function NativeFreenetPacketTunnelFields({
  scope,
}: {
  scope: NativeHarnessScope;
}) {
  const { freenetGrant, setFreenetGrant } = scope;
  return (
    <>
      <Row
        testID="freenet-cap-packet"
        label="Packet tunnel"
        value={freenetGrant.capabilities.packetTunnel}
        onChange={(packetTunnel) =>
          setFreenetGrant((current) => ({
            ...current,
            capabilities: { ...current.capabilities, packetTunnel },
          }))
        }
      />
      {freenetGrant.capabilities.packetTunnel ? (
        <>
          <TextInput
            testID="freenet-rendezvous-hex"
            style={styles.input}
            value={freenetGrant.rendezvousHex ?? ""}
            onChangeText={(rendezvousHex) =>
              setFreenetGrant((current) => ({
                ...current,
                rendezvousHex:
                  rendezvousHex.length === 0 ? undefined : rendezvousHex,
              }))
            }
            autoCapitalize="none"
            autoCorrect={false}
            placeholder="Packet-tunnel rendezvous (64 hex chars)"
            placeholderTextColor="#718096"
          />
          <View style={styles.buttonRow}>
            <ActionButton
              testID="freenet-rendezvous-generate"
              label="Generate rendezvous"
              onPress={() =>
                setFreenetGrant((current) => ({
                  ...current,
                  rendezvousHex: generateFreenetRendezvousHex(),
                }))
              }
            />
          </View>
          <Row
            testID="freenet-local-direction"
            label="Packet-tunnel side 1 (peer uses 0)"
            value={freenetGrant.localDirection === 1}
            onChange={(sideOne) =>
              setFreenetGrant((current) => ({
                ...current,
                localDirection: sideOne ? 1 : 0,
              }))
            }
          />
        </>
      ) : null}
    </>
  );
}

function NativeFreenetWriteConfirm({ scope }: { scope: NativeHarnessScope }) {
  const {
    freenetGrant,
    setFreenetGrant,
    setFreenetDisclosureAccepted,
    setFreenetGrantError,
    freenetSession,
    setFreenetSession,
    appendLog,
    applyFreenetGrantToWorklet,
    activateFreenetGrant,
  } = scope;
  if (!freenetSession.pendingWriteConfirmation) {
    return null;
  }
  return (
    <View>
      <Text testID="freenet-write-confirm" style={styles.muted}>
        Confirm irreversible Freenet contract write?
      </Text>
      <ActionButton
        testID="freenet-write-confirm-yes"
        label="Confirm write"
        onPress={() => {
          void (async () => {
            if (freenetGrant.enabled !== true) {
              return;
            }
            setFreenetSession((current) =>
              reduceFreenetRemoteSession(current, {
                type: "confirm-write",
              }),
            );
            try {
              await activateFreenetGrant(freenetGrant);
            } catch (error) {
              setFreenetGrantError(
                error instanceof Error ? error.message : String(error),
              );
            }
          })();
        }}
      />
      <ActionButton
        testID="freenet-write-confirm-no"
        label="Cancel write"
        onPress={() => {
          const revoked = revokeFreenetRemoteGrant(freenetGrant);
          setFreenetGrant(revoked);
          setFreenetDisclosureAccepted(false);
          setFreenetGrantError(null);
          applyFreenetGrantToWorklet(null);
          setFreenetSession(idleFreenetRemoteSession());
          appendLog(
            `Freenet write confirmation cancelled: ${JSON.stringify(freenetGrantLogSafe(revoked))}`,
          );
        }}
      />
    </View>
  );
}

function NativeFreenetGrantActions({ scope }: { scope: NativeHarnessScope }) {
  const {
    freenetGrant,
    setFreenetGrant,
    freenetDisclosureAccepted,
    setFreenetDisclosureAccepted,
    setFreenetGrantError,
    freenetSession,
    setFreenetSession,
    appendLog,
    applyFreenetGrantToWorklet,
    activateFreenetGrant,
  } = scope;
  return (
    <View style={styles.card}>
      <ActionButton
        testID="freenet-grant-enable"
        label="Enable Freenet remote node"
        onPress={() => {
          void (async () => {
            try {
              const enabled = acceptFreenetRemoteGrant(
                {
                  nodeUrl: freenetGrant.nodeUrl,
                  operatorLabel: freenetGrant.operatorLabel,
                  authToken: freenetGrant.authToken,
                  rendezvousHex: freenetGrant.rendezvousHex,
                  localDirection: freenetGrant.localDirection === 1 ? 1 : 0,
                  capabilities: freenetGrant.capabilities,
                },
                { acceptedDisclosure: freenetDisclosureAccepted },
              );
              setFreenetGrant(enabled);
              setFreenetGrantError(null);
              appendLog(
                `Freenet remote grant enabled: ${JSON.stringify(freenetGrantLogSafe(enabled))}`,
              );
              if (enabled.capabilities.contractWrites) {
                let next = reduceFreenetRemoteSession(
                  idleFreenetRemoteSession(),
                  {
                    type: "enable",
                    grant: enabled,
                  },
                );
                next = reduceFreenetRemoteSession(next, {
                  type: "request-write-confirmation",
                });
                setFreenetSession(next);
                return;
              }
              await activateFreenetGrant(enabled);
            } catch (error) {
              setFreenetGrantError(
                error instanceof Error ? error.message : String(error),
              );
            }
          })();
        }}
      />
      <ActionButton
        testID="freenet-grant-reconnect"
        label="Reconnect Freenet remote node"
        onPress={() => {
          void (async () => {
            if (freenetSession.grant === null) {
              return;
            }
            let next = reduceFreenetRemoteSession(freenetSession, {
              type: "reconnect",
            });
            setFreenetSession(next);
            applyFreenetGrantToWorklet(freenetSession.grant);
            const probe = await probeFreenetRemoteNode(freenetSession.grant);
            next = reduceFreenetRemoteSession(next, {
              type: "probe-result",
              result: probe,
            });
            setFreenetSession(next);
          })();
        }}
      />
      <ActionButton
        testID="freenet-grant-revoke"
        label="Revoke Freenet remote node"
        onPress={() => {
          const revoked = revokeFreenetRemoteGrant(freenetGrant);
          setFreenetGrant(revoked);
          setFreenetDisclosureAccepted(false);
          setFreenetGrantError(null);
          applyFreenetGrantToWorklet(null);
          setFreenetSession(
            reduceFreenetRemoteSession(freenetSession, { type: "revoke" }),
          );
          appendLog(
            `Freenet remote grant revoked: ${JSON.stringify(freenetGrantLogSafe(revoked))}`,
          );
        }}
      />
    </View>
  );
}

function NativeHostInterfaceToggles({ scope }: { scope: NativeHarnessScope }) {
  const {
    developerMode,
    setDeveloperMode,
    devChannelDetail,
    setDevChannelDetail,
    devHost,
    setDevHost,
    devPort,
    setDevPort,
    appendLog,
    sendToWorklet,
  } = scope;
  return (
    <View style={styles.card}>
      <Row
        testID="auto-interface-switch"
        label="AutoInterface"
        value={scope.autoEnabled}
        onChange={scope.setAutoEnabled}
      />
      <Row
        testID="ble-interface-switch"
        label="BLE interface"
        value={scope.bleEnabled}
        onChange={scope.setBleEnabled}
      />
      <Row
        label={Platform.OS === "ios" ? "RNode (BLE)" : "RNode (USB)"}
        value={Platform.OS === "ios" ? false : scope.rnodeEnabled}
        onChange={(enabled) => {
          if (Platform.OS === "ios") {
            scope.setRnodeEnabled(false);
            appendLog(
              "RNode on iOS uses BLE and is device-gated for Phase 5 hardware validation.",
            );
            return;
          }
          scope.setRnodeEnabled(enabled);
        }}
      />
      <Row
        label="Developer mode"
        value={developerMode}
        onChange={(enabled) => {
          setDeveloperMode(enabled);
          sendToWorklet({ type: "set-developer-mode", enabled });
          if (!enabled) {
            sendToWorklet({ type: "disconnect-dev-channel" });
            setDevChannelDetail(null);
          }
        }}
      />
      {developerMode ? (
        <View style={styles.devChannel}>
          <Text style={styles.muted}>
            Dev side-load channel (localhost / adb reverse only)
          </Text>
          <TextInput
            style={styles.input}
            value={devHost}
            onChangeText={setDevHost}
            autoCapitalize="none"
            placeholder="Dev server host"
          />
          <TextInput
            style={styles.input}
            value={devPort}
            onChangeText={setDevPort}
            keyboardType="number-pad"
            placeholder="Port"
          />
          <View style={styles.buttonRow}>
            <ActionButton
              label="Connect tp dev"
              onPress={() =>
                sendToWorklet({
                  type: "connect-dev-channel",
                  host: devHost,
                  port: Number(devPort) || DEFAULT_DEV_PORT,
                })
              }
            />
            <ActionButton
              label="Disconnect"
              onPress={() => {
                sendToWorklet({ type: "disconnect-dev-channel" });
                setDevChannelDetail(null);
              }}
            />
          </View>
          {devChannelDetail ? (
            <Text style={styles.muted}>Dev channel: {devChannelDetail}</Text>
          ) : null}
        </View>
      ) : null}
    </View>
  );
}

function NativeMiniappSurfaceCard({ scope }: { scope: NativeHarnessScope }) {
  return (
    <View style={styles.card}>
      <Text style={styles.sectionTitle}>Mini-app surface</Text>
      <NativeMiniappRuntimeLine scope={scope} />
      <NativeMiniappWidgetBlock scope={scope} />
      <NativeMiniappBenchmarkBlock scope={scope} />
    </View>
  );
}

function NativeMiniappRuntimeLine({ scope }: { scope: NativeHarnessScope }) {
  const { status, miniappRuntime } = scope;
  return (
    <Text testID="miniapp-state" style={styles.muted}>
      {miniappRuntime?.devBadge ? (
        <Text style={styles.devBadge}>DEV </Text>
      ) : null}
      {miniappRuntime?.appId ?? "none"} · {miniappRuntime?.state ?? "stopped"}
      {status.miniappRunning ? " · foreground" : ""}
    </Text>
  );
}

function NativeMiniappWidgetBlock({ scope }: { scope: NativeHarnessScope }) {
  const { miniappRuntime, deviceState, readWorkspaceDocument, sendToWorklet } =
    scope;
  return (
    <>
      <MiniappWidgetTree
        tree={(miniappRuntime?.widgetTree as WidgetTree | null) ?? null}
        readDocument={readWorkspaceDocument}
        deviceSessions={deviceState?.sessions ?? []}
        onEvent={(nodeId, event, value) =>
          sendToWorklet({ type: "miniapp-ui-event", nodeId, event, value })
        }
      />
      {miniappRuntime?.appId ? (
        <ActionButton
          testID="stop-miniapp"
          label="Stop mini-app"
          onPress={() => sendToWorklet({ type: "stop-miniapp" })}
        />
      ) : null}
    </>
  );
}

function NativeMiniappBenchmarkBlock({ scope }: { scope: NativeHarnessScope }) {
  const { miniappBenchmark, setMiniappBenchmark, miniappLogs, sendToWorklet } =
    scope;
  return (
    <>
      <ActionButton
        testID="benchmark-miniapp"
        label="Benchmark Bare worker"
        onPress={() => {
          setMiniappBenchmark(null);
          sendToWorklet({ type: "benchmark-miniapp" });
        }}
      />
      {miniappBenchmark !== null ? (
        <Text testID="benchmark-results" style={styles.muted}>
          {nativeMiniappBenchmarkText(miniappBenchmark)}
        </Text>
      ) : null}
      {miniappLogs.length > 0 ? (
        <Text style={styles.muted}>{miniappLogs[miniappLogs.length - 1]}</Text>
      ) : null}
    </>
  );
}

function nativeMiniappBenchmarkText(
  miniappBenchmark: NonNullable<NativeHarnessScope["miniappBenchmark"]>,
): string {
  const wasm = miniappBenchmark.wasmExecuted ? "yes" : "no";
  const killNote = miniappBenchmark.busyLoopKilled ? "" : " · kill failed";
  return `spawn ${miniappBenchmark.spawnMs}ms · kill ${miniappBenchmark.killMs}ms · busy-loop ${miniappBenchmark.busyLoopKillMs}ms · wasm ${wasm}${killNote} (${miniappBenchmark.backend})`;
}
