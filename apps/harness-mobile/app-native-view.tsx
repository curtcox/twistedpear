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
import { NativeHarnessViewPart1 } from "./app-native-view-part-1.js";
import { NativeHarnessViewPart2 } from "./app-native-view-part-2.js";
import { NativeHarnessViewPart3 } from "./app-native-view-part-3.js";
import { NativeHarnessViewPart4 } from "./app-native-view-part-4.js";
type Scope = ReturnType<typeof useNativeHarnessController>;
export function HarnessView({ scope }: { scope: Scope }) {
  return (
    <View style={styles.container}>
      <NativeHarnessViewPart1 scope={scope} />
      <NativeHarnessViewPart2 scope={scope} />
      <NativeHarnessViewPart4 scope={scope} />
      <NativeHarnessViewPart3 scope={scope} />
    </View>
  );
}
