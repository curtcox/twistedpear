// @ts-nocheck
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
export function useNativeHarnessController() {
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
  const [hostReview, setHostReview] = useState<
    | { readonly kind: "install"; readonly review: InstallReviewRequestView; readonly grants: ReadonlyArray<string> }
    | { readonly kind: "launch"; readonly review: LaunchReviewRequestView; readonly grants: ReadonlyArray<string> }
    | null
  >(null);
  const [install256tInput, setInstall256tInput] = useState("");
  const [trustIdentityInput, setTrustIdentityInput] = useState("");
  const [trustLabelInput, setTrustLabelInput] = useState("");
  const [trustedPublishers, setTrustedPublishers] = useState<ReadonlyArray<TrustedPublisherView>>([]);
  const [hostIdentity256t, setHostIdentity256t] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceStateView | null>(null);
  const [sessionInvites, setSessionInvites] = useState<ReadonlyArray<SessionInviteView>>([]);
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
  const peerRtcRef = useRef(createNativePeerRtcStore());
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

    worklet.IPC.write(new TextEncoder().encode(encodeMessage(message)));
  }, []);

  /** Maestro chrome probe: seed share UI even when Bare worklet cannot start. */
  const seedShareOfferChrome = useCallback(
    (options: {
      readonly appId: string;
      readonly displayLabel: string;
      readonly classId: string;
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
        expiresAt
      };
      setDeviceState((current) => ({
        inventory: current?.inventory ?? [],
        diagnostics: current?.diagnostics ?? [],
        sessions: current?.sessions ?? [],
        indicators: current?.indicators ?? [],
        disabledClasses: current?.disabledClasses ?? [],
        remoteAcquisitionEnabled: current?.remoteAcquisitionEnabled === true,
        shareOffers: [...(current?.shareOffers ?? []).filter((entry) => entry.id !== id), offer]
      }));
      // Prefer live worklet seed when available; host state covers Maestro when Bare aborts.
      sendToWorklet({
        type: "device-test-seed-share",
        appId: options.appId,
        displayLabel: options.displayLabel,
        classId: options.classId,
        ttlMs: options.ttlMs
      });
      if (options.ttlMs <= 10_000) {
        setTimeout(() => {
          setDeviceState((current) => {
            if (current === null) {
              return current;
            }
            return {
              ...current,
              shareOffers: current.shareOffers.filter((entry) => entry.id !== id && entry.expiresAt > Date.now())
            };
          });
        }, Math.max(50, options.ttlMs + 50));
      }
    },
    [sendToWorklet]
  );

  const revokeShareOfferChrome = useCallback(
    (appId: string, id: string) => {
      setDeviceState((current) => {
        if (current === null) {
          return current;
        }
        return {
          ...current,
          shareOffers: current.shareOffers.filter((entry) => entry.id !== id)
        };
      });
      sendToWorklet({ type: "device-revoke-share", appId, id });
    },
    [sendToWorklet]
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

    if (message.type === "launch-review") {
      setHostReview({
        kind: "launch",
        review: message,
        grants: message.capabilities.filter((capability) => capability.granted).map((capability) => capability.id)
      });
      return;
    }

    if (message.type === "install-review") {
      setHostReview({ kind: "install", review: message, grants: [] });
      return;
    }

    if (message.type === "install-256t-result") {
      appendLog(
        message.ok
          ? `Installed ${message.appId} v${message.version} (trusted: ${message.trusted ? "yes" : "no"})`
          : `256t install failed: ${message.error ?? "unknown error"}`
      );
      return;
    }

    if (message.type === "trust") {
      setTrustedPublishers(message.entries);
      return;
    }

    if (message.type === "trust-identity") {
      setHostIdentity256t(message.identity256t);
      return;
    }

    if (message.type === "session-invites") {
      setSessionInvites(message.invites);
      return;
    }

    if (message.type === "session-invite") {
      appendLog(`Call invitation from ${message.invite.verifiedPeerLabel} for ${message.invite.appId}`);
      return;
    }

    if (message.type === "device-state") {
      setDeviceState({
        inventory: message.inventory,
        diagnostics: message.diagnostics,
        sessions: message.sessions,
        indicators: message.indicators,
        disabledClasses: message.disabledClasses,
        remoteAcquisitionEnabled: message.remoteAcquisitionEnabled,
        shareOffers: message.shareOffers
      });
      return;
    }

    if (message.type === "device-bridge-request") {
      void (async () => {
        try {
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

    if (message.type === "inbound-media-frame") {
      if (message.sink.kind === "speaker" && peerAudioUnhex(message.dataHex)[5] === 5) appendLog(`Inbound derived event received (${message.encoding})`);
      else if (message.sink.kind === "speaker") void playInboundNativeMedia(message.dataHex, message.encoding).then(() => appendLog(`Inbound ${message.encoding} media → speaker (${message.dataHex.length / 2} bytes)`)).catch((error) => appendLog(`Inbound media failed: ${error instanceof Error ? error.message : String(error)}`));
      else appendLog(`Inbound ${message.encoding} media → ${message.sink.kind} (${message.dataHex.length / 2} bytes)`);
      return;
    }

    if (message.type === "media-opus-play-request") {
      void playNativeOpusOrPcm(message.dataHex, message.encoding)
        .then(() => {
          sendToWorklet({ type: "media-opus-play-response", token: message.token, played: true });
          appendLog(`Opus/PCM harness play → speaker (${message.dataHex.length / 2} bytes)`);
        })
        .catch((error) => {
          sendToWorklet({
            type: "media-opus-play-response",
            token: message.token,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      return;
    }

    if (message.type === "media-opus-duplex-request") {
      void runNativeOpusDuplex()
        .then((result) => {
          sendToWorklet({ type: "media-opus-duplex-response", token: message.token, ...result });
          appendLog(`Opus duplex host encode/decode/play (${result.opusBytes} opus bytes)`);
        })
        .catch((error) => {
          sendToWorklet({
            type: "media-opus-duplex-response",
            token: message.token,
            error: error instanceof Error ? error.message : String(error)
          });
        });
      return;
    }

    if (handleNativePeerWebRtcMessage(message, peerRtcRef.current, sendToWorklet, appendLog)) {
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

  const workletReadyRef = useRef<Promise<boolean> | null>(null);

  const stopWorklet = useCallback(() => {
    sendToWorklet({ type: "stop" });
    void multicastIpcRef.current?.stop();
    void bleIpcRef.current?.stop();
    void usbIpcRef.current?.stop();
    workletRef.current?.terminate();
    workletRef.current = null;
    workletReadyRef.current = null;
    setStatus((current) => ({
      ...current,
      running: false,
      linkOnline: false
    }));
  }, [sendToWorklet]);

  const startWorklet = useCallback((): Promise<boolean> => {
    if (workletReadyRef.current !== null) {
      return workletReadyRef.current;
    }

    if (workletRef.current !== null) {
      return Promise.resolve(true);
    }

    const worklet = new Worklet();
    multicastIpcRef.current = new HostMulticastIpc(sendToWorklet);
    bonjourIpcRef.current = Platform.OS === "ios" ? new HostBonjourIpc(sendToWorklet) : null;
    bleIpcRef.current = new HostBleIpc(sendToWorklet);
    usbIpcRef.current = getUsbSerialCapability().supported ? new HostUsbIpc(sendToWorklet) : null;

    ipcBufferRef.current = "";
    worklet.IPC.on("data", (data) => {
      const bytes = data instanceof Uint8Array ? data : new Uint8Array(data as ArrayLike<number>);
      const decoded = decodeMessages(`${ipcBufferRef.current}${new TextDecoder().decode(bytes)}`);
      ipcBufferRef.current = decoded.remainder;
      for (const message of decoded.messages) {
        handleWorkletMessage(message);
      }
    });

    workletRef.current = worklet;
    const targetHost = Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST;

    workletReadyRef.current = (async () => {
      try {
        await worklet.start("/app.bundle", bundle);
      } catch (error) {
        workletRef.current = null;
        workletReadyRef.current = null;
        appendLog(`Worklet start failed: ${error instanceof Error ? error.message : String(error)}`);
        setStatus((current) => ({ ...current, running: false, linkOnline: false }));
        return false;
      }

      if (workletRef.current !== worklet) {
        return false;
      }

      sendToWorklet({
        type: "start",
        targetHost,
        targetPort: DEFAULT_DOCKER_PORT,
        multicastEntitled: Platform.OS !== "ios",
        bonjourEnabled: true,
        ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() })
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
      return true;
    })();

    return workletReadyRef.current;
  }, [appendLog, autoEnabled, bleEnabled, rnodeEnabled, selectedUsbDeviceId, handleWorkletMessage, ntfyUrl, pushInterfaceConfig, sendToWorklet, tcpEnabled]);

  const interfacesWantedWorkletRef = useRef(false);

  useEffect(() => {
    const shouldRun = tcpEnabled || autoEnabled || bleEnabled || rnodeEnabled;
    if (shouldRun) {
      const ensure = async () => {
        if (bleEnabled) {
          await requestBlePermissions();
        }
        const ready = await startWorklet();
        if (!ready || workletRef.current === null) {
          return;
        }
        // Identity chrome may have started the worklet with TCP off. Re-assert the
        // Android emulator host (10.0.2.2) / iOS loopback target before enabling TCP.
        sendToWorklet({
          type: "start",
          targetHost: Platform.OS === "android" ? ANDROID_EMULATOR_HOST : LOCAL_HOST,
          targetPort: DEFAULT_DOCKER_PORT,
          multicastEntitled: Platform.OS !== "ios",
          bonjourEnabled: true,
          ...(ntfyUrl.trim() === "" ? {} : { ntfyUrl: ntfyUrl.trim() })
        });
        pushInterfaceConfig({
          tcp: tcpEnabled,
          auto: autoEnabled,
          ble: bleEnabled,
          rnode: rnodeEnabled,
          rnodeDeviceId: selectedUsbDeviceId
        });
      };
      void ensure();
      interfacesWantedWorkletRef.current = true;
      return;
    }

    // Only stop when interfaces transition off. Do not kill worklets started for
    // identity/seed chrome when startWorklet's callback identity churns.
    if (interfacesWantedWorkletRef.current) {
      stopWorklet();
    }
    interfacesWantedWorkletRef.current = false;
  }, [
    tcpEnabled,
    autoEnabled,
    bleEnabled,
    rnodeEnabled,
    selectedUsbDeviceId,
    ntfyUrl,
    startWorklet,
    stopWorklet,
    sendToWorklet,
    pushInterfaceConfig
  ]);

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
  return { status, setStatus, announces, setAnnounces, catalog, setCatalog, installed, setInstalled, installProgress, setInstallProgress, serviceRunning, setServiceRunning, lifecycleState, setLifecycleState, logLines, setLogLines, tcpEnabled, setTcpEnabled, autoEnabled, setAutoEnabled, bleEnabled, setBleEnabled, rnodeEnabled, setRnodeEnabled, usbDevices, setUsbDevices, selectedUsbDeviceId, setSelectedUsbDeviceId, selectedCatalogAppId, setSelectedCatalogAppId, selectedInstalledAppId, setSelectedInstalledAppId, grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime, miniappBenchmark, setMiniappBenchmark, miniappLogs, setMiniappLogs, developerMode, setDeveloperMode, devChannelDetail, setDevChannelDetail, devHost, setDevHost, devPort, setDevPort, ntfyUrl, setNtfyUrl, ntfyToken, setNtfyToken, freenetGrant, setFreenetGrant, freenetDisclosureAccepted, setFreenetDisclosureAccepted, freenetGrantError, setFreenetGrantError, freenetSession, setFreenetSession, peerModal, setPeerModal, hostConfirm, setHostConfirm, hostReview, setHostReview, install256tInput, setInstall256tInput, trustIdentityInput, setTrustIdentityInput, trustLabelInput, setTrustLabelInput, trustedPublishers, setTrustedPublishers, hostIdentity256t, setHostIdentity256t, deviceState, setDeviceState, sessionInvites, setSessionInvites, cameraPermission, requestCameraPermission, peerCameraActive, setPeerCameraActive, peerQrFrame, setPeerQrFrame, workletRef, ipcBufferRef, multicastIpcRef, bonjourIpcRef, bleIpcRef, usbIpcRef, workspaceReadCounterRef, peerRtcRef, pendingWorkspaceReadsRef, appendLog, sendToWorklet, seedShareOfferChrome, revokeShareOfferChrome, applyFreenetGrantToWorklet, activateFreenetGrant, readWorkspaceDocument, handleWorkletMessage, performPeerAudio, pushInterfaceConfig, workletReadyRef, stopWorklet, startWorklet, interfacesWantedWorkletRef, peerQrUri };
}
