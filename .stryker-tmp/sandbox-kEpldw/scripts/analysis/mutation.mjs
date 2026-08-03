#!/usr/bin/env node
// @ts-nocheck
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const run = process.argv.includes("--run");
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
if (run) {
  const result = spawnSync(process.execPath, ["node_modules/@stryker-mutator/core/bin/stryker.js", "run"], { cwd: ROOT, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const report = readJson(path.join(ROOT, "reports/mutation/mutation.json"), null);
const baselineFile = path.join(ROOT, "mutation-ratchet.json");
const baseline = readJson(baselineFile);
const metrics = report?.schemaVersion
  ? report.files
  : null;
let killed = 0;
let survived = 0;
for (const file of Object.values(metrics ?? {})) {
  for (const mutant of file.mutants ?? []) {
    if (["Killed", "Timeout", "RuntimeError", "CompileError"].includes(mutant.status)) killed += 1;
    if (["Survived", "NoCoverage"].includes(mutant.status)) survived += 1;
  }
}
const score = killed + survived === 0 ? baseline.score ?? 0 : Math.round((killed / (killed + survived)) * 10000) / 100;
if (write) {
  if (!allowRegressions && score < (baseline.score ?? 0)) throw new Error(`Refusing to lower mutation score ${baseline.score} -> ${score}`);
  writeJson(baselineFile, { version: 1, description: "Mutation score floor for packages/protocol and packages/effects; it may only rise.", score });
  console.log(`Mutation ratchet: wrote score ${score}.`);
  process.exit(0);
}
let failed = score < (baseline.score ?? 0);
const ref = baseRef(ROOT, "MUTATION_RATCHET_BASE_REF");
const previous = ref ? jsonAtRef(ROOT, ref, "mutation-ratchet.json") : null;
if (previous?.score != null && baseline.score < previous.score) failed = true;
console.log(`Mutation ratchet: score ${score}, floor ${baseline.score}; ${killed} killed, ${survived} survived/no-coverage.`);
if (failed) process.exit(1);
