#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { gates } from "./registry.mjs";

const root = process.argv[2] ?? "gate-artifacts";
const output = process.argv[3] ?? "static-analysis-summary.json";
const markdownOutput = process.argv[4] ?? "static-analysis-summary.md";
const discovered = new Map();
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
        const artifact = JSON.parse(fs.readFileSync(target, "utf8"));
        discovered.set(artifact.id, artifact);
      } catch {
        /* keep aggregating */
      }
    }
  }
}
walk(root);
const artifacts = gates
  .filter((gate) => gate.tier === "pr")
  .map(
    (gate) =>
      discovered.get(gate.id) ?? {
        id: gate.id,
        title: gate.title,
        command: gate.command.join(" "),
        requires: gate.requires,
        startedAt: null,
        finishedAt: null,
        exitCode: null,
        ok: false,
        host: null,
        error: "Gate did not produce a result artifact.",
      },
  );
const summary = {
  version: 1,
  generatedAt: new Date().toISOString(),
  ok: artifacts.every((item) => item.ok),
  gates: artifacts,
};
fs.writeFileSync(output, `${JSON.stringify(summary, null, 2)}\n`);
/**
 * The census reports *what shrank*, and a bare red X does not carry that. A
 * gate whose failure is only a cross gets baselined away; one that names the
 * 300 tests that vanished in the review thread gets asked about.
 */
function censusSection() {
  let census;
  try {
    census = JSON.parse(
      fs.readFileSync(path.join(root, "gate-census", "census.json"), "utf8"),
    );
  } catch {
    return [];
  }
  const findings = census.delta?.findings ?? [];
  if (findings.length === 0) return [];
  return [
    "",
    "### Quality surface shrank",
    "",
    ...findings.map((finding) => `- ${finding}`),
    "",
    'Restore what went missing, or record it: `npm run census:baseline -- --reason="…"`.',
  ];
}

const lines = [
  "<!-- twistedpear-static-analysis -->",
  "## Static analysis",
  "",
  "| Gate | Result |",
  "|---|---:|",
  ...artifacts.map(
    (item) =>
      `| ${item.title} | ${item.ok ? "✅ pass" : item.error ? "❌ missing result" : "❌ fail"} |`,
  ),
  ...censusSection(),
  "",
  `[Workflow run](${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID})`,
];
fs.writeFileSync(markdownOutput, `${lines.join("\n")}\n`);
console.log(`Aggregated ${artifacts.length} gate artifacts.`);
