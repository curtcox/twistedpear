import {
  decodePeerAudioFskStream,
  encodePeerAudioFsk,
} from "@twistedpear/protocol";

const audioHex = (bytes: Uint8Array) =>
  [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");

const audioUnhex = (text: string) =>
  Uint8Array.from(text.match(/../g) ?? [], (pair) => Number.parseInt(pair, 16));

export async function outboundWebRtcMediaBytes(pc: {
  getStats?: () => Promise<unknown>;
}): Promise<number> {
  if (typeof pc.getStats !== "function") {
    return 0;
  }
  const report = await pc.getStats();
  if (!(report instanceof Map)) {
    return 0;
  }
  let bytes = 0;
  for (const entry of report.values()) {
    if (
      entry !== null &&
      typeof entry === "object" &&
      "type" in entry &&
      entry.type === "outbound-rtp" &&
      "bytesSent" in entry &&
      typeof entry.bytesSent === "number"
    ) {
      bytes += entry.bytesSent;
    }
  }
  return bytes;
}

export async function playPeerAudio(
  framesHex: ReadonlyArray<string>,
): Promise<void> {
  const AudioContextClass =
    (
      globalThis as unknown as {
        AudioContext?: new () => any;
        webkitAudioContext?: new () => any;
      }
    ).AudioContext ??
    (globalThis as unknown as { webkitAudioContext?: new () => any })
      .webkitAudioContext;
  if (AudioContextClass === undefined) {
    throw new Error("Web Audio playback is unavailable");
  }
  const context = new AudioContextClass();
  await context.resume();
  let at = context.currentTime + 0.1;
  for (const frameHex of framesHex) {
    const pcm = encodePeerAudioFsk(audioUnhex(frameHex), {
      sampleRate: context.sampleRate,
    });
    const buffer = context.createBuffer(1, pcm.length, context.sampleRate);
    buffer.copyToChannel(pcm, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start(at);
    at += pcm.length / context.sampleRate + 0.2;
  }
  await new Promise((resolve) =>
    setTimeout(
      resolve,
      Math.ceil(Math.max(0, at - context.currentTime) * 1_000),
    ),
  );
  await context.close();
}

export async function recordPeerAudio(
  durationMs = 15_000,
): Promise<ReadonlyArray<string>> {
  const browser = globalThis as unknown as {
    navigator?: {
      mediaDevices?: { getUserMedia(constraints: unknown): Promise<any> };
    };
    AudioContext?: new () => any;
    webkitAudioContext?: new () => any;
  };
  const AudioContextClass = browser.AudioContext ?? browser.webkitAudioContext;
  if (
    AudioContextClass === undefined ||
    browser.navigator?.mediaDevices?.getUserMedia === undefined
  ) {
    throw new Error("Microphone recording is unavailable");
  }
  const stream = await browser.navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: false,
      noiseSuppression: false,
      autoGainControl: false,
    },
    video: false,
  });
  const context = new AudioContextClass();
  await context.resume();
  const chunks: Float32Array[] = [];
  const source = context.createMediaStreamSource(stream);
  const processor = context.createScriptProcessor(4_096, 1, 1);
  const mute = context.createGain();
  mute.gain.value = 0;
  processor.onaudioprocess = (event: any) => {
    const channel = event.inputBuffer.getChannelData(0);
    chunks.push(new Float32Array(channel));
  };
  source.connect(processor);
  processor.connect(mute);
  mute.connect(context.destination);
  await new Promise((resolve) => setTimeout(resolve, durationMs));
  stream.getTracks().forEach((track: any) => track.stop());
  source.disconnect();
  processor.disconnect();
  mute.disconnect();
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const pcm = new Float32Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    pcm.set(chunk, offset);
    offset += chunk.length;
  }
  const frames = decodePeerAudioFskStream(pcm, {
    sampleRate: context.sampleRate,
  });
  await context.close();
  if (frames.length === 0) {
    throw new Error("No valid peer audio frames were detected");
  }
  return frames.map(audioHex);
}

export function webHexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function webBytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join(
    "",
  );
}

