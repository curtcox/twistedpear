#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";
import { authoredPaths } from "./generated-paths.mjs";
import { measureFunctions } from "./lizard.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const days = Number(
  process.argv.find((arg) => arg.startsWith("--days="))?.slice(7) ?? 180,
);
const TOP = 50;
const rules = readJson(path.join(ROOT, "complexity-multilang-rules.json"));

/**
 * Hotspots read wider than the gate does.
 *
 * `complexity:multilang` deliberately skips TypeScript because ESLint already
 * owns it and two gates over one function would mean two debt lists. This is a
 * report, not a gate — it pins nothing and fails nothing — so leaving out the
 * language the core of the repository is written in would only make the
 * ranking wrong.
 */
const LANGUAGES = [...rules.languages, "typescript", "tsx"];

/**
 * How many commits touched each file in the window.
 *
 * Needs real history: a shallow clone reports 1 for everything and the ranking
 * collapses into "whatever is most complex". The nightly workflow checks out
 * with `fetch-depth: 0` for exactly this reason.
 *
 * @returns {Map<string, number>}
 */
function churn() {
  const result = spawnSync(
    "git",
    ["log", `--since=${days}.days.ago`, "--name-only", "--pretty=format:"],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
  );
  if (result.status !== 0)
    throw new Error(`git log failed: ${result.stderr ?? ""}`);
  const counts = new Map();
  for (const line of result.stdout.split("\n")) {
    const file = line.trim();
    if (file === "") continue;
    counts.set(file, (counts.get(file) ?? 0) + 1);
  }
  return counts;
}

const commits = churn();
const functions = measureFunctions({
  root: ROOT,
  languages: LANGUAGES,
  roots: rules.roots,
});
const authored = new Set(
  authoredPaths(ROOT, [...new Set(functions.map((entry) => entry.file))]),
);

/** @type {Map<string, { complexity: number, functions: number, worst: number }>} */
const perFile = new Map();
for (const entry of functions) {
  if (!authored.has(entry.file)) continue;
  const file = perFile.get(entry.file) ?? {
    complexity: 0,
    functions: 0,
    worst: 0,
  };
  file.complexity += entry.ccn;
  file.functions += 1;
  file.worst = Math.max(file.worst, entry.ccn);
  perFile.set(entry.file, file);
}

const ranked = [...perFile]
  .map(([file, stats]) => ({
    file,
    churn: commits.get(file) ?? 0,
    ...stats,
    score: (commits.get(file) ?? 0) * stats.complexity,
  }))
  .filter((entry) => entry.score > 0)
  .sort((a, b) => b.score - a.score || a.file.localeCompare(b.file));

const shallow =
  spawnSync("git", ["rev-parse", "--is-shallow-repository"], {
    cwd: ROOT,
    encoding: "utf8",
  }).stdout.trim() === "true";

writeJson(path.join(ROOT, "hotspots.json"), {
  version: 1,
  windowDays: days,
  shallowClone: shallow,
  filesMeasured: perFile.size,
  filesChanged: ranked.length,
  hotspots: ranked.slice(0, TOP),
});

console.log(
  `Hotspots: ${ranked.length} of ${perFile.size} authored files changed in the last ${days} days; top ${Math.min(TOP, ranked.length)} written to hotspots.json.`,
);
if (shallow)
  console.warn(
    "Hotspots: this is a shallow clone, so churn is understated. Check out with fetch-depth: 0.",
  );
console.log("\n  churn × complexity   file");
for (const entry of ranked.slice(0, 20))
  console.log(
    `  ${String(entry.score).padStart(7)}  ${String(entry.churn).padStart(3)} × ${String(entry.complexity).padStart(5)}  ${entry.file}`,
  );
// Report-only: a hotspot is a prioritisation signal, not a defect.
