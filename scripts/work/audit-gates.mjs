import { repoRoot } from "../doc-audit/repo-root.mjs";
import { gateStatus } from "../checks/status.mjs";
import { daysSince } from "./audit-lib.mjs";
import { gateItemId } from "./lib.mjs";

/**
 * A gate red for longer than this is no longer an incident, it is a decision —
 * either to fix it or to stop believing it. Either is fine; leaving it red and
 * unremarked is not, because the next person learns that red means nothing.
 */
export const LONG_RED_DAYS = 2;

/** A record older than this describes a tree nobody has re-measured. */
export const STALE_RECORD_DAYS = 14;

/** Warn this far ahead of a waiver lapsing, so it is renewed or fixed on purpose. */
export const WAIVER_NOTICE_DAYS = 7;

/**
 * The green-gate rule's review pass. `work:next` already refuses to look past a
 * red gate; this family exists for the questions ranking cannot answer — has
 * this been red so long that the queue is stuck behind it, is an exemption
 * quietly becoming permanent, and does the committed record still describe
 * anything real.
 * @param {string} root
 * @param {number} now
 * @returns {import("./audit-lib.mjs").Finding[]}
 */
export function auditGates(root = repoRoot(), now = Date.now()) {
  const state = gateStatus(root, { now: new Date(now) });
  /** @type {import("./audit-lib.mjs").Finding[]} */
  const findings = [];

  for (const gate of state.blocking) {
    const days = daysSince(gate.since, now);
    const long = days >= LONG_RED_DAYS;
    findings.push({
      family: "gates",
      check: long ? "long-red" : "red",
      severity: long ? "high" : "medium",
      where: gateItemId(gate.id),
      summary: `${gate.id} has been red ${
        days < 0
          ? "since an unrecorded date"
          : days === 0
            ? "since today"
            : `${days} day(s)`
      }${gate.detail ? `: ${gate.detail}` : ""}`,
      ask: long
        ? `${gate.id} has blocked the queue for ${days} day(s). Fix it, or decide out loud that it cannot be fixed now and record a bounded waiver — a gate nobody intends to fix should not keep preempting every other item.`
        : `Fix ${gate.id} before picking up anything else: \`${gate.command}\`.`,
    });
  }

  for (const gate of state.red.filter((one) => one.waiver === "expired")) {
    findings.push({
      family: "gates",
      check: "waiver-expired",
      severity: "high",
      where: gateItemId(gate.id),
      summary: `the waiver for ${gate.id} expired ${gate.waiverRecord?.expires} and the gate is still red`,
      ask: `Was "${gate.waiverRecord?.reason}" resolved? If the gate can now be fixed, fix it; if the reason still holds, record a fresh waiver rather than letting an expired one stand.`,
    });
  }

  for (const waiver of state.expiring) {
    findings.push({
      family: "gates",
      check: "waiver-expiring",
      severity: "medium",
      where: gateItemId(waiver.gate),
      summary: `the waiver for ${waiver.gate} expires ${waiver.expires} (${waiver.reason})`,
      ask: `Will ${waiver.gate} be green by ${waiver.expires}? If not, plan the fix now — when the waiver lapses the soak guard refuses to start.`,
    });
  }

  const age = daysSince(state.measuredAt, now);
  if (!state.measuredAt) {
    findings.push({
      family: "gates",
      check: "no-record",
      severity: "high",
      where: "checks.json",
      summary: "no gate results have ever been recorded",
      ask: "Run `npm run checks:status` — until it has run, the green-gate rule has nothing to enforce and the soak guard refuses every tree.",
    });
  } else if (age >= STALE_RECORD_DAYS) {
    findings.push({
      family: "gates",
      check: "stale-record",
      severity: "medium",
      where: "checks.json",
      summary: `the recorded gate results are ${age} day(s) old`,
      ask: "Re-run `npm run checks:status`. A record this old is unlikely to describe the current tree, and the soak guard will reject it on digest anyway.",
    });
  }

  return findings;
}
