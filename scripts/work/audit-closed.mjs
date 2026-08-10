import { existsSync, readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { loadWork } from "./lib.mjs";
import { readJournal } from "./journal.mjs";
import { daysSince, lastCommitDate } from "./audit-lib.mjs";

/** How far back a close is still worth re-reading. Older closes are history. */
export const REVIEW_WINDOW_DAYS = 180;
/** A verification that returned this fast probably did not exercise anything. */
export const INSTANT_VERIFY_MS = 2000;
/** Same-week churn in an evidence file is the change itself, not drift. */
export const EVIDENCE_DRIFT_DAYS = 7;
/** Classes where an instant verification is suspicious rather than plausible. */
const LOAD_BEARING = new Set(["release-gate", "bug"]);

/**
 * Re-read what was closed. `work:done` proves the verification passed *at the
 * moment of the close*; nothing re-checks it afterwards, so this family asks
 * whether each close still stands: was anything actually run, does the cited
 * log still hash to what the journal recorded, has the evidence moved since.
 * @param {string} root
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
export function auditClosedWork(root = repoRoot(), now = Date.now()) {
  const { index } = loadWork(root);
  const closes = readJournal(root).filter(
    (event) => !event.malformed && event.action === "close",
  );

  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const event of closes) {
    const age = daysSince(event.at, now);
    findings.push(...logIntegrity(event, root));
    if (age > REVIEW_WINDOW_DAYS) continue;
    findings.push(...unverified(event, age));
    findings.push(...instantVerification(event, age));
    findings.push(...evidenceDrift(event, index.get(event.id), root));
  }
  return findings;
}

/**
 * The journal records a SHA-256 of the evidence log precisely so the claim can
 * be re-checked later. This is the check that does it.
 * @param {import("./journal.mjs").JournalEvent} event
 * @param {string} root
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function logIntegrity(event, root) {
  if (!event.log || !event.digest) return [];
  const path = join(root, event.log);
  if (!existsSync(path)) {
    return [
      {
        family: "closed",
        check: "missing-evidence-log",
        severity: "low",
        where: event.log,
        summary: `${event.id} cites an evidence log that is no longer in the tree`,
        ask: `Restore ${event.log} or accept that ${event.id} now rests on its evidence paths alone.`,
      },
    ];
  }
  const digest = `sha256:${createHash("sha256").update(readFileSync(path)).digest("hex")}`;
  if (digest === event.digest) return [];
  return [
    {
      family: "closed",
      check: "digest-mismatch",
      severity: "high",
      where: event.log,
      summary: `${event.id}: the evidence log no longer hashes to the digest recorded at close`,
      ask: `The log was edited or regenerated after ${event.id} closed. Re-run the verification and close it again, or explain the edit.`,
    },
  ];
}

/**
 * @param {import("./journal.mjs").JournalEvent} event
 * @param {number} age
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function unverified(event, age) {
  if (event.verified !== false) return [];
  return [
    {
      family: "closed",
      check: "unverified-close",
      severity: "high",
      where: event.id,
      summary: `${event.id} was closed ${age} day(s) ago without running a verification — reason: ${event.reason ?? "none recorded"}`,
      ask: `Does the claim still hold? Re-run the runbook, or record a command that can check it, so ${event.id} is not permanently unproven.`,
    },
  ];
}

/**
 * @param {import("./journal.mjs").JournalEvent} event
 * @param {number} age
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function instantVerification(event, age) {
  if (event.verifiedFrom !== "run") return [];
  if (typeof event.durationMs !== "number") return [];
  if (event.durationMs >= INSTANT_VERIFY_MS) return [];
  if (!LOAD_BEARING.has(String(event.type))) return [];
  return [
    {
      family: "closed",
      check: "instant-verification",
      severity: "medium",
      where: event.id,
      summary: `${event.id} (${event.type}) closed ${age} day(s) ago on a verification that ran in ${event.durationMs}ms: \`${event.verify}\``,
      ask: `Did \`${event.verify}\` actually exercise ${event.id}, or did it no-op? A check that cannot fail is not evidence.`,
    },
  ];
}

/**
 * @param {import("./journal.mjs").JournalEvent} event
 * @param {import("./lib.mjs").WorkItem | undefined} item
 * @param {string} root
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function evidenceDrift(event, item, root) {
  const closed = String(event.at).slice(0, 10);
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];

  for (const token of item?.evidence ?? []) {
    if (/^https?:/.test(token)) continue;
    const changed = lastCommitDate(token, root);
    if (!changed || changed <= closed) continue;
    const drift = daysSince(closed) - daysSince(changed);
    if (drift < EVIDENCE_DRIFT_DAYS) continue;
    findings.push({
      family: "closed",
      check: "evidence-drift",
      severity: "medium",
      where: token,
      summary: `${event.id} closed ${closed}, but its evidence ${token} changed on ${changed}`,
      ask: `Would \`${event.verify}\` still pass? Re-run it if ${token} carries the behaviour ${event.id} claimed.`,
    });
  }
  return findings;
}
