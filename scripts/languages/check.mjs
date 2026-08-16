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

/**
 * ANSI colour, which has to be stripped rather than merely asked for.
 *
 * The environment below sets `NO_COLOR=1` and `FORCE_COLOR=0`, and ruff still
 * coloured its output: its terminal-detection reads *any* `FORCE_COLOR`,
 * including `0`, as "colour was forced", and that beats `NO_COLOR`. What
 * reached the ratchet was `ruff:<esc>[1m<esc>[94m--> launcher.py:#:#`, which is
 * wrong twice. The digits inside `<esc>[94m` go through the line-number
 * normaliser like any other number, so a change of palette rewrites every key;
 * and the escape at the start of `E402 Module level import not at top of file`
 * stops that line matching the rule-code pattern at all, so the baseline
 * recorded where a finding was without recording what it was. `--color never`
 * fixes ruff specifically; stripping fixes whichever tool does this next.
 */
const ANSI = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`,
  "g",
);

if (language === "shell") commands.push(["shellcheck", ...tracked(["sh"])]);
if (language === "python") {
  const files = tracked(["py"]);
  commands.push(
    ["ruff", "check", "--color", "never", ...files],
    ["ruff", "format", "--check", "--color", "never", ...files],
    ["mypy", "conformance/vectors/generate.py", "launcher.py"],
  );
}
if (language === "kotlin") commands.push(["ktlint", ...tracked(["kt"])]);
if (language === "swift")
  commands.push(["swiftlint", "lint", "--strict", "--quiet", "--no-cache"]);
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

/** The line an analyzer starts a diagnostic on. */
const DIAGNOSTIC =
  /^(?:[A-Z]\d{3}\b|Would reformat:|error(?:\[.*\])?:|warning:)|\.(?:kt|swift|py|rs):\d+(?::\d+)?:|:\d+(?::\d+)?:\s+(?:error|warning):/i;

/**
 * The location line ruff and clippy print *under* a diagnostic rather than on
 * it. Recorded as an entry of its own it says where a finding is without saying
 * what it is, while the line above says what without saying where — so four
 * E402s across three files came out as one key repeated with an occurrence
 * index, and inserting one in an early file renumbered the rest and read as new.
 */
const LOCATION = /^-->\s+(\S+)\s*$/;

/**
 * Ratchet keys for one analyzer run.
 *
 * Line numbers are normalised away because reformatting a file moves every one
 * of them and no findings; two findings that normalise alike are told apart by
 * an occurrence index, which is why the key has to carry the file.
 *
 * @param {string} command
 * @param {string} output
 * @param {Map<string, number>} occurrences shared across runs
 * @returns {string[]}
 */
function findingsFrom(command, output, occurrences) {
  const found = [];
  let pending = null;
  const flush = () => {
    if (pending === null) return;
    const normalized = `${command}:${pending.replace(/\d+(?:\.\d+)?/g, "#")}`;
    const occurrence = (occurrences.get(normalized) ?? 0) + 1;
    occurrences.set(normalized, occurrence);
    found.push(`${normalized}:occurrence-${occurrence}`);
    pending = null;
  };

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line
      .replaceAll(ANSI, "")
      .trim()
      .replaceAll(`${ROOT}${path.sep}`, "");
    const location = LOCATION.exec(trimmed);
    if (location !== null && pending !== null) {
      pending = `${pending} ${location[1]}`;
      flush();
    } else if (DIAGNOSTIC.test(trimmed)) {
      flush();
      pending = trimmed;
    }
  }
  flush();
  return found;
}

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
  );
  // A tool that failed without saying anything this parser recognises is still
  // a failure, and needs an entry or the ratchet records silence as clean.
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
