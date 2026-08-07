import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";

/**
 * The ESLint-family ratchets share one entry format:
 * `<file>:<rule>:<message>:occurrence-<n>`. Each records debt that the ratchet
 * guarantees can only shrink, which makes it a ready-made quality backlog.
 */
export const RATCHETS = {
  lint: { file: "lint-ratchet.json", check: "npm run lint:all" },
  typed: { file: "typed-lint-ratchet.json", check: "npm run lint:typed" },
  complexity: {
    file: "complexity-ratchet.json",
    check: "npm run complexity:check",
  },
};

/**
 * @param {string} kind
 * @param {string} root
 * @returns {{ file: string; rule: string }[]}
 */
export function readEntries(kind, root = repoRoot()) {
  const spec = RATCHETS[kind];
  if (!spec) {
    throw new Error(
      `unknown ratchet "${kind}" (${Object.keys(RATCHETS).join(", ")})`,
    );
  }
  const raw = JSON.parse(readFileSync(join(root, spec.file), "utf8"));
  return (raw.entries ?? []).map((entry) => {
    const parts = String(entry).split(":");
    return { file: parts[0], rule: parts[1] ?? "" };
  });
}

/**
 * @param {string} kind
 * @param {string} root
 * @returns {{ rule: string; count: number; files: number }[]}
 */
export function groupByRule(kind, root = repoRoot()) {
  /** @type {Map<string, Set<string>>} */
  const files = new Map();
  /** @type {Map<string, number>} */
  const counts = new Map();

  for (const { file, rule } of readEntries(kind, root)) {
    counts.set(rule, (counts.get(rule) ?? 0) + 1);
    if (!files.has(rule)) files.set(rule, new Set());
    files.get(rule).add(file);
  }

  return [...counts.entries()]
    .map(([rule, count]) => ({ rule, count, files: files.get(rule).size }))
    .sort((a, b) => b.count - a.count || (a.rule < b.rule ? -1 : 1));
}

/**
 * Turn an ESLint rule name into a register ID: uppercase, dash-separated, and
 * stripped of the characters the ID pattern rejects (`@`, `/`).
 * @param {string} kind
 * @param {string} rule
 * @returns {string}
 */
export function idFor(kind, rule) {
  const slug = rule
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `QL-${kind.toUpperCase()}-${slug}`;
}

/**
 * @param {string} kind
 * @param {string} rule
 * @returns {string}
 */
export function verifyFor(kind, rule) {
  return `${RATCHETS[kind].check} && node scripts/work/ratchet-clear.mjs --kind=${kind} --rule=${rule}`;
}
