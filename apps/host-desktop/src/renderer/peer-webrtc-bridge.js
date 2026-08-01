/** Chromium-owned WebRTC signaling, data channel, and media-track attach for desktop. */

const sessions = new Map();

/**
 * @param {any} message
 * @param {(reply: Record<string, unknown>) => void} send
 */
export async function handlePeerWebRtcMessage(message, send) {
  try {
    if (message.type === "peer-webrtc-signal") {
      await signal(message, send);
      return;
    }
    if (message.type === "peer-webrtc-establish") {
      await establish(message, send);
      return;
    }
    if (message.type === "peer-webrtc-data-send") {
      const state = sessions.get(message.sessionId);
      if (state?.channel?.readyState === "open") {
        state.channel.send(unhex(message.dataHex));
        send({ type: "peer-chrome-response", token: message.token, sent: true });
      } else {
        send({ type: "peer-chrome-response", token: message.token, sent: false });
      }
      return;
    }
    if (message.type === "peer-webrtc-media-attach") {
      await attachMedia(message, send);
      return;
    }
    if (message.type === "peer-webrtc-media-detach") {
      detachMedia(message);
      send({ type: "peer-chrome-response", token: message.token, attached: false });
      return;
    }
    if (message.type === "peer-webrtc-close") {
      closeSession(message.sessionId);
    }
  } catch (error) {
    if (typeof message.token === "string") {
      send({
        type: "peer-chrome-response",
        token: message.token,
        error: error instanceof Error ? error.message : String(error),
        opened: false,
        attached: false
      });
    }
  }
}

async function signal(message, send) {
  const PeerConnection = globalThis.RTCPeerConnection;
  if (typeof PeerConnection !== "function") {
    send({ type: "peer-chrome-response", token: message.token });
    return;
  }
  const pc = new PeerConnection();
  const state = {
    pc,
    channel: null,
    role: message.role,
    localTracks: []
  };
  sessions.set(message.sessionId, state);
  pc.addEventListener("track", () => {
    /* remote tracks stay host-owned for sinks */
  });
  if (message.role === "offer") {
    pc.addTransceiver("audio", { direction: "sendrecv" });
    pc.addTransceiver("video", { direction: "sendrecv" });
    state.channel = pc.createDataChannel("twistedpear-peer", { ordered: true });
    state.channel.binaryType = "arraybuffer";
    await pc.setLocalDescription(await pc.createOffer());
  } else {
    if (message.remoteSignal === undefined) throw new Error("WebRTC offer is missing");
    pc.addEventListener("datachannel", (event) => {
      state.channel = event.channel;
      state.channel.binaryType = "arraybuffer";
    });
    await pc.setRemoteDescription(JSON.parse(message.remoteSignal));
    await pc.setLocalDescription(await pc.createAnswer());
  }
  if (pc.iceGatheringState !== "complete") {
    await new Promise((resolve) => {
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
  send({
    type: "peer-chrome-response",
    token: message.token,
    signal: JSON.stringify({ type: local.type, sdp: local.sdp })
  });
}

async function establish(message, send) {
  const state = sessions.get(message.sessionId);
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
    throw new Error(
      state.pc.iceConnectionState === "failed"
        ? "ICE failed; this network may require TURN"
        : "Data channel timed out"
    );
  }
  state.channel.addEventListener("message", (event) => {
    void (async () => {
      const buffer = event.data instanceof Blob ? await event.data.arrayBuffer() : event.data;
      if (buffer instanceof ArrayBuffer) {
        send({ type: "peer-webrtc-data", sessionId: message.sessionId, dataHex: hex(new Uint8Array(buffer)) });
      }
    })();
  });
  send({ type: "peer-chrome-response", token: message.token, opened: true });
}

async function attachMedia(message, send) {
  const state = sessions.get(message.sessionId);
  if (state === undefined) throw new Error("WebRTC state is missing");
  const nav = globalThis.navigator;
  if (typeof nav?.mediaDevices?.getUserMedia !== "function") {
    throw new Error("getUserMedia is unavailable");
  }
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
    state.pc.addTrack(track);
    state.localTracks.push(track);
  }
  send({ type: "peer-chrome-response", token: message.token, attached: true });
}

function detachMedia(message) {
  const state = sessions.get(message.sessionId);
  if (state === undefined) return;
  const kind = message.classId === "microphone" ? "audio" : "video";
  for (const track of [...state.localTracks]) {
    if (track.kind === kind || message.classId === "screen-capture") {
      try {
        track.stop();
      } catch {
        /* ignore */
      }
      const index = state.localTracks.indexOf(track);
      if (index >= 0) state.localTracks.splice(index, 1);
    }
  }
}

function closeSession(sessionId) {
  const state = sessions.get(sessionId);
  if (state === undefined) return;
  for (const track of state.localTracks) {
    try {
      track.stop();
    } catch {
      /* ignore */
    }
  }
  try {
    state.channel?.close();
  } catch {
    /* ignore */
  }
  try {
    state.pc.close();
  } catch {
    /* ignore */
  }
  sessions.delete(sessionId);
}

function hex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function unhex(text) {
  return Uint8Array.from(text.match(/.{1,2}/g) ?? [], (pair) => Number.parseInt(pair, 16));
}
