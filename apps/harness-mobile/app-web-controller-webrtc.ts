import {
  outboundWebRtcMediaBytes,
  webBytesToHex,
  webHexToBytes,
} from "./app-web-shared-audio.js";
import type {
  HostToWorkletMessage,
  WorkletToHostMessage,
} from "./worklet/protocol";

export type WebPeerRtcState = {
  pc: any;
  channel: any;
  role: "offer" | "answer";
  localTracks: MediaStreamTrack[];
  remoteTracks: MediaStreamTrack[];
  remoteTrackListeners: Set<(track: MediaStreamTrack) => void>;
  attachTrack(track: MediaStreamTrack): Promise<void>;
};

export type WebRtcMessageHandlerDeps = {
  readonly appendLog: (line: string) => void;
  readonly sendToWorker: (message: HostToWorkletMessage) => void;
  readonly peerRtcRef: React.MutableRefObject<Map<string, WebPeerRtcState>>;
};

export function handleWebRtcWorkerMessage(
  message: WorkletToHostMessage,
  deps: WebRtcMessageHandlerDeps,
): boolean {
  const { appendLog, sendToWorker, peerRtcRef } = deps;

  if (message.type === "peer-webrtc-signal") {
    void (async () => {
      try {
        const PeerConnection = (
          globalThis as { RTCPeerConnection?: new () => any }
        ).RTCPeerConnection;
        if (PeerConnection === undefined) {
          sendToWorker({ type: "peer-chrome-response", token: message.token });
          return;
        }
        const pc = new PeerConnection();
        const state: WebPeerRtcState = {
          pc,
          channel: null as any,
          role: message.role,
          localTracks: [] as MediaStreamTrack[],
          remoteTracks: [] as MediaStreamTrack[],
          remoteTrackListeners: new Set<(track: MediaStreamTrack) => void>(),
          async attachTrack(track: MediaStreamTrack) {
            const kind = track.kind;
            const transceiver = pc
              .getTransceivers?.()
              .find(
                (entry: {
                  sender?: { track?: { kind?: string } | null };
                  receiver?: { track?: { kind?: string } | null };
                  mid: string | null;
                }) => {
                  const senderKind = entry.sender?.track?.kind;
                  const receiverKind = entry.receiver?.track?.kind;
                  return (
                    senderKind === kind ||
                    receiverKind === kind ||
                    (senderKind === undefined &&
                      receiverKind === undefined &&
                      entry.mid !== null)
                  );
                },
              );
            if (
              transceiver?.sender &&
              typeof transceiver.sender.replaceTrack === "function"
            ) {
              await transceiver.sender.replaceTrack(track);
              return;
            }
            pc.addTrack(track);
          },
        };
        peerRtcRef.current.set(message.sessionId, state);
        pc.addEventListener("track", (event: { track: MediaStreamTrack }) => {
          state.remoteTracks.push(event.track);
          for (const listener of state.remoteTrackListeners) {
            listener(event.track);
          }
        });
        if (message.role === "offer") {
          pc.addTransceiver("audio", { direction: "sendrecv" });
          pc.addTransceiver("video", { direction: "sendrecv" });
          state.channel = pc.createDataChannel("twistedpear-peer", {
            ordered: true,
          });
          state.channel.binaryType = "arraybuffer";
          await pc.setLocalDescription(await pc.createOffer());
        } else {
          if (message.remoteSignal === undefined) {
            throw new Error("WebRTC offer is missing");
          }
          pc.addEventListener("datachannel", (event: any) => {
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
        if (local === null) {
          throw new Error("WebRTC did not produce a local signal");
        }
        sendToWorker({
          type: "peer-chrome-response",
          token: message.token,
          signal: JSON.stringify({ type: local.type, sdp: local.sdp }),
        });
      } catch (error) {
        peerRtcRef.current.get(message.sessionId)?.pc.close();
        peerRtcRef.current.delete(message.sessionId);
        appendLog(
          `WebRTC signaling unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
        sendToWorker({ type: "peer-chrome-response", token: message.token });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-establish") {
    void (async () => {
      const state = peerRtcRef.current.get(message.sessionId);
      try {
        if (state === undefined) {
          throw new Error("WebRTC state is missing");
        }
        if (state.role === "offer") {
          if (message.remoteSignal === undefined) {
            throw new Error("WebRTC answer is missing");
          }
          await state.pc.setRemoteDescription(JSON.parse(message.remoteSignal));
        }
        const deadline = Date.now() + 30_000;
        while (Date.now() < deadline && state.channel?.readyState !== "open") {
          if (
            state.pc.connectionState === "failed" ||
            state.pc.connectionState === "closed"
          ) {
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 25));
        }
        if (state.channel?.readyState !== "open") {
          throw new Error(
            state.pc.iceConnectionState === "failed"
              ? "ICE failed; this network may require TURN"
              : "Data channel timed out",
          );
        }
        state.channel.addEventListener("message", (event: MessageEvent) => {
          void (async () => {
            const buffer =
              event.data instanceof Blob
                ? await event.data.arrayBuffer()
                : event.data;
            if (buffer instanceof ArrayBuffer) {
              sendToWorker({
                type: "peer-webrtc-data",
                sessionId: message.sessionId,
                dataHex: webBytesToHex(new Uint8Array(buffer)),
              });
            }
          })();
        });
        sendToWorker({
          type: "peer-chrome-response",
          token: message.token,
          opened: true,
        });
      } catch (error) {
        state?.pc.close();
        peerRtcRef.current.delete(message.sessionId);
        appendLog(
          `WebRTC route unavailable: ${error instanceof Error ? error.message : String(error)}`,
        );
        sendToWorker({
          type: "peer-chrome-response",
          token: message.token,
          opened: false,
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-data-send") {
    const state = peerRtcRef.current.get(message.sessionId);
    if (state?.channel?.readyState === "open") {
      state.channel.send(webHexToBytes(message.dataHex));
      sendToWorker({
        type: "peer-chrome-response",
        token: message.token,
        sent: true,
      });
    } else {
      sendToWorker({
        type: "peer-chrome-response",
        token: message.token,
        sent: false,
      });
    }
    return true;
  }

  if (message.type === "peer-webrtc-media-attach") {
    void (async () => {
      const state = peerRtcRef.current.get(message.sessionId);
      try {
        if (state === undefined) {
          throw new Error("WebRTC state is missing");
        }
        const nav = (
          globalThis as {
            navigator?: {
              mediaDevices?: {
                getUserMedia(constraints: unknown): Promise<MediaStream>;
              };
            };
          }
        ).navigator;
        if (typeof nav?.mediaDevices?.getUserMedia !== "function") {
          throw new Error("getUserMedia is unavailable");
        }
        const audio = message.classId === "microphone";
        const video =
          message.classId === "camera" || message.classId === "screen-capture";
        if (!audio && !video) {
          throw new Error(`Unsupported media class ${message.classId}`);
        }
        const stream = await nav.mediaDevices.getUserMedia({
          audio: audio
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
              }
            : false,
          video: video ? { facingMode: "user" } : false,
        });
        const tracks = stream.getTracks();
        if (tracks.length === 0) {
          throw new Error("No media tracks from getUserMedia");
        }
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
            ? {
                echoCancellation: true,
                noiseSuppression: true,
                autoGainControl: true,
                voiceDuplex: true,
              }
            : null,
        });
      } catch (error) {
        sendToWorker({
          type: "peer-chrome-response",
          token: message.token,
          attached: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-media-stats") {
    void (async () => {
      const state = peerRtcRef.current.get(message.sessionId);
      try {
        if (state === undefined) {
          throw new Error("WebRTC state is missing");
        }
        const bytesSent = await outboundWebRtcMediaBytes(state.pc);
        sendToWorker({
          type: "peer-chrome-response",
          token: message.token,
          bytesSent,
          trackCount: state.localTracks.length,
          connectionState: state.pc.connectionState,
        });
      } catch (error) {
        sendToWorker({
          type: "peer-chrome-response",
          token: message.token,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    })();
    return true;
  }

  if (message.type === "peer-webrtc-media-detach") {
    void (() => {
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
      sendToWorker({
        type: "peer-chrome-response",
        token: message.token,
        attached: false,
      });
      return Promise.resolve();
    })();
    return true;
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
    return true;
  }

  return false;
}
