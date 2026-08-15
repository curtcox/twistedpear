import { describe, expect, it } from "vitest";
import {
  initialPackMsgpackFloat64State,
  initialUnpackMsgpackFloatState,
  msgpackFloatFromActions,
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackUnpackFloat,
  msgpackPackNil,
  msgpackPackString,
  msgpackPackStringMap,
  msgpackPackUInt,
  msgpackUnpack,
  msgpackUnpackScalar,
  packMsgpackFloat64RawFromActions,
  shouldRejectUnpackMsgpackFloat,
  shouldUsePackMsgpackFloat64,
  shouldUseUnpackMsgpackFloat,
  stepPackMsgpackFloat64WithActions,
  stepUnpackMsgpackFloatWithActions,
} from "../src/msgpack-core.js";

describe("protocol msgpack core", () => {
  it("packs and unpacks integers", () => {
    expect(msgpackUnpackScalar(msgpackPackUInt(0))).toEqual({
      type: "int",
      int: 0,
    });
    expect(msgpackUnpackScalar(msgpackPackUInt(127))).toEqual({
      type: "int",
      int: 127,
    });
    expect(msgpackUnpackScalar(msgpackPackUInt(200))).toEqual({
      type: "int",
      int: 200,
    });
    expect(msgpackUnpackScalar(msgpackPackUInt(1000))).toEqual({
      type: "int",
      int: 1000,
    });
  });

  it("packs bins and nil", () => {
    const bin = new Uint8Array([1, 2, 3]);
    const packed = msgpackPackBin(bin);
    const unpacked = msgpackUnpackScalar(packed);
    expect(unpacked.type).toBe("bin");
    if (unpacked.type === "bin") {
      expect([...unpacked.bin]).toEqual([1, 2, 3]);
    }
    expect(msgpackUnpackScalar(msgpackPackNil())).toEqual({ type: "nil" });
  });

  it("packs float64 and arrays deterministically", () => {
    const float = msgpackPackFloat64(1.5);
    expect(msgpackUnpackScalar(float)).toEqual({ type: "float", float: 1.5 });
    expect(msgpackUnpackFloat(float)).toBe(1.5);
    const float32 = new Uint8Array(5);
    float32[0] = 0xca;
    new DataView(float32.buffer).setFloat32(1, 2.5, false);
    expect(msgpackUnpackFloat(float32)).toBe(2.5);
    const array = msgpackPackArray([msgpackPackUInt(1), msgpackPackUInt(2)]);
    expect(array[0]).toBe(0x92);
    expect([...array]).toEqual([
      ...msgpackPackArray([msgpackPackUInt(1), msgpackPackUInt(2)]),
    ]);
  });

  it("packs and unpacks float via WithActions", () => {
    const packed = stepPackMsgpackFloat64WithActions(
      initialPackMsgpackFloat64State(),
      {
        kind: "msgpack-float/pack-gate",
        value: 1.5,
      },
    );
    expect(shouldUsePackMsgpackFloat64(packed.actions)).toBe(true);
    const raw = packMsgpackFloat64RawFromActions(packed.actions)!;
    expect([...raw]).toEqual([...msgpackPackFloat64(1.5)]);

    const unpacked = stepUnpackMsgpackFloatWithActions(
      initialUnpackMsgpackFloatState(),
      {
        kind: "msgpack-float/unpack-gate",
        bytes: raw,
      },
    );
    expect(shouldUseUnpackMsgpackFloat(unpacked.actions)).toBe(true);
    expect(msgpackFloatFromActions(unpacked.actions)).toBe(1.5);

    const reject = stepUnpackMsgpackFloatWithActions(
      initialUnpackMsgpackFloatState(),
      {
        kind: "msgpack-float/unpack-gate",
        bytes: new Uint8Array([0xc0]),
      },
    );
    expect(shouldRejectUnpackMsgpackFloat(reject.actions)).toBe(true);
  });

  it("packs uint32, long bins, strings, and maps", () => {
    expect(msgpackUnpackScalar(msgpackPackUInt(70_000))).toEqual({
      type: "int",
      int: 70_000,
    });
    const long = new Uint8Array(300);
    long.fill(9);
    const packed = msgpackPackBin(long);
    expect(packed[0]).toBe(0xc5);
    const unpacked = msgpackUnpackScalar(packed);
    expect(unpacked.type).toBe("bin");
    if (unpacked.type === "bin") expect(unpacked.bin.length).toBe(300);

    expect([...msgpackPackString("hello")]).toEqual([
      0xa5, 104, 101, 108, 108, 111,
    ]);
    const longer = "x".repeat(40);
    expect(msgpackPackString(longer)[0]).toBe(0xd9);
    expect(() => msgpackPackString("x".repeat(300))).toThrow(/255/);

    const map = msgpackPackStringMap([["k", msgpackPackUInt(1)]]);
    expect(map[0]).toBe(0x81);
    expect(() =>
      msgpackPackStringMap(
        Array.from({ length: 16 }, (_, i) => [`k${i}`, msgpackPackNil()]),
      ),
    ).toThrow(/15 entries/);
    const array = msgpackPackArray([msgpackPackUInt(1), msgpackPackNil()]);
    expect(msgpackUnpack(array).type).toBe("array");
    expect(() => msgpackUnpackScalar(array)).toThrow(/scalar/);
  });
});

/**
 * Truncation must be an error, not a shorter value.
 *
 * Every length-prefixed read here used `subarray`, which clamps instead of
 * throwing, so a frame promising more bytes than it carried decoded to a short
 * value that looked complete to everything downstream. The pinned reference
 * raises `InsufficientDataException` for each of these; differential fuzzing
 * against it is what found them, and these cases pin the fix without needing
 * the container.
 */
describe("msgpackUnpack on truncated frames", () => {
  const cases: ReadonlyArray<readonly [string, readonly number[]]> = [
    ["bin8 body", [0xc4, 0x04, 0xde, 0xad]],
    ["bin16 body", [0xc5, 0x00, 0x8f, 0xde, 0xad, 0xbe, 0xef]],
    ["bin16 length", [0xc5, 0x00]],
    ["float64", [0xcb, 0x40, 0x09]],
    ["uint32", [0xce, 0x00, 0x01]],
    ["uint16", [0xcd, 0x01]],
    ["uint8", [0xcc]],
    ["fixarray element", [0x92, 0x01]],
    ["fixmap value", [0x81, 0x01]],
  ];

  for (const [name, bytes] of cases) {
    it(`refuses a frame truncated in its ${name}`, () => {
      expect(() => msgpackUnpack(Uint8Array.from(bytes))).toThrow();
    });
  }

  it("still accepts a frame whose promised bytes are all present", () => {
    const value = msgpackUnpack(
      Uint8Array.from([0xc5, 0x00, 0x04, 0xde, 0xad, 0xbe, 0xef]),
    );
    expect(value.type).toBe("bin");
    if (value.type === "bin") expect(value.bin.length).toBe(4);
  });

  it("still ignores trailing bytes, as the reference decoder does", () => {
    // `umsgpack.unpackb(b"\x80\xff")` returns `{}`; extra data is not an error
    // on either side, and making it one here would be a divergence of its own.
    expect(msgpackUnpack(Uint8Array.from([0x80, 0xff])).type).toBe("map");
  });
});
