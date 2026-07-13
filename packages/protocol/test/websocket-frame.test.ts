import { describe, expect, it } from "vitest";
import {
  WS_OPCODE_BINARY,
  decodeWsClientFrame,
  encodeWsBinaryFrame
} from "../src/websocket-frame.js";

describe("protocol ws binary frames", () => {
  it("encodes short and medium binary frames", () => {
    const short = encodeWsBinaryFrame(new Uint8Array([1, 2, 3]));
    expect(short[0]).toBe(0x82);
    expect(short[1]).toBe(3);
    expect([...short.subarray(2)]).toEqual([1, 2, 3]);

    const payload = new Uint8Array(200).fill(7);
    const medium = encodeWsBinaryFrame(payload);
    expect(medium[0]).toBe(0x82);
    expect(medium[1]).toBe(126);
    expect((medium[2]! << 8) | medium[3]!).toBe(200);
  });

  it("decodes masked client frames", () => {
    const payload = new Uint8Array([0x10, 0x20, 0x30]);
    const mask = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);
    const header = new Uint8Array([0x82, 0x80 | payload.length, ...mask]);
    const masked = new Uint8Array(payload.length);
    for (let i = 0; i < payload.length; i += 1) {
      masked[i] = payload[i]! ^ mask[i % 4]!;
    }
    const frameBytes = new Uint8Array(header.length + masked.length);
    frameBytes.set(header, 0);
    frameBytes.set(masked, header.length);

    const decoded = decodeWsClientFrame(frameBytes);
    expect(decoded).not.toBeNull();
    expect(decoded!.opcode).toBe(WS_OPCODE_BINARY);
    expect([...decoded!.payload]).toEqual([...payload]);
    expect(decoded!.consumed).toBe(frameBytes.length);
  });

  it("returns null for incomplete frames", () => {
    expect(decodeWsClientFrame(new Uint8Array([0x82]))).toBeNull();
  });
});
