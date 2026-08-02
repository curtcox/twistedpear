#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compareDiagnosticSet, printDiagnosticResult, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const language = process.argv[2];
const write = process.argv.includes("--write");
const commands = [];
const tracked = (suffixes) => {
  const result = spawnSync("git", ["ls-files", ...suffixes.map((suffix) => `*.${suffix}`)], { cwd: ROOT, encoding: "utf8" });
  return (result.stdout ?? "").split(/\r?\n/).filter(Boolean);
};

if (language === "shell") commands.push(["shellcheck", ...tracked(["sh"])]);
if (language === "python") {
  const files = tracked(["py"]);
  commands.push(["ruff", "check", ...files], ["ruff", "format", "--check", ...files], ["mypy", "conformance/vectors/generate.py", "launcher.py"]);
}
if (language === "kotlin") commands.push(["ktlint", ...tracked(["kt"])]);
if (language === "swift") commands.push(["swiftlint", "lint", "--strict", "--quiet", "--no-cache"]);
if (language === "rust") {
  for (const manifest of tracked(["toml"]).filter((file) => file.startsWith("packages/bridge-freenet/contract/") && file.endsWith("Cargo.toml"))) {
    commands.push(
      ["rustup", "run", "1.97.1", "cargo", "fmt", "--manifest-path", manifest, "--", "--check"],
      ["rustup", "run", "1.97.1", "cargo", "clippy", "--manifest-path", manifest, "--all-targets", "--", "-D", "warnings"],
      ["cargo-deny", "--manifest-path", manifest, ...(process.env.CI ? [] : ["--offline"]), "check"]
    );
  }
}
if (commands.length === 0) throw new Error(`Unknown language: ${language}`);

const runs = [];
const findings = [];
const occurrences = new Map();
for (const [command, ...args] of commands) {
  const beforeFindings = findings.length;
  const result = spawnSync(command, args, { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  runs.push({ command: [command, ...args].join(" "), exitCode: result.status ?? 1 });
  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim().replaceAll(`${ROOT}${path.sep}`, "");
    if (!/^(?:[A-Z]\d{3}\b|Would reformat:|error(?:\[.*\])?:|warning:)|\.(?:kt|swift|py|rs):\d+(?::\d+)?:|:\d+(?::\d+)?:\s+(?:error|warning):/i.test(trimmed)) continue;
    const normalized = `${command}:${trimmed.replace(/\d+(?:\.\d+)?/g, "#")}`;
    const occurrence = (occurrences.get(normalized) ?? 0) + 1;
    occurrences.set(normalized, occurrence);
    findings.push(`${normalized}:occurrence-${occurrence}`);
  }
  if (result.status !== 0 && findings.length === beforeFindings) {
    findings.push(`${command}:${args.slice(0, 4).join(" ")}:nonzero-exit`);
  }
}
const output = path.join(ROOT, "artifacts", "languages", `${language}.json`);
fs.mkdirSync(path.dirname(output), { recursive: true });
writeJson(output, { version: 1, language, findings, runs });
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, "language-ratchets", `${language}.json`),
  current: findings,
  write,
  allowRegressions: process.argv.includes("--allow-regressions"),
  description: `${language} analyzer findings present when the gate was established; entries may only disappear.`,
  envName: `${language.toUpperCase()}_RATCHET_BASE_REF`
});
if (write) console.log(`${language}: wrote ${findings.length} analyzer findings.`);
else if (!printDiagnosticResult(`${language} analysis`, comparison)) process.exit(1);
