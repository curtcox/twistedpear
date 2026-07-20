import { describe, expect, it } from "vitest";
import { findBrokenMarkdownLinks } from "../../scripts/doc-audit/links.mjs";

describe("doc-audit links", () => {
  it("resolves relative markdown and html links in tracked docs", () => {
    const broken = findBrokenMarkdownLinks();
    expect(broken, JSON.stringify(broken, null, 2)).toEqual([]);
  });
});
