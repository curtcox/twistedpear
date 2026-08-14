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
