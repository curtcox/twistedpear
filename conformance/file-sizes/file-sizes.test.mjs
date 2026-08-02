import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { globToRegExp, thresholdsFor, buildInventory } from "../../scripts/size-inventory.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const rules = JSON.parse(fs.readFileSync(path.join(ROOT, "size-rules.json"), "utf8"));
const ratchet = JSON.parse(fs.readFileSync(path.join(ROOT, "size-ratchet.json"), "utf8"));

describe("glob matching", () => {
  it("anchors and scopes wildcards to a single segment", () => {
    expect(globToRegExp("**/*.ts").test("packages/protocol/src/index.ts")).toBe(true);
    expect(globToRegExp("**/*.ts").test("index.ts")).toBe(true);
    expect(globToRegExp("*.ts").test("packages/index.ts")).toBe(false);
    expect(globToRegExp("**/*.ts").test("index.tsx")).toBe(false);
    expect(globToRegExp("conformance/**/*.mjs").test("conformance/a/b/c.mjs")).toBe(true);
    expect(globToRegExp("conformance/**/*.mjs").test("scripts/a.mjs")).toBe(false);
  });

  it("expands brace alternatives", () => {
    const re = globToRegExp("**/*.{kt,swift}");
    expect(re.test("a/B.kt")).toBe(true);
    expect(re.test("a/B.swift")).toBe(true);
    expect(re.test("a/B.rs")).toBe(false);
  });
});

describe("size rules", () => {
  it("orders test rules ahead of the language rules that would also match", () => {
    const ids = rules.rules.map((r) => r.id);
    expect(ids.indexOf("test")).toBeLessThan(ids.indexOf("typescript"));
    expect(ids.indexOf("test")).toBeLessThan(ids.indexOf("script"));
    expect(ids.indexOf("test")).toBeLessThan(ids.indexOf("javascript"));
  });

  it("keeps every warn threshold below its danger threshold", () => {
    for (const rule of rules.rules) {
      const t = thresholdsFor(rule, rules.defaults);
      expect(t.warnLines, rule.id).toBeLessThan(t.dangerLines);
      expect(t.warnBytes, rule.id).toBeLessThan(t.dangerBytes);
      if (t.warnMaxLineLength != null) {
        expect(t.warnMaxLineLength, rule.id).toBeLessThan(t.dangerMaxLineLength);
      }
    }
  });

  it("derives byte thresholds from the line budget", () => {
    const ts = rules.rules.find((r) => r.id === "typescript");
    const t = thresholdsFor(ts, rules.defaults);
    expect(t.dangerBytes).toBe(ts.dangerLines * rules.defaults.bytesPerLineBudget);
  });
});

describe("ratchet baseline", () => {
  const inventory = buildInventory();

  it("grandfathers every file currently over the danger threshold", () => {
    const listed = new Set(ratchet.entries.map((e) => e.file));
    const unlisted = inventory.danger.filter((f) => !listed.has(f.file)).map((f) => f.file);
    expect(unlisted, "decompose these files or they will fail `npm run sizes`").toEqual([]);
  });

  it("records sizes no smaller than the files actually are", () => {
    const current = new Map(inventory.files.map((f) => [f.file, f]));
    const grown = [];
    for (const entry of ratchet.entries) {
      const f = current.get(entry.file);
      if (!f) continue;
      if (f.lines > entry.lines) grown.push(`${entry.file}: ${entry.lines} → ${f.lines}`);
    }
    expect(grown, "grandfathered files may only shrink").toEqual([]);
  });

  it("holds no entries for files that are no longer classified", () => {
    const classified = new Set(inventory.files.map((f) => f.file));
    const missing = ratchet.entries.map((e) => e.file).filter((f) => !classified.has(f));
    expect(missing, "run `npm run sizes:baseline` to drop stale entries").toEqual([]);
  });
});
