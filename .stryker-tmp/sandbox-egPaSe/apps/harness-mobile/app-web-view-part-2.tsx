// @ts-nocheck
import { useCallback,useEffect,useMemo,useRef,useState } from "react";
import { Image,Platform,Pressable,ScrollView,StyleSheet,Switch,Text,TextInput,View } from "react-native";
import qrcodeModule from "qrcode-generator";
import { decodePeerQrRgba } from "@twistedpear/peer-discovery";
import { decodePeerAudioFskStream,encodePeerAudioFsk } from "@twistedpear/protocol";
import { StatusBar } from "expo-status-bar";
import { validateWidgetTree,type WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { createWebCoreBridge } from "./host/web-core-bridge";
import { createPwaInstallController,type PwaInstallAvailability } from "./host/web-pwa-install";
import { webSerialSupported } from "./host/web-serial-relay";
import type { AnnounceEntry,CapabilityGrantView,ConfirmationKind,HostConfirmationRequestView,HostToWorkletMessage,Install256tResultView,InstallProgress,InstallReviewRequestView,InstalledPackageView,LaunchReviewCapabilityView,LaunchReviewRequestView,MiniappRuntimeView,TrustedPublisherView,WebStorageQuotaView,WorkletStatus,WorkletToHostMessage,DeviceStateView,SessionInviteView } from "./worklet/protocol";
import { ActionButton, CONFIRM_KIND_TITLES, DEFAULT_PASSPHRASE, HostConfirmationModal, MAX_ANNOUNCES, PeerChromeModal, Row, audioHex, audioUnhex, chatWidgetTree, defaultGatewayUrl, formatBytes, handleWebMediaCodecRequest, helloWidgetTree, initialStatus, outboundWebRtcMediaBytes, playInboundAudioFrame, playPeerAudio, recordPeerAudio, styles, webBytesToHex, webDecodeOpus, webEncodeOpus, webHexToBytes } from "./app-web-shared.js";
import type { useWebHarnessController } from "./app-web-controller.js";
export type WebHarnessScope = ReturnType<typeof useWebHarnessController>;
export function WebHarnessViewPart2({ scope }: { scope: WebHarnessScope }) {
  const { status, setStatus, announces, setAnnounces, logLines, setLogLines, gatewayUrl, setGatewayUrl, sharedToken, setSharedToken, ntfyUrl, setNtfyUrl, ntfyToken, setNtfyToken, wsEnabled, setWsEnabled, rnodeEnabled, setRnodeEnabled, webSerialAvailable, previewTree, setPreviewTree, lastWidgetEvent, setLastWidgetEvent, storageQuota, setStorageQuota, installed, setInstalled, selectedInstalledAppId, setSelectedInstalledAppId, grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime, developerMode, setDeveloperMode, hostModal, setHostModal, peerModal, setPeerModal, install256tInput, setInstall256tInput, installProgress, setInstallProgress, trustedPublishers, setTrustedPublishers, trustIdentityInput, setTrustIdentityInput, trustLabelInput, setTrustLabelInput, hostIdentity256t, setHostIdentity256t, deviceState, setDeviceState, sessionInvites, setSessionInvites, pwaInstallAvailability, setPwaInstallAvailability, pwaInstallRef, peerRtcRef, previewOptions, bridgeRef, workspaceReadCounterRef, crossDeviceCounterRef, pendingCrossDeviceRef, pendingWorkspaceReadsRef, appendLog, sendToWorker, readWorkspaceDocument, handleWorkerMessage, ensureBridge, pushGatewayConfig, performPeerAudio, connectWebSerialRnode, promptPwaInstall } = scope;
  return <>
<View style={styles.card}>
        <Text style={styles.sectionTitle}>Install from 256t (W3)</Text>
        <Text style={styles.muted}>
          Paste or scan a 94-character package id. The host waits for a CAS locator announce, fetches over Reticulum
          Resource, then shows capability review before installing into OPFS/IndexedDB.
        </Text>
        <TextInput
          testID="install-256t-input"
          style={styles.input}
          value={install256tInput}
          onChangeText={setInstall256tInput}
          autoCapitalize="none"
          placeholder="94-character 256t id"
        />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="install-256t"
            label="Install from 256t"
            onPress={() => {
              const trimmed = install256tInput.trim();
              if (trimmed.length === 0) {
                return;
              }

              setInstallProgress(null);
              sendToWorker({ type: "install-from-256t", t256: trimmed });
            }}
          />
        </View>
        {installProgress !== null ? (
          <Text testID="install-progress" style={styles.muted}>
            Install {installProgress.appId}: {installProgress.phase}
            {installProgress.totalBytes > 0
              ? ` · ${formatBytes(installProgress.bytesReceived)} / ${formatBytes(installProgress.totalBytes)}`
              : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Publisher trust (W3)</Text>
        <Text style={styles.muted}>
          Import a publisher identity string (94-character inline 256t) to mark installs from that key as trusted in the
          review UI.
        </Text>
        <TextInput
          testID="trust-identity-input"
          style={styles.input}
          value={trustIdentityInput}
          onChangeText={setTrustIdentityInput}
          autoCapitalize="none"
          placeholder="Publisher identity 256t"
        />
        <TextInput
          testID="trust-label-input"
          style={styles.input}
          value={trustLabelInput}
          onChangeText={setTrustLabelInput}
          placeholder="Label (e.g. Alice)"
        />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="trust-add"
            label="Trust publisher"
            onPress={() => {
              const identityString = trustIdentityInput.trim();
              if (identityString.length === 0) {
                return;
              }

              sendToWorker({
                type: "trust-add",
                identityString,
                label: trustLabelInput.trim() || "Unnamed publisher",
                source: "paste"
              });
              setTrustIdentityInput("");
            }}
          />
          <ActionButton
            testID="trust-show"
            label="Show my identity"
            onPress={() => sendToWorker({ type: "trust-show" })}
          />
          <ActionButton label="Refresh trust" onPress={() => sendToWorker({ type: "trust-list" })} />
        </View>
        {hostIdentity256t !== null ? (
          <Text testID="trust-identity-view" style={styles.mono}>
            Host identity: {hostIdentity256t}
          </Text>
        ) : null}
        {trustedPublishers.length === 0 ? (
          <Text style={styles.muted}>No trusted publishers yet.</Text>
        ) : (
          trustedPublishers.map((entry) => (
            <View key={entry.publisherPublicKey} style={styles.packageRow}>
              <Text style={styles.packageTitle}>
                {entry.label} · {entry.publisherPublicKey.slice(0, 16)}…
              </Text>
              <ActionButton
                label="Remove"
                onPress={() => sendToWorker({ type: "trust-remove", publisherPublicKey: entry.publisherPublicKey })}
              />
            </View>
          ))
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Installed packages</Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Refresh" onPress={() => sendToWorker({ type: "list-installed" })} />
        </View>
        {installed.length === 0 ? (
          <Text style={styles.muted}>No packages installed yet.</Text>
        ) : (
          installed.map((pkg) => (
            <View key={`${pkg.appId}-${pkg.version}`} style={styles.packageRow}>
              <Pressable
                testID={`installed-${pkg.appId}`}
                onPress={() => {
                  setSelectedInstalledAppId(pkg.appId);
                  sendToWorker({
                    type: "get-grants",
                    appId: pkg.appId,
                    publisherPublicKey: pkg.publisherPublicKey ?? "",
                    declaredCapabilities: pkg.capabilities ?? []
                  });
                }}
              >
                <Text style={styles.packageTitle}>
                  {pkg.appId}@{pkg.version}
                </Text>
              </Pressable>
              <ActionButton
                label="Launch"
                onPress={() => sendToWorker({ type: "launch-miniapp", appId: pkg.appId })}
              />
            </View>
          ))
        )}
        {selectedInstalledAppId !== null && grantCapabilities.length > 0 ? (
          <>
            <Text style={styles.muted}>Grants for {selectedInstalledAppId}</Text>
            {grantCapabilities
              .filter((capability) => capability.declared)
              .map((capability) => (
                <Row
                  key={capability.id}
                  testID={`grant-${capability.id}`}
                  label={capability.id}
                  value={capability.granted}
                  onChange={(granted) => {
                    const selected = installed.find((pkg) => pkg.appId === selectedInstalledAppId);
                    if (selected === undefined) {
                      return;
                    }

                    const nextGranted = grantCapabilities
                      .filter((entry) => entry.declared && (entry.id === capability.id ? granted : entry.granted))
                      .map((entry) => entry.id);
                    sendToWorker({
                      type: "set-grants",
                      appId: selected.appId,
                      publisherPublicKey: selected.publisherPublicKey ?? "",
                      declaredCapabilities: selected.capabilities ?? [],
                      grantedCapabilities: nextGranted
                    });
                  }}
                />
              ))}
          </>
        ) : null}
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
        <Text style={styles.sectionTitle}>Unavailable on web</Text>
        <Text style={styles.muted}>AutoInterface / multicast / Bonjour — not available in browser tabs.</Text>
        <Text style={styles.muted}>BLE — requires native host bridges.</Text>
        <Text style={styles.muted}>
          USB RNode on web uses Web Serial (Chromium); native Android/iOS USB paths stay on mobile harness.
        </Text>
        <Text style={styles.muted}>
          Hyperdrive install uses gateway `/bulk-fetch` (Hyperswarm on the node); DHT relay remains experimental
          fallback. Resource + 256t install always supported.
        </Text>
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
  </>;
}
