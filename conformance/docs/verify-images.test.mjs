import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findBrokenDocImages, findMarkdownImageLinks } from "./verify-images.mjs";

const tmpRoots = [];

function tempDir() {
  const dir = mkdtempSync(join(tmpdir(), "tp-doc-images-"));
  tmpRoots.push(dir);
  return dir;
}

afterEach(() => {
  while (tmpRoots.length > 0) {
    rmSync(tmpRoots.pop(), { recursive: true, force: true });
  }
});

describe("docs image link verification", () => {
  it("ignores remote and anchor image targets", () => {
    const dir = tempDir();
    const links = findMarkdownImageLinks(
      "![remote](https://example.com/x.png) ![anchor](#shot)",
      dir
    );

    expect(links).toEqual([]);
  });

  it("reports missing relative image files", () => {
    const dir = tempDir();
    writeFileSync(join(dir, "sample.md"), "![missing](images/missing.png)\n");

    expect(findBrokenDocImages(dir)).toEqual([
      {
        doc: join(dir, "sample.md"),
        target: "images/missing.png",
        resolved: join(dir, "images/missing.png")
      }
    ]);
  });

  it("accepts committed mac-validation screenshot embeds", () => {
    expect(findBrokenDocImages()).toEqual([]);
  });
});