export async function playInboundAudioFrame(
  dataHex: string,
  encoding: string,
): Promise<void> {
  const frame = webHexToBytes(dataHex);
  if (
    frame.length < 36 ||
    String.fromCharCode(...frame.subarray(0, 4)) !== "TPD2" ||
    frame[5] !== 2
  ) {
    throw new Error("Inbound audio frame is malformed.");
  }
  const view = new DataView(frame.buffer, frame.byteOffset, frame.byteLength);
  const payloadLength = view.getUint32(16, false);
  if (payloadLength !== frame.length - 36) {
    throw new Error("Inbound audio frame length mismatch.");
  }
  const payload = frame.slice(36);
  const sampleRate = encoding.includes("48k")
    ? 48_000
    : encoding.includes("8k")
      ? 8_000
      : 16_000;
  const AudioContextCtor =
    (globalThis as any).AudioContext ?? (globalThis as any).webkitAudioContext;
  if (AudioContextCtor === undefined) {
    throw new Error("Web Audio is unavailable.");
  }
  const context = new AudioContextCtor({ sampleRate });
  const play = (samples: Float32Array) => {
    const buffer = context.createBuffer(1, samples.length, sampleRate);
    buffer.copyToChannel(samples, 0);
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.onended = () => {
      void context.close();
    };
    source.start();
  };
  if (!encoding.includes("opus")) {
    const copy = payload.slice();
    play(new Float32Array(copy.buffer));
    return;
  }
  const decoded = await webDecodeOpus(
    {
      codec: "opus",
      sampleKind: "audio",
      bitrateBps: 24_000,
      sampleRate,
      channels: 1,
    },
    Number(view.getBigUint64(24, false)),
    payload,
  );
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
  sendToWorker: (reply: {
    type: "media-codec-response";
    token: string;
    dataHex?: string;
    error?: string;
  }) => void,
): Promise<void> {
  try {
    const bytes = webHexToBytes(message.dataHex);
    const result =
      message.op === "encode"
        ? await webEncodeOpus(message.configuration, message.captureAtUs, bytes)
        : await webDecodeOpus(
            message.configuration,
            message.captureAtUs,
            bytes,
          );
    sendToWorker({
      type: "media-codec-response",
      token: message.token,
      dataHex: webBytesToHex(result),
    });
  } catch (error) {
    sendToWorker({
      type: "media-codec-response",
      token: message.token,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

async function webEncodeOpus(
  configuration: {
    readonly codec: string;
    readonly sampleKind: string;
    readonly bitrateBps: number;
    readonly sampleRate?: number;
    readonly channels?: number;
  },
  captureAtUs: number,
  bytes: Uint8Array,
): Promise<Uint8Array> {
  if (
    configuration.sampleKind !== "audio" ||
    (configuration.codec !== "opus" && configuration.codec !== "pcm")
  ) {
    throw new Error("Web media codec configuration is unsupported.");
  }
  if (configuration.codec === "pcm") {
    return bytes.slice();
  }
  const Encoder = (globalThis as any).AudioEncoder;
  const Audio = (globalThis as any).AudioData;
  if (Encoder === undefined || Audio === undefined) {
    throw new Error("WebCodecs Opus encode is unavailable.");
  }
  const channels = configuration.channels ?? 1;
  if (bytes.byteLength % (4 * channels) !== 0) {
    throw new Error("PCM input is not interleaved float32 audio.");
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      fn();
    };
    const encoder = new Encoder({
      output(chunk: any) {
        const output = new Uint8Array(chunk.byteLength);
        chunk.copyTo(output);
        settle(() => resolve(output));
      },
      error(error: unknown) {
        settle(() => reject(error));
      },
    });
    try {
      encoder.configure({
        codec: "opus",
        sampleRate: configuration.sampleRate ?? 16_000,
        numberOfChannels: channels,
        bitrate: configuration.bitrateBps,
      });
      const copy = bytes.slice();
      const audio = new Audio({
        format: "f32",
        sampleRate: configuration.sampleRate ?? 16_000,
        numberOfFrames: copy.byteLength / (4 * channels),
        numberOfChannels: channels,
        timestamp: captureAtUs,
        data: copy.buffer,
      });
      encoder.encode(audio);
      audio.close();
      void encoder.flush().finally(() => {
        try {
          encoder.close();
        } catch {
          /* already closed */
        }
      });
    } catch (error) {
      try {
        encoder.close();
      } catch {
        /* already closed */
      }
      settle(() => reject(error));
    }
  });
}

async function webDecodeOpus(
  configuration: {
    readonly codec: string;
    readonly sampleKind: string;
    readonly bitrateBps: number;
    readonly sampleRate?: number;
    readonly channels?: number;
  },
  captureAtUs: number,
  bytes: Uint8Array,
): Promise<Uint8Array> {
  if (
    configuration.sampleKind !== "audio" ||
    (configuration.codec !== "opus" && configuration.codec !== "pcm")
  ) {
    throw new Error("Web media codec configuration is unsupported.");
  }
  if (configuration.codec === "pcm") {
    return bytes.slice();
  }
  const Decoder = (globalThis as any).AudioDecoder;
  const Chunk = (globalThis as any).EncodedAudioChunk;
  if (Decoder === undefined || Chunk === undefined) {
    throw new Error("WebCodecs Opus decode is unavailable.");
  }
  return new Promise((resolve, reject) => {
    let settled = false;
    const settle = (fn: () => void) => {
      if (settled) {
        return;
      }
      settled = true;
      fn();
    };
    const decoder = new Decoder({
      output(audio: any) {
        const output = new Uint8Array(audio.allocationSize({ planeIndex: 0 }));
        audio.copyTo(output, { planeIndex: 0, format: "f32" });
        audio.close();
        settle(() => resolve(output));
      },
      error(error: unknown) {
        settle(() => reject(error));
      },
    });
    try {
      decoder.configure({
        codec: "opus",
        sampleRate: configuration.sampleRate ?? 16_000,
        numberOfChannels: configuration.channels ?? 1,
      });
      decoder.decode(
        new Chunk({ type: "key", timestamp: captureAtUs, data: bytes }),
      );
      void decoder.flush().finally(() => {
        try {
          decoder.close();
        } catch {
          /* already closed */
        }
      });
    } catch (error) {
      try {
        decoder.close();
      } catch {
        /* already closed */
      }
      settle(() => reject(error));
    }
  });
}
