#!/usr/bin/env node
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  compareDiagnosticSet,
  printDiagnosticResult,
  readJson,
  writeJson,
} from "../ratchet/lib.mjs";
import { isGeneratedPath } from "./generated-paths.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");

// These imports are materialized by their web conformance builders and remain
// gitignored. Keep the clean-checkout structure gate aware of those exact edges.
const GENERATED_FIXTURE_IMPORTS = new Set([
  "conformance/web-devstudio/entry.mjs:./fixtures.mjs",
  "conformance/web-distribution/entry.mjs:./fixtures.mjs",
  "conformance/web-distribution/run.mjs:./publisher-data.mjs",
  "conformance/web-examples/entry.mjs:./fixtures.mjs",
  "conformance/web-handbook/entry.mjs:./fixtures.mjs",
  "conformance/web-hyperdrive-browser/entry.mjs:./fixtures.mjs",
  "conformance/web-hyperdrive-browser/run.mjs:./publisher-data.mjs",
  "conformance/web-storage/entry.mjs:./fixture.mjs",
]);

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    maxBuffer: 128 * 1024 * 1024,
  });
  if (!result.stdout?.trim()) {
    process.stderr.write(result.stderr ?? "");
    throw new Error(
      `${command} produced no structured output (exit ${result.status})`,
    );
  }
  return JSON.parse(result.stdout);
}

const knip = run(process.execPath, [
  "node_modules/knip/bin/knip.js",
  "--reporter",
  "json",
]);
const cruise = run(process.execPath, [
  "node_modules/dependency-cruiser/bin/dependency-cruise.mjs",
  "--config",
  ".dependency-cruiser.cjs",
  "--output-type",
  "json",
  "packages",
  "apps",
]);
const findings = [];

for (const file of knip.files ?? []) findings.push(`knip:file:${file}`);
for (const issue of Object.values(knip.issues ?? {})) {
  const file = issue.file ?? "unknown";
  for (const [kind, values] of Object.entries(issue)) {
    if (kind === "file") continue;
    for (const value of Array.isArray(values) ? values : [values]) {
      if (
        value == null ||
        (typeof value === "object" && Object.keys(value).length === 0)
      )
        continue;
      const identity =
        typeof value === "string"
          ? value
          : (value.name ?? JSON.stringify(value));
      if (
        kind === "unresolved" &&
        GENERATED_FIXTURE_IMPORTS.has(`${file}:${identity}`)
      )
        continue;
      findings.push(`knip:${kind}:${file}:${identity}`);
    }
  }
}
for (const violation of cruise.summary?.violations ?? cruise.violations ?? []) {
  // Shared with the complexity and coupling gates so all three agree on what
  // is authored. Previously this list was its own regex and did not know about
  // the `-part-N` / `-extracted-N` concat inputs, so one import in `entry.mjs`
  // was reported ten more times through the fragments it is assembled from.
  if (
    [violation.from, violation.to].some((file) => isGeneratedPath(file ?? ""))
  )
    continue;
  findings.push(
    `depcruise:${violation.rule?.name ?? violation.rule?.id ?? "rule"}:${violation.from}:${violation.to ?? ""}`,
  );
}

const allowed = {
  effects: [],
  protocol: ["effects"],
  "reticulum-ts": ["protocol"],
  "lxmf-ts": ["protocol", "reticulum-ts"],
  "reticulum-interfaces": ["reticulum-ts"],
  "peer-discovery": ["protocol"],
  "cas-256t": ["reticulum-ts"],
  "app-registry": ["reticulum-ts", "cas-256t"],
  "miniapp-runtime": ["effects", "peer-discovery", "protocol"],
  "miniapp-sdk": ["miniapp-runtime"],
  "bridge-hyper": [
    "app-registry",
    "cas-256t",
    "reticulum-interfaces",
    "reticulum-ts",
  ],
  "bridge-freenet": ["cas-256t", "reticulum-ts"],
  cli: [
    "app-registry",
    "bridge-freenet",
    "bridge-hyper",
    "host-core",
    "miniapp-test",
    "miniapp-runtime",
    "reticulum-ts",
    "cas-256t",
  ],
  "host-core": [
    "app-registry",
    "bridge-freenet",
    "bridge-hyper",
    "cas-256t",
    "effects",
    "lxmf-ts",
    "peer-discovery",
    "protocol",
    "reticulum-interfaces",
    "reticulum-ts",
  ],
  "worklet-core": [],
  "widget-renderer-rn": ["miniapp-runtime"],
  "widget-renderer-headless": ["miniapp-runtime"],
  "sim-adversaries": ["effects", "protocol", "miniapp-runtime"],
  "sim-campaign": ["effects", "miniapp-runtime", "protocol", "sim-adversaries"],
};
for (const [pkg, permitted] of Object.entries(allowed)) {
  const manifest = readJson(
    path.join(ROOT, "packages", pkg, "package.json"),
    {},
  );
  for (const section of [
    "dependencies",
    "devDependencies",
    "peerDependencies",
  ]) {
    for (const dependency of Object.keys(manifest[section] ?? {})) {
      if (!dependency.startsWith("@twistedpear/")) continue;
      const target = dependency.slice("@twistedpear/".length);
      if (!permitted.includes(target))
        findings.push(`layer:${pkg}:${section}:${target}`);
    }
  }
}

findings.sort();
writeJson(path.join(ROOT, "structure.json"), {
  version: 1,
  count: findings.length,
  findings,
  knip: {
    files: (knip.files ?? []).length,
    workspaces: Object.keys(knip.issues ?? {}).length,
  },
  dependencyCruiser: cruise.summary ?? null,
});
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, "structure-ratchet.json"),
  current: findings,
  write,
  allowRegressions,
  description:
    "Unused-code, cycle, orphan, dependency-type, and package-layer findings present when structural analysis landed; entries may only disappear.",
  envName: "STRUCTURE_RATCHET_BASE_REF",
});
if (write) console.log(`Structure ratchet: wrote ${findings.length} findings.`);
else if (!printDiagnosticResult("Structure ratchet", comparison))
  process.exit(1);
