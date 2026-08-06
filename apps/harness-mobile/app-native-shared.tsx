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
export const peerAudioHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
export const peerAudioUnhex = (text: string) =>
  Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
ensureUtf16LeTextDecoder();
configureBundledOpusLoader(() => {
  const mod = OpusScript as unknown as {
    default?: unknown;
    Application?: unknown;
  };
  return (mod.default ?? OpusScript) as never;
});

export async function runNativeOpusDuplex(): Promise<{
  ok: true;
  implementation: string;
  voiceDuplex: true;
  encoding: "16k-opus";
  pcmBytes: number;
  opusBytes: number;
  decodedBytes: number;
  frameBytes: number;
  frameHex: string;
  played: true;
}> {
  const configuration = {
    codec: "opus" as const,
    sampleKind: "audio" as const,
    bitrateBps: 24_000,
    sampleRate: 16_000,
    channels: 1,
    voiceDuplex: true,
  };
  ensureUtf16LeTextDecoder();
  const driver = new BundledOpusMediaCodecDriver();
  if (!driver.supports(configuration)) {
    throw new Error("Bundled Opus codec does not admit Opus on the RN host");
  }
  const sampleCount = 320;
  const samples = new Float32Array(sampleCount);
  for (let index = 0; index < sampleCount; index += 1) {
    samples[index] = Math.sin((2 * Math.PI * 440 * index) / 16_000) * 0.25;
  }
  const pcmBytes = new Uint8Array(
    samples.buffer.slice(
      samples.byteOffset,
      samples.byteOffset + samples.byteLength,
    ),
  );
  const captureAtUs = Date.now() * 1_000;
  const encoded = await driver.encode(configuration, {
    captureAtUs,
    bytes: pcmBytes,
  });
  if (encoded.bytes.length === 0)
    throw new Error("Opus encode produced empty payload");
  const decoded = await driver.decode(configuration, encoded);
  if (decoded.bytes.length < 4)
    throw new Error("Opus decode produced empty PCM");
  const opusFrame = encodeDeviceStreamFrame({
    version: 2,
    sampleKind: 2,
    sessionToken: 7,
    sequence: 0,
    captureAtUs,
    clockId: 7,
    payload: encoded.bytes,
  });
  const playFrame = encodeDeviceStreamFrame({
    version: 2,
    sampleKind: 2,
    sessionToken: 7,
    sequence: 0,
    captureAtUs,
    clockId: 7,
    payload: decoded.bytes,
  });
  await playInboundNativeMedia(peerAudioHex(playFrame), "16k-pcm");
  await driver.close();
  return {
    ok: true,
    implementation: driver.implementation,
    voiceDuplex: true,
    encoding: "16k-opus",
    pcmBytes: pcmBytes.length,
    opusBytes: encoded.bytes.length,
    decodedBytes: decoded.bytes.length,
    frameBytes: opusFrame.length,
    frameHex: peerAudioHex(opusFrame),
    played: true,
  };
}
export async function playNativeOpusOrPcm(
  dataHex: string,
  encoding: string,
): Promise<void> {
  if (encoding.includes("opus")) {
    const frame = peerAudioUnhex(dataHex);
    if (frame.length < 36) throw new Error("Opus frame too short");
    const payload = frame.slice(36);
    ensureUtf16LeTextDecoder();
    const driver = new BundledOpusMediaCodecDriver();
    const configuration = {
      codec: "opus" as const,
      sampleKind: "audio" as const,
      bitrateBps: 24_000,
      sampleRate: 16_000,
      channels: 1,
    };
    if (!driver.supports(configuration))
      throw new Error("Host Opus decode unavailable");
    const decoded = await driver.decode(configuration, {
      captureAtUs: 0,
      bytes: payload,
      codec: "opus",
    });
    const pcmFrame = encodeDeviceStreamFrame({
      version: 2,
      sampleKind: 2,
      sessionToken: 7,
      sequence: 0,
      captureAtUs: Date.now() * 1_000,
      clockId: 7,
      payload: decoded.bytes,
    });
    await driver.close();
    await playInboundNativeMedia(peerAudioHex(pcmFrame), "16k-pcm");
    return;
  }
  await playInboundNativeMedia(dataHex, encoding);
}

