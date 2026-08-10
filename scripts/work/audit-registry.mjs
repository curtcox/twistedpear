import { repoRoot } from "../doc-audit/repo-root.mjs";
import { loadResources, loadWork } from "./lib.mjs";
import { readJournal } from "./journal.mjs";
import { daysSince } from "./audit-lib.mjs";

/** An unblocked item nobody has touched in this long is a decision, not a task. */
export const STALE_OPEN_DAYS = 90;
/** A resource-blocked item this old is parked; say so in the register. */
export const PARKED_DAYS = 60;
/** This many items sharing one verify command means none of them is verified. */
export const SHARED_VERIFY_LIMIT = 4;

/**
 * Commands that check the *bookkeeping* rather than the work. Closing a bug
 * whose verification is `npm run work:check` proves the registry is
 * self-consistent, which it was before the bug was fixed too.
 */
const REGISTRY_ONLY = new Set([
  "npm run work:check",
  "npm run test:doc-audit",
  "true",
]);

/** Types for which a registry-only verification is legitimate. */
const BOOKKEEPING_TYPES = new Set(["docs"]);

/**
 * Health of the tracking data itself: work that has quietly stopped moving,
 * work parked behind something nobody is acquiring, and verifications that
 * cannot fail for the reason the item claims.
 * @param {string} root
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
export function auditRegistry(root = repoRoot(), now = Date.now()) {
  const { items } = loadWork(root);
  const resources = loadResources(root).resources ?? {};
  const events = readJournal(root).filter((event) => !event.malformed);

  /** @type {Map<string, string>} last event other than the item's own add */
  const touched = new Map();
  for (const event of events) {
    if (event.action === "add" || event.action === "epoch") continue;
    touched.set(event.id, String(event.at));
  }

  const open = items.filter((item) => item.status === "open");
  return [
    ...staleOpen(open, touched, now),
    ...parked(open, resources, now),
    ...weakVerify(open),
    ...sharedVerify(open),
    ...orphanResources(items, resources),
  ];
}

/**
 * @param {import("./lib.mjs").WorkItem[]} open
 * @param {Map<string, string>} touched
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function staleOpen(open, touched, now) {
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const item of open) {
    if (item.blockers.length > 0) continue;
    if (touched.has(item.id)) continue;
    const age = daysSince(item.added, now);
    if (age < STALE_OPEN_DAYS) continue;
    findings.push({
      family: "registry",
      check: "stale-open",
      severity: "medium",
      where: `${item.file}:${item.line}`,
      summary: `${item.id} has been unblocked and untouched for ${age} days (${item.type}, added ${item.added})`,
      ask: `Is ${item.id} still worth doing? Take it next, retype it, or record why it stays open.`,
    });
  }
  return findings;
}

/**
 * @param {import("./lib.mjs").WorkItem[]} open
 * @param {Record<string, { available: boolean; note?: string; acquired?: string }>} resources
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function parked(open, resources, now) {
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const item of open) {
    if (item.blockers.length === 0) continue;
    if (item.blockers.some((blocker) => blocker.kind !== "resource")) continue;
    const age = daysSince(item.added, now);
    if (age < PARKED_DAYS) continue;
    const tokens = item.blockers.map((blocker) => blocker.ref).join(", ");
    const notes = item.blockers
      .map((blocker) => resources[blocker.ref.slice(4)]?.note)
      .filter(Boolean);
    findings.push({
      family: "registry",
      check: "parked",
      severity: "low",
      where: `${item.file}:${item.line}`,
      summary: `${item.id} has waited ${age} days on ${tokens}${notes.length > 0 ? ` (${notes.join("; ")})` : ""}`,
      ask: `Acquire ${tokens}, or set ${item.id} to deferred so work:list stops offering it as pending work.`,
    });
  }
  return findings;
}

/**
 * @param {import("./lib.mjs").WorkItem[]} open
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function weakVerify(open) {
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const item of open) {
    if (!REGISTRY_ONLY.has(item.verify.trim())) continue;
    if (BOOKKEEPING_TYPES.has(item.type)) continue;
    findings.push({
      family: "registry",
      check: "weak-verify",
      severity: "high",
      where: `${item.file}:${item.line}`,
      summary: `${item.id} (${item.type}) is verified by \`${item.verify}\`, which checks the registry rather than the work`,
      ask: `What command would fail today and pass once ${item.id} is done? Record it with npm run work:retype or by editing the item's verify.`,
    });
  }
  return findings;
}

/**
 * @param {import("./lib.mjs").WorkItem[]} open
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function sharedVerify(open) {
  /** @type {Map<string, string[]>} */
  const byCommand = new Map();
  for (const item of open) {
    if (!item.verify || item.verify.startsWith("runbook:")) continue;
    if (!byCommand.has(item.verify)) byCommand.set(item.verify, []);
    byCommand.get(item.verify).push(item.id);
  }

  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const [command, ids] of [...byCommand].sort()) {
    if (ids.length < SHARED_VERIFY_LIMIT) continue;
    findings.push({
      family: "registry",
      check: "shared-verify",
      severity: "medium",
      where: ids[0],
      summary: `${ids.length} open items share the verification \`${command}\`: ${ids.sort().join(", ")}`,
      ask: "A command that closes any of these closes all of them. Give each item a check that fails while that specific item is open.",
    });
  }
  return findings;
}

/**
 * @param {import("./lib.mjs").WorkItem[]} items
 * @param {Record<string, { available: boolean; note?: string }>} resources
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
function orphanResources(items, resources) {
  const required = new Set();
  for (const item of items) {
    for (const ref of item.requires) {
      if (ref.startsWith("res:")) required.add(ref.slice(4));
    }
  }

  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];
  for (const token of Object.keys(resources).sort()) {
    if (required.has(token)) continue;
    findings.push({
      family: "registry",
      check: "orphan-resource",
      severity: "low",
      where: `work/resources.json ${token}`,
      summary: `resource "${token}" is declared but no item requires it${resources[token].note ? ` (${resources[token].note})` : ""}`,
      ask: `Does some open item actually need ${token}? Add it to that item's --requires, or drop the token.`,
    });
  }
  return findings;
}
