import { TYPES } from "./lib.mjs";

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseFlags(argv) {
  /** @type {Record<string, string | boolean>} */
  const flags = {};
  for (const arg of argv) {
    if (!arg.startsWith("--")) continue;
    const [name, ...rest] = arg.slice(2).split("=");
    flags[name] = rest.length > 0 ? rest.join("=") : true;
  }
  return flags;
}

/**
 * @param {string | boolean | undefined} value
 * @returns {string[]}
 */
export function listFlag(value) {
  if (typeof value !== "string" || value === "") return [];
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * @param {import("./lib.mjs").WorkItem[]} items
 * @returns {number}
 */
export function idWidth(items) {
  return items.reduce((width, item) => Math.max(width, item.id.length), 2);
}

/**
 * @param {import("./lib.mjs").WorkItem} item
 * @param {number} width
 * @returns {string}
 */
export function oneLine(item, width = 15) {
  const state =
    item.status !== "open"
      ? item.status
      : item.blockers.length > 0
        ? "blocked"
        : "ready";
  return `${state.padEnd(8)}${item.id.padEnd(width)} ${(item.type || "?").padEnd(13)} ${item.title}`;
}

/**
 * @param {import("./lib.mjs").WorkItem} item
 * @returns {string[]}
 */
export function detail(item) {
  const lines = [
    `${item.id}  ${item.type || "untyped"}  [${item.status}]  ${item.file}:${item.line}`,
    `  ${item.title}`,
  ];
  if (item.verify) lines.push(`  verify:   ${item.verify}`);
  if (item.requires.length > 0) {
    lines.push(`  requires: ${item.requires.join(", ")}`);
  }
  for (const blocker of item.blockers) {
    lines.push(`  blocked:  ${blocker.ref} — ${blocker.reason}`);
  }
  return lines;
}

/**
 * Spell out the ranking decision. The ordering is policy, so `work:next` should
 * never look like an opaque pick.
 * @param {import("./lib.mjs").WorkItem} item
 * @param {import("./lib.mjs").WorkItem} [runnerUp]
 * @returns {string[]}
 */
export function explain(item, runnerUp) {
  const rank = TYPES.indexOf(item.type) + 1;
  const lines = [
    "why this one:",
    `  class     ${item.type} (${rank} of ${TYPES.length}: ${TYPES.join(" > ")})`,
    `  unblocks  ${item.unblocks} other item(s)`,
    `  effort    ${item.effort ?? 1} file(s)`,
    `  added     ${item.added}`,
  ];
  if (runnerUp) {
    lines.push(
      `  runner-up ${runnerUp.id} (${runnerUp.type}, unblocks ${runnerUp.unblocks}, effort ${runnerUp.effort ?? 1}, added ${runnerUp.added})`,
    );
  }
  return lines;
}
