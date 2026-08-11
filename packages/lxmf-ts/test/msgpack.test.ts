import { describe, expect, it } from "vitest";
import {
  msgpackPackPropagationEnvelope,
  msgpackPackPropagationRequest,
  msgpackUnpackPropagationEnvelope,
  msgpackUnpackPropagationRequest,
} from "../src/index.js";
import { msgpackUnpack } from "../src/msgpack.js";

const bytes = (...values: number[]) => Uint8Array.from(values);

/** Transient IDs are what a propagation peer actually exchanges in wants/haves. */
const transientId = (fill: number) => new Uint8Array(32).fill(fill);

describe("propagation request codec", () => {
  it("round-trips wants, haves, and the transfer limit", () => {
    const wants = [transientId(1), transientId(2)];
    const haves = [transientId(3)];

    const [decodedWants, decodedHaves, limit] = msgpackUnpackPropagationRequest(
      msgpackPackPropagationRequest(wants, haves, 256),
    );

    expect(decodedWants).toEqual(wants);
    expect(decodedHaves).toEqual(haves);
    expect(limit).toBe(256);
  });

  it("keeps null lists distinct from empty ones", () => {
    // LXMF reads these differently: nil means "no opinion", an empty array
    // means "I asked, and the answer is nothing".
    const [nullWants, nullHaves] = msgpackUnpackPropagationRequest(
      msgpackPackPropagationRequest(null, null),
    );
    expect(nullWants).toBeNull();
    expect(nullHaves).toBeNull();

    const [emptyWants, emptyHaves] = msgpackUnpackPropagationRequest(
      msgpackPackPropagationRequest([], []),
    );
    expect(emptyWants).toEqual([]);
    expect(emptyHaves).toEqual([]);
  });

  it("omits the transfer limit rather than encoding a null one", () => {
    const packed = msgpackPackPropagationRequest([transientId(4)], null);
    const value = msgpackUnpack(packed);

    expect(value.type).toBe("array");
    if (value.type !== "array") throw new Error("expected an array");
    expect(value.array).toHaveLength(2);
    expect(msgpackUnpackPropagationRequest(packed)[2]).toBeNull();
  });

  it("packs nil lists in the shape the Python reference expects", () => {
    // fixarray(2), nil, nil — pinned so a msgpack-core change cannot silently
    // alter the wire encoding.
    expect(msgpackPackPropagationRequest(null, null)).toEqual(
      bytes(0x92, 0xc0, 0xc0),
    );
  });

  it("packs bin entries in the shape the Python reference expects", () => {
    expect(
      msgpackPackPropagationRequest([bytes(0x01, 0x02)], [bytes(0x03)]),
    ).toEqual(
      bytes(0x92, 0x91, 0xc4, 0x02, 0x01, 0x02, 0x91, 0xc4, 0x01, 0x03),
    );
  });

  it("rejects a frame that is not a two-element array", () => {
    expect(() => msgpackUnpackPropagationRequest(bytes(0xc0))).toThrow(
      /Invalid propagation request payload/,
    );
    expect(() => msgpackUnpackPropagationRequest(bytes(0x91, 0xc0))).toThrow(
      /Invalid propagation request payload/,
    );
  });

  it("rejects a list holding something other than bin entries", () => {
    const packed = bytes(0x92, 0x91, 0xc0, 0xc0);
    expect(() => msgpackUnpackPropagationRequest(packed)).toThrow(
      /Invalid propagation request list entry/,
    );
  });
});

describe("propagation envelope codec", () => {
  it("round-trips messages and preserves the timestamp", () => {
    const messages = [bytes(0xaa, 0xbb), bytes(0xcc)];
    const packed = msgpackPackPropagationEnvelope(1_700_000_000.5, messages);

    expect(msgpackUnpackPropagationEnvelope(packed)).toEqual(messages);

    const value = msgpackUnpack(packed);
    if (value.type !== "array") throw new Error("expected an array");
    const timestamp = value.array[0];
    if (timestamp?.type !== "float") throw new Error("expected a float");
    expect(timestamp.float).toBe(1_700_000_000.5);
  });

  it("carries an empty message list", () => {
    const packed = msgpackPackPropagationEnvelope(0, []);
    expect(msgpackUnpackPropagationEnvelope(packed)).toEqual([]);
    // fixarray(2), float64(0), fixarray(0)
    expect(packed).toEqual(bytes(0x92, 0xcb, 0, 0, 0, 0, 0, 0, 0, 0, 0x90));
  });

  it("rejects an envelope with the wrong arity", () => {
    expect(() =>
      msgpackUnpackPropagationEnvelope(
        bytes(0x91, 0xcb, 0, 0, 0, 0, 0, 0, 0, 0),
      ),
    ).toThrow(/Invalid propagation envelope/);
  });

  it("rejects an envelope whose messages are not a list", () => {
    expect(() =>
      msgpackUnpackPropagationEnvelope(
        bytes(0x92, 0xcb, 0, 0, 0, 0, 0, 0, 0, 0, 0xc0),
      ),
    ).toThrow(/Invalid propagation envelope messages/);
  });

  it("rejects an envelope holding a non-bin message", () => {
    expect(() =>
      msgpackUnpackPropagationEnvelope(
        bytes(0x92, 0xcb, 0, 0, 0, 0, 0, 0, 0, 0, 0x91, 0xc0),
      ),
    ).toThrow(/Invalid propagation envelope message/);
  });

  it("cannot pack more than a fixarray of messages", () => {
    // Characterization, not endorsement: msgpackPackArray only emits fixarray,
    // so any packed list is capped at 15 entries. The sender in message.ts
    // only ever packs a single message, so this cap is harmless here — but the
    // same cap on the wants list in PropagationSync.continueDownload is not.
    const messages = Array.from({ length: 16 }, (_, index) => bytes(index));
    expect(() => msgpackPackPropagationEnvelope(0, messages)).toThrow(
      /at most 15 items/,
    );
  });
});
