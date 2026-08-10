#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import {
  applicationFingerprint,
  treeFingerprint,
} from "../release/fingerprint.mjs";
import { gates } from "./registry.mjs";

/**
 * The committed record of which static-analysis gates are green. `check:ci-base`
 * writes one artifact per gate under `artifacts/checks/` (gitignored, and in CI
 * spread across matrix jobs); this file is the merged, committed view that
 * `work:next`, `release:status`, and the soak guard all read.
 *
 * It exists because the green-gate rule needs a single answer to "is the tree
 * red right now?" that survives a clean checkout. A rule that only holds on the
 * machine that last ran the gates is not a rule.
 */
export const CHECKS_FILE = "checks.json";

/** Recorded exemptions from the green-gate rule. See {@link waiverState}. */
export const WAIVERS_FILE = "checks-waivers.json";

/** A waiver may not be written further out than this. */
export const MAX_WAIVER_DAYS = 30;

/**
 * @typedef {object} GateRecord
 * @property {string} title
 * @property {string} command
 * @property {boolean} ok
 * @property {string} at
 * @property {string} commit
 * @property {string} [detail]
 * @property {string} [since] ISO day this gate first went red, carried across
 *   runs so the audit can tell a fresh failure from one nobody has fixed
 * @property {string} [measuredOn] tree digest this gate's result came from.
 *   Carried-forward results keep the digest they were actually measured on, so
 *   a gate that could not run here cannot pass as green for this tree.
 * @property {string} [tier] which tier the gate belongs to. `pr` gates feed the
 *   work queue; `release` gates only have to be green before a soak.
 */

/**
 * @typedef {object} ChecksStatus
 * @property {number} version
 * @property {string} generatedAt
 * @property {string} commit
 * @property {string} digest application fingerprint the gates were measured on
 * @property {string} [treeDigest] fingerprint of everything the gates read
 * @property {Record<string, GateRecord>} gates
 */

/**
 * @typedef {object} Waiver
 * @property {string} gate
 * @property {string} reason
 * @property {string} recorded
 * @property {string} expires
 * @property {string} [by]
 */

/**
 * @param {string} file
 * @param {any} fallback
 */
