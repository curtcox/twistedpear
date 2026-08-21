import { describe, expect, it } from "vitest";
import { percentBelowFloor } from "../../scripts/ratchet/lib.mjs";

describe("percentBelowFloor", () => {
  it("does not fail a floor that sits exactly on the tolerance boundary", () => {
    // 99.1 + 0.05 is 99.14999999999999 in IEEE; that must not fail 99.15.
    expect(percentBelowFloor(99.1, 99.15, 0.05)).toBe(false);
  });

  it("still fails a drop larger than the tolerance", () => {
    expect(percentBelowFloor(99.09, 99.15, 0.05)).toBe(true);
  });
});
