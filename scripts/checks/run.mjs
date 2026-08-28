#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { gates } from "./registry.mjs";
import { requirementAvailable } from "../tools/requirements.mjs";
import { treeFingerprint } from "../release/fingerprint.mjs";
import { probeLocalhostBind } from "./localhost-bind.mjs";
import {
  finishRun,
  gateOutcome,
  pruneRuns,
  recordGateRun,
  runIdFor,
  startRun,
} from "./history.mjs";
import {
  formatRefusal,
  gateCost,
  hostDiagnostics,
  waitForHeadroom,
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

/**
 * Recording history must never fail a gate run: a bug in the bookkeeping is not
 * a gate result. Same rule the CI sampler follows.
 * @param {() => unknown} action
 */
function withoutFailing(action) {
  try {
    return action();
  } catch (error) {
    console.warn(`check-run history: ${error.message}`);
    return undefined;
  }
}

function writeGateResult(
  gate,
  {
    startedAt,
    exitCode,
    ok,
    stdout,
    stderr,
    headroom,
    skipped,
    refused,
    detail,
  },
) {
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
    ...(headroom ? { headroom } : {}),
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
  // The artifact above is the latest value for this gate; this is the series.
  withoutFailing(() =>
    recordGateRun(ROOT, runId, {
      id: gate.id,
      title: gate.title,
      tier: gate.tier,
      requires: gate.requires,
      command: artifact.command,
      outcome: gateOutcome({ ok, skipped, refused }),
      exitCode,
      startedAt,
      finishedAt: artifact.finishedAt,
      durationMs: Date.parse(artifact.finishedAt) - Date.parse(startedAt),
      ...(detail ? { detail } : {}),
      ...(headroom ? { headroom } : {}),
    }),
  );
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(
      process.env.GITHUB_STEP_SUMMARY,
      `## ${gate.title}\n\n| Gate | Result | Duration |\n|---|---:|---:|\n| \`${gate.id}\` | ${exitCode === 0 ? "PASS" : "FAIL"} | ${Date.parse(artifact.finishedAt) - Date.parse(startedAt)} ms |\n\n`,
    );
  }
}

const runStartedAt = new Date().toISOString();
const runId = runIdFor(runStartedAt, checkoutCommit);
// Recorded, not enforced: a run whose gates bind sockets in an environment that
// forbids it is still allowed to try, but the record says which environment
// measured the result. Refusing on this probe is the streaming runner's job.
const localhostBind = await probeLocalhostBind().catch(() => undefined);
withoutFailing(() =>
  startRun(ROOT, {
    runId,
    startedAt: runStartedAt,
    commit: checkoutCommit,
    branchSha,
    treeDigest: withoutFailing(() => treeFingerprint(ROOT)) ?? "",
    tier,
    selection: selected.map((gate) => gate.id),
    selectedBecause: {
      ...(only ? { only } : {}),
      ...(requiredFilter ? { requires: requiredFilter } : {}),
      ...(hasRequires ? { hasRequires } : {}),
      ...(lacksRequires ? { lacksRequires } : {}),
      ...(keepGoing ? { keepGoing } : {}),
      ...(forceHeadroom ? { forceHeadroom } : {}),
    },
    host: `${os.platform()}-${os.arch()}`,
    cpuCount: os.cpus().length,
    ci: Boolean(process.env.CI),
    localhostBind: localhostBind?.ok
      ? "available"
      : `unavailable: ${localhostBind?.protocol} ${localhostBind?.message}`,
  }),
);

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
      skipped: !inCi,
      detail: message,
    });
    continue;
  }

  const headroom = await waitForHeadroom({
    cost: gateCost(gate.id),
    force: forceHeadroom,
  });
  if (!headroom.verdict.ok) {
    const message = formatRefusal(
      gate.id,
      headroom.verdict,
      headroom.snapshot,
      headroom.samples,
    );
    console.error(message);
    writeGateResult(gate, {
      startedAt,
      exitCode: 2,
      ok: false,
      stdout: "",
      stderr: message,
      headroom: hostDiagnostics(headroom.snapshot),
      refused: true,
      detail: message.split("\n")[0],
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
      TP_HEADROOM_OWNER_PIDS: [process.env.TP_HEADROOM_OWNER_PIDS, process.pid]
        .filter(Boolean)
        .join(","),
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

const exitCode = failed > 0 ? (refused === failed ? 2 : 1) : 0;
withoutFailing(() =>
  finishRun(ROOT, runId, { finishedAt: new Date().toISOString(), exitCode }),
);
withoutFailing(() => pruneRuns(ROOT));

console.log(
  `\nStatic-analysis gates: ${selected.length - failed}/${selected.length} passed.`,
);
console.log(`Run history: ${path.join("artifacts", "check-runs", runId)}`);
if (exitCode !== 0) process.exit(exitCode);
