#!/usr/bin/env node
import path from "node:path";
import { REPORTS, readJson } from "./lib.mjs";

/**
 * The manifest, as a Markdown table.
 *
 * For the GitHub step summary and for reading a run at a glance. Everything
 * here is already in `reports/manifest.json`; this exists so that checking what
 * a run measured does not require downloading the artifact.
 */
const manifest = readJson(path.join(REPORTS, "manifest.json"), null);
if (manifest === null) {
  process.stdout.write(
    "No `reports/manifest.json` — the survey did not run.\n",
  );
  process.exit(0);
}

const lines = [];
lines.push("## Survey");
lines.push("");
lines.push(
  `Commit \`${(manifest.commit ?? "unknown").slice(0, 8)}\` on \`${manifest.branch ?? "?"}\` — ` +
    `${manifest.tools.filter((tool) => tool.status === "ok").length}/${manifest.tools.length} tools ok ` +
    `in ${(manifest.durationMs / 1000).toFixed(0)}s. Nothing here gates a merge.`,
);
lines.push("");
lines.push("| Tool | Version | Findings | Report | Question |");
lines.push("| --- | --- | ---: | --- | --- |");
for (const tool of manifest.tools) {
  const findings =
    tool.status === "ok" ? String(tool.findings ?? "—") : "**failed**";
  lines.push(
    `| \`${tool.id}\` | ${tool.version ?? "—"} | ${findings} | \`${tool.output}\` | ${tool.question ?? ""} |`,
  );
}

const failed = manifest.tools.filter((tool) => tool.status === "error");
if (failed.length > 0) {
  lines.push("");
  lines.push("### Tools that did not complete");
  lines.push("");
  for (const tool of failed)
    lines.push(`- \`${tool.id}\`: ${tool.error.split("\n")[0]}`);
}

lines.push("");
process.stdout.write(`${lines.join("\n")}\n`);
