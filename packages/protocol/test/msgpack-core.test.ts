import { describe, expect, it } from "vitest";
import {
  msgpackPackArray,
  msgpackPackBin,
  msgpackPackFloat64,
  msgpackPackNil,
  msgpackPackUInt,
  msgpackUnpackScalar
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
    const array = msgpackPackArray([msgpackPackUInt(1), msgpackPackUInt(2)]);
    expect(array[0]).toBe(0x92);
    expect([...array]).toEqual([...msgpackPackArray([msgpackPackUInt(1), msgpackPackUInt(2)])]);
  });
});
