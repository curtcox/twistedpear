#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { record } from "./record.mjs";
import { rootFrom } from "./common.mjs";
import {
  captureBaseline,
  currentBranch,
  isReleaseBranch,
  verifyBaseline,
} from "./soak-guard.mjs";

const root = rootFrom(import.meta.url);

/** How often the guard re-checks the application tree during a run. */
const GUARD_INTERVAL_MS = Number.parseInt(
  process.env.SOAK_GUARD_INTERVAL_MS ?? "30000",
  10,
);

export function plan(now = new Date()) {
  const token = now.toISOString().replace(/[:.]/g, "-");
  const logDir = join(root, ".tmp/mac-validation", `release-${token}`);
  return {
    logDir,
    command: process.execPath,
    args: [
      "conformance/mac-validation/run.mjs",
      "--stage",
      "8",
      "--plan-duration",
      "--log-dir",
      logDir,
    ],
  };
}

async function main(argv = process.argv.slice(2)) {
  const prepared = plan();
  console.log(`[release] Stage-8 logs: ${prepared.logDir}`);
  console.log(
    `[release] command: ${prepared.command} ${prepared.args.join(" ")}`,
  );
  if (argv.includes("--dry-run")) {
    const branch = currentBranch(root);
    console.log(
      `[release] branch gate: ${branch} ${isReleaseBranch(branch) ? "accepted" : "REJECTED (plan-duration soaks require a release/* branch)"}`,
    );
    return;
  }

  const baseline = captureBaseline(root);
  console.log(
    `[release] soaking ${baseline.branch} @ ${baseline.head.slice(0, 12)} (application digest ${baseline.digest.slice(0, 12)})`,
  );

  mkdirSync(prepared.logDir, { recursive: true });
  writeFileSync(
    join(prepared.logDir, "soak-baseline.json"),
    `${JSON.stringify(baseline, null, 2)}\n`,
  );
  const startLog = join(prepared.logDir, "release-start.log");
  writeFileSync(
    startLog,
    `[release] plan-duration Stage 8 started at ${new Date().toISOString()}\n[release] log directory: ${prepared.logDir}\n[release] branch: ${baseline.branch}\n[release] revision: ${baseline.head}\n[release] application digest: ${baseline.digest}\n`,
  );
  record({
    root,
    id: "soaks:plan-duration",
    status: "started",
    log: startLog,
    note: `Stage-8 serial plan-duration runner started on ${baseline.branch} @ ${baseline.head.slice(0, 12)}`,
  });

  const watcher = spawn(
    process.execPath,
    ["scripts/release/watch-soaks.mjs", prepared.logDir, "--watch"],
    {
      cwd: root,
      detached: true,
      stdio: "ignore",
    },
  );
  watcher.unref();
  console.log(`[release] soak watcher detached (pid ${watcher.pid})`);

  const child = spawn(prepared.command, prepared.args, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
  });

  // A soak is evidence for one tree. If the application code moves underneath a
  // run, every remaining serial soak would build something else and the results
  // already collected would describe code that no longer exists — so stop.
  let drifted = false;
  const guard = setInterval(() => {
    const result = verifyBaseline(baseline, root);
    if (result.ok) return;
    drifted = true;
    clearInterval(guard);
    const driftLog = join(prepared.logDir, "soak-guard-drift.log");
    writeFileSync(
      driftLog,
      `[release] soak guard failed at ${new Date().toISOString()}\n[release] ${result.reason}\n[release] baseline: ${baseline.branch} @ ${baseline.head}\n[release] now: ${result.branch} @ ${result.head}\n[release] changed:\n${result.changed.map((path) => `  ${path}`).join("\n")}\n[mac-validation] exit: 1\n`,
    );
    console.error(`[release] soak guard: ${result.reason}`);
    record({
      root,
      id: "soaks:plan-duration",
      status: "failed",
      log: driftLog,
      note: result.reason,
    });
    child.kill("SIGTERM");
  }, GUARD_INTERVAL_MS);

  const status = await new Promise((resolve) => {
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
  clearInterval(guard);
  watcher.kill("SIGTERM");
  process.exitCode = drifted ? 1 : status;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
