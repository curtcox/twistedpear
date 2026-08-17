import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, trackedMarkdownPaths } from "./repo-root.mjs";
import { loadWork } from "../work/lib.mjs";

/**
 * The mobile app lifecycle costs mini-apps utility that a desktop lifecycle would not.
 * `mobile-lifecycle-ledger.json` records each of those costs and, crucially, whether the
 * mobile OS actually requires it. These rules exist so that classification cannot rot:
 *
 * 1. Every row declares a cause the ledger defines, and cites evidence that exists.
 * 2. Every row carries exactly one revisit trigger — a tracked work id, or a date.
 * 3. A fired trigger surfaces. A row whose date passed long ago fails rather than warns,
 *    so "we will look at it later" cannot become "we never looked at it again".
 * 4. The table in docs/mobile-lifecycle.md matches the ledger, row for row and in order.
 * 5. Claims the ledger has recorded as false do not come back into the documentation.
 *
 * Rule 5 is the one with history behind it: eleven documents once justified a single
 * running mini-app as a design choice, which described a limit the OS never imposed.
 */

const LEDGER_FILE = "mobile-lifecycle-ledger.json";
const LEDGER_DOC = "docs/mobile-lifecycle.md";

/** Days after a revisit date passes before a warning becomes a failure. */
const GRACE_DAYS = 90;

/** @typedef {{ path: string; level: 'warn' | 'fail'; message: string }} Finding */

/**
 * @param {string} root
 * @returns {{ audited: string; causes: Record<string, string>; forbiddenClaims: { pattern: string; why: string }[]; rows: Record<string, unknown>[] }}
 */
export function loadLedger(root = repoRoot()) {
  return JSON.parse(readFileSync(join(root, LEDGER_FILE), "utf8"));
}

/**
 * Rows 1 and 2: shape, classification, citations, and exactly one revisit trigger.
 *
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditLedgerShape(root = repoRoot()) {
  const ledger = loadLedger(root);
  const { index } = loadWork(root);
  /** @type {Finding[]} */
  const findings = [];
  const seen = new Set();

  for (const row of ledger.rows) {
    const id = String(row.id ?? "");
    const at = `${LEDGER_FILE}: ${id || "(row with no id)"}`;
    /** @type {string[]} */
    const messages = [];

    if (!id) {
      messages.push("row has no id");
    } else {
      if (seen.has(id)) messages.push("duplicate row id");
      seen.add(id);
      messages.push(...classificationErrors(row, ledger));
      messages.push(...evidenceErrors(row, root));
      messages.push(...revisitErrors(row, index));
    }

    for (const message of messages) {
      findings.push({ path: at, level: "fail", message });
    }
  }

  return findings;
}

/**
 * A row states what is withheld, why, and what would lift it, under a defined cause.
 *
 * @param {Record<string, unknown>} row
 * @param {{ causes: Record<string, string> }} ledger
 * @returns {string[]}
 */
function classificationErrors(row, ledger) {
  const errors = [];
  for (const field of ["utility", "cause", "decision", "cost", "unlock"]) {
    const value = row[field];
    if (typeof value !== "string" || value.trim() === "") {
      errors.push(`missing ${field}`);
    }
  }
  if (!Object.hasOwn(ledger.causes, String(row.cause))) {
    errors.push(
      `cause "${row.cause}" is not defined in the ledger's causes: ${Object.keys(ledger.causes).join(", ")}`,
    );
  }
  return errors;
}

/**
 * Every row points at something in the tree that shows the decision in force, so a claim
 * about a limit can always be checked against the code or document imposing it.
 *
 * @param {Record<string, unknown>} row
 * @param {string} root
 * @returns {string[]}
 */
function evidenceErrors(row, root) {
  const evidence = Array.isArray(row.evidence) ? row.evidence : [];
  if (evidence.length === 0) {
    return ["cite at least one file that shows the decision in force"];
  }
  return evidence
    .filter((rel) => !existsSync(join(root, rel)))
    .map((rel) => `evidence path does not exist: ${rel}`);
}

/**
 * Exactly one trigger, so every row has a defined moment at which it comes back up.
 *
 * @param {Record<string, unknown>} row
 * @param {Map<string, unknown>} index
 * @returns {string[]}
 */
function revisitErrors(row, index) {
  const revisit = /** @type {Record<string, string>} */ (row.revisit ?? {});
  const triggers = ["work", "after"].filter((key) =>
    Object.hasOwn(revisit, key),
  );
  if (triggers.length !== 1) {
    return [
      `revisit must name exactly one trigger — a tracked work id, or a date — got ${triggers.length}`,
    ];
  }
  if (revisit.work !== undefined && !index.has(revisit.work)) {
    return [
      `revisit work id ${revisit.work} is not in any register — file it with npm run work:add`,
    ];
  }
  if (
    revisit.after !== undefined &&
    !/^\d{4}-\d{2}-\d{2}$/.test(revisit.after)
  ) {
    return [`revisit date must be YYYY-MM-DD, got ${revisit.after}`];
  }
  return [];
}

