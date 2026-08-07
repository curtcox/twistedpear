import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { parseRegisterRows } from "../doc-audit/register.mjs";
import { REGISTER_FILES } from "../doc-audit/paths.mjs";
import { HISTORY_FILE } from "./lib.mjs";

export const ACTIONS = new Set([
  "epoch",
  "add",
  "close",
  "reopen",
  "retype",
  "requires",
  "resource",
]);

/**
 * @typedef {object} JournalEvent
 * @property {string} at ISO-8601 timestamp
 * @property {string} actor
 * @property {string} action
 * @property {string} id
 * @property {string} [from]
 * @property {string} [to]
 * @property {string} [type]
 * @property {string} [verify]
 * @property {boolean} [verified]
 * @property {number} [exit]
 * @property {number} [durationMs]
 * @property {string} [log]
 * @property {string[]} [evidence]
 * @property {string} [reason]
 */

/** @returns {string} */
export function currentActor() {
  const configured = spawnSync("git", ["config", "user.name"], {
    encoding: "utf8",
  });
  const name = configured.stdout?.trim();
  return name || process.env.USER || "unknown";
}

/**
 * Append one event. The journal is the durable per-item record: closing an item
 * moves its row between register files, which git sees as a delete plus an
 * unrelated add, so `git blame` cannot follow an item across its own lifecycle.
 * @param {JournalEvent} event
 * @param {string} root
 */
export function appendEvent(event, root = repoRoot()) {
  const path = join(root, HISTORY_FILE);
  mkdirSync(dirname(path), { recursive: true });
  const ordered = {
    at: event.at ?? new Date().toISOString(),
    actor: event.actor ?? currentActor(),
    action: event.action,
    id: event.id,
    ...event,
  };
  appendFileSync(path, `${JSON.stringify(ordered)}\n`);
}

/**
 * @param {string} root
 * @returns {JournalEvent[]}
 */
export function readJournal(root = repoRoot()) {
  const path = join(root, HISTORY_FILE);
  if (!existsSync(path)) return [];
  /** @type {JournalEvent[]} */
  const events = [];
  const lines = readFileSync(path, "utf8").split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    try {
      events.push({ ...JSON.parse(line), line: i + 1 });
    } catch {
      events.push({ malformed: true, line: i + 1, raw: line });
    }
  }
  return events;
}

/**
 * The journal claims to be append-only; this is what makes the claim checkable.
 * The committed copy must be a byte prefix of the working copy, so a rewritten
 * or truncated history fails rather than quietly replacing the record.
 * @param {string} root
 * @returns {string[]}
 */
