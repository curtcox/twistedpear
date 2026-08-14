import { useRef, useState } from "react";
import { Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";
import { Worklet } from "react-native-bare-kit";
import { type NodeLifecycleState } from "@twistedpear/node-service";
import { HostMulticastIpc } from "./host/multicast-ipc";
import { HostBonjourIpc } from "./host/bonjour-ipc";
import { HostBleIpc } from "./host/ble-ipc";
import { HostUsbIpc } from "./host/usb-ipc";
import { createNativePeerRtcStore } from "./host/native-peer-webrtc";
import { type UsbSerialDeviceInfo } from "@twistedpear/usb-serial";
import {
  defaultFreenetRemoteGrant,
  type FreenetRemoteGrant,
} from "./src/freenet-remote-grant";
import {
  idleFreenetRemoteSession,
  type FreenetRemoteSession,
} from "./src/freenet-remote-session";
import type {
  AnnounceEntry,
  CapabilityGrantView,
  CatalogEntryView,
  HostConfirmationRequestView,
  InstallProgress,
  InstallReviewRequestView,
  InstalledPackageView,
  LaunchReviewRequestView,
  MiniappBenchmarkResult,
  MiniappRuntimeView,
  TrustedPublisherView,
  WorkletStatus,
  WorkletToHostMessage,
  DeviceStateView,
  SessionInviteView,
} from "./worklet/protocol";
import {
  ANDROID_EMULATOR_HOST,
  DEFAULT_DEV_PORT,
  initialStatus,
  LOCAL_HOST,
} from "./app-native-shared.js";

export type NativePeerModal =
  | {
      readonly kind: "exchange";
      readonly request: Extract<
        WorkletToHostMessage,
        {
          type:
            | "peer-manual-present"
            | "peer-manual-enter"
            | "peer-qr-present"
            | "peer-qr-scan"
            | "peer-ntfy-present"
            | "peer-ntfy-enter"
            | "peer-audio-transmit"
            | "peer-audio-receive";
        }
      >;
      readonly input: string;
    }
  | {
      readonly kind: "confirm";
      readonly request: Extract<
        WorkletToHostMessage,
        { type: "peer-confirm-request" }
      >;
    }
  | null;

export type NativeHostReview =
  | {
      readonly kind: "install";
      readonly review: InstallReviewRequestView;
      readonly grants: ReadonlyArray<string>;
    }
  | {
      readonly kind: "launch";
      readonly review: LaunchReviewRequestView;
      readonly grants: ReadonlyArray<string>;
    }
  | null;

export function useNativeHarnessCoreState() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [catalog, setCatalog] = useState<ReadonlyArray<CatalogEntryView>>([]);
  const [installed, setInstalled] = useState<
    ReadonlyArray<InstalledPackageView>
  >([]);
  const [installProgress, setInstallProgress] =
    useState<InstallProgress | null>(null);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [lifecycleState, setLifecycleState] =
    useState<NodeLifecycleState>("unsupported");
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Host ready. Create an identity, then join a nearby or community network.",
  ]);
  const [tcpEnabled, setTcpEnabled] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [bleEnabled, setBleEnabled] = useState(false);
  const [rnodeEnabled, setRnodeEnabled] = useState(false);
  const [relayNotice, setRelayNotice] = useState<{
    appId: string;
    method: string;
    kind?: string;
  } | null>(null);
  const [usbDevices, setUsbDevices] = useState<
    ReadonlyArray<UsbSerialDeviceInfo>
  >([]);
  const [selectedUsbDeviceId, setSelectedUsbDeviceId] = useState<number | null>(
    null,
  );
  const [selectedCatalogAppId, setSelectedCatalogAppId] = useState<
    string | null
  >(null);
  const [selectedInstalledAppId, setSelectedInstalledAppId] = useState<
    string | null
  >(null);
  const [grantCapabilities, setGrantCapabilities] = useState<
    ReadonlyArray<CapabilityGrantView>
  >([]);
  const [miniappRuntime, setMiniappRuntime] =
    useState<MiniappRuntimeView | null>(null);
  const [miniappBenchmark, setMiniappBenchmark] =
    useState<MiniappBenchmarkResult | null>(null);
  const [miniappLogs, setMiniappLogs] = useState<ReadonlyArray<string>>([]);
  const [developerMode, setDeveloperMode] = useState(false);
  const [devChannelDetail, setDevChannelDetail] = useState<string | null>(null);
  const [devHost, setDevHost] = useState(
    Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
  );
  const [devPort, setDevPort] = useState(String(DEFAULT_DEV_PORT));
  const [ntfyUrl, setNtfyUrl] = useState("");
  const [ntfyToken, setNtfyToken] = useState("");
  return {
    status, setStatus, announces, setAnnounces, catalog, setCatalog,
    installed, setInstalled, installProgress, setInstallProgress,
    serviceRunning, setServiceRunning, lifecycleState, setLifecycleState,
    logLines, setLogLines, tcpEnabled, setTcpEnabled, autoEnabled, setAutoEnabled,
    bleEnabled, setBleEnabled, rnodeEnabled, setRnodeEnabled, relayNotice, setRelayNotice,
    usbDevices, setUsbDevices, selectedUsbDeviceId, setSelectedUsbDeviceId,
    selectedCatalogAppId, setSelectedCatalogAppId, selectedInstalledAppId, setSelectedInstalledAppId,
    grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime,
    miniappBenchmark, setMiniappBenchmark, miniappLogs, setMiniappLogs,
    developerMode, setDeveloperMode, devChannelDetail, setDevChannelDetail,
    devHost, setDevHost, devPort, setDevPort, ntfyUrl, setNtfyUrl, ntfyToken, setNtfyToken,
  };
}

