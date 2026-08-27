import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, describe, expect, it } from "vitest";
import { writeJson } from "../../scripts/ratchet/lib.mjs";

const root = path.resolve(import.meta.dirname, "../..");
// Prettier honours `.gitignore` as well as `.prettierignore`, so a scratch file
// has to sit somewhere neither excludes to stand in for a committed baseline.
const formatted = path.join(
  root,
  "conformance",
  "checks",
  "write-json.tmp.json",
);
// `dist/` is one of the trees `.prettierignore` excludes.
const ignored = path.join(root, "dist", "write-json-format.json");

/** The shape that exposed the bug: a short array of primitives. */
const value = { version: 1, roots: ["apps", "packages"] };

afterAll(() => {
  fs.rmSync(formatted, { force: true });
  fs.rmSync(ignored, { force: true });
});

const listDifferent = (file) =>
  spawnSync(
    globalThis.process.execPath,
    ["node_modules/prettier/bin/prettier.cjs", "--list-different", file],
    { cwd: root, encoding: "utf8" },
  );

describe("writeJson", () => {
  it("writes what the formatting gate already accepts", () => {
    writeJson(formatted, value);
    // JSON.stringify would have spread `roots` over four lines here, so the
    // baseline command left format:check red on a file it had just written.
    expect(fs.readFileSync(formatted, "utf8")).toContain(
      '"roots": ["apps", "packages"]',
    );
    const result = listDifferent(formatted);
    expect(result.stdout).toBe("");
    expect(result.status).toBe(0);
  });

  it("round-trips the value it was given", () => {
    writeJson(formatted, value);
    expect(JSON.parse(fs.readFileSync(formatted, "utf8"))).toEqual(value);
  });

  it("leaves a prettier-ignored path in the generator's own layout", () => {
    // Files compared byte-for-byte against JSON.stringify are listed in
    // .prettierignore; reformatting them would make their drift checks
    // unsatisfiable, so the reformat must honour that list.
    writeJson(ignored, value);
    expect(fs.readFileSync(ignored, "utf8")).toBe(
      `${JSON.stringify(value, null, 2)}\n`,
    );
  });
});
