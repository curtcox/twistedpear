import { describe, expect, it } from "vitest";
import {
  HDLC_FLAG,
  decodeHdlcFrames,
  encodeHdlcFrame,
  initialHdlcStreamState,
  pushHdlcBytes
} from "../src/hdlc.js";

describe("protocol HDLC framing", () => {
  it("round-trips payloads including flag/escape bytes", () => {
    const payload = new Uint8Array([0x01, HDLC_FLAG, 0x02, 0x7d, 0x03]);
    const encoded = encodeHdlcFrame(payload);
    const decoded = decodeHdlcFrames(encoded);
    expect(decoded.frames).toHaveLength(1);
    expect([...decoded.frames[0]!]).toEqual([...payload]);
    expect(decoded.inEscape).toBe(false);
  });

  it("streams across chunk boundaries", () => {
    const payload = new Uint8Array([10, 20, 30]);
    const encoded = encodeHdlcFrame(payload);
    let state = initialHdlcStreamState();
    state = pushHdlcBytes(state, encoded.subarray(0, 3));
    expect(state.frames).toHaveLength(0);
    state = pushHdlcBytes(state, encoded.subarray(3));
    expect(state.frames).toHaveLength(1);
    expect([...state.frames[0]!]).toEqual([...payload]);
  });

  it("double-runs identically", () => {
    const run = () => {
      const payload = new Uint8Array([0x7e, 0x00, 0x7d]);
      return [...encodeHdlcFrame(payload)];
    };
    expect(run()).toEqual(run());
  });
});
