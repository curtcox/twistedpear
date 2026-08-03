// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  KISS_CMD_DATA,
  KISS_CMD_DETECT,
  KISS_DETECT_RESP,
  createKissDecodeState,
  decodeKissFrames,
  encodeDetectRequest,
  encodeKissFrame
} from "../src/rnode/kiss.js";

describe("RNode KISS framing", () => {
  it("encodes and decodes a data frame", () => {
    const payload = new TextEncoder().encode("reticulum");
    const frame = encodeKissFrame(KISS_CMD_DATA, payload);
    const decoded = decodeKissFrames(frame, createKissDecodeState());
    expect(decoded.frames).toHaveLength(1);
    expect(decoded.frames[0]?.command).toBe(KISS_CMD_DATA);
    expect(decoded.frames[0]?.payload).toEqual(payload);
  });

  it("decodes split frames across reads", () => {
    const frame = encodeDetectRequest();
    const splitAt = Math.floor(frame.length / 2);
    let state = createKissDecodeState();
    state = decodeKissFrames(frame.subarray(0, splitAt), state).state;
    const decoded = decodeKissFrames(frame.subarray(splitAt), state);
    expect(decoded.frames[0]?.command).toBe(KISS_CMD_DETECT);
    expect(decoded.frames[0]?.payload[0]).toBe(0x73);
  });

  it("parses detect response transcript", () => {
    const transcript = encodeKissFrame(KISS_CMD_DETECT, Uint8Array.from([KISS_DETECT_RESP]));
    const decoded = decodeKissFrames(transcript, createKissDecodeState());
    expect(decoded.frames[0]?.payload[0]).toBe(KISS_DETECT_RESP);
  });
});
