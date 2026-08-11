import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PermissionsAndroid, Platform } from "react-native";
import { useCameraPermissions } from "expo-camera";
import qrcodeModule from "qrcode-generator";
import { Worklet } from "react-native-bare-kit";
import { requestNativePeerAudioPermission } from "@twistedpear/peer-audio";
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
  probeFreenetRemoteNode,
  reduceFreenetRemoteSession,
  freenetRemoteSessionLogSafe,
  type FreenetRemoteSession,
} from "./src/freenet-remote-session";
import {
  encodeMessage,
  type AnnounceEntry,
  type CapabilityGrantView,
  type CatalogEntryView,
  type HostConfirmationRequestView,
  type HostToWorkletMessage,
  type InstallProgress,
  type InstallReviewRequestView,
  type InstalledPackageView,
  type LaunchReviewRequestView,
  type MiniappBenchmarkResult,
  type MiniappRuntimeView,
  type TrustedPublisherView,
  type WorkletStatus,
  type WorkletToHostMessage,
  type DeviceStateView,
  type SessionInviteView,
} from "./worklet/protocol";
import {
  ANDROID_EMULATOR_HOST,
  DEFAULT_DEV_PORT,
  initialStatus,
  LOCAL_HOST,
  playNativePeerFrames,
  recordNativePeerFrames,
} from "./app-native-shared.js";
import { createNativeWorkletMessageHandler } from "./app-native-controller-messages.js";
import { useNativeWorkletLifecycle } from "./app-native-controller-worklet.js";

