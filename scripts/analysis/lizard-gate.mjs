#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";
import { authoredPaths } from "./generated-paths.mjs";
import { measureFunctions } from "./lizard.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");
const RULES = path.join(ROOT, "complexity-multilang-rules.json");
const rules = readJson(RULES);

/**
 * The metrics this gate caps, and how each one reads in a message.
 *
 * Deliberately narrower than `complexity-rules.json`: lizard reports no
 * equivalent of `max-depth` or `max-nested-callbacks`, and inventing a
 * substitute would make the two gates disagree about what they measure.
 */
const METRICS = /** @type {const} */ ([
  ["ccn", "cyclomatic complexity"],
  ["params", "parameters"],
  ["nloc", "non-comment lines"],
]);

/** @param {string} file */
function tierFor(file) {
  return (
    rules.tiers.find((tier) =>
      (tier.match ?? []).some((pattern) => new RegExp(pattern).test(file)),
    ) ?? rules.tiers.at(-1)
  );
}

const functions = measureFunctions({
  root: ROOT,
  languages: rules.languages,
  roots: rules.roots,
});

const authored = new Set(
  authoredPaths(ROOT, [...new Set(functions.map((entry) => entry.file))]),
);
const measured = functions.filter((entry) => authored.has(entry.file));

/**
 * Worst observed value per metric, keyed `file::function`.
 *
 * Names are not unique inside a file — `(anonymous)` alone appears many times —
 * so a key names a *group* of functions and carries the worst member. A line
 * number would disambiguate them and would also go stale the moment anyone
 * edited the lines above, which is the opposite of what a drainable pin needs.
 *
 * @type {Map<string, { key: string, file: string, name: string, tier: object,
 *   ccn: number, params: number, nloc: number, start: number }>}
 */
const worst = new Map();
for (const entry of measured) {
  const key = `${entry.file}::${entry.name}`;
  const existing = worst.get(key);
  if (!existing) {
    worst.set(key, { ...entry, key, tier: tierFor(entry.file) });
    continue;
  }
  for (const [metric] of METRICS)
    existing[metric] = Math.max(existing[metric], entry[metric]);
  existing.start = Math.min(existing.start, entry.start);
}

const exemptions = rules.exemptions ?? {};
/** Metrics over their tier limit, keyed the same way. */
const over = new Map();
for (const group of worst.values()) {
  const exceeded = {};
  for (const [metric] of METRICS)
    if (group[metric] > group.tier[metric]) exceeded[metric] = group[metric];
  if (Object.keys(exceeded).length > 0)
    over.set(group.key, { group, exceeded });
}

if (write) {
  const pinned = {};
  for (const key of [...over.keys()].sort())
    pinned[key] = over.get(key).exceeded;
  writeJson(RULES, { ...rules, exemptions: pinned });
  console.log(
    `Multi-language complexity: pinned ${Object.keys(pinned).length} exemption(s) across ${measured.length} functions in ${authored.size} files.`,
  );
  process.exit(0);
}

const violations = [];
for (const [key, { group, exceeded }] of over) {
  const pin = exemptions[key];
  for (const [metric, label] of METRICS) {
    if (exceeded[metric] === undefined) continue;
    const allowed = pin?.[metric];
    if (allowed !== undefined && exceeded[metric] <= allowed) continue;
    violations.push(
      allowed === undefined
        ? `${key}:${group.start}: ${label} ${exceeded[metric]} exceeds the ${group.tier.id} limit of ${group.tier[metric]}`
        : `${key}:${group.start}: ${label} grew to ${exceeded[metric]}, above its pinned ${allowed}`,
    );
  }
}

/**
 * Pins that no longer describe anything.
 *
 * This is the whole difference between this gate and the ratchets next to it. A
 * ratchet only stops the list growing, so a list that was drained years ago
 * still reads as debt. Here, code that came back under its limit makes the
 * build red until the pin is deleted, which is what turns the file into a
 * to-do list instead of an archive.
 */
const stale = [];
for (const key of Object.keys(exemptions).sort()) {
  const current = over.get(key);
  if (!current) {
    stale.push(
      `${key}: no longer over any limit — delete this entry from complexity-multilang-rules.json`,
    );
    continue;
  }
  for (const [metric, label] of METRICS) {
    if (exemptions[key][metric] === undefined) continue;
    if (current.exceeded[metric] === undefined)
      stale.push(
        `${key}: ${label} is back under the ${current.group.tier.id} limit of ${current.group.tier[metric]} — delete "${metric}" from its entry`,
      );
  }
}

const tightenable = [];
for (const key of Object.keys(exemptions).sort()) {
  const current = over.get(key);
  if (!current) continue;
  for (const [metric, label] of METRICS) {
    const allowed = exemptions[key][metric];
    if (allowed === undefined || current.exceeded[metric] === undefined)
      continue;
    if (current.exceeded[metric] < allowed)
      tightenable.push(
        `${key}: ${label} improved from ${allowed} to ${current.exceeded[metric]}`,
      );
  }
}

writeJson(path.join(ROOT, "complexity-multilang.json"), {
  version: 1,
  languages: rules.languages,
  files: authored.size,
  functions: measured.length,
  groups: worst.size,
  exemptions: Object.keys(exemptions).length,
  violations: violations.length,
  stale: stale.length,
  findings: [...over.values()]
    .map(({ group, exceeded }) => ({
      key: group.key,
      file: group.file,
      name: group.name,
      line: group.start,
      tier: group.tier.id,
      ...exceeded,
      pinned: exemptions[group.key] ?? null,
    }))
    .sort((a, b) => (b.ccn ?? 0) - (a.ccn ?? 0) || a.key.localeCompare(b.key)),
});

for (const [label, entries] of [
  ["violation", violations],
  ["stale exemption", stale],
]) {
  if (entries.length === 0) continue;
  console.error(`\nMulti-language complexity: ${entries.length} ${label}(s):`);
  for (const entry of entries.slice(0, 50)) console.error(`  ${entry}`);
  if (entries.length > 50)
    console.error(`  … and ${entries.length - 50} more.`);
}
if (tightenable.length > 0)
  console.log(
    `Multi-language complexity: ${tightenable.length} exemption(s) can be tightened; run \`npm run complexity:multilang:baseline\`.`,
  );

if (violations.length > 0 || stale.length > 0) process.exit(1);
console.log(
  `Multi-language complexity: ${measured.length} functions clean against ${Object.keys(exemptions).length} pinned exemptions.`,
);
