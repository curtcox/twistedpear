import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Image, Platform, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import qrcodeModule from "qrcode-generator";
import { decodePeerQrRgba } from "@twistedpear/peer-discovery";
import { decodePeerAudioFskStream, encodePeerAudioFsk } from "@twistedpear/protocol";
import { StatusBar } from "expo-status-bar";
import { validateWidgetTree, type WidgetTree } from "@twistedpear/miniapp-runtime/ui";
import { MiniappWidgetTree } from "@twistedpear/widget-renderer-rn";
import { createWebCoreBridge } from "./host/web-core-bridge";
import {
  createPwaInstallController,
  type PwaInstallAvailability
} from "./host/web-pwa-install";
import { webSerialSupported } from "./host/web-serial-relay";

const audioHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
const audioUnhex = (text: string) => Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

async function playPeerAudio(framesHex: ReadonlyArray<string>): Promise<void> {
  const AudioContextClass = (globalThis as unknown as { AudioContext?: new () => any; webkitAudioContext?: new () => any }).AudioContext ?? (globalThis as unknown as { webkitAudioContext?: new () => any }).webkitAudioContext;
  if (AudioContextClass === undefined) throw new Error("Web Audio playback is unavailable");
  const context = new AudioContextClass(); await context.resume(); let at = context.currentTime + 0.1;
  for (const frameHex of framesHex) { const pcm = encodePeerAudioFsk(audioUnhex(frameHex), { sampleRate: context.sampleRate }); const buffer = context.createBuffer(1, pcm.length, context.sampleRate); buffer.copyToChannel(pcm, 0); const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start(at); at += pcm.length / context.sampleRate + 0.2; }
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(Math.max(0, at - context.currentTime) * 1_000))); await context.close();
}

async function recordPeerAudio(durationMs = 15_000): Promise<ReadonlyArray<string>> {
  const browser = globalThis as unknown as { navigator?: { mediaDevices?: { getUserMedia(constraints: unknown): Promise<any> } }; AudioContext?: new () => any; webkitAudioContext?: new () => any };
  const AudioContextClass = browser.AudioContext ?? browser.webkitAudioContext;
  if (AudioContextClass === undefined || browser.navigator?.mediaDevices?.getUserMedia === undefined) throw new Error("Microphone recording is unavailable");
  const stream = await browser.navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }, video: false });
  const context = new AudioContextClass(); await context.resume(); const chunks: Float32Array[] = []; const source = context.createMediaStreamSource(stream); const processor = context.createScriptProcessor(4_096, 1, 1); const mute = context.createGain(); mute.gain.value = 0;
  processor.onaudioprocess = (event: any) => { const channel = event.inputBuffer.getChannelData(0); chunks.push(new Float32Array(channel)); };
  source.connect(processor); processor.connect(mute); mute.connect(context.destination);
  await new Promise((resolve) => setTimeout(resolve, durationMs)); stream.getTracks().forEach((track: any) => track.stop()); source.disconnect(); processor.disconnect(); mute.disconnect();
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0); const pcm = new Float32Array(total); let offset = 0; for (const chunk of chunks) { pcm.set(chunk, offset); offset += chunk.length; }
  const frames = decodePeerAudioFskStream(pcm, { sampleRate: context.sampleRate }); await context.close();
  if (frames.length === 0) throw new Error("No valid peer audio frames were detected"); return frames.map(audioHex);
}
import type {
  AnnounceEntry,
  CapabilityGrantView,
  ConfirmationKind,
  HostConfirmationRequestView,
  HostToWorkletMessage,
  Install256tResultView,
  InstallProgress,
  InstallReviewRequestView,
  InstalledPackageView,
  LaunchReviewCapabilityView,
  LaunchReviewRequestView,
  MiniappRuntimeView,
  TrustedPublisherView,
  WebStorageQuotaView,
  WorkletStatus,
  WorkletToHostMessage
} from "./worklet/protocol";

const DEFAULT_PASSPHRASE = "harness-web-dev";
const MAX_ANNOUNCES = 50;

const helloWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 8 },
    children: [
      { id: "title", type: "text", props: { value: "Hello" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "go", type: "button", props: { label: "Tap me", event: "hello.tap" } }
    ]
  }
});

