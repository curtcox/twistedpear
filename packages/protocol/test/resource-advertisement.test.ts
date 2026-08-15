import { describe, expect, it } from "vitest";
import {
  decodeResourceAdvertisementFlags,
  encodeResourceAdvertisementFlags,
  encodeResourceAdvertisementFlagsFromActions,
  initialClassifyResourceAdvertisementState,
  initialDecodeResourceAdvertisementFlagsState,
  initialEncodeResourceAdvertisementFlagsState,
  initialPackResourceAdvertisementState,
  initialResourceAdvertisementRoleFlagsPlanState,
  initialResourceAdvertisementRoleFlagsState,
  initialUnpackResourceAdvertisementState,
  isResourceAdvertisementRequest,
  isResourceAdvertisementResponse,
  packResourceAdvertisement,
  packResourceAdvertisementRawFromActions,
  planResourceAdvertisementRoleFlags,
  resourceAdvertisementFieldsFromActions,
  resourceAdvertisementFlagFieldsFromActions,
  resourceAdvertisementRoleFlagsFromActions,
  resourceAdvertisementRoleFlagsPlanFromActions,
  shouldClassifyResourceAdvertisementRequest,
  shouldClassifyResourceAdvertisementResponse,
  shouldRejectClassifyResourceAdvertisement,
  shouldRejectUnpackResourceAdvertisement,
  shouldUseDecodeResourceAdvertisementFlags,
  shouldUseEncodeResourceAdvertisementFlags,
  shouldUsePackResourceAdvertisement,
  shouldUseResourceAdvertisementRoleFlags,
  shouldUseResourceAdvertisementRoleFlagsPlan,
  shouldUseUnpackResourceAdvertisement,
  stepClassifyResourceAdvertisementWithActions,
  stepDecodeResourceAdvertisementFlagsWithActions,
  stepEncodeResourceAdvertisementFlagsWithActions,
  stepPackResourceAdvertisementWithActions,
  stepResourceAdvertisementRoleFlagsPlanWithActions,
  stepResourceAdvertisementRoleFlagsWithActions,
  stepUnpackResourceAdvertisementWithActions,
  unpackResourceAdvertisement,
} from "../src/resource-advertisement.js";
import {
  msgpackPackString,
  msgpackPackStringMap,
  msgpackPackUInt,
} from "../src/msgpack-core.js";

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
  q: null as Uint8Array | null,
};

describe("protocol resource advertisement", () => {
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
      x: true,
    });
    expect(decodeResourceAdvertisementFlags(f)).toEqual({
      e: true,
      c: true,
      s: false,
      u: true,
      p: false,
      x: true,
    });
  });

  it("emits flag encode / decode from WithActions steps", () => {
    const flagFields = {
      e: true,
      c: true,
      s: false,
      u: true,
      p: false,
      x: true,
    };
    const encodeStepped = stepEncodeResourceAdvertisementFlagsWithActions(
      initialEncodeResourceAdvertisementFlagsState(),
      {
        kind: "resource-advertisement/encode-flags-gate",
        flags: flagFields,
      },
    );
    expect(
      shouldUseEncodeResourceAdvertisementFlags(encodeStepped.actions),
    ).toBe(true);
    const packed = encodeResourceAdvertisementFlagsFromActions(
      encodeStepped.actions,
    );
    expect(packed).toBe(encodeResourceAdvertisementFlags(flagFields));

    const decodeStepped = stepDecodeResourceAdvertisementFlagsWithActions(
      initialDecodeResourceAdvertisementFlagsState(),
      {
        kind: "resource-advertisement/decode-flags-gate",
        flags: packed!,
      },
    );
    expect(
      shouldUseDecodeResourceAdvertisementFlags(decodeStepped.actions),
    ).toBe(true);
    expect(
      resourceAdvertisementFlagFieldsFromActions(decodeStepped.actions),
    ).toEqual(flagFields);

    expect(
      stepEncodeResourceAdvertisementFlagsWithActions(
        initialEncodeResourceAdvertisementFlagsState(),
        {
          kind: "timer/fired",
          id: "x",
          at: 0,
        },
      ).actions,
    ).toEqual([]);
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
        x: false,
      }),
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
        x: false,
      }),
    };
    expect(isResourceAdvertisementRequest(request)).toBe(true);
    expect(isResourceAdvertisementResponse(request)).toBe(false);
    expect(isResourceAdvertisementResponse(response)).toBe(true);
    expect(isResourceAdvertisementRequest(response)).toBe(false);

    const requestStepped = stepClassifyResourceAdvertisementWithActions(
      initialClassifyResourceAdvertisementState(),
      {
        kind: "resource-advertisement/classify-gate",
        fields: request,
      },
    );
    expect(
      shouldClassifyResourceAdvertisementRequest(requestStepped.actions),
    ).toBe(true);
    expect(
      shouldClassifyResourceAdvertisementResponse(requestStepped.actions),
    ).toBe(false);
    expect(
      shouldRejectClassifyResourceAdvertisement(requestStepped.actions),
    ).toBe(false);

    const responseStepped = stepClassifyResourceAdvertisementWithActions(
      initialClassifyResourceAdvertisementState(),
      {
        kind: "resource-advertisement/classify-gate",
        fields: response,
      },
    );
    expect(
      shouldClassifyResourceAdvertisementResponse(responseStepped.actions),
    ).toBe(true);
    expect(
      shouldClassifyResourceAdvertisementRequest(responseStepped.actions),
    ).toBe(false);

    const neither = stepClassifyResourceAdvertisementWithActions(
      initialClassifyResourceAdvertisementState(),
      {
        kind: "resource-advertisement/classify-gate",
        fields,
      },
    );
    expect(shouldRejectClassifyResourceAdvertisement(neither.actions)).toBe(
      true,
    );
  });
});

