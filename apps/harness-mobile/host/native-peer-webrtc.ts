/**
 * Native host WebRTC IPC for peer signaling / media-track attach.
 * Requires RTCPeerConnection + getUserMedia on globalThis (e.g. react-native-webrtc
 * registerGlobals). Without them, replies stay fail-closed with an explicit error.
 */

import type { HostToWorkletMessage, WorkletToHostMessage } from "../worklet/protocol";

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
    createDataChannel(label: string, init: { ordered: boolean }): PeerRtcChannel;
    createOffer(): Promise<{ type: string; sdp: string }>;
    createAnswer(): Promise<{ type: string; sdp: string }>;
    setLocalDescription(desc: unknown): Promise<void>;
    setRemoteDescription(desc: unknown): Promise<void>;
    getTransceivers?(): ReadonlyArray<{
      mid: string | null;
      sender?: { track?: { kind?: string } | null; replaceTrack?(track: MediaTrackLike | null): Promise<void> };
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
  for (let i = 0; i < out.length; i += 1) out[i] = Number.parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function resolveNativeRtc(): {
  RTCPeerConnection: new () => PeerRtcState["pc"];
  mediaDevices: { getUserMedia(constraints: unknown): Promise<{ getTracks(): MediaTrackLike[] }> };
} | null {
  const global = globalThis as unknown as {
    RTCPeerConnection?: new () => PeerRtcState["pc"];
    navigator?: { mediaDevices?: { getUserMedia(constraints: unknown): Promise<{ getTracks(): MediaTrackLike[] }> } };
  };
  if (typeof global.RTCPeerConnection !== "function" || typeof global.navigator?.mediaDevices?.getUserMedia !== "function") {
    return null;
  }
  return { RTCPeerConnection: global.RTCPeerConnection, mediaDevices: global.navigator.mediaDevices };
}

async function outboundMediaBytes(pc: PeerRtcState["pc"]): Promise<number> {
  if (typeof pc.getStats !== "function") return 0;
  const report = await pc.getStats();
  let bytes = 0;
  for (const entry of report.values()) {
    if (entry.type === "outbound-rtp" && typeof entry.bytesSent === "number") bytes += entry.bytesSent;
  }
  return bytes;
}

function unsupportedError(): Error {
  return new Error("Native WebRTC is unavailable (install react-native-webrtc and call registerGlobals)");
}

export function createNativePeerRtcStore(): NativePeerRtcStore {
  return new Map();
}

export function handleNativePeerWebRtcMessage(
  message: WorkletToHostMessage,
  store: NativePeerRtcStore,
  send: Send,
  appendLog: (line: string) => void
): boolean {
  if (message.type === "peer-webrtc-signal") {
    void (async () => {
      try {
        const rtc = resolveNativeRtc();
        if (rtc === null) throw unsupportedError();
        const pc = new rtc.RTCPeerConnection();
        const state: PeerRtcState = {
          pc,
          channel: null,
          role: message.role,
          localTracks: [],
          async attachTrack(track) {
            const kind = track.kind;
            const transceiver = pc.getTransceivers?.().find((entry) => {
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
        store.set(message.sessionId, state);
        if (message.role === "offer") {
          pc.addTransceiver("audio", { direction: "sendrecv" });
          pc.addTransceiver("video", { direction: "sendrecv" });
          state.channel = pc.createDataChannel("twistedpear-peer", { ordered: true });
          state.channel.binaryType = "arraybuffer";
          await pc.setLocalDescription(await pc.createOffer());
        } else {
          if (message.remoteSignal === undefined) throw new Error("WebRTC offer is missing");
          pc.addEventListener("datachannel", (event: { channel: PeerRtcChannel }) => {
            state.channel = event.channel;
            state.channel.binaryType = "arraybuffer";
          });
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
        if (local === null) throw new Error("WebRTC did not produce a local signal");
        send({ type: "peer-chrome-response", token: message.token, signal: JSON.stringify({ type: local.type, sdp: local.sdp }) });
      } catch (error) {
        store.get(message.sessionId)?.pc.close();
        store.delete(message.sessionId);
        appendLog(`WebRTC signaling unavailable: ${error instanceof Error ? error.message : String(error)}`);
        send({
          type: "peer-chrome-response",
          token: message.token,
          ...(error instanceof Error ? { error: error.message } : {})
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-establish") {
    void (async () => {
      const state = store.get(message.sessionId);
      try {
        if (state === undefined) throw new Error("WebRTC state is missing");
        if (state.role === "offer") {
          if (message.remoteSignal === undefined) throw new Error("WebRTC answer is missing");
          await state.pc.setRemoteDescription(JSON.parse(message.remoteSignal));
        }
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline && state.channel?.readyState !== "open") {
          if (state.pc.connectionState === "failed" || state.pc.connectionState === "closed") break;
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        if (state.channel?.readyState !== "open") {
          throw new Error(state.pc.iceConnectionState === "failed" ? "ICE failed; this network may require TURN" : "Data channel timed out");
        }
        state.channel.addEventListener("message", (event: { data: ArrayBuffer | Blob | ArrayBufferView }) => {
          void (async () => {
            const buffer =
              event.data instanceof Blob
                ? await event.data.arrayBuffer()
                : event.data instanceof ArrayBuffer
                  ? event.data
                  : event.data.buffer.slice(event.data.byteOffset, event.data.byteOffset + event.data.byteLength);
            if (buffer instanceof ArrayBuffer) {
              send({ type: "peer-webrtc-data", sessionId: message.sessionId, dataHex: bytesToHex(new Uint8Array(buffer)) });
            }
          })();
        });
        send({ type: "peer-chrome-response", token: message.token, opened: true });
      } catch (error) {
        state?.pc.close();
        store.delete(message.sessionId);
        appendLog(`WebRTC route unavailable: ${error instanceof Error ? error.message : String(error)}`);
        send({
          type: "peer-chrome-response",
          token: message.token,
          opened: false,
          ...(error instanceof Error ? { error: error.message } : {})
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-data-send") {
    const state = store.get(message.sessionId);
    if (state?.channel?.readyState === "open") {
      state.channel.send(hexToBytes(message.dataHex));
      send({ type: "peer-chrome-response", token: message.token, sent: true });
    } else {
      send({ type: "peer-chrome-response", token: message.token, sent: false });
    }
    return true;
  }

  if (message.type === "peer-webrtc-media-attach") {
    void (async () => {
      const state = store.get(message.sessionId);
      try {
        if (state === undefined) throw new Error("WebRTC state is missing");
        const rtc = resolveNativeRtc();
        if (rtc === null) throw unsupportedError();
        const audio = message.classId === "microphone";
        const video = message.classId === "camera" || message.classId === "screen-capture";
        if (!audio && !video) throw new Error(`Unsupported media class ${message.classId}`);
        const stream = await rtc.mediaDevices.getUserMedia({
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
          bytesSent = await outboundMediaBytes(state.pc);
        }
        send({
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
        send({
          type: "peer-chrome-response",
          token: message.token,
          attached: false,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-media-stats") {
    void (async () => {
      const state = store.get(message.sessionId);
      try {
        if (state === undefined) throw new Error("WebRTC state is missing");
        const bytesSent = await outboundMediaBytes(state.pc);
        send({
          type: "peer-chrome-response",
          token: message.token,
          bytesSent,
          trackCount: state.localTracks.length,
          connectionState: state.pc.connectionState
        });
      } catch (error) {
        send({
          type: "peer-chrome-response",
          token: message.token,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-media-detach") {
    const state = store.get(message.sessionId);
    const kind = message.classId === "microphone" ? "audio" : "video";
    for (const track of [...(state?.localTracks ?? [])]) {
      if (track.kind === kind || message.classId === "screen-capture") {
        try {
          track.stop();
        } catch {
          /* ignore */
        }
        const index = state?.localTracks.indexOf(track) ?? -1;
        if (index >= 0) state?.localTracks.splice(index, 1);
      }
    }
    send({ type: "peer-chrome-response", token: message.token, attached: false });
    return true;
  }

  if (message.type === "peer-webrtc-close") {
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
    return true;
  }

  return false;
}