function readJson(file, fallback) {
  if (!existsSync(file)) return fallback;
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

/**
 * @param {string} root
 * @returns {ChecksStatus}
 */
export function readChecks(root) {
  return readJson(join(root, CHECKS_FILE), {
    version: 1,
    generatedAt: "",
    commit: "",
    digest: "",
    gates: {},
  });
}

/**
 * @param {string} root
 * @returns {Waiver[]}
 */
export function readWaivers(root) {
  const file = readJson(join(root, WAIVERS_FILE), { version: 1, waivers: [] });
  return Array.isArray(file.waivers) ? file.waivers : [];
}

/** Characters reporters use to draw rules, boxes, and separators. */
const DECORATION = /[│┃─━⎯┄╭╰╮╯├┤=_]/g;

/** Reporter decoration that carries no information once the log is gone. */
const NOISE = [
  /^\s*$/,
  /^exit:/,
  /^\$ /,
  /^\s*\d+\|/, // vitest source gutters
  /^[\s│┃─━⎯┄╭╰╮╯├┤+|=_-]*$/, // pure rules and frames
  /^\s*[❯>]\s/, // reporter pointers
  /^\s*at\s/, // stack frames
];

/**
 * A banner like `⎯⎯⎯ Failed Tests 1 ⎯⎯⎯` is mostly rule with a few words in the
 * middle; it survives the pure-decoration filter but says nothing the following
 * lines do not. Judge by how much of the line is drawing.
 * @param {string} line
 * @returns {boolean}
 */
function isBanner(line) {
  const drawn = (line.match(DECORATION) ?? []).length;
  return drawn >= 6 && drawn >= line.trim().length / 3;
}

/**
 * Whichever lines of a failing gate's log say what went wrong. The full log
 * stays in `artifacts/`; this is the part that has to survive into a committed
 * file so a red gate explains itself on a clean checkout — where the log does
 * not exist, because `artifacts/` is gitignored.
 * @param {string} text
 * @returns {string}
 */
export function summarize(text) {
  const lines = text
    // eslint-disable-next-line no-control-regex -- stripping reporter colour
    .replace(/\[[0-9;]*m/g, "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(
      (line) => !NOISE.some((pattern) => pattern.test(line)) && !isBanner(line),
    );
  // A ratchet or policy gate states its verdict on the way out; a test runner
  // buries it above the summary. Prefer an explicit failure line when the log
  // has one, and fall back to the tail.
  const verdicts = lines.filter((line) =>
    /\b(fail(ed|ure)?|error|below|<\s*floor|floor|exceeds|missing|refus)/i.test(
      line,
    ),
  );
  return (verdicts.length > 0 ? verdicts : lines)
    .slice(-3)
    .map((line) => line.trim())
    .join(" / ")
    .slice(0, 300);
}

/**
 * How long a gate has been red. A gate that was already red keeps the day it
 * first failed; one that has just turned red starts its clock now. This is what
 * lets `work:audit` distinguish "broke this morning" from "red for three weeks
 * and everybody has learned to scroll past it".
 * @param {GateRecord | undefined} previous
 * @param {Date} now
 * @returns {string}
 */
function redSince(previous, now) {
  if (previous && previous.ok !== true && previous.since) return previous.since;
  return now.toISOString().slice(0, 10);
}

/**
 * Merge the per-gate artifacts of a run into the committed status. Gates absent
 * from this run keep their previous record: a single-gate `--only` run must not
 * silently declare the other fifteen green.
 * @param {string} root
 * @param {{ digest?: string; treeDigest?: string; commit?: string; now?: Date; tiers?: string[] }} [options]
 * @returns {ChecksStatus}
 */
export function collect(root, options = {}) {
  const {
    digest = "",
    treeDigest = "",
    commit = "",
    now = new Date(),
    tiers = ["pr", "release"],
  } = options;
  const previous = readChecks(root);
  const directory = join(root, "artifacts", "checks");
  // Only the gates of the tiers being recorded. `artifacts/` accumulates
  // results from every run on the machine, including nightly-tier gates that
  // `check:ci-base` never runs; folding those in would let a months-old
  // nightly artifact decide whether a soak may start.
  const scope = gates.filter((gate) => tiers.includes(gate.tier));
  const tierOf = new Map(scope.map((gate) => [gate.id, gate.tier]));
  const inTier = new Set(tierOf.keys());
  /** @type {Record<string, GateRecord>} */
  const merged = Object.fromEntries(
    Object.entries(previous.gates ?? {}).filter(([id]) => inTier.has(id)),
  );

  const files = existsSync(directory)
    ? readdirSync(directory).filter((name) => name.endsWith(".json"))
    : [];
  for (const name of files) {
    const artifact = readJson(join(directory, name), null);
    if (!artifact?.id || !inTier.has(artifact.id)) continue;
    const log = join(root, "artifacts", "logs", `${artifact.id}.log`);
    const ok = artifact.ok === true;
    merged[artifact.id] = {
      title: artifact.title ?? artifact.id,
      command: artifact.command ?? "",
      ok,
      at: artifact.finishedAt ?? now.toISOString(),
      commit: artifact.commit ?? commit,
      ...(ok || !existsSync(log)
        ? {}
        : { detail: summarize(readFileSync(log, "utf8")) }),
      ...(ok ? {} : { since: redSince(previous.gates?.[artifact.id], now) }),
      // `artifacts/` is not cleared between runs, so this directory mixes
      // results from every run the machine has ever done. Only an artifact from
      // the commit being recorded can be claimed as measured on this tree;
      // anything older keeps whatever provenance it already had and is reported
      // as unmeasured. (A same-commit artifact from a different dirty state
      // would still be over-claimed here — the whole-record tree digest is what
      // catches that case.)
      ...(artifact.commit && commit && artifact.commit === commit
        ? { measuredOn: treeDigest }
        : previous.gates?.[artifact.id]?.measuredOn
          ? { measuredOn: previous.gates[artifact.id].measuredOn }
          : {}),
      tier: tierOf.get(artifact.id),
    };
  }

  // A gate that exists in the registry but has never produced a result is not
  // evidence of green. Record it as red so the rule fails closed.
  for (const gate of scope) {
    if (merged[gate.id]) continue;
    merged[gate.id] = {
      title: gate.title,
      command: gate.command.join(" "),
      ok: false,
      at: now.toISOString(),
      commit,
      detail: "gate has never produced a result artifact",
      since: redSince(previous.gates?.[gate.id], now),
      tier: gate.tier,
    };
  }

  return {
    version: 1,
    generatedAt: now.toISOString(),
    commit,
    digest,
    treeDigest,
    gates: Object.fromEntries(
      Object.keys(merged)
        .sort()
        .map((id) => [id, merged[id]]),
    ),
  };
}

/**
 * @param {string} root
 * @param {ChecksStatus} status
 */
export function writeChecks(root, status) {
  writeFileSync(
    join(root, CHECKS_FILE),
    `${JSON.stringify(status, null, 2)}\n`,
  );
}

/**
 * @param {string} value
 * @returns {number}
 */
function day(value) {
  const parsed = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(parsed) ? Number.NaN : parsed;
}

/**
 * Waivers are the pressure valve that keeps the green-gate rule from being
 * bypassed wholesale. An unfixable-today gate (a fresh advisory, an upstream
 * relicense) gets a recorded reason and an expiry; an expired one counts as no
 * waiver at all, so the exemption cannot quietly become permanent.
 * @param {Waiver[]} waivers
 * @param {string} gate
 * @param {Date} now
 * @returns {{ state: "none" | "active" | "expired"; waiver?: Waiver }}
 */
export function waiverState(waivers, gate, now = new Date()) {
  const matches = waivers.filter((waiver) => waiver.gate === gate);
  if (matches.length === 0) return { state: "none" };
  const live = matches.filter((waiver) => day(waiver.expires) >= now.getTime());
  if (live.length > 0) {
    const soonest = [...live].sort((a, b) =>
      a.expires < b.expires ? -1 : 1,
    )[0];
    return { state: "active", waiver: soonest };
  }
  const latest = [...matches].sort((a, b) =>
    a.expires < b.expires ? 1 : -1,
  )[0];
  return { state: "expired", waiver: latest };
}

/**
 * @typedef {object} RedGate
 * @property {string} id
 * @property {string} title
 * @property {string} command
 * @property {string} [detail]
 * @property {string} [since]
 * @property {string} tier
 * @property {"none" | "active" | "expired"} waiver
 * @property {Waiver} [waiverRecord]
 */

/**
 * Whether a recorded result still describes the tree in front of you, and if
 * not, why. Callers that pass no digest are asking only "what is red?" and get
 * no staleness complaint; the soak guard passes both and gets the strict answer.
 * @param {ChecksStatus} status
 * @param {number} recorded how many gates the record covers
 * @param {{ digest?: string; treeDigest?: string }} options
 * @returns {string} empty when the record still applies
 */
function stalenessOf(status, recorded, options) {
  const { digest, treeDigest } = options;
  if (recorded === 0)
    return `${CHECKS_FILE} has no gate results — run npm run checks:status`;
  if (digest !== undefined && status.digest !== digest)
    return `${CHECKS_FILE} was measured on application digest ${(
      status.digest || "(none)"
    ).slice(
      0,
      12,
    )}, not the current ${digest.slice(0, 12)} — re-run npm run checks:status`;
  if (treeDigest === undefined) return "";
  // A record written before this field existed cannot prove it covers the tree,
  // and the gates read far more than the application paths. Fail closed.
  if (!status.treeDigest)
    return `${CHECKS_FILE} predates the tree digest, so it cannot be shown to describe this tree — re-run npm run checks:status`;
  if (status.treeDigest !== treeDigest)
    return `${CHECKS_FILE} was measured on tree ${status.treeDigest.slice(
      0,
      12,
    )}, not the current ${treeDigest.slice(0, 12)} — something outside the application paths changed; re-run npm run checks:status`;
  return "";
}

/**
 * The green-gate view of the tree: which gates are red, which of those are
 * waived, and whether the record still describes the code in front of you.
 * @param {string} root
 * @param {{ digest?: string; treeDigest?: string; now?: Date }} [options]
 * @returns {{
 *   fresh: boolean;
 *   staleReason: string;
 *   stale: { id: string; title: string; command: string; measuredOn?: string }[];
 *   measuredAt: string;
 *   red: RedGate[];
 *   blocking: RedGate[];
 *   waived: RedGate[];
 *   expiring: Waiver[];
 * }}
 */
export function gateStatus(root, options = {}) {
  const { digest, now = new Date() } = options;
  const status = readChecks(root);
  const waivers = readWaivers(root);
  const recorded = Object.entries(status.gates ?? {});

  /** @type {RedGate[]} */
  const red = recorded
    .filter(([, record]) => record.ok !== true)
    .map(([id, record]) => {
      const { state, waiver } = waiverState(waivers, id, now);
      return {
        id,
        title: record.title ?? id,
        command: record.command ?? "",
        detail: record.detail,
        since: record.since,
        tier: record.tier ?? "pr",
        waiver: state,
        waiverRecord: waiver,
      };
    })
    .sort((a, b) => (a.id < b.id ? -1 : 1));

  const staleReason = stalenessOf(status, recorded.length, options);
  const fresh = recorded.length > 0 && staleReason === "" && digest !== "";

  // Gates whose result came from a different tree. A run on a machine without
  // (say) a Swift toolchain skips those gates, and carrying their old result
  // forward is what keeps partial and matrix runs workable — but it must not
  // let a result measured three commits ago count as green for this one.
  const { treeDigest } = options;
  const stale =
    treeDigest === undefined
      ? []
      : recorded
          .filter(([id, record]) => {
            if (record.measuredOn === treeDigest) return false;
            return waiverState(waivers, id, now).state !== "active";
          })
          .map(([id, record]) => ({
            id,
            title: record.title ?? id,
            command: record.command ?? "",
            measuredOn: record.measuredOn,
          }))
          .sort((a, b) => (a.id < b.id ? -1 : 1));

  const horizon = new Date(now.getTime() + 7 * 86_400_000);
  return {
    fresh,
    staleReason,
    stale,
    measuredAt: status.generatedAt ?? "",
    red,
    blocking: red.filter((gate) => gate.waiver !== "active"),
    waived: red.filter((gate) => gate.waiver === "active"),
    expiring: waivers.filter(
      (waiver) =>
        day(waiver.expires) >= now.getTime() &&
        day(waiver.expires) <= horizon.getTime(),
    ),
  };
}

function main(argv = process.argv.slice(2)) {
  const root = repoRoot();
  if (argv.includes("--write")) {
    const fingerprint = applicationFingerprint(root);
    const status = collect(root, {
      digest: fingerprint.digest,
      treeDigest: treeFingerprint(root),
      commit: fingerprint.head,
    });
    writeChecks(root, status);
    const red = Object.entries(status.gates).filter(([, one]) => !one.ok);
    console.log(
      `${CHECKS_FILE}: ${Object.keys(status.gates).length - red.length}/${
        Object.keys(status.gates).length
      } gates green at ${fingerprint.head.slice(0, 12)}`,
    );
    for (const [id, record] of red)
      console.log(`  RED  ${id}${record.detail ? ` — ${record.detail}` : ""}`);
    return;
  }

  const state = gateStatus(root);
  if (state.red.length === 0) {
    console.log(`all recorded gates green (measured ${state.measuredAt})`);
    return;
  }
  for (const gate of state.red) {
    const mark =
      gate.waiver === "active"
        ? `WAIVED until ${gate.waiverRecord?.expires}`
        : gate.waiver === "expired"
          ? `RED (waiver expired ${gate.waiverRecord?.expires})`
          : "RED";
    console.log(`${mark}  ${gate.id}${gate.detail ? ` — ${gate.detail}` : ""}`);
  }
  if (state.blocking.length > 0) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
