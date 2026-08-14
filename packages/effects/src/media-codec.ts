/** Host effect boundary for realtime media codecs and call-audio processing. */
export type MediaCodecKind = "vp8" | "vp9" | "h264" | "opus" | "pcm" | "jpeg";
export type MediaSampleKind = "video" | "audio";

export interface MediaCodecConfiguration {
  readonly codec: MediaCodecKind;
  readonly sampleKind: MediaSampleKind;
  readonly bitrateBps: number;
  readonly sampleRate?: number;
  readonly channels?: number;
  readonly width?: number;
  readonly height?: number;
  readonly frameRate?: number;
  readonly voiceDuplex?: boolean;
}

export interface RawMediaSample {
  readonly captureAtUs: number;
  readonly bytes: Uint8Array;
  readonly keyFrame?: boolean;
}

export interface EncodedMediaSample extends RawMediaSample {
  readonly codec: MediaCodecKind;
}

export interface MediaCodecDriver {
  readonly implementation:
    "webcodecs" | "videotoolbox" | "mediacodec" | "bundled-opus" | "simulated";
  supports(configuration: MediaCodecConfiguration): boolean;
  encode(
    configuration: MediaCodecConfiguration,
    sample: RawMediaSample,
  ): Promise<EncodedMediaSample>;
  decode(
    configuration: MediaCodecConfiguration,
    sample: EncodedMediaSample,
  ): Promise<RawMediaSample>;
  close(): Promise<void>;
}

