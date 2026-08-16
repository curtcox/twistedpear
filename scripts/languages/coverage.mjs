#!/usr/bin/env node
/**
 * Coverage floors for the native languages, starting with Rust.
 *
 * The coverage ratchet covers `packages/*` and `apps/*` — TypeScript, and only
 * TypeScript. Stryker mutates TypeScript. Everything else in the repository had
 * lint gates and, since `test.mjs` landed, test gates, but no measurement of
 * how much of the code those tests reach. `cargo test` passes whether it
 * exercises a contract thoroughly or trivially, and the three Freenet contracts
 * are the highest-consequence code in the tree: they hold state that peers
 * agree on, they are the target of the fuzzing gate, and they were the least
 * measured code here.
 *
 * `cargo llvm-cov` reports lines, functions, and regions. Branch coverage is
 * deliberately not among them — llvm-cov needs an unstable flag for it and
 * reports a flat 0 on the pinned stable toolchain, and a floor of 0 that can
 * never move is worse than no floor, because it looks like one. Regions are the
 * closest stable equivalent: a region is a straight-line span, so a partially
 * taken branch shows up as an unexecuted region.
 *
 * Floors may only rise, like the TypeScript coverage ratchet, with the same
 * kind of tolerance for the small movements that come from the compiler rather
 * than from anybody's change.
 *
 * Usage: node scripts/languages/coverage.mjs rust [--write] [--allow-regressions]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";
import { PINS } from "../tools/requirements.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const language = process.argv[2];
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");

/** The metrics that mean something on the pinned stable toolchain. */
const METRICS = ["lines", "functions", "regions"];

/**
 * The libFuzzer crate, excluded for the reason `test.mjs` excludes it: it needs
 * the pinned nightly for `-Z sanitizer`, holds no `#[test]`, and failing here
 * would be a toolchain fact rather than a coverage one.
 */
const FUZZ_CRATE = "conformance/fuzz/rust/Cargo.toml";

if (language !== "rust") {
  console.error(`Unknown language: ${language}. Expected rust.`);
  process.exit(2);
}

const RATCHET = path.join(
  ROOT,
  "language-ratchets",
  `${language}-coverage.json`,
);

/** @returns {string[]} tracked Cargo manifests, fuzz crate excluded */
function manifests() {
  const result = spawnSync("git", ["ls-files", "*Cargo.toml"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return (result.stdout ?? "")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((manifest) => manifest !== FUZZ_CRATE);
}

/**
 * Percentages for one crate.
 *
 * `--summary-only --json` keeps llvm-cov from emitting a per-file report the
 * size of the crate; the totals are what carries a floor.
 *
 * @param {string} manifest
 * @returns {{lines: number, functions: number, regions: number}}
 */
function measure(manifest) {
  const result = spawnSync(
    "rustup",
    [
      "run",
      PINS.rust.version,
      "cargo",
      "llvm-cov",
      "--manifest-path",
      manifest,
      "--summary-only",
      "--json",
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    },
  );
  if (result.status !== 0) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(
      `cargo llvm-cov failed for ${manifest} (exit ${result.status}). A crate that will not measure is not a crate at 0%; it is a crate with no floor.`,
    );
  }
  const totals = JSON.parse(result.stdout).data[0].totals;
  return Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      Math.round(totals[metric].percent * 10) / 10,
    ]),
  );
}

const recorded = readJson(RATCHET, { crates: {}, tolerance: 0.5 });
const tolerance = recorded.tolerance ?? 0.5;
const measured = {};
for (const manifest of manifests())
  measured[path.dirname(manifest)] = measure(manifest);

if (Object.keys(measured).length === 0) {
  // The same rule `test.mjs` applies: a gate that finds nothing to measure is
  // how a suite disappears unnoticed.
  console.error(
    `${language}: no crates found to measure; expected at least one.`,
  );
  process.exit(1);
}

if (write) {
  const crates = {};
  for (const [crate, percentages] of Object.entries(measured)) {
    const floor = recorded.crates?.[crate] ?? {};
    crates[crate] = Object.fromEntries(
      METRICS.map((metric) => {
        const now = percentages[metric];
        const was = floor[metric];
        if (!allowRegressions && was != null && now + tolerance < was)
          throw new Error(
            `Refusing to lower ${crate} ${metric}: ${was} -> ${now}. Pass --allow-regressions to establish or deliberately lower a floor.`,
          );
        return [metric, allowRegressions ? now : Math.max(was ?? 0, now)];
      }),
    );
  }
  writeJson(RATCHET, {
    version: 1,
    description:
      "Per-crate Rust coverage floors from cargo llvm-cov. Values may only rise. Branch coverage is absent on purpose: llvm-cov needs an unstable flag for it and reports 0 on the pinned stable toolchain, and a floor that can never move looks like a floor without being one. Regions are the stable stand-in.",
    tolerance,
    crates,
  });
  console.log(
    `${language} coverage: wrote floors for ${Object.keys(crates).length} crate(s).`,
  );
  process.exit(0);
}

const findings = [];
for (const [crate, floors] of Object.entries(recorded.crates ?? {})) {
  const percentages = measured[crate];
  // A crate that vanished from the measurement while keeping a floor is the
  // failure worth catching: renaming or dropping a crate would otherwise remove
  // its floor silently, and every remaining number would still look fine.
  if (!percentages) {
    findings.push(
      `${crate}: has a recorded floor but was not measured. If the crate moved, re-baseline; if it was deleted, say so in the same change.`,
    );
    continue;
  }
  for (const metric of METRICS)
    if (percentages[metric] + tolerance < (floors[metric] ?? 0))
      findings.push(
        `${crate} ${metric}: ${percentages[metric]}% < floor ${floors[metric]}%`,
      );
}

const output = path.join(
  ROOT,
  "artifacts",
  "languages",
  `${language}-coverage.json`,
);
fs.mkdirSync(path.dirname(output), { recursive: true });
writeJson(output, {
  version: 1,
  language,
  generatedAt: new Date().toISOString(),
  tolerance,
  crates: measured,
  findings,
});

for (const finding of findings) console.error(`  ${finding}`);
const summary = Object.entries(measured)
  .map(
    ([crate, percentages]) => `${path.basename(crate)} ${percentages.lines}%`,
  )
  .join(", ");
console.log(
  `${language} coverage: ${findings.length === 0 ? "PASS" : "FAIL"}; ${Object.keys(measured).length} crate(s) — ${summary}.`,
);
process.exit(findings.length === 0 ? 0 : 1);
