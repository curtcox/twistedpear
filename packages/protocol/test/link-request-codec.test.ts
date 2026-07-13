import { describe, expect, it } from "vitest";
import {
  msgpackPackLinkRequest,
  msgpackPackLinkResponse,
  msgpackUnpackLinkRequest,
  msgpackUnpackLinkRequestTuple,
  msgpackUnpackLinkResponse,
  msgpackUnpackLinkResponseTuple
} from "../src/link-request-codec.js";

describe("protocol link request/response msgpack", () => {
  it("round-trips a request with payload", () => {
    const pathHash = new Uint8Array(16).map((_, i) => i + 1);
    const data = Uint8Array.from([9, 8, 7]);
    const packed = msgpackPackLinkRequest(12.5, pathHash, data);
    const unpacked = msgpackUnpackLinkRequest(packed);
    expect(unpacked.requestedAt).toBe(12.5);
    expect([...unpacked.pathHash]).toEqual([...pathHash]);
    expect([...unpacked.data!]).toEqual([9, 8, 7]);
    expect(msgpackUnpackLinkRequestTuple(packed)[0]).toBe(12.5);
  });

  it("round-trips a request with nil data", () => {
    const pathHash = new Uint8Array(16);
    const unpacked = msgpackUnpackLinkRequest(msgpackPackLinkRequest(1, pathHash, null));
    expect(unpacked.data).toBeNull();
  });

  it("round-trips a response", () => {
    const requestId = new Uint8Array(16).map((_, i) => 100 + i);
    const packed = msgpackPackLinkResponse(requestId, Uint8Array.from([1, 2]));
    const unpacked = msgpackUnpackLinkResponse(packed);
    expect([...unpacked.requestId]).toEqual([...requestId]);
    expect([...unpacked.response!]).toEqual([1, 2]);
    expect(msgpackUnpackLinkResponseTuple(msgpackPackLinkResponse(requestId, null))[1]).toBeNull();
  });

  it("rejects malformed payloads", () => {
    expect(() => msgpackUnpackLinkRequest(new Uint8Array([0xc0]))).toThrow(/Invalid request/);
    expect(() => msgpackUnpackLinkResponse(new Uint8Array([0xc0]))).toThrow(/Invalid response/);
  });
});
