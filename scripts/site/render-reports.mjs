#!/usr/bin/env node
/**
 * Render quality-results Markdown pages from site-results/summary.json.
 */
import fs from "node:fs";
import path from "node:path";
import { RESULTS_DIR, SITE_SRC, REPO_URL } from "./paths.mjs";

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function statusBadge(ok) {
  return ok ? "✅ pass" : "❌ fail";
}

function escapeMd(s) {
  return String(s ?? "").replace(/\|/g, "\\|");
}

function formatDuration(ms) {
  if (ms == null || Number.isNaN(ms)) return "—";
  if (ms < 1000) return `${ms} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function truncate(text, max = 8000) {
  if (!text) return "";
  if (text.length <= max) return text;
  return `${text.slice(0, max)}\n\n… truncated …\n`;
}

function loadSummary() {
  const p = path.join(RESULTS_DIR, "summary.json");
  if (!fs.existsSync(p)) {
    return {
      generatedAt: new Date().toISOString(),
      commit: "unknown",
      ok: false,
      failed: ["missing-summary"],
      jobs: [],
      vitest: null,
      dependencyGraph: { present: false },
      placeholder: true
    };
  }
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function renderIndex(summary) {
  const commitLink =
    summary.commit && summary.commit !== "unknown"
      ? `[${summary.commit.slice(0, 7)}](${REPO_URL}/commit/${summary.commit})`
      : "unknown";

  const rows = (summary.jobs ?? [])
    .map(
      (j) =>
        `| ${statusBadge(j.ok)} | [${escapeMd(j.title)}](./${j.id}) | \`${escapeMd(j.command)}\` | ${formatDuration(j.durationMs)} |`
    )
    .join("\n");

  const vitest = summary.vitest;
  const vitestLine = vitest
    ? `Vitest: **${vitest.numPassedTests ?? "?"}** passed / **${vitest.numFailedTests ?? "?"}** failed / **${vitest.numTotalTests ?? "?"}** total.`
    : "Vitest JSON summary not available.";

  const dep = summary.dependencyGraph;
  const depLine = dep?.present
    ? `Dependency graph: **${dep.moduleCount ?? "?"}** modules — [download JSON](./raw/dependency-graph.json).`
    : "Dependency graph not generated.";

  return `# Quality results

${summary.placeholder ? "> Reports have not been generated yet. Run `npm run site:reports`.\n" : ""}
**Overall:** ${statusBadge(summary.ok)}  
**Generated:** ${escapeMd(summary.generatedAt)}  
**Commit:** ${commitLink}  
${summary.runUrl ? `**CI run:** [actions](${summary.runUrl})  \n` : ""}
${summary.failed?.length ? `**Failed jobs:** ${summary.failed.map((id) => `\`${id}\``).join(", ")}  \n` : ""}

${vitestLine}

${depLine}

## Checks

| Status | Check | Command | Duration |
|---|---|---|---|
${rows || "| — | No jobs recorded | — | — |"}

## Artifacts

${summary.placeholder ? "_No artifacts yet._" : `- [summary.json](./raw/summary.json)
${vitest?.artifact ? "- [vitest.json](./raw/vitest.json)" : ""}
${fs.existsSync(path.join(RESULTS_DIR, "artifacts", "violations.json")) ? "- [violations.json](./raw/violations.json)" : ""}
${fs.existsSync(path.join(RESULTS_DIR, "artifacts", "sansio-canary.json")) ? "- [sansio-canary.json](./raw/sansio-canary.json)" : ""}
${dep?.present ? "- [dependency-graph.json](./raw/dependency-graph.json)" : ""}`}
`;
}

function renderJob(job) {
  const logPath = path.join(RESULTS_DIR, job.logFile ?? `logs/${job.id}.log`);
  let log = "";
  if (fs.existsSync(logPath)) {
    log = fs.readFileSync(logPath, "utf8");
  }

  return `# ${job.title}

**Status:** ${statusBadge(job.ok)}  
**Exit code:** ${job.exitCode}  
**Command:** \`${escapeMd(job.command)}\`  
**Started:** ${escapeMd(job.startedAt)}  
**Finished:** ${escapeMd(job.finishedAt)}  
**Duration:** ${formatDuration(job.durationMs)}

[← All results](./)

## Log

\`\`\`text
${truncate(log)}
\`\`\`
`;
}

function copyRawArtifacts() {
  const rawDir = path.join(SITE_SRC, "results", "raw");
  ensureDir(rawDir);

  const summarySrc = path.join(RESULTS_DIR, "summary.json");
  if (fs.existsSync(summarySrc)) {
    fs.copyFileSync(summarySrc, path.join(rawDir, "summary.json"));
  }

  const artifactsDir = path.join(RESULTS_DIR, "artifacts");
  if (fs.existsSync(artifactsDir)) {
    for (const name of fs.readdirSync(artifactsDir)) {
      fs.copyFileSync(path.join(artifactsDir, name), path.join(rawDir, name));
    }
  }

  // Also copy logs for download
  const logsDir = path.join(RESULTS_DIR, "logs");
  const rawLogs = path.join(rawDir, "logs");
  if (fs.existsSync(logsDir)) {
    ensureDir(rawLogs);
    for (const name of fs.readdirSync(logsDir)) {
      fs.copyFileSync(path.join(logsDir, name), path.join(rawLogs, name));
    }
  }
}

function main() {
  const summary = loadSummary();
  const outDir = path.join(SITE_SRC, "results");
  ensureDir(outDir);

  fs.writeFileSync(path.join(outDir, "index.md"), renderIndex(summary));

  for (const job of summary.jobs ?? []) {
    fs.writeFileSync(path.join(outDir, `${job.id}.md`), renderJob(job));
  }

  copyRawArtifacts();
  console.log(`Rendered results into ${outDir}`);
}

main();
