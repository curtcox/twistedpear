import { existsSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { readJson } from "./lib.mjs";
import { proposals } from "./import.mjs";
import { daysSince, lastCommitDate } from "./audit-lib.mjs";

/**
 * Ratchets whose `entries` array is a literal list of baselined violations, so
 * its length is a debt number that is supposed to fall. Coverage, mutation, and
 * sansio ratchets carry scores and allowlists instead and are not counted here.
 */
export const RATCHET_FILES = [
  "lint-ratchet.json",
  "typed-lint-ratchet.json",
  "complexity-ratchet.json",
  "size-ratchet.json",
  "format-ratchet.json",
  "license-ratchet.json",
];

/** Generated analysis outputs the audit reads. Stale inputs mean stale findings. */
export const ANALYSIS_OUTPUTS = [
  "lint.json",
  "typed-lint.json",
  "complexity.json",
  "structure.json",
  "file-sizes.json",
  "audit.json",
];

/** Source trees whose churn makes a generated report out of date. */
const SOURCE_PATHS = ["packages", "apps"];

/** A report this far behind the source it describes is not worth auditing. */
export const REPORT_LAG_DAYS = 21;
/** Warn before an advisory exception expires, not after the gate has failed. */
export const EXPIRY_WARNING_DAYS = 30;
/** Ignore long-tail rules; a rule with fewer entries than this is not a project. */
export const IMPORT_MIN_ENTRIES = 25;

/**
 * @param {string} root
 * @returns {Record<string, number>}
 */
export function ratchetTotals(root = repoRoot()) {
  /** @type {Record<string, number>} */
  const totals = {};
  for (const file of RATCHET_FILES) {
    const path = join(root, file);
    if (!existsSync(path)) continue;
    const entries = readJson(path, {}).entries;
    if (Array.isArray(entries)) totals[file] = entries.length;
  }
  return totals;
}

/**
 * The generated side: debt that grew instead of shrinking, debt nobody has
 * turned into work, security exceptions about to lapse, and reports that no
 * longer describe the tree.
 * @param {string} root
 * @param {{ previous?: { ratchets?: Record<string, number>; generatedAt?: string } | null }} context
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
export function auditOutputs(
  root = repoRoot(),
  context = {},
  now = Date.now(),
) {
  return [
    ...ratchetGrowth(root, context.previous ?? null),
    ...untrackedDebt(root),
    ...expiringExceptions(root, now),
    ...staleReports(root),
  ];
}

/**
 * A ratchet may only shrink, so a larger baseline means somebody re-recorded it
 * — legitimate for a bulk rename, a regression otherwise. Only the audit sees
 * this, because each individual re-baseline passes its own check by definition.
 * @param {string} root
 * @param {{ ratchets?: Record<string, number> } | null} previous
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function ratchetGrowth(root, previous) {
  if (!previous?.ratchets) return [];
  const totals = ratchetTotals(root);

  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const [file, count] of Object.entries(totals).sort()) {
    const before = previous.ratchets[file];
    if (typeof before !== "number" || count <= before) continue;
    findings.push({
      family: "outputs",
      check: "ratchet-growth",
      severity: "high",
      where: file,
      summary: `${file} grew from ${before} to ${count} baselined entries since the last audit`,
      ask: `Which change re-recorded ${file}, and was the new debt deliberate? Track it as quality work or revert the baseline.`,
    });
  }
  return findings;
}

/**
 * @param {string} root
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function untrackedDebt(root) {
  const candidates = proposals(
    { top: 3, min: IMPORT_MIN_ENTRIES },
    root,
  ).filter((entry) => !entry.exists);

  return candidates.map((entry) => ({
    family: "outputs",
    check: "untracked-debt",
    severity: "medium",
    where: `${entry.kind}-ratchet ${entry.rule}`,
    summary: `${entry.count} baselined ${entry.rule} entries across ${entry.files} file(s) with no tracked item`,
    ask: `Is ${entry.rule} worth a quality item now, or is this debt accepted? Create it with npm run work:import -- --kind=${entry.kind}`,
    proposal: {
      id: entry.id,
      type: "quality",
      title: entry.title,
      verify: entry.verify,
    },
  }));
}

/**
 * @param {string} root
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function expiringExceptions(root, now) {
  const policy = readJson(join(root, "audit-allowlist.json"), { entries: [] });
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];

  for (const entry of policy.entries ?? []) {
    if (!entry?.id || !entry.expires) continue;
    const remaining = -daysSince(entry.expires, now);
    if (remaining > EXPIRY_WARNING_DAYS) continue;
    findings.push({
      family: "outputs",
      check: "advisory-expiry",
      severity: "high",
      where: `audit-allowlist.json ${entry.id}`,
      summary:
        remaining < 0
          ? `advisory exception ${entry.id} expired ${-remaining} day(s) ago`
          : `advisory exception ${entry.id} expires in ${remaining} day(s) (${entry.expires})`,
      ask: `Can ${entry.id} be upgraded or dropped before ${entry.expires}? Otherwise the security gate starts failing.`,
      proposal: {
        id: `SEC-${entry.id.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`,
        type: "bug",
        title: `Resolve the ${entry.id} advisory before the ${entry.expires} exception expires`,
        verify: "npm run audit:nightly",
      },
    });
  }
  return findings;
}

/**
 * @param {string} root
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function staleReports(root) {
  const source = SOURCE_PATHS.map((path) => lastCommitDate(path, root))
    .filter(Boolean)
    .sort()
    .pop();
  if (!source) return [];

  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const file of ANALYSIS_OUTPUTS) {
    if (!existsSync(join(root, file))) continue;
    const recorded = lastCommitDate(file, root);
    if (!recorded) continue;
    const lag = daysSince(recorded) - daysSince(source);
    if (lag < REPORT_LAG_DAYS) continue;
    findings.push({
      family: "outputs",
      check: "stale-report",
      severity: "low",
      where: file,
      summary: `${file} was last regenerated ${recorded}, ${lag} days behind the newest source commit (${source})`,
      ask: `Regenerate ${file} before trusting findings derived from it.`,
    });
  }
  return findings;
}
