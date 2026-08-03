// @ts-nocheck
import { describe, expect, it } from "vitest";
import {
  findMultilineCodeTagSpans,
  findPublishedVitePressMarkdownHazards
} from "../../scripts/doc-audit/vitepress.mjs";

describe("VitePress markdown compatibility", () => {
  it("detects HTML-like placeholders inside multiline inline code", () => {
    expect(
      findMultilineCodeTagSpans("Run `tp node --freenet\n<url>` to connect.")
    ).toEqual([
      {
        line: 1,
        excerpt: "`tp node --freenet\n<url>`"
      }
    ]);
  });

  it("keeps published markdown free of multiline code-tag hazards", () => {
    const hazards = findPublishedVitePressMarkdownHazards();
    expect(hazards, JSON.stringify(hazards, null, 2)).toEqual([]);
  });
});
