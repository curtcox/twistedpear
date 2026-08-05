import { useCallback,useEffect,useRef,useState } from "react";
import { AppState,Image,PermissionsAndroid,Platform,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View } from "react-native";
import { CameraView,useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import qrcodeModule from "qrcode-generator";
import { decodePeerAudioFskStream,encodePeerAudioFsk,encodeDeviceStreamFrame } from "@twistedpear/protocol";
import { BundledOpusMediaCodecDriver,configureBundledOpusLoader,ensureUtf16LeTextDecoder } from "@twistedpear/effects";
import OpusScript from "opusscript";
import { nativePeerAudioSupported,playNativePeerPcm,recordNativePeerPcm,requestNativePeerAudioPermission } from "@twistedpear/peer-audio";
import { Worklet } from "react-native-bare-kit";
import bundle from "./worklet/worklet.bundle.mjs";
import { getNodeLifecycleState,isNodeServiceRunning,startNodeService,stopNodeService,addNodeLifecycleListener,type NodeLifecycleState } from "@twistedpear/node-service";
import { HostMulticastIpc } from "./host/multicast-ipc";
import { HostBonjourIpc } from "./host/bonjour-ipc";
import { HostBleIpc } from "./host/ble-ipc";
import { HostUsbIpc } from "./host/usb-ipc";
import { nativeDeviceActuate,nativeDeviceAvailability,nativeDeviceSense } from "./host/native-device-bridge";
import { createNativePeerRtcStore,handleNativePeerWebRtcMessage } from "./host/native-peer-webrtc";
import { hasUsbSerialPermission,getUsbSerialCapability,listUsbSerialDevices,requestUsbSerialPermission,type UsbSerialDeviceInfo } from "@twistedpear/usb-serial";
import { acceptFreenetRemoteGrant,defaultFreenetRemoteGrant,FREENET_REMOTE_DISCLOSURE,freenetGrantLogSafe,generateFreenetRendezvousHex,revokeFreenetRemoteGrant,type FreenetRemoteGrant } from "./src/freenet-remote-grant";
import { freenetRemoteSessionStatusLabel,idleFreenetRemoteSession,probeFreenetRemoteNode,reduceFreenetRemoteSession,freenetRemoteSessionLogSafe,type FreenetRemoteSession } from "./src/freenet-remote-session";
import { freenetPropagationRoleLabel } from "./src/freenet-propagation-role";
import { decodeMessages,encodeMessage,type AnnounceEntry,type CapabilityGrantView,type CatalogEntryView,type HostToWorkletMessage,type InstallProgress,type InstalledPackageView,type MiniappRuntimeView,type MiniappBenchmarkResult,type WorkletStatus,type HostConfirmationRequestView,type InstallReviewRequestView,type LaunchReviewRequestView,type TrustedPublisherView,type WorkletToHostMessage,type DeviceStateView,type SessionInviteView,type ConfirmationKind } from "./worklet/protocol";
import { MiniappWidgetTree } from "./host/miniapp-renderer";
import type { WidgetTree } from "@twistedpear/miniapp-runtime";
import { ANDROID_EMULATOR_HOST, ActionButton, CONFIRM_KIND_TITLES, DEFAULT_DEV_PORT, DEFAULT_DOCKER_PORT, LOCAL_HOST, MAX_ANNOUNCES, Row, TEST_AGENT_PORT, floatToPcm16, initialStatus, pcm16ToFloat, peerAudioHex, peerAudioUnhex, playInboundNativeMedia, playNativeOpusOrPcm, playNativePeerFrames, recordNativePeerFrames, requestBlePermissions, runNativeOpusDuplex, styles } from "./app-native-shared.js";
import type { useNativeHarnessController } from "./app-native-controller.js";
export type NativeHarnessScope = ReturnType<typeof useNativeHarnessController>;
export function NativeHarnessViewPart2({ scope }: { scope: NativeHarnessScope }) {
  const { status, setStatus, announces, setAnnounces, catalog, setCatalog, installed, setInstalled, installProgress, setInstallProgress, serviceRunning, setServiceRunning, lifecycleState, setLifecycleState, logLines, setLogLines, tcpEnabled, setTcpEnabled, autoEnabled, setAutoEnabled, bleEnabled, setBleEnabled, rnodeEnabled, setRnodeEnabled, usbDevices, setUsbDevices, selectedUsbDeviceId, setSelectedUsbDeviceId, selectedCatalogAppId, setSelectedCatalogAppId, selectedInstalledAppId, setSelectedInstalledAppId, grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime, miniappBenchmark, setMiniappBenchmark, miniappLogs, setMiniappLogs, developerMode, setDeveloperMode, devChannelDetail, setDevChannelDetail, devHost, setDevHost, devPort, setDevPort, ntfyUrl, setNtfyUrl, ntfyToken, setNtfyToken, freenetGrant, setFreenetGrant, freenetDisclosureAccepted, setFreenetDisclosureAccepted, freenetGrantError, setFreenetGrantError, freenetSession, setFreenetSession, peerModal, setPeerModal, hostConfirm, setHostConfirm, hostReview, setHostReview, install256tInput, setInstall256tInput, trustIdentityInput, setTrustIdentityInput, trustLabelInput, setTrustLabelInput, trustedPublishers, setTrustedPublishers, hostIdentity256t, setHostIdentity256t, deviceState, setDeviceState, sessionInvites, setSessionInvites, cameraPermission, requestCameraPermission, peerCameraActive, setPeerCameraActive, peerQrFrame, setPeerQrFrame, workletRef, ipcBufferRef, multicastIpcRef, bonjourIpcRef, bleIpcRef, usbIpcRef, workspaceReadCounterRef, peerRtcRef, pendingWorkspaceReadsRef, appendLog, sendToWorklet, seedShareOfferChrome, revokeShareOfferChrome, applyFreenetGrantToWorklet, activateFreenetGrant, readWorkspaceDocument, handleWorkletMessage, performPeerAudio, pushInterfaceConfig, workletReadyRef, stopWorklet, startWorklet, interfacesWantedWorkletRef, peerQrUri } = scope;
  return <>
<View style={styles.card}>
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
        <Row testID="tcp-client-switch" label="TCP client" value={tcpEnabled} onChange={setTcpEnabled} />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="connect-test-agent"
            label="Connect peer agent"
            onPress={() => {
              sendToWorklet({
                type: "connect-test-agent",
                host: Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
                port: TEST_AGENT_PORT,
                label: Platform.OS === "android" ? "android" : "ios",
                platform: Platform.OS
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
                ttlMs: 15 * 60_000
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
                ttlMs: 3_000
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
          Public transport operators can observe your IP address and traffic timing. Message contents remain encrypted.
        </Text>
        <Text style={styles.sectionTitle}>Optional ntfy rendezvous</Text>
        <Text style={styles.muted}>Invitation contents are end-to-end encrypted. The server still observes random topics, timing, and IP metadata.</Text>
        <TextInput style={styles.input} value={ntfyUrl} onChangeText={setNtfyUrl} autoCapitalize="none" placeholder="https://ntfy.example/" placeholderTextColor="#718096" />
        <TextInput style={styles.input} value={ntfyToken} onChangeText={setNtfyToken} autoCapitalize="none" secureTextEntry placeholder="Bearer token (optional)" placeholderTextColor="#718096" />
        <ActionButton label="Apply ntfy" onPress={() => { if (workletRef.current === null) startWorklet(); else sendToWorklet({ type: "start", targetHost: Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST, targetPort: DEFAULT_DOCKER_PORT, multicastEntitled: Platform.OS !== "ios", bonjourEnabled: true, ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() }) }); }} />

        <Text style={styles.sectionTitle} testID="freenet-remote-section">Freenet remote node</Text>
        <Text style={styles.muted}>
          Off by default. Point only at a companion node you control. No third-party gateway is preconfigured.
        </Text>
        {FREENET_REMOTE_DISCLOSURE.map((line) => (
          <Text key={line} style={styles.muted}>• {line}</Text>
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
          onChangeText={(nodeUrl) => setFreenetGrant((current) => ({ ...current, nodeUrl }))}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="ws://127.0.0.1:50509/v1/contract/command"
          placeholderTextColor="#718096"
        />
        <TextInput
          testID="freenet-operator-label"
          style={styles.input}
          value={freenetGrant.operatorLabel}
          onChangeText={(operatorLabel) => setFreenetGrant((current) => ({ ...current, operatorLabel }))}
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
              authToken: authToken.length === 0 ? undefined : authToken
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
              capabilities: { ...current.capabilities, contractReads }
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
              capabilities: { ...current.capabilities, contractWrites }
            }))
          }
        />
        <Row
          testID="freenet-cap-packet"
          label="Packet tunnel"
          value={freenetGrant.capabilities.packetTunnel}
          onChange={(packetTunnel) =>
            setFreenetGrant((current) => ({
              ...current,
              capabilities: { ...current.capabilities, packetTunnel }
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
                  rendezvousHex: rendezvousHex.length === 0 ? undefined : rendezvousHex
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
                    rendezvousHex: generateFreenetRendezvousHex()
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
                  localDirection: sideOne ? 1 : 0
                }))
              }
            />
          </>
        ) : null}
        <Row
          testID="freenet-cap-propagation"
          label="Propagation"
          value={freenetGrant.capabilities.propagation}
          onChange={(propagation) =>
            setFreenetGrant((current) => ({
              ...current,
              capabilities: { ...current.capabilities, propagation }
            }))
          }
        />
        {freenetGrantError !== null ? <Text testID="freenet-grant-error" style={styles.muted}>{freenetGrantError}</Text> : null}
        <Text testID="freenet-grant-status" style={styles.muted}>
          {freenetGrant.enabled
            ? `Enabled for ${freenetGrant.operatorLabel} · reads=${freenetGrant.capabilities.contractReads ? "on" : "off"} · packet=${freenetGrant.capabilities.packetTunnel ? "on" : "off"} · propagation=${freenetGrant.capabilities.propagation ? "on" : "off"}`
            : "Disabled"}
        </Text>
        <Text testID="freenet-session-status" style={styles.muted}>
          Session: {freenetRemoteSessionStatusLabel(freenetSession)}
          {freenetSession.lastError !== null ? ` · ${freenetSession.lastError}` : ""}
        </Text>
        <Text testID="freenet-propagation-role-status" style={styles.muted}>
          {freenetPropagationRoleLabel(status)}
        </Text>
        {freenetSession.pendingWriteConfirmation ? (
          <View>
            <Text testID="freenet-write-confirm" style={styles.muted}>
              Confirm irreversible Freenet contract write?
            </Text>
            <ActionButton
              testID="freenet-write-confirm-yes"
              label="Confirm write"
              onPress={() => {
                void (async () => {
                  if (freenetGrant.enabled !== true) return;
                  setFreenetSession((current) =>
                    reduceFreenetRemoteSession(current, { type: "confirm-write" })
                  );
                  try {
                    await activateFreenetGrant(freenetGrant);
                  } catch (error) {
                    setFreenetGrantError(error instanceof Error ? error.message : String(error));
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
                  `Freenet write confirmation cancelled: ${JSON.stringify(freenetGrantLogSafe(revoked))}`
                );
              }}
            />
          </View>
        ) : null}
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
                    capabilities: freenetGrant.capabilities
                  },
                  { acceptedDisclosure: freenetDisclosureAccepted }
                );
                setFreenetGrant(enabled);
                setFreenetGrantError(null);
                appendLog(
                  `Freenet remote grant enabled: ${JSON.stringify(freenetGrantLogSafe(enabled))}`
                );
                if (enabled.capabilities.contractWrites) {
                  let next = reduceFreenetRemoteSession(idleFreenetRemoteSession(), {
                    type: "enable",
                    grant: enabled
                  });
                  next = reduceFreenetRemoteSession(next, {
                    type: "request-write-confirmation"
                  });
                  setFreenetSession(next);
                  return;
                }
                await activateFreenetGrant(enabled);
              } catch (error) {
                setFreenetGrantError(error instanceof Error ? error.message : String(error));
              }
            })();
          }}
        />
        <ActionButton
          testID="freenet-grant-reconnect"
          label="Reconnect Freenet remote node"
          onPress={() => {
            void (async () => {
              if (freenetSession.grant === null) return;
              let next = reduceFreenetRemoteSession(freenetSession, { type: "reconnect" });
              setFreenetSession(next);
              applyFreenetGrantToWorklet(freenetSession.grant);
              const probe = await probeFreenetRemoteNode(freenetSession.grant);
              next = reduceFreenetRemoteSession(next, { type: "probe-result", result: probe });
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
            setFreenetSession(reduceFreenetRemoteSession(freenetSession, { type: "revoke" }));
            appendLog(`Freenet remote grant revoked: ${JSON.stringify(freenetGrantLogSafe(revoked))}`);
          }}
        />

        <Row testID="auto-interface-switch" label="AutoInterface" value={autoEnabled} onChange={setAutoEnabled} />
        <Row testID="ble-interface-switch" label="BLE interface" value={bleEnabled} onChange={setBleEnabled} />
        <Row
          label={Platform.OS === "ios" ? "RNode (BLE)" : "RNode (USB)"}
          value={Platform.OS === "ios" ? false : rnodeEnabled}
          onChange={(enabled) => {
            if (Platform.OS === "ios") {
              setRnodeEnabled(false);
              appendLog("RNode on iOS uses BLE and is device-gated for Phase 5 hardware validation.");
              return;
            }

            setRnodeEnabled(enabled);
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
            <Text style={styles.muted}>Dev side-load channel (localhost / adb reverse only)</Text>
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
                    port: Number(devPort) || DEFAULT_DEV_PORT
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
            {devChannelDetail ? <Text style={styles.muted}>Dev channel: {devChannelDetail}</Text> : null}
          </View>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mini-app surface</Text>
        <Text testID="miniapp-state" style={styles.muted}>
          {miniappRuntime?.devBadge ? (
            <Text style={styles.devBadge}>DEV </Text>
          ) : null}
          {miniappRuntime?.appId ?? "none"} · {miniappRuntime?.state ?? "stopped"}
          {status.miniappRunning ? " · foreground" : ""}
        </Text>
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
            spawn {miniappBenchmark.spawnMs}ms · kill {miniappBenchmark.killMs}ms · busy-loop{" "}
            {miniappBenchmark.busyLoopKillMs}ms · wasm{" "}
            {miniappBenchmark.wasmExecuted ? "yes" : "no"}
            {miniappBenchmark.busyLoopKilled ? "" : " · kill failed"} ({miniappBenchmark.backend})
          </Text>
        ) : null}
        {miniappLogs.length > 0 ? (
          <Text style={styles.muted}>{miniappLogs[miniappLogs.length - 1]}</Text>
        ) : null}
      </View>
  </>;
}