/** Browser/desktop WebCodecs audio implementation. Video needs frame-layout metadata. */
export class WebCodecsMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "webcodecs" as const;
  private closed = false;

  supports(configuration: MediaCodecConfiguration): boolean {
    if (this.closed || configuration.sampleKind !== "audio") return false;
    if (configuration.codec === "pcm") return true;
    const globals = globalThis as Record<string, unknown>;
    return (
      configuration.codec === "opus" &&
      typeof globals.AudioEncoder === "function" &&
      typeof globals.AudioDecoder === "function" &&
      typeof globals.AudioData === "function" &&
      typeof globals.EncodedAudioChunk === "function"
    );
  }

  encode(
    configuration: MediaCodecConfiguration,
    sample: RawMediaSample,
  ): Promise<EncodedMediaSample> {
    const unsupported = this.rejectIfUnsupported(configuration);
    if (unsupported !== undefined) return unsupported;
    if (configuration.codec === "pcm")
      return Promise.resolve({
        ...sample,
        bytes: sample.bytes.slice(),
        codec: "pcm",
      });
    const globals = globalThis as Record<string, any>;
    const sampleRate = configuration.sampleRate ?? 16_000;
    const channels = configuration.channels ?? 1;
    if (sample.bytes.byteLength % (4 * channels) !== 0)
      return Promise.reject(
        new Error("PCM input must contain interleaved float32 samples."),
      );
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      const encoder = new globals.AudioEncoder({
        output(chunk: any) {
          const bytes = new Uint8Array(chunk.byteLength);
          chunk.copyTo(bytes);
          settle(() =>
            resolve({
              captureAtUs: sample.captureAtUs,
              bytes,
              codec: "opus",
            }),
          );
        },
        error(error: unknown) {
          settle(() =>
            reject(error instanceof Error ? error : new Error(String(error))),
          );
        },
      });
      try {
        encoder.configure({
          codec: "opus",
          sampleRate,
          numberOfChannels: channels,
          bitrate: configuration.bitrateBps,
        });
        const copy = sample.bytes.slice();
        const audio = new globals.AudioData({
          format: "f32",
          sampleRate,
          numberOfFrames: copy.byteLength / (4 * channels),
          numberOfChannels: channels,
          timestamp: sample.captureAtUs,
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

  decode(
    configuration: MediaCodecConfiguration,
    sample: EncodedMediaSample,
  ): Promise<RawMediaSample> {
    const unsupported = this.rejectIfUnsupported(configuration);
    if (unsupported !== undefined) return unsupported;
    if (configuration.codec === "pcm")
      return Promise.resolve({
        captureAtUs: sample.captureAtUs,
        bytes: sample.bytes.slice(),
      });
    if (sample.codec !== "opus")
      return Promise.reject(
        new Error("Encoded media codec does not match configuration."),
      );
    const globals = globalThis as Record<string, any>;
    const sampleRate = configuration.sampleRate ?? 16_000;
    const channels = configuration.channels ?? 1;
    return new Promise((resolve, reject) => {
      let settled = false;
      const settle = (fn: () => void) => {
        if (settled) return;
        settled = true;
        fn();
      };
      const decoder = new globals.AudioDecoder({
        output(audio: any) {
          const bytes = new Uint8Array(audio.allocationSize({ planeIndex: 0 }));
          audio.copyTo(bytes, { planeIndex: 0, format: "f32" });
          audio.close();
          settle(() => resolve({ captureAtUs: sample.captureAtUs, bytes }));
        },
        error(error: unknown) {
          settle(() =>
            reject(error instanceof Error ? error : new Error(String(error))),
          );
        },
      });
      try {
        decoder.configure({
          codec: "opus",
          sampleRate,
          numberOfChannels: channels,
        });
        decoder.decode(
          new globals.EncodedAudioChunk({
            type: "key",
            timestamp: sample.captureAtUs,
            data: sample.bytes,
          }),
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

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }
  private rejectIfUnsupported(
    configuration: MediaCodecConfiguration,
  ): Promise<never> | undefined {
    if (!this.supports(configuration))
      return Promise.reject(
        new Error("WebCodecs audio configuration is unsupported or closed."),
      );
    return undefined;
  }
}

/** Deterministic codec boundary implementation for simulation and conformance tapes. */
export class SimulatedMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "simulated" as const;
  private closed = false;

  supports(configuration: MediaCodecConfiguration): boolean {
    return (
      !this.closed &&
      ((configuration.sampleKind === "audio" &&
        ["opus", "pcm"].includes(configuration.codec)) ||
        (configuration.sampleKind === "video" &&
          ["vp8", "vp9", "h264", "jpeg"].includes(configuration.codec)))
    );
  }

  encode(
    configuration: MediaCodecConfiguration,
    sample: RawMediaSample,
  ): Promise<EncodedMediaSample> {
    const unsupported = this.rejectIfUnsupported(configuration);
    if (unsupported !== undefined) return unsupported;
    return Promise.resolve({
      ...sample,
      bytes: sample.bytes.slice(),
      codec: configuration.codec,
    });
  }

  decode(
    configuration: MediaCodecConfiguration,
    sample: EncodedMediaSample,
  ): Promise<RawMediaSample> {
    const unsupported = this.rejectIfUnsupported(configuration);
    if (unsupported !== undefined) return unsupported;
    if (sample.codec !== configuration.codec)
      return Promise.reject(
        new Error("Encoded media codec does not match configuration."),
      );
    const { codec: _codec, ...raw } = sample;
    return Promise.resolve({ ...raw, bytes: raw.bytes.slice() });
  }

  close(): Promise<void> {
    this.closed = true;
    return Promise.resolve();
  }

  private rejectIfUnsupported(
    configuration: MediaCodecConfiguration,
  ): Promise<never> | undefined {
    if (!this.supports(configuration))
      return Promise.reject(
        new Error("Media codec configuration is unsupported or closed."),
      );
    return undefined;
  }
}

type OpusScriptInstance = {
  encode(buffer: Uint8Array, frameSize: number): Uint8Array;
  decode(buffer: Uint8Array): Uint8Array;
  setBitrate(bitrate: number): void;
  delete(): void;
};

type OpusScriptCtor = {
  new (
    samplingRate: number,
    channels?: number,
    application?: number,
    options?: { wasm?: boolean },
  ): OpusScriptInstance;
  Application: { VOIP: number; AUDIO: number; RESTRICTED_LOWDELAY: number };
};

let opusScriptCtor: OpusScriptCtor | null | undefined;
let opusScriptLoader: (() => OpusScriptCtor | null) | null = null;

/** Hosts that can `require("opusscript")` register a loader before first use. */
export function configureBundledOpusLoader(
  loader: () => OpusScriptCtor | null,
): void {
  opusScriptLoader = loader;
  opusScriptCtor = undefined;
}

function loadOpusScript(): OpusScriptCtor | null {
  if (opusScriptCtor !== undefined) return opusScriptCtor;
  if (opusScriptLoader !== null) {
    try {
      opusScriptCtor = opusScriptLoader();
    } catch {
      opusScriptCtor = null;
    }
    return opusScriptCtor;
  }
  try {
    const createRequire = (
      Function(
        'return typeof require === "function" ? require("module").createRequire : null',
      ) as () => ((filename: string) => (id: string) => OpusScriptCtor) | null
    )();
    if (createRequire === null) {
      opusScriptCtor = null;
      return null;
    }
    const cwd = (
      Function(
        'return typeof process !== "undefined" && typeof process.cwd === "function" ? process.cwd() : "/"',
      ) as () => string
    )();
    opusScriptCtor = createRequire(`${cwd}/packages/effects/package.json`)(
      "opusscript",
    );
    return opusScriptCtor;
  } catch {
    opusScriptCtor = null;
    return null;
  }
}

function toCodecBuffer(bytes: Uint8Array): Uint8Array {
  const BufferCtor = (
    globalThis as { Buffer?: { from(data: Uint8Array): Uint8Array } }
  ).Buffer;
  return BufferCtor !== undefined ? BufferCtor.from(bytes) : bytes;
}

function float32ToInt16Pcm(bytes: Uint8Array, channels: number): Uint8Array {
  if (bytes.byteLength % (4 * channels) !== 0) {
    throw new Error("PCM input must contain interleaved float32 samples.");
  }
  const floats = new Float32Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 4,
  );
  const pcm = new Int16Array(floats.length);
  for (let index = 0; index < floats.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, floats[index] ?? 0));
    pcm[index] =
      sample < 0 ? Math.round(sample * 0x8000) : Math.round(sample * 0x7fff);
  }
  return new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength);
}

function int16PcmToFloat32(bytes: Uint8Array): Uint8Array {
  if (bytes.byteLength % 2 !== 0)
    throw new Error("PCM output must contain int16 samples.");
  const pcm = new Int16Array(
    bytes.buffer,
    bytes.byteOffset,
    bytes.byteLength / 2,
  );
  const floats = new Float32Array(pcm.length);
  for (let index = 0; index < pcm.length; index += 1) {
    floats[index] = (pcm[index] ?? 0) / 32768;
  }
  return new Uint8Array(floats.buffer, floats.byteOffset, floats.byteLength);
}

function opusScriptOptions(): { wasm: boolean } {
  // Hermes advertises WebAssembly, but Emscripten Opus WASM can hang indefinitely
  // there. Prefer asm.js on Hermes; it needs the utf-16le TextDecoder patch below.
  const hermes =
    typeof (globalThis as { HermesInternal?: unknown }).HermesInternal !==
    "undefined";
  if (hermes) return { wasm: false };
  return {
    wasm:
      typeof (globalThis as { WebAssembly?: unknown }).WebAssembly !==
      "undefined",
  };
}

/** Bare/JSC rejects `utf-16le`; Emscripten asm.js Opus constructs that decoder at load. */
export function ensureUtf16LeTextDecoder(): void {
  type Decoder = {
    decode(input?: ArrayBuffer | ArrayBufferView, options?: unknown): string;
  };
  const current = (
    globalThis as {
      TextDecoder?: (new (label?: string, options?: unknown) => Decoder) & {
        __tpUtf16LePatched?: boolean;
      };
    }
  ).TextDecoder;
  if (typeof current !== "function") return;
  if (current.__tpUtf16LePatched === true) return;
  const Original = current;
  function TextDecoder(
    this: { _utf16le: boolean; _inner: Decoder | null },
    label?: string,
    options?: unknown,
  ) {
    const normalized = String(label ?? "utf-8")
      .toLowerCase()
      .replace(/_/g, "-");
    this._utf16le = normalized === "utf-16le" || normalized === "utf-16";
    this._inner = this._utf16le ? null : new Original(label, options);
  }
  TextDecoder.prototype.decode = function decode(
    this: { _utf16le: boolean; _inner: Decoder | null },
    input?: ArrayBuffer | ArrayBufferView,
    options?: unknown,
  ): string {
    if (!this._utf16le) return this._inner!.decode(input, options);
    if (input == null) return "";
    const bytes =
      input instanceof ArrayBuffer
        ? new Uint8Array(input)
        : new Uint8Array(input.buffer, input.byteOffset, input.byteLength);
    let out = "";
    for (let i = 0; i + 1 < bytes.length; i += 2) {
      out += String.fromCharCode(bytes[i]! | (bytes[i + 1]! << 8));
    }
    return out;
  };
  (TextDecoder as { __tpUtf16LePatched?: boolean }).__tpUtf16LePatched = true;
  Object.defineProperty(globalThis, "TextDecoder", {
    value: TextDecoder,
    writable: true,
    configurable: true,
  });
  const g = globalThis as { global?: { TextDecoder?: unknown } };
  if (g.global !== undefined) {
    Object.defineProperty(g.global, "TextDecoder", {
      value: TextDecoder,
      writable: true,
      configurable: true,
    });
  }
}

/**
 * Host Opus encode/decode via Emscripten libopus (`opusscript`).
 * Used where WebCodecs is unavailable (Bare mobile worklet / Node tests).
 * Prefers WASM when `WebAssembly` exists; falls back to asm.js on BareKit.
 */
export class BundledOpusMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "bundled-opus" as const;
  private closed = false;
  private encoder: OpusScriptInstance | null = null;
  private decoder: OpusScriptInstance | null = null;
  private sampleRate = 16_000;
  private channels = 1;

  supports(configuration: MediaCodecConfiguration): boolean {
    if (this.closed || configuration.sampleKind !== "audio") return false;
    if (configuration.codec === "pcm") return true;
    if (configuration.codec !== "opus") return false;
    const rate = configuration.sampleRate ?? 16_000;
    return (
      loadOpusScript() !== null &&
      [8_000, 12_000, 16_000, 24_000, 48_000].includes(rate)
    );
  }

  encode(
    configuration: MediaCodecConfiguration,
    sample: RawMediaSample,
  ): Promise<EncodedMediaSample> {
    const unsupported = this.rejectIfUnsupported(configuration);
    if (unsupported !== undefined) return unsupported;
    if (configuration.codec === "pcm")
      return Promise.resolve({
        ...sample,
        bytes: sample.bytes.slice(),
        codec: "pcm",
      });
    const OpusScript = loadOpusScript();
    if (OpusScript === null)
      return Promise.reject(new Error("bundled Opus codec is unavailable"));
    const sampleRate = configuration.sampleRate ?? 16_000;
    const channels = configuration.channels ?? 1;
    const codec = this.ensureEncoder(
      OpusScript,
      sampleRate,
      channels,
      configuration.bitrateBps,
    );
    const pcm = float32ToInt16Pcm(sample.bytes, channels);
    const frameSize = pcm.byteLength / (2 * channels);
    // libopus accepts 2.5–60 ms frames; reject odd sizes early.
    if (![2.5, 5, 10, 20, 40, 60].includes((frameSize * 1_000) / sampleRate)) {
      return Promise.reject(
        new Error(
          `Unsupported Opus frame size ${frameSize} at ${sampleRate} Hz`,
        ),
      );
    }
    const encoded = codec.encode(toCodecBuffer(pcm), frameSize);
    return Promise.resolve({
      captureAtUs: sample.captureAtUs,
      bytes: Uint8Array.from(encoded),
      codec: "opus",
    });
  }

  decode(
    configuration: MediaCodecConfiguration,
    sample: EncodedMediaSample,
  ): Promise<RawMediaSample> {
    const unsupported = this.rejectIfUnsupported(configuration);
    if (unsupported !== undefined) return unsupported;
    if (configuration.codec === "pcm")
      return Promise.resolve({
        captureAtUs: sample.captureAtUs,
        bytes: sample.bytes.slice(),
      });
    if (sample.codec !== "opus")
      return Promise.reject(
        new Error("Encoded media codec does not match configuration."),
      );
    const OpusScript = loadOpusScript();
    if (OpusScript === null)
      return Promise.reject(new Error("bundled Opus codec is unavailable"));
    const sampleRate = configuration.sampleRate ?? 16_000;
    const channels = configuration.channels ?? 1;
    const codec = this.ensureDecoder(OpusScript, sampleRate, channels);
    const decoded = codec.decode(toCodecBuffer(sample.bytes));
    return Promise.resolve({
      captureAtUs: sample.captureAtUs,
      bytes: int16PcmToFloat32(Uint8Array.from(decoded)),
    });
  }

  close(): Promise<void> {
    this.closed = true;
    this.encoder?.delete();
    this.decoder?.delete();
    this.encoder = null;
    this.decoder = null;
    return Promise.resolve();
  }

  private ensureEncoder(
    OpusScript: OpusScriptCtor,
    sampleRate: number,
    channels: number,
    bitrateBps: number,
  ): OpusScriptInstance {
    if (
      this.encoder === null ||
      this.sampleRate !== sampleRate ||
      this.channels !== channels
    ) {
      this.encoder?.delete();
      ensureUtf16LeTextDecoder();
      this.encoder = new OpusScript(
        sampleRate,
        channels,
        OpusScript.Application.VOIP,
        opusScriptOptions(),
      );
      this.sampleRate = sampleRate;
      this.channels = channels;
    }
    this.encoder.setBitrate(bitrateBps);
    return this.encoder;
  }

  private ensureDecoder(
    OpusScript: OpusScriptCtor,
    sampleRate: number,
    channels: number,
  ): OpusScriptInstance {
    if (
      this.decoder === null ||
      this.sampleRate !== sampleRate ||
      this.channels !== channels
    ) {
      this.decoder?.delete();
      ensureUtf16LeTextDecoder();
      this.decoder = new OpusScript(
        sampleRate,
        channels,
        OpusScript.Application.VOIP,
        opusScriptOptions(),
      );
      this.sampleRate = sampleRate;
      this.channels = channels;
    }
    return this.decoder;
  }

  private rejectIfUnsupported(
    configuration: MediaCodecConfiguration,
  ): Promise<never> | undefined {
    if (!this.supports(configuration))
      return Promise.reject(
        new Error("bundled Opus configuration is unsupported or closed."),
      );
    return undefined;
  }
}