export function useNativeHarnessUiState() {
  const [freenetGrant, setFreenetGrant] = useState<FreenetRemoteGrant>(() =>
    defaultFreenetRemoteGrant(),
  );
  const [freenetDisclosureAccepted, setFreenetDisclosureAccepted] =
    useState(false);
  const [freenetGrantError, setFreenetGrantError] = useState<string | null>(
    null,
  );
  const [freenetSession, setFreenetSession] = useState<FreenetRemoteSession>(
    () => idleFreenetRemoteSession(),
  );
  const [peerModal, setPeerModal] = useState<NativePeerModal>(null);
  const [hostConfirm, setHostConfirm] =
    useState<HostConfirmationRequestView | null>(null);
  const [hostReview, setHostReview] = useState<NativeHostReview>(null);
  const [install256tInput, setInstall256tInput] = useState("");
  const [trustIdentityInput, setTrustIdentityInput] = useState("");
  const [trustLabelInput, setTrustLabelInput] = useState("");
  const [trustedPublishers, setTrustedPublishers] = useState<
    ReadonlyArray<TrustedPublisherView>
  >([]);
  const [hostIdentity256t, setHostIdentity256t] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceStateView | null>(null);
  const [sessionInvites, setSessionInvites] = useState<
    ReadonlyArray<SessionInviteView>
  >([]);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [peerCameraActive, setPeerCameraActive] = useState(false);
  const [peerQrFrame, setPeerQrFrame] = useState(0);
  return {
    freenetGrant, setFreenetGrant, freenetDisclosureAccepted, setFreenetDisclosureAccepted,
    freenetGrantError, setFreenetGrantError, freenetSession, setFreenetSession,
    peerModal, setPeerModal, hostConfirm, setHostConfirm, hostReview, setHostReview,
    install256tInput, setInstall256tInput, trustIdentityInput, setTrustIdentityInput,
    trustLabelInput, setTrustLabelInput, trustedPublishers, setTrustedPublishers,
    hostIdentity256t, setHostIdentity256t, deviceState, setDeviceState,
    sessionInvites, setSessionInvites, cameraPermission, requestCameraPermission,
    peerCameraActive, setPeerCameraActive, peerQrFrame, setPeerQrFrame,
  };
}

export function useNativeHarnessRefs() {
  const workletRef = useRef<Worklet | null>(null);
  const ipcBufferRef = useRef("");
  const multicastIpcRef = useRef<HostMulticastIpc | null>(null);
  const bonjourIpcRef = useRef<HostBonjourIpc | null>(null);
  const bleIpcRef = useRef<HostBleIpc | null>(null);
  const usbIpcRef = useRef<HostUsbIpc | null>(null);
  const workletReadyRef = useRef<Promise<boolean> | null>(null);
  const interfacesWantedWorkletRef = useRef(false);
  const workspaceReadCounterRef = useRef(0);
  const peerRtcRef = useRef(createNativePeerRtcStore());
  const pendingWorkspaceReadsRef = useRef(
    new Map<
      string,
      {
        readonly resolve: (content: string) => void;
        readonly reject: (error: Error) => void;
        readonly timer: ReturnType<typeof setTimeout>;
      }
    >(),
  );
  return {
    workletRef, ipcBufferRef, multicastIpcRef, bonjourIpcRef, bleIpcRef, usbIpcRef,
    workletReadyRef, interfacesWantedWorkletRef, workspaceReadCounterRef, peerRtcRef,
    pendingWorkspaceReadsRef,
  };
}
