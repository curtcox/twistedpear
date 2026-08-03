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
export const audioHex = (bytes: Uint8Array) => [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
export const audioUnhex = (text: string) => Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

export async function outboundWebRtcMediaBytes(pc: { getStats(): Promise<Map<string, { type: string; bytesSent?: number }>> }): Promise<number> {
  if (typeof pc.getStats !== "function") return 0;
  const report = await pc.getStats();
  let bytes = 0;
  for (const entry of report.values()) {
    if (entry.type === "outbound-rtp" && typeof entry.bytesSent === "number") {
      bytes += entry.bytesSent;
    }
  }
  return bytes;
}

export async function playPeerAudio(framesHex: ReadonlyArray<string>): Promise<void> {
  const AudioContextClass = (globalThis as unknown as { AudioContext?: new () => any; webkitAudioContext?: new () => any }).AudioContext ?? (globalThis as unknown as { webkitAudioContext?: new () => any }).webkitAudioContext;
  if (AudioContextClass === undefined) throw new Error("Web Audio playback is unavailable");
  const context = new AudioContextClass(); await context.resume(); let at = context.currentTime + 0.1;
  for (const frameHex of framesHex) { const pcm = encodePeerAudioFsk(audioUnhex(frameHex), { sampleRate: context.sampleRate }); const buffer = context.createBuffer(1, pcm.length, context.sampleRate); buffer.copyToChannel(pcm, 0); const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.start(at); at += pcm.length / context.sampleRate + 0.2; }
  await new Promise((resolve) => setTimeout(resolve, Math.ceil(Math.max(0, at - context.currentTime) * 1_000))); await context.close();
}

export async function recordPeerAudio(durationMs = 15_000): Promise<ReadonlyArray<string>> {
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

export const DEFAULT_PASSPHRASE = "harness-web-dev";
export const MAX_ANNOUNCES = 50;

export const helloWidgetTree = validateWidgetTree({
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

export const chatWidgetTree = validateWidgetTree({
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

export function defaultGatewayUrl(): string {
  const location = (globalThis as { location?: { protocol: string; host: string } }).location;
  if (location === undefined) {
    return "ws://127.0.0.1:9480";
  }

  const protocol = location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${location.host}`;
}

export function webHexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return bytes;
}

export function webBytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

export async function playInboundAudioFrame(dataHex: string, encoding: string): Promise<void> {
  const frame = webHexToBytes(dataHex);
  if (frame.length < 36 || String.fromCharCode(...frame.subarray(0, 4)) !== "TPD2" || frame[5] !== 2) throw new Error("Inbound audio frame is malformed.");
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength); const payloadLength = view.getUint32(16, false); if (payloadLength !== frame.length - 36) throw new Error("Inbound audio frame length mismatch.");
  const payload = frame.slice(36); const sampleRate = encoding.includes("48k") ? 48_000 : encoding.includes("8k") ? 8_000 : 16_000;
  const AudioContextCtor = (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext; if (AudioContextCtor === undefined) throw new Error("Web Audio is unavailable.");
  const context = new AudioContextCtor({ sampleRate });
  const play = (samples: Float32Array) => { const buffer = context.createBuffer(1, samples.length, sampleRate); buffer.copyToChannel(samples, 0); const source = context.createBufferSource(); source.buffer = buffer; source.connect(context.destination); source.onended = () => { void context.close(); }; source.start(); };
  if (!encoding.includes("opus")) { const copy = payload.slice(); play(new Float32Array(copy.buffer)); return; }
  const decoded = await webDecodeOpus({ codec: "opus", sampleKind: "audio", bitrateBps: 24_000, sampleRate, channels: 1 }, Number(view.getBigUint64(24, false)), payload);
  const copy = decoded.slice();
  play(new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4));
}

export async function handleWebMediaCodecRequest(
  message: {
    readonly token: string;
    readonly op: "encode" | "decode";
    readonly configuration: {
      readonly codec: string;
      readonly sampleKind: string;
      readonly bitrateBps: number;
      readonly sampleRate?: number;
      readonly channels?: number;
    };
    readonly captureAtUs: number;
    readonly dataHex: string;
  },
  sendToWorker: (reply: { type: "media-codec-response"; token: string; dataHex?: string; error?: string }) => void
): Promise<void> {
  try {
    const bytes = webHexToBytes(message.dataHex);
    const result =
      message.op === "encode"
        ? await webEncodeOpus(message.configuration, message.captureAtUs, bytes)
        : await webDecodeOpus(message.configuration, message.captureAtUs, bytes);
    sendToWorker({ type: "media-codec-response", token: message.token, dataHex: webBytesToHex(result) });
  } catch (error) {
    sendToWorker({
      type: "media-codec-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function webEncodeOpus(
  configuration: { readonly codec: string; readonly sampleKind: string; readonly bitrateBps: number; readonly sampleRate?: number; readonly channels?: number },
  captureAtUs: number,
  bytes: Uint8Array
): Promise<Uint8Array> {
  if (configuration.sampleKind !== "audio" || (configuration.codec !== "opus" && configuration.codec !== "pcm")) {
    throw new Error("Web media codec configuration is unsupported.");
  }
  if (configuration.codec === "pcm") return bytes.slice();
  const Encoder = (globalThis as any).AudioEncoder;
  const Audio = (globalThis as any).AudioData;
  if (Encoder === undefined || Audio === undefined) throw new Error("WebCodecs Opus encode is unavailable.");
  const channels = configuration.channels ?? 1;
  if (bytes.byteLength % (4 * channels) !== 0) throw new Error("PCM input is not interleaved float32 audio.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => { if (settled) return; settled = true; fn(); };
    const encoder = new Encoder({
      output(chunk: any) {
        const output = new Uint8Array(chunk.byteLength);
        chunk.copyTo(output);
        settle(() => resolve(output));
      },
      error(error: unknown) { settle(() => reject(error)); }
    });
    try {
      encoder.configure({
        codec: "opus",
        sampleRate: configuration.sampleRate ?? 16_000,
        numberOfChannels: channels,
        bitrate: configuration.bitrateBps
      });
      const copy = bytes.slice();
      const audio = new Audio({
        format: "f32",
        sampleRate: configuration.sampleRate ?? 16_000,
        numberOfFrames: copy.byteLength / (4 * channels),
        numberOfChannels: channels,
        timestamp: captureAtUs,
        data: copy.buffer
      });
      encoder.encode(audio);
      audio.close();
      void encoder.flush().finally(() => { try { encoder.close(); } catch { /* already closed */ } });
    } catch (error) {
      try { encoder.close(); } catch { /* already closed */ }
      settle(() => reject(error));
    }
  });
}

export async function webDecodeOpus(
  configuration: { readonly codec: string; readonly sampleKind: string; readonly bitrateBps: number; readonly sampleRate?: number; readonly channels?: number },
  captureAtUs: number,
  bytes: Uint8Array
): Promise<Uint8Array> {
  if (configuration.sampleKind !== "audio" || (configuration.codec !== "opus" && configuration.codec !== "pcm")) {
    throw new Error("Web media codec configuration is unsupported.");
  }
  if (configuration.codec === "pcm") return bytes.slice();
  const Decoder = (globalThis as any).AudioDecoder;
  const Chunk = (globalThis as any).EncodedAudioChunk;
  if (Decoder === undefined || Chunk === undefined) throw new Error("WebCodecs Opus decode is unavailable.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => { if (settled) return; settled = true; fn(); };
    const decoder = new Decoder({
      output(audio: any) {
        const output = new Uint8Array(audio.allocationSize({ planeIndex: 0 }));
        audio.copyTo(output, { planeIndex: 0, format: "f32" });
        audio.close();
        settle(() => resolve(output));
      },
      error(error: unknown) { settle(() => reject(error)); }
    });
    try {
      decoder.configure({
        codec: "opus",
        sampleRate: configuration.sampleRate ?? 16_000,
        numberOfChannels: configuration.channels ?? 1
      });
      decoder.decode(new Chunk({ type: "key", timestamp: captureAtUs, data: bytes }));
      void decoder.flush().finally(() => { try { decoder.close(); } catch { /* already closed */ } });
    } catch (error) {
      try { decoder.close(); } catch { /* already closed */ }
      settle(() => reject(error));
    }
  });
}

export function formatBytes(value: number | null): string {
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

export function Row({
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

export function ActionButton({
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
  "freenet-update": "Publish an irreversible Freenet contract update?"
};

export function PeerChromeModal({ modal, onInput, onCancel, onContinue }: {
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

export function HostConfirmationModal({
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

export const styles = StyleSheet.create({
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
  deviceRow: {
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#141a22",
    marginBottom: 6,
    gap: 4
  },
  deviceLabel: {
    color: "#f4f7fb",
    fontSize: 13
  },
  deviceMeta: {
    color: "#9aa7b8",
    fontSize: 11
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
