#!/usr/bin/env node
/**
 * Stage one gate's declared artifacts for the Pages build to import.
 *
 * Gates that cannot run on the Pages build runner — nightly-tier ones, and
 * anything needing macOS — run in their own job and upload evidence that
 * `scripts/site/run-reports.mjs` reads back through `copyOutputs`, which is
 * `gate.artifacts` verbatim. This copies exactly that list, preserving relative
 * paths so the importer finds each file where it expects it.
 *
 * The workflow used to inline a hand-written list of root-level files
 * (`audit.json`, `sbom.cdx.json`, `mutation-ratchet.json`). Every gate whose
 * evidence lives outside `artifacts/` had to be remembered there a second time,
 * and forgetting simply published the gate with its metrics missing — no error,
 * just a blank. The registry already knows the answer.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { copyPath } from "./copy-path.mjs";
import { gateById } from "./registry.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const flag = (name) =>
  process.argv
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.slice(name.length + 3);

const id = flag("gate");
const into = flag("into");
if (!id || !into) {
  console.error(
    "Usage: node scripts/checks/stage-evidence.mjs --gate=<id> --into=<dir>",
  );
  process.exit(2);
}

const gate = gateById(id);
if (!gate) {
  console.error(`Unknown gate "${id}"; see scripts/checks/registry.mjs.`);
  process.exit(2);
}

const destination = path.resolve(ROOT, into);
let staged = 0;
const missing = [];
for (const relative of gate.artifacts) {
  const source = path.join(ROOT, relative);
  if (!fs.existsSync(source)) {
    missing.push(relative);
    continue;
  }
  const target = path.join(destination, relative);
  copyPath(source, target);
  staged += 1;
}

console.log(`${id}: staged ${staged}/${gate.artifacts.length} artifact(s).`);
// Absence is reported, not fatal: a gate that failed before writing its report
// still needs its check record and log uploaded so the site can say so.
for (const relative of missing) console.log(`  missing: ${relative}`);
