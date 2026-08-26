/**
 * Raw downloads have to be links, not pages.
 *
 * VitePress keeps a fixed list of extensions it treats as assets and appends
 * `.html` to every internal link outside it. `csv` and `json` are on that
 * list; `log` and `ndjson` are not, so `raw/artifacts/logs/unit-tests.log`
 * published as `unit-tests.log.html` and 404'd — as did every `.ndjson` link
 * on the CI cost report. The files were published correctly the whole time;
 * only the links were wrong, which is the kind of break nobody notices until
 * they try to download something.
 *
 * `VITE_EXTRA_EXTENSIONS` is the supported way to extend that list. This test
 * exercises VitePress's own `treatAsHtml` against it rather than asserting on
 * our config text, so it fails if either the setting or VitePress's behaviour
 * moves.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

/** VitePress's own extension check, lifted from its bundle. */
function loadTreatAsHtml() {
  const dist = path.join(root, "node_modules/vitepress/dist/node");
  for (const name of fs.readdirSync(dist)) {
    if (!name.endsWith(".js")) continue;
    const source = fs.readFileSync(path.join(dist, name), "utf8");
    const match = source.match(
      /const KNOWN_EXTENSIONS[\s\S]*?return ext == null[^;]*;\n\}/,
    );
    if (!match) continue;
    const body = match[0].replace(
      /import\.meta\.env\?\.VITE_EXTRA_EXTENSIONS/g,
      "undefined",
    );
    // eslint-disable-next-line no-new-func
    return new Function("process", `${body}\nreturn treatAsHtml;`)(process);
  }
  return null;
}

describe("raw download links", () => {
  it("configures the extensions VitePress would otherwise turn into pages", async () => {
    delete process.env.VITE_EXTRA_EXTENSIONS;
    await import(`${root}/site/.vitepress/config.mjs`);
    const configured = (process.env.VITE_EXTRA_EXTENSIONS ?? "").split(",");
    expect(configured).toContain("ndjson");
    expect(configured).toContain("log");
  });

  it("makes VitePress treat those extensions as assets", () => {
    const treatAsHtml = loadTreatAsHtml();
    // A VitePress upgrade that restructures the bundle should not silently
    // pass this test; it should be noticed and the extractor updated.
    expect(
      treatAsHtml,
      "could not locate treatAsHtml in the VitePress bundle",
    ).toBeTypeOf("function");
    process.env.VITE_EXTRA_EXTENSIONS = "ndjson,log";
    for (const asset of [
      "index.ndjson",
      "unit-tests.log",
      "runs.csv",
      "manifest.json",
    ]) {
      expect(treatAsHtml(asset), `${asset} must be linked as a download`).toBe(
        false,
      );
    }
    for (const page of ["results", "guide/index.md"]) {
      expect(treatAsHtml(page), `${page} must still resolve as a page`).toBe(
        true,
      );
    }
  });
});
