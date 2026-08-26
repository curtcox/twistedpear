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

function renderMetric(metric) {
  const suffix = metric.unit === "%" ? "%" : metric.unit ? ` ${metric.unit}` : "";
  return `${escapeMd(metric.value)}${suffix}`;
}

function escapeMd(s) {
  return String(s ?? "").replaceAll("\\", "\\\\").replaceAll("|", "\\|");
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
    summary.branchSha && summary.branchSha !== "unknown"
      ? `[${summary.branchSha.slice(0, 7)}](${REPO_URL}/commit/${summary.branchSha})`
      : summary.commit && summary.commit !== "unknown"
        ? `[${summary.commit.slice(0, 7)}](${REPO_URL}/commit/${summary.commit})`
      : "unknown";
  const branchLabel = summary.branch ?? summary.ref ?? "unknown";

  const rows = (summary.jobs ?? [])
    .map((job, index) => ({ job, index }))
    .sort((a, b) => Number(a.job.ok) - Number(b.job.ok) || a.index - b.index)
    .map(
      ({ job: j }) =>
        `| ${statusBadge(j.ok)} | [${escapeMd(j.title)}](./${j.id}) | ${(j.metrics ?? []).slice(2).map((item) => `${escapeMd(item.label)}: ${renderMetric(item)}`).join(" · ") || "—"} | \`${escapeMd(j.command)}\` | ${formatDuration(j.durationMs)} |`
    )
    .join("\n");

  const vitest = summary.vitest;
  const vitestLine = vitest
    ? `Vitest: **${vitest.numPassedTests ?? "?"}** passed / **${vitest.numFailedTests ?? "?"}** failed / **${vitest.numTotalTests ?? "?"}** total.`
    : "Vitest JSON summary not available.";

  const dep = summary.dependencyGraph;
  const depLine = dep?.present
    ? `Dependency graph: **${dep.moduleCount ?? "?"}** modules — [download JSON](./raw/artifacts/dependency-graph.json).`
    : "Dependency graph not generated.";

  const sizes = summary.fileSizes;
  const sizeLine = sizes?.present && sizes.totals
    ? `File sizes: **${sizes.totals.classified}** source files — **${sizes.totals.warn}** over the warn threshold, **${sizes.totals.danger}** over danger, **${(sizes.totals.excessLines ?? 0).toLocaleString("en-US")}** excess lines ([details](./file-sizes)).`
    : "File-size classification not generated.";

  return `# Quality results

${summary.placeholder ? "> Reports have not been generated yet. Run `npm run site:reports`.\n" : ""}
**Overall:** ${statusBadge(summary.ok)}  
**Generated:** ${escapeMd(summary.generatedAt)}  
**Branch:** ${escapeMd(branchLabel)}  
**Branch SHA:** ${commitLink}  
${summary.runUrl ? `**CI run:** [actions](${summary.runUrl})  \n` : ""}
${summary.failed?.length ? `**Failed jobs:** ${summary.failed.map((id) => `\`${id}\``).join(", ")}  \n` : ""}

${vitestLine}

${depLine}

${sizeLine}

What CI itself costs to produce this page — per workflow, per job, per step, and
per unit of CPU and memory — is measured separately and published at
[CI cost](./ci).

## Checks

| Status | Check | Metrics | Command | Duration |
|---|---|---|---|---|
${rows || "| — | No jobs recorded | — | — | — |"}

## Artifacts

${summary.placeholder ? "_No artifacts yet._" : `- [summary.json](./raw/summary.json)
${vitest?.artifact ? "- [vitest.json](./raw/artifacts/vitest.json)" : ""}
${fs.existsSync(path.join(RESULTS_DIR, "artifacts", "violations.json")) ? "- [violations.json](./raw/artifacts/violations.json)" : ""}
${fs.existsSync(path.join(RESULTS_DIR, "artifacts", "sansio-canary.json")) ? "- [sansio-canary.json](./raw/artifacts/sansio-canary.json)" : ""}
${dep?.present ? "- [dependency-graph.json](./raw/artifacts/dependency-graph.json)" : ""}
${sizes?.present ? "- [file-sizes.json](./raw/artifacts/file-sizes.json)" : ""}`}
`;
}

