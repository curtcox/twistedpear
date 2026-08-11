import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo-root.mjs";
import { REGISTER_FILES } from "./paths.mjs";

/** @typedef {{ id: string; status: string; file: string; line: number }} RegisterRow */

const VALID_STATUS = new Set(["done", "open", "planned", "deferred"]);

/**
 * @param {string} text
 * @param {string} file
 * @returns {RegisterRow[]}
 */
export function parseRegisterRows(text, file) {
  /** @type {RegisterRow[]} */
  const rows = [];
  const lines = text.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.startsWith("|")) continue;
    if (/^\|[-| :]+\|$/.test(line.trim())) continue;
    const cells = line
      .split("|")
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 3) continue;
    if (cells[0] === "ID" || cells[0] === "Item") continue;
    if (!VALID_STATUS.has(cells[1])) continue;
    rows.push({ id: cells[0], status: cells[1], file, line: i + 1 });
  }
  return rows;
}

/**
 * @param {string} root
 * @returns {RegisterRow[]}
 */
export function loadAllRegisterRows(root = repoRoot()) {
  /** @type {RegisterRow[]} */
  const all = [];
  for (const rel of REGISTER_FILES) {
    const text = readFileSync(join(root, rel), "utf8");
    all.push(...parseRegisterRows(text, rel));
  }
  return all;
}

/**
 * @param {string} root
 * @returns {{ conflicts: string[]; warnings: string[] }}
 */
export function auditRegisterConsistency(root = repoRoot()) {
  const rows = loadAllRegisterRows(root);
  /** @type {Map<string, RegisterRow[]>} */
  const byId = new Map();
  for (const row of rows) {
    if (!byId.has(row.id)) byId.set(row.id, []);
    byId.get(row.id).push(row);
  }

  /** @type {string[]} */
  const conflicts = [];
  /** @type {string[]} */
  const warnings = [];

  for (const [id, group] of byId) {
    const statuses = new Set(group.map((r) => r.status));
    if (statuses.size > 1) {
      conflicts.push(
        `${id}: conflicting statuses ${[...statuses].join(", ")} (${group
          .map((r) => `${r.file}:${r.line}`)
          .join("; ")})`,
      );
    }
    const done = group.some((r) => r.status === "done");
    const open = group.some((r) => r.status === "open");
    if (done && open) {
      conflicts.push(`${id}: marked done and open across registers`);
    }
  }

  return { conflicts, warnings };
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function findVitestRegisterTodos(root = repoRoot()) {
  let raw;
  try {
    raw = execSync(
      'rg -o "register:[A-Za-z0-9-]+" conformance packages --glob "*.test.mjs" --glob "*.test.ts" 2>/dev/null || true',
      { cwd: root, encoding: "utf8", shell: "/bin/bash" },
    );
  } catch {
    return [];
  }
  /** @type {string[]} */
  const ids = [];
  for (const line of raw.split("\n")) {
    const m = line.match(/register:([A-Za-z0-9-]+)/);
    if (m) ids.push(m[1]);
  }
  return ids;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function auditTodoMarkers(root = repoRoot()) {
  const rows = loadAllRegisterRows(root);
  const todoIds = new Set(findVitestRegisterTodos(root));
  /** @type {string[]} */
  const problems = [];

  for (const row of rows) {
    if (row.status === "done" && todoIds.has(row.id)) {
      problems.push(
        `${row.id} is done in register but still has register:${row.id} todo`,
      );
    }
  }

  for (const row of rows) {
    if (row.status !== "open") continue;
    if (
      row.id.startsWith("H") &&
      !todoIds.has(row.id) &&
      !row.id.includes("-")
    ) {
      continue;
    }
    if (/^H\d+-/.test(row.id) && !todoIds.has(row.id)) {
      problems.push(
        `warn: open ${row.id} has no register:${row.id} vitest todo`,
      );
    }
  }

  return problems;
}
