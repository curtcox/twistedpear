import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { spawnSync } from "node:child_process";
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
import { effortOf, ratchetFileCounts } from "./effort.mjs";

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
 * @property {boolean} [unattended] true when the work is a wait (a soak, a
 *   long run) rather than something that needs a person's attention now
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
 * @property {boolean} [unattended]
 * @property {boolean} [derived] computed from machine output, not a register
 *   row; cannot be closed or retyped by hand
 * @property {Blocker[]} blockers
 * @property {number} unblocks
 * @property {number} [effort] remaining files for a ratchet-imported item,
 *   otherwise 1. Smaller ranks first within a class.
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
    "unattended",
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
 * The one derived id that is not a gate. No gate may be called `unverified`,
 * so it cannot collide; `validateMetadataShape` already refuses the whole
 * `GATE-` namespace to hand-filed rows.
 */
export const UNVERIFIED_ITEM_ID = gateItemId("unverified");

/**
 * HEAD, or "" when it cannot be resolved — a fixture directory that is not a
 * git repo, or a tarball checkout. An unknown HEAD disables the unverified
 * check rather than failing the whole queue: not knowing which commit you are
 * on is not evidence that the record is wrong.
 * @param {string} root
 * @returns {string}
 */
export function headCommit(root = repoRoot()) {
  const result = spawnSync("git", ["rev-parse", "HEAD"], {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "ignore"],
  });
  return result.status === 0 ? (result.stdout ?? "").trim() : "";
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
 *
 * A recorded green from another commit derives {@link unverifiedGateItem}
 * instead of nothing at all. Silence there was the hole this rule had: gates
 * that only ever run in CI could go red for a week and the queue would keep
 * reporting a clean tree from whatever the last local run happened to say.
 * @param {string} root
 * @param {Date} [now]
 * @param {string} [head]
 * @returns {WorkItem[]}
 */
export function derivedGateItems(
  root = repoRoot(),
  now = new Date(),
  head = headCommit(root),
) {
  const { blocking, unverified, measuredCommit, measuredAt } = gateStatus(
    root,
    { now, head },
  );
  const red = new Set(blocking.map((gate) => gate.id));
  // PR-tier gates only. Release-tier gates (the advisory reconciliation) have
  // to be green before a soak starts, not before every other piece of work —
  // a dependency advisory with no upstream fix would otherwise sit at the head
  // of the queue indefinitely, which is the failure this rule exists to avoid.
  // The soak guard is where they bite; see assertGatesGreen.
  const items = blocking
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
      effort: 1,
    }));

  // Only gates that are not already red on their own account: a gate reported
  // red from an older commit is still worth fixing, and saying so twice would
  // just push the real item down the list.
  const pending = unverified.filter((gate) => !red.has(gate.id));
  if (pending.length > 0) {
    items.push(
      unverifiedGateItem(
        pending,
        measuredCommit,
        head,
        measuredAt.slice(0, 10),
      ),
    );
  }
  return items;
}

/**
 * The single item that stands for "nobody has measured this commit".
 *
 * One item, not one per gate. Twenty-five identical rows saying the same thing
 * would bury the queue every time a commit landed, and the fix for all of them
 * is the same command — so the queue carries the one row that names it.
 * It dates from when the record was written, not from when the gap was
 * noticed, so a gate that is *known* red — an older, more specific item —
 * still ranks ahead of "we do not know".
 * @param {{ id: string; commit?: string }[]} pending
 * @param {string} measuredCommit
 * @param {string} head
 * @param {string} measuredDay
 * @returns {WorkItem}
 */
function unverifiedGateItem(pending, measuredCommit, head, measuredDay) {
  const at = (measuredCommit || pending[0].commit || "").slice(0, 12);
  const detail = `${pending.length} gate${pending.length === 1 ? "" : "s"} last measured ${
    at ? `at ${at}` : "at an unrecorded commit"
  }, not ${head.slice(0, 12)}`;
  return {
    id: UNVERIFIED_ITEM_ID,
    status: "open",
    file: CHECKS_FILE,
    line: 1,
    title: `Gate results do not describe this commit — ${detail}`,
    type: "broken-gate",
    requires: [],
    verify: "npm run checks:status",
    added: measuredDay,
    notes: `${detail}. A green recorded elsewhere is not evidence for this tree; re-run the gates, or import what CI already measured with npm run checks:status:import.`,
    derived: true,
    blockers: [],
    unblocks: 0,
    effort: 1,
  };
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
  const ratchetFiles = ratchetFileCounts(root);

  /** @type {WorkItem[]} */
  const items = [];
  for (const row of rows) {
    const meta = metadata.items[row.id];
    const verify = meta?.verify ?? "";
    items.push({
      ...row,
      title: titles.get(row.id) ?? row.id,
      type: meta?.type ?? "",
      requires: meta?.requires ?? [],
      verify,
      added: meta?.added ?? "",
      completed: meta?.completed,
      evidence: meta?.evidence,
      notes: meta?.notes,
      unattended: meta?.unattended === true,
      blockers: [],
      unblocks: 0,
      effort: effortOf({ verify }, ratchetFiles),
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
 * @param {string | number} left
 * @param {string | number} right
 * @returns {number}
 */
function cmp(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

/**
 * Deterministic ordering: class, then unblock count, then effort (smaller
 * first), then age, then ID. Every step is total, so `work:next` never depends
 * on file order.
 * @param {WorkItem} a
 * @param {WorkItem} b
 * @returns {number}
 */
export function compareItems(a, b) {
  return (
    cmp(
      TYPE_RANK.get(a.type) ?? TYPES.length,
      TYPE_RANK.get(b.type) ?? TYPES.length,
    ) ||
    cmp(b.unblocks, a.unblocks) ||
    cmp(a.effort ?? 1, b.effort ?? 1) ||
    cmp(a.added, b.added) ||
    cmp(a.id, b.id)
  );
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
 * The item that should get a person's attention, plus any unattended waits that
 * outrank it and should be started first.
 *
 * Unattended items (plan-duration soaks) are real work, but they are waits:
 * one command starts them and then they run for hours. Ranking them as the
 * next thing to *do* hides the hands-on item behind a queue of idle soaks.
 * A red gate still wins outright — soaks must not start while checks are red.
 * @param {WorkItem[]} candidates already-unblocked items
 * @returns {{ pick: WorkItem | null; start: WorkItem[]; then: WorkItem | null }}
 */
export function nextAttention(candidates) {
  const ordered = ranked(candidates);
  const handsOn = ordered.filter((item) => item.unattended !== true);
  const waiting = ordered.filter((item) => item.unattended === true);
  if (handsOn.length === 0) {
    return { pick: ordered[0] ?? null, start: waiting, then: null };
  }
  const then = handsOn[0];
  const start = waiting.filter((item) => compareItems(item, then) < 0);
  return { pick: then, start, then };
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
