import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { loadAllRegisterRows } from "../doc-audit/register.mjs";
import { CHECKS_FILE, gateStatus } from "../checks/status.mjs";
import {
  byColumn,
  cellsOf,
  formatText,
  isRegisterTable,
  parseTables,
} from "./table.mjs";

/**
 * Work classes in priority order. The order of this array *is* the policy:
 * a red gate first, then release gates, then bugs, then code-quality work, then
 * docs, then new features. `work:next` never returns a feature while an
 * unblocked bug exists.
 *
 * `broken-gate` outranks even the release gates because a tree that fails its
 * own checks cannot produce evidence anyone should trust — soaking it spends
 * days of wall-clock qualifying a revision already known to be broken. These
 * items are derived from {@link CHECKS_FILE}, never hand-filed; see
 * {@link derivedGateItems}.
 */
export const TYPES = [
  "broken-gate",
  "release-gate",
  "bug",
  "quality",
  "docs",
  "feature",
];

/** @type {Map<string, number>} */
export const TYPE_RANK = new Map(TYPES.map((type, index) => [type, index]));

/** Statuses `work:next` will propose. `planned` and `deferred` are listed, not proposed. */
export const ACTIONABLE_STATUSES = new Set(["open"]);

/** Every status the registers may carry; mirrors scripts/doc-audit/register.mjs. */
export const STATUSES = new Set(["done", "open", "planned", "deferred"]);

export const METADATA_FILE = "work/metadata.json";
export const RESOURCES_FILE = "work/resources.json";
export const HISTORY_FILE = "work/history.jsonl";

/**
 * @typedef {object} WorkMeta
 * @property {string} type
 * @property {string[]} requires
 * @property {string} verify
 * @property {string} added
 * @property {string} [completed]
 * @property {string[]} [evidence]
 * @property {string} [notes]
 */

/**
 * @typedef {object} WorkItem
 * @property {string} id
 * @property {string} status
 * @property {string} file
 * @property {number} line
 * @property {string} title
 * @property {string} type
 * @property {string[]} requires
 * @property {string} verify
 * @property {string} added
 * @property {string} [completed]
 * @property {string[]} [evidence]
 * @property {string} [notes]
 * @property {boolean} [derived] computed from machine output, not a register
 *   row; cannot be closed or retyped by hand
 * @property {Blocker[]} blockers
 * @property {number} unblocks
 */

/**
 * @typedef {object} Blocker
 * @property {"item" | "resource" | "missing"} kind
 * @property {string} ref
 * @property {string} reason
 */

/**
 * @param {string} file
 * @param {unknown} fallback
 * @returns {any}
 */
export function readJson(file, fallback) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    if (fallback !== undefined && error.code === "ENOENT") return fallback;
    throw error;
  }
}

/**
 * Canonical serialization: sorted IDs and a fixed key order, then handed to
 * prettier for whitespace so the file satisfies `npm run format:check` like
 * every other JSON in the repo instead of needing a .prettierignore exemption.
 * Determinism here is what makes `work/metadata.json` diff cleanly and lets
 * `work:check` detect hand-edits that drift from canonical form.
 * @param {any} metadata
 * @param {string} root
 * @returns {string}
 */
export function canonicalMetadata(metadata, root = repoRoot()) {
  return formatText(canonicalStructure(metadata), METADATA_FILE, root);
}

/**
 * @param {any} metadata
 * @returns {string}
 */
function canonicalStructure(metadata) {
  const order = [
    "type",
    "requires",
    "verify",
    "added",
    "completed",
    "evidence",
    "notes",
  ];
  /** @type {Record<string, any>} */
  const items = {};
  for (const id of Object.keys(metadata.items ?? {}).sort()) {
    const entry = metadata.items[id];
    /** @type {Record<string, any>} */
    const next = {};
    for (const key of order) {
      if (entry[key] !== undefined) next[key] = entry[key];
    }
    for (const key of Object.keys(entry).sort()) {
      if (!order.includes(key)) next[key] = entry[key];
    }
    items[id] = next;
  }
  return `${JSON.stringify({ version: metadata.version ?? 1, items }, null, 2)}\n`;
}

/**
 * @param {string} file
 * @param {string} text
 */
export function writeText(file, text) {
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
}

/**
 * @param {string} root
 * @returns {{ version: number; items: Record<string, WorkMeta> }}
 */
export function loadMetadata(root = repoRoot()) {
  return readJson(join(root, METADATA_FILE), { version: 1, items: {} });
}

/**
 * @param {string} root
 * @returns {{ version: number; resources: Record<string, { available: boolean; note?: string }> }}
 */
