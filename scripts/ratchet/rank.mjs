#!/usr/bin/env node
import path from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { readJson } from "./lib.mjs";
import { collect, mutationFloor } from "./rank/sources.mjs";
import { rank, rollUp } from "./rank/score.mjs";
import { groupTable, startHere, summary, table } from "./rank/report.mjs";

const USAGE = `usage: node scripts/ratchet/rank.mjs [options]

One ranked burndown list built from every ratchet baseline. Higher score =
address sooner. Score combines severity (policy, ratchet-rules.json) with
measured difficulty and leverage.

  --top=N              rows to print (default 20; --all for everything)
  --group-by=UNIT      cluster (default), rule, file, or ratchet
  --ratchet=a,b        restrict to these ratchets
  --rule=substring     restrict to rules containing this text
  --min-severity=N     drop anything below this severity
  --exclude-advisory   drop recorded allowances (the Sans-IO allowlists)
  --stale-only         only entries whose file no longer exists
  --json               machine-readable output
  --help               this message`;

/**
 * @param {string[]} argv
 * @returns {Record<string, string | boolean>}
 */
export function parseArgs(argv) {
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
 * Recorded allowances rank alongside findings by default. They are not debt of
 * the same kind — an adapter is meant to perform I/O — but the Sans-IO ratchet
 * may only shrink like every other one, so the list that says what to narrow
 * next has to contain them. The `advisory` mark on the row is what keeps the
 * distinction visible.
 * @param {import("./rank/score.mjs").Cluster[]} clusters
 * @param {Record<string, string | boolean>} flags
 * @returns {{visible: import("./rank/score.mjs").Cluster[], advisory: {shown: number, hidden: number}}}
 */
export function applyFilters(clusters, flags) {
  const ratchets = new Set(
    typeof flags.ratchet === "string" ? flags.ratchet.split(",") : [],
  );
  const rule = typeof flags.rule === "string" ? flags.rule : "";
  const minSeverity = Number(flags["min-severity"] ?? 0);
  const excluded = flags["exclude-advisory"] === true;

  const visible = clusters.filter((cluster) => {
    if (cluster.advisory && excluded) return false;
    if (ratchets.size > 0 && !ratchets.has(cluster.ratchet)) return false;
    if (rule && !cluster.rule.includes(rule)) return false;
    if (cluster.severity < minSeverity) return false;
    if (flags["stale-only"] === true && !cluster.stale) return false;
    return true;
  });
  const total = clusters.filter((cluster) => cluster.advisory).length;
  return {
    visible,
    advisory: {
      shown: visible.filter((cluster) => cluster.advisory).length,
      hidden: excluded ? total : 0,
    },
  };
}

/**
 * @param {string} root
 * @returns {{clusters: import("./rank/score.mjs").Cluster[], perRatchet: Map<string, number>, missing: string[]}}
 */
export function rankedRatchetItems(root = repoRoot()) {
  const rules = readJson(path.join(root, "ratchet-rules.json"));
  const { items, perRatchet, missing } = collect(root, rules);
  return { clusters: rank(items, { root, rules }), perRatchet, missing };
}

function main() {
  const flags = parseArgs(process.argv.slice(2));
  if (flags.help === true) {
    console.log(USAGE);
    return;
  }
  const root = repoRoot();
  const { clusters, perRatchet, missing } = rankedRatchetItems(root);
  const { visible, advisory } = applyFilters(clusters, flags);
  const limit =
    flags.all === true ? visible.length : Number(flags.top ?? 20) || 20;
  const groupBy =
    typeof flags["group-by"] === "string" ? flags["group-by"] : "cluster";

  if (flags.json === true) {
    const payload =
      groupBy === "cluster"
        ? visible.slice(0, limit)
        : rollUp(visible, /** @type {any} */ (groupBy)).slice(0, limit);
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  if (visible.length === 0) {
    console.log("No ratchet items match. Every selected ratchet is clear.");
  } else if (groupBy === "cluster") {
    for (const line of table(visible, limit)) console.log(line);
  } else {
    const label = groupBy === "file" ? "FILE" : groupBy.toUpperCase();
    const groups = rollUp(visible, /** @type {any} */ (groupBy));
    for (const line of groupTable(groups, limit, label)) console.log(line);
  }

  for (const line of summary({
    clusters: visible,
    perRatchet,
    missing,
    mutation: mutationFloor(root),
    advisory,
  })) {
    console.log(line);
  }
  if (visible.length > 0 && groupBy === "cluster") {
    console.log("");
    for (const line of startHere(visible[0])) console.log(line);
  }
  if (visible.length > limit) {
    console.log(`\n${visible.length - limit} more; pass --all or --top=N.`);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