export function auditAppendOnly(root = repoRoot()) {
  const committed = spawnSync("git", ["show", `HEAD:${HISTORY_FILE}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  if (committed.status !== 0) return [];
  const path = join(root, HISTORY_FILE);
  const working = existsSync(path) ? readFileSync(path, "utf8") : "";
  if (working.startsWith(committed.stdout)) return [];
  return [
    `${HISTORY_FILE}: committed history is not a prefix of the working copy — entries were rewritten or removed`,
  ];
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function auditJournalShape(root = repoRoot()) {
  const events = readJournal(root);
  /** @type {string[]} */
  const problems = [];
  let previous = "";

  for (const event of events) {
    const at = `${HISTORY_FILE}:${event.line}`;
    if (event.malformed) {
      problems.push(`${at}: not valid JSON`);
      continue;
    }
    for (const key of ["at", "actor", "action", "id"]) {
      if (typeof event[key] !== "string" || !event[key]) {
        problems.push(`${at}: missing "${key}"`);
      }
    }
    if (event.action && !ACTIONS.has(event.action)) {
      problems.push(`${at}: unknown action "${event.action}"`);
    }
    if (event.at && Number.isNaN(Date.parse(event.at))) {
      problems.push(`${at}: "at" is not a valid timestamp`);
    } else if (event.at && previous && event.at < previous) {
      problems.push(`${at}: timestamp goes backwards (after ${previous})`);
    }
    if (event.at) previous = event.at;
  }

  return problems;
}

/**
 * Reconcile the journal against the registers. This is the check that gives the
 * AGENTS.md rule ("do not change status registers merely to make a test pass")
 * a mechanism: a hand-flipped open -> done row has no closing event to back it.
 * @param {Map<string, import("./lib.mjs").WorkItem>} index
 * @param {string} root
 * @returns {string[]}
 */
export function auditJournalAgainstRegisters(index, root = repoRoot()) {
  const events = readJournal(root).filter((event) => !event.malformed);
  if (events.length === 0) return [];

  /** @type {Map<string, string>} */
  const lastStatus = new Map();
  /** @type {string[]} */
  const problems = [];
  const epochs = events.filter((event) => event.action === "epoch");
  const epoch = epochs[0] ?? null;
  const grandfathered = new Set(epoch?.grandfathered ?? []);

  if (!epoch) {
    problems.push(
      `${HISTORY_FILE}: no "epoch" event — the items that were already done when the journal started must be declared once`,
    );
  }
  if (epochs.length > 1) {
    problems.push(
      `${HISTORY_FILE}:${epochs[1].line}: a second epoch event — the grandfather list may only be declared once`,
    );
  }
  const firstClose = events.find((event) => event.action === "close");
  if (epoch && firstClose && firstClose.line < epoch.line) {
    problems.push(
      `${HISTORY_FILE}:${epoch.line}: epoch declared after ${firstClose.id} was closed — grandfathering must precede any close`,
    );
  }
  if (epoch) problems.push(...auditEpochAgainstGit(epoch, root));

  for (const event of events) {
    if (event.action === "epoch") continue;
    if (!index.has(event.id) && event.action !== "resource") {
      problems.push(
        `${HISTORY_FILE}:${event.line}: event for unknown item ${event.id}`,
      );
      continue;
    }
    if (event.action === "add") lastStatus.set(event.id, event.to ?? "open");
    if (event.action === "close") lastStatus.set(event.id, "done");
    if (event.action === "reopen") lastStatus.set(event.id, event.to ?? "open");
  }

  for (const [id, status] of lastStatus) {
    const item = index.get(id);
    if (!item) continue;
    if (status === "done" && item.status !== "done") {
      problems.push(
        `${id}: journal records a close but the register says "${item.status}"`,
      );
    }
    if (status !== "done" && item.status === "done") {
      problems.push(
        `${id}: register says done but the journal's last event is "${status}" — close it with npm run work:done`,
      );
    }
  }

  for (const item of index.values()) {
    if (item.status !== "done") continue;
    if (lastStatus.has(item.id)) continue;
    if (grandfathered.has(item.id)) continue;
    problems.push(
      `${item.id}: marked done in ${item.file} with no closing journal event`,
    );
  }

  return problems;
}

/**
 * Anchor the grandfather list to committed history. Every exempted item must
 * already read `done` in the registers at the recorded commit, so the list
 * cannot be stretched to cover work that was hand-flipped later — which a
 * date-based or position-based exemption could not prevent.
 * @param {JournalEvent} epoch
 * @param {string} root
 * @returns {string[]}
 */
function auditEpochAgainstGit(epoch, root) {
  const at = `${HISTORY_FILE}:${epoch.line}`;
  if (!epoch.commit) {
    return [`${at}: epoch does not record the commit it was declared against`];
  }
  const ancestor = spawnSync(
    "git",
    ["merge-base", "--is-ancestor", epoch.commit, "HEAD"],
    { cwd: root, encoding: "utf8" },
  );
  if (ancestor.status !== 0) {
    return [
      `${at}: epoch commit ${epoch.commit.slice(0, 8)} is not an ancestor of HEAD`,
    ];
  }

  /** @type {string[]} */
  const problems = [];
  /** @type {Map<string, string>} */
  const wasDone = new Map();
  for (const file of REGISTER_FILES) {
    const shown = spawnSync("git", ["show", `${epoch.commit}:${file}`], {
      cwd: root,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });
    if (shown.status !== 0) continue;
    for (const row of parseRegisterRows(shown.stdout, file)) {
      wasDone.set(row.id, row.status);
    }
  }

  for (const id of epoch.grandfathered ?? []) {
    const status = wasDone.get(id);
    if (status !== "done") {
      problems.push(
        `${at}: grandfathers ${id}, but at ${epoch.commit.slice(0, 8)} it was ${status ?? "not in any register"}`,
      );
    }
  }
  return problems;
}

/**
 * Declare, once, which items were already complete when the journal started —
 * they cannot have closing events. Recorded against the current commit so the
 * claim is checkable.
 * @param {string[]} ids
 * @param {string} root
 */
export function writeEpoch(ids, root = repoRoot()) {
  for (const event of readJournal(root)) {
    if (event.action === "epoch") {
      throw new Error(`${HISTORY_FILE} already has an epoch event`);
    }
  }
  const head = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
  });
  if (head.status !== 0) throw new Error("cannot resolve HEAD");
  appendEvent(
    {
      action: "epoch",
      id: "-",
      commit: head.stdout.trim(),
      grandfathered: [...ids].sort(),
    },
    root,
  );
}
