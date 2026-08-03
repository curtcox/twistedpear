// @ts-nocheck
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
  msgpackPackUInt,
  msgpackUnpackScalar,
  packMsgpackFloat64RawFromActions,
  shouldRejectUnpackMsgpackFloat,
  shouldUsePackMsgpackFloat64,
  shouldUseUnpackMsgpackFloat,
  stepPackMsgpackFloat64WithActions,
  stepUnpackMsgpackFloatWithActions
} from "../src/msgpack-core.js";

describe("protocol msgpack core", () => {
  it("packs and unpacks integers", () => {
    expect(msgpackUnpackScalar(msgpackPackUInt(0))).toEqual({ type: "int", int: 0 });
    expect(msgpackUnpackScalar(msgpackPackUInt(127))).toEqual({ type: "int", int: 127 });
    expect(msgpackUnpackScalar(msgpackPackUInt(200))).toEqual({ type: "int", int: 200 });
    expect(msgpackUnpackScalar(msgpackPackUInt(1000))).toEqual({ type: "int", int: 1000 });
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
    expect([...array]).toEqual([...msgpackPackArray([msgpackPackUInt(1), msgpackPackUInt(2)])]);
  });

  it("packs and unpacks float via WithActions", () => {
    const packed = stepPackMsgpackFloat64WithActions(initialPackMsgpackFloat64State(), {
      kind: "msgpack-float/pack-gate",
      value: 1.5
    });
    expect(shouldUsePackMsgpackFloat64(packed.actions)).toBe(true);
    const raw = packMsgpackFloat64RawFromActions(packed.actions)!;
    expect([...raw]).toEqual([...msgpackPackFloat64(1.5)]);

    const unpacked = stepUnpackMsgpackFloatWithActions(initialUnpackMsgpackFloatState(), {
      kind: "msgpack-float/unpack-gate",
      bytes: raw
    });
    expect(shouldUseUnpackMsgpackFloat(unpacked.actions)).toBe(true);
    expect(msgpackFloatFromActions(unpacked.actions)).toBe(1.5);

    const reject = stepUnpackMsgpackFloatWithActions(initialUnpackMsgpackFloatState(), {
      kind: "msgpack-float/unpack-gate",
      bytes: new Uint8Array([0xc0])
    });
    expect(shouldRejectUnpackMsgpackFloat(reject.actions)).toBe(true);
  });
});
