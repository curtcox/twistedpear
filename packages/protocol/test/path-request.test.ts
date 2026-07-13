import { describe, expect, it } from "vitest";
import {
  PATH_REQUEST_HASH_BYTES,
  buildPathRequestData,
  parsePathRequestData,
  pathRequestTagKey
} from "../src/path-request.js";

describe("protocol path request framing", () => {
  const destination = new Uint8Array(PATH_REQUEST_HASH_BYTES).fill(1);
  const requestor = new Uint8Array(PATH_REQUEST_HASH_BYTES).fill(2);
  const tag = new Uint8Array([0xaa, 0xbb, 0xcc, 0xdd]);

  it("builds and parses requests without a requestor id", () => {
    const packed = buildPathRequestData(destination, null, tag);
    const parsed = parsePathRequestData(packed);
    expect(parsed).not.toBeNull();
    expect([...parsed!.destinationHash]).toEqual([...destination]);
    expect(parsed!.requestorTransportId).toBeNull();
    expect([...parsed!.tag!]).toEqual([...tag]);
  });

  it("builds and parses requests with a requestor id", () => {
    const packed = buildPathRequestData(destination, requestor, tag);
    const parsed = parsePathRequestData(packed);
    expect([...parsed!.requestorTransportId!]).toEqual([...requestor]);
    expect([...parsed!.tag!]).toEqual([...tag]);
  });

  it("truncates oversize tags and rejects short payloads", () => {
    expect(parsePathRequestData(new Uint8Array(8))).toBeNull();
    const longTag = new Uint8Array(PATH_REQUEST_HASH_BYTES + 4).fill(9);
    const packed = buildPathRequestData(destination, requestor, longTag);
    const parsed = parsePathRequestData(packed);
    expect(parsed!.tag!.length).toBe(PATH_REQUEST_HASH_BYTES);
    expect([...parsed!.requestorTransportId!]).toEqual([...requestor]);
  });

  it("builds deterministic tag keys", () => {
    expect(pathRequestTagKey(destination, tag)).toBe(pathRequestTagKey(destination, tag));
    expect(pathRequestTagKey(destination, tag)).not.toBe(pathRequestTagKey(requestor, tag));
  });
});
