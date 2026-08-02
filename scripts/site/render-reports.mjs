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

  const sizes = summary.fileSizes;
  const sizeLine = sizes?.present && sizes.totals
    ? `File sizes: **${sizes.totals.classified}** source files — **${sizes.totals.warn}** over the warn threshold, **${sizes.totals.danger}** over danger ([details](./file-sizes)).`
    : "File-size classification not generated.";

  return `# Quality results

${summary.placeholder ? "> Reports have not been generated yet. Run `npm run site:reports`.\n" : ""}
**Overall:** ${statusBadge(summary.ok)}  
**Generated:** ${escapeMd(summary.generatedAt)}  
**Commit:** ${commitLink}  
${summary.runUrl ? `**CI run:** [actions](${summary.runUrl})  \n` : ""}
${summary.failed?.length ? `**Failed jobs:** ${summary.failed.map((id) => `\`${id}\``).join(", ")}  \n` : ""}

${vitestLine}

${depLine}

${sizeLine}

## Checks

| Status | Check | Command | Duration |
|---|---|---|---|
${rows || "| — | No jobs recorded | — | — |"}

## Artifacts

${summary.placeholder ? "_No artifacts yet._" : `- [summary.json](./raw/summary.json)
${vitest?.artifact ? "- [vitest.json](./raw/vitest.json)" : ""}
${fs.existsSync(path.join(RESULTS_DIR, "artifacts", "violations.json")) ? "- [violations.json](./raw/violations.json)" : ""}
${fs.existsSync(path.join(RESULTS_DIR, "artifacts", "sansio-canary.json")) ? "- [sansio-canary.json](./raw/sansio-canary.json)" : ""}
${dep?.present ? "- [dependency-graph.json](./raw/dependency-graph.json)" : ""}
${sizes?.present ? "- [file-sizes.json](./raw/file-sizes.json)" : ""}`}
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

/**
 * The file-size job's detail page leads with the classification tables; the raw
 * log follows via the shared job renderer.
 *
 * @param {any} job
 * @param {any} sizes summary.fileSizes
 */
function renderFileSizes(job, sizes) {
  const base = renderJob(job);
  if (!sizes?.present || !sizes.totals) return base;

  const ruleRows = (sizes.byRule ?? [])
    .map(
      (r) =>
        `| ${escapeMd(r.title)} | ${r.count} | ${r.medianLines} | ${r.p90Lines} | ${r.maxLines} | ${r.warnLines ?? "—"} | ${r.dangerLines ?? "—"} | ${r.warn} | ${r.danger} |`
    )
    .join("\n");

  const worstRows = (sizes.worst ?? [])
    .map((f) => `| \`${escapeMd(f.file)}\` | ${escapeMd(f.rule)} | ${f.lines} | ${escapeMd((f.reasons ?? []).join("; "))} |`)
    .join("\n");

  const t = sizes.totals;
  const section = `
## Classification

**${t.classified}** classified source files (${t.exempt} exempt: generated bundles, vendored code, and archives).
**${t.ok}** within budget · **${t.warn}** over warn · **${t.danger}** over danger · **${t.totalLines.toLocaleString("en-US")}** total lines.

Thresholds are per file type and live in [size-rules.json](./raw/size-rules.json). Files already
over danger when the gate was introduced are grandfathered in
[size-ratchet.json](./raw/size-ratchet.json) and may only shrink.

| Type | Files | Median | p90 | Max | Warn > | Danger > | Warn | Danger |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${ruleRows || "| — | — | — | — | — | — | — | — | — |"}

## Largest files over the danger threshold

| File | Type | Lines | Reasons |
|---|---|---:|---|
${worstRows || "| — | — | — | None |"}

Full per-file data: [file-sizes.json](./raw/file-sizes.json).
`;

  return base.replace("\n## Log\n", `${section}\n## Log\n`);
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
    const body = job.id === "file-sizes" ? renderFileSizes(job, summary.fileSizes) : renderJob(job);
    fs.writeFileSync(path.join(outDir, `${job.id}.md`), body);
  }

  copyRawArtifacts();
  console.log(`Rendered results into ${outDir}`);
}

main();
