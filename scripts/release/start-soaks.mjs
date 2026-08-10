#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { record } from "./record.mjs";
import { latestValidationDir, rootFrom } from "./common.mjs";
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

/**
 * link-soak and transport-node-soak print "skipped" and exit 0 without
 * INTEROP=1 and a running Docker, so an eleven-day run would silently produce
 * no evidence for RQ-LINK and RQ-TRANSPORT. Set here rather than relying on the
 * caller's shell.
 * @returns {NodeJS.ProcessEnv}
 */
export function launchEnvironment(env = process.env) {
  return { ...env, INTEROP: env.INTEROP ?? "1" };
}

/**
 * A resumed run stands on the evidence the interrupted one already produced, so
 * it has to be the same tree. Re-capturing the baseline here would silently
 * re-anchor it to whatever is checked out now, and the soaks `--resume` steps
 * over would count as evidence for code they never ran against — precisely what
 * the guard exists to prevent. Reuse the recorded baseline, and refuse rather
 * than resume if the application has moved since.
 * @param {string} logDir
 * @param {string} repoRoot
 * @returns {ReturnType<typeof captureBaseline>}
 */
export function resumeBaseline(logDir, repoRoot = root) {
  const baselineFile = join(logDir, "soak-baseline.json");
  if (!existsSync(baselineFile)) {
    throw new Error(
      `${baselineFile} is missing — that run predates the soak guard, so its passes cannot be attributed to a tree. Start a fresh run instead.`,
    );
  }
  const baseline = JSON.parse(readFileSync(baselineFile, "utf8"));
  const drift = verifyBaseline(baseline, repoRoot);
  if (!drift.ok) throw new Error(drift.reason);
  return baseline;
}

/**
 * @param {Date} now
 * @param {{ logDir?: string; resume?: boolean }} [options]
 */
export function plan(now = new Date(), options = {}) {
  const token = now.toISOString().replace(/[:.]/g, "-");
  const logDir =
    options.logDir ?? join(root, ".tmp/mac-validation", `release-${token}`);
  return {
    logDir,
    command: process.execPath,
    args: [
      "conformance/mac-validation/run.mjs",
      "--stage",
      "8",
      "--plan-duration",
      // Eleven days of soaks must not be discarded because one of them failed
      // in the first hour; failures are triaged from the logs afterwards.
      "--continue-on-failure",
      ...(options.resume ? ["--resume"] : []),
      "--log-dir",
      logDir,
    ],
  };
}

async function main(argv = process.argv.slice(2)) {
  // --resume continues the most recent run in place: commands whose log already
  // exited 0 are skipped, so an interrupted plan costs only the soak that was
  // mid-flight rather than everything before it.
  const resume = argv.includes("--resume");
  const existing = resume ? latestValidationDir(root) : null;
  if (resume && !existing) {
    console.error("[release] no previous run to resume");
    process.exitCode = 1;
    return;
  }
  const prepared = plan(new Date(), {
    resume,
    logDir: existing ?? undefined,
  });
  if (resume) console.log("[release] resuming; passed soaks will be skipped");
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

  /** @type {ReturnType<typeof captureBaseline>} */
  let baseline;
  try {
    baseline = resume ? resumeBaseline(prepared.logDir) : captureBaseline(root);
  } catch (error) {
    console.error(`[release] cannot resume: ${error.message}`);
    process.exitCode = 1;
    return;
  }
  console.log(
    `[release] soaking ${baseline.branch} @ ${baseline.head.slice(0, 12)} (application digest ${baseline.digest.slice(0, 12)})`,
  );

  mkdirSync(prepared.logDir, { recursive: true });
  // Resuming keeps the original baseline file: it is the anchor the already
  // passed soaks were run against, not a record of when this process started.
  if (!resume) {
    writeFileSync(
      join(prepared.logDir, "soak-baseline.json"),
      `${JSON.stringify(baseline, null, 2)}\n`,
    );
  }
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
    ["scripts/release/watch-soaks.mjs", prepared.logDir, "--watch", "--notify"],
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
    env: launchEnvironment(),
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
