import { describe, expect, it } from "vitest";
import { msgpackPackArray, msgpackPackUInt } from "../src/msgpack-core.js";
import {
  initialStampCostFromAppDataState,
  shouldRejectStampCostFromAppData,
  shouldUseStampCostFromAppData,
  stampCostFromActions,
  stampCostFromAppData,
  stepStampCostFromAppDataWithActions,
} from "../src/stamp-cost.js";

describe("protocol stamp cost", () => {
  it("extracts stamp cost from msgpack array app data", () => {
    const appData = msgpackPackArray([msgpackPackUInt(0), msgpackPackUInt(7)]);
    expect(stampCostFromAppData(appData)).toBe(7);
  });

  it("returns null for missing or non-array payloads", () => {
    expect(stampCostFromAppData(null)).toBeNull();
    expect(stampCostFromAppData(new Uint8Array())).toBeNull();
    expect(stampCostFromAppData(msgpackPackUInt(3))).toBeNull();
    expect(
      stampCostFromAppData(Uint8Array.of(0xdd, 0, 0, 0, 2, 0, 7)),
    ).toBeNull();
  });

  it("extracts via use-fields actions", () => {
    const appData = msgpackPackArray([msgpackPackUInt(0), msgpackPackUInt(7)]);
    const ok = stepStampCostFromAppDataWithActions(
      initialStampCostFromAppDataState(),
      {
        kind: "lxmf/stamp-cost-gate",
        appData,
      },
    );
    expect(shouldUseStampCostFromAppData(ok.actions)).toBe(true);
    expect(shouldRejectStampCostFromAppData(ok.actions)).toBe(false);
    expect(stampCostFromActions(ok.actions)).toBe(7);

    const rejected = stepStampCostFromAppDataWithActions(
      initialStampCostFromAppDataState(),
      {
        kind: "lxmf/stamp-cost-gate",
        appData: null,
      },
    );
    expect(shouldRejectStampCostFromAppData(rejected.actions)).toBe(true);
    expect(stampCostFromActions(rejected.actions)).toBeNull();
  });
});