const chatWidgetTree = validateWidgetTree({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Chat" }, style: { fontSize: 20, fontWeight: "bold" } },
      {
        id: "peer-input",
        type: "text-input",
        props: { value: "", placeholder: "Peer app id", event: "chat.peer" }
      },
      { id: "send", type: "button", props: { label: "Send hello", event: "chat.send" } },
      {
        id: "inbox-scroll",
        type: "scroll",
        children: [{ id: "inbox", type: "text", props: { value: "No messages yet" } }]
      }
    ]
  }
});

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
  cryptoProvider: "pure",
  autoPeers: 0,
  preferredInterface: null,
  onlineInterfaces: 0,
  catalogEntries: 0,
  installedPackages: 0,
  storageUsedBytes: 0,
  wsEnabled: false,
  gatewayUrl: null
};

function defaultGatewayUrl(): string {
  const location = (globalThis as { location?: { protocol: string; host: string } }).location;
  if (location === undefined) {
    return "ws://127.0.0.1:9480";
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export default function App() {
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
  const [pwaInstallAvailability, setPwaInstallAvailability] = useState<PwaInstallAvailability>("unavailable");
  const pwaInstallRef = useRef<ReturnType<typeof createPwaInstallController> | null>(null);
  const peerRtcRef = useRef(new Map<string, { pc: any; channel: any; role: "offer" | "answer" }>());

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
            const pc = new PeerConnection(); const state = { pc, channel: null as any, role: message.role }; peerRtcRef.current.set(message.sessionId, state);
            if (message.role === "offer") { state.channel = pc.createDataChannel("twistedpear-peer", { ordered: true }); state.channel.binaryType = "arraybuffer"; await pc.setLocalDescription(await pc.createOffer()); }
            else { if (message.remoteSignal === undefined) throw new Error("WebRTC offer is missing"); pc.addEventListener("datachannel", (event: any) => { state.channel = event.channel; state.channel.binaryType = "arraybuffer"; }); await pc.setRemoteDescription(JSON.parse(message.remoteSignal)); await pc.setLocalDescription(await pc.createAnswer()); }
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
            sendToWorker({ type: "peer-chrome-response", token: message.token, opened: true });
          } catch (error) { state?.pc.close(); peerRtcRef.current.delete(message.sessionId); appendLog(`WebRTC route unavailable: ${error instanceof Error ? error.message : String(error)}`); sendToWorker({ type: "peer-chrome-response", token: message.token, opened: false }); }
        })();
        return;
      }

      if (message.type === "peer-webrtc-close") {
        const state = peerRtcRef.current.get(message.sessionId); state?.channel?.close(); state?.pc.close(); peerRtcRef.current.delete(message.sessionId); return;
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
    },
    [appendLog]
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
    ensureBridge();
    sendToWorker({ type: "refresh-storage" });
    sendToWorker({ type: "list-installed" });
    sendToWorker({ type: "trust-list" });
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

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      {hostModal !== null ? (
        <HostConfirmationModal
          modal={hostModal}
          onClose={() => setHostModal(null)}
          onConfirmResponse={(approved) => {
            if (hostModal.kind !== "confirm") {
              return;
            }

            sendToWorker({
              type: "confirm-response",
              token: hostModal.request.token,
              approved
            });
            setHostModal(null);
          }}
          onLaunchConfirm={(accept, grants) => {
            if (hostModal.kind !== "launch") {
              return;
            }

            sendToWorker({
              type: "launch-confirm",
              token: hostModal.review.token,
              accept,
              ...(grants === undefined ? {} : { grants })
            });
            setHostModal(null);
          }}
          onInstallConfirm={(accept, grants) => {
            if (hostModal.kind !== "install") {
              return;
            }

            sendToWorker({
              type: "install-confirm",
              token: hostModal.review.token,
              accept,
              ...(grants === undefined ? {} : { grants })
            });
            setHostModal(null);
          }}
          onGrantToggle={(capabilityId, granted) => {
            if (hostModal.kind !== "launch" && hostModal.kind !== "install") {
              return;
            }

            const next = granted
              ? [...hostModal.grants, capabilityId]
              : hostModal.grants.filter((entry) => entry !== capabilityId);
            setHostModal({ ...hostModal, grants: next });
          }}
        />
      ) : null}
      {peerModal !== null ? (
        <PeerChromeModal
          modal={peerModal}
          onInput={(input) => peerModal.kind === "exchange" && setPeerModal({ ...peerModal, input })}
          onCancel={() => {
            sendToWorker({ type: "peer-chrome-response", token: peerModal.request.token, accepted: false, approved: false });
            setPeerModal(null);
          }}
          onContinue={() => {
            if (peerModal.kind === "confirm") sendToWorker({ type: "peer-chrome-response", token: peerModal.request.token, approved: true });
            else if (peerModal.request.type === "peer-audio-transmit" || peerModal.request.type === "peer-audio-receive") void performPeerAudio(peerModal.request);
            else sendToWorker({ type: "peer-chrome-response", token: peerModal.request.token, accepted: true, ...(peerModal.input.trim() ? { code: peerModal.input.trim() } : {}) });
            setPeerModal(null);
          }}
        />
      ) : null}
      <Text style={styles.title}>TwistedPear Web Host</Text>
      <Text style={styles.subtitle}>Reticulum leaf peer in the browser (Phase W — leaf host)</Text>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Install app (PWA)</Text>
        <Text style={styles.muted}>
          Offline app-shell via service worker. Chromium can offer an install prompt after the shell is ready.
        </Text>
        <Text testID="pwa-install-status">
          Install status:{" "}
          {pwaInstallAvailability === "deferred"
            ? "ready"
            : pwaInstallAvailability === "installed"
              ? "installed / standalone"
              : "waiting for browser criteria"}
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="pwa-install"
            label="Install TwistedPear"
            onPress={() => {
              void promptPwaInstall();
            }}
            disabled={pwaInstallAvailability !== "deferred"}
          />
        </View>
      </View>

      <View style={styles.card}>
        <Text>Core worker: {status.running ? "running" : "stopped"}</Text>
        <Text>Gateway link: {status.linkOnline ? "online" : "offline"}</Text>
        <Text>Crypto: {status.cryptoProvider}</Text>
        <Text>Announces seen: {status.announcesSeen}</Text>
        <Text>Online interfaces: {status.onlineInterfaces}</Text>
        <Text>Identity: {status.identityHash ?? "none"}</Text>
        <Text>Persisted: {status.identityPersisted ? "yes" : "no"}</Text>
        <Text>Gateway: {status.gatewayUrl ?? gatewayUrl}</Text>
        <Text>Installed packages: {status.installedPackages}</Text>
        <Text>Package storage: {formatBytes(status.storageUsedBytes)}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Browser storage (W-S4)</Text>
        <Text style={styles.muted}>
          Package archives in OPFS (IndexedDB fallback) · CAS blobs in IndexedDB · quota from{" "}
          <Text style={styles.mono}>navigator.storage</Text>.
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton label="Refresh quota" onPress={() => sendToWorker({ type: "refresh-storage" })} />
        </View>
        {storageQuota === null ? (
          <Text style={styles.muted}>Quota not loaded yet.</Text>
        ) : (
          <>
            <Text>Archive backend: {storageQuota.archiveBackend}</Text>
            <Text>Persisted: {storageQuota.persisted ? "yes" : "no"}</Text>
            <Text>
              Package quota: {formatBytes(storageQuota.packageUsedBytes)} /{" "}
              {formatBytes(storageQuota.packageQuotaBytes)}
            </Text>
            <Text>
              Browser estimate: {formatBytes(storageQuota.usageBytes)} / {formatBytes(storageQuota.quotaBytes)}
            </Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Gateway</Text>
        <Text style={styles.muted}>Connect through a node with `--ws-listen` (same origin when using `--serve-web`).</Text>
        <TextInput
          style={styles.input}
          value={gatewayUrl}
          onChangeText={setGatewayUrl}
          autoCapitalize="none"
          placeholder="ws://127.0.0.1:9480"
        />
        <TextInput
          style={styles.input}
          value={sharedToken}
          onChangeText={setSharedToken}
          autoCapitalize="none"
          placeholder="Shared token (optional)"
        />
        <View style={styles.buttonRow}>
          <ActionButton label="Apply gateway" onPress={pushGatewayConfig} />
        </View>
        <Row
          testID="ws-gateway-switch"
          label="WS gateway"
          value={wsEnabled}
          onChange={setWsEnabled}
        />
        <Text style={styles.sectionTitle}>Optional ntfy rendezvous</Text>
        <Text style={styles.muted}>Invitation payloads are end-to-end encrypted. The configured server still observes random topics, timing, and IP metadata.</Text>
        <TextInput style={styles.input} value={ntfyUrl} onChangeText={setNtfyUrl} autoCapitalize="none" placeholder="https://ntfy.example/" />
        <TextInput style={styles.input} value={ntfyToken} onChangeText={setNtfyToken} autoCapitalize="none" secureTextEntry placeholder="Bearer token (optional)" />
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>RNode (WebSerial)</Text>
        <Text style={styles.muted}>
          Chromium-only stretch path: connect a USB RNode via the Web Serial API (no gateway required for the radio).
        </Text>
        <Text>
          RNode:{" "}
          {status.rnodeConnected
            ? `connected (${status.rnodeDeviceName ?? "webserial"})`
            : status.rnodeEnabled
              ? "waiting for serial"
              : "offline"}
        </Text>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="webserial-connect"
            label="Connect Web Serial"
            onPress={() => {
              void connectWebSerialRnode();
            }}
            disabled={!webSerialAvailable}
          />
        </View>
        <Row
          testID="rnode-switch"
          label="RNode interface"
          value={rnodeEnabled}
          onChange={setRnodeEnabled}
          disabled={!webSerialAvailable}
        />
        {!webSerialAvailable ? (
          <Text style={styles.muted}>Web Serial API is unavailable in this browser.</Text>
        ) : null}
      </View>

      <View style={styles.card}>
        <View style={styles.buttonRow}>
          <ActionButton
            testID="create-identity"
            label="Create identity"
            onPress={() => sendToWorker({ type: "create-identity" })}
          />
          <ActionButton label="Reset identity" onPress={() => sendToWorker({ type: "reset-identity" })} />
        </View>
        <Text style={styles.muted}>
          Identity keys are encrypted in IndexedDB under passphrase `{DEFAULT_PASSPHRASE}` (dev harness only).
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Mini-app runtime (W2)</Text>
        <Text style={styles.muted}>
          Sandbox runs in an opaque-origin iframe on the main thread; broker and lifecycle stay in the core worker.
        </Text>
        <Row
          testID="developer-mode-switch"
          label="Developer mode"
          value={developerMode}
          onChange={setDeveloperMode}
        />
        <View style={styles.buttonRow}>
          <ActionButton
            testID="dev-side-load-hello"
            label="Dev: load hello"
            onPress={() => sendToWorker({ type: "dev-side-load-hello" })}
          />
          <ActionButton
            label="Stop mini-app"
            onPress={() => sendToWorker({ type: "stop-miniapp" })}
          />
        </View>
        <Text>
          Runtime: {miniappRuntime?.state ?? "stopped"}
          {miniappRuntime?.appId ? ` · ${miniappRuntime.appId}@${miniappRuntime.version ?? "?"}` : ""}
        </Text>
        {miniappRuntime?.widgetTree ? (
          <View testID="miniapp-live-tree">
            <MiniappWidgetTree
              tree={miniappRuntime.widgetTree as WidgetTree}
              readDocument={readWorkspaceDocument}
              onEvent={(nodeId, event, value) => {
                sendToWorker({
                  type: "miniapp-ui-event",
                  nodeId,
                  event,
                  ...(value === undefined ? {} : { value })
                });
              }}
            />
          </View>
        ) : (
          <Text style={styles.muted}>No live mini-app widget tree yet.</Text>
        )}
      </View>

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
    </View>
  );
}

