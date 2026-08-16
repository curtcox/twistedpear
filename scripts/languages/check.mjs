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
import { PINS } from "../tools/requirements.mjs";
import { findingsFrom } from "./findings.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const language = process.argv[2];
const write = process.argv.includes("--write");
const commands = [];
const tracked = (suffixes) => {
  const result = spawnSync(
    "git",
    ["ls-files", ...suffixes.map((suffix) => `*.${suffix}`)],
    { cwd: ROOT, encoding: "utf8" },
  );
  return (result.stdout ?? "").split(/\r?\n/).filter(Boolean);
};

if (language === "shell") commands.push(["shellcheck", ...tracked(["sh"])]);
if (language === "python") {
  const files = tracked(["py"]);
  commands.push(
    [
      "ruff",
      "check",
      "--config",
      ".config/ruff.toml",
      "--color",
      "never",
      ...files,
    ],
    [
      "ruff",
      "format",
      "--config",
      ".config/ruff.toml",
      "--check",
      "--color",
      "never",
      ...files,
    ],
    ["mypy", "conformance/vectors/generate.py", "launcher.py"],
  );
}
if (language === "kotlin") commands.push(["ktlint", ...tracked(["kt"])]);
if (language === "swift")
  commands.push([
    "swiftlint",
    "lint",
    "--strict",
    "--quiet",
    "--no-cache",
    ...tracked(["swift"]),
  ]);
if (language === "rust") {
  for (const manifest of tracked(["toml"]).filter(
    (file) =>
      file.startsWith("packages/bridge-freenet/contract/") &&
      file.endsWith("Cargo.toml"),
  )) {
    commands.push(
      [
        "rustup",
        "run",
        PINS.rust.version,
        "cargo",
        "fmt",
        "--manifest-path",
        manifest,
        "--",
        "--check",
      ],
      [
        "rustup",
        "run",
        PINS.rust.version,
        "cargo",
        "clippy",
        "--manifest-path",
        manifest,
        "--all-targets",
        "--",
        "-D",
        "warnings",
      ],
      // Pin the same toolchain clippy uses. cargo-deny otherwise picks the
      // default cargo (here 1.83), which cannot parse edition-2024 crates
      // and turns a cache miss into ratchet findings.
      [
        "rustup",
        "run",
        PINS.rust.version,
        "cargo-deny",
        "--manifest-path",
        manifest,
        "check",
      ],
    );
  }
}
if (commands.length === 0) throw new Error(`Unknown language: ${language}`);

/**
 * Run every analyzer command, collect ratchet findings, and gate them.
 *
 * Kept as its own function rather than top-level script code: lizard
 * misattributes a file's top-level statements to the last function declared
 * above them, which is why `tracked` carried a stale ccn exemption before
 * `findingsFrom` moved out of this file. Leaving this loop at module scope
 * would put that same misattribution right back on `tracked`.
 */
function main() {
  const runs = [];
  const findings = [];
  const occurrences = new Map();
  for (const [command, ...args] of commands) {
    const result = spawnSync(command, args, {
      cwd: ROOT,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0" },
    });
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");
    runs.push({
      command: [command, ...args].join(" "),
      exitCode: result.status ?? 1,
    });
    const found = findingsFrom(
      command,
      `${result.stdout ?? ""}\n${result.stderr ?? ""}`,
      occurrences,
      ROOT,
    );
    // A tool that failed without saying anything this parser recognises is
    // still a failure, and needs an entry or the ratchet records silence as
    // clean.
    if (result.status !== 0 && found.length === 0) {
      found.push(`${command}:${args.slice(0, 4).join(" ")}:nonzero-exit`);
    }
    findings.push(...found);
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
    envName: `${language.toUpperCase()}_RATCHET_BASE_REF`,
  });
  if (write)
    console.log(`${language}: wrote ${findings.length} analyzer findings.`);
  else if (!printDiagnosticResult(`${language} analysis`, comparison))
    process.exit(1);
}

main();
