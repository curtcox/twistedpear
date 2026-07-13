import { describe, expect, it } from "vitest";
import { msgpackPackArray, msgpackPackUInt } from "../src/msgpack-core.js";
import { stampCostFromAppData } from "../src/stamp-cost.js";

describe("protocol stamp cost", () => {
  it("extracts stamp cost from msgpack array app data", () => {
    const appData = msgpackPackArray([msgpackPackUInt(0), msgpackPackUInt(7)]);
    expect(stampCostFromAppData(appData)).toBe(7);
  });

  it("returns null for missing or non-array payloads", () => {
    expect(stampCostFromAppData(null)).toBeNull();
    expect(stampCostFromAppData(new Uint8Array())).toBeNull();
    expect(stampCostFromAppData(msgpackPackUInt(3))).toBeNull();
  });
});
