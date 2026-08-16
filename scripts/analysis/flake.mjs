#!/usr/bin/env node
/**
 * Repeated-run flake detection for the unit suite.
 *
 * Every other gate here asks whether the code is right. This one asks whether
 * the *tests* are trustworthy, which nothing did: `vitest.config.ts` sets no
 * `retry` and no repeats, and nothing reran a suite to compare. A test that
 * passes 90% of the time is indistinguishable from a passing test, so flakes
 * surfaced as random red CI that someone re-ran by hand — and a re-run that goes
 * green is indistinguishable from a fix.
 *
 * The suite is run N times as **separate processes** rather than through a
 * `--repeat` flag. Repeating inside one process catches only within-process
 * nondeterminism; separate processes also catch state that leaks between runs
 * through the filesystem, a port, or a module-level cache, which is the more
 * common shape here given how much of this repository touches sockets and
 * stores.
 *
 * A test is flaky when its status is not the same in every run, including the
 * case where it is present in some runs and absent from others — a test that
 * fails to register is a test that stopped protecting anything, and it is
 * invisible to a pass/fail count.
 *
 *   npm run flake:check                    # the gate
 *   npm run flake:check -- --runs=5        # more passes
 *   npm run flake:baseline                 # record known flakes (should stay empty)
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  compareDiagnosticSet,
  printDiagnosticResult,
  readJson,
  writeJson,
} from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const BASELINE = path.join(ROOT, "flake-ratchet.json");
const RULES = readJson(path.join(ROOT, "flake-rules.json"));
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const runs = Number.parseInt(
  process.argv.find((argument) => argument.startsWith("--runs="))?.slice(7) ??
    String(RULES.runs),
  10,
);

const DESCRIPTION =
  "Tests observed to change status across repeated runs of the unit suite. This baseline should be empty: an entry is a test that cannot be trusted to mean anything, and it may only shrink.";

/**
 * One run of the unit suite, as a map of test identity to status.
 *
 * Identity is `file > full name`. The file is part of it because two packages
 * legitimately name a test the same thing, and collapsing them would make one
 * package's flake look like the other's.
 *
 * @param {number} index
 * @returns {Map<string, string>}
 */
function runOnce(index) {
  const seed = RULES.seed + index;
  const output = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "tp-flake-")),
    "results.json",
  );
  const result = spawnSync(
    process.execPath,
    [
      "node_modules/vitest/vitest.mjs",
      "run",
      "--reporter=json",
      `--outputFile=${output}`,
      ...(RULES.shuffle
        ? ["--sequence.shuffle", `--sequence.seed=${seed}`]
        : []),
    ],
    {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      // A failing run is expected input here, not an error: a test that fails in
      // one run and passes in another is precisely what this looks for.
      env: { ...process.env, CI: "1" },
    },
  );

  if (!fs.existsSync(output)) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(
      `flake: run ${index + 1} produced no JSON report (exit ${result.status})`,
    );
  }

  const report = JSON.parse(fs.readFileSync(output, "utf8"));
  fs.rmSync(path.dirname(output), { recursive: true, force: true });

  const statuses = new Map();
  for (const file of report.testResults ?? []) {
    const relative = path.relative(ROOT, file.name).split(path.sep).join("/");
    for (const assertion of file.assertionResults ?? []) {
      statuses.set(`${relative} > ${assertion.fullName}`, assertion.status);
    }
  }
  return { seed, statuses };
}

const observations = [];
for (let index = 0; index < runs; index += 1) {
  console.log(`flake: run ${index + 1}/${runs}...`);
  observations.push(runOnce(index));
}

/**
 * Tests whose status was not identical in every run.
 *
 * `absent` is used for a test missing from a run so that a test which
 * disappears is reported rather than skipped. `pending` and `todo` are real
 * statuses and compared like any other — a test that is skipped in one run and
 * runs in another is conditionally skipped, which is its own kind of untrustworthy.
 */
const everyTest = new Set(
  observations.flatMap((run) => [...run.statuses.keys()]),
);
const findings = [];
for (const test of [...everyTest].sort()) {
  const seen = observations.map((run) => run.statuses.get(test) ?? "absent");
  const distinct = [...new Set(seen)];
  if (distinct.length > 1) {
    findings.push(
      `${test} [${observations.map((run, index) => `seed=${run.seed}:${seen[index]}`).join(",")}]`,
    );
  }
}

const result = compareDiagnosticSet({
  root: ROOT,
  baselineFile: BASELINE,
  current: findings,
  write,
  allowRegressions,
  description: DESCRIPTION,
  envName: "FLAKE_RATCHET_BASE_REF",
});

writeJson(path.join(ROOT, "artifacts", "flake", "flake.json"), {
  version: 1,
  generatedAt: new Date().toISOString(),
  runs,
  shuffle: RULES.shuffle,
  seeds: observations.map((run) => run.seed),
  testsObserved: everyTest.size,
  flaky: findings,
});

if (result.wrote) {
  console.log(`flake: recorded ${findings.length} known flake(s).`);
  process.exit(0);
}

console.log(
  `flake: ${runs} run(s), ${everyTest.size} test(s) observed, ${findings.length} unstable.`,
);
process.exit(printDiagnosticResult("flake", result) ? 0 : 1);