/**
 * Rule 3: a trigger that has fired is a row nobody has reconsidered yet.
 *
 * @param {string} root
 * @param {Date} today
 * @returns {Finding[]}
 */
export function auditRevisitTriggers(root = repoRoot(), today = new Date()) {
  const ledger = loadLedger(root);
  const { index } = loadWork(root);
  /** @type {Finding[]} */
  const findings = [];

  for (const row of ledger.rows) {
    const revisit = /** @type {Record<string, string>} */ (row.revisit ?? {});
    const at = `${LEDGER_FILE}: ${row.id}`;

    if (revisit.work !== undefined) {
      const item = index.get(revisit.work);
      if (item?.status !== "done") continue;
      findings.push({
        path: at,
        level: "warn",
        message: `${revisit.work} is done — reconsider "${row.utility}" and set a new revisit trigger`,
      });
      continue;
    }

    const due = Date.parse(`${revisit.after}T00:00:00Z`);
    if (Number.isNaN(due) || due > today.getTime()) continue;
    const overdueDays = Math.floor((today.getTime() - due) / (86400 * 1000));
    findings.push({
      path: at,
      level: overdueDays > GRACE_DAYS ? "fail" : "warn",
      message: `revisit date ${revisit.after} passed ${overdueDays} days ago — decide whether "${row.utility}" is still out of reach, then record the answer and a new date`,
    });
  }

  return findings;
}

/**
 * Rule 4: the published table is the ledger, not a copy that drifts from it.
 *
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditLedgerTableMatchesDoc(root = repoRoot()) {
  const ledger = loadLedger(root);
  const abs = join(root, LEDGER_DOC);
  if (!existsSync(abs)) {
    return [
      {
        path: LEDGER_DOC,
        level: "fail",
        message: "the ledger's document is missing",
      },
    ];
  }

  const rows = parseLedgerTable(readFileSync(abs, "utf8"));
  /** @type {Finding[]} */
  const findings = [];

  if (rows.length !== ledger.rows.length) {
    findings.push({
      path: LEDGER_DOC,
      level: "fail",
      message: `ledger table has ${rows.length} rows, ${LEDGER_FILE} has ${ledger.rows.length}`,
    });
  }

  ledger.rows.forEach((expected, i) => {
    const actual = rows[i];
    if (!actual) return;
    if (actual.id !== expected.id) {
      findings.push({
        path: LEDGER_DOC,
        level: "fail",
        message: `row ${i + 1} is ${actual.id}, ${LEDGER_FILE} has ${expected.id} — the table is generated from the ledger and keeps its order`,
      });
      return;
    }
    if (actual.utility !== expected.utility) {
      findings.push({
        path: LEDGER_DOC,
        level: "fail",
        message: `${actual.id}: utility reads "${actual.utility}", ${LEDGER_FILE} says "${expected.utility}"`,
      });
    }
    if (actual.cause !== expected.cause) {
      findings.push({
        path: LEDGER_DOC,
        level: "fail",
        message: `${actual.id}: cause reads "${actual.cause}", ${LEDGER_FILE} says "${expected.cause}"`,
      });
    }
  });

  return findings;
}

/**
 * Rule 5: a claim the ledger has recorded as false stays out of the documentation.
 *
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditForbiddenClaims(root = repoRoot()) {
  const ledger = loadLedger(root);
  /** @type {Finding[]} */
  const findings = [];

  for (const rel of trackedMarkdownPaths(root)) {
    if (rel === LEDGER_DOC) continue;
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const lines = readFileSync(abs, "utf8").split("\n");
    for (const claim of ledger.forbiddenClaims) {
      const needle = claim.pattern.toLowerCase();
      lines.forEach((line, i) => {
        if (!line.toLowerCase().includes(needle)) return;
        findings.push({
          path: rel,
          level: "fail",
          message: `line ${i + 1}: "${claim.pattern}" — ${claim.why}`,
        });
      });
    }
  }

  return findings;
}

/**
 * Read the first markdown table whose header row starts with a "Row" column.
 *
 * @param {string} text
 * @returns {{ id: string; utility: string; cause: string }[]}
 */
function parseLedgerTable(text) {
  const lines = text.split("\n");
  const header = lines.findIndex((line) => /^\|\s*Row\s*\|/.test(line));
  if (header === -1) return [];

  /** @type {{ id: string; utility: string; cause: string }[]} */
  const rows = [];
  for (let i = header + 2; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) break;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((cell) => cell.trim());
    if (cells.length < 3) break;
    rows.push({
      id: cells[0].replace(/`/g, "").trim(),
      utility: cells[1].trim(),
      cause: cells[2].replace(/[`*]/g, "").trim(),
    });
  }
  return rows;
}

export { LEDGER_DOC, LEDGER_FILE };
