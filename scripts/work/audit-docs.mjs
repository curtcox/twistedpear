import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, trackedMarkdownPaths } from "../doc-audit/repo-root.mjs";
import { auditStaleness } from "../doc-audit/staleness.mjs";
import { parseTpDoc } from "../doc-audit/tp-doc.mjs";
import { daysSince, lastCommitDate } from "./audit-lib.mjs";

/** A plan nobody has touched in this long has been executed, or abandoned. */
export const PLAN_IDLE_DAYS = 180;
/** How far a live counterpart may move past a plan's audit before it is suspect. */
export const PLAN_OVERTAKEN_DAYS = 30;

/**
 * Drift between what the documents claim and what the tree does. `doc-audit`
 * already fails the build on the hard cases (missing lifecycle, a historical
 * document outside archive/, a one-sided counterpart); what is left is the
 * class of drift that is only ever a judgement — plans that have quietly been
 * implemented, and live documents whose audit date has fallen behind their own
 * edits but not yet far enough to fail.
 * @param {string} root
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
export function auditDocs(root = repoRoot(), now = Date.now()) {
  const docs = readDocs(root);
  return [
    ...staleAudits(root),
    ...idlePlans(docs, root, now),
    ...overtakenPlans(docs, root),
  ];
}

/**
 * @param {string} root
 * @returns {{ path: string; meta: { lifecycle: string; audited: string; counterpart?: string } }[]}
 */
function readDocs(root) {
  /** @type {{ path: string; meta: any }[]} */
  const docs = [];
  for (const rel of trackedMarkdownPaths(root)) {
    if (rel.startsWith("archive/")) continue;
    const meta = parseTpDoc(readFileSync(join(root, rel), "utf8"));
    if (meta) docs.push({ path: rel, meta });
  }
  return docs;
}

/**
 * @param {string} root
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function staleAudits(root) {
  return auditStaleness(root).map((finding) => ({
    family: "docs",
    check: "audit-date-behind-edits",
    severity: finding.level === "fail" ? "high" : "medium",
    where: finding.path,
    summary: `${finding.path}: ${finding.message}`,
    ask: `Re-read ${finding.path} against the code it describes, then move its \`audited:\` date — or fix what has drifted.`,
  }));
}

/**
 * @param {{ path: string; meta: any }[]} docs
 * @param {string} root
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function idlePlans(docs, root, now) {
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const { path, meta } of docs) {
    if (meta.lifecycle !== "planned") continue;
    const changed = lastCommitDate(path, root);
    const idle = daysSince(changed, now);
    if (idle < PLAN_IDLE_DAYS) continue;
    findings.push({
      family: "docs",
      check: "idle-plan",
      severity: "low",
      where: path,
      summary: `${path} is a plan with no edit in ${idle} days`,
      ask: `Has ${path} been executed or dropped? Move what shipped into its live counterpart and archive the rest.`,
    });
  }
  return findings;
}

/**
 * A live document that has moved on since its plan was last audited usually
 * means part of the plan already shipped — which AGENTS.md says must be deleted
 * from the plan rather than left as a "status" section.
 * @param {{ path: string; meta: any }[]} docs
 * @param {string} root
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function overtakenPlans(docs, root) {
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const { path, meta } of docs) {
    if (meta.lifecycle !== "planned" || !meta.counterpart) continue;
    const live = lastCommitDate(meta.counterpart, root);
    if (!live) continue;
    const lead = daysSince(meta.audited) - daysSince(live);
    if (lead < PLAN_OVERTAKEN_DAYS) continue;
    findings.push({
      family: "docs",
      check: "overtaken-plan",
      severity: "medium",
      where: path,
      summary: `${path} was audited ${meta.audited}; its live counterpart ${meta.counterpart} changed ${live}, ${lead} days later`,
      ask: `Is any of ${path} already implemented? Delete what shipped from the plan and describe it in ${meta.counterpart}.`,
    });
  }
  return findings;
}
