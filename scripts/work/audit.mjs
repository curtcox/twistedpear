#!/usr/bin/env node
import { createHash } from "node:crypto";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { readJson, writeText } from "./lib.mjs";
import { appendEvent } from "./journal.mjs";
import { listFlag, parseFlags } from "./render.mjs";
import { SEVERITIES, compareFindings, headCommit } from "./audit-lib.mjs";
import { auditDebt } from "./audit-clock.mjs";
import { auditGates } from "./audit-gates.mjs";
import { auditRegistry } from "./audit-registry.mjs";
import { auditOutputs, ratchetTotals } from "./audit-outputs.mjs";
import { auditClosedWork } from "./audit-closed.mjs";
import { auditDocs } from "./audit-docs.mjs";

export const REPORT_FILE = "work/audit-report.json";

const USAGE = `
npm run work:audit [-- options]

  --family=gates,registry,outputs,closed,docs   limit which families run
  --severity=high|medium|low              minimum severity to report (default low)
  --json                                  print the report instead of the summary
  --write                                 write ${REPORT_FILE}
  --record                                write the report and journal the audit

Reads the work registry, the generated analysis outputs, the closes recorded in
the journal, and the document lifecycle headers, and reports what looks worth
fixing. It changes no register row and creates no work item: findings are
proposals, and accepting one means running work:add, work:retype, or work:done.
`;

/**
 * @param {{ family?: string[]; severity?: string }} options
 * @param {string} root
 * @param {number} now
 * @returns {object}
 */
export function runAudit(options = {}, root = repoRoot(), now = Date.now()) {
  const previous = readJson(join(root, REPORT_FILE), null);
  const families = options.family?.length ? new Set(options.family) : null;
  /** @param {string} name */
  const wanted = (name) => !families || families.has(name);

  const findings = [
    ...(wanted("gates") ? auditGates(root, now) : []),
    ...(wanted("registry") ? auditRegistry(root, now) : []),
    ...(wanted("outputs") ? auditOutputs(root, { previous }, now) : []),
    ...(wanted("closed") ? auditClosedWork(root, now) : []),
    ...(wanted("docs") ? auditDocs(root, now) : []),
  ]
    .filter((finding) => atLeast(finding.severity, options.severity))
    .sort(compareFindings);

  /** @type {Record<string, number>} */
  const counts = { total: findings.length };
  for (const severity of SEVERITIES) {
    counts[severity] = findings.filter(
      (finding) => finding.severity === severity,
    ).length;
  }

  return {
    version: 1,
    generatedAt: new Date(now).toISOString(),
    commit: headCommit(root),
    counts,
    // Carried forward so the next run can tell a ratchet that shrank from one
    // that was quietly re-baselined larger.
    ratchets: ratchetTotals(root),
    findings,
  };
}

/**
 * @param {string} severity
 * @param {string | undefined} floor
 * @returns {boolean}
 */
function atLeast(severity, floor) {
  if (!floor) return true;
  const limit = SEVERITIES.indexOf(floor);
  if (limit === -1) return true;
  return SEVERITIES.indexOf(severity) <= limit;
}

/**
 * @param {object} report
 * @param {import("./audit-clock.mjs").AuditDebt} debt
 * @returns {string[]}
 */
export function summarize(report, debt) {
  const { counts } = report;
  const lines = [
    `work audit — ${report.generatedAt.slice(0, 10)} at ${report.commit.slice(0, 8) || "unknown commit"}`,
    `${counts.total} finding(s): ${counts.high} high, ${counts.medium} medium, ${counts.low} low`,
    debt.last
      ? `last recorded audit ${debt.last.slice(0, 10)} (${debt.days} day(s), ${debt.closes} close(s) ago)`
      : "no previous audit recorded",
    "",
  ];

  for (const finding of report.findings) {
    lines.push(
      `${finding.severity.padEnd(7)}${finding.family}/${finding.check}  ${finding.where}`,
    );
    lines.push(`        ${finding.summary}`);
    if (finding.ask) lines.push(`  ask   ${finding.ask}`);
    if (finding.proposal) lines.push(`  add   ${addCommand(finding.proposal)}`);
    lines.push("");
  }

  const asks = report.findings.filter((finding) => finding.ask).length;
  lines.push(
    counts.total === 0
      ? "Nothing to propose."
      : `${asks} finding(s) need a judgement a script cannot make. Work through them, then record the outcome with work:add, work:retype, or work:done.`,
  );
  return lines;
}

/**
 * @param {{ id: string; type: string; title: string; verify: string }} proposal
 * @returns {string}
 */
function addCommand(proposal) {
  return `npm run work:add -- --id=${proposal.id} --type=${proposal.type} --title="${proposal.title}" --verify="${proposal.verify}"`;
}

/**
 * Recording is what makes the next `work:next` stop nagging, so it is a
 * deliberate flag: an audit nobody read should not reset the clock.
 * @param {object} report
 * @param {string} root
 * @returns {string}
 */
export function recordAudit(report, root = repoRoot()) {
  const text = `${JSON.stringify(report, null, 2)}\n`;
  writeText(join(root, REPORT_FILE), text);
  return `sha256:${createHash("sha256").update(text).digest("hex")}`;
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    console.log(USAGE.trim());
    return;
  }

  const root = repoRoot();
  const debt = auditDebt(root);
  const report = runAudit(
    {
      family: listFlag(flags.family),
      severity: typeof flags.severity === "string" ? flags.severity : undefined,
    },
    root,
  );

  if (flags.json) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    for (const line of summarize(report, debt)) console.log(line);
  }

  if (!flags.write && !flags.record) {
    if (!flags.json) {
      console.log(
        `\npass --record to write ${REPORT_FILE} and journal the run`,
      );
    }
    return;
  }

  const digest = recordAudit(report, root);
  if (flags.record) {
    appendEvent(
      {
        action: "audit",
        id: "-",
        findings: report.counts.total,
        high: report.counts.high,
        report: REPORT_FILE,
        digest,
      },
      root,
    );
  }
  if (!flags.json) {
    console.log(
      `\nwrote ${REPORT_FILE}${flags.record ? " and journaled the audit" : " (not journaled — pass --record)"}`,
    );
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
