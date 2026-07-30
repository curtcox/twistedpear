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
  View
} from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { StatusBar } from "expo-status-bar";
import qrcodeModule from "qrcode-generator";
import { decodePeerAudioFskStream, encodePeerAudioFsk } from "@twistedpear/protocol";
import { nativePeerAudioSupported, playNativePeerPcm, recordNativePeerPcm, requestNativePeerAudioPermission } from "@twistedpear/peer-audio";
import { Worklet } from "react-native-bare-kit";
import b4a from "b4a";
import bundle from "../worklet/worklet.bundle.mjs";
import { getNodeLifecycleState, isNodeServiceRunning, startNodeService, stopNodeService, addNodeLifecycleListener, type NodeLifecycleState } from "@twistedpear/node-service";
import { HostMulticastIpc } from "./host/multicast-ipc";
import { HostBonjourIpc } from "./host/bonjour-ipc";
import { HostBleIpc } from "./host/ble-ipc";
import { HostUsbIpc } from "./host/usb-ipc";
import {
  hasUsbSerialPermission,
  getUsbSerialCapability,
  listUsbSerialDevices,
  requestUsbSerialPermission,
  type UsbSerialDeviceInfo
} from "@twistedpear/usb-serial";
import {
  acceptFreenetRemoteGrant,
  defaultFreenetRemoteGrant,
  FREENET_REMOTE_DISCLOSURE,
  freenetGrantLogSafe,
  revokeFreenetRemoteGrant,
  type FreenetRemoteGrant
} from "./src/freenet-remote-grant";
import {
  freenetRemoteSessionStatusLabel,
  idleFreenetRemoteSession,
  probeFreenetRemoteNode,
  reduceFreenetRemoteSession,
  freenetRemoteSessionLogSafe,
  type FreenetRemoteSession
} from "./src/freenet-remote-session";

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
  type WorkletToHostMessage,
  type DeviceStateView,
  type ConfirmationKind
} from "./worklet/protocol";
import { MiniappWidgetTree } from "./host/miniapp-renderer";
import type { WidgetTree } from "@twistedpear/miniapp-runtime";

const peerAudioHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const peerAudioUnhex = (text: string) => Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));
function floatToPcm16(pcm: Float32Array): Uint8Array { const bytes = new Uint8Array(pcm.length * 2); const view = new DataView(bytes.buffer); for (let index = 0; index < pcm.length; index += 1) view.setInt16(index * 2, Math.round(Math.max(-1, Math.min(1, pcm[index] ?? 0)) * 32767), true); return bytes; }
function pcm16ToFloat(bytes: Uint8Array): Float32Array { const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); const pcm = new Float32Array(Math.floor(bytes.length / 2)); for (let index = 0; index < pcm.length; index += 1) pcm[index] = view.getInt16(index * 2, true) / 32768; return pcm; }
async function playNativePeerFrames(framesHex: ReadonlyArray<string>, sampleRate = 44_100): Promise<void> { for (const frame of framesHex) await playNativePeerPcm(floatToPcm16(encodePeerAudioFsk(peerAudioUnhex(frame), { sampleRate })), sampleRate); }
async function recordNativePeerFrames(sampleRate = 44_100): Promise<ReadonlyArray<string>> { const pcm = pcm16ToFloat(await recordNativePeerPcm(15_000, sampleRate)); const frames = decodePeerAudioFskStream(pcm, { sampleRate }); if (frames.length === 0) throw new Error("No valid peer audio frames were detected"); return frames.map(peerAudioHex); }

const DEFAULT_DOCKER_PORT = 4_242;
const ANDROID_EMULATOR_HOST = "10.0.2.2";
const LOCAL_HOST = "127.0.0.1";
const DEFAULT_DEV_PORT = 34_987;
const MAX_ANNOUNCES = 50;

const CONFIRM_KIND_TITLES: Readonly<Record<ConfirmationKind, string>> = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  preview: "Preview an app in the host sandbox?",
  "trust-import": "Trust a new publisher?",
  "device-session": "Allow a device session?",
  "device-stream": "Stream a device to a peer?",
  "device-remote-grant": "Let a remote peer use a device on this host?",
  "freenet-update": "Publish an irreversible Freenet contract update?"
};

async function requestBlePermissions(): Promise<void> {
  if (Platform.OS !== "android") {
    return;
  }

  if (Number(Platform.Version) >= 31) {
    await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      PermissionsAndroid.PERMISSIONS.BLUETOOTH_ADVERTISE
    ]);
    return;
  }

  await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION);
}

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
  cryptoProvider: "unknown",
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  developerMode: false,
  miniappRunning: false
};

