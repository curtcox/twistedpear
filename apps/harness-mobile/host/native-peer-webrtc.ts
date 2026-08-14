/**
 * Native host WebRTC IPC for peer signaling / media-track attach.
 * Requires RTCPeerConnection + getUserMedia on globalThis (e.g. react-native-webrtc
 * registerGlobals). Without them, replies stay fail-closed with an explicit error.
 */

import type {
  HostToWorkletMessage,
  WorkletToHostMessage,
} from "../worklet/protocol";

type MediaTrackLike = {
  kind: string;
  stop(): void;
};

type PeerRtcState = {
  pc: {
    connectionState: string;
    iceGatheringState: string;
    iceConnectionState: string;
    localDescription: { type: string; sdp: string } | null;
    addTransceiver(kind: string, init: { direction: string }): void;
    addTrack(track: MediaTrackLike): unknown;
    createDataChannel(
      label: string,
      init: { ordered: boolean },
    ): PeerRtcChannel;
    createOffer(): Promise<{ type: string; sdp: string }>;
    createAnswer(): Promise<{ type: string; sdp: string }>;
    setLocalDescription(desc: unknown): Promise<void>;
    setRemoteDescription(desc: unknown): Promise<void>;
    getTransceivers?(): ReadonlyArray<{
      mid: string | null;
      sender?: {
        track?: { kind?: string } | null;
        replaceTrack?(track: MediaTrackLike | null): Promise<void>;
      };
      receiver?: { track?: { kind?: string } | null };
    }>;
    getStats(): Promise<Map<string, { type: string; bytesSent?: number }>>;
    addEventListener(type: string, listener: (...args: any[]) => void): void;
    removeEventListener(type: string, listener: (...args: any[]) => void): void;
    close(): void;
  };
  channel: PeerRtcChannel | null;
  role: "offer" | "answer";
  localTracks: MediaTrackLike[];
  attachTrack(track: MediaTrackLike): Promise<void>;
};

type PeerRtcChannel = {
  readyState: string;
  binaryType: string;
  send(data: ArrayBuffer | Uint8Array): void;
  close(): void;
  addEventListener(type: string, listener: (...args: any[]) => void): void;
};

export type NativePeerRtcStore = Map<string, PeerRtcType>;

type PeerRtcType = PeerRtcState;

type Send = (message: HostToWorkletMessage) => void;

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let i = 0; i < out.length; i += 1)
    out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

type NativeRtcGlobals = {
  RTCPeerConnection?: new () => PeerRtcState["pc"];
  navigator?: {
    mediaDevices?: {
      getUserMedia(
        constraints: unknown,
      ): Promise<{ getTracks(): MediaTrackLike[] }>;
    };
  };
};

function nativeRtcFromGlobal(global: NativeRtcGlobals): {
  RTCPeerConnection: new () => PeerRtcState["pc"];
  mediaDevices: {
    getUserMedia(
      constraints: unknown,
    ): Promise<{ getTracks(): MediaTrackLike[] }>;
  };
} | null {
  if (
    typeof global.RTCPeerConnection !== "function" ||
    typeof global.navigator?.mediaDevices?.getUserMedia !== "function"
  ) {
    return null;
  }
  return {
    RTCPeerConnection: global.RTCPeerConnection,
    mediaDevices: global.navigator.mediaDevices,
  };
}

function resolveNativeRtc(): {
  RTCPeerConnection: new () => PeerRtcState["pc"];
  mediaDevices: {
    getUserMedia(
      constraints: unknown,
    ): Promise<{ getTracks(): MediaTrackLike[] }>;
  };
} | null {
  const global = globalThis as unknown as NativeRtcGlobals;
  const existing = nativeRtcFromGlobal(global);
  if (existing !== null) return existing;
  try {
    // Fallback if index.js did not register yet (e.g. hot reload).
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const webrtc = require("react-native-webrtc") as {
      registerGlobals?: () => void;
    };
    webrtc.registerGlobals?.();
  } catch {
    return null;
  }
  return nativeRtcFromGlobal(global);
}

