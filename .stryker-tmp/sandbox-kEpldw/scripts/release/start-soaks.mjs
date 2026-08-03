#!/usr/bin/env node
// @ts-nocheck
import { spawn } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { record } from "./record.mjs";
import { rootFrom } from "./common.mjs";

const root = rootFrom(import.meta.url);

export function plan(now = new Date()) {
  const token = now.toISOString().replace(/[:.]/g, "-");
  const logDir = join(root, ".tmp/mac-validation", `release-${token}`);
  return {
    logDir,
    command: process.execPath,
    args: ["conformance/mac-validation/run.mjs", "--stage", "8", "--plan-duration", "--log-dir", logDir]
  };
}

async function main(argv = process.argv.slice(2)) {
  const prepared = plan();
  console.log(`[release] Stage-8 logs: ${prepared.logDir}`);
  console.log(`[release] command: ${prepared.command} ${prepared.args.join(" ")}`);
  if (argv.includes("--dry-run")) return;

  mkdirSync(prepared.logDir, { recursive: true });
  const startLog = join(prepared.logDir, "release-start.log");
  writeFileSync(startLog, `[release] plan-duration Stage 8 started at ${new Date().toISOString()}\n[release] log directory: ${prepared.logDir}\n`);
  record({ root, id: "soaks:plan-duration", status: "started", log: startLog, note: "Stage-8 serial plan-duration runner started" });

  const watcher = spawn(process.execPath, ["scripts/release/watch-soaks.mjs", prepared.logDir, "--watch"], {
    cwd: root,
    detached: true,
    stdio: "ignore"
  });
  watcher.unref();
  console.log(`[release] soak watcher detached (pid ${watcher.pid})`);

  const child = spawn(prepared.command, prepared.args, { cwd: root, env: process.env, stdio: "inherit" });
  const status = await new Promise((resolve) => {
    child.on("error", () => resolve(1));
    child.on("close", (code) => resolve(code ?? 1));
  });
  watcher.kill("SIGTERM");
  process.exitCode = status;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
