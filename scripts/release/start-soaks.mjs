#!/usr/bin/env node
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { record } from "./record.mjs";
import { latestValidationDir, rootFrom } from "./common.mjs";

const root = rootFrom(import.meta.url);

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
  if (argv.includes("--dry-run")) return;

  mkdirSync(prepared.logDir, { recursive: true });
  const startLog = join(prepared.logDir, "release-start.log");
  writeFileSync(
    startLog,
    `[release] plan-duration Stage 8 started at ${new Date().toISOString()}\n[release] log directory: ${prepared.logDir}\n`,
  );
  record({
    root,
    id: "soaks:plan-duration",
    status: "started",
    log: startLog,
    note: "Stage-8 serial plan-duration runner started",
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
  const status = await new Promise((resolve) => {
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
  watcher.kill("SIGTERM");
  process.exitCode = status;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
