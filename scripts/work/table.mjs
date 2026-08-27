import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../doc-audit/repo-root.mjs";

const SEPARATOR = /^\|[-| :]+\|$/;
const PRETTIER = createRequire(import.meta.url).resolve(
  "prettier/bin/prettier.cjs",
);

/**
 * @typedef {object} Table
 * @property {string[]} columns
 * @property {number} headerIndex
 * @property {number} start
 * @property {number} end exclusive
 * @property {string} heading nearest preceding markdown heading
 */

/**
 * @param {string} line
 * @returns {string[]}
 */
export function cellsOf(line) {
  return line
    .split("|")
    .slice(1, -1)
    .map((cell) => cell.trim());
}

/**
 * @param {string[]} cells
 * @returns {string}
 */
export function rowOf(cells) {
  return `| ${cells.join(" | ")} |`;
}

/**
 * Split a markdown document into its pipe tables. Prettier owns the column
 * widths, so every writer here emits unaligned rows and re-formats afterwards.
 * @param {string} text
 * @returns {Table[]}
 */
export function parseTables(text) {
  const lines = text.split("\n");
  /** @type {Table[]} */
  const tables = [];
  let heading = "";

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("#")) {
      heading = lines[i].replace(/^#+\s*/, "").trim();
      continue;
    }
    if (!lines[i].startsWith("|")) continue;
    const start = i;
    let end = i;
    while (end < lines.length && lines[end].startsWith("|")) end++;
    if (end - start >= 2 && SEPARATOR.test(lines[start + 1].trim())) {
      tables.push({
        columns: cellsOf(lines[start]),
        headerIndex: start,
        start,
        end,
        heading,
      });
    }
    i = end;
  }

  return tables;
}

/**
 * @param {Table} table
 * @returns {boolean}
 */
export function isRegisterTable(table) {
  return table.columns[0] === "ID" && table.columns[1] === "Status";
}

/**
 * @param {string} text
 * @param {string} id
 * @returns {{ table: Table; index: number; cells: string[] } | null}
 */
export function findRow(text, id) {
  const lines = text.split("\n");
  for (const table of parseTables(text)) {
    if (!isRegisterTable(table)) continue;
    for (let i = table.start + 2; i < table.end; i++) {
      const cells = cellsOf(lines[i]);
      if (cells[0] === id) return { table, index: i, cells };
    }
  }
  return null;
}

/**
 * @param {string} text
 * @param {string} id
 * @param {string} column
 * @param {string} value
 * @returns {string}
 */
export function setCell(text, id, column, value) {
  const found = findRow(text, id);
  if (!found) throw new Error(`no register row for ${id}`);
  const at = found.table.columns.indexOf(column);
  if (at < 0) throw new Error(`table has no "${column}" column`);
  const lines = text.split("\n");
  const cells = [...found.cells];
  cells[at] = value;
  lines[found.index] = rowOf(cells);
  return lines.join("\n");
}

/**
 * @param {string} text
 * @param {string} id
 * @returns {{ text: string; cells: string[]; columns: string[] }}
 */
export function removeRow(text, id) {
  const found = findRow(text, id);
  if (!found) throw new Error(`no register row for ${id}`);
  const lines = text.split("\n");
  lines.splice(found.index, 1);
  return {
    text: lines.join("\n"),
    cells: found.cells,
    columns: found.table.columns,
  };
}

/**
 * Append a row to a register table, filling every column of the target table
 * from `values` by column name so tables with different columns stay valid.
 * @param {string} text
 * @param {Record<string, string>} values
 * @param {string} [heading]
 * @returns {string}
 */
export function appendRow(text, values, heading) {
  const tables = parseTables(text).filter(isRegisterTable);
  const target = heading
    ? tables.find((table) => table.heading === heading)
    : tables[0];
  if (!target) {
    throw new Error(
      heading
        ? `no register table under heading "${heading}"`
        : "no register table in file",
    );
  }
  const missing = target.columns.filter((column) => !(column in values));
  if (missing.length > 0) {
    throw new Error(`missing values for column(s): ${missing.join(", ")}`);
  }
  const lines = text.split("\n");
  lines.splice(
    target.end,
    0,
    rowOf(target.columns.map((column) => values[column])),
  );
  return lines.join("\n");
}

/**
 * @param {string[]} cells
 * @param {string[]} columns
 * @returns {Record<string, string>}
 */
export function byColumn(cells, columns) {
  /** @type {Record<string, string>} */
  const out = {};
  columns.forEach((column, i) => {
    out[column] = cells[i] ?? "";
  });
  return out;
}

/**
 * @param {string} root
 * @param {string} rel
 * @returns {string}
 */
export function readDoc(root, rel) {
  return readFileSync(join(root, rel), "utf8");
}

/**
 * @param {string} root
 * @param {string} rel
 * @param {string} text
 */
export function writeDoc(root, rel, text) {
  writeFileSync(join(root, rel), text);
}

/**
 * Format a string as prettier would format that path, without touching disk.
 * Used to keep the canonical form of work/metadata.json identical to what
 * `npm run format:check` expects, rather than exempting the file.
 * @param {string} text
 * @param {string} rel
 * @param {string} root
 * @returns {string}
 */
export function formatText(text, rel, root = repoRoot()) {
  const result = spawnSync(
    process.execPath,
    [PRETTIER, "--stdin-filepath", rel],
    {
      cwd: root,
      encoding: "utf8",
      input: text,
    },
  );
  if (result.status !== 0) {
    throw new Error(`prettier failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout;
}

/**
 * Register tables are prettier-formatted and gated by `npm run format:check`,
 * so every write has to hand column alignment back to prettier.
 * @param {string[]} paths
 * @param {string} root
 */
export function formatFiles(paths, root = repoRoot()) {
  if (paths.length === 0) return;
  const result = spawnSync(process.execPath, [PRETTIER, "--write", ...paths], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`prettier failed: ${result.stderr || result.stdout}`);
  }
}
