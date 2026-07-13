import { describe, expect, it } from "vitest";
import {
  STREAM_DATA_MSGTYPE,
  STREAM_ID_MAX,
  StreamSystemMessageTypes,
  clampStreamDataChunkLength,
  clampStreamReadSize,
  packStreamDataMessage,
  shouldAppendStreamData,
  shouldDeferStreamRead,
  unpackStreamDataMessage
} from "../src/stream-data.js";

describe("protocol stream data framing", () => {
  it("exposes stream system message type", () => {
    expect(STREAM_DATA_MSGTYPE).toBe(0xff00);
    expect(StreamSystemMessageTypes.SMT_STREAM_DATA).toBe(STREAM_DATA_MSGTYPE);
  });
  it("packs and unpacks stream headers with flags", () => {
    const packed = packStreamDataMessage({
      streamId: 42,
      data: new Uint8Array([9, 8, 7]),
      eof: true,
      compressed: true
    });
    const fields = unpackStreamDataMessage(packed);
    expect(fields.streamId).toBe(42);
    expect(fields.eof).toBe(true);
    expect(fields.compressed).toBe(true);
    expect([...fields.data]).toEqual([9, 8, 7]);
  });

  it("rejects invalid stream ids", () => {
    expect(() =>
      packStreamDataMessage({ streamId: STREAM_ID_MAX + 1, data: new Uint8Array(0) })
    ).toThrow(/stream_id/);
  });

  it("clamps write chunk length to data and chunk limits", () => {
    expect(clampStreamDataChunkLength(1000, 256, 16_384)).toBe(256);
    expect(clampStreamDataChunkLength(100, 256, 16_384)).toBe(100);
    expect(clampStreamDataChunkLength(1000, 2000, 500)).toBe(500);
  });

  it("skips empty stream payloads for append", () => {
    expect(shouldAppendStreamData(0)).toBe(false);
    expect(shouldAppendStreamData(1)).toBe(true);
  });

  it("clamps reader size to buffered length", () => {
    expect(clampStreamReadSize(100, 40)).toBe(40);
    expect(clampStreamReadSize(10, 40)).toBe(10);
    expect(clampStreamReadSize(0, 0)).toBe(0);
  });

  it("defers read when buffer is empty before EOF", () => {
    expect(shouldDeferStreamRead(0, false)).toBe(true);
    expect(shouldDeferStreamRead(0, true)).toBe(false);
    expect(shouldDeferStreamRead(10, false)).toBe(false);
  });
});
