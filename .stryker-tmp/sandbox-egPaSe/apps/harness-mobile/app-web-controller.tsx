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
export function useWebHarnessController() {
const [status, setStatus] = useState<WorkletStatus>(initialStatus);
  const [announces, setAnnounces] = useState<ReadonlyArray<AnnounceEntry>>([]);
  const [logLines, setLogLines] = useState<ReadonlyArray<string>>([
    "Web leaf host ready. Configure the gateway URL, create an identity, then enable the WS gateway."
  ]);
  const [gatewayUrl, setGatewayUrl] = useState(defaultGatewayUrl());
  const [sharedToken, setSharedToken] = useState("");
  const [ntfyUrl, setNtfyUrl] = useState("");
  const [ntfyToken, setNtfyToken] = useState("");
  const [wsEnabled, setWsEnabled] = useState(false);
  const [rnodeEnabled, setRnodeEnabled] = useState(false);
  const [webSerialAvailable] = useState(() => webSerialSupported());
  const [previewTree, setPreviewTree] = useState<WidgetTree>(helloWidgetTree);
  const [lastWidgetEvent, setLastWidgetEvent] = useState<string | null>(null);
  const [storageQuota, setStorageQuota] = useState<WebStorageQuotaView | null>(null);
  const [installed, setInstalled] = useState<ReadonlyArray<InstalledPackageView>>([]);
  const [selectedInstalledAppId, setSelectedInstalledAppId] = useState<string | null>(null);
  const [grantCapabilities, setGrantCapabilities] = useState<ReadonlyArray<CapabilityGrantView>>([]);
  const [miniappRuntime, setMiniappRuntime] = useState<MiniappRuntimeView | null>(null);
  const [developerMode, setDeveloperMode] = useState(false);
  const [hostModal, setHostModal] = useState<
    | { readonly kind: "confirm"; readonly request: HostConfirmationRequestView }
    | {
        readonly kind: "launch";
        readonly review: LaunchReviewRequestView;
        readonly grants: ReadonlyArray<string>;
      }
    | {
        readonly kind: "install";
        readonly review: InstallReviewRequestView;
        readonly grants: ReadonlyArray<string>;
      }
    | null
  >(null);
  const [peerModal, setPeerModal] = useState<
    | { readonly kind: "exchange"; readonly request: Extract<WorkletToHostMessage, { type: "peer-manual-present" | "peer-manual-enter" | "peer-qr-present" | "peer-qr-scan" | "peer-ntfy-present" | "peer-ntfy-enter" | "peer-audio-transmit" | "peer-audio-receive" }>; readonly input: string }
    | { readonly kind: "confirm"; readonly request: Extract<WorkletToHostMessage, { type: "peer-confirm-request" }> }
    | null
  >(null);
  const [install256tInput, setInstall256tInput] = useState("");
  const [installProgress, setInstallProgress] = useState<InstallProgress | null>(null);
  const [trustedPublishers, setTrustedPublishers] = useState<ReadonlyArray<TrustedPublisherView>>([]);
  const [trustIdentityInput, setTrustIdentityInput] = useState("");
  const [trustLabelInput, setTrustLabelInput] = useState("");
  const [hostIdentity256t, setHostIdentity256t] = useState<string | null>(null);
  const [deviceState, setDeviceState] = useState<DeviceStateView | null>(null);
  const [sessionInvites, setSessionInvites] = useState<ReadonlyArray<SessionInviteView>>([]);
  const [pwaInstallAvailability, setPwaInstallAvailability] = useState<PwaInstallAvailability>("unavailable");
  const pwaInstallRef = useRef<ReturnType<typeof createPwaInstallController> | null>(null);
  const peerRtcRef = useRef(
    new Map<
      string,
      {
        pc: any;
        channel: any;
        role: "offer" | "answer";
        localTracks: MediaStreamTrack[];
        remoteTracks: MediaStreamTrack[];
        remoteTrackListeners: Set<(track: MediaStreamTrack) => void>;
        attachTrack(track: MediaStreamTrack): RTCRtpSender;
      }
    >()
  );

  const previewOptions = useMemo(
    () =>
      [
        { id: "hello", label: "Hello", tree: helloWidgetTree },
        { id: "chat", label: "Chat panel", tree: chatWidgetTree }
      ] as const,
    []
  );

  const bridgeRef = useRef<ReturnType<typeof createWebCoreBridge> | null>(null);
  const workspaceReadCounterRef = useRef(0);
  const crossDeviceCounterRef = useRef(0);
  const pendingCrossDeviceRef = useRef(new Map<string, {
    readonly resolve: (result: Readonly<Record<string, unknown>>) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
  }>());
  const pendingWorkspaceReadsRef = useRef(new Map<string, {
    readonly resolve: (content: string) => void;
    readonly reject: (error: Error) => void;
    readonly timer: ReturnType<typeof setTimeout>;
  }>());

  const appendLog = useCallback((line: string) => {
    setLogLines((current) => [...current.slice(-200), line]);
  }, []);

  const sendToWorker = useCallback((message: HostToWorkletMessage) => {
    bridgeRef.current?.send(message);
  }, []);

  const readWorkspaceDocument = useCallback((documentId: string) => new Promise<string>((resolve, reject) => {
    const token = `ws-${workspaceReadCounterRef.current++}`;
    const timer = setTimeout(() => {
      pendingWorkspaceReadsRef.current.delete(token);
      reject(new Error("Workspace read timed out"));
    }, 10_000);
    pendingWorkspaceReadsRef.current.set(token, { resolve, reject, timer });
    sendToWorker({ type: "workspace-read", token, documentId });
  }), [sendToWorker]);

  const handleWorkerMessage = useCallback(
    (message: WorkletToHostMessage) => {
      if (message.type === "cross-device-result") {
        const pending = pendingCrossDeviceRef.current.get(message.token);
        pendingCrossDeviceRef.current.delete(message.token);
        if (pending !== undefined) {
          clearTimeout(pending.timer);
          if (message.ok) pending.resolve(message.result ?? {});
          else pending.reject(new Error(message.error ?? "Cross-device command failed"));
        }
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
        return;
      }

      if (message.type === "storage-quota") {
        setStorageQuota(message.quota);
        return;
      }

      if (message.type === "installed") {
        setInstalled(message.packages);
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

      if (message.type === "miniapp-log") {
        appendLog(`[miniapp] ${message.line}`);
        return;
      }

      if (message.type === "peer-manual-present" || message.type === "peer-manual-enter") {
        setPeerModal({ kind: "exchange", request: message, input: "" });
        return;
      }

      if (message.type === "peer-qr-availability") {
        const navigatorLike = (globalThis as { navigator?: { mediaDevices?: { getUserMedia?: unknown } } }).navigator;
        sendToWorker({ type: "peer-chrome-response", token: message.token, availability: typeof navigatorLike?.mediaDevices?.getUserMedia === "function" ? { state: "permission-required", reason: "Camera starts only after Start camera" } : { state: "unsupported", reason: "Camera capture is unavailable; use manual full code" } });
        return;
      }

      if (message.type === "peer-qr-present" || message.type === "peer-qr-scan") {
        setPeerModal({ kind: "exchange", request: message, input: "" });
        return;
      }

      if (message.type === "peer-ntfy-present" || message.type === "peer-ntfy-enter") {
        setPeerModal({ kind: "exchange", request: message, input: "" });
        return;
      }

      if (message.type === "peer-audio-availability") {
        const browser = globalThis as unknown as { navigator?: { mediaDevices?: { getUserMedia?: unknown } }; AudioContext?: unknown; webkitAudioContext?: unknown };
        const available = typeof browser.navigator?.mediaDevices?.getUserMedia === "function" && (browser.AudioContext !== undefined || browser.webkitAudioContext !== undefined);
        sendToWorker({ type: "peer-chrome-response", token: message.token, availability: available ? { state: "permission-required", reason: "Microphone permission is requested only after starting the audible exchange" } : { state: "unsupported", reason: "Web Audio microphone/playback is unavailable" } });
        return;
      }

      if (message.type === "peer-audio-transmit" || message.type === "peer-audio-receive") {
        setPeerModal({ kind: "exchange", request: message, input: "" });
        return;
      }

      if (message.type === "peer-webrtc-signal") {
        void (async () => {
          try {
            const PeerConnection = (globalThis as { RTCPeerConnection?: new () => any }).RTCPeerConnection;
            if (PeerConnection === undefined) { sendToWorker({ type: "peer-chrome-response", token: message.token }); return; }
            const pc = new PeerConnection();
            const state = {
              pc,
              channel: null as any,
              role: message.role,
              localTracks: [] as MediaStreamTrack[],
              remoteTracks: [] as MediaStreamTrack[],
              remoteTrackListeners: new Set<(track: MediaStreamTrack) => void>(),
              async attachTrack(track: MediaStreamTrack) {
                const kind = track.kind;
                const transceiver = pc.getTransceivers?.().find((entry: { sender?: { track?: { kind?: string } | null }; receiver?: { track?: { kind?: string } | null }; mid: string | null }) => {
                  const senderKind = entry.sender?.track?.kind;
                  const receiverKind = entry.receiver?.track?.kind;
                  return senderKind === kind || receiverKind === kind || (senderKind === undefined && receiverKind === undefined && entry.mid !== null);
                });
                if (transceiver?.sender && typeof transceiver.sender.replaceTrack === "function") {
                  await transceiver.sender.replaceTrack(track);
                  return;
                }
                pc.addTrack(track);
              }
            };
            peerRtcRef.current.set(message.sessionId, state);
            pc.addEventListener("track", (event: { track: MediaStreamTrack }) => {
              state.remoteTracks.push(event.track);
              for (const listener of state.remoteTrackListeners) listener(event.track);
            });
            if (message.role === "offer") {
              pc.addTransceiver("audio", { direction: "sendrecv" });
              pc.addTransceiver("video", { direction: "sendrecv" });
              state.channel = pc.createDataChannel("twistedpear-peer", { ordered: true });
              state.channel.binaryType = "arraybuffer";
              await pc.setLocalDescription(await pc.createOffer());
            }
            else {
              if (message.remoteSignal === undefined) throw new Error("WebRTC offer is missing");
              pc.addEventListener("datachannel", (event: any) => { state.channel = event.channel; state.channel.binaryType = "arraybuffer"; });
              await pc.setRemoteDescription(JSON.parse(message.remoteSignal));
              await pc.setLocalDescription(await pc.createAnswer());
            }
            if (pc.iceGatheringState !== "complete") await new Promise<void>((resolve) => { const timer = setTimeout(resolve, 2_000); const changed = () => { if (pc.iceGatheringState === "complete") { clearTimeout(timer); pc.removeEventListener("icegatheringstatechange", changed); resolve(); } }; pc.addEventListener("icegatheringstatechange", changed); });
            const local = pc.localDescription; if (local === null) throw new Error("WebRTC did not produce a local signal");
            sendToWorker({ type: "peer-chrome-response", token: message.token, signal: JSON.stringify({ type: local.type, sdp: local.sdp }) });
          } catch (error) { peerRtcRef.current.get(message.sessionId)?.pc.close(); peerRtcRef.current.delete(message.sessionId); appendLog(`WebRTC signaling unavailable: ${error instanceof Error ? error.message : String(error)}`); sendToWorker({ type: "peer-chrome-response", token: message.token }); }
        })();
        return;
      }

      if (message.type === "peer-webrtc-establish") {
        void (async () => {
          const state = peerRtcRef.current.get(message.sessionId);
          try {
            if (state === undefined) throw new Error("WebRTC state is missing");
            if (state.role === "offer") { if (message.remoteSignal === undefined) throw new Error("WebRTC answer is missing"); await state.pc.setRemoteDescription(JSON.parse(message.remoteSignal)); }
            const deadline = Date.now() + 30_000; while (Date.now() < deadline && state.channel?.readyState !== "open") { if (state.pc.connectionState === "failed" || state.pc.connectionState === "closed") break; await new Promise((resolve) => setTimeout(resolve, 25)); }
            if (state.channel?.readyState !== "open") throw new Error(state.pc.iceConnectionState === "failed" ? "ICE failed; this network may require TURN" : "Data channel timed out");
            state.channel.addEventListener("message", (event: MessageEvent) => { void (async () => { const buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data; if (buffer instanceof ArrayBuffer) sendToWorker({ type: "peer-webrtc-data", sessionId: message.sessionId, dataHex: webBytesToHex(new Uint8Array(buffer)) }); })(); });
            sendToWorker({ type: "peer-chrome-response", token: message.token, opened: true });
          } catch (error) { state?.pc.close(); peerRtcRef.current.delete(message.sessionId); appendLog(`WebRTC route unavailable: ${error instanceof Error ? error.message : String(error)}`); sendToWorker({ type: "peer-chrome-response", token: message.token, opened: false }); }
        })();
        return;
      }

      if (message.type === "peer-webrtc-data-send") {
        const state = peerRtcRef.current.get(message.sessionId);
        if (state?.channel?.readyState === "open") { state.channel.send(webHexToBytes(message.dataHex)); sendToWorker({ type: "peer-chrome-response", token: message.token, sent: true }); }
        else sendToWorker({ type: "peer-chrome-response", token: message.token, sent: false });
        return;
      }

      if (message.type === "peer-webrtc-media-attach") {
        void (async () => {
          const state = peerRtcRef.current.get(message.sessionId);
          try {
            if (state === undefined) throw new Error("WebRTC state is missing");
            const nav = (globalThis as { navigator?: { mediaDevices?: { getUserMedia(constraints: unknown): Promise<MediaStream> } } }).navigator;
            if (typeof nav?.mediaDevices?.getUserMedia !== "function") throw new Error("getUserMedia is unavailable");
            const audio = message.classId === "microphone";
            const video = message.classId === "camera" || message.classId === "screen-capture";
            if (!audio && !video) throw new Error(`Unsupported media class ${message.classId}`);
            const stream = await nav.mediaDevices.getUserMedia({
              audio: audio ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true } : false,
              video: video ? { facingMode: "user" } : false
            });
            const tracks = stream.getTracks();
            if (tracks.length === 0) throw new Error("No media tracks from getUserMedia");
            for (const track of tracks) {
              await state.attachTrack(track);
              state.localTracks.push(track);
            }
            let bytesSent = 0;
            for (let attempt = 0; attempt < 40 && bytesSent === 0; attempt += 1) {
              await new Promise((resolve) => setTimeout(resolve, 250));
              bytesSent = await outboundWebRtcMediaBytes(state.pc);
            }
            sendToWorker({
              type: "peer-chrome-response",
              token: message.token,
              attached: true,
              trackCount: tracks.length,
              bytesSent,
              connectionState: state.pc.connectionState,
              voiceProcessing: audio
                ? { echoCancellation: true, noiseSuppression: true, autoGainControl: true, voiceDuplex: true }
                : null
            });
          } catch (error) {
            sendToWorker({
              type: "peer-chrome-response",
              token: message.token,
              attached: false,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        })();
        return;
      }

      if (message.type === "media-opus-play-request") {
        void playInboundAudioFrame(message.dataHex, message.encoding)
          .then(() => {
            sendToWorker({ type: "media-opus-play-response", token: message.token, played: true });
            appendLog(`Opus duplex play ok (${message.dataHex.length / 2} bytes)`);
          })
          .catch((error) => {
            sendToWorker({
              type: "media-opus-play-response",
              token: message.token,
              played: false,
              error: error instanceof Error ? error.message : String(error)
            });
            appendLog(`Opus duplex play failed: ${error instanceof Error ? error.message : String(error)}`);
          });
        return;
      }

      if (message.type === "media-codec-request") {
        void handleWebMediaCodecRequest(message, sendToWorker);
        return;
      }

      if (message.type === "peer-webrtc-media-stats") {
        void (async () => {
          const state = peerRtcRef.current.get(message.sessionId);
          try {
            if (state === undefined) throw new Error("WebRTC state is missing");
            const bytesSent = await outboundWebRtcMediaBytes(state.pc);
            sendToWorker({
              type: "peer-chrome-response",
              token: message.token,
              bytesSent,
              trackCount: state.localTracks.length,
              connectionState: state.pc.connectionState
            });
          } catch (error) {
            sendToWorker({
              type: "peer-chrome-response",
              token: message.token,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        })();
        return;
      }

      if (message.type === "peer-webrtc-media-detach") {
        void (async () => {
          const state = peerRtcRef.current.get(message.sessionId);
          const kind = message.classId === "microphone" ? "audio" : "video";
          for (const track of [...(state?.localTracks ?? [])]) {
            if (track.kind === kind || message.classId === "screen-capture") {
              try {
                track.stop();
              } catch {
                /* ignore */
              }
              state?.localTracks.splice(state.localTracks.indexOf(track), 1);
            }
          }
          sendToWorker({ type: "peer-chrome-response", token: message.token, attached: false });
        })();
        return;
      }

      if (message.type === "peer-webrtc-close") {
        const state = peerRtcRef.current.get(message.sessionId);
        for (const track of state?.localTracks ?? []) {
          try {
            track.stop();
          } catch {
            /* ignore */
          }
        }
        state?.channel?.close();
        state?.pc.close();
        peerRtcRef.current.delete(message.sessionId);
        return;
      }

      if (message.type === "peer-confirm-request") {
        setPeerModal({ kind: "confirm", request: message });
        return;
      }

      if (message.type === "peer-chrome-cancel") {
        setPeerModal(null);
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

      if (message.type === "confirm-request") {
        setHostModal({
          kind: "confirm",
          request: {
            token: message.token,
            kind: message.kind,
            appId: message.appId,
            publisherPublicKey: message.publisherPublicKey,
            summary: message.summary
          }
        });
        return;
      }

      if (message.type === "launch-review") {
        setHostModal({
          kind: "launch",
          review: {
            token: message.token,
            appId: message.appId,
            publisherPublicKey: message.publisherPublicKey,
            version: message.version,
            capabilities: message.capabilities
          },
          grants: message.capabilities.filter((capability) => capability.granted).map((capability) => capability.id)
        });
        return;
      }

      if (message.type === "install-review") {
        setHostModal({
          kind: "install",
          review: {
            token: message.token,
            appId: message.appId,
            version: message.version,
            publisherPublicKey: message.publisherPublicKey,
            trusted: message.trusted,
            trustedLabel: message.trustedLabel,
            capabilities: message.capabilities
          },
          grants: []
        });
        return;
      }

      if (message.type === "install-progress") {
        setInstallProgress(message.progress);
        return;
      }

      if (message.type === "install-256t-result") {
        const result = message as Install256tResultView;
        if (result.ok) {
          appendLog(`Installed ${result.appId} v${result.version} (trusted: ${result.trusted ? "yes" : "no"})`);
        } else {
          appendLog(`256t install failed: ${result.error ?? "unknown error"}`);
        }
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
            const {
              browserDeviceAvailability,
              browserDeviceSense,
              browserDeviceActuate
            } = await import("../../packages/miniapp-runtime/dist/drivers/browser-effects.js");
            const result =
              message.op === "availability"
                ? await browserDeviceAvailability(message.classId)
                : message.op === "actuate"
                  ? await browserDeviceActuate(message.classId, message.command ?? {})
                  : await browserDeviceSense(message.classId, message.options ?? {});
            sendToWorker({ type: "device-bridge-response", token: message.token, result });
          } catch (error) {
            sendToWorker({
              type: "device-bridge-response",
              token: message.token,
              error: error instanceof Error ? error.message : String(error)
            });
          }
        })();
        return;
      }

      if (message.type === "inbound-media-frame") {
        if (message.sink.kind === "speaker" && webHexToBytes(message.dataHex)[5] === 5) appendLog(`Inbound derived event received (${message.encoding})`);
        else if (message.sink.kind === "speaker") void playInboundAudioFrame(message.dataHex, message.encoding).catch((error) => appendLog(`Inbound audio failed: ${error instanceof Error ? error.message : String(error)}`));
        else appendLog(`Inbound ${message.encoding} video frame received for ${message.sink.widgetId ?? "remote-video"}`);
        return;
      }
    },
    [appendLog, sendToWorker]
  );

  const ensureBridge = useCallback(() => {
    if (bridgeRef.current !== null) {
      return bridgeRef.current;
    }

    const bridge = createWebCoreBridge();
    bridge.setMessageHandler(handleWorkerMessage);
    bridge.worklet.start("/web-core.worker.js");
    bridgeRef.current = bridge;
    return bridge;
  }, [handleWorkerMessage]);

  const pushGatewayConfig = useCallback(() => {
    ensureBridge();
    sendToWorker({
      type: "start",
      targetHost: "127.0.0.1",
      targetPort: 9480,
      gatewayUrl,
      identityPassphrase: DEFAULT_PASSPHRASE,
      ...(sharedToken.trim().length === 0 ? {} : { sharedToken: sharedToken.trim() })
      , ...(ntfyUrl.trim().length === 0 ? {} : { ntfyUrl: ntfyUrl.trim() })
      , ...(ntfyToken.trim().length === 0 ? {} : { ntfyToken: ntfyToken.trim() })
    });
  }, [ensureBridge, gatewayUrl, ntfyToken, ntfyUrl, sendToWorker, sharedToken]);

  useEffect(() => {
    ensureBridge();
    pushGatewayConfig();
  }, [ensureBridge, pushGatewayConfig]);

  useEffect(() => {
    const location = globalThis.location;
    if (new URLSearchParams(location.search).get("cross-device-control") !== "1") return undefined;
    const target = globalThis as unknown as {
      __TP_CROSS_DEVICE__?: {
        command(command: string, payload?: Readonly<Record<string, unknown>>): Promise<Readonly<Record<string, unknown>>>;
      };
    };
    target.__TP_CROSS_DEVICE__ = {
      command(command, payload = {}) {
        ensureBridge();
        return new Promise((resolve, reject) => {
          const token = `cross-device-${crossDeviceCounterRef.current++}`;
          const timer = setTimeout(() => {
            pendingCrossDeviceRef.current.delete(token);
            reject(new Error(`Cross-device command timed out: ${command}`));
          }, 120_000);
          pendingCrossDeviceRef.current.set(token, { resolve, reject, timer });
          sendToWorker({
            type: "cross-device-command",
            token,
            command: { ...payload, cmd: command }
          });
        });
      }
    };
    return () => {
      delete target.__TP_CROSS_DEVICE__;
    };
  }, [ensureBridge, sendToWorker]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "refresh-storage" });
    sendToWorker({ type: "list-installed" });
    sendToWorker({ type: "trust-list" });
    sendToWorker({ type: "device-list" });
  }, [ensureBridge, sendToWorker]);

  const performPeerAudio = useCallback(async (request: Extract<WorkletToHostMessage, { type: "peer-audio-transmit" | "peer-audio-receive" }>) => {
    try {
      appendLog(request.type === "peer-audio-transmit" ? "Playing audible peer frames…" : "Listening for audible peer frames…");
      if (request.type === "peer-audio-transmit") {
        await playPeerAudio(request.framesHex);
        const framesHex = request.expectsResponse ? await recordPeerAudio() : [];
        sendToWorker({ type: "peer-chrome-response", token: request.token, accepted: true, framesHex });
      } else {
        const framesHex = await recordPeerAudio();
        sendToWorker({ type: "peer-chrome-response", token: request.token, accepted: true, sessionId: request.sessionId, framesHex });
      }
      appendLog("Audible peer exchange completed.");
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error); appendLog(`Audible peer exchange failed: ${detail}`); sendToWorker({ type: "peer-chrome-response", token: request.token, accepted: false, error: detail });
    }
  }, [appendLog, sendToWorker]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({ type: "set-developer-mode", enabled: developerMode });
  }, [developerMode, ensureBridge, sendToWorker]);

  useEffect(() => {
    ensureBridge();
    sendToWorker({
      type: "set-interfaces",
      tcp: wsEnabled,
      auto: false,
      ble: false,
      rnode: rnodeEnabled
    });
  }, [ensureBridge, sendToWorker, wsEnabled, rnodeEnabled]);

  const connectWebSerialRnode = useCallback(async () => {
    try {
      const bridge = ensureBridge();
      await bridge.requestWebSerialPort();
      setRnodeEnabled(true);
      appendLog("Web Serial port opened; enable RNode to bring the interface online.");
    } catch (error) {
      appendLog(`Web Serial connect failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }, [appendLog, ensureBridge]);

  useEffect(
    () => () => {
      bridgeRef.current?.stop();
      bridgeRef.current = null;
    },
    []
  );

  useEffect(() => {
    if (Platform.OS !== "web") {
      return;
    }

    const controller = createPwaInstallController();
    pwaInstallRef.current = controller;
    const unsubscribe = controller.subscribe(setPwaInstallAvailability);
    return () => {
      unsubscribe();
      controller.dispose();
      pwaInstallRef.current = null;
    };
  }, []);

  const promptPwaInstall = useCallback(async () => {
    const outcome = await pwaInstallRef.current?.promptInstall();
    if (outcome === null || outcome === undefined) {
      appendLog("Install prompt unavailable in this browser session.");
      return;
    }

    appendLog(outcome === "accepted" ? "PWA install accepted." : "PWA install dismissed.");
  }, [appendLog]);
  return { status, setStatus, announces, setAnnounces, logLines, setLogLines, gatewayUrl, setGatewayUrl, sharedToken, setSharedToken, ntfyUrl, setNtfyUrl, ntfyToken, setNtfyToken, wsEnabled, setWsEnabled, rnodeEnabled, setRnodeEnabled, webSerialAvailable, previewTree, setPreviewTree, lastWidgetEvent, setLastWidgetEvent, storageQuota, setStorageQuota, installed, setInstalled, selectedInstalledAppId, setSelectedInstalledAppId, grantCapabilities, setGrantCapabilities, miniappRuntime, setMiniappRuntime, developerMode, setDeveloperMode, hostModal, setHostModal, peerModal, setPeerModal, install256tInput, setInstall256tInput, installProgress, setInstallProgress, trustedPublishers, setTrustedPublishers, trustIdentityInput, setTrustIdentityInput, trustLabelInput, setTrustLabelInput, hostIdentity256t, setHostIdentity256t, deviceState, setDeviceState, sessionInvites, setSessionInvites, pwaInstallAvailability, setPwaInstallAvailability, pwaInstallRef, peerRtcRef, previewOptions, bridgeRef, workspaceReadCounterRef, crossDeviceCounterRef, pendingCrossDeviceRef, pendingWorkspaceReadsRef, appendLog, sendToWorker, readWorkspaceDocument, handleWorkerMessage, ensureBridge, pushGatewayConfig, performPeerAudio, connectWebSerialRnode, promptPwaInstall };
}
