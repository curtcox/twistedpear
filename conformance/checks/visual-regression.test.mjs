import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  changedImages,
  VISUAL_BASELINES,
  writeCaptureArtifacts,
} from "../../scripts/analysis/visual-regression.mjs";

describe("visual regression", () => {
  it("covers distinct critical desktop states", () => {
    expect(VISUAL_BASELINES).toHaveLength(6);
    expect(VISUAL_BASELINES).toEqual(
      expect.arrayContaining([
        "guide/images/02-desktop-main-window.png",
        "guide/images/06-grants.png",
        "guide/images/05-capability-review.png",
        "guide/images/06-host-confirmation.png",
        "guide/images/06-runtime-controls.png",
        "guide/images/08-untrusted-publisher.png",
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

  it("writes captured pixels under the basename so CI can upload them", () => {
    const directory = fs.mkdtempSync(
      path.join(os.tmpdir(), "twistedpear-visual-captures-"),
    );
    try {
      writeCaptureArtifacts(
        new Map([["guide/images/06-grants.png", Buffer.from("pixels")]]),
        directory,
      );
      expect(
        fs.readFileSync(path.join(directory, "06-grants.png"), "utf8"),
      ).toBe("pixels");
    } finally {
      fs.rmSync(directory, { recursive: true, force: true });
    }
  });
});
