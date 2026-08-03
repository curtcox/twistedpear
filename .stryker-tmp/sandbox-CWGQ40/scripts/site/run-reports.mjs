#!/usr/bin/env node
// @ts-nocheck
/**
 * Run unit tests and static/formal analysis, capturing structured results.
 * Continues after failures so all sections are published.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, RESULTS_DIR } from "./paths.mjs";
import { gates } from "../checks/registry.mjs";
import { summarizeStaticAnalysis } from "./static-analysis-metrics.mjs";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function gitSha() {
  const r = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: ROOT,
    encoding: "utf8"
  });
  return (r.stdout || "unknown").trim();
}

// SITE_REPORT_JOBS=file-sizes,unit-tests regenerates a subset locally without
// paying for the full suite. Skipped jobs keep their previously recorded result.
const JOB_FILTER = process.env.SITE_REPORT_JOBS
  ? new Set(process.env.SITE_REPORT_JOBS.split(",").map((s) => s.trim()).filter(Boolean))
  : null;

/** @returns {Map<string, any>} previously recorded job results, by id */
function previousJobs() {
  const p = path.join(RESULTS_DIR, "summary.json");
  if (!fs.existsSync(p)) return new Map();
  try {
    return new Map((JSON.parse(fs.readFileSync(p, "utf8")).jobs ?? []).map((j) => [j.id, j]));
  } catch {
    return new Map();
  }
}

const PREVIOUS = previousJobs();
const IMPORT_ENV = globalThis.process.env;
const IMPORTED_GATES = new Set((IMPORT_ENV.SITE_REPORT_IMPORT_GATES ?? "").split(",").filter(Boolean));
const IMPORT_DIR = IMPORT_ENV.SITE_REPORT_IMPORT_DIR ? path.resolve(IMPORT_ENV.SITE_REPORT_IMPORT_DIR) : null;
const artifactKey = (relative) => relative.replace(/^artifacts\//, "");

function copyOutput(relative) {
  const local = path.join(ROOT, relative);
  const imported = IMPORT_DIR ? path.join(IMPORT_DIR, relative) : null;
  const src = fs.existsSync(local) ? local : imported && fs.existsSync(imported) ? imported : null;
  if (!src) return false;
  const dest = path.join(RESULTS_DIR, "artifacts", artifactKey(relative));
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
  return true;
}

/**
 * @param {{ id: string, title: string, command: string[], cwd?: string, env?: Record<string,string>, copyOutputs?: string[] }} job
 */
function runJob(job) {
  const importedCheck = IMPORT_DIR ? path.join(IMPORT_DIR, "artifacts", "checks", `${job.id}.json`) : null;
  if (job.imported && importedCheck && fs.existsSync(importedCheck)) {
    for (const rel of job.copyOutputs ?? []) copyOutput(rel);
    const result = JSON.parse(fs.readFileSync(importedCheck, "utf8"));
    return {
      ...result,
      command: result.command ?? job.command.join(" "),
      logFile: `artifacts/logs/${job.id}.log`,
      durationMs: Date.parse(result.finishedAt) - Date.parse(result.startedAt),
      imported: true
    };
  }
  if (job.imported) {
    return {
      id: job.id,
      title: job.title,
      command: job.command.join(" "),
      startedAt: nowIso(),
      finishedAt: nowIso(),
      exitCode: 1,
      ok: false,
      logFile: null,
      durationMs: 0,
      imported: true,
      importError: `missing imported check artifact for ${job.id}`
    };
  }
  if (job.skipReason) {
    return {
      id: job.id,
      title: job.title,
      command: job.command.join(" "),
      startedAt: nowIso(),
      finishedAt: nowIso(),
      exitCode: 0,
      ok: true,
      logFile: `logs/${job.id}.log`,
      durationMs: 0,
      skipped: true,
      skipReason: job.skipReason
    };
  }
  if (JOB_FILTER && !JOB_FILTER.has(job.id)) {
    const prior = PREVIOUS.get(job.id);
    if (prior) return { ...prior, skipped: true };
    return {
      id: job.id,
      title: job.title,
      command: job.command.join(" "),
      startedAt: nowIso(),
      finishedAt: nowIso(),
      exitCode: 0,
      ok: true,
      logFile: `logs/${job.id}.log`,
      durationMs: 0,
      skipped: true
    };
  }

  const startedAt = nowIso();
  const logPath = path.join(RESULTS_DIR, "logs", `${job.id}.log`);
  ensureDir(path.dirname(logPath));

  const result = spawnSync(job.command[0], job.command.slice(1), {
    cwd: job.cwd ?? ROOT,
    encoding: "utf8",
    env: { ...process.env, ...(job.env ?? {}) },
    maxBuffer: 64 * 1024 * 1024
  });

  const stdout = result.stdout ?? "";
  const stderr = result.stderr ?? "";
  const log = [
    `$ ${job.command.join(" ")}`,
    `cwd: ${job.cwd ?? ROOT}`,
    `exit: ${result.status ?? 1}`,
    "",
    stdout,
    stderr ? `\n--- stderr ---\n${stderr}` : ""
  ].join("\n");
  fs.writeFileSync(logPath, log);

  for (const rel of job.copyOutputs ?? []) {
    copyOutput(rel);
  }

  return {
    id: job.id,
    title: job.title,
    command: job.command.join(" "),
    startedAt,
    finishedAt: nowIso(),
    exitCode: result.status ?? 1,
    ok: (result.status ?? 1) === 0,
    logFile: `logs/${job.id}.log`,
    durationMs: Date.parse(nowIso()) - Date.parse(startedAt)
  };
}

function summarizeDependencyGraph() {
  const graphPath = path.join(ROOT, "dependency-graph.json");
  if (!fs.existsSync(graphPath)) {
    return { present: false };
  }
  const dest = path.join(RESULTS_DIR, "artifacts", "dependency-graph.json");
  ensureDir(path.dirname(dest));
  fs.copyFileSync(graphPath, dest);
  try {
    const graph = JSON.parse(fs.readFileSync(graphPath, "utf8"));
    const modules = graph.modules ?? graph;
    const count = Array.isArray(modules) ? modules.length : Object.keys(modules).length;
    return {
      present: true,
      moduleCount: count,
      artifact: "artifacts/dependency-graph.json"
    };
  } catch {
    return { present: true, artifact: "artifacts/dependency-graph.json" };
  }
}

function summarizeFileSizes() {
  const p = path.join(RESULTS_DIR, "artifacts", "file-sizes.json");
  if (!fs.existsSync(p)) {
    return { present: false };
  }
  try {
    const inventory = JSON.parse(fs.readFileSync(p, "utf8"));
    return {
      present: true,
      totals: inventory.totals,
      byRule: (inventory.byRule ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        count: r.count,
        warn: r.warn,
        danger: r.danger,
        medianLines: r.medianLines,
        p90Lines: r.p90Lines,
        maxLines: r.maxLines,
        warnLines: r.thresholds?.warnLines,
        dangerLines: r.thresholds?.dangerLines
      })),
      byArea: inventory.byArea ?? [],
      worst: (inventory.danger ?? []).slice(0, 15).map((f) => ({
        file: f.file,
        rule: f.rule,
        lines: f.lines,
        excessLines: f.excessLines,
        reasons: f.reasons
      })),
      artifact: "artifacts/file-sizes.json"
    };
  } catch {
    return { present: true, artifact: "artifacts/file-sizes.json", parseError: true };
  }
}

