import { describe, expect, it } from "vitest";
import {
  changedImages,
  VISUAL_BASELINES,
} from "../../scripts/analysis/visual-regression.mjs";

describe("visual regression", () => {
  it("covers distinct critical desktop states", () => {
    expect(VISUAL_BASELINES).toHaveLength(3);
    expect(VISUAL_BASELINES).toEqual(
      expect.arrayContaining([
        "guide/images/02-desktop-main-window.png",
        "guide/images/06-grants.png",
        "guide/images/05-capability-review.png",
      ]),
    );
  });

  it("reports byte-different screenshots", () => {
    expect(
      changedImages(
        new Map([["screen", Buffer.from("before")]]),
        new Map([["screen", Buffer.from("after")]]),
      ),
    ).toEqual(["screen"]);
  });
});
