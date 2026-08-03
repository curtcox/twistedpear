/** Chromium-owned media codec and speaker effects for the desktop worklet. */
// @ts-nocheck

export async function handleMediaCodecRequest(message, send) {
  try {
    const bytes = unhex(message.dataHex);
    const result = message.op === "encode"
      ? await encodeAudio(message.configuration, message.captureAtUs, bytes)
      : await decodeAudio(message.configuration, message.captureAtUs, bytes);
    send({ type: "media-codec-response", token: message.token, dataHex: hex(result) });
  } catch (error) {
    send({ type: "media-codec-response", token: message.token, error: error instanceof Error ? error.message : String(error) });
  }
}

/** Harness reply path: decode an inbound TPD2 Opus/PCM frame and play it on the speaker sink. */
export async function handleMediaOpusPlayRequest(message, send) {
  try {
    const played = await playInboundMediaFrame({
      sink: { kind: "speaker" },
      encoding: typeof message.encoding === "string" ? message.encoding : "16k-opus",
      dataHex: message.dataHex
    });
    send({ type: "media-opus-play-response", token: message.token, played: played === true });
  } catch (error) {
    send({
      type: "media-opus-play-response",
      token: message.token,
      played: false,
      error: error instanceof Error ? error.message : String(error)
    });
  }
}

export async function playInboundMediaFrame(message) {
  if (message.sink?.kind !== "speaker") return false;
  const frame = unhex(message.dataHex);
  if (frame.length >= 36 && new TextDecoder().decode(frame.subarray(0, 4)) === "TPD2" && frame[5] === 5) return false;
  if (frame.length < 36 || new TextDecoder().decode(frame.subarray(0, 4)) !== "TPD2" || frame[5] !== 2) {
    throw new Error("Inbound audio frame is malformed.");
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const payloadLength = view.getUint32(16, false);
  if (payloadLength !== frame.length - 36) throw new Error("Inbound audio frame length mismatch.");
  const configuration = audioConfiguration(message.encoding);
  const decoded = await decodeAudio(configuration, Number(view.getBigUint64(24, false)), frame.slice(36));
  const copy = decoded.slice();
  const samples = new Float32Array(copy.buffer, copy.byteOffset, copy.byteLength / 4);
  const AudioContextCtor = globalThis.AudioContext ?? globalThis.webkitAudioContext;
  if (AudioContextCtor === undefined) throw new Error("Web Audio playback is unavailable.");
  const context = new AudioContextCtor({ sampleRate: configuration.sampleRate });
  await context.resume();
  const buffer = context.createBuffer(1, samples.length, configuration.sampleRate);
  buffer.copyToChannel(samples, 0);
  const source = context.createBufferSource();
  source.buffer = buffer;
  source.connect(context.destination);
  source.onended = () => { void context.close(); };
  source.start();
  return true;
}

async function encodeAudio(configuration, captureAtUs, bytes) {
  assertAudioConfiguration(configuration);
  if (configuration.codec === "pcm") return bytes.slice();
  const Encoder = globalThis.AudioEncoder;
  const Audio = globalThis.AudioData;
  if (Encoder === undefined || Audio === undefined) throw new Error("Chromium WebCodecs Opus encode is unavailable.");
  const channels = configuration.channels ?? 1;
  if (bytes.byteLength % (4 * channels) !== 0) throw new Error("PCM input is not interleaved float32 audio.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn) => { if (settled) return; settled = true; fn(); };
    const encoder = new Encoder({
      output(chunk) {
        const output = new Uint8Array(chunk.byteLength);
        chunk.copyTo(output);
        settle(() => resolve(output));
      },
      error(error) { settle(() => reject(error)); }
    });
    try {
      encoder.configure({ codec: "opus", sampleRate: configuration.sampleRate ?? 16_000, numberOfChannels: channels, bitrate: configuration.bitrateBps });
      const copy = bytes.slice();
      const audio = new Audio({ format: "f32", sampleRate: configuration.sampleRate ?? 16_000, numberOfFrames: copy.byteLength / (4 * channels), numberOfChannels: channels, timestamp: captureAtUs, data: copy.buffer });
      encoder.encode(audio);
      audio.close();
      void encoder.flush().finally(() => { try { encoder.close(); } catch { /* already closed */ } });
    } catch (error) {
      try { encoder.close(); } catch { /* already closed */ }
      settle(() => reject(error));
    }
  });
}

async function decodeAudio(configuration, captureAtUs, bytes) {
  assertAudioConfiguration(configuration);
  if (configuration.codec === "pcm") return bytes.slice();
  const Decoder = globalThis.AudioDecoder;
  const Chunk = globalThis.EncodedAudioChunk;
  if (Decoder === undefined || Chunk === undefined) throw new Error("Chromium WebCodecs Opus decode is unavailable.");
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn) => { if (settled) return; settled = true; fn(); };
    const decoder = new Decoder({
      output(audio) {
        const output = new Uint8Array(audio.allocationSize({ planeIndex: 0 }));
        audio.copyTo(output, { planeIndex: 0, format: "f32" });
        audio.close();
        settle(() => resolve(output));
      },
      error(error) { settle(() => reject(error)); }
    });
    try {
      decoder.configure({ codec: "opus", sampleRate: configuration.sampleRate ?? 16_000, numberOfChannels: configuration.channels ?? 1 });
      decoder.decode(new Chunk({ type: "key", timestamp: captureAtUs, data: bytes }));
      void decoder.flush().finally(() => { try { decoder.close(); } catch { /* already closed */ } });
    } catch (error) {
      try { decoder.close(); } catch { /* already closed */ }
      settle(() => reject(error));
    }
  });
}

function audioConfiguration(encoding) {
  return { codec: encoding.includes("opus") || encoding.includes("narrowband") ? "opus" : "pcm", sampleKind: "audio", bitrateBps: encoding.includes("8k") ? 12_000 : 24_000, sampleRate: encoding.includes("48k") ? 48_000 : encoding.includes("8k") ? 8_000 : 16_000, channels: 1 };
}

function assertAudioConfiguration(configuration) {
  if (configuration?.sampleKind !== "audio" || (configuration.codec !== "opus" && configuration.codec !== "pcm")) throw new Error("Desktop media codec configuration is unsupported.");
}

function hex(bytes) { return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(""); }
function unhex(value) { if (typeof value !== "string" || value.length % 2 !== 0 || !/^[0-9a-f]*$/i.test(value)) throw new Error("Media bytes are malformed."); const bytes = new Uint8Array(value.length / 2); for (let index = 0; index < bytes.length; index += 1) bytes[index] = Number.parseInt(value.slice(index * 2, index * 2 + 2), 16); return bytes; }