export function loadResources(root = repoRoot()) {
  return readJson(join(root, RESOURCES_FILE), { version: 1, resources: {} });
}

/**
 * @param {any} metadata
 * @param {string} root
 */
export function saveMetadata(metadata, root = repoRoot()) {
  writeText(join(root, METADATA_FILE), canonicalMetadata(metadata, root));
}

/**
 * Turn a gate id into a register ID: `coverage` becomes `GATE-COVERAGE`.
 * @param {string} id
 * @returns {string}
 */
export function gateItemId(id) {
  return `GATE-${id.toUpperCase().replace(/[^A-Z0-9]+/g, "-")}`;
}

/**
 * Work items for the gates that are currently red, derived from
 * {@link CHECKS_FILE} rather than filed by hand.
 *
 * Derivation is the point. A hand-filed row can be typed as something milder,
 * left open after the fix, or closed while the gate is still red — all three
 * have happened. A derived item appears the moment the gate goes red and
 * disappears the moment it goes green, so the only way to clear it is to fix
 * the check. `work:done` and `work:retype` refuse them for the same reason.
 *
 * Gates with an active waiver are excluded: the waiver is the recorded decision
 * not to treat that failure as the top of the queue, and it expires on its own.
 * @param {string} root
 * @param {Date} [now]
 * @returns {WorkItem[]}
 */
export function derivedGateItems(root = repoRoot(), now = new Date()) {
  const { blocking } = gateStatus(root, { now });
  // PR-tier gates only. Release-tier gates (the advisory reconciliation) have
  // to be green before a soak starts, not before every other piece of work —
  // a dependency advisory with no upstream fix would otherwise sit at the head
  // of the queue indefinitely, which is the failure this rule exists to avoid.
  // The soak guard is where they bite; see assertGatesGreen.
  return blocking
    .filter((gate) => gate.tier === "pr")
    .map((gate) => ({
      id: gateItemId(gate.id),
      status: "open",
      file: CHECKS_FILE,
      line: 1,
      title: `${gate.title} is red${
        gate.detail ? ` — ${gate.detail.slice(0, 120)}` : ""
      }`,
      type: "broken-gate",
      requires: [],
      verify: gate.command,
      added: gate.since ?? "",
      notes:
        [
          gate.detail,
          gate.waiver === "expired"
            ? `waiver expired ${gate.waiverRecord?.expires}: ${gate.waiverRecord?.reason}`
            : "",
        ]
          .filter(Boolean)
          .join(" — ") || undefined,
      derived: true,
      blockers: [],
      unblocks: 0,
    }));
}

/**
 * Join register rows (ID, status, location) with sidecar metadata (type,
 * prerequisites, verify command) and compute blocking and unblock counts.
 * Red gates are folded in from {@link derivedGateItems}; everything else comes
 * from a register row.
 * @param {string} root
 * @returns {{ items: WorkItem[]; index: Map<string, WorkItem>; orphans: string[] }}
 */
export function loadWork(root = repoRoot()) {
  const rows = loadAllRegisterRows(root);
  const metadata = loadMetadata(root);
  const resources = loadResources(root).resources ?? {};
  const titles = loadTitles(root, rows);

  /** @type {WorkItem[]} */
  const items = [];
  for (const row of rows) {
    const meta = metadata.items[row.id];
    items.push({
      ...row,
      title: titles.get(row.id) ?? row.id,
      type: meta?.type ?? "",
      requires: meta?.requires ?? [],
      verify: meta?.verify ?? "",
      added: meta?.added ?? "",
      completed: meta?.completed,
      evidence: meta?.evidence,
      notes: meta?.notes,
      blockers: [],
      unblocks: 0,
    });
  }

  items.push(...derivedGateItems(root));

  /** @type {Map<string, WorkItem>} */
  const index = new Map(items.map((item) => [item.id, item]));
  const orphans = Object.keys(metadata.items).filter((id) => !index.has(id));

  for (const item of items) {
    item.blockers = blockersFor(item, index, resources);
  }
  assignUnblockCounts(items, index);

  return { items, index, orphans };
}

/**
 * Registers name the human-readable column differently: STATUS-SOFTWARE and
 * STATUS-COMPLETE use "Item", RELEASE-PLAN uses "Gate", STATUS-HARDWARE uses
 * "Needs". Read whichever the table declares.
 * @param {string} root
 * @param {{ id: string; file: string }[]} rows
 * @returns {Map<string, string>}
 */
