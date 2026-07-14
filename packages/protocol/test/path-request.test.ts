import { describe, expect, it } from "vitest";
import {
  PATH_REQUEST_HASH_BYTES,
  buildPathRequestData,
  buildPathRequestDataRawFromActions,
  initialBuildPathRequestDataState,
  initialParsePathRequestDataState,
  initialPathRequestTagKeyState,
  parsePathRequestData,
  pathRequestFieldsFromActions,
  pathRequestTagKey,
  pathRequestTagKeyFromActions,
  shouldRejectParsePathRequestData,
  shouldUseBuildPathRequestData,
  shouldUseParsePathRequestData,
  shouldUsePathRequestTagKey,
  stepBuildPathRequestDataWithActions,
  stepParsePathRequestDataWithActions,
  stepPathRequestTagKeyWithActions
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

  it("emits build framing bytes from WithActions step", () => {
    const stepped = stepBuildPathRequestDataWithActions(initialBuildPathRequestDataState(), {
      kind: "path-request/build-data-gate",
      destinationHash: destination,
      requestorTransportId: requestor,
      tag
    });
    expect(shouldUseBuildPathRequestData(stepped.actions)).toBe(true);
    const packed = buildPathRequestDataRawFromActions(stepped.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...buildPathRequestData(destination, requestor, tag)]);
  });

  it("emits parse fields or reject from WithActions step", () => {
    const packed = buildPathRequestData(destination, null, tag);
    const ok = stepParsePathRequestDataWithActions(initialParsePathRequestDataState(), {
      kind: "path-request/parse-data-gate",
      data: packed
    });
    expect(shouldUseParsePathRequestData(ok.actions)).toBe(true);
    expect(shouldRejectParsePathRequestData(ok.actions)).toBe(false);
    const fields = pathRequestFieldsFromActions(ok.actions);
    expect(fields).not.toBeNull();
    expect([...fields!.destinationHash]).toEqual([...destination]);
    expect(fields!.requestorTransportId).toBeNull();
    expect([...fields!.tag!]).toEqual([...tag]);

    const rejected = stepParsePathRequestDataWithActions(initialParsePathRequestDataState(), {
      kind: "path-request/parse-data-gate",
      data: new Uint8Array(8)
    });
    expect(shouldRejectParsePathRequestData(rejected.actions)).toBe(true);
    expect(shouldUseParsePathRequestData(rejected.actions)).toBe(false);
    expect(pathRequestFieldsFromActions(rejected.actions)).toBeNull();
  });

  it("emits tag key from WithActions step", () => {
    const stepped = stepPathRequestTagKeyWithActions(initialPathRequestTagKeyState(), {
      kind: "path-request/tag-key-gate",
      destinationHash: destination,
      tag
    });
    expect(shouldUsePathRequestTagKey(stepped.actions)).toBe(true);
    expect(pathRequestTagKeyFromActions(stepped.actions)).toBe(
      pathRequestTagKey(destination, tag)
    );
  });
});
