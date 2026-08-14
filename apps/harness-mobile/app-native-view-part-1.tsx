import { useCallback, useEffect, useRef, useState } from "react";
import {
  AppState,
  Image,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import qrcodeModule from "qrcode-generator";
import {
  decodePeerAudioFskStream,
  encodePeerAudioFsk,
  encodeDeviceStreamFrame,
} from "@twistedpear/protocol";
import {
  BundledOpusMediaCodecDriver,
  configureBundledOpusLoader,
  ensureUtf16LeTextDecoder,
} from "@twistedpear/effects";
import OpusScript from "opusscript";
import {
  nativePeerAudioSupported,
  playNativePeerPcm,
  recordNativePeerPcm,
  requestNativePeerAudioPermission,
} from "@twistedpear/peer-audio";
import { Worklet } from "react-native-bare-kit";
import bundle from "./worklet/worklet.bundle.mjs";
import {
  getNodeLifecycleState,
  isNodeServiceRunning,
  startNodeService,
  stopNodeService,
  addNodeLifecycleListener,
  type NodeLifecycleState,
} from "@twistedpear/node-service";
import { HostMulticastIpc } from "./host/multicast-ipc";
import { HostBonjourIpc } from "./host/bonjour-ipc";
import { HostBleIpc } from "./host/ble-ipc";
import { HostUsbIpc } from "./host/usb-ipc";
import {
  nativeDeviceActuate,
  nativeDeviceAvailability,
  nativeDeviceSense,
} from "./host/native-device-bridge";
import {
  createNativePeerRtcStore,
  handleNativePeerWebRtcMessage,
} from "./host/native-peer-webrtc";
import {
  hasUsbSerialPermission,
  getUsbSerialCapability,
  listUsbSerialDevices,
  requestUsbSerialPermission,
  type UsbSerialDeviceInfo,
} from "@twistedpear/usb-serial";
import {
  acceptFreenetRemoteGrant,
  defaultFreenetRemoteGrant,
  FREENET_REMOTE_DISCLOSURE,
  freenetGrantLogSafe,
  generateFreenetRendezvousHex,
  revokeFreenetRemoteGrant,
  type FreenetRemoteGrant,
} from "./src/freenet-remote-grant";
import {
  freenetRemoteSessionStatusLabel,
  idleFreenetRemoteSession,
  probeFreenetRemoteNode,
  reduceFreenetRemoteSession,
  freenetRemoteSessionLogSafe,
  type FreenetRemoteSession,
} from "./src/freenet-remote-session";
import { freenetPropagationRoleLabel } from "./src/freenet-propagation-role";
import {
  decodeMessages,
  encodeMessage,
  type AnnounceEntry,
  type CapabilityGrantView,
  type CatalogEntryView,
  type HostToWorkletMessage,
  type InstallProgress,
  type InstalledPackageView,
  type MiniappRuntimeView,
  type MiniappBenchmarkResult,
  type WorkletStatus,
  type HostConfirmationRequestView,
  type InstallReviewRequestView,
  type LaunchReviewRequestView,
  type TrustedPublisherView,
  type WorkletToHostMessage,
  type DeviceStateView,
  type SessionInviteView,
  type ConfirmationKind,
} from "./worklet/protocol";
import { MiniappWidgetTree } from "./host/miniapp-renderer";
import type { WidgetTree } from "@twistedpear/miniapp-runtime";
import {
  ANDROID_EMULATOR_HOST,
  ActionButton,
  CONFIRM_KIND_TITLES,
  DEFAULT_DEV_PORT,
  DEFAULT_DOCKER_PORT,
  LOCAL_HOST,
  MAX_ANNOUNCES,
  Row,
  TEST_AGENT_PORT,
  floatToPcm16,
  initialStatus,
  pcm16ToFloat,
  peerAudioHex,
  peerAudioUnhex,
  playInboundNativeMedia,
  playNativeOpusOrPcm,
  playNativePeerFrames,
  recordNativePeerFrames,
  requestBlePermissions,
  runNativeOpusDuplex,
  styles,
} from "./app-native-shared.js";
import type { useNativeHarnessController } from "./app-native-controller.js";
export type NativeHarnessScope = ReturnType<typeof useNativeHarnessController>;

export function NativeHarnessViewPart1({
  scope,
}: {
  scope: NativeHarnessScope;
}) {
  return (
    <>
      <StatusBar style="auto" />
      <NativeHostReviewModal scope={scope} />
      <NativeHostConfirmModal scope={scope} />
      <NativePeerHostModal scope={scope} />
      <NativeSessionInviteBanner scope={scope} />
      <NativeDeviceActiveBanner scope={scope} />
      <NativeWorkletStatusCard scope={scope} />
    </>
  );
}

function NativeHostReviewModal({ scope }: { scope: NativeHarnessScope }) {
  const { hostReview, setHostReview, sendToWorklet } = scope;
  return (
    <>
      {hostReview !== null ? (
        <View testID="host-confirmation-modal" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {hostReview.kind === "install"
                ? `Install ${hostReview.review.appId} v${hostReview.review.version}?`
                : `Run ${hostReview.review.appId} v${hostReview.review.version}?`}
            </Text>
            <Text style={styles.muted}>
              {hostReview.kind === "install"
                ? hostReview.review.trusted
                  ? `Trusted publisher: ${hostReview.review.trustedLabel ?? "trusted"}`
                  : "UNTRUSTED publisher"
                : "Capability review"}
            </Text>
            <Text style={styles.rowLabel}>
              Publisher: {hostReview.review.publisherPublicKey}
            </Text>
            {hostReview.review.capabilities.map((capability) => (
              <View key={capability.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{capability.id}</Text>
                  <Text style={styles.muted}>{capability.description}</Text>
                </View>
                <Switch
                  testID={`${hostReview.kind}-grant-${capability.id.replace(/:/g, "-")}`}
                  value={hostReview.grants.includes(capability.id)}
                  onValueChange={(granted) => {
                    const grants = granted
                      ? [...hostReview.grants, capability.id]
                      : hostReview.grants.filter((id) => id !== capability.id);
                    setHostReview({ ...hostReview, grants });
                  }}
                />
              </View>
            ))}
            <View style={styles.row}>
              <ActionButton
                testID={
                  hostReview.kind === "install"
                    ? "host-install-cancel"
                    : "host-launch-cancel"
                }
                label="Cancel"
                onPress={() => {
                  sendToWorklet({
                    type:
                      hostReview.kind === "install"
                        ? "install-confirm"
                        : "launch-confirm",
                    token: hostReview.review.token,
                    accept: false,
                  });
                  setHostReview(null);
                }}
              />
              <ActionButton
                testID={
                  hostReview.kind === "install"
                    ? "host-install-approve"
                    : "host-launch-run"
                }
                label={hostReview.kind === "install" ? "Install" : "Run"}
                onPress={() => {
                  sendToWorklet({
                    type:
                      hostReview.kind === "install"
                        ? "install-confirm"
                        : "launch-confirm",
                    token: hostReview.review.token,
                    accept: true,
                    grants: hostReview.grants,
                  });
                  setHostReview(null);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

function NativeHostConfirmModal({ scope }: { scope: NativeHarnessScope }) {
  const { hostConfirm, setHostConfirm, sendToWorklet } = scope;
  return (
    <>
      {hostConfirm !== null ? (
        <View testID="host-confirmation-modal" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {(CONFIRM_KIND_TITLES as Record<string, string>)[
                hostConfirm.kind
              ] ?? `Confirm ${hostConfirm.kind}?`}
            </Text>
            <Text style={styles.muted}>
              Trusted host chrome · capability confirmation
            </Text>
            <Text style={styles.rowLabel}>Kind: {hostConfirm.kind}</Text>
            <Text style={styles.rowLabel}>App: {hostConfirm.appId}</Text>
            <Text style={styles.rowLabel}>
              Publisher: {hostConfirm.publisherPublicKey}
            </Text>
            {Object.entries(hostConfirm.summary).map(([key, value]) => (
              <Text key={key} style={styles.rowLabel}>
                {key}: {value}
              </Text>
            ))}
            <View style={styles.row}>
              <ActionButton
                testID="host-confirm-deny"
                label="Deny"
                onPress={() => {
                  sendToWorklet({
                    type: "confirm-response",
                    token: hostConfirm.token,
                    approved: false,
                  });
                  setHostConfirm(null);
                }}
              />
              <ActionButton
                testID="host-confirm-approve"
                label="Approve"
                onPress={() => {
                  sendToWorklet({
                    type: "confirm-response",
                    token: hostConfirm.token,
                    approved: true,
                  });
                  setHostConfirm(null);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
    </>
  );
}

function NativePeerHostModal({ scope }: { scope: NativeHarnessScope }) {
  const { peerModal } = scope;
  if (peerModal === null) return null;
  return (
    <View testID="peer-host-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <NativePeerModalCopy peerModal={peerModal} />
        <NativePeerModalFields scope={scope} peerModal={peerModal} />
        <NativePeerModalActions scope={scope} peerModal={peerModal} />
      </View>
    </View>
  );
}

function NativePeerModalCopy({
  peerModal,
}: {
  peerModal: NonNullable<NativeHarnessScope["peerModal"]>;
}) {
  return (
    <>
      <Text style={styles.sectionTitle}>
        {nativePeerModalTitle(peerModal)}
      </Text>
      <Text style={styles.muted}>{nativePeerModalSubtitle(peerModal)}</Text>
    </>
  );
}

function nativePeerModalTitle(
  peerModal: NonNullable<NativeHarnessScope["peerModal"]>,
): string {
  if (peerModal.kind === "confirm") {
    return "Confirm peer connection";
  }
  return nativePeerExchangeTitle(peerModal.request.type);
}

function nativePeerExchangeTitle(type: string): string {
  if (type === "peer-audio-transmit") {
    return "Play an audible peer invitation";
  }
  if (type === "peer-audio-receive") {
    return "Listen for an audible peer invitation";
  }
  if (type === "peer-ntfy-present") {
    return "Share private ntfy lookup code";
  }
  if (type === "peer-ntfy-enter") {
    return "Enter private ntfy lookup code";
  }
  if (type === "peer-qr-present") {
    return "Show peer QR";
  }
  if (type === "peer-qr-scan") {
    return "Scan peer QR";
  }
  if (type === "peer-manual-present") {
    return "Share peer invitation";
  }
  return "Enter peer invitation";
}

function nativePeerModalSubtitle(
  peerModal: NonNullable<NativeHarnessScope["peerModal"]>,
): string {
  if (peerModal.kind !== "exchange") {
    return "Trusted host chrome · full serverless code";
  }
  const type = peerModal.request.type;
  if (type === "peer-audio-transmit" || type === "peer-audio-receive") {
    return "Trusted host chrome · audible FSK tones and microphone PCM stay inside the native host.";
  }
  if (type === "peer-ntfy-present" || type === "peer-ntfy-enter") {
    return `Trusted host chrome · ${peerModal.request.server} observes a random topic, timing, and IP metadata; invitation contents are end-to-end encrypted.`;
  }
  return "Trusted host chrome · full serverless code";
}

function NativePeerModalFields({
  scope,
  peerModal,
}: {
  scope: NativeHarnessScope;
  peerModal: NonNullable<NativeHarnessScope["peerModal"]>;
}) {
  if (peerModal.kind === "confirm") {
    return <NativePeerConfirmFields peerModal={peerModal} />;
  }
  return <NativePeerExchangeFields scope={scope} peerModal={peerModal} />;
}

function NativePeerConfirmFields({
  peerModal,
}: {
  peerModal: Extract<
    NonNullable<NativeHarnessScope["peerModal"]>,
    { kind: "confirm" }
  >;
}) {
  return (
    <>
      <Text style={styles.rowLabel}>Purpose: {peerModal.request.purpose}</Text>
      <Text style={styles.rowLabel}>
        Peer label (untrusted claim): {peerModal.request.peer.displayLabel}
      </Text>
      <Text style={styles.rowLabel}>
        Fingerprint: {peerModal.request.peer.fingerprint}
      </Text>
      <Text style={styles.rowLabel}>
        Matching words: {peerModal.request.peer.matchingWords.join(" · ")}
      </Text>
      <Text style={styles.rowLabel}>
        Data path: {peerModal.request.peer.dataPlane}
      </Text>
    </>
  );
}

function NativePeerExchangeFields({
  scope,
  peerModal,
}: {
  scope: NativeHarnessScope;
  peerModal: Extract<
    NonNullable<NativeHarnessScope["peerModal"]>,
    { kind: "exchange" }
  >;
}) {
  const { peerQrUri, peerCameraActive, setPeerModal } = scope;
  return (
    <>
      {peerModal.request.type === "peer-manual-present" ? (
        <TextInput multiline editable={false} value={peerModal.request.code} style={styles.input} />
      ) : null}
      {peerModal.request.type === "peer-ntfy-present" ? (
        <TextInput multiline editable={false} value={peerModal.request.code} style={styles.input} />
      ) : null}
      {peerQrUri !== null ? (
        <Image
          accessibilityLabel="Peer invitation QR"
          source={{ uri: peerQrUri }}
          style={{ width: 260, height: 260 }}
        />
      ) : null}
      {peerCameraActive ? (
        <NativePeerCameraPreview scope={scope} />
      ) : null}
      {nativePeerNeedsCodeInput(peerModal) ? (
        <TextInput
          multiline
          value={peerModal.input}
          onChangeText={(input) => setPeerModal({ ...peerModal, input })}
          placeholder={nativePeerInputPlaceholder(peerModal.request.type)}
          placeholderTextColor="#718096"
          style={styles.input}
        />
      ) : null}
      <NativePeerStartCameraButton scope={scope} peerModal={peerModal} />
    </>
  );
}

function nativePeerNeedsCodeInput(
  peerModal: Extract<
    NonNullable<NativeHarnessScope["peerModal"]>,
    { kind: "exchange" }
  >,
): boolean {
  const type = peerModal.request.type;
  if (type === "peer-manual-enter" || type === "peer-qr-scan" || type === "peer-ntfy-enter") {
    return true;
  }
  if (type === "peer-manual-present" || type === "peer-qr-present") {
    return peerModal.request.expectsResponse;
  }
  return false;
}

function nativePeerInputPlaceholder(type: string): string {
  if (type === "peer-ntfy-enter") {
    return "Enter the TPN2 lookup code (TPN1 also works)";
  }
  if (type === "peer-qr-scan") {
    return "Scan or paste the peer QR payload";
  }
  return "Paste the peer's full code";
}

function NativePeerCameraPreview({ scope }: { scope: NativeHarnessScope }) {
  const { setPeerCameraActive, setPeerModal } = scope;
  return (
    <CameraView
      style={{ width: 280, height: 280 }}
      facing="back"
      barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
      onBarcodeScanned={({ data }) => {
        setPeerCameraActive(false);
        setPeerModal((current) =>
          current?.kind === "exchange" ? { ...current, input: data } : current,
        );
      }}
    />
  );
}

function NativePeerStartCameraButton({
  scope,
  peerModal,
}: {
  scope: NativeHarnessScope;
  peerModal: Extract<
    NonNullable<NativeHarnessScope["peerModal"]>,
    { kind: "exchange" }
  >;
}) {
  const { peerCameraActive, setPeerCameraActive, requestCameraPermission, appendLog } =
    scope;
  const type = peerModal.request.type;
  const show =
    (type === "peer-qr-scan" ||
      (type === "peer-qr-present" && peerModal.request.expectsResponse)) &&
    !peerCameraActive;
  if (!show) {
    return null;
  }
  return (
    <ActionButton
      label="Start camera"
      onPress={() => {
        void requestCameraPermission().then((permission) => {
          if (permission.granted) setPeerCameraActive(true);
          else
            appendLog(
              "Camera permission denied; paste the QR payload instead.",
            );
        });
      }}
    />
  );
}

function NativePeerModalActions({
  scope,
  peerModal,
}: {
  scope: NativeHarnessScope;
  peerModal: NonNullable<NativeHarnessScope["peerModal"]>;
}) {
  const { sendToWorklet, setPeerCameraActive, setPeerModal, performPeerAudio } =
    scope;
  return (
    <View style={styles.buttonRow}>
      <ActionButton
        label="Cancel"
        onPress={() => {
          sendToWorklet({
            type: "peer-chrome-response",
            token: peerModal.request.token,
            accepted: false,
            approved: false,
          });
          setPeerCameraActive(false);
          setPeerModal(null);
        }}
      />
      <ActionButton
        label={
          peerModal.kind === "confirm"
            ? "Connect"
            : peerModal.request.type === "peer-audio-transmit"
              ? peerModal.request.expectsResponse
                ? "Play and listen"
                : "Play answer"
              : peerModal.request.type === "peer-audio-receive"
                ? "Start listening"
                : "Continue"
        }
        onPress={() => {
          if (peerModal.kind === "confirm")
            sendToWorklet({
              type: "peer-chrome-response",
              token: peerModal.request.token,
              approved: true,
            });
          else if (
            peerModal.request.type === "peer-audio-transmit" ||
            peerModal.request.type === "peer-audio-receive"
          )
            void performPeerAudio(peerModal.request);
          else
            sendToWorklet({
              type: "peer-chrome-response",
              token: peerModal.request.token,
              accepted: true,
              ...(peerModal.input.trim() ? { code: peerModal.input.trim() } : {}),
            });
          setPeerCameraActive(false);
          setPeerModal(null);
        }}
      />
    </View>
  );
}

function NativeSessionInviteBanner({ scope }: { scope: NativeHarnessScope }) {
  const { sessionInvites, sendToWorklet } = scope;
  return (
    <>
      {sessionInvites.some((invite) => invite.phase === "pending") ? (
        <View testID="session-invite-banner" style={styles.deviceActiveBanner}>
          <Text style={styles.deviceActiveBannerTitle}>
            Incoming call invitation
          </Text>
          {sessionInvites
            .filter((invite) => invite.phase === "pending")
            .map((invite) => (
              <View key={invite.id} style={styles.deviceActiveBannerRow}>
                <Text style={styles.deviceActiveBannerText}>
                  {invite.verifiedPeerLabel} wants to start{" "}
                  {invite.requestedClasses.join(" + ")} in {invite.appId}
                </Text>
                <Pressable
                  testID={`session-invite-accept-${invite.id}`}
                  style={styles.dangerButton}
                  onPress={() =>
                    sendToWorklet({
                      type: "session-invite-accept",
                      id: invite.id,
                    })
                  }
                >
                  <Text style={styles.buttonLabel}>Accept</Text>
                </Pressable>
                <Pressable
                  testID={`session-invite-decline-${invite.id}`}
                  style={styles.dangerButton}
                  onPress={() =>
                    sendToWorklet({
                      type: "session-invite-decline",
                      id: invite.id,
                    })
                  }
                >
                  <Text style={styles.buttonLabel}>Decline</Text>
                </Pressable>
              </View>
            ))}
        </View>
      ) : null}
    </>
  );
}

function NativeDeviceActiveBanner({ scope }: { scope: NativeHarnessScope }) {
  const { deviceState, status, sendToWorklet, revokeShareOfferChrome } = scope;
  return (
    <>
      {deviceState !== null &&
      (deviceState.indicators.length > 0 ||
        deviceState.shareOffers.length > 0) ? (
        <View
          testID="device-active-banner"
          style={[
            styles.deviceActiveBanner,
            status.miniappRunning ? styles.deviceActiveBannerPinned : null,
          ]}
        >
          <Text style={styles.deviceActiveBannerTitle}>Active device use</Text>
          {deviceState.indicators.map((indicator) => (
            <View key={indicator.handle} style={styles.deviceActiveBannerRow}>
              <Text style={styles.deviceActiveBannerText}>
                {indicator.appId} · {indicator.class}:{indicator.tier} ·{" "}
                {indicator.destination} — {indicator.purpose}
              </Text>
              <Pressable
                style={styles.dangerButton}
                onPress={() =>
                  sendToWorklet({
                    type: "device-kill-session",
                    handle: indicator.handle,
                  })
                }
              >
                <Text style={styles.buttonLabel}>Stop</Text>
              </Pressable>
            </View>
          ))}
          {deviceState.shareOffers.map((offer) => (
            <View key={offer.id} style={styles.deviceActiveBannerRow}>
              <Text style={styles.deviceActiveBannerText}>
                {offer.appId} · sharing {offer.classId}:{offer.tierId} with{" "}
                {offer.displayLabel}
              </Text>
              <Pressable
                testID="device-stop-sharing"
                style={styles.dangerButton}
                onPress={() => revokeShareOfferChrome(offer.appId, offer.id)}
              >
                <Text style={styles.buttonLabel}>Stop sharing</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
    </>
  );
}

function NativeWorkletStatusCard({ scope }: { scope: NativeHarnessScope }) {
  const { status, serviceRunning, lifecycleState } = scope;
  return (
    <>
      <Text style={styles.title}>TwistedPear Harness</Text>
      <Text style={styles.subtitle}>
        Reticulum node + mini-app runtime (Phase 5 iOS host)
      </Text>
      <View style={styles.card}>
        <Text>Worklet: {status.running ? "running" : "stopped"}</Text>
        <Text>Link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Crypto: {status.cryptoProvider}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
        <Text>Auto peers: {status.autoPeers}</Text>
        <Text>Preferred interface: {status.preferredInterface ?? "—"}</Text>
        <Text>Online interfaces: {status.onlineInterfaces}</Text>
        <Text>BLE: {nativeBleStatusLabel(status)}</Text>
        <Text>RNode: {nativeRnodeStatusLabel(status)}</Text>
        <Text>Identity: {status.identityHash ?? "none"}</Text>
        <Text>Persisted: {status.identityPersisted ? "yes" : "no"}</Text>
        <NativePlatformLifecycleLines
          serviceRunning={serviceRunning}
          lifecycleState={lifecycleState}
        />
      </View>
    </>
  );
}

function nativeBleStatusLabel(status: NativeHarnessScope["status"]): string {
  if (status.bleConnected) {
    return "connected";
  }
  if (status.bleEnabled) {
    return "waiting";
  }
  return "off";
}

function nativeRnodeStatusLabel(status: NativeHarnessScope["status"]): string {
  if (status.rnodeConnected) {
    return `connected (${status.rnodeDeviceName ?? "usb"})`;
  }
  if (status.rnodeEnabled) {
    return "waiting";
  }
  return "off";
}

function NativePlatformLifecycleLines({
  serviceRunning,
  lifecycleState,
}: {
  serviceRunning: boolean;
  lifecycleState: string;
}) {
  return (
    <>
      {Platform.OS === "android" ? (
        <Text>
          Foreground service: {serviceRunning ? "running" : "stopped"}
        </Text>
      ) : null}
      {Platform.OS === "ios" ? (
        <Text>
          iOS lifecycle: {lifecycleState}
          {lifecycleState === "suspended" ? " (node suspended by iOS)" : ""}
        </Text>
      ) : null}
    </>
  );
}