function renderJob(job) {
  const logPath = path.join(RESULTS_DIR, job.logFile ?? `logs/${job.id}.log`);
  let log = "";
  if (fs.existsSync(logPath)) {
    log = fs.readFileSync(logPath, "utf8");
  }

  const metricRows = (job.metrics ?? [])
    .map((item) => `| ${escapeMd(item.label)} | ${renderMetric(item)} |`)
    .join("\n");
  const artifactRows = (job.artifacts ?? [])
    .map((artifact) => `- [\`${escapeMd(artifact.replace(/^artifacts\//, ""))}\`](./raw/${artifact})`)
    .join("\n");

  return `# ${job.title}

**Status:** ${statusBadge(job.ok)}  
**Exit code:** ${job.exitCode}  
**Command:** \`${escapeMd(job.command)}\`  
**Started:** ${escapeMd(job.startedAt)}  
**Finished:** ${escapeMd(job.finishedAt)}  
**Duration:** ${formatDuration(job.durationMs)}
${job.imported ? "**Evidence:** imported from the platform/nightly CI job  \n" : ""}${job.skipped ? `**Skipped:** ${escapeMd(job.skipReason ?? "not selected")}  \n` : ""}${job.importError ? `**Import error:** ${escapeMd(job.importError)}  \n` : ""}

[← All results](./)

## Metrics

| Metric | Value |
|---|---:|
${metricRows || "| Result | unavailable |"}

## Artifacts

${artifactRows || "_No structured artifacts were produced._"}

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

  const excessTotal = sizes.totals.excessLines ?? 0;
  const areaRows = (sizes.byArea ?? [])
    .map((a) => {
      const share = excessTotal > 0 ? a.excessLines / excessTotal : 0;
      const bar = "█".repeat(Math.max(1, Math.round(share * 20)));
      return `| \`${escapeMd(a.area)}\` | ${a.excessLines.toLocaleString("en-US")} | ${bar} ${(share * 100).toFixed(0)}% |`;
    })
    .join("\n");

  const worstRows = (sizes.worst ?? [])
    .map(
      (f) =>
        `| \`${escapeMd(f.file)}\` | ${escapeMd(f.rule)} | ${f.lines} | ${f.excessLines ?? "—"} | ${escapeMd((f.reasons ?? []).join("; "))} |`
    )
    .join("\n");

  const t = sizes.totals;
  const section = `
## Classification

**${t.classified}** classified source files (${t.exempt} exempt: generated bundles, vendored code, and archives).
**${t.ok}** within budget · **${t.warn}** over warn · **${t.danger}** over danger · **${t.totalLines.toLocaleString("en-US")}** total lines · **${excessTotal.toLocaleString("en-US")}** excess lines (beyond danger).

Thresholds are per file type and live in [size-rules.json](./raw/artifacts/size-rules.json). Files already
over danger when the gate was introduced are grandfathered in
[size-ratchet.json](./raw/artifacts/size-ratchet.json) and may only shrink. The ratchet also carries a
\`maxExcessLines\` ceiling so the aggregate burndown cannot reverse.

| Type | Files | Median | p90 | Max | Warn > | Danger > | Warn | Danger |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
${ruleRows || "| — | — | — | — | — | — | — | — | — |"}

## Excess lines by area

Excess lines are \`lines − dangerLines\` for every file currently over danger. This is the
burndown metric; \`npm run sizes:baseline\` lowers the committed ceiling after each cut.

| Area | Excess lines | Share |
|---|---:|---|
${areaRows || "| — | — | None |"}

## Largest files over the danger threshold

| File | Type | Lines | Excess | Reasons |
|---|---|---:|---:|---|
${worstRows || "| — | — | — | — | None |"}

Full per-file data: [file-sizes.json](./raw/artifacts/file-sizes.json).
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
    copyTree(artifactsDir, path.join(rawDir, "artifacts"));
  }

  // Also copy logs for download
  const logsDir = path.join(RESULTS_DIR, "logs");
  const rawLogs = path.join(rawDir, "logs");
  const rawArtifactLogs = path.join(rawDir, "artifacts", "logs");
  if (fs.existsSync(logsDir)) {
    ensureDir(rawLogs);
    ensureDir(rawArtifactLogs);
    for (const name of fs.readdirSync(logsDir)) {
      const from = path.join(logsDir, name);
      fs.copyFileSync(from, path.join(rawLogs, name));
      fs.copyFileSync(from, path.join(rawArtifactLogs, name));
    }
  }
}

function copyTree(source, destination) {
  ensureDir(destination);
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else fs.copyFileSync(from, to);
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