function commandExists(command) {
  return spawnSync(command, [command === "actionlint" ? "-version" : "--version"], { encoding: "utf8" }).status === 0;
}

function missingRequirements(gate) {
  return gate.requires.filter((requirement) => {
    if (requirement === "node") return false;
    if (requirement === "macos") return process.platform !== "darwin";
    if (requirement === "jvm") return !commandExists("java");
    if (requirement === "rust") return !commandExists("cargo");
    if (requirement === "python") return !commandExists("python3");
    return !commandExists(requirement);
  });
}

function main() {
  ensureDir(RESULTS_DIR);
  ensureDir(path.join(RESULTS_DIR, "logs"));
  ensureDir(path.join(RESULTS_DIR, "artifacts"));

  const meta = {
    generatedAt: nowIso(),
    commit: gitSha(),
    node: process.version,
    ref: process.env.GITHUB_REF ?? null,
    runId: process.env.GITHUB_RUN_ID ?? null,
    runUrl: process.env.GITHUB_SERVER_URL && process.env.GITHUB_REPOSITORY && process.env.GITHUB_RUN_ID
      ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
      : null
  };

  /** @type {ReturnType<typeof runJob>[]} */
  const jobs = [];

  const requestedTier = process.argv.find((arg) => arg.startsWith("--tier="))?.slice(7) ?? "pr";
  for (const gate of gates) {
    const missing = missingRequirements(gate);
    const selected = requestedTier === "all" || gate.tier === requestedTier;
    jobs.push(
      runJob({
        id: gate.id,
        title: gate.title,
        command: [process.execPath, "scripts/checks/run.mjs", `--tier=${gate.tier}`, `--only=${gate.id}`],
        copyOutputs: gate.artifacts,
        imported: IMPORTED_GATES.has(gate.id),
        skipReason: !selected
          ? `${gate.tier} gate is outside the ${requestedTier} report tier`
          : missing.length > 0
            ? `missing local requirements: ${missing.join(", ")}`
            : null
      })
    );
  }

  for (const job of jobs) {
    const gate = gates.find((candidate) => candidate.id === job.id);
    job.artifacts = (gate?.artifacts ?? [])
      .map(artifactKey)
      .filter((relative) => fs.existsSync(path.join(RESULTS_DIR, "artifacts", relative)))
      .map((relative) => `artifacts/${relative}`);
    job.metrics = summarizeStaticAnalysis(gate, path.join(RESULTS_DIR, "artifacts"), job);
  }

  const dependencyGraph = summarizeDependencyGraph();
  const fileSizes = summarizeFileSizes();

  const report = {
    ...meta,
    jobs,
    vitest: null,
    dependencyGraph,
    fileSizes,
    ok: jobs.every((j) => j.ok),
    failed: jobs.filter((j) => !j.ok).map((j) => j.id)
  };

  fs.writeFileSync(
    path.join(RESULTS_DIR, "summary.json"),
    `${JSON.stringify(report, null, 2)}\n`
  );

  console.log(
    `Wrote ${path.join(RESULTS_DIR, "summary.json")} — ${report.ok ? "PASS" : "FAIL"} (${report.failed.length} failed)`
  );
  if (!report.ok) {
    console.log(`Failed jobs: ${report.failed.join(", ")}`);
  }

  // Exit 0 here; aggregate gate is checked after site deploy in CI.
  process.exit(0);
}

main();
