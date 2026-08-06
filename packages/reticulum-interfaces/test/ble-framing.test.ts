import { describe, expect, it } from "vitest";
import {
  BLE_FLAG_MORE,
  createBleReassemblyState,
  decodeBleFrameHeader,
  encodeBleFrame,
  fragmentForMtu,
  reassembleBleFrames,
} from "../src/ble/spec-framing.js";

describe("BLE framing", () => {
  it("round-trips a single-frame message", () => {
    const payload = new TextEncoder().encode("hello-reticulum");
    const frame = encodeBleFrame(0, 0, payload);
    const header = decodeBleFrameHeader(frame);
    expect(header?.payloadLength).toBe(payload.length);

    const result = reassembleBleFrames(createBleReassemblyState(), frame);
    expect(result.message).toEqual(payload);
  });

  it("reassembles fragmented messages", () => {
    const payload = new Uint8Array(600);
    payload.fill(0xab);
    const frames = fragmentForMtu(payload, 200);
    expect(frames.length).toBeGreaterThan(1);
    expect(decodeBleFrameHeader(frames[0]!)?.flags & BLE_FLAG_MORE).not.toBe(0);

    let state = createBleReassemblyState();
    let message: Uint8Array | null = null;
    for (const frame of frames) {
      const result = reassembleBleFrames(state, frame);
      state = result.state;
      if (result.message !== null) {
        message = result.message;
      }
    }

    expect(message).toEqual(payload);
  });

  it("recovers after a sequence gap", () => {
    const first = encodeBleFrame(0, BLE_FLAG_MORE, Uint8Array.from([1, 2]));
    const gap = encodeBleFrame(5, BLE_FLAG_MORE, Uint8Array.from([9]));
    const last = encodeBleFrame(6, 0, Uint8Array.from([3]));

    let state = createBleReassemblyState();
    state = reassembleBleFrames(state, first).state;
    state = reassembleBleFrames(state, gap).state;
    const result = reassembleBleFrames(state, last);
    expect(result.message).toEqual(Uint8Array.from([3]));
  });
});