describe("protocol resource advertisement (continued)", () => {
  it("plans request/response role flags", () => {
    expect(
      planResourceAdvertisementRoleFlags({
        requestIdPresent: true,
        isResponse: false,
      }),
    ).toEqual({ u: true, p: false });
    expect(
      planResourceAdvertisementRoleFlags({
        requestIdPresent: true,
        isResponse: true,
      }),
    ).toEqual({ u: false, p: true });
    expect(
      planResourceAdvertisementRoleFlags({
        requestIdPresent: false,
        isResponse: false,
      }),
    ).toEqual({ u: false, p: false });

    const requestPlan = stepResourceAdvertisementRoleFlagsPlanWithActions(
      initialResourceAdvertisementRoleFlagsPlanState(),
      {
        kind: "resource/advertisement-role-flags-plan-gate",
        requestIdPresent: true,
        isResponse: false,
      },
    );
    expect(
      shouldUseResourceAdvertisementRoleFlagsPlan(requestPlan.actions),
    ).toBe(true);
    expect(
      resourceAdvertisementRoleFlagsPlanFromActions(requestPlan.actions),
    ).toEqual({
      u: true,
      p: false,
    });

    const request = stepResourceAdvertisementRoleFlagsWithActions(
      initialResourceAdvertisementRoleFlagsState(),
      {
        kind: "resource/advertisement-role-flags-gate",
        requestIdPresent: true,
        isResponse: false,
      },
    );
    expect(shouldUseResourceAdvertisementRoleFlags(request.actions)).toBe(true);
    expect(resourceAdvertisementRoleFlagsFromActions(request.actions)).toEqual({
      u: true,
      p: false,
    });

    const response = stepResourceAdvertisementRoleFlagsWithActions(
      initialResourceAdvertisementRoleFlagsState(),
      {
        kind: "resource/advertisement-role-flags-gate",
        requestIdPresent: true,
        isResponse: true,
      },
    );
    expect(resourceAdvertisementRoleFlagsFromActions(response.actions)).toEqual(
      {
        u: false,
        p: true,
      },
    );
  });

  it("emits pack framing bytes from WithActions steps", () => {
    const stepped = stepPackResourceAdvertisementWithActions(
      initialPackResourceAdvertisementState(),
      {
        kind: "resource-advertisement/pack-gate",
        fields,
      },
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
        data: packed,
      },
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
        data: new Uint8Array([0xff]),
      },
    );
    expect(shouldRejectUnpackResourceAdvertisement(rejected.actions)).toBe(
      true,
    );
    expect(shouldUseUnpackResourceAdvertisement(rejected.actions)).toBe(false);
    expect(resourceAdvertisementFieldsFromActions(rejected.actions)).toBeNull();
  });
});

/**
 * `q` is optional in value, not in presence.
 *
 * RNS reads it as `dictionary["q"]`, so an advertisement that omits the key
 * raises `KeyError` there. Treating absent and nil alike meant an advertisement
 * whose `q` key had been corrupted into anything else — differential fuzzing
 * produced `"$"` — was accepted here and refused by every reference peer.
 */
describe("unpackResourceAdvertisement key presence", () => {
  const fields = {
    t: 1024,
    d: 512,
    n: 4,
    h: Uint8Array.from([1, 2]),
    r: Uint8Array.from([3]),
    o: Uint8Array.from([4]),
    m: Uint8Array.from([5]),
    f: 0x02,
    i: 1,
    l: 1,
    q: null,
  };

  it("accepts an explicit nil q as no request id", () => {
    expect(
      unpackResourceAdvertisement(packResourceAdvertisement(fields)).q,
    ).toBeNull();
  });

  it("refuses an advertisement whose q key is missing", () => {
    // Rename the key rather than dropping it, so the map still has eleven
    // entries and only its name is wrong — exactly what the fuzzer produced.
    const packed = packResourceAdvertisement(fields);
    const renamed = Uint8Array.from(packed);
    const keyIndex = renamed.indexOf(0x71, 1); // the "q" of the `a171` key
    expect(keyIndex).toBeGreaterThan(0);
    renamed[keyIndex] = 0x24; // "$"
    expect(() => unpackResourceAdvertisement(renamed)).toThrow(/q/);
  });
});
