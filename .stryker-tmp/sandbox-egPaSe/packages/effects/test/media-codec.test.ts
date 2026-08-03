// @ts-nocheck
import { createRequire } from "node:module";
import { describe, expect, it } from "vitest";
import {
  BundledOpusMediaCodecDriver,
  configureBundledOpusLoader,
  SimulatedMediaCodecDriver,
  WebCodecsMediaCodecDriver
} from "../src/media-codec.js";

configureBundledOpusLoader(() => createRequire(import.meta.url)("opusscript"));

describe("SimulatedMediaCodecDriver", () => {
  it("exercises the codec effect boundary without aliasing media buffers", async () => {
    const driver = new SimulatedMediaCodecDriver();
    const configuration = { codec: "opus", sampleKind: "audio", bitrateBps: 24_000 } as const;
    const bytes = new Uint8Array([1, 2, 3]);
    const encoded = await driver.encode(configuration, { captureAtUs: 10, bytes });
    bytes[0] = 9;
    expect(encoded.bytes).toEqual(new Uint8Array([1, 2, 3]));
    const decoded = await driver.decode(configuration, encoded);
    expect(decoded).toEqual({ captureAtUs: 10, bytes: new Uint8Array([1, 2, 3]) });
    await driver.close();
    await expect(driver.encode(configuration, { captureAtUs: 20, bytes })).rejects.toThrow(/closed/);
  });
});

describe("BundledOpusMediaCodecDriver", () => {
  it("compresses mono float32 PCM to Opus and decodes back", async () => {
    const driver = new BundledOpusMediaCodecDriver();
    const configuration = {
      codec: "opus",
      sampleKind: "audio",
      bitrateBps: 24_000,
      sampleRate: 16_000,
      channels: 1
    } as const;
    expect(driver.supports(configuration)).toBe(true);
    const sampleCount = 320; // 20 ms at 16 kHz
    const samples = new Float32Array(sampleCount);
    for (let index = 0; index < sampleCount; index += 1) {
      samples[index] = Math.sin((2 * Math.PI * 440 * index) / 16_000) * 0.25;
    }
    const pcmBytes = new Uint8Array(samples.buffer.slice(samples.byteOffset, samples.byteOffset + samples.byteLength));
    const encoded = await driver.encode(configuration, { captureAtUs: 42, bytes: pcmBytes });
    expect(encoded.codec).toBe("opus");
    expect(encoded.bytes.length).toBeGreaterThan(0);
    expect(encoded.bytes.length).toBeLessThan(pcmBytes.length);
    const decoded = await driver.decode(configuration, encoded);
    expect(decoded.captureAtUs).toBe(42);
    expect(decoded.bytes.byteLength).toBe(pcmBytes.byteLength);
    const out = new Float32Array(decoded.bytes.buffer, decoded.bytes.byteOffset, decoded.bytes.byteLength / 4);
    let energy = 0;
    for (let index = 0; index < out.length; index += 1) energy += (out[index] ?? 0) ** 2;
    expect(energy).toBeGreaterThan(0.01);
    await driver.close();
  });
});

describe("WebCodecsMediaCodecDriver", () => {
  it("uses the host WebCodecs boundary for mono Opus", async () => {
    const globals = globalThis as Record<string, unknown>;
    const saved = new Map<string, unknown>();
    for (const key of ["AudioEncoder", "AudioDecoder", "AudioData", "EncodedAudioChunk"]) saved.set(key, globals[key]);
    class AudioDataFake {
      readonly bytes: Uint8Array;
      readonly numberOfFrames: number;
      constructor(init: { data: ArrayBuffer; numberOfFrames: number }) {
        this.bytes = new Uint8Array(init.data);
        this.numberOfFrames = init.numberOfFrames;
      }
      allocationSize() {
        return this.bytes.length;
      }
      copyTo(target: Uint8Array) {
        target.set(this.bytes);
      }
      close() {}
    }
    class ChunkFake {
      readonly bytes: Uint8Array;
      readonly byteLength: number;
      constructor(init: { data: Uint8Array }) {
        this.bytes = init.data.slice();
        this.byteLength = this.bytes.length;
      }
      copyTo(target: Uint8Array) {
        target.set(this.bytes);
      }
    }
    class EncoderFake {
      constructor(private readonly callbacks: { output(chunk: ChunkFake): void }) {}
      configure() {}
      encode(audio: AudioDataFake) {
        this.callbacks.output(new ChunkFake({ data: audio.bytes }));
      }
      flush() {
        return Promise.resolve();
      }
      close() {}
    }
    class DecoderFake {
      constructor(private readonly callbacks: { output(audio: AudioDataFake): void }) {}
      configure() {}
      decode(chunk: ChunkFake) {
        this.callbacks.output(
          new AudioDataFake({ data: chunk.bytes.slice().buffer, numberOfFrames: chunk.bytes.length / 4 })
        );
      }
      flush() {
        return Promise.resolve();
      }
      close() {}
    }
    Object.assign(globals, {
      AudioEncoder: EncoderFake,
      AudioDecoder: DecoderFake,
      AudioData: AudioDataFake,
      EncodedAudioChunk: ChunkFake
    });
    try {
      const driver = new WebCodecsMediaCodecDriver();
      const configuration = {
        codec: "opus",
        sampleKind: "audio",
        bitrateBps: 24_000,
        sampleRate: 16_000,
        channels: 1
      } as const;
      const bytes = new Uint8Array(new Float32Array([0.1, -0.1]).buffer);
      const encoded = await driver.encode(configuration, { captureAtUs: 12, bytes });
      expect(encoded.codec).toBe("opus");
      expect(encoded.bytes).toEqual(bytes);
      await expect(driver.decode(configuration, encoded)).resolves.toEqual({ captureAtUs: 12, bytes });
    } finally {
      for (const [key, value] of saved) {
        if (value === undefined) delete globals[key];
        else globals[key] = value;
      }
    }
  });
});
