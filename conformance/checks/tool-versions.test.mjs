/**
 * `tool-versions.json` is the pin; everything else is a copy.
 *
 * Before this file the pinned versions lived in five places — the docs, three
 * workflows, and `scripts/languages/*.mjs` — with nothing checking that they
 * agreed. They already did not: local Ruff was 0.16.3 and local mypy 2.3.0
 * against pins of 0.15.16 and 2.1.0, which made `lint:python` red on a file CI
 * is happy with. `tools:doctor` now compares the installed tool against the
 * pin, and these tests compare every written copy of the pin against it, so a
 * bump is a one-file edit that fails loudly until the copies follow.
 */
import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { PINS } from "../../scripts/tools/requirements.mjs";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file) => fs.readFileSync(path.join(root, file), "utf8");

const ciWorkflow = read(".github/workflows/ci.yml");
const pagesWorkflow = read(".github/workflows/pages.yml");
const nightlyWorkflow = read(".github/workflows/nightly.yml");
const staticAnalysisDoc = read("docs/static-analysis.md");
const languageCheck = read("scripts/languages/check.mjs");
const languageTest = read("scripts/languages/test.mjs");

/**
 * Where each pin is written out, and the exact text that has to carry the
 * version. Anchored on the surrounding command rather than on the bare number,
 * so a coincidental `1.8.0` elsewhere in a workflow cannot satisfy the check.
 */
const copies = [
  ["actionlint", ciWorkflow, (v) => `actionlint/releases/download/v${v}/`],
  ["actionlint", pagesWorkflow, (v) => `actionlint/releases/download/v${v}/`],
  ["gitleaks", ciWorkflow, (v) => `gitleaks/releases/download/v${v}/`],
  ["gitleaks", pagesWorkflow, (v) => `gitleaks/releases/download/v${v}/`],
  ["shellcheck", ciWorkflow, (v) => `shellcheck/releases/download/v${v}/`],
  ["shellcheck", pagesWorkflow, (v) => `shellcheck/releases/download/v${v}/`],
  ["ruff", ciWorkflow, (v) => `ruff==${v}`],
  ["ruff", pagesWorkflow, (v) => `ruff==${v}`],
  ["mypy", ciWorkflow, (v) => `mypy==${v}`],
  ["mypy", pagesWorkflow, (v) => `mypy==${v}`],
  ["lizard", ciWorkflow, (v) => `lizard==${v}`],
  ["lizard", pagesWorkflow, (v) => `lizard==${v}`],
  ["lizard", nightlyWorkflow, (v) => `lizard==${v}`],
  ["rust", ciWorkflow, (v) => `rustup toolchain install ${v} `],
  ["rust", pagesWorkflow, (v) => `rustup toolchain install ${v} `],
  ["cargo-deny", ciWorkflow, (v) => `cargo-deny --version ${v} `],
  ["cargo-deny", pagesWorkflow, (v) => `cargo-deny --version ${v} `],
  ["ktlint", ciWorkflow, (v) => `ktlint/releases/download/${v}/`],
  ["ktlint", pagesWorkflow, (v) => `ktlint/releases/download/${v}/`],
  ["swiftlint", ciWorkflow, (v) => `test "$(swiftlint version)" = "${v}"`],
  ["swiftlint", pagesWorkflow, (v) => `test "$(swiftlint version)" = "${v}"`],
];

describe("pinned tool versions", () => {
  it("names a version and a probe for every pinned tool", () => {
    for (const [token, pin] of Object.entries(PINS)) {
      expect(pin.version, `${token} version`).toMatch(/^\d+\.\d+(\.\d+)?$/);
      expect(pin.probe.length, `${token} probe`).toBeGreaterThan(1);
    }
  });

  it.each(copies)(
    "%s matches the pin where it is installed",
    (token, source, format) => {
      expect(source).toContain(format(PINS[token].version));
    },
  );

  it("documents the pins it enforces", () => {
    for (const [token, pin] of Object.entries(PINS)) {
      expect(
        staticAnalysisDoc,
        `${token} in docs/static-analysis.md`,
      ).toContain(pin.version);
    }
  });

  // The scripts read the pin rather than repeating it. A literal creeping back
  // in is the drift this file exists to stop, so fail on the literal itself.
  it("keeps the Rust toolchain out of the language scripts", () => {
    for (const source of [languageCheck, languageTest]) {
      expect(source).not.toContain(`"${PINS.rust.version}"`);
    }
    expect(languageCheck).toContain("PINS.rust.version");
    expect(languageTest).toContain("PINS.rust.version");
  });
});
