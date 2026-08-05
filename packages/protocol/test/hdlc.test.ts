import { describe, expect, it } from "vitest";
import {
  HDLC_FLAG,
  decodeHdlcFrames,
  encodeHdlcFrame,
  encodeHdlcFrameRawFromActions,
  hdlcDecodeResultFromActions,
  initialDecodeHdlcFramesState,
  initialEncodeHdlcFrameState,
  initialHdlcStreamState,
  pushHdlcBytes,
  shouldUseDecodeHdlcFrames,
  shouldUseEncodeHdlcFrame,
  stepDecodeHdlcFramesWithActions,
  stepEncodeHdlcFrameWithActions,
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

  it("encodes via use-raw actions", () => {
    const payload = new Uint8Array([0x01, HDLC_FLAG, 0x02]);
    const stepped = stepEncodeHdlcFrameWithActions(
      initialEncodeHdlcFrameState(),
      {
        kind: "hdlc/encode-gate",
        payload,
      },
    );
    expect(shouldUseEncodeHdlcFrame(stepped.actions)).toBe(true);
    const raw = encodeHdlcFrameRawFromActions(stepped.actions);
    expect([...raw!]).toEqual([...encodeHdlcFrame(payload)]);
  });

  it("decodes via use-fields actions across chunks", () => {
    const payload = new Uint8Array([10, 20, 30]);
    const encoded = encodeHdlcFrame(payload);

    const first = stepDecodeHdlcFramesWithActions(
      initialDecodeHdlcFramesState(),
      {
        kind: "hdlc/decode-gate",
        input: encoded.subarray(0, 3),
      },
    );
    expect(shouldUseDecodeHdlcFrames(first.actions)).toBe(true);
    const firstFields = hdlcDecodeResultFromActions(first.actions);
    expect(firstFields).not.toBeNull();
    expect(firstFields!.frames).toHaveLength(0);

    const second = stepDecodeHdlcFramesWithActions(
      initialDecodeHdlcFramesState(),
      {
        kind: "hdlc/decode-gate",
        input: encoded.subarray(3),
        decodeState: {
          buffer: firstFields!.buffer,
          inEscape: firstFields!.inEscape,
        },
      },
    );
    expect(shouldUseDecodeHdlcFrames(second.actions)).toBe(true);
    const secondFields = hdlcDecodeResultFromActions(second.actions);
    expect(secondFields).not.toBeNull();
    expect(secondFields!.frames).toHaveLength(1);
    expect([...secondFields!.frames[0]!]).toEqual([...payload]);
    expect(secondFields!.inEscape).toBe(false);
  });
});