function loadTitles(root, rows) {
  const columns = ["Item", "Gate", "Needs"];
  /** @type {Map<string, string>} */
  const titles = new Map();

  for (const file of new Set(rows.map((row) => row.file))) {
    const text = readFileSync(join(root, file), "utf8");
    const lines = text.split("\n");
    for (const table of parseTables(text)) {
      if (!isRegisterTable(table)) continue;
      const column = columns.find((name) => table.columns.includes(name));
      if (!column) continue;
      for (let i = table.start + 2; i < table.end; i++) {
        const cells = byColumn(cellsOf(lines[i]), table.columns);
        if (cells.ID) {
          titles.set(cells.ID, cells[column].replace(/\*\*/g, "").trim());
        }
      }
    }
  }
  return titles;
}

/**
 * @param {WorkItem} item
 * @param {Map<string, WorkItem>} index
 * @param {Record<string, { available: boolean; note?: string }>} resources
 * @returns {Blocker[]}
 */
export function blockersFor(item, index, resources) {
  /** @type {Blocker[]} */
  const blockers = [];
  for (const ref of item.requires) {
    if (ref.startsWith("res:")) {
      const token = ref.slice(4);
      const resource = resources[token];
      if (!resource) {
        blockers.push({
          kind: "missing",
          ref,
          reason: `undeclared resource ${token}`,
        });
      } else if (!resource.available) {
        blockers.push({
          kind: "resource",
          ref,
          reason: resource.note ? `needs ${resource.note}` : `needs ${token}`,
        });
      }
      continue;
    }
    const dependency = index.get(ref);
    if (!dependency) {
      blockers.push({ kind: "missing", ref, reason: `unknown item ${ref}` });
    } else if (dependency.status !== "done") {
      blockers.push({
        kind: "item",
        ref,
        reason: `${ref} is ${dependency.status}`,
      });
    }
  }
  return blockers;
}

/**
 * Count how many not-yet-done items each item transitively unblocks. Used as the
 * first tiebreaker in `work:next`, so work that frees the most other work wins.
 * @param {WorkItem[]} items
 * @param {Map<string, WorkItem>} index
 */
function assignUnblockCounts(items, index) {
  /** @type {Map<string, Set<string>>} */
  const dependents = new Map();
  for (const item of items) {
    for (const ref of item.requires) {
      if (ref.startsWith("res:")) continue;
      if (!dependents.has(ref)) dependents.set(ref, new Set());
      dependents.get(ref).add(item.id);
    }
  }
  for (const item of items) {
    const seen = new Set();
    const queue = [...(dependents.get(item.id) ?? [])];
    while (queue.length > 0) {
      const id = queue.pop();
      if (seen.has(id)) continue;
      seen.add(id);
      for (const next of dependents.get(id) ?? []) queue.push(next);
    }
    item.unblocks = [...seen].filter(
      (id) => index.get(id)?.status !== "done",
    ).length;
  }
}

/**
 * Deterministic ordering: class, then unblock count, then age, then ID.
 * Every step is total, so `work:next` never depends on file order.
 * @param {WorkItem} a
 * @param {WorkItem} b
 * @returns {number}
 */
export function compareItems(a, b) {
  const rankA = TYPE_RANK.get(a.type) ?? TYPES.length;
  const rankB = TYPE_RANK.get(b.type) ?? TYPES.length;
  if (rankA !== rankB) return rankA - rankB;
  if (a.unblocks !== b.unblocks) return b.unblocks - a.unblocks;
  if (a.added !== b.added) return a.added < b.added ? -1 : 1;
  return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
}

/**
 * @param {WorkItem} item
 * @returns {boolean}
 */
export function isActionable(item) {
  return ACTIONABLE_STATUSES.has(item.status) && item.blockers.length === 0;
}

/**
 * @param {WorkItem[]} items
 * @returns {WorkItem[]}
 */
export function ranked(items) {
  return [...items].sort(compareItems);
}

/**
 * Detect prerequisite cycles. A cycle would make every item in it permanently
 * blocked, which reads as "nothing to do" rather than as an error.
 * @param {Map<string, WorkItem>} index
 * @returns {string[]}
 */
export function findCycles(index) {
  /** @type {string[]} */
  const cycles = [];
  const state = new Map();
  /** @type {string[]} */
  const stack = [];

  /** @param {string} id */
  function visit(id) {
    if (state.get(id) === "done") return;
    if (state.get(id) === "open") {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id].join(" -> "));
      return;
    }
    state.set(id, "open");
    stack.push(id);
    for (const ref of index.get(id)?.requires ?? []) {
      if (ref.startsWith("res:")) continue;
      if (index.has(ref)) visit(ref);
    }
    stack.pop();
    state.set(id, "done");
  }

  for (const id of index.keys()) visit(id);
  return [...new Set(cycles)];
}
