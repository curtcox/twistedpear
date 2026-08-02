#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson, writeJson } from "./ratchet/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SUMMARY = path.join(ROOT, "coverage", "coverage-summary.json");
const BASELINE = path.join(ROOT, "coverage-ratchet.json");
const RULES = readJson(path.join(ROOT, "coverage-rules.json"));
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const tolerance = RULES.tolerance;

function absoluteFloor(pkg, metric) {
  return RULES.packages?.[pkg]?.[metric] ?? RULES.defaults[metric] ?? 0;
}

function packageName(filename) {
  const relative = path.relative(ROOT, filename).split(path.sep);
  return relative[0] === "packages" && relative[1] ? `packages/${relative[1]}` : null;
}

function measured() {
  const summary = readJson(SUMMARY);
  const totals = new Map();
  for (const [filename, metrics] of Object.entries(summary)) {
    if (filename === "total") continue;
    const pkg = packageName(filename);
    if (!pkg) continue;
    const aggregate = totals.get(pkg) ?? {
      statements: { covered: 0, total: 0 },
      branches: { covered: 0, total: 0 },
      functions: { covered: 0, total: 0 }
    };
    for (const metric of ["statements", "branches", "functions"]) {
      aggregate[metric].covered += metrics[metric]?.covered ?? 0;
      aggregate[metric].total += metrics[metric]?.total ?? 0;
    }
    totals.set(pkg, aggregate);
  }
  return Object.fromEntries(
    [...totals].sort(([a], [b]) => a.localeCompare(b)).map(([pkg, aggregate]) => [
      pkg,
      Object.fromEntries(
        Object.entries(aggregate).map(([metric, value]) => [
          metric,
          value.total === 0 ? 100 : Math.round((value.covered / value.total) * 10000) / 100
        ])
      )
    ])
  );
}

const current = measured();
const existing = readJson(BASELINE, { version: 1, tolerance, packages: {} });

if (write) {
  const packages = {};
  for (const [pkg, values] of Object.entries(current)) {
    const old = existing.packages?.[pkg] ?? {};
    packages[pkg] = {};
    for (const metric of ["statements", "branches", "functions"]) {
      const absolute = absoluteFloor(pkg, metric);
      if (values[metric] + tolerance < absolute) {
        throw new Error(`${pkg} ${metric} ${values[metric]} is below absolute floor ${absolute}`);
      }
      if (!allowRegressions && old[metric] != null && values[metric] + tolerance < old[metric]) {
        throw new Error(`Refusing to lower ${pkg} ${metric}: ${old[metric]} -> ${values[metric]}`);
      }
      packages[pkg][metric] = allowRegressions ? Math.max(absolute, values[metric]) : Math.max(absolute, old[metric] ?? 0, values[metric]);
    }
  }
  writeJson(BASELINE, {
    version: 1,
    description: "Per-package unit coverage floors. Values may only rise; comparison tolerance is 0.5 percentage points.",
    tolerance,
    packages
  });
  console.log(`Coverage ratchet: wrote ${Object.keys(packages).length} package floors.`);
  process.exit(0);
}

let failed = false;
for (const [pkg, floors] of Object.entries(existing.packages ?? {})) {
  if (!current[pkg]) continue;
  for (const metric of ["statements", "branches", "functions"]) {
    const required = Math.max(floors[metric], absoluteFloor(pkg, metric));
    if (current[pkg][metric] + tolerance < required) {
      failed = true;
      console.error(`${pkg} ${metric}: ${current[pkg][metric]} < floor ${required}`);
    }
  }
}
const ref = baseRef(ROOT, "COVERAGE_RATCHET_BASE_REF");
const previous = ref ? jsonAtRef(ROOT, ref, "coverage-ratchet.json") : null;
for (const [pkg, floors] of Object.entries(existing.packages ?? {})) {
  for (const metric of ["statements", "branches", "functions"]) {
    const prior = previous?.packages?.[pkg]?.[metric];
    if (prior != null && floors[metric] + tolerance < prior) {
      failed = true;
      console.error(`${pkg} ${metric} baseline loosened vs ${ref}: ${prior} -> ${floors[metric]}`);
    }
  }
}
console.log(`Coverage ratchet: ${Object.keys(current).length} packages measured${ref ? `; baseline checked against ${ref}` : ""}.`);
if (failed) process.exit(1);
