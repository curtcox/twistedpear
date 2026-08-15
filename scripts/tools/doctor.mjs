#!/usr/bin/env node
import { installOrder, survey } from "./requirements.mjs";

const USAGE = `
npm run tools:doctor [-- --tier=pr|nightly] [--json]

Reports which external tools the gates need, which are present, whether each is
the version pinned in tool-versions.json, and what each missing one costs. Exits
non-zero when a gate cannot run here, because a gate that cannot run is not a
gate that passed — see the green-gate rule in RELEASE-PLAN.md §3. A tool that is
present at the wrong version exits non-zero too: it answers a different question
than CI asks.
`;

/** @param {import("./requirements.mjs").ToolReport} report */
const isDrifted = (report) => report.present && report.matches === false;

/**
 * The detail lines under a tool that is not simply fine.
 * @param {import("./requirements.mjs").ToolReport} report
 * @param {string} indent
 * @returns {string[]}
 */
function detailLines(report, indent) {
  const [install] = report.install;
  if (isDrifted(report)) {
    return [
      `${indent}pinned ${report.pinned}, installed ${report.installed ?? "unknown"}`,
      `${indent}affects: ${report.gates.join(", ")}`,
      ...(install ? [`${indent}install: ${install.join(" ")}`] : []),
    ];
  }
  if (report.present) return [];
  const recipe = install
    ? `install: ${install.join(" ")}`
    : `no recipe for ${process.platform}${report.manual ? ` — ${report.manual}` : ""}`;
  return [`${indent}blocks: ${report.gates.join(", ")}`, `${indent}${recipe}`];
}

/**
 * The closing tally.
 * @param {import("./requirements.mjs").ToolReport[]} reports
 * @returns {string[]}
 */
function summaryLines(reports) {
  const missing = reports.filter((report) => !report.present);
  const drifted = reports.filter(isDrifted);
  const lines = [
    "",
    missing.length === 0
      ? `All ${reports.length} required tools are present.`
      : `${missing.length} of ${reports.length} required tools missing: ${missing
          .map((report) => report.token)
          .join(", ")}`,
  ];
  if (drifted.length > 0) {
    // Named separately from "missing" because the remedy is different and the
    // symptom is worse: a drifted tool runs and reports findings that CI will
    // not, which looks like a source problem rather than a toolchain one.
    lines.push(
      `${drifted.length} off the pinned version: ${drifted
        .map(
          (report) =>
            `${report.token} ${report.installed ?? "?"}≠${report.pinned}`,
        )
        .join(", ")}`,
    );
  }
  if (missing.length > 0) {
    const installable = installOrder(reports).filter(
      (report) => report.install.length > 0,
    );
    lines.push(
      installable.length > 0
        ? `Install them with: npm run tools:install`
        : `None can be installed automatically on this platform.`,
    );
  }
  return lines;
}

/**
 * @param {import("./requirements.mjs").ToolReport[]} reports
 * @returns {string[]}
 */
export function render(reports) {
  const width = reports.reduce(
    (max, report) => Math.max(max, report.token.length),
    4,
  );
  const indent = `        ${" ".repeat(width)}  `;
  const lines = [];
  for (const report of reports) {
    const state = !report.present
      ? "MISSING"
      : isDrifted(report)
        ? "VERSION"
        : "ok     ";
    lines.push(`${state} ${report.token.padEnd(width)}  ${report.why}`);
    lines.push(...detailLines(report, indent));
  }
  return [...lines, ...summaryLines(reports)];
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(USAGE.trim());
    return;
  }
  const tier =
    argv.find((arg) => arg.startsWith("--tier="))?.split("=")[1] ?? "pr";
  const reports = survey({ tier });
  if (argv.includes("--json")) {
    console.log(JSON.stringify(reports, null, 2));
  } else {
    for (const line of render(reports)) console.log(line);
  }
  if (reports.some((report) => !report.present || report.matches === false)) {
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