export default function App() {
  const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [catalog, setCatalog] = useState<ReadonlyArray<CatalogEntryView>>([]);
  const [installed, setInstalled] = useState<ReadonlyArray<InstalledPackageView>>([]);
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [serviceRunning, setServiceRunning] = useState(false);
  const [lifecycleState, setLifecycleState] = useState<NodeLifecycleState>("unsupported");
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Host ready. Create an identity, then join a nearby or community network."
  ]);
  const [tcpEnabled, setTcpEnabled] = useState(false);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [bleEnabled, setBleEnabled] = useState(false);
  const [rnodeEnabled, setRnodeEnabled] = useState(false);
  const [usbDevices, setUsbDevices] = useState<ReadonlyArray<UsbSerialDeviceInfo>>([]);
  const [selectedUsbDeviceId, setSelectedUsbDeviceId] = useState<number | null>(null);
  const [selectedCatalogAppId, setSelectedCatalogAppId] = useState<string | null>(null);
  const [selectedInstalledAppId, setSelectedInstalledAppId] = useState<string | null>(null);
  const [grantCapabilities, setGrantCapabilities] = useState<ReadonlyArray<CapabilityGrantView>>([]);
  const [miniappRuntime, setMiniappRuntime] = useState<MiniappRuntimeView | null>(null);
  const [miniappBenchmark, setMiniappBenchmark] = useState<MiniappBenchmarkResult | null>(null);
  const [miniappLogs, setMiniappLogs] = useState<ReadonlyArray<string>>([]);
  const [developerMode, setDeveloperMode] = useState(false);
  const [devChannelDetail, setDevChannelDetail] = useState<string | null>(null);
  const [devHost, setDevHost] = useState(Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST);
  const [devPort, setDevPort] = useState(String(DEFAULT_DEV_PORT));
  const [ntfyUrl, setNtfyUrl] = useState("");
  const [ntfyToken, setNtfyToken] = useState("");
  const [freenetGrant, setFreenetGrant] = useState<FreenetRemoteGrant>(() => defaultFreenetRemoteGrant());
  const [freenetDisclosureAccepted, setFreenetDisclosureAccepted] = useState(false);
  const [freenetGrantError, setFreenetGrantError] = useState<string | null>(null);
  const [freenetSession, setFreenetSession] = useState<FreenetRemoteSession>(() =>
    idleFreenetRemoteSession()
  );
  const [peerModal, setPeerModal] = useState<
    | { readonly kind: "exchange"; readonly request: Extract<WorkletToHostMessage, { type: "peer-manual-present" | "peer-manual-enter" | "peer-qr-present" | "peer-qr-scan" | "peer-ntfy-present" | "peer-ntfy-enter" | "peer-audio-transmit" | "peer-audio-receive" }>; readonly input: string }
    | { readonly kind: "confirm"; readonly request: Extract<WorkletToHostMessage, { type: "peer-confirm-request" }> }
    | null
  >(null);
  const [hostConfirm, setHostConfirm] = useState<HostConfirmationRequestView | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceStateView | null>(null);
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [peerCameraActive, setPeerCameraActive] = useState(false);
  const [peerQrFrame, setPeerQrFrame] = useState(0);

  useEffect(() => {
    if (peerModal?.kind !== "exchange" || peerModal.request.type !== "peer-qr-present" || peerModal.request.codes.length < 2) return undefined;
    const codes = peerModal.request.codes;
    const timer = setInterval(() => setPeerQrFrame((current) => (current + 1) % codes.length), 750);
    return () => clearInterval(timer);
  }, [peerModal]);

  const workletRef = useRef<Worklet | null>(null);
  const ipcBufferRef = useRef("");
  const multicastIpcRef = useRef<HostMulticastIpc | null>(null);
  const bonjourIpcRef = useRef<HostBonjourIpc | null>(null);
  const bleIpcRef = useRef<HostBleIpc | null>(null);
  const usbIpcRef = useRef<HostUsbIpc | null>(null);
  const workspaceReadCounterRef = useRef(0);
  const pendingWorkspaceReadsRef = useRef(new Map<string, {
    readonly resolve: (content: string) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
  }>());

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const sendToWorklet = useCallback((message: HostToWorkletMessage) => {
    const worklet = workletRef.current;
    if (worklet === null) {
      return;
    }

    worklet.IPC.write(b4a.from(encodeMessage(message)));
  }, []);

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
        capabilities: grant.capabilities
      });
    },
    [sendToWorklet]
  );

  const activateFreenetGrant = useCallback(
    async (enabled: FreenetRemoteGrant) => {
      applyFreenetGrantToWorklet(enabled);
      let next = reduceFreenetRemoteSession(idleFreenetRemoteSession(), {
        type: "enable",
        grant: enabled
      });
      setFreenetSession(next);
      const probe = await probeFreenetRemoteNode(enabled);
      next = reduceFreenetRemoteSession(next, {
        type: "probe-result",
        result: probe
      });
      setFreenetSession(next);
      appendLog(
        `Freenet remote session: ${JSON.stringify(freenetRemoteSessionLogSafe(next))}`
      );
    },
    [appendLog, applyFreenetGrantToWorklet]
  );

  const readWorkspaceDocument = useCallback((documentId: string) => new Promise<string>((resolve, reject) => {
    const token = `ws-${workspaceReadCounterRef.current++}`;
    const timer = setTimeout(() => {
      pendingWorkspaceReadsRef.current.delete(token);
      reject(new Error("Workspace read timed out"));
    }, 10_000);
    pendingWorkspaceReadsRef.current.set(token, { resolve, reject, timer });
    sendToWorklet({ type: "workspace-read", token, documentId });
  }), [sendToWorklet]);

  const handleWorkletMessage = useCallback((message: WorkletToHostMessage) => {
    if (multicastIpcRef.current?.isMulticastMessage(message)) {
      void multicastIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (bonjourIpcRef.current?.isBonjourMessage(message)) {
      void bonjourIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (bleIpcRef.current?.isBleMessage(message)) {
      void bleIpcRef.current.handleWorkletMessage(message);
      return;
    }

    if (usbIpcRef.current?.isSerialMessage(message)) {
      void usbIpcRef.current.handleWorkletMessage(message);
      return;
    }

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
      sendToWorklet({ type: "list-catalog" });
      return;
    }

    if (message.type === "catalog") {
      setCatalog(message.entries);
      return;
    }

    if (message.type === "installed") {
      setInstalled(message.packages);
      return;
    }

    if (message.type === "install-progress") {
      setInstallProgress(message.progress);
      if (message.progress.phase === "complete") {
        sendToWorklet({ type: "list-installed" });
      }
      return;
    }

    if (message.type === "grants") {
      setGrantCapabilities(message.capabilities);
      return;
    }

    if (message.type === "miniapp-runtime") {
      setMiniappRuntime(message.runtime);
      return;
    }

    if (message.type === "miniapp-benchmark") {
      setMiniappBenchmark(message.result);
      return;
    }

    if (message.type === "miniapp-log") {
      setMiniappLogs((current) => [...current.slice(-100), `${message.appId}: ${message.line}`]);
      appendLog(`[miniapp] ${message.line}`);
      return;
    }

    if (message.type === "peer-manual-present" || message.type === "peer-manual-enter") {
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-qr-availability") {
      sendToWorklet({ type: "peer-chrome-response", token: message.token, availability: cameraPermission?.granted === true ? { state: "available", reason: "Native QR camera permission is granted" } : { state: "permission-required", reason: "Camera starts only after Start camera" } });
      return;
    }

    if (message.type === "peer-qr-present" || message.type === "peer-qr-scan") {
      setPeerQrFrame(0); setPeerCameraActive(false); setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-audio-availability") {
      sendToWorklet({ type: "peer-chrome-response", token: message.token, availability: nativePeerAudioSupported() ? { state: "permission-required", reason: "Microphone permission is requested only after starting the audible exchange" } : { state: "unsupported", reason: "Native PCM playback/capture module is unavailable" } });
      return;
    }

    if (message.type === "peer-audio-transmit" || message.type === "peer-audio-receive") {
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-ntfy-present" || message.type === "peer-ntfy-enter") {
      setPeerModal({ kind: "exchange", request: message, input: "" });
      return;
    }

    if (message.type === "peer-ntfy-http") {
      void (async () => {
        try {
          const configured = new URL(ntfyUrl.trim().endsWith("/") ? ntfyUrl.trim() : `${ntfyUrl.trim()}/`);
          const requested = new URL(message.request.url);
          const localHttp = configured.protocol === "http:" && ["localhost", "127.0.0.1", "::1"].includes(configured.hostname);
          const basePath = configured.pathname.endsWith("/") ? configured.pathname : `${configured.pathname}/`;
          if ((configured.protocol !== "https:" && !localHttp) || requested.origin !== configured.origin || !requested.pathname.startsWith(basePath) || requested.username !== "" || requested.password !== "" || requested.hash !== "" || !["GET", "POST"].includes(message.request.method) || (message.request.body?.length ?? 0) > 40_000) throw new Error("ntfy request is outside the configured host policy");
          const headers = new Headers(message.request.headers); headers.delete("authorization"); if (ntfyToken.trim() !== "") headers.set("Authorization", `Bearer ${ntfyToken.trim()}`);
          const response = await fetch(requested.toString(), { method: message.request.method, headers, ...(message.request.body === undefined ? {} : { body: message.request.body }), redirect: "error" });
          const declared = Number(response.headers.get("content-length") ?? "0"); if (Number.isFinite(declared) && declared > 256_000) throw new Error("ntfy response exceeds host budget");
          const body = await response.text(); if (body.length > 256_000) throw new Error("ntfy response exceeds host budget");
          sendToWorklet({ type: "peer-chrome-response", token: message.token, http: { status: response.status, body, contentLength: response.headers.get("content-length") } });
        } catch (error) { sendToWorklet({ type: "peer-chrome-response", token: message.token, error: error instanceof Error ? error.message : String(error) }); }
      })();
      return;
    }

    if (message.type === "peer-confirm-request") {
      setPeerModal({ kind: "confirm", request: message });
      return;
    }

    if (message.type === "confirm-request") {
      setHostConfirm({
        token: message.token,
        kind: message.kind,
        appId: message.appId,
        publisherPublicKey: message.publisherPublicKey,
        summary: message.summary
      });
      return;
    }

    if (message.type === "device-state") {
      setDeviceState({
        inventory: message.inventory,
        diagnostics: message.diagnostics,
        sessions: message.sessions,
        indicators: message.indicators,
        disabledClasses: message.disabledClasses,
        remoteAcquisitionEnabled: message.remoteAcquisitionEnabled
      });
      return;
    }

    if (message.type === "device-bridge-request") {
      void (async () => {
        try {
          const {
            nativeDeviceAvailability,
            nativeDeviceSense,
            nativeDeviceActuate
          } = await import("./host/native-device-bridge.js");
          const result =
            message.op === "availability"
              ? await nativeDeviceAvailability(message.classId)
              : message.op === "actuate"
                ? await nativeDeviceActuate(message.classId, message.command ?? {})
                : await nativeDeviceSense(message.classId, message.options ?? {});
          sendToWorklet({ type: "device-bridge-response", token: message.token, result });
        } catch (error) {
          sendToWorklet({
            type: "device-bridge-response",
            token: message.token,
            error: error instanceof Error ? error.message : String(error)
          });
        }
      })();
      return;
    }

    if (message.type === "peer-chrome-cancel") {
      setPeerCameraActive(false); setPeerModal(null);
      return;
    }

    if (message.type === "workspace-file") {
      const pending = pendingWorkspaceReadsRef.current.get(message.token);
      pendingWorkspaceReadsRef.current.delete(message.token);
      if (pending !== undefined) {
        clearTimeout(pending.timer);
        if (message.error !== undefined) pending.reject(new Error(message.error));
        else pending.resolve(message.content ?? "");
      }
      return;
    }

    if (message.type === "dev-channel") {
      setDevChannelDetail(message.detail ?? message.state);
      appendLog(`[dev] ${message.state}${message.detail ? `: ${message.detail}` : ""}`);
    }
  }, [appendLog, cameraPermission?.granted, ntfyToken, ntfyUrl, sendToWorklet]);

  const performPeerAudio = useCallback(async (request: Extract<WorkletToHostMessage, { type: "peer-audio-transmit" | "peer-audio-receive" }>) => {
    try {
      const granted = Platform.OS === "android"
        ? await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO) === PermissionsAndroid.RESULTS.GRANTED
        : await requestNativePeerAudioPermission();
      if (!granted) throw new Error("Microphone permission was denied");
      appendLog(request.type === "peer-audio-transmit" ? "Playing audible peer frames…" : "Listening for audible peer frames…");
      if (request.type === "peer-audio-transmit") { await playNativePeerFrames(request.framesHex); const framesHex = request.expectsResponse ? await recordNativePeerFrames() : []; sendToWorklet({ type: "peer-chrome-response", token: request.token, accepted: true, framesHex }); }
      else sendToWorklet({ type: "peer-chrome-response", token: request.token, accepted: true, sessionId: request.sessionId, framesHex: await recordNativePeerFrames() });
      appendLog("Audible peer exchange completed.");
    } catch (error) { const detail = error instanceof Error ? error.message : String(error); appendLog(`Audible peer exchange failed: ${detail}`); sendToWorklet({ type: "peer-chrome-response", token: request.token, accepted: false, error: detail }); }
  }, [appendLog, sendToWorklet]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      if (nextState === "background" || nextState === "inactive") {
        if (status.miniappRunning) {
          sendToWorklet({ type: "suspend-miniapp" });
        }

        if (Platform.OS === "ios" && status.running) {
          sendToWorklet({ type: "suspend-node" });
        }
        return;
      }

      if (nextState === "active") {
        if (status.miniappRunning) {
          sendToWorklet({ type: "resume-miniapp" });
        }

        if (Platform.OS === "ios" && status.running) {
          sendToWorklet({ type: "resume-node" });
        }
      }
    });

    return () => subscription.remove();
  }, [sendToWorklet, status.miniappRunning, status.running]);

  const pushInterfaceConfig = useCallback((next: {
    tcp: boolean;
    auto: boolean;
    ble: boolean;
    rnode: boolean;
    rnodeDeviceId?: number | null;
  }) => {
    sendToWorklet({ type: "set-interfaces", ...next, rnode: Platform.OS === "ios" ? false : next.rnode });
  }, [sendToWorklet]);

  const stopWorklet = useCallback(() => {
    sendToWorklet({ type: "stop" });
    void multicastIpcRef.current?.stop();
    void bleIpcRef.current?.stop();
    void usbIpcRef.current?.stop();
    workletRef.current?.terminate();
    workletRef.current = null;
    setStatus((current) => ({
      ...current,
      running: false,
      linkOnline: false
    }));
  }, [sendToWorklet]);

  const startWorklet = useCallback(() => {
    if (workletRef.current !== null) {
      return;
    }

    const worklet = new Worklet();
    worklet.start("/app.bundle", bundle);
    multicastIpcRef.current = new HostMulticastIpc(sendToWorklet);
    bonjourIpcRef.current = Platform.OS === "ios" ? new HostBonjourIpc(sendToWorklet) : null;
    bleIpcRef.current = new HostBleIpc(sendToWorklet);
    usbIpcRef.current = getUsbSerialCapability().supported ? new HostUsbIpc(sendToWorklet) : null;

    ipcBufferRef.current = "";
    worklet.IPC.on("data", (data) => {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayLike<number>);
      const decoded = decodeMessages(`${ipcBufferRef.current}${b4a.toString(bytes)}`);
      ipcBufferRef.current = decoded.remainder;
      for (const message of decoded.messages) {
        handleWorkletMessage(message);
      }
    });

    workletRef.current = worklet;
    const targetHost = Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST;
    sendToWorklet({
      type: "start",
      targetHost,
      targetPort: DEFAULT_DOCKER_PORT,
      multicastEntitled: Platform.OS !== "ios",
      bonjourEnabled: true
      , ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() })
    });
    pushInterfaceConfig({
      tcp: tcpEnabled,
      auto: autoEnabled,
      ble: bleEnabled,
      rnode: rnodeEnabled,
      rnodeDeviceId: selectedUsbDeviceId
    });
    sendToWorklet({ type: "device-list" });
    appendLog(`Worklet started (target ${targetHost}:${DEFAULT_DOCKER_PORT})`);
  }, [appendLog, autoEnabled, bleEnabled, rnodeEnabled, selectedUsbDeviceId, handleWorkletMessage, ntfyUrl, pushInterfaceConfig, sendToWorklet, tcpEnabled]);

  useEffect(() => {
    const shouldRun = tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled;
    if (shouldRun) {
      if (bleEnabled) {
        void requestBlePermissions().then(() => startWorklet());
      } else {
        startWorklet();
      }
      return;
    }

    stopWorklet();
  }, [tcpEnabled, autoEnabled, bleEnabled, rnodeEnabled, startWorklet, stopWorklet]);

  useEffect(() => {
    if (workletRef.current === null) {
      return;
    }

    pushInterfaceConfig({
      tcp: tcpEnabled,
      auto: autoEnabled,
      ble: bleEnabled,
      rnode: rnodeEnabled,
      rnodeDeviceId: selectedUsbDeviceId
    });
  }, [tcpEnabled, autoEnabled, bleEnabled, rnodeEnabled, selectedUsbDeviceId, pushInterfaceConfig]);

  useEffect(() => {
    if (!getUsbSerialCapability().supported) {
      return;
    }

    const refreshDevices = () => {
      setUsbDevices(listUsbSerialDevices());
    };

    refreshDevices();
    const timer = setInterval(refreshDevices, 2_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (Platform.OS !== "android" && Platform.OS !== "ios") {
      return;
    }

    const nodeActive = status.running && (tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled);
    if (!nodeActive) {
      void stopNodeService().then(() => {
        setServiceRunning(isNodeServiceRunning());
        setLifecycleState(getNodeLifecycleState());
      });
      return;
    }

    void (async () => {
      if (Platform.OS === "android" && Number(Platform.Version) >= 33) {
        await PermissionsAndroid.request(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);
      }

      await startNodeService();
      setServiceRunning(isNodeServiceRunning());
      setLifecycleState(getNodeLifecycleState());
    })();
  }, [status.running, tcpEnabled, autoEnabled, bleEnabled, rnodeEnabled]);

  useEffect(() => {
    if (Platform.OS !== "ios") {
      return;
    }

    const subscription = addNodeLifecycleListener((event) => {
      setLifecycleState(event.state);
      if ((event.state === "background-grace" || event.state === "suspended") && status.running) {
        sendToWorklet({ type: "suspend-node" });
      } else if ((event.state === "foreground" || event.state === "background-wake") && status.running) {
        sendToWorklet({ type: "resume-node" });
      }
    });

    return () => subscription?.remove();
  }, [sendToWorklet, status.running]);

  useEffect(() => () => {
    stopWorklet();
    if (Platform.OS === "android" || Platform.OS === "ios") {
      void stopNodeService();
    }
  }, [stopWorklet]);

  let peerQrUri: string | null = null;
  if (peerModal?.kind === "exchange" && peerModal.request.type === "peer-qr-present") {
    const value = peerModal.request.codes[peerQrFrame % peerModal.request.codes.length];
    if (value !== undefined) { const image = qrcodeModule(0, "M"); image.addData(value); image.make(); peerQrUri = image.createDataURL(4, 8); }
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {hostConfirm !== null ? (
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>
              {CONFIRM_KIND_TITLES[hostConfirm.kind] ?? `Confirm ${hostConfirm.kind}?`}
            </Text>
            <Text style={styles.muted}>Trusted host chrome · capability confirmation</Text>
            <Text style={styles.rowLabel}>Kind: {hostConfirm.kind}</Text>
            <Text style={styles.rowLabel}>App: {hostConfirm.appId}</Text>
            <Text style={styles.rowLabel}>Publisher: {hostConfirm.publisherPublicKey}</Text>
            {Object.entries(hostConfirm.summary).map(([key, value]) => (
              <Text key={key} style={styles.rowLabel}>{key}: {value}</Text>
            ))}
            <View style={styles.row}>
              <ActionButton
                label="Deny"
                onPress={() => {
                  sendToWorklet({ type: "confirm-response", token: hostConfirm.token, approved: false });
                  setHostConfirm(null);
                }}
              />
              <ActionButton
                label="Approve"
                onPress={() => {
                  sendToWorklet({ type: "confirm-response", token: hostConfirm.token, approved: true });
                  setHostConfirm(null);
                }}
              />
            </View>
          </View>
        </View>
      ) : null}
      {peerModal !== null ? (
        <View testID="peer-host-modal" style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.sectionTitle}>{peerModal.kind === "confirm" ? "Confirm peer connection" : peerModal.request.type === "peer-audio-transmit" ? "Play an audible peer invitation" : peerModal.request.type === "peer-audio-receive" ? "Listen for an audible peer invitation" : peerModal.request.type === "peer-ntfy-present" ? "Share private ntfy lookup code" : peerModal.request.type === "peer-ntfy-enter" ? "Enter private ntfy lookup code" : peerModal.request.type === "peer-qr-present" ? "Show peer QR" : peerModal.request.type === "peer-qr-scan" ? "Scan peer QR" : peerModal.request.type === "peer-manual-present" ? "Share peer invitation" : "Enter peer invitation"}</Text>
            <Text style={styles.muted}>{peerModal.kind === "exchange" && (peerModal.request.type === "peer-audio-transmit" || peerModal.request.type === "peer-audio-receive") ? "Trusted host chrome · audible FSK tones and microphone PCM stay inside the native host." : peerModal.kind === "exchange" && (peerModal.request.type === "peer-ntfy-present" || peerModal.request.type === "peer-ntfy-enter") ? `Trusted host chrome · ${peerModal.request.server} observes a random topic, timing, and IP metadata; invitation contents are end-to-end encrypted.` : "Trusted host chrome · full serverless code"}</Text>
            {peerModal.kind === "confirm" ? (
              <>
                <Text style={styles.rowLabel}>Purpose: {peerModal.request.purpose}</Text>
                <Text style={styles.rowLabel}>Peer label (untrusted claim): {peerModal.request.peer.displayLabel}</Text>
                <Text style={styles.rowLabel}>Fingerprint: {peerModal.request.peer.fingerprint}</Text>
                <Text style={styles.rowLabel}>Matching words: {peerModal.request.peer.matchingWords.join(" · ")}</Text>
                <Text style={styles.rowLabel}>Data path: {peerModal.request.peer.dataPlane}</Text>
              </>
            ) : (
              <>
                {peerModal.request.type === "peer-manual-present" ? <TextInput multiline editable={false} value={peerModal.request.code} style={styles.input} /> : null}
                {peerModal.request.type === "peer-ntfy-present" ? <TextInput multiline editable={false} value={peerModal.request.code} style={styles.input} /> : null}
                {peerQrUri !== null ? <Image accessibilityLabel="Peer invitation QR" source={{ uri: peerQrUri }} style={{ width: 260, height: 260 }} /> : null}
                {peerCameraActive ? <CameraView style={{ width: 280, height: 280 }} facing="back" barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => { setPeerCameraActive(false); setPeerModal((current) => current?.kind === "exchange" ? { ...current, input: data } : current); }} /> : null}
                {peerModal.request.type === "peer-manual-enter" || peerModal.request.type === "peer-qr-scan" || peerModal.request.type === "peer-ntfy-enter" || peerModal.request.type === "peer-manual-present" && peerModal.request.expectsResponse || peerModal.request.type === "peer-qr-present" && peerModal.request.expectsResponse ? <TextInput multiline value={peerModal.input} onChangeText={(input) => setPeerModal({ ...peerModal, input })} placeholder={peerModal.request.type === "peer-ntfy-enter" ? "Paste the TPN1 lookup code" : peerModal.request.type === "peer-qr-scan" ? "Scan or paste the peer QR payload" : "Paste the peer's full code"} placeholderTextColor="#718096" style={styles.input} /> : null}
                {(peerModal.request.type === "peer-qr-scan" || (peerModal.request.type === "peer-qr-present" && peerModal.request.expectsResponse)) && !peerCameraActive ? <ActionButton label="Start camera" onPress={() => { void requestCameraPermission().then((permission) => { if (permission.granted) setPeerCameraActive(true); else appendLog("Camera permission denied; paste the QR payload instead."); }); }} /> : null}
              </>
            )}
            <View style={styles.buttonRow}>
              <ActionButton label="Cancel" onPress={() => { sendToWorklet({ type: "peer-chrome-response", token: peerModal.request.token, accepted: false, approved: false }); setPeerCameraActive(false); setPeerModal(null); }} />
              <ActionButton label={peerModal.kind === "confirm" ? "Connect" : peerModal.request.type === "peer-audio-transmit" ? peerModal.request.expectsResponse ? "Play and listen" : "Play answer" : peerModal.request.type === "peer-audio-receive" ? "Start listening" : "Continue"} onPress={() => { if (peerModal.kind === "confirm") sendToWorklet({ type: "peer-chrome-response", token: peerModal.request.token, approved: true }); else if (peerModal.request.type === "peer-audio-transmit" || peerModal.request.type === "peer-audio-receive") void performPeerAudio(peerModal.request); else sendToWorklet({ type: "peer-chrome-response", token: peerModal.request.token, accepted: true, ...(peerModal.input.trim() ? { code: peerModal.input.trim() } : {}) }); setPeerCameraActive(false); setPeerModal(null); }} />
            </View>
          </View>
        </View>
      ) : null}
      {deviceState !== null && deviceState.indicators.length > 0 ? (
        <View
          testID="device-active-banner"
          style={[styles.deviceActiveBanner, status.miniappRunning ? styles.deviceActiveBannerPinned : null]}
        >
          <Text style={styles.deviceActiveBannerTitle}>Active device use</Text>
          {deviceState.indicators.map((indicator) => (
            <View key={indicator.handle} style={styles.deviceActiveBannerRow}>
              <Text style={styles.deviceActiveBannerText}>
                {indicator.appId} · {indicator.class}:{indicator.tier} · {indicator.destination} — {indicator.purpose}
              </Text>
              <Pressable
                style={styles.dangerButton}
                onPress={() => sendToWorklet({ type: "device-kill-session", handle: indicator.handle })}
              >
                <Text style={styles.buttonLabel}>Stop</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : null}
      <Text style={styles.title}>TwistedPear Harness</Text>
      <Text style={styles.subtitle}>Reticulum node + mini-app runtime (Phase 5 iOS host)</Text>

      <View style={styles.card}>
        <Text>Worklet: {status.running ? "running" : "stopped"}</Text>
        <Text>Link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Crypto: {status.cryptoProvider}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
        <Text>Auto peers: {status.autoPeers}</Text>
        <Text>Preferred interface: {status.preferredInterface ?? "—"}</Text>
        <Text>Online interfaces: {status.onlineInterfaces}</Text>
        <Text>BLE: {status.bleConnected ? "connected" : status.bleEnabled ? "waiting" : "off"}</Text>
        <Text>
          RNode: {status.rnodeConnected
            ? `connected (${status.rnodeDeviceName ?? "usb"})`
            : status.rnodeEnabled
              ? "waiting"
              : "off"}
        </Text>
        <Text>Identity: {status.identityHash ?? "none"}</Text>
        <Text>Persisted: {status.identityPersisted ? "yes" : "no"}</Text>
        {Platform.OS === "android" ? (
          <Text>Foreground service: {serviceRunning ? "running" : "stopped"}</Text>
        ) : null}
        {Platform.OS === "ios" ? (
          <Text>
            iOS lifecycle: {lifecycleState}
            {lifecycleState === "suspended" ? " (node suspended by iOS)" : ""}
          </Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="create-identity"
            label="Create identity"
            onPress={() => {
              if (workletRef.current === null) {
                startWorklet();
                setTimeout(() => sendToWorklet({ type: "create-identity" }), 250);
                return;
              }

              sendToWorklet({ type: "create-identity" });
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
            testID="join-community-network"
            label="Join community network"
            onPress={() => {
              setTcpEnabled(true);
              if (workletRef.current === null) {
                startWorklet();
                setTimeout(() => sendToWorklet({ type: "join-community-network" }), 250);
                return;
              }
              sendToWorklet({ type: "join-community-network" });
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
            ? `Enabled for ${freenetGrant.operatorLabel} · reads=${freenetGrant.capabilities.contractReads ? "on" : "off"}`
            : "Disabled"}
        </Text>
        <Text testID="freenet-session-status" style={styles.muted}>
          Session: {freenetRemoteSessionStatusLabel(freenetSession)}
          {freenetSession.lastError !== null ? ` · ${freenetSession.lastError}` : ""}
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

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Devices &amp; Sensors</Text>
        <Row
          testID="device-remote-enabled"
          label="Allow remote device acquisition"
          value={deviceState?.remoteAcquisitionEnabled === true}
          onChange={(enabled) => sendToWorklet({ type: "device-set-remote", enabled })}
        />
        {deviceState === null || deviceState.inventory.length === 0 ? (
          <Text style={styles.muted}>No device classes reported yet.</Text>
        ) : (
          deviceState.inventory.map((entry) => {
            const disabled = new Set(deviceState.disabledClasses);
            return (
              <View key={entry.class} style={styles.deviceRow}>
                <Text style={styles.deviceLabel}>{entry.class}</Text>
                <Text style={styles.deviceMeta}>{entry.availability}</Text>
                <Row
                  label="Allowed"
                  value={!disabled.has(entry.class)}
                  onChange={(allowed) =>
                    sendToWorklet({
                      type: "device-set-class-disabled",
                      classId: entry.class,
                      disabled: !allowed
                    })
                  }
                />
              </View>
            );
          })
        )}
        <Text style={styles.sectionTitle}>Live sessions</Text>
        {deviceState === null || deviceState.sessions.length === 0 ? (
          <Text style={styles.muted}>No live device sessions.</Text>
        ) : (
          deviceState.sessions.map((session) => (
            <View key={session.handle} style={styles.deviceRow}>
              <Text style={styles.deviceLabel}>
                {session.classId}:{session.tierId}
              </Text>
              <Text style={styles.deviceMeta}>
                {session.appId} · {session.destination}
              </Text>
              <Pressable
                style={styles.dangerButton}
                onPress={() => sendToWorklet({ type: "device-kill-session", handle: session.handle })}
              >
                <Text style={styles.buttonLabel}>Kill</Text>
              </Pressable>
            </View>
          ))
        )}
        <ActionButton label="Refresh devices" onPress={() => sendToWorklet({ type: "device-list" })} />
      </View>

      {getUsbSerialCapability().supported ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>USB serial devices</Text>
          {usbDevices.length === 0 ? (
            <Text style={styles.muted}>No CDC ACM USB devices attached.</Text>
          ) : (
            usbDevices.map((device) => (
              <Pressable
                key={device.deviceId}
                style={[
                  styles.deviceRow,
                  selectedUsbDeviceId === device.deviceId ? styles.deviceRowSelected : null
                ]}
                onPress={() => {
                  void (async () => {
                    if (!device.hasPermission && !hasUsbSerialPermission(device.deviceId)) {
                      const granted = await requestUsbSerialPermission(device.deviceId);
                      if (!granted) {
                        appendLog(`USB permission denied for device ${device.deviceId}`);
                        return;
                      }
                    }

                    setSelectedUsbDeviceId(device.deviceId);
                    appendLog(`Selected USB device ${device.deviceId} (${device.vendorId.toString(16)}:${device.productId.toString(16)})`);
                  })();
                }}
              >
                <Text style={styles.deviceLabel}>
                  {device.deviceName ?? `usb-${device.deviceId}`} · {device.isCdcAcm ? "CDC ACM" : "unknown"}
                </Text>
                <Text style={styles.deviceMeta}>
                  {device.hasPermission ? "permission granted" : "tap to request permission"}
                </Text>
              </Pressable>
            ))
          )}
        </View>
      ) : Platform.OS === "ios" ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>USB serial devices</Text>
          <Text style={styles.muted}>USB serial is unsupported on iOS. RNode paths use BLE.</Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>App catalog</Text>
        <Text style={styles.muted}>
          {status.catalogEntries} discovered · {status.installedPackages} installed ·{" "}
          {Math.round(status.storageUsedBytes / 1024)} KiB used
        </Text>
        {catalog.length === 0 ? (
          <Text style={styles.muted}>No apps in catalog yet.</Text>
        ) : (
          catalog.slice(0, 6).map((entry) => (
            <View key={entry.appId} style={styles.catalogRow}>
              <Pressable style={{ flex: 1 }} onPress={() => setSelectedCatalogAppId(entry.appId)}>
                <Text style={styles.catalogName}>{entry.name}</Text>
                <Text style={styles.muted}>
                  v{entry.version} · {Math.round(entry.packageSize / 1024)} KiB ·{" "}
                  {entry.publisherPublicKey.slice(0, 12)}…
                </Text>
                <Text style={styles.muted}>
                  drive {entry.driveKey.slice(0, 12)}… ·{" "}
                  {entry.resourceAvailable ? "Resource + DHT" : "DHT only"}
                </Text>
              </Pressable>
              <Pressable
                testID={`install-${entry.appId}`}
                style={styles.smallButton}
                onPress={() => sendToWorklet({ type: "install-app", appId: entry.appId })}
              >
                <Text style={styles.buttonLabel}>Install</Text>
              </Pressable>
            </View>
          ))
        )}
        {selectedCatalogAppId !== null ? (
          (() => {
            const detail = catalog.find((entry) => entry.appId === selectedCatalogAppId);
            if (detail === undefined) {
              return null;
            }

            return (
              <View style={styles.detailCard}>
                <Text style={styles.catalogName}>{detail.name}</Text>
                <Text style={styles.muted}>appId {detail.appId}</Text>
                <Text style={styles.muted}>version {detail.version}</Text>
                <Text style={styles.muted}>hash {detail.packageHash.slice(0, 24)}…</Text>
                <Text style={styles.muted}>drive {detail.driveKey}</Text>
                <Text style={styles.muted}>
                  publisher {detail.publisherPublicKey.slice(0, 32)}…
                </Text>
                <View style={styles.detailActions}>
                  <Pressable
                    testID={`install-dht-${detail.appId}`}
                    style={styles.smallButton}
                    onPress={() =>
                      sendToWorklet({
                        type: "install-app",
                        appId: detail.appId,
                        forcePath: "hyperdrive"
                      })
                    }
                  >
                    <Text style={styles.buttonLabel}>DHT</Text>
                  </Pressable>
                  {detail.resourceAvailable ? (
                    <Pressable
                      testID={`install-resource-${detail.appId}`}
                      style={styles.smallButton}
                      onPress={() =>
                        sendToWorklet({
                          type: "install-app",
                          appId: detail.appId,
                          forcePath: "resource"
                        })
                      }
                    >
                      <Text style={styles.buttonLabel}>Resource</Text>
                    </Pressable>
                  ) : null}
                </View>
              </View>
            );
          })()
        ) : null}
        {installProgress !== null ? (
          <Text testID="install-progress" style={styles.muted}>
            Install {installProgress.appId}: {installProgress.phase}
            {installProgress.verified ? " ✓ verified" : ""}
            {installProgress.path !== null ? ` via ${installProgress.path}` : ""}
          </Text>
        ) : null}
        {installed.length > 0 ? (
          installed.map((pkg) => (
            <View key={pkg.appId} style={styles.catalogRow}>
              <Pressable
                testID={`installed-${pkg.appId}`}
                style={{ flex: 1 }}
                onPress={() => {
                setSelectedInstalledAppId(pkg.appId);
                sendToWorklet({
                  type: "get-grants",
                  appId: pkg.appId,
                  publisherPublicKey: pkg.publisherPublicKey ?? "",
                  declaredCapabilities: pkg.capabilities ?? []
                });
              }}>
                <Text style={styles.catalogName}>
                  {pkg.appId} {pkg.activeVersion === pkg.version ? "✓" : ""}
                </Text>
                <Text style={styles.muted}>
                  active v{pkg.activeVersion} · {pkg.packageHash.slice(0, 12)}…
                </Text>
              </Pressable>
              <Pressable
                testID={`launch-${pkg.appId}`}
                style={styles.smallButton}
                onPress={() => sendToWorklet({ type: "launch-miniapp", appId: pkg.appId })}
              >
                <Text style={styles.buttonLabel}>Launch</Text>
              </Pressable>
              {pkg.rollbackAvailable ? (
                <Pressable
                  testID={`rollback-${pkg.appId}`}
                  style={styles.smallButton}
                  onPress={() => sendToWorklet({ type: "rollback-package", appId: pkg.appId })}
                >
                  <Text style={styles.buttonLabel}>Rollback</Text>
                </Pressable>
              ) : null}
              <Pressable
                style={styles.smallButton}
                onPress={() =>
                  sendToWorklet({
                    type: "delete-package",
                    appId: pkg.appId,
                    version: pkg.activeVersion
                  })
                }
              >
                <Text style={styles.buttonLabel}>Delete</Text>
              </Pressable>
            </View>
          ))
        ) : null}
        {selectedInstalledAppId !== null && grantCapabilities.length > 0 ? (
          <View style={styles.detailCard}>
            <Text style={styles.catalogName}>Grants for {selectedInstalledAppId}</Text>
            {grantCapabilities.filter((cap) => cap.declared).map((cap) => (
              <View key={cap.id} style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowLabel}>{cap.id}</Text>
                  <Text style={styles.muted}>{cap.description}</Text>
                </View>
                <Switch
                  testID={`grant-${cap.id.replace(/:/g, "-")}`}
                  value={cap.granted}
                  onValueChange={(granted) => {
                    const pkg = installed.find((entry) => entry.appId === selectedInstalledAppId);
                    if (pkg === undefined) {
                      return;
                    }

                    const next = grantCapabilities
                      .filter((entry) => entry.declared && (entry.id === cap.id ? granted : entry.granted))
                      .map((entry) => entry.id);
                    sendToWorklet({
                      type: "set-grants",
                      appId: pkg.appId,
                      publisherPublicKey: pkg.publisherPublicKey ?? "",
                      declaredCapabilities: pkg.capabilities ?? [],
                      grantedCapabilities: next
                    });
                  }}
                />
              </View>
            ))}
          </View>
        ) : null}
        <ActionButton label="Refresh catalog" onPress={() => sendToWorklet({ type: "list-catalog" })} />
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
    paddingTop: 64,
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
  announceLine: {
    color: "#c5d0dc",
    fontFamily: "Menlo",
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
  devChannel: {
    marginTop: 8,
    gap: 8
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
  modalOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 100,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    padding: 20
  },
  modalCard: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 16,
    gap: 10
  },
  deviceRow: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#141a22",
    marginBottom: 6
  },
  deviceRowSelected: {
    borderWidth: 1,
    borderColor: "#4a90d9"
  },
  deviceLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  deviceMeta: {
    color: "#9aa7b8",
    fontSize: 11,
    marginTop: 2
  },
  deviceActiveBanner: {
    backgroundColor: "#3a2410",
    borderBottomWidth: 1,
    borderBottomColor: "#8a5a20",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 6
  },
  deviceActiveBannerPinned: {
    zIndex: 50
  },
  deviceActiveBannerTitle: {
    color: "#f4e2c4",
    fontWeight: "600",
    fontSize: 13
  },
  deviceActiveBannerText: {
    color: "#f4e2c4",
    fontSize: 12,
    flex: 1
  },
  deviceActiveBannerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  dangerButton: {
    backgroundColor: "#7a2430",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  catalogRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8
  },
  detailCard: {
    marginTop: 8,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#121820",
    gap: 4
  },
  detailActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8
  },
  catalogName: {
    color: "#f4f7fb",
    fontSize: 14,
    fontWeight: "600"
  },
  smallButton: {
    backgroundColor: "#2b3645",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6
  },
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: "Menlo",
    fontSize: 12,
    marginBottom: 6
  },
  devBadge: {
    color: "#f5a623",
    fontWeight: "700",
    fontSize: 12
  }
});
