import { describe, expect, it } from "vitest";
import { decodePeerAudioFsk, decodePeerAudioFskStream, encodePeerAudioFsk } from "../src/index.js";

const payload = Uint8Array.from({ length: 180 }, (_, index) => (index * 37) & 255);
function degraded(input: Float32Array, gain: number, noise: number, echoSamples: number): Float32Array { let state = 0x12345678; const out = new Float32Array(input.length); for (let index = 0; index < input.length; index += 1) { state = (Math.imul(state, 1_664_525) + 1_013_904_223) >>> 0; const random = state / 0xffff_ffff * 2 - 1; out[index] = (input[index] ?? 0) * gain + (input[index - echoSamples] ?? 0) * 0.08 + random * noise; } return out; }

describe("audible peer FSK", () => {
  for (const sampleRate of [44_100, 48_000]) it(`round-trips at ${sampleRate} Hz with gain, noise, and mild echo`, () => { const pcm = encodePeerAudioFsk(payload, { sampleRate }); expect(decodePeerAudioFsk(degraded(pcm, 0.55, 0.025, Math.round(sampleRate * 0.003)), { sampleRate })).toEqual(payload); });
  it("rejects silence and corruption instead of returning attacker-controlled bytes", () => { expect(() => decodePeerAudioFsk(new Float32Array(20_000))).toThrow(/carrier/); const pcm = encodePeerAudioFsk(payload); pcm.fill(0, 20_000, 21_000); expect(() => decodePeerAudioFsk(pcm)).toThrow(); });
  it("extracts multiple microphone bursts separated by leading, inter-frame, and trailing silence", () => {
    const first = encodePeerAudioFsk(payload); const secondPayload = payload.slice(0, 80); const second = encodePeerAudioFsk(secondPayload);
    const stream = new Float32Array(8_000 + first.length + 5_000 + second.length + 4_000); stream.set(first, 8_000); stream.set(second, 8_000 + first.length + 5_000);
    expect(decodePeerAudioFskStream(stream)).toEqual([payload, secondPayload]);
  });
});