function formatBytes(value: number | null): string {
  if (value === null || !Number.isFinite(value)) {
    return "unknown";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KiB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MiB`;
}

function Row({
  label,
  value,
  onChange,
  testID,
  disabled = false
}: {
  readonly label: string;
  readonly value: boolean;
  readonly onChange: (next: boolean) => void;
  readonly testID?: string;
  readonly disabled?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch testID={testID} value={value} onValueChange={onChange} disabled={disabled} />
    </View>
  );
}

function ActionButton({
  label,
  onPress,
  testID,
  disabled = false
}: {
  readonly label: string;
  readonly onPress: () => void;
  readonly testID?: string;
  readonly disabled?: boolean;
}) {
  return (
    <Pressable testID={testID} style={[styles.button, disabled ? styles.buttonDisabled : null]} onPress={onPress} disabled={disabled}>
      <Text style={styles.buttonLabel}>{label}</Text>
    </Pressable>
  );
}

const CONFIRM_KIND_TITLES: Readonly<Record<ConfirmationKind, string>> = {
  package: "Package and sign an app?",
  publish: "Publish an app to other users?",
  install: "Install an app?",
  preview: "Preview an app in the host sandbox?",
  "trust-import": "Trust a new publisher?"
};

function PeerChromeModal({ modal, onInput, onCancel, onContinue }: {
  readonly modal:
    | { readonly kind: "exchange"; readonly request: Extract<WorkletToHostMessage, { type: "peer-manual-present" | "peer-manual-enter" | "peer-qr-present" | "peer-qr-scan" | "peer-ntfy-present" | "peer-ntfy-enter" | "peer-audio-transmit" | "peer-audio-receive" }>; readonly input: string }
    | { readonly kind: "confirm"; readonly request: Extract<WorkletToHostMessage, { type: "peer-confirm-request" }> };
  readonly onInput: (value: string) => void;
  readonly onCancel: () => void;
  readonly onContinue: () => void;
}) {
  const [qrFrame, setQrFrame] = useState(0);
  const [cameraStatus, setCameraStatus] = useState("");
  const cameraStopRef = useRef<(() => void) | null>(null);
  useEffect(() => () => cameraStopRef.current?.(), []);
  useEffect(() => {
    if (modal.kind !== "exchange" || modal.request.type !== "peer-qr-present" || modal.request.codes.length < 2) return undefined;
    const codes = modal.request.codes;
    const timer = setInterval(() => setQrFrame((current) => (current + 1) % codes.length), 750);
    return () => clearInterval(timer);
  }, [modal]);

  const startCamera = async () => {
    const browser = globalThis as unknown as { navigator?: { mediaDevices?: { getUserMedia(constraints: unknown): Promise<{ getTracks(): ReadonlyArray<{ stop(): void }> }> } }; document?: { body: { appendChild(node: unknown): void }; createElement(name: string): any }; requestAnimationFrame(callback: () => void): void };
    if (browser.navigator?.mediaDevices?.getUserMedia === undefined || browser.document === undefined) { setCameraStatus("Camera capture is unavailable; paste the full payload instead."); return; }
    try {
      const stream = await browser.navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: "environment" } }, audio: false });
      const video = browser.document.createElement("video"); video.autoplay = true; video.muted = true; video.playsInline = true; video.srcObject = stream; video.setAttribute("aria-label", "Peer QR camera preview"); Object.assign(video.style, { position: "fixed", right: "24px", bottom: "24px", width: "240px", zIndex: "1000", borderRadius: "12px" }); browser.document.body.appendChild(video); await video.play();
      const stop = () => { stream.getTracks().forEach((track) => track.stop()); video.remove(); cameraStopRef.current = null; }; cameraStopRef.current = stop; setCameraStatus("Camera active. Hold the peer QR inside the preview.");
      const canvas = browser.document.createElement("canvas"); const detect = () => { if (cameraStopRef.current === null) return; if (video.videoWidth > 0 && video.videoHeight > 0) { canvas.width = video.videoWidth; canvas.height = video.videoHeight; const context = canvas.getContext("2d", { willReadFrequently: true }); context?.drawImage(video, 0, 0); const image = context?.getImageData(0, 0, canvas.width, canvas.height); const value = image === undefined ? null : decodePeerQrRgba(image.data, canvas.width, canvas.height); if (value !== null) { onInput(value); setCameraStatus("QR payload captured."); stop(); return; } } browser.requestAnimationFrame(detect); }; detect();
    } catch (error) { setCameraStatus(`Camera unavailable: ${error instanceof Error ? error.message : String(error)}`); }
  };

  if (modal.kind === "confirm") {
    return (
      <View testID="peer-confirmation-modal" style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Confirm peer connection</Text>
          <Text style={styles.muted}>Trusted host chrome · Requested by: {modal.request.appId}</Text>
          <Text>Purpose: {modal.request.purpose}</Text>
          <Text>Service: {modal.request.service}</Text>
          <Text>Peer label (untrusted claim): {modal.request.peer.displayLabel}</Text>
          <Text>Identity fingerprint: {modal.request.peer.fingerprint}</Text>
          <Text>Matching words: {modal.request.peer.matchingWords.join(" · ")}</Text>
          <Text>Data path: {modal.request.peer.dataPlane}</Text>
          <View style={styles.buttonRow}><ActionButton label="Cancel" onPress={onCancel} /><ActionButton label="Connect" onPress={onContinue} /></View>
        </View>
      </View>
    );
  }
  const present = modal.request.type === "peer-manual-present" || modal.request.type === "peer-qr-present" || modal.request.type === "peer-ntfy-present";
  const qr = modal.request.type === "peer-qr-present" || modal.request.type === "peer-qr-scan";
  const ntfy = modal.request.type === "peer-ntfy-present" || modal.request.type === "peer-ntfy-enter";
  const audio = modal.request.type === "peer-audio-transmit" || modal.request.type === "peer-audio-receive";
  const needsInput = modal.request.type === "peer-manual-enter" || modal.request.type === "peer-qr-scan" || modal.request.type === "peer-ntfy-enter" || ("expectsResponse" in modal.request && modal.request.expectsResponse);
  const qrValue = modal.request.type === "peer-qr-present" ? modal.request.codes[qrFrame] : undefined;
  const qrFactory = qrcodeModule as unknown as (typeNumber: number, correction: string) => { addData(value: string): void; make(): void; createDataURL(cellSize: number, margin: number): string };
  let qrUri: string | null = null; if (qrValue !== undefined) { const image = qrFactory(0, "M"); image.addData(qrValue); image.make(); qrUri = image.createDataURL(4, 8); }
  return (
    <View testID="peer-exchange-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{audio ? modal.request.type === "peer-audio-transmit" ? "Play an audible peer invitation" : "Listen for an audible peer invitation" : ntfy ? present ? "Share a private ntfy lookup code" : "Enter a private ntfy lookup code" : qr ? present ? "Show peer QR" : "Scan peer QR" : present ? "Share peer invitation" : "Enter a peer invitation"}</Text>
        <Text style={styles.muted}>{audio ? "Trusted host chrome. This emits audible FSK tones and requests microphone access only after you continue. No PCM is exposed to the mini-app." : ntfy ? `Trusted host chrome. ${modal.request.server} can observe a random topic, timing, and IP metadata, but invitation contents are end-to-end encrypted.` : "Trusted host chrome. This is a full serverless code, not a short lookup code."}</Text>
        {qrUri !== null ? <Image accessibilityLabel="Peer invitation QR" source={{ uri: qrUri }} style={{ width: 260, height: 260 }} /> : null}
        {modal.request.type === "peer-manual-present" ? <TextInput multiline editable={false} value={modal.request.code} style={styles.input} /> : null}
        {modal.request.type === "peer-ntfy-present" ? <TextInput multiline editable={false} value={modal.request.code} style={styles.input} /> : null}
        {needsInput ? <TextInput testID="peer-code-input" multiline value={modal.input} onChangeText={onInput} placeholder={ntfy ? "Paste the TPN1 lookup code" : "Paste the peer's full code"} style={styles.input} /> : null}
        {qr && needsInput ? <><ActionButton label="Start camera" onPress={() => { void startCamera(); }} /><Text style={styles.muted}>{cameraStatus}</Text></> : null}
        <View style={styles.buttonRow}><ActionButton label="Cancel" onPress={onCancel} /><ActionButton label={audio ? modal.request.type === "peer-audio-transmit" ? modal.request.expectsResponse ? "Play and listen" : "Play answer" : "Start listening" : needsInput ? "Continue" : "Done"} onPress={onContinue} /></View>
      </View>
    </View>
  );
}

function HostConfirmationModal({
  modal,
  onClose,
  onConfirmResponse,
  onLaunchConfirm,
  onInstallConfirm,
  onGrantToggle
}: {
  readonly modal:
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
      };
  readonly onClose: () => void;
  readonly onConfirmResponse: (approved: boolean) => void;
  readonly onLaunchConfirm: (accept: boolean, grants?: ReadonlyArray<string>) => void;
  readonly onInstallConfirm: (accept: boolean, grants?: ReadonlyArray<string>) => void;
  readonly onGrantToggle: (capabilityId: string, granted: boolean) => void;
}) {
  const title =
    modal.kind === "confirm"
      ? (CONFIRM_KIND_TITLES[modal.request.kind] ?? `Confirm ${modal.request.kind}?`)
      : modal.kind === "install"
        ? modal.review.trusted
          ? `Install ${modal.review.appId} v${modal.review.version} from trusted publisher "${modal.review.trustedLabel ?? "?"}"?`
          : `Install ${modal.review.appId} v${modal.review.version} from UNTRUSTED publisher?`
        : `Run ${modal.review.appId} v${modal.review.version}?`;

  const fingerprint =
    modal.kind === "confirm" ? modal.request.publisherPublicKey : modal.review.publisherPublicKey;

  const capabilities =
    modal.kind === "confirm" ? null : modal.review.capabilities;

  return (
    <View testID="host-confirmation-modal" style={styles.modalOverlay}>
      <View style={styles.modalCard}>
        <Text style={styles.modalTitle}>{title}</Text>
        <Text style={styles.muted}>Publisher key: {fingerprint}</Text>
        {modal.kind === "confirm" ? (
          <>
            <Text style={styles.muted}>Requested by: {modal.request.appId}</Text>
            {Object.entries(modal.request.summary).map(([label, value]) => (
              <Text key={label} style={styles.muted}>
                {label}: {value}
              </Text>
            ))}
            <View style={styles.buttonRow}>
              <ActionButton
                testID="host-confirm-deny"
                label="Deny"
                onPress={() => onConfirmResponse(false)}
              />
              <ActionButton
                testID="host-confirm-approve"
                label="Approve"
                onPress={() => onConfirmResponse(true)}
              />
            </View>
          </>
        ) : (
          <>
            <Text style={styles.muted}>Capabilities requested: {capabilities?.length ?? 0}</Text>
            {capabilities?.map((capability: LaunchReviewCapabilityView) => (
              <Row
                key={capability.id}
                testID={modal.kind === "install" ? `install-grant-${capability.id}` : `launch-grant-${capability.id}`}
                label={capability.id}
                value={modal.grants.includes(capability.id)}
                onChange={(granted) => onGrantToggle(capability.id, granted)}
              />
            ))}
            <View style={styles.buttonRow}>
              {modal.kind === "install" ? (
                <>
                  <ActionButton
                    testID="host-install-cancel"
                    label="Cancel"
                    onPress={() => onInstallConfirm(false)}
                  />
                  <ActionButton
                    testID="host-install-approve"
                    label="Install"
                    onPress={() => onInstallConfirm(true, modal.grants)}
                  />
                </>
              ) : (
                <>
                  <ActionButton testID="host-launch-cancel" label="Cancel" onPress={() => onLaunchConfirm(false)} />
                  <ActionButton
                    testID="host-launch-run"
                    label="Run"
                    onPress={() => onLaunchConfirm(true, modal.grants)}
                  />
                </>
              )}
            </View>
          </>
        )}
        <ActionButton label="Dismiss" onPress={onClose} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101418",
    paddingTop: Platform.OS === "web" ? 24 : 64,
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
  mono: {
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo"
  },
  announceLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
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
  buttonDisabled: {
    opacity: 0.45
  },
  buttonLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  packageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8
  },
  packageTitle: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12
  },
  log: {
    flex: 1,
    backgroundColor: "#0b0f14",
    borderRadius: 12,
    padding: 12,
    marginTop: 8,
    marginBottom: 24
  },
  logLine: {
    color: "#c5d0dc",
    fontFamily: Platform.OS === "web" ? "monospace" : "Menlo",
    fontSize: 12,
    marginBottom: 6
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(0, 0, 0, 0.72)",
    zIndex: 100,
    justifyContent: "center",
    paddingHorizontal: 20
  },
  modalCard: {
    backgroundColor: "#1a212b",
    borderRadius: 12,
    padding: 20,
    gap: 10
  },
  modalTitle: {
    color: "#f4f7fb",
    fontSize: 18,
    fontWeight: "700"
  }
});
