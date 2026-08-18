#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gates } from "./registry.mjs";
import { requirementAvailable } from "../tools/requirements.mjs";
import {
  formatRefusal,
  gateCost,
  judgeHeadroom,
  snapshotHost,
} from "./headroom.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const args = process.argv.slice(2);
const value = (name) =>
  args
    .find((arg) => arg.startsWith(`--${name}=`))
    ?.split("=")
    .slice(1)
    .join("=");
const tier = value("tier") ?? "pr";
const only = value("only");
const requiredFilter = value("requires");
const hasRequires = value("has-requires");
const lacksRequires = value("lacks-requires");
const matrix = args.includes("--matrix");
const forceHeadroom = args.includes("--force-headroom");
const keepGoing = args.includes("--keep-going");

function gitSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return (result.stdout || "unknown").trim();
}

const checkoutCommit = gitSha();
const branchSha = process.env.GITHUB_SHA ?? checkoutCommit;

// Probing lives in scripts/tools/requirements.mjs so the runner, the doctor,
// and the installer cannot disagree about whether a tool is available.

let selected = gates.filter((gate) => gate.tier === tier);
if (only) selected = selected.filter((gate) => gate.id === only);
if (requiredFilter) {
  const allowed = new Set(requiredFilter.split(","));
  selected = selected.filter((gate) =>
    gate.requires.every((requirement) => allowed.has(requirement)),
  );
}
if (hasRequires) {
  const needed = hasRequires.split(",");
  selected = selected.filter((gate) =>
    needed.every((requirement) => gate.requires.includes(requirement)),
  );
}
if (lacksRequires) {
  const forbidden = new Set(lacksRequires.split(","));
  selected = selected.filter(
    (gate) => !gate.requires.some((requirement) => forbidden.has(requirement)),
  );
}
if (only && selected.length === 0) {
  console.error(`Unknown ${tier} gate: ${only}`);
  process.exit(2);
}

if (matrix) {
  process.stdout.write(
    JSON.stringify(
      selected.map(({ id, title, os: runner }) => ({ id, title, runner })),
    ),
  );
  process.exit(0);
}

function writeGateResult(gate, { startedAt, exitCode, ok, stdout, stderr }) {
  const artifact = {
    id: gate.id,
    title: gate.title,
    commit: checkoutCommit,
    branchSha,
    command: gate.command.join(" "),
    requires: gate.requires,
    startedAt,
    finishedAt: new Date().toISOString(),
    exitCode,
    ok,
    host: `${os.platform()}-${os.arch()}`,
  };
  const artifactPath = path.join(
    ROOT,
    "artifacts",
    "checks",
    `${gate.id}.json`,
  );
  const logPath = path.join(ROOT, "artifacts", "logs", `${gate.id}.log`);
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  fs.writeFileSync(artifactPath, `${JSON.stringify(artifact, null, 2)}\n`);
  fs.writeFileSync(
    logPath,
    [
      `$ ${gate.command.join(" ")}`,
      `exit: ${exitCode}`,
      "",
      stdout,
      stderr ? `\n--- stderr ---\n${stderr}` : "",
    ].join("\n"),
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## ${gate.title}\n\n| Gate | Result | Duration |\n|---|---:|---:|\n| \`${gate.id}\` | ${exitCode === 0 ? "PASS" : "FAIL"} | ${Date.parse(artifact.finishedAt) - Date.parse(startedAt)} ms |\n\n`,
    );
  }
}

// One gate at a time. Preflight host headroom before each spawn, and stop on
// the first failure unless --keep-going. Continuing past a failed coverage
// gate is how a 16 GB host reaches the SMC watchdog.
let failed = 0;
let refused = 0;
for (const gate of selected) {
  const missing = gate.requires.filter(
    (requirement) => !requirementAvailable(requirement),
  );
  const startedAt = new Date().toISOString();
  if (missing.length > 0) {
    const message = `${gate.title}: missing ${missing.join(", ")}`;
    const inCi = Boolean(process.env.CI);
    if (inCi) {
      console.error(`FAIL ${message}`);
      failed += 1;
    } else {
      console.log(`SKIP ${message}`);
    }
    // Always write the check record. Pages imports this file; skipping the
    // write is what published rust-fuzz as "missing imported check artifact"
    // instead of the actual missing-toolchain failure.
    writeGateResult(gate, {
      startedAt,
      exitCode: inCi ? 1 : 0,
      ok: !inCi,
      stdout: "",
      stderr: message,
    });
    continue;
  }

  const headroom = judgeHeadroom(snapshotHost(), {
    cost: gateCost(gate.id),
    force: forceHeadroom,
  });
  if (!headroom.ok) {
    const message = formatRefusal(gate.id, headroom);
    console.error(message);
    writeGateResult(gate, {
      startedAt,
      exitCode: 2,
      ok: false,
      stdout: "",
      stderr: message,
    });
    failed += 1;
    refused += 1;
    if (!keepGoing) break;
    continue;
  }

  console.log(`\n==> ${gate.title} (${gate.id})`);
  const result = spawnSync(gate.command[0], gate.command.slice(1), {
    cwd: ROOT,
    env: {
      ...process.env,
      CHECK_ID: gate.id,
      ...(forceHeadroom ? { TP_FORCE_HEADROOM: "1" } : {}),
    },
    encoding: "utf8",
    stdio: ["inherit", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  process.stdout.write(stdout);
  process.stderr.write(stderr);
  const exitCode = result.status ?? 1;
  writeGateResult(gate, {
    startedAt,
    exitCode,
    ok: exitCode === 0,
    stdout,
    stderr,
  });
  if (exitCode !== 0) {
    failed += 1;
    if (!keepGoing) break;
  }
}

console.log(
  `\nStatic-analysis gates: ${selected.length - failed}/${selected.length} passed.`,
);
if (failed > 0) process.exit(refused === failed ? 2 : 1);
