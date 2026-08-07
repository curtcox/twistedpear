#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  compareDiagnosticSet,
  printDiagnosticResult,
  writeJson,
} from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const kind = process.argv.find((arg) => arg.startsWith("--kind="))?.slice(7);
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const settings = {
  lint: {
    config: "eslint.analysis.config.js",
    output: "lint.json",
    baseline: "lint-ratchet.json",
    globs: ["packages", "apps", "conformance", "scripts", "formal"],
  },
  typed: {
    config: "eslint.typed.config.js",
    output: "typed-lint.json",
    baseline: "typed-lint-ratchet.json",
    globs: ["packages", "apps"],
  },
  complexity: {
    config: "eslint.complexity.config.js",
    output: "complexity.json",
    baseline: "complexity-ratchet.json",
    globs: ["packages", "apps", "conformance", "scripts"],
  },
}[kind];
if (!settings)
  throw new Error("Use --kind=lint, --kind=typed, or --kind=complexity");

const result = spawnSync(
  process.execPath,
  [
    "node_modules/eslint/bin/eslint.js",
    "--config",
    settings.config,
    "--format",
    "json",
    ...settings.globs,
  ],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 },
);
if (!result.stdout?.trim()) {
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}
/**
 * Rules whose findings may never enter a baseline.
 *
 * A complexity or file-size finding describes code that works and could be
 * tidier, which is what a ratchet is for. no-undef describes an identifier that
 * resolves to nothing: every one is a ReferenceError waiting for the line to
 * run. Grandfathering them is how the lint gate reported pass while the web and
 * mobile worklets could not send a single message (0a71a4e6, b44e9ada).
 */
const UNRATCHETABLE = new Set(kind === "lint" ? ["no-undef"] : []);

const reports = JSON.parse(result.stdout);
const findings = [];
const structured = [];
const blocking = [];
const parseErrors = [];
const occurrences = new Map();
for (const report of reports) {
  const file = path.relative(ROOT, report.filePath).split(path.sep).join("/");
  for (const message of report.messages) {
    // A parse error carries no ruleId, so the skip below would drop it and the
    // file would be reported clean because nothing in it could be analysed.
    if (message.fatal === true) {
      parseErrors.push(`${file}:${message.line}: ${message.message}`);
      continue;
    }
    if (!message.ruleId || message.severity === 0) continue;
    const normalized = message.message.replace(/\d+(?:\.\d+)?/g, "#");
    const baseFingerprint = `${file}:${message.ruleId}:${normalized}`;
    const occurrence = (occurrences.get(baseFingerprint) ?? 0) + 1;
    occurrences.set(baseFingerprint, occurrence);
    const fingerprint = `${baseFingerprint}:occurrence-${occurrence}`;
    const entry = {
      file,
      line: message.line,
      column: message.column,
      rule: message.ruleId,
      severity: message.severity,
      message: message.message,
      fingerprint,
    };
    structured.push(entry);
    if (UNRATCHETABLE.has(message.ruleId)) {
      blocking.push(`${file}:${message.line}: ${message.message}`);
      continue;
    }
    findings.push(fingerprint);
  }
}
writeJson(path.join(ROOT, settings.output), {
  version: 1,
  kind,
  count: structured.length,
  findings: structured,
});
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, settings.baseline),
  current: findings,
  write,
  allowRegressions,
  description: `${kind} findings present when the ratchet was established; entries may only disappear.`,
  envName: `${kind.toUpperCase()}_RATCHET_BASE_REF`,
});
if (write) {
  console.log(`${kind}: wrote ${findings.length} baseline fingerprints.`);
}

// Reported after --write too: rewriting the baseline must not bury these.
for (const [label, entries] of [
  ["parse error", parseErrors],
  ["unratchetable finding", blocking],
]) {
  if (entries.length === 0) continue;
  console.error(`\n${kind}: ${entries.length} ${label}(s) — these cannot be`);
  console.error(`baselined and must be fixed:`);
  for (const entry of entries.slice(0, 50)) console.error(`  ${entry}`);
  if (entries.length > 50)
    console.error(`  … and ${entries.length - 50} more.`);
}
if (parseErrors.length > 0 || blocking.length > 0) process.exit(1);
if (!write && !printDiagnosticResult(kind, comparison)) {
  process.exit(1);
}
