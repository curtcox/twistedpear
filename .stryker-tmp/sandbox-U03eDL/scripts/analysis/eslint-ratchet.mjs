#!/usr/bin/env node
// @ts-nocheck
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compareDiagnosticSet, printDiagnosticResult, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const kind = process.argv.find((arg) => arg.startsWith("--kind="))?.slice(7);
const write = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const settings = {
  lint: { config: "eslint.analysis.config.js", output: "lint.json", baseline: "lint-ratchet.json", globs: ["packages", "apps", "conformance", "scripts", "formal"] },
  typed: { config: "eslint.typed.config.js", output: "typed-lint.json", baseline: "typed-lint-ratchet.json", globs: ["packages", "apps"] },
  complexity: { config: "eslint.complexity.config.js", output: "complexity.json", baseline: "complexity-ratchet.json", globs: ["packages", "apps", "conformance", "scripts"] }
}[kind];
if (!settings) throw new Error("Use --kind=lint, --kind=typed, or --kind=complexity");

const result = spawnSync(
  process.execPath,
  ["node_modules/eslint/bin/eslint.js", "--config", settings.config, "--format", "json", ...settings.globs],
  { cwd: ROOT, encoding: "utf8", maxBuffer: 128 * 1024 * 1024 }
);
if (!result.stdout?.trim()) {
  process.stderr.write(result.stderr ?? "");
  process.exit(result.status ?? 1);
}
const reports = JSON.parse(result.stdout);
const findings = [];
const structured = [];
const occurrences = new Map();
for (const report of reports) {
  const file = path.relative(ROOT, report.filePath).split(path.sep).join("/");
  for (const message of report.messages) {
    if (!message.ruleId || message.severity === 0) continue;
    const normalized = message.message.replace(/\d+(?:\.\d+)?/g, "#");
    const baseFingerprint = `${file}:${message.ruleId}:${normalized}`;
    const occurrence = (occurrences.get(baseFingerprint) ?? 0) + 1;
    occurrences.set(baseFingerprint, occurrence);
    const fingerprint = `${baseFingerprint}:occurrence-${occurrence}`;
    findings.push(fingerprint);
    structured.push({ file, line: message.line, column: message.column, rule: message.ruleId, severity: message.severity, message: message.message, fingerprint });
  }
}
writeJson(path.join(ROOT, settings.output), { version: 1, kind, count: structured.length, findings: structured });
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, settings.baseline),
  current: findings,
  write,
  allowRegressions,
  description: `${kind} findings present when the ratchet was established; entries may only disappear.`,
  envName: `${kind.toUpperCase()}_RATCHET_BASE_REF`
});
if (write) {
  console.log(`${kind}: wrote ${findings.length} baseline fingerprints.`);
} else if (!printDiagnosticResult(kind, comparison)) {
  process.exit(1);
}