function rtcStatsValues(report: unknown): Iterable<unknown> {
  if (
    report != null &&
    typeof (report as { values?: () => Iterable<unknown> }).values ===
      "function"
  ) {
    return (report as { values: () => Iterable<unknown> }).values();
  }
  if (Array.isArray(report)) return report;
  if (report != null && typeof report === "object") {
    return Object.values(report as unknown as Record<string, unknown>);
  }
  return [];
}

const OUTBOUND_STAT_TYPES = new Set([
  "outbound-rtp",
  "outboundrtp",
  "ssrc",
  "track",
  "media-source",
]);

function outboundRowBytesSent(entry: unknown): number | null {
  if (entry == null || typeof entry !== "object") return null;
  const row = entry as {
    type?: string;
    bytesSent?: number;
    mediaType?: string;
    kind?: string;
    isRemote?: boolean;
  };
  if (typeof row.bytesSent !== "number" || row.bytesSent <= 0) return null;
  if (row.isRemote === true) return null;
  return row.bytesSent;
}

function localOutboundMediaBytes(entry: unknown): number {
  const bytesSent = outboundRowBytesSent(entry);
  if (bytesSent === null) return 0;
  const row = entry as { type?: string; mediaType?: string; kind?: string };
  const type = String(row.type ?? "").toLowerCase();
  const media = String(row.mediaType ?? row.kind ?? "").toLowerCase();
  if (OUTBOUND_STAT_TYPES.has(type) || media === "audio" || media === "video") {
    return bytesSent;
  }
  return 0;
}

async function outboundMediaBytes(pc: PeerRtcState["pc"]): Promise<number> {
  if (typeof pc.getStats !== "function") return 0;
  let bytes = 0;
  for (const entry of rtcStatsValues(await pc.getStats())) {
    bytes += localOutboundMediaBytes(entry);
  }
  return bytes;
}

async function ensureMicrophonePermission(): Promise<void> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const rn = require("react-native") as {
      Platform?: { OS?: string };
      PermissionsAndroid?: {
        PERMISSIONS: { RECORD_AUDIO: string };
        RESULTS: { GRANTED: string };
        request(permission: string): Promise<string>;
        check?(permission: string): Promise<boolean>;
      };
    };
    if (rn.Platform?.OS !== "android" || rn.PermissionsAndroid === undefined)
      return;
    const permission = rn.PermissionsAndroid.PERMISSIONS.RECORD_AUDIO;
    if (typeof rn.PermissionsAndroid.check === "function") {
      const already = await rn.PermissionsAndroid.check(permission);
      if (already) return;
    }
    const result = await rn.PermissionsAndroid.request(permission);
    if (result !== rn.PermissionsAndroid.RESULTS.GRANTED) {
      throw new Error("Microphone permission was denied");
    }
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "Microphone permission was denied"
    )
      throw error;
    // Non-Android or missing PermissionsAndroid — getUserMedia will fail closed on its own.
  }
}

async function captureLocalMedia(
  mediaDevices: {
    getUserMedia(
      constraints: unknown,
    ): Promise<{ getTracks(): MediaTrackLike[] }>;
  },
  classId: string,
): Promise<MediaTrackLike[]> {
  const audio = classId === "microphone";
  const video = classId === "camera" || classId === "screen-capture";
  if (!audio && !video) throw new Error(`Unsupported media class ${classId}`);
  if (audio) await ensureMicrophonePermission();
  const voiceConstraints = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };
  try {
    const stream = await mediaDevices.getUserMedia({
      audio: audio ? voiceConstraints : false,
      video: video ? { facingMode: "user" } : false,
    });
    return stream.getTracks();
  } catch (error) {
    // Emulator / older RN WebRTC builds sometimes reject AEC constraint bags.
    if (!audio) throw error;
    const stream = await mediaDevices.getUserMedia({
      audio: true,
      video: false,
    });
    return stream.getTracks();
  }
}

