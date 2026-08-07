#!/usr/bin/env node
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { spawnSync } from "node:child_process";
import { basename, join, resolve } from "node:path";
import { latestValidationDir, rootFrom } from "./common.mjs";
import { lastProgress } from "../../conformance/soak-progress.mjs";
import { wasSkipped } from "../../conformance/mac-validation/resume.mjs";

const root = rootFrom(import.meta.url);

export function classify(text) {
  const exit = /\[mac-validation\] exit: (.+)$/m.exec(text)?.[1];
  // Checked before the exit code: a soak that skipped for want of Docker or
  // INTEROP=1 also exits 0, and must never be recorded as a pass.
  if (wasSkipped(text)) return { status: "skipped", category: "prerequisite" };
  if (exit === "0") return { status: "passed", category: "none" };
  if (!exit) return { status: "running", category: "incomplete" };
  if (/heap out of memory|ENOMEM|out of memory/i.test(text))
    return { status: "failed", category: "resource-exhaustion" };
  if (/timed? ?out|ETIMEDOUT/i.test(text))
    return { status: "failed", category: "timeout" };
  if (/spawn failed|not found|ENOENT/i.test(text))
    return { status: "failed", category: "environment" };
  if (/AssertionError|expected .* to|assert/i.test(text))
    return { status: "failed", category: "assertion" };
  return { status: "failed", category: "unknown" };
}

export function scan(logDir, outDir = join(logDir, "soak-triage")) {
  const files = readdirSync(logDir)
    .filter((name) => /^stage-8-.*\.log$/.test(name))
    .sort();
  const results = files.map((name) => {
    const path = join(logDir, name);
    const text = readFileSync(path, "utf8");
    const result = classify(text);
    const command =
      /\[mac-validation\] command: (.+)$/m.exec(text)?.[1] ?? "unknown";
    const item = { log: path, command, ...result };
    // A plan-duration soak writes nothing between start and finish, so without
    // the heartbeat "running" is indistinguishable from "hung" for up to 72 h.
    const progress = lastProgress(text);
    if (progress !== null && result.status === "running") {
      item.percent = progress.percent;
      item.elapsedMs = progress.elapsedMs;
      item.eta = progress.eta;
    }
    if (result.status === "failed") {
      mkdirSync(outDir, { recursive: true });
      const tail = text.slice(-12000).replaceAll("```", "`\u200b``");
      const file = join(outDir, `${basename(name, ".log")}-reproducer.md`);
      writeFileSync(
        file,
        `# Soak failure reproducer\n\n- Category: ${result.category}\n- Source log: ${path}\n- Command: \`${command}\`\n\n## Reproduce\n\n\`\`\`sh\n${command}\n\`\`\`\n\n## Log tail\n\n\`\`\`text\n${tail}\n\`\`\`\n`,
      );
      item.reproducer = file;
    }
    return item;
  });
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    join(outDir, "status.json"),
    `${JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2)}\n`,
  );
  return results;
}

/**
 * With --continue-on-failure the run keeps going after a failure, so nothing
 * otherwise interrupts an eleven-day soak to say something broke at 03:00.
 * Fires once per newly failed soak.
 * @param {string} id
 * @param {string} log
 */
function notify(id, log) {
  const message = `${id} failed — ${basename(log)}`;
  spawnSync("osascript", [
    "-e",
    `display notification ${JSON.stringify(message)} with title "TwistedPear soaks"`,
  ]);
}

function main(argv = process.argv.slice(2)) {
  const arg = argv.find((value) => !value.startsWith("--"));
  const logDir = arg ? resolve(arg) : latestValidationDir(root);
  if (!logDir || !existsSync(logDir))
    throw new Error("no validation log directory found; pass one explicitly");
  const shouldNotify = argv.includes("--notify");
  const announced = new Set();
  const run = () => {
    const results = scan(logDir);
    if (shouldNotify) {
      for (const result of results) {
        if (result.status !== "failed" || announced.has(result.log)) continue;
        announced.add(result.log);
        notify(basename(result.log, ".log"), result.log);
      }
    }
    console.log(JSON.stringify(results, null, 2));
  };
  run();
  if (argv.includes("--watch")) setInterval(run, 5000);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
