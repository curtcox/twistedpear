import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { matchesQuery } from "../../scripts/site/sample-catalog-query.mjs";
import {
  buildSampleCatalog,
  extractFences,
  findSnippet,
  languageLabel,
  publishedMarkdownRelPaths,
  sitePathFor,
} from "../../scripts/site/sample-catalog.mjs";

describe("sample catalog extraction", () => {
  it("records fence languages and 1-based line numbers", () => {
    const fences = extractFences(
      ["# Title", "", "```javascript", "const n = 1;", "```", ""].join("\n"),
    );
    expect(fences).toEqual([
      {
        language: "javascript",
        body: "const n = 1;",
        startLine: 3,
        endLine: 5,
      },
    ]);
  });

  it("labels elm fences as Guida", () => {
    expect(languageLabel("elm")).toBe("Guida");
    expect(languageLabel("javascript")).toBe("JavaScript");
  });

  it("maps published paths onto VitePress routes", () => {
    expect(sitePathFor("cookbook/README.md")).toBe("/cookbook/");
    expect(sitePathFor("cookbook/apps/unit-converter/README.md")).toBe(
      "/cookbook/apps/unit-converter/",
    );
    expect(sitePathFor("docs/web-host.md")).toBe("/docs/web-host");
    expect(sitePathFor("README.md")).toBe("/reference/");
  });

  it("finds a snippet's line range in a source file", () => {
    expect(findSnippet("a\nconst convertedValue = 1;\nz\n", "const convertedValue = 1;")).toEqual({
      startLine: 2,
      endLine: 2,
    });
    expect(findSnippet("short", "nope")).toBeNull();
  });
});

describe("sample catalog search", () => {
  it("requires every whitespace token to match", () => {
    expect(matchesQuery("unit converter javascript storage:kv", "unit kv")).toBe(
      true,
    );
    expect(matchesQuery("unit converter javascript", "elm")).toBe(false);
    expect(matchesQuery("anything", "  ")).toBe(true);
  });
});

describe("published sample catalog", () => {
  const rows = buildSampleCatalog();
  const repoRoot = join(import.meta.dirname, "../..");

  it("includes every fenced listing from published docs", () => {
    const fenceCount = publishedMarkdownRelPaths().reduce((sum, rel) => {
      const text = readFileSync(join(repoRoot, rel), "utf8");
      return sum + extractFences(text).length;
    }, 0);
    expect(rows.length).toBe(fenceCount);
    expect(rows.length).toBeGreaterThan(100);
    const unitJs = rows.filter(
      (row) =>
        row.sourcePath === "cookbook/02-apps-with-no-capabilities.md" &&
        row.language === "JavaScript" &&
        String(row.name).startsWith("Unit Converter"),
    );
    expect(unitJs.length).toBeGreaterThan(0);
    expect(unitJs[0].rnwHref).toBe("/react-native-web/?app=unit-converter");
    expect(unitJs[0].editorHref).toBe("/editor/?app=unit-converter");
    expect(unitJs[0].githubHref).toContain("github.com/curtcox/twistedpear/blob/main/");
    expect(unitJs[0].docsHref).toContain("unit-converter");
    expect(unitJs[0].capabilities).toEqual([]);
  });

  it("fills the editor for the authoring-guide hello and leaves RNW empty", () => {
    const hello = rows.find(
      (row) =>
        row.sourcePath.startsWith("authors/02-hello-world") &&
        row.language === "JavaScript" &&
        row.editorHref === "/editor/?app=hello",
    );
    expect(hello).toBeDefined();
    expect(hello.rnwHref).toBeNull();
  });

  it("leaves live and editor empty for unrelated listings", () => {
    const mermaid = rows.find((row) => row.language === "Mermaid");
    expect(mermaid).toBeDefined();
    expect(mermaid.rnwHref).toBeNull();
    expect(mermaid.editorHref).toBeNull();
  });

  it("gives every row a description and unique id", () => {
    const ids = new Set(rows.map((row) => row.id));
    expect(ids.size).toBe(rows.length);
    for (const row of rows) {
      expect(row.description.length).toBeGreaterThan(8);
      expect(row.name.length).toBeGreaterThan(0);
      expect(row.searchText).toContain(row.name.toLowerCase());
    }
  });
});