function unsupportedError(): Error {
  return new Error(
    "Native WebRTC is unavailable (rebuild the native app after installing react-native-webrtc)",
  );
}

export function createNativePeerRtcStore(): NativePeerRtcStore {
  return new Map();
}

export function handleNativePeerWebRtcMessage(
  message: WorkletToHostMessage,
  store: NativePeerRtcStore,
  send: Send,
  appendLog: (line: string) => void,
): boolean {
  if (message.type === "peer-webrtc-signal") {
    void handleNativeRtcSignal(message, store, send, appendLog);
    return true;
  }
  if (message.type === "peer-webrtc-establish") {
    void handleNativeRtcEstablish(message, store, send, appendLog);
    return true;
  }
  if (message.type === "peer-webrtc-data-send") {
    handleNativeRtcDataSend(message, store, send);
    return true;
  }
  if (message.type === "peer-webrtc-media-attach") {
    void handleNativeRtcMediaAttach(message, store, send);
    return true;
  }
  if (message.type === "peer-webrtc-media-stats") {
    void handleNativeRtcMediaStats(message, store, send);
    return true;
  }
  if (message.type === "peer-webrtc-media-detach") {
    handleNativeRtcMediaDetach(message, store, send);
    return true;
  }
  if (message.type === "peer-webrtc-close") {
    handleNativeRtcClose(message, store);
    return true;
  }
  return false;
}

async function attachNativeRtcTrack(
  pc: PeerRtcState["pc"],
  track: MediaTrackLike,
): Promise<void> {
  const kind = track.kind;
  const transceiver = pc.getTransceivers?.().find((entry) => {
    const senderKind = entry.sender?.track?.kind;
    const receiverKind = entry.receiver?.track?.kind;
    return (
      senderKind === kind ||
      receiverKind === kind ||
      (senderKind === undefined &&
        receiverKind === undefined &&
        entry.mid !== null)
    );
  });
  if (
    transceiver?.sender &&
    typeof transceiver.sender.replaceTrack === "function"
  ) {
    await transceiver.sender.replaceTrack(track);
    return;
  }
  pc.addTrack(track);
}