export function useNativeHarnessController() {
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
  const [peerModal, setPeerModal] = useState<
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
    | null
  >(null);
  const [hostConfirm, setHostConfirm] =
    useState<HostConfirmationRequestView | null>(null);
  const [hostReview, setHostReview] = useState<
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
    | null
  >(null);
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

  useEffect(() => {
    if (
      peerModal?.kind !== "exchange" ||
      peerModal.request.type !== "peer-qr-present" ||
      peerModal.request.codes.length < 2
    ) {
      return undefined;
    }
    const codes = peerModal.request.codes;
    const timer = setInterval(
      () => setPeerQrFrame((current) => (current + 1) % codes.length),
      750,
    );
    return () => clearInterval(timer);
  }, [peerModal]);

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const sendToWorklet = useCallback((message: HostToWorkletMessage) => {
    const worklet = workletRef.current;
    if (worklet === null) {
      return;
    }
    worklet.IPC.write(new TextEncoder().encode(encodeMessage(message)));
  }, []);

  const handleWorkletMessage = useMemo(
    () =>
      createNativeWorkletMessageHandler({
        appendLog,
        sendToWorklet,
        cameraPermissionGranted: cameraPermission?.granted,
        ntfyUrl,
        ntfyToken,
        multicastIpcRef,
        bonjourIpcRef,
        bleIpcRef,
        usbIpcRef,
        peerRtcRef,
        pendingWorkspaceReadsRef,
        setStatus,
        setAnnounces,
        setCatalog,
        setInstalled,
        setInstallProgress,
        setGrantCapabilities,
        setMiniappRuntime,
        setMiniappBenchmark,
        setMiniappLogs,
        setPeerModal,
        setPeerQrFrame,
        setPeerCameraActive,
        setHostConfirm,
        setHostReview,
        setTrustedPublishers,
        setHostIdentity256t,
        setSessionInvites,
        setRelayNotice,
        setDeviceState,
        setDevChannelDetail,
      }),
    [appendLog, cameraPermission?.granted, ntfyToken, ntfyUrl, sendToWorklet],
  );

  const { pushInterfaceConfig, stopWorklet, startWorklet } =
    useNativeWorkletLifecycle({
      workletRef,
      ipcBufferRef,
      multicastIpcRef,
      bonjourIpcRef,
      bleIpcRef,
      usbIpcRef,
      workletReadyRef,
      interfacesWantedWorkletRef,
      appendLog,
      sendToWorklet,
      handleWorkletMessage,
      tcpEnabled,
      autoEnabled,
      bleEnabled,
      rnodeEnabled,
      selectedUsbDeviceId,
      ntfyUrl,
      status,
      setStatus,
      setServiceRunning,
      setLifecycleState,
      setUsbDevices,
    });

  const seedShareOfferChrome = useCallback(
    (options: {
      readonly appId: string;
      readonly displayLabel: string;
      readonly classId: "camera" | "microphone";
      readonly ttlMs: number;
    }) => {
      const id = `host-seed-${Date.now()}`;
      const expiresAt = Date.now() + options.ttlMs;
      const offer = {
        id,
        appId: options.appId,
        displayLabel: options.displayLabel,
        classId: options.classId,
        tierId: "pcm",
        maxRung: "16k-opus",
        expiresAt,
      };
      setDeviceState((current) => ({
        inventory: current?.inventory ?? [],
        diagnostics: current?.diagnostics ?? [],
        sessions: current?.sessions ?? [],
        indicators: current?.indicators ?? [],
        disabledClasses: current?.disabledClasses ?? [],
        remoteAcquisitionEnabled: current?.remoteAcquisitionEnabled === true,
        shareOffers: [
          ...(current?.shareOffers ?? []).filter((entry) => entry.id !== id),
          offer,
        ],
      }));
      sendToWorklet({
        type: "device-test-seed-share",
        appId: options.appId,
        displayLabel: options.displayLabel,
        classId: options.classId,
        ttlMs: options.ttlMs,
      });
      if (options.ttlMs <= 10_000) {
        setTimeout(
          () => {
            setDeviceState((current) => {
              if (current === null) {
                return current;
              }
              return {
                ...current,
                shareOffers: current.shareOffers.filter(
                  (entry) => entry.id !== id && entry.expiresAt > Date.now(),
                ),
              };
            });
          },
          Math.max(50, options.ttlMs + 50),
        );
      }
    },
    [sendToWorklet],
  );

  const revokeShareOfferChrome = useCallback(
    (appId: string, id: string) => {
      setDeviceState((current) => {
        if (current === null) {
          return current;
        }
        return {
          ...current,
          shareOffers: current.shareOffers.filter((entry) => entry.id !== id),
        };
      });
      sendToWorklet({ type: "device-revoke-share", appId, id });
    },
    [sendToWorklet],
  );

  const applyFreenetGrantToWorklet = useCallback(
    (grant: FreenetRemoteGrant | null) => {
      if (grant === null || !grant.enabled) {
        sendToWorklet({ type: "set-freenet-config", enabled: false });
        return;
      }
      sendToWorklet({
        type: "set-freenet-config",
        enabled: true,
        url: grant.nodeUrl,
        ...(grant.authToken !== undefined && grant.authToken.length > 0
          ? { authToken: grant.authToken }
          : {}),
        ...(grant.rendezvousHex !== undefined && grant.rendezvousHex.length > 0
          ? { rendezvousHex: grant.rendezvousHex }
          : {}),
        localDirection: grant.localDirection === 1 ? 1 : 0,
        capabilities: grant.capabilities,
      });
    },
    [sendToWorklet],
  );

  const activateFreenetGrant = useCallback(
    async (enabled: FreenetRemoteGrant) => {
      applyFreenetGrantToWorklet(enabled);
      let next = reduceFreenetRemoteSession(idleFreenetRemoteSession(), {
        type: "enable",
        grant: enabled,
      });
      setFreenetSession(next);
      const probe = await probeFreenetRemoteNode(enabled);
      next = reduceFreenetRemoteSession(next, {
        type: "probe-result",
        result: probe,
      });
      setFreenetSession(next);
      appendLog(
        `Freenet remote session: ${JSON.stringify(freenetRemoteSessionLogSafe(next))}`,
      );
    },
    [appendLog, applyFreenetGrantToWorklet],
  );

  const readWorkspaceDocument = useCallback(
    (documentId: string) =>
      new Promise<string>((resolve, reject) => {
        const token = `ws-${workspaceReadCounterRef.current++}`;
        const timer = setTimeout(() => {
          pendingWorkspaceReadsRef.current.delete(token);
          reject(new Error("Workspace read timed out"));
        }, 10_000);
        pendingWorkspaceReadsRef.current.set(token, { resolve, reject, timer });
        sendToWorklet({ type: "workspace-read", token, documentId });
      }),
    [sendToWorklet],
  );

  const performPeerAudio = useCallback(
    async (
      request: Extract<
        WorkletToHostMessage,
        { type: "peer-audio-transmit" | "peer-audio-receive" }
      >,
    ) => {
      try {
        const granted =
          Platform.OS === "android"
            ? (await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
              )) === PermissionsAndroid.RESULTS.GRANTED
            : await requestNativePeerAudioPermission();
        if (!granted) {
          throw new Error("Microphone permission was denied");
        }
        appendLog(
          request.type === "peer-audio-transmit"
            ? "Playing audible peer frames…"
            : "Listening for audible peer frames…",
        );
        if (request.type === "peer-audio-transmit") {
          await playNativePeerFrames(request.framesHex);
          const framesHex = request.expectsResponse
            ? await recordNativePeerFrames()
            : [];
          sendToWorklet({
            type: "peer-chrome-response",
            token: request.token,
            accepted: true,
            framesHex,
          });
        } else {
          sendToWorklet({
            type: "peer-chrome-response",
            token: request.token,
            accepted: true,
            sessionId: request.sessionId,
            framesHex: await recordNativePeerFrames(),
          });
        }
        appendLog("Audible peer exchange completed.");
      } catch (error) {
        const detail = error instanceof Error ? error.message : String(error);
        appendLog(`Audible peer exchange failed: ${detail}`);
        sendToWorklet({
          type: "peer-chrome-response",
          token: request.token,
          accepted: false,
          error: detail,
        });
      }
    },
    [appendLog, sendToWorklet],
  );

  let peerQrUri: string | null = null;
  if (
    peerModal?.kind === "exchange" &&
    peerModal.request.type === "peer-qr-present"
  ) {
    const value =
      peerModal.request.codes[peerQrFrame % peerModal.request.codes.length];
    if (value !== undefined) {
      const image = qrcodeModule(0, "M");
      image.addData(value);
      image.make();
      peerQrUri = image.createDataURL(4, 8);
    }
  }

  return {
    status,
    setStatus,
    announces,
    setAnnounces,
    catalog,
    setCatalog,
    installed,
    setInstalled,
    installProgress,
    setInstallProgress,
    serviceRunning,
    setServiceRunning,
    lifecycleState,
    setLifecycleState,
    logLines,
    setLogLines,
    tcpEnabled,
    setTcpEnabled,
    autoEnabled,
    setAutoEnabled,
    bleEnabled,
    setBleEnabled,
    rnodeEnabled,
    setRnodeEnabled,
    relayNotice,
    setRelayNotice,
    usbDevices,
    setUsbDevices,
    selectedUsbDeviceId,
    setSelectedUsbDeviceId,
    selectedCatalogAppId,
    setSelectedCatalogAppId,
    selectedInstalledAppId,
    setSelectedInstalledAppId,
    grantCapabilities,
    setGrantCapabilities,
    miniappRuntime,
    setMiniappRuntime,
    miniappBenchmark,
    setMiniappBenchmark,
    miniappLogs,
    setMiniappLogs,
    developerMode,
    setDeveloperMode,
    devChannelDetail,
    setDevChannelDetail,
    devHost,
    setDevHost,
    devPort,
    setDevPort,
    ntfyUrl,
    setNtfyUrl,
    ntfyToken,
    setNtfyToken,
    freenetGrant,
    setFreenetGrant,
    freenetDisclosureAccepted,
    setFreenetDisclosureAccepted,
    freenetGrantError,
    setFreenetGrantError,
    freenetSession,
    setFreenetSession,
    peerModal,
    setPeerModal,
    hostConfirm,
    setHostConfirm,
    hostReview,
    setHostReview,
    install256tInput,
    setInstall256tInput,
    trustIdentityInput,
    setTrustIdentityInput,
    trustLabelInput,
    setTrustLabelInput,
    trustedPublishers,
    setTrustedPublishers,
    hostIdentity256t,
    setHostIdentity256t,
    deviceState,
    setDeviceState,
    sessionInvites,
    setSessionInvites,
    cameraPermission,
    requestCameraPermission,
    peerCameraActive,
    setPeerCameraActive,
    peerQrFrame,
    setPeerQrFrame,
    workletRef,
    ipcBufferRef,
    multicastIpcRef,
    bonjourIpcRef,
    bleIpcRef,
    usbIpcRef,
    workspaceReadCounterRef,
    peerRtcRef,
    pendingWorkspaceReadsRef,
    appendLog,
    sendToWorklet,
    seedShareOfferChrome,
    revokeShareOfferChrome,
    applyFreenetGrantToWorklet,
    activateFreenetGrant,
    readWorkspaceDocument,
    handleWorkletMessage,
    performPeerAudio,
    pushInterfaceConfig,
    workletReadyRef,
    stopWorklet,
    startWorklet,
    interfacesWantedWorkletRef,
    peerQrUri,
  };
}
