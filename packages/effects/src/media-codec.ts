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
  readonly implementation: "webcodecs" | "videotoolbox" | "mediacodec" | "bundled-opus" | "simulated";
  supports(configuration: MediaCodecConfiguration): boolean;
  encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample>;
  decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample>;
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
    return configuration.codec === "opus" && typeof globals.AudioEncoder === "function" && typeof globals.AudioDecoder === "function" && typeof globals.AudioData === "function" && typeof globals.EncodedAudioChunk === "function";
  }

  async encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample> {
    this.assertSupported(configuration);
    if (configuration.codec === "pcm") return { ...sample, bytes: sample.bytes.slice(), codec: "pcm" };
    const globals = globalThis as Record<string, any>;
    const sampleRate = configuration.sampleRate ?? 16_000; const channels = configuration.channels ?? 1;
    if (sample.bytes.byteLength % (4 * channels) !== 0) throw new Error("PCM input must contain interleaved float32 samples.");
    return new Promise((resolve, reject) => {
      const encoder = new globals.AudioEncoder({
        output(chunk: any) { const bytes = new Uint8Array(chunk.byteLength); chunk.copyTo(bytes); encoder.close(); resolve({ captureAtUs: sample.captureAtUs, bytes, codec: "opus" }); },
        error(error: unknown) { encoder.close(); reject(error instanceof Error ? error : new Error(String(error))); }
      });
      try {
        encoder.configure({ codec: "opus", sampleRate, numberOfChannels: channels, bitrate: configuration.bitrateBps });
        const copy = sample.bytes.slice(); const audio = new globals.AudioData({ format: "f32", sampleRate, numberOfFrames: copy.byteLength / (4 * channels), numberOfChannels: channels, timestamp: sample.captureAtUs, data: copy.buffer });
        encoder.encode(audio); audio.close(); void encoder.flush().catch(reject);
      } catch (error) { encoder.close(); reject(error); }
    });
  }

  async decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample> {
    this.assertSupported(configuration);
    if (configuration.codec === "pcm") return { captureAtUs: sample.captureAtUs, bytes: sample.bytes.slice() };
    if (sample.codec !== "opus") throw new Error("Encoded media codec does not match configuration.");
    const globals = globalThis as Record<string, any>; const sampleRate = configuration.sampleRate ?? 16_000; const channels = configuration.channels ?? 1;
    return new Promise((resolve, reject) => {
      const decoder = new globals.AudioDecoder({
        output(audio: any) { const bytes = new Uint8Array(audio.allocationSize({ planeIndex: 0 })); audio.copyTo(bytes, { planeIndex: 0, format: "f32" }); audio.close(); decoder.close(); resolve({ captureAtUs: sample.captureAtUs, bytes }); },
        error(error: unknown) { decoder.close(); reject(error instanceof Error ? error : new Error(String(error))); }
      });
      try { decoder.configure({ codec: "opus", sampleRate, numberOfChannels: channels }); decoder.decode(new globals.EncodedAudioChunk({ type: "key", timestamp: sample.captureAtUs, data: sample.bytes })); void decoder.flush().catch(reject); } catch (error) { decoder.close(); reject(error); }
    });
  }

  async close(): Promise<void> { this.closed = true; }
  private assertSupported(configuration: MediaCodecConfiguration): void { if (!this.supports(configuration)) throw new Error("WebCodecs audio configuration is unsupported or closed."); }
}

/** Deterministic codec boundary implementation for simulation and conformance tapes. */
export class SimulatedMediaCodecDriver implements MediaCodecDriver {
  readonly implementation = "simulated" as const;
  private closed = false;

  supports(configuration: MediaCodecConfiguration): boolean {
    return !this.closed && (
      (configuration.sampleKind === "audio" && ["opus", "pcm"].includes(configuration.codec)) ||
      (configuration.sampleKind === "video" && ["vp8", "vp9", "h264", "jpeg"].includes(configuration.codec))
    );
  }

  async encode(configuration: MediaCodecConfiguration, sample: RawMediaSample): Promise<EncodedMediaSample> {
    this.assertSupported(configuration);
    return { ...sample, bytes: sample.bytes.slice(), codec: configuration.codec };
  }

  async decode(configuration: MediaCodecConfiguration, sample: EncodedMediaSample): Promise<RawMediaSample> {
    this.assertSupported(configuration);
    if (sample.codec !== configuration.codec) throw new Error("Encoded media codec does not match configuration.");
    const { codec: _codec, ...raw } = sample;
    return { ...raw, bytes: raw.bytes.slice() };
  }

  async close(): Promise<void> {
    this.closed = true;
  }

  private assertSupported(configuration: MediaCodecConfiguration): void {
    if (!this.supports(configuration)) throw new Error("Media codec configuration is unsupported or closed.");
  }
}
