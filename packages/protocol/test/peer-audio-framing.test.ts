import { describe, expect, it } from "vitest";
import {
  decodePeerAudioFrame,
  framePeerAudioPayload,
  initialPeerAudioAssemblyState,
  stepPeerAudioAssembly,
} from "../src/index.js";

const bytes = (length: number, seed = 0) =>
  Uint8Array.from({ length }, (_, index) => (seed + index * 17) & 255);

describe("peer audio framing", () => {
  it("assembles reordered and duplicate frames", () => {
    const payload = bytes(777, 4);
    const frames = framePeerAudioPayload(bytes(16, 8), payload, 96);
    let state = initialPeerAudioAssemblyState(2_000);
    let complete: Uint8Array | null = null;
    for (const frame of [
      frames.at(-1)!,
      ...frames.slice(0, -1).reverse(),
      frames[2]!,
    ]) {
      const result = stepPeerAudioAssembly(state, frame, 1_000);
      state = result.state;
      if (result.payload !== null) complete = result.payload;
    }
    expect(complete).toEqual(payload);
  });

  it("recovers one missing data frame with XOR parity", () => {
    const payload = bytes(500, 9);
    const frames = framePeerAudioPayload(bytes(16, 2), payload, 80);
    let state = initialPeerAudioAssemblyState(2_000);
    let final = null;
    for (const [index, frame] of frames.entries()) {
      if (index === 3) continue;
      final = stepPeerAudioAssembly(state, frame, 1_000);
      state = final.state;
    }
    expect(final?.recovered).toBe(true);
    expect(final?.payload).toEqual(payload);
  });

  it("rejects corruption, mixed sessions, and expired assembly", () => {
    const first = framePeerAudioPayload(bytes(16, 1), bytes(300), 64);
    const other = framePeerAudioPayload(bytes(16, 2), bytes(300), 64);
    const corrupted = first[0]!.slice();
    corrupted[corrupted.length - 1] ^= 1;
    expect(() => decodePeerAudioFrame(corrupted)).toThrow(/CRC/);
    const initial = stepPeerAudioAssembly(
      initialPeerAudioAssemblyState(2_000),
      first[0]!,
      1_000,
    ).state;
    expect(() => stepPeerAudioAssembly(initial, other[0]!, 1_000)).toThrow(
      /Mixed/,
    );
    expect(() => stepPeerAudioAssembly(initial, first[1]!, 2_000)).toThrow(
      /expired/,
    );
  });
});
