import fs from "node:fs";
import path from "node:path";
import { parse } from "@typescript-eslint/parser";
import { ROOT } from "./lib.mjs";

/**
 * Turn a file-and-line report into a file-and-symbol one.
 *
 * ESLint reports positions. Positions move: reformat a file, add an import, and
 * every finding below the change is a different finding as far as any diff is
 * concerned, which makes a trend line about editing rather than about quality.
 * A symbol path survives all of that — `Link.establish` is `Link.establish`
 * wherever it sits in the file.
 *
 * Anchors are best-effort by construction. An anonymous callback passed inline
 * has no name to find, so it gets its enclosing path plus a positional
 * discriminator, which is still more stable than a bare line number.
 */
const FUNCTION_TYPES = new Set([
  "FunctionDeclaration",
  "FunctionExpression",
  "ArrowFunctionExpression",
  "TSDeclareFunction",
]);

const cache = new Map();

/** @param {string} file */
function functionsIn(file) {
  if (cache.has(file)) return cache.get(file);
  let entries;
  try {
    const source = fs.readFileSync(path.join(ROOT, file), "utf8");
    const ast = parse(source, {
      loc: true,
      range: true,
      jsx: file.endsWith(".tsx") || file.endsWith(".jsx"),
      errorOnUnknownASTType: false,
    });
    entries = collect(ast);
  } catch {
    // A file the parser cannot read is one this pass has no anchor for. The
    // finding still gets reported, keyed by position alone.
    entries = [];
  }
  cache.set(file, entries);
  return entries;
}

/** @param {object} ast */
function collect(ast) {
  const found = [];
  const walk = (node, parent, trail) => {
    if (node === null || typeof node !== "object") return;
    if (Array.isArray(node)) {
      for (const child of node) walk(child, parent, trail);
      return;
    }
    if (typeof node.type !== "string") return;
    let next = trail;
    if (FUNCTION_TYPES.has(node.type)) {
      next = [...trail, nameOf(node, parent, trail)];
      found.push({
        line: node.loc.start.line,
        column: node.loc.start.column,
        path: next.join(" > "),
      });
    } else if (
      node.type === "ClassDeclaration" ||
      node.type === "ClassExpression"
    ) {
      next = [...trail, node.id?.name ?? "(anonymous class)"];
    }
    for (const key of Object.keys(node)) {
      if (key === "parent" || key === "loc" || key === "range") continue;
      walk(node[key], node, next);
    }
  };
  walk(ast, null, []);
  return found;
}

/** @param {object} node @param {object | null} parent @param {string[]} trail */
function nameOf(node, parent, trail) {
  if (node.id?.name) return node.id.name;
  if (parent) {
    if (parent.type === "VariableDeclarator" && parent.id?.name)
      return parent.id.name;
    if (
      (parent.type === "MethodDefinition" ||
        parent.type === "Property" ||
        parent.type === "PropertyDefinition") &&
      parent.key
    )
      return parent.key.name ?? parent.key.value ?? "(computed)";
  }
  return `(anonymous@${trail.length})`;
}

/**
 * The symbol path covering a reported position.
 *
 * Prefers a function whose declaration starts on the reported line — which is
 * what ESLint points at for a function-level rule — and otherwise falls back to
 * the innermost function that starts at or above it.
 *
 * @param {string} file
 * @param {number} line
 * @returns {string | null}
 */
export function symbolAt(file, line) {
  const entries = functionsIn(file);
  if (entries.length === 0) return null;
  const exact = entries.filter((entry) => entry.line === line);
  if (exact.length > 0)
    return exact.reduce((a, b) => (a.path.length >= b.path.length ? a : b))
      .path;
  const above = entries.filter((entry) => entry.line <= line);
  if (above.length === 0) return null;
  return above.reduce((a, b) => (a.line >= b.line ? a : b)).path;
}
