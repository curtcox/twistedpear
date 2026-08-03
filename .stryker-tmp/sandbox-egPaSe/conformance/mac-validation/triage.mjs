#!/usr/bin/env node
// @ts-nocheck
/**
 * Build a provider-neutral Stage 9 triage package from mac-validation logs.
 *
 * The output is Markdown that can be pasted into Codex, Claude Code, or a
 * scripted model call. It intentionally does not call any AI provider.
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultValidationRoot = join(repoRoot, ".tmp/mac-validation");

export function parseArgs(argv) {
  const options = {
    all: false,
    maxLogBytes: 12000,
    logDir: undefined,
    out: undefined,
    statusPath: join(repoRoot, "STATUS-SOFTWARE.md"),
    help: false
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--help" || arg === "-h") options.help = true;
    else if (arg === "--all") options.all = true;
    else if (arg === "--log-dir") options.logDir = resolve(argv[++i]);
    else if (arg.startsWith("--log-dir=")) options.logDir = resolve(arg.slice("--log-dir=".length));
    else if (arg === "--out") options.out = resolve(argv[++i]);
    else if (arg.startsWith("--out=")) options.out = resolve(arg.slice("--out=".length));
    else if (arg === "--status") options.statusPath = resolve(argv[++i]);
    else if (arg.startsWith("--status=")) options.statusPath = resolve(arg.slice("--status=".length));
    else if (arg === "--max-log-bytes") options.maxLogBytes = readPositiveInteger(argv[++i], arg);
    else if (arg.startsWith("--max-log-bytes=")) {
      options.maxLogBytes = readPositiveInteger(arg.slice("--max-log-bytes=".length), "--max-log-bytes");
    } else {
      throw new Error(`unknown option: ${arg}`);
    }
  }

  return options;
}

function readPositiveInteger(value, flag) {
  if (!/^[1-9]\d*$/.test(value ?? "")) throw new Error(`${flag} requires a positive integer`);
  return Number.parseInt(value, 10);
}

function printHelp() {
  console.log(`Usage: npm run triage:mac -- [options]

Creates a Stage 9 AI-triage evidence package from mac-validation logs.

Options:
  --log-dir PATH       Validation log directory. Defaults to latest .tmp/mac-validation run.
  --out PATH           Output Markdown path. Defaults to <log-dir>/triage-package.md.
  --all                Include passing logs too. By default only failed logs are included.
  --max-log-bytes N    Tail bytes to include per log. Default: 12000.
  --status PATH        STATUS-SOFTWARE.md path. Default: repo root STATUS-SOFTWARE.md.
`);
}

function latestValidationLogDir() {
  if (!existsSync(defaultValidationRoot)) {
    throw new Error(`no validation log root found at ${defaultValidationRoot}; pass --log-dir`);
  }

  const dirs = readdirSync(defaultValidationRoot)
    .map((name) => join(defaultValidationRoot, name))
    .filter((path) => statSync(path).isDirectory())
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);

  if (dirs.length === 0) throw new Error(`no validation runs found under ${defaultValidationRoot}; pass --log-dir`);
  return dirs[0];
}

export function readLogEntries(logDir) {
  return readdirSync(logDir)
    .filter((name) => name.endsWith(".log"))
    .sort()
    .map((name) => {
      const path = join(logDir, name);
      const text = readFileSync(path, "utf8");
      const command = matchFirst(text, /^\[mac-validation\] command: (.+)$/m) ?? basename(path, ".log");
      const cwd = matchFirst(text, /^\[mac-validation\] cwd: (.+)$/m) ?? repoRoot;
      const exitText = matchFirst(text, /^\[mac-validation\] exit: (.+)$/m);
      const exitCode = exitText !== undefined && /^\d+$/.test(exitText) ? Number.parseInt(exitText, 10) : undefined;
      const stage = matchFirst(name, /^stage-(\d+)-/);
      const script = matchFirst(command, /\bnpm run ([^ ]+)/);
      const helper = matchFirst(text, /^\[mac-validation\] helper: (.+)$/m);
      return { path, name, text, command, cwd, exitCode, exitStatus: exitText ?? "unknown", stage, script, helper };
    });
}

function matchFirst(text, regex) {
  return regex.exec(text)?.[1];
}

export function statusCandidates(statusPath, entries) {
  if (!existsSync(statusPath)) return [];

  const status = readFileSync(statusPath, "utf8");
  const lines = status.split("\n");
  const scriptTerms = entries.flatMap((entry) => {
    if (!entry.script) return [];
    const bare = entry.script.replace(/^test:/, "");
    return [entry.script, bare, bare.replace(/-/g, " ")];
  });
  const stageTerms = entries.map((entry) => entry.stage ? `Stage ${entry.stage}` : "").filter(Boolean);
  const terms = [...new Set([...scriptTerms, ...stageTerms])]
    .map((term) => term.toLowerCase())
    .filter((term) => term.length >= 3);

  const matches = [];
  for (const line of lines) {
    const lower = line.toLowerCase();
    if (terms.some((term) => lower.includes(term))) matches.push(line);
  }

  return [...new Set(matches)].slice(0, 80);
}

export function tailText(text, maxBytes) {
  const bytes = Buffer.from(text);
  if (bytes.length <= maxBytes) return text;

  return `[tail truncated to ${maxBytes} bytes]\n${bytes.subarray(bytes.length - maxBytes).toString("utf8")}`;
}

function fenced(text) {
  return `\`\`\`text\n${text.replace(/```/g, "`\u200b``")}\n\`\`\``;
}

export function isFailedEntry(entry) {
  if (entry.helper === "caffeinate" || entry.name === "plan-duration-caffeinate.log") {
    return !["0", "SIGTERM"].includes(entry.exitStatus);
  }

  return entry.exitStatus !== "0";
}

export function renderPackage({ logDir, entries, included, statusRows, maxLogBytes }) {
  const failures = entries.filter(isFailedEntry);
  const lines = [
    "# TwistedPear mac-validation triage package",
    "",
    "## Prompt",
    "",
    "You are triaging TwistedPear mac-validation failures. Use only the attached logs and repository context. For each failed suite, classify the failure as product bug, flaky test, environment, or toolchain; identify likely files; propose the next verification command; draft any STATUS-SOFTWARE.md update. Do not mark a plan-duration soak complete unless the requested duration ran.",
    "",
    "## Run Summary",
    "",
    `- Log directory: ${logDir}`,
    `- Logs found: ${entries.length}`,
    `- Failed or incomplete logs: ${failures.length}`,
    `- Included logs: ${included.length}`,
    `- Max log tail per file: ${maxLogBytes} bytes`,
    "",
    "## Command Results",
    "",
    "| Stage | Exit | Script | Command | Log |",
    "|---|---:|---|---|---|"
  ];

  for (const entry of entries) {
    lines.push(`| ${entry.stage ?? ""} | ${entry.exitStatus} | ${entry.script ?? ""} | \`${entry.command.replaceAll("|", "\\|")}\` | \`${entry.path}\` |`);
  }

  if (statusRows.length > 0) {
    lines.push("", "## STATUS-SOFTWARE.md Candidate Rows", "");
    for (const row of statusRows) lines.push(row);
  }

  if (included.length === 0) {
    lines.push("", "## Log Tails", "", "No failed logs found. Re-run with `--all` to package passing logs.");
  } else {
    lines.push("", "## Log Tails", "");
    for (const entry of included) {
      lines.push(
        `### ${entry.name}`,
        "",
        `- Stage: ${entry.stage ?? "unknown"}`,
        `- Exit: ${entry.exitStatus}`,
        `- CWD: ${entry.cwd}`,
        `- Command: \`${entry.command}\``,
        "",
        fenced(tailText(entry.text, maxLogBytes)),
        ""
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

export function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) {
    printHelp();
    return;
  }

  const logDir = options.logDir ?? latestValidationLogDir();
  if (!existsSync(logDir) || !statSync(logDir).isDirectory()) {
    throw new Error(`log directory does not exist: ${logDir}`);
  }

  const entries = readLogEntries(logDir);
  const included = options.all ? entries : entries.filter(isFailedEntry);
  const statusRows = statusCandidates(options.statusPath, included.length > 0 ? included : entries);
  const out = options.out ?? join(logDir, "triage-package.md");
  const markdown = renderPackage({
    logDir,
    entries,
    included,
    statusRows,
    maxLogBytes: options.maxLogBytes
  });

  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, markdown);
  console.log(`[mac-validation] triage package: ${out}`);
  console.log(`[mac-validation] included ${included.length} of ${entries.length} log(s)`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main();
}
