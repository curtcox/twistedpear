#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { REPORTS, ROOT, run, writeJson } from "./lib.mjs";
import { tools } from "./registry.mjs";

/**
 * The survey runner.
 *
 * Two rules govern this file, and they are the whole design:
 *
 * 1. **It never fails on findings.** Every tool runs to completion, writes its
 *    report, and the process exits 0 whatever the numbers say. The only
 *    non-zero exit is `--strict`, which exists for the workflow to distinguish
 *    "the runner itself broke" from "the code has problems" — and even that is
 *    off by default.
 * 2. **A tool that breaks does not take the others with it.** A thrown error,
 *    a missing toolchain, a crash — each is caught, recorded in the manifest
 *    with its message, and the run continues. A partial survey is useful; an
 *    aborted one is not.
 *
 * Usage:
 *   node scripts/survey/run.mjs                 every tool
 *   node scripts/survey/run.mjs --only=knip     one tool, repeatable
 *   node scripts/survey/run.mjs --strict        exit non-zero if any tool errored
 */
const argv = process.argv.slice(2);
const only = argv
  .filter((argument) => argument.startsWith("--only="))
  .flatMap((argument) => argument.slice("--only=".length).split(","))
  .filter((id) => id !== "");
const strict = argv.includes("--strict");

const selected =
  only.length === 0 ? tools : tools.filter((tool) => only.includes(tool.id));
const unknown = only.filter((id) => !tools.some((tool) => tool.id === id));
if (unknown.length > 0) {
  console.error(`Unknown survey tool(s): ${unknown.join(", ")}`);
  console.error(`Known: ${tools.map((tool) => tool.id).join(", ")}`);
  process.exit(2);
}

fs.mkdirSync(REPORTS, { recursive: true });

const started = new Date();
const results = [];

for (const tool of selected) {
  const begin = Date.now();
  process.stderr.write(`survey: ${tool.id} … `);
  let version;
  try {
    version = tool.version();
  } catch {
    // A tool whose version cannot be resolved still runs; the manifest just
    // records that it does not know which build produced the numbers.
    version = null;
  }
  const output = path.join(ROOT, tool.output);
  try {
    const { summary, findings } = tool.run();
    const bytes = writeJson(output, {
      tool: tool.id,
      title: tool.title,
      question: tool.question,
      version,
      generatedAt: started.toISOString(),
      commit: commit(),
      summary,
      findings,
    });
    const duration = Date.now() - begin;
    results.push({
      id: tool.id,
      title: tool.title,
      question: tool.question,
      status: "ok",
      version,
      output: tool.output,
      bytes,
      findings: Array.isArray(findings) ? findings.length : null,
      summary,
      durationMs: duration,
      error: null,
    });
    process.stderr.write(
      `ok (${Array.isArray(findings) ? findings.length : "?"} findings, ${(duration / 1000).toFixed(1)}s)\n`,
    );
  } catch (error) {
    const duration = Date.now() - begin;
    // The failure is the finding. Write it where the report would have gone so
    // a consumer reading `output` gets an explanation rather than a 404.
    const bytes = writeJson(output, {
      tool: tool.id,
      title: tool.title,
      version,
      generatedAt: started.toISOString(),
      commit: commit(),
      status: "error",
      error: String(error?.message ?? error),
      summary: null,
      findings: [],
    });
    results.push({
      id: tool.id,
      title: tool.title,
      question: tool.question,
      status: "error",
      version,
      output: tool.output,
      bytes,
      findings: null,
      summary: null,
      durationMs: duration,
      error: String(error?.message ?? error),
    });
    process.stderr.write(
      `ERROR ${String(error?.message ?? error).split("\n")[0]}\n`,
    );
  }
}

const finished = new Date();
const manifest = {
  schema: 1,
  commit: commit(),
  branch: branch(),
  generatedAt: finished.toISOString(),
  startedAt: started.toISOString(),
  durationMs: finished.getTime() - started.getTime(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  partial: only.length > 0,
  tools: results,
};
const manifestPath = path.join(REPORTS, "manifest.json");

// A partial run must not erase what a full run recorded for the other tools.
// The external trending system reads this file first and treats a missing tool
// as "no longer measured", which a single `--only=` invocation should not say.
if (manifest.partial && fs.existsSync(manifestPath)) {
  const previous = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const kept = (previous.tools ?? []).filter(
    (entry) => !results.some((result) => result.id === entry.id),
  );
  manifest.tools = [...results, ...kept].sort(
    (a, b) =>
      tools.findIndex((tool) => tool.id === a.id) -
      tools.findIndex((tool) => tool.id === b.id),
  );
}
writeJson(manifestPath, manifest);

const failed = results.filter((result) => result.status === "error");
process.stderr.write(
  `\nsurvey: ${results.length - failed.length}/${results.length} tools ok, wrote reports/ in ${((finished - started) / 1000).toFixed(1)}s\n`,
);
for (const failure of failed)
  process.stderr.write(`  ! ${failure.id}: ${failure.error.split("\n")[0]}\n`);

process.exit(strict && failed.length > 0 ? 1 : 0);

function commit() {
  const result = run("git", ["rev-parse", "HEAD"]);
  return result.status === 0 ? result.stdout.trim() : null;
}

function branch() {
  const result = run("git", ["rev-parse", "--abbrev-ref", "HEAD"]);
  return result.status === 0 ? result.stdout.trim() : null;
}
