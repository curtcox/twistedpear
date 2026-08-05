import { describe, expect, it } from "vitest";
import { msgpackPackBin } from "../src/msgpack-core.js";
import {
  initialPackLinkRequestState,
  initialPackLinkResponseState,
  initialUnpackLinkRequestState,
  initialUnpackLinkResponseState,
  linkRequestFieldsFromActions,
  linkResponseFieldsFromActions,
  msgpackPackLinkRequest,
  msgpackPackLinkResponse,
  msgpackUnpackLinkRequest,
  msgpackUnpackLinkRequestTuple,
  msgpackUnpackLinkResponse,
  msgpackUnpackLinkResponseTuple,
  packLinkRequestRawFromActions,
  packLinkResponseRawFromActions,
  shouldRejectUnpackLinkRequest,
  shouldRejectUnpackLinkResponse,
  shouldUsePackLinkRequest,
  shouldUsePackLinkResponse,
  shouldUseUnpackLinkRequest,
  shouldUseUnpackLinkResponse,
  stepPackLinkRequestWithActions,
  stepPackLinkResponseWithActions,
  stepUnpackLinkRequestWithActions,
  stepUnpackLinkResponseWithActions,
} from "../src/link-request-codec.js";

describe("protocol link request/response msgpack", () => {
  it("round-trips a request with payload", () => {
    const pathHash = new Uint8Array(16).map((_, i) => i + 1);
    // Opaque payloads must be bin-framed before pack (same as Python bytes).
    const data = msgpackPackBin(Uint8Array.from([9, 8, 7]));
    const packed = msgpackPackLinkRequest(12.5, pathHash, data);
    const unpacked = msgpackUnpackLinkRequest(packed);
    expect(unpacked.requestedAt).toBe(12.5);
    expect([...unpacked.pathHash]).toEqual([...pathHash]);
    expect([...unpacked.data!]).toEqual([9, 8, 7]);
    expect(msgpackUnpackLinkRequestTuple(packed)[0]).toBe(12.5);
  });

  it("round-trips a request with nil data", () => {
    const pathHash = new Uint8Array(16);
    const unpacked = msgpackUnpackLinkRequest(
      msgpackPackLinkRequest(1, pathHash, null),
    );
    expect(unpacked.data).toBeNull();
  });

  it("embeds structured LXMF request data like Python RNS Link.request", () => {
    const pathHash = new Uint8Array(16).map((_, i) => i + 1);
    // packb([None, None]) — must not be wrapped in an extra bin frame.
    const listRequest = Uint8Array.from([0x92, 0xc0, 0xc0]);
    const packed = msgpackPackLinkRequest(12.5, pathHash, listRequest);
    const unpacked = msgpackUnpackLinkRequest(packed);
    expect([...unpacked.data!]).toEqual([0x92, 0xc0, 0xc0]);
  });

  it("accepts Python-style nested msgpack data (not binary-framed)", () => {
    // umsgpack.packb([timestamp, path_hash, [None, None]]) from RNS Link.request
    const packed = Uint8Array.from(
      Buffer.from(
        "93cb41d26580b4800000c4109dc1a72883468f57fed571e796e9ce9892c0c0",
        "hex",
      ),
    );
    const unpacked = msgpackUnpackLinkRequest(packed);
    expect(unpacked.pathHash).toHaveLength(16);
    expect(unpacked.data).not.toBeNull();
    expect([...unpacked.data!]).toEqual([0x92, 0xc0, 0xc0]);
  });

  it("round-trips a response", () => {
    const requestId = new Uint8Array(16).map((_, i) => 100 + i);
    // Production handlers return a complete msgpack value (e.g. array of bins).
    const responseBody = msgpackPackBin(Uint8Array.from([1, 2]));
    const packed = msgpackPackLinkResponse(requestId, responseBody);
    const unpacked = msgpackUnpackLinkResponse(packed);
    expect([...unpacked.requestId]).toEqual([...requestId]);
    // Embedded bin values unpack to their payload bytes.
    expect([...unpacked.response!]).toEqual([1, 2]);
    expect(
      msgpackUnpackLinkResponseTuple(
        msgpackPackLinkResponse(requestId, null),
      )[1],
    ).toBeNull();
  });

  it("rejects malformed payloads", () => {
    expect(() => msgpackUnpackLinkRequest(new Uint8Array([0xc0]))).toThrow(
      /Invalid request/,
    );
    expect(() => msgpackUnpackLinkResponse(new Uint8Array([0xc0]))).toThrow(
      /Invalid response/,
    );
  });

  it("emits pack framing bytes from WithActions steps", () => {
    const pathHash = new Uint8Array(16).map((_, i) => i + 1);
    const data = msgpackPackBin(Uint8Array.from([9, 8, 7]));
    const requestStepped = stepPackLinkRequestWithActions(
      initialPackLinkRequestState(),
      {
        kind: "link-request-codec/pack-gate",
        requestedAt: 12.5,
        pathHash,
        data,
      },
    );
    expect(shouldUsePackLinkRequest(requestStepped.actions)).toBe(true);
    const packedRequest = packLinkRequestRawFromActions(requestStepped.actions);
    expect(packedRequest).not.toBeNull();
    expect([...packedRequest!]).toEqual([
      ...msgpackPackLinkRequest(12.5, pathHash, data),
    ]);

    const requestId = new Uint8Array(16).map((_, i) => 100 + i);
    const responseBody = msgpackPackBin(Uint8Array.from([1, 2]));
    const responseStepped = stepPackLinkResponseWithActions(
      initialPackLinkResponseState(),
      {
        kind: "link-response-codec/pack-gate",
        requestId,
        response: responseBody,
      },
    );
    expect(shouldUsePackLinkResponse(responseStepped.actions)).toBe(true);
    const packedResponse = packLinkResponseRawFromActions(
      responseStepped.actions,
    );
    expect(packedResponse).not.toBeNull();
    expect([...packedResponse!]).toEqual([
      ...msgpackPackLinkResponse(requestId, responseBody),
    ]);
  });

  it("emits unpack fields or reject from WithActions steps", () => {
    const pathHash = new Uint8Array(16).map((_, i) => i + 1);
    const data = msgpackPackBin(Uint8Array.from([9, 8, 7]));
    const packedRequest = msgpackPackLinkRequest(12.5, pathHash, data);
    const okRequest = stepUnpackLinkRequestWithActions(
      initialUnpackLinkRequestState(),
      {
        kind: "link-request-codec/unpack-gate",
        data: packedRequest,
      },
    );
    expect(shouldUseUnpackLinkRequest(okRequest.actions)).toBe(true);
    expect(shouldRejectUnpackLinkRequest(okRequest.actions)).toBe(false);
    const requestFields = linkRequestFieldsFromActions(okRequest.actions);
    expect(requestFields).not.toBeNull();
    expect(requestFields!.requestedAt).toBe(12.5);
    expect([...requestFields!.pathHash]).toEqual([...pathHash]);
    expect([...requestFields!.data!]).toEqual([9, 8, 7]);

    const rejectedRequest = stepUnpackLinkRequestWithActions(
      initialUnpackLinkRequestState(),
      {
        kind: "link-request-codec/unpack-gate",
        data: new Uint8Array([0xc0]),
      },
    );
    expect(shouldRejectUnpackLinkRequest(rejectedRequest.actions)).toBe(true);
    expect(shouldUseUnpackLinkRequest(rejectedRequest.actions)).toBe(false);
    expect(linkRequestFieldsFromActions(rejectedRequest.actions)).toBeNull();

    const requestId = new Uint8Array(16).map((_, i) => 100 + i);
    const responseBody = msgpackPackBin(Uint8Array.from([1, 2]));
    const packedResponse = msgpackPackLinkResponse(requestId, responseBody);
    const okResponse = stepUnpackLinkResponseWithActions(
      initialUnpackLinkResponseState(),
      {
        kind: "link-response-codec/unpack-gate",
        data: packedResponse,
      },
    );
    expect(shouldUseUnpackLinkResponse(okResponse.actions)).toBe(true);
    expect(shouldRejectUnpackLinkResponse(okResponse.actions)).toBe(false);
    const responseFields = linkResponseFieldsFromActions(okResponse.actions);
    expect(responseFields).not.toBeNull();
    expect([...responseFields!.requestId]).toEqual([...requestId]);
    expect([...responseFields!.response!]).toEqual([1, 2]);

    const rejectedResponse = stepUnpackLinkResponseWithActions(
      initialUnpackLinkResponseState(),
      {
        kind: "link-response-codec/unpack-gate",
        data: new Uint8Array([0xc0]),
      },
    );
    expect(shouldRejectUnpackLinkResponse(rejectedResponse.actions)).toBe(true);
    expect(shouldUseUnpackLinkResponse(rejectedResponse.actions)).toBe(false);
    expect(linkResponseFieldsFromActions(rejectedResponse.actions)).toBeNull();
  });
});
