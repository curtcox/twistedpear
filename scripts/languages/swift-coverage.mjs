#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { applyCoveragePolicy, percentage } from "./native-coverage-policy.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const METRICS = ["lines", "functions", "regions"];

function run(args, cwd) {
  const result = spawnSync("swift", args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  if (result.status !== 0)
    throw new Error(`swift ${args.join(" ")} failed in ${cwd}`);
  return (result.stdout ?? "").trim();
}

function manifests() {
  const result = spawnSync("git", ["ls-files", "*Package.swift"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return (result.stdout ?? "")
    .split(/\r?\n/)
    .filter(Boolean)
    .filter((manifest) =>
      fs.existsSync(path.join(ROOT, path.dirname(manifest), "Tests")),
    );
}

function measure(manifest) {
  const relativeDir = path.dirname(manifest);
  const packageDir = path.join(ROOT, relativeDir);
  run(["test", "--enable-code-coverage"], packageDir);
  const reportPath = run(["test", "--show-codecov-path"], packageDir);
  const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
  const sources = report.data[0].files.filter(
    (file) =>
      file.filename.startsWith(`${packageDir}${path.sep}`) &&
      !file.filename.includes(`${path.sep}.build${path.sep}`) &&
      !file.filename.includes(`${path.sep}Tests${path.sep}`),
  );
  const totals = Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      sources.reduce(
        (sum, file) => ({
          covered: sum.covered + file.summary[metric].covered,
          missed:
            sum.missed +
            (file.summary[metric].notcovered ??
              file.summary[metric].count - file.summary[metric].covered),
        }),
        { covered: 0, missed: 0 },
      ),
    ]),
  );
  return Object.fromEntries(
    METRICS.map((metric) => [
      metric,
      percentage(totals[metric].covered, totals[metric].missed),
    ]),
  );
}

const measured = Object.fromEntries(
  manifests().map((manifest) => [path.dirname(manifest), measure(manifest)]),
);
if (Object.keys(measured).length === 0)
  throw new Error("swift coverage found no testable packages");

process.exit(
  applyCoveragePolicy({
    root: ROOT,
    language: "swift",
    measured,
    metrics: METRICS,
    description:
      "Per-package Swift coverage floors from SwiftPM/llvm-cov. Authored package sources are measured; generated test runners and Tests are excluded. Values may only rise.",
    write,
    allowRegressions,
  }),
);
