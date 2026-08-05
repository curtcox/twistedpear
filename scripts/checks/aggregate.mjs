#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ?? "gate-artifacts";
const output = process.argv[3] ?? "static-analysis-summary.json";
const artifacts = [];
function walk(directory) {
  if (!fs.existsSync(directory)) return;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (
      entry.name.endsWith(".json") &&
      target.includes(`${path.sep}checks${path.sep}`)
    ) {
      try {
        artifacts.push(JSON.parse(fs.readFileSync(target, "utf8")));
      } catch {
        /* keep aggregating */
      }
    }
  }
}
walk(root);
artifacts.sort((a, b) => a.id.localeCompare(b.id));
const summary = {
  version: 1,
  generatedAt: new Date().toISOString(),
  ok: artifacts.every((item) => item.ok),
  gates: artifacts,
};
fs.writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`);
const lines = [
  "<!-- twistedpear-static-analysis -->",
  "## Static analysis",
  "",
  "| Gate | Result |",
  "|---|---:|",
  ...artifacts.map(
    (item) => `| ${item.title} | ${item.ok ? "✅ pass" : "❌ fail"} |`,
  ),
  "",
  `[Workflow run](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`,
];
fs.writeFileSync("static-analysis-summary.md", `${lines.join("\n")}\n`);
console.log(`Aggregated ${artifacts.length} gate artifacts.`);
