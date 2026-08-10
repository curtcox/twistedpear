import { repoRoot } from "../doc-audit/repo-root.mjs";
import { readJournal } from "./journal.mjs";

/** An audit is due this often, or this many closes, whichever comes first. */
export const AUDIT_INTERVAL_DAYS = 14;
export const AUDIT_INTERVAL_CLOSES = 5;

/**
 * @typedef {object} AuditDebt
 * @property {string | null} last ISO timestamp of the last recorded audit
 * @property {number | null} days whole days since it, null when never recorded
 * @property {number} closes closes journaled since it
 * @property {number} findings findings the last audit reported
 * @property {boolean} due
 * @property {string} reason why it is (or is not) due
 */

/**
 * The journal is the clock. Deriving "when did we last audit" from the report
 * file's mtime would reset on every fresh clone and could be refreshed by a run
 * that found nothing; an `audit` event is durable and travels with the repo.
 * @param {string} root
 * @param {number} now
 * @returns {AuditDebt}
 */
export function auditDebt(root = repoRoot(), now = Date.now()) {
  const events = readJournal(root).filter((event) => !event.malformed);
  const audits = events.filter((event) => event.action === "audit");
  const last = audits.length > 0 ? audits[audits.length - 1] : null;
  const closes = events.filter(
    (event) =>
      event.action === "close" && (!last || String(event.at) > String(last.at)),
  ).length;
  const days = last ? Math.floor((now - Date.parse(last.at)) / 86400000) : null;

  if (!last) {
    return {
      last: null,
      days: null,
      closes,
      findings: 0,
      due: true,
      reason: "no audit has ever been recorded",
    };
  }
  const base = {
    last: String(last.at),
    days,
    closes,
    findings: Number(last.findings ?? 0),
  };
  if (days >= AUDIT_INTERVAL_DAYS) {
    return {
      ...base,
      due: true,
      reason: `last audit was ${days} day(s) ago (every ${AUDIT_INTERVAL_DAYS})`,
    };
  }
  if (closes >= AUDIT_INTERVAL_CLOSES) {
    return {
      ...base,
      due: true,
      reason: `${closes} item(s) closed since the last audit (every ${AUDIT_INTERVAL_CLOSES})`,
    };
  }
  return {
    ...base,
    due: false,
    reason: `last audit ${days} day(s) and ${closes} close(s) ago`,
  };
}

/**
 * One line for the end of `work:next` and `work:done`. Those two commands are
 * the ones an agent runs every session, which is what makes "periodically"
 * happen without a scheduler.
 * @param {string} root
 * @param {number} now
 * @returns {string | null}
 */
export function auditNudge(root = repoRoot(), now = Date.now()) {
  const debt = auditDebt(root, now);
  if (!debt.due) return null;
  return `audit due: ${debt.reason} — run npm run work:audit`;
}
