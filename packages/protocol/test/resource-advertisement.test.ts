import { describe, expect, it } from "vitest";
import {
  decodeResourceAdvertisementFlags,
  encodeResourceAdvertisementFlags,
  initialPackResourceAdvertisementState,
  initialResourceAdvertisementRoleFlagsState,
  initialUnpackResourceAdvertisementState,
  isResourceAdvertisementRequest,
  isResourceAdvertisementResponse,
  packResourceAdvertisement,
  packResourceAdvertisementRawFromActions,
  planResourceAdvertisementRoleFlags,
  resourceAdvertisementFieldsFromActions,
  resourceAdvertisementRoleFlagsFromActions,
  shouldRejectUnpackResourceAdvertisement,
  shouldUsePackResourceAdvertisement,
  shouldUseResourceAdvertisementRoleFlags,
  shouldUseUnpackResourceAdvertisement,
  stepPackResourceAdvertisementWithActions,
  stepResourceAdvertisementRoleFlagsWithActions,
  stepUnpackResourceAdvertisementWithActions,
  unpackResourceAdvertisement
} from "../src/resource-advertisement.js";
import { msgpackPackString, msgpackPackStringMap, msgpackPackUInt } from "../src/msgpack-core.js";

describe("protocol msgpack string map", () => {
  it("packs short strings", () => {
    const packed = msgpackPackString("hi");
    expect(packed[0]).toBe(0xa0 | 2);
    expect([...packed.subarray(1)]).toEqual([0x68, 0x69]);
  });

  it("packs string-keyed maps", () => {
    const packed = msgpackPackStringMap([["t", msgpackPackUInt(3)]]);
    expect(packed[0]).toBe(0x81);
  });
});

describe("protocol resource advertisement", () => {
  const fields = {
    t: 1,
    d: 2,
    n: 3,
    h: new Uint8Array(32).fill(1),
    r: new Uint8Array(32).fill(2),
    o: new Uint8Array(32).fill(3),
    m: new Uint8Array([9, 8, 7]),
    f: 0,
    i: 0,
    l: 1,
    q: null as Uint8Array | null
  };

  it("round-trips packed fields", () => {
    const packed = packResourceAdvertisement(fields);
    const unpacked = unpackResourceAdvertisement(packed);
    expect(unpacked.t).toBe(1);
    expect(unpacked.d).toBe(2);
    expect(unpacked.n).toBe(3);
    expect([...unpacked.h]).toEqual([...fields.h]);
    expect([...unpacked.m]).toEqual([9, 8, 7]);
    expect(unpacked.q).toBeNull();
  });

  it("encodes and decodes flag bits", () => {
    const f = encodeResourceAdvertisementFlags({
      e: true,
      c: true,
      s: false,
      u: true,
      p: false,
      x: true
    });
    expect(decodeResourceAdvertisementFlags(f)).toEqual({
      e: true,
      c: true,
      s: false,
      u: true,
      p: false,
      x: true
    });
  });

  it("classifies request and response advertisements", () => {
    const requestId = new Uint8Array(16).fill(7);
    const request = {
      ...fields,
      q: requestId,
      f: encodeResourceAdvertisementFlags({
        e: false,
        c: false,
        s: false,
        u: true,
        p: false,
        x: false
      })
    };
    const response = {
      ...fields,
      q: requestId,
      f: encodeResourceAdvertisementFlags({
        e: false,
        c: false,
        s: false,
        u: false,
        p: true,
        x: false
      })
    };
    expect(isResourceAdvertisementRequest(request)).toBe(true);
    expect(isResourceAdvertisementResponse(request)).toBe(false);
    expect(isResourceAdvertisementResponse(response)).toBe(true);
    expect(isResourceAdvertisementRequest(response)).toBe(false);
  });

  it("plans request/response role flags", () => {
    expect(
      planResourceAdvertisementRoleFlags({
        requestIdPresent: true,
        isResponse: false
      })
    ).toEqual({ u: true, p: false });
    expect(
      planResourceAdvertisementRoleFlags({
        requestIdPresent: true,
        isResponse: true
      })
    ).toEqual({ u: false, p: true });
    expect(
      planResourceAdvertisementRoleFlags({
        requestIdPresent: false,
        isResponse: false
      })
    ).toEqual({ u: false, p: false });

    const request = stepResourceAdvertisementRoleFlagsWithActions(
      initialResourceAdvertisementRoleFlagsState(),
      {
        kind: "resource/advertisement-role-flags-gate",
        requestIdPresent: true,
        isResponse: false
      }
    );
    expect(shouldUseResourceAdvertisementRoleFlags(request.actions)).toBe(true);
    expect(resourceAdvertisementRoleFlagsFromActions(request.actions)).toEqual({
      u: true,
      p: false
    });

    const response = stepResourceAdvertisementRoleFlagsWithActions(
      initialResourceAdvertisementRoleFlagsState(),
      {
        kind: "resource/advertisement-role-flags-gate",
        requestIdPresent: true,
        isResponse: true
      }
    );
    expect(resourceAdvertisementRoleFlagsFromActions(response.actions)).toEqual({
      u: false,
      p: true
    });
  });

  it("emits pack framing bytes from WithActions steps", () => {
    const stepped = stepPackResourceAdvertisementWithActions(
      initialPackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/pack-gate",
        fields
      }
    );
    expect(shouldUsePackResourceAdvertisement(stepped.actions)).toBe(true);
    const packed = packResourceAdvertisementRawFromActions(stepped.actions);
    expect(packed).not.toBeNull();
    expect([...packed!]).toEqual([...packResourceAdvertisement(fields)]);
  });

  it("emits unpack fields or reject from WithActions steps", () => {
    const packed = packResourceAdvertisement(fields);
    const ok = stepUnpackResourceAdvertisementWithActions(
      initialUnpackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/unpack-gate",
        data: packed
      }
    );
    expect(shouldUseUnpackResourceAdvertisement(ok.actions)).toBe(true);
    expect(shouldRejectUnpackResourceAdvertisement(ok.actions)).toBe(false);
    const unpacked = resourceAdvertisementFieldsFromActions(ok.actions);
    expect(unpacked).not.toBeNull();
    expect(unpacked!.t).toBe(1);
    expect([...unpacked!.m]).toEqual([9, 8, 7]);

    const rejected = stepUnpackResourceAdvertisementWithActions(
      initialUnpackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/unpack-gate",
        data: new Uint8Array([0xff])
      }
    );
    expect(shouldRejectUnpackResourceAdvertisement(rejected.actions)).toBe(true);
    expect(shouldUseUnpackResourceAdvertisement(rejected.actions)).toBe(false);
    expect(resourceAdvertisementFieldsFromActions(rejected.actions)).toBeNull();
  });
});