async function handleNativeRtcSignal(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-signal" }>,
  store: NativePeerRtcStore,
  send: Send,
  appendLog: (line: string) => void,
): Promise<void> {
  try {
    const rtc = resolveNativeRtc();
    if (rtc === null) throw unsupportedError();
    const pc = new rtc.RTCPeerConnection();
    const state: PeerRtcState = {
      pc,
      channel: null,
      role: message.role,
      localTracks: [],
      attachTrack(track) {
        return attachNativeRtcTrack(pc, track);
      },
    };
    store.set(message.sessionId, state);
    if (message.role === "offer") {
      pc.addTransceiver("audio", { direction: "sendrecv" });
      pc.addTransceiver("video", { direction: "sendrecv" });
      state.channel = pc.createDataChannel("twistedpear-peer", {
        ordered: true,
      });
      state.channel.binaryType = "arraybuffer";
      await pc.setLocalDescription(await pc.createOffer());
    } else {
      if (message.remoteSignal === undefined)
        throw new Error("WebRTC offer is missing");
      pc.addEventListener(
        "datachannel",
        (event: { channel: PeerRtcChannel }) => {
          state.channel = event.channel;
          state.channel.binaryType = "arraybuffer";
        },
      );
      await pc.setRemoteDescription(JSON.parse(message.remoteSignal));
      await pc.setLocalDescription(await pc.createAnswer());
    }
    if (pc.iceGatheringState !== "complete") {
      await new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, 2_000);
        const changed = () => {
          if (pc.iceGatheringState === "complete") {
            clearTimeout(timer);
            pc.removeEventListener("icegatheringstatechange", changed);
            resolve();
          }
        };
        pc.addEventListener("icegatheringstatechange", changed);
      });
    }
    const local = pc.localDescription;
    if (local === null)
      throw new Error("WebRTC did not produce a local signal");
    send({
      type: "peer-chrome-response",
      token: message.token,
      signal: JSON.stringify({ type: local.type, sdp: local.sdp }),
    });
  } catch (error) {
    store.get(message.sessionId)?.pc.close();
    store.delete(message.sessionId);
    appendLog(
      `WebRTC signaling unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    send({
      type: "peer-chrome-response",
      token: message.token,
      ...(error instanceof Error ? { error: error.message } : {}),
    });
  }
}

async function handleNativeRtcEstablish(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-establish" }>,
  store: NativePeerRtcStore,
  send: Send,
  appendLog: (line: string) => void,
): Promise<void> {
  const state = store.get(message.sessionId);
  try {
    await applyNativeRtcRemoteAnswer(state, message);
    if (state === undefined) {
      throw new Error("WebRTC state is missing");
    }
    await waitForNativeRtcChannel(state);
    attachNativeRtcDataListener(state, message.sessionId, send);
    send({
      type: "peer-chrome-response",
      token: message.token,
      opened: true,
    });
  } catch (error) {
    state?.pc.close();
    store.delete(message.sessionId);
    appendLog(
      `WebRTC route unavailable: ${error instanceof Error ? error.message : String(error)}`,
    );
    send({
      type: "peer-chrome-response",
      token: message.token,
      opened: false,
      ...(error instanceof Error ? { error: error.message } : {}),
    });
  }
}

async function applyNativeRtcRemoteAnswer(
  state: PeerRtcState | undefined,
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-establish" }>,
): Promise<void> {
  if (state === undefined) throw new Error("WebRTC state is missing");
  if (state.role !== "offer") {
    return;
  }
  if (message.remoteSignal === undefined)
    throw new Error("WebRTC answer is missing");
  await state.pc.setRemoteDescription(JSON.parse(message.remoteSignal));
}

async function waitForNativeRtcChannel(state: PeerRtcState): Promise<void> {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline && state.channel?.readyState !== "open") {
    if (
      state.pc.connectionState === "failed" ||
      state.pc.connectionState === "closed"
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 25));
  }
  if (state.channel?.readyState === "open") {
    return;
  }
  throw new Error(
    state.pc.iceConnectionState === "failed"
      ? "ICE failed; this network may require TURN"
      : "Data channel timed out",
  );
}

function attachNativeRtcDataListener(
  state: PeerRtcState,
  sessionId: string,
  send: Send,
): void {
  state.channel.addEventListener(
    "message",
    (event: { data: ArrayBuffer | Blob | ArrayBufferView }) => {
      void forwardNativeRtcData(event, sessionId, send);
    },
  );
}

async function forwardNativeRtcData(
  event: { data: ArrayBuffer | Blob | ArrayBufferView },
  sessionId: string,
  send: Send,
): Promise<void> {
  const buffer = await nativeRtcEventBuffer(event.data);
  if (buffer instanceof ArrayBuffer) {
    send({
      type: "peer-webrtc-data",
      sessionId,
      dataHex: bytesToHex(new Uint8Array(buffer)),
    });
  }
}

async function nativeRtcEventBuffer(
  data: ArrayBuffer | Blob | ArrayBufferView,
): Promise<ArrayBuffer | ArrayBufferView> {
  if (data instanceof Blob) {
    return data.arrayBuffer();
  }
  if (data instanceof ArrayBuffer) {
    return data;
  }
  return data.buffer.slice(
    data.byteOffset,
    data.byteOffset + data.byteLength,
  );
}

function handleNativeRtcDataSend(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-data-send" }>,
  store: NativePeerRtcStore,
  send: Send,
): void {
  const state = store.get(message.sessionId);
  if (state?.channel?.readyState === "open") {
    state.channel.send(hexToBytes(message.dataHex));
    send({ type: "peer-chrome-response", token: message.token, sent: true });
  } else {
    send({ type: "peer-chrome-response", token: message.token, sent: false });
  }
}

async function handleNativeRtcMediaAttach(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-media-attach" }>,
  store: NativePeerRtcStore,
  send: Send,
): Promise<void> {
  const state = store.get(message.sessionId);
  try {
    if (state === undefined) throw new Error("WebRTC state is missing");
    const rtc = resolveNativeRtc();
    if (rtc === null) throw unsupportedError();
    const tracks = await captureLocalMedia(rtc.mediaDevices, message.classId);
    if (tracks.length === 0)
      throw new Error("No media tracks from getUserMedia");
    for (const track of tracks) {
      await state.attachTrack(track);
      state.localTracks.push(track);
    }
    await waitForNativeRtcConnected(state);
    const bytesSent = await waitForNativeOutboundBytes(state.pc);
    send({
      type: "peer-chrome-response",
      token: message.token,
      attached: true,
      trackCount: tracks.length,
      bytesSent,
      connectionState: state.pc.connectionState,
      voiceProcessing: nativeRtcVoiceProcessing(message.classId === "microphone"),
    });
  } catch (error) {
    send({
      type: "peer-chrome-response",
      token: message.token,
      attached: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function waitForNativeRtcConnected(state: PeerRtcState): Promise<void> {
  const connectDeadline = Date.now() + 8_000;
  while (
    Date.now() < connectDeadline &&
    state.pc.connectionState !== "connected" &&
    state.pc.iceConnectionState !== "connected" &&
    state.pc.iceConnectionState !== "completed"
  ) {
    if (
      state.pc.connectionState === "failed" ||
      state.pc.connectionState === "closed"
    )
      break;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

async function waitForNativeOutboundBytes(pc: PeerRtcState["pc"]): Promise<number> {
  let bytesSent = 0;
  for (let attempt = 0; attempt < 60 && bytesSent === 0; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 250));
    bytesSent = await outboundMediaBytes(pc);
  }
  return bytesSent;
}

function nativeRtcVoiceProcessing(audio: boolean): {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
  voiceDuplex: boolean;
} | null {
  if (!audio) {
    return null;
  }
  return {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    voiceDuplex: true,
  };
}

async function handleNativeRtcMediaStats(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-media-stats" }>,
  store: NativePeerRtcStore,
  send: Send,
): Promise<void> {
  const state = store.get(message.sessionId);
  try {
    if (state === undefined) throw new Error("WebRTC state is missing");
    const bytesSent = await outboundMediaBytes(state.pc);
    send({
      type: "peer-chrome-response",
      token: message.token,
      bytesSent,
      trackCount: state.localTracks.length,
      connectionState: state.pc.connectionState,
    });
  } catch (error) {
    send({
      type: "peer-chrome-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

function handleNativeRtcMediaDetach(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-media-detach" }>,
  store: NativePeerRtcStore,
  send: Send,
): void {
  stopNativeRtcTracks(
    store.get(message.sessionId),
    message.classId === "microphone" ? "audio" : "video",
    message.classId === "screen-capture",
  );
  send({
    type: "peer-chrome-response",
    token: message.token,
    attached: false,
  });
}

function stopNativeRtcTracks(
  state: PeerRtcState | undefined,
  kind: string,
  detachAll: boolean,
): void {
  if (state === undefined) {
    return;
  }
  for (const track of [...state.localTracks]) {
    if (track.kind !== kind && !detachAll) {
      continue;
    }
    try {
      track.stop();
    } catch {
      /* ignore */
    }
    const index = state.localTracks.indexOf(track);
    if (index >= 0) {
      state.localTracks.splice(index, 1);
    }
  }
}

function handleNativeRtcClose(
  message: Extract<WorkletToHostMessage, { type: "peer-webrtc-close" }>,
  store: NativePeerRtcStore,
): void {
  const state = store.get(message.sessionId);
  for (const track of state?.localTracks ?? []) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
  state?.channel?.close();
  state?.pc.close();
  store.delete(message.sessionId);
}