export function floatToPcm16(pcm: Float32Array): Uint8Array {
  const bytes = new Uint8Array(pcm.length * 2);
  const view = new DataView(bytes.buffer);
  for (let index = 0; index < pcm.length; index += 1)
    view.setInt16(
      index * 2,
      Math.round(Math.max(-1, Math.min(1, pcm[index] ?? 0)) * 32767),
      true,
    );
  return bytes;
}
export function pcm16ToFloat(bytes: Uint8Array): Float32Array {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const pcm = new Float32Array(Math.floor(bytes.length / 2));
  for (let index = 0; index < pcm.length; index += 1)
    pcm[index] = view.getInt16(index * 2, true) / 32768;
  return pcm;
}
export async function playNativePeerFrames(
  framesHex: ReadonlyArray<string>,
  sampleRate = 44_100,
): Promise<void> {
  for (const frame of framesHex)
    await playNativePeerPcm(
      floatToPcm16(encodePeerAudioFsk(peerAudioUnhex(frame), { sampleRate })),
      sampleRate,
    );
}
export async function recordNativePeerFrames(
  sampleRate = 44_100,
): Promise<ReadonlyArray<string>> {
  const pcm = pcm16ToFloat(await recordNativePeerPcm(15_000, sampleRate));
  const frames = decodePeerAudioFskStream(pcm, { sampleRate });
  if (frames.length === 0)
    throw new Error("No valid peer audio frames were detected");
  return frames.map(peerAudioHex);
}
export async function playInboundNativeMedia(
  dataHex: string,
  encoding: string,
): Promise<void> {
  const frame = peerAudioUnhex(dataHex);
  if (
    frame.length < 36 ||
    new TextDecoder().decode(frame.subarray(0, 4)) !== "TPD2" ||
    frame[5] !== 2
  ) {
    throw new Error("Inbound audio frame is malformed");
  }
  const payloadLength = new DataView(
    frame.buffer,
    frame.byteOffset,
    frame.byteLength,
  ).getUint32(16, false);
  if (payloadLength !== frame.length - 36) {
    throw new Error("Inbound audio frame length is inconsistent");
  }
  // Real Opus is decoded on the host before play; sinks float32 PCM.
  if (encoding.includes("narrowband")) {
    throw new Error("Native host received an unsupported media encoding");
  }
  const samples = new Float32Array(frame.slice(36).buffer);
  await playNativePeerPcm(
    floatToPcm16(samples),
    encoding.includes("48k")
      ? 48_000
      : encoding.includes("8k")
        ? 8_000
        : 16_000,
  );
}

export const DEFAULT_DOCKER_PORT = 4_242;
/** Android emulator → host loopback (standard AVD alias). */
export const ANDROID_EMULATOR_HOST = "10.0.2.2";
/** Control port for the single-machine multi-peer environment (scripts/peers). */
export const TEST_AGENT_PORT = 34_990;
export const LOCAL_HOST = "127.0.0.1";
export const DEFAULT_DEV_PORT = 34_987;
export const MAX_ANNOUNCES = 50;

export const CONFIRM_KIND_TITLES: Readonly<Record<ConfirmationKind, string>> = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  preview: "Preview an app in the host sandbox?",
  "trust-import": "Trust a new publisher?",
  "device-session": "Allow a device session?",
  "device-stream": "Stream a device to a peer?",
  "device-remote-grant": "Let a remote peer use a device on this host?",
  "device-share-offer": "Share a device with this peer?",
  "device-share-revoke": "Stop sharing this device?",
  "link-probe": "Measure this peer link?",
  "freenet-update": "Publish an irreversible Freenet contract update?",
};

export async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  if (Number(Platform.Version) >= 31) {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE,
    ]);
    return;
  }

  await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
  );
}

export const initialStatus: WorkletStatus = {
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
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  relayMode: "off",
  relayDirections: {
    tcp: "both",
    auto: "both",
    bluetooth: "both",
    rnode: "both",
  },
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  developerMode: false,
  miniappRunning: false,
};

export function Row({
  label,
  value,
  onChange,
  testID,
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

export function ActionButton({
  label,
  onPress,
  testID,
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

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101418",
    paddingTop: 64,
    paddingHorizontal: 20,
  },
  title: {
    color: "#f4f7fb",
    fontSize: 24,
    fontWeight: "700",
  },
  subtitle: {
    color: "#9aa7b8",
    marginBottom: 16,
  },
  card: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    color: "#f4f7fb",
    fontWeight: "600",
    marginBottom: 4,
  },
  muted: {
    color: "#9aa7b8",
    fontSize: 13,
  },
  announceLine: {
    color: "#c5d0dc",
    fontFamily: "Menlo",
    fontSize: 11,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowLabel: {
    color: "#f4f7fb",
  },
  buttonRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 4,
  },
  devChannel: {
    marginTop: 8,
    gap: 8,
  },
  input: {
    backgroundColor: "#0f141b",
    color: "#f4f7fb",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 13,
  },
  button: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  buttonLabel: {
    color: "#f4f7fb",
    fontSize: 13,
  },
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 16,
    gap: 10,
  },
  deviceRow: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#141a22",
    marginBottom: 6,
  },
  deviceRowSelected: {
    borderWidth: 1,
    borderColor: "#4a90d9",
  },
  deviceLabel: {
    color: "#f4f7fb",
    fontSize: 13,
  },
  deviceMeta: {
    color: "#9aa7b8",
    fontSize: 11,
    marginTop: 2,
  },
  deviceActiveBanner: {
    backgroundColor: "#3a2410",
    borderBottomWidth: 1,
    borderBottomColor: "#8a5a20",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 6,
  },
  deviceActiveBannerPinned: {
    zIndex: 50,
  },
  deviceActiveBannerTitle: {
    color: "#f4e2c4",
    fontWeight: "600",
    fontSize: 13,
  },
  deviceActiveBannerText: {
    color: "#f4e2c4",
    fontSize: 12,
    flex: 1,
  },
  deviceActiveBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dangerButton: {
    backgroundColor: "#7a2430",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  catalogRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  detailCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#121820",
    gap: 4,
  },
  detailActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  catalogName: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "600",
  },
  smallButton: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: "Menlo",
    fontSize: 12,
    marginBottom: 6,
  },
  devBadge: {
    color: "#f5a623",
    fontWeight: "700",
    fontSize: 12,
  },
});
