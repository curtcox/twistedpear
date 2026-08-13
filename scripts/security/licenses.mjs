#!/usr/bin/env node
import path from "node:path";
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
const lock = readJson(path.join(ROOT, "package-lock.json"));
const policy = readJson(path.join(ROOT, "license-allowlist.json"));
const allowed = new Set(policy.allowed ?? []);
const overrides = policy.overrides ?? {};
const findings = [];
const inventory = [];

function licenseAllowed(expression) {
  return String(expression)
    .split(/\s+OR\s+/)
    .some((alternative) =>
      alternative
        .replace(/[()]/g, "")
        .split(/\s+AND\s+/)
        .every((term) => allowed.has(term.trim())),
    );
}

for (const [location, pkg] of Object.entries(lock.packages ?? {})) {
  if (!location.includes("node_modules/") || !pkg.version) continue;
  const name = location.slice(location.lastIndexOf("node_modules/") + 13);
  const packageId = `${name}@${pkg.version}`;
  const license = overrides[packageId]?.license ?? pkg.license ?? "UNKNOWN";
  inventory.push({ name, version: pkg.version, license });
  if (!licenseAllowed(license)) findings.push(`${packageId}:${license}`);
}
inventory.sort(
  (a, b) => a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
);
writeJson(path.join(ROOT, "licenses.json"), {
  version: 1,
  packages: inventory.length,
  findings,
  inventory,
});
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, "license-ratchet.json"),
  current: findings,
  write: process.argv.includes("--write"),
  allowRegressions: process.argv.includes("--allow-regressions"),
  description:
    "Dependency license expressions outside the approved SPDX list when the gate was established; entries may only disappear.",
  envName: "LICENSE_RATCHET_BASE_REF",
});
if (process.argv.includes("--write"))
  console.log(`License gate: wrote ${findings.length} exceptions.`);
else if (!printDiagnosticResult("License gate", comparison)) process.exit(1);
