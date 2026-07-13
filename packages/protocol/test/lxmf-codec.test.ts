import { describe, expect, it } from "vitest";
import {
  packLxmPayload,
  packPropagationEnvelope,
  packPropagationRequest,
  unpackLxmPayload,
  unpackPropagationEnvelope,
  unpackPropagationRequest
} from "../src/lxmf-codec.js";

describe("protocol lxmf codec", () => {
  it("round-trips LXM payloads", () => {
    const packed = packLxmPayload(
      1.5,
      new Uint8Array([1]),
      new Uint8Array([2, 3]),
      { 1: new Uint8Array([9]) },
      new Uint8Array([7])
    );
    const unpacked = unpackLxmPayload(packed);
    expect(unpacked.timestamp).toBe(1.5);
    expect([...unpacked.title]).toEqual([1]);
    expect([...unpacked.content]).toEqual([2, 3]);
    expect([...unpacked.fields[1]!]).toEqual([9]);
    expect([...unpacked.stamp!]).toEqual([7]);
  });

  it("round-trips propagation requests", () => {
    const wants = [new Uint8Array([1, 2])];
    const packed = packPropagationRequest(wants, null, 100);
    const [w, h, limit] = unpackPropagationRequest(packed);
    expect(w).toHaveLength(1);
    expect([...w![0]!]).toEqual([1, 2]);
    expect(h).toBeNull();
    expect(limit).toBe(100);
  });

  it("round-trips propagation envelopes", () => {
    const packed = packPropagationEnvelope(10, [new Uint8Array([4, 5])]);
    const messages = unpackPropagationEnvelope(packed);
    expect(messages).toHaveLength(1);
    expect([...messages[0]!]).toEqual([4, 5]);
  });
});
