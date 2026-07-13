import { describe, expect, it } from "vitest";
import {
  STREAM_ID_MAX,
  packStreamDataMessage,
  unpackStreamDataMessage
} from "../src/stream-data.js";

describe("protocol stream data framing", () => {
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
});
