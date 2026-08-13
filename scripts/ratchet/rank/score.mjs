import fs from "node:fs";
import path from "node:path";
import { readJson } from "../lib.mjs";

/**
 * A ranked row: every entry of one rule in one file, which is the smallest unit
 * a person actually sits down and clears.
 *
 * @typedef {object} Cluster
 * @property {string} ratchet
 * @property {string} rule
 * @property {string} file
 * @property {number} count
 * @property {string} detail
 * @property {number} [gap]
 * @property {number} severity   0-10, editorial, from ratchet-rules.json.
 * @property {number} difficulty 0-10, measured: how much work this looks like.
 * @property {number} leverage   0-10, measured: how much it moves the burndown.
 * @property {number} score      0-100, higher means do it sooner.
 * @property {boolean} autofix   A tool can fix this without judgement.
 * @property {boolean} stale     The file is gone; re-baselining alone clears it.
 * @property {boolean} advisory  Recorded allowance rather than debt.
 * @property {boolean} clearsRule Clearing this empties the rule repo-wide.
 */

// Paths and rule names can contain any printable character, so the grouping
// key is joined with one that cannot appear in either.
const KEY = "\u0000";

/**
 * @param {import("./sources.mjs").RawItem[]} items
 * @returns {Map<string, Cluster>}
 */
export function clusterItems(items) {
  /** @type {Map<string, any>} */
  const clusters = new Map();
  for (const item of items) {
    const key = [item.ratchet, item.rule, item.file].join(KEY);
    const existing = clusters.get(key);
    if (existing) {
      existing.count += 1;
      if (item.gap !== undefined)
        existing.gap = Math.max(existing.gap ?? 0, item.gap);
      continue;
    }
    clusters.set(key, {
      ratchet: item.ratchet,
      rule: item.rule,
      file: item.file,
      count: 1,
      detail: item.detail,
      locatable: item.locatable === true,
      ...(item.gap === undefined ? {} : { gap: item.gap }),
    });
  }
  return clusters;
}

/**
 * Churn per file over the hotspot window. Debt in a file nobody touches costs
 * little; the same debt in a file under active edit is read and worked around
 * every week, so it ranks higher.
 * @param {string} root
 * @returns {Map<string, number>}
 */
function churnByFile(root) {
  const report = readJson(path.join(root, "hotspots.json"), null);
  /** @type {Map<string, number>} */
  const churn = new Map();
  for (const entry of report?.hotspots ?? []) {
    churn.set(entry.file, Number(entry.churn ?? 0));
  }
  return churn;
}

/**
 * Line count, or null when the path is not a readable file. A missing path is
 * how a stale baseline entry shows up: the finding cannot exist any more.
 * @param {string} root
 * @param {string} file
 * @returns {number | null}
 */
function fileLines(root, file) {
  try {
    const full = path.join(root, file);
    if (!fs.statSync(full).isFile()) return 0;
    return fs.readFileSync(full, "utf8").split("\n").length;
  } catch {
    return null;
  }
}

/**
 * @param {string[]} patterns
 * @param {string} value
 * @returns {boolean}
 */
function matchesAny(patterns, value) {
  return patterns.some((pattern) =>
    pattern.endsWith("*")
      ? value.startsWith(pattern.slice(0, -1))
      : pattern === value,
  );
}

/**
 * @param {number} value
 * @param {number} saturation
 * @returns {number}
 */
function logNormal(value, saturation) {
  if (value <= 0) return 0;
  return Math.min(1, Math.log2(1 + value) / Math.log2(1 + saturation));
}

/**
 * @param {Cluster} cluster
 * @param {any} rules
 * @returns {number}
 */
function severityOf(cluster, rules) {
  const byRule = rules.severityByRule?.[cluster.rule];
  const base = byRule ?? rules.severityByRatchet?.[cluster.ratchet] ?? 5;
  if (cluster.gap === undefined) return base;
  // A package two points below target is not the same debt as one thirty points
  // below, so coverage severity scales with the size of the remaining gap.
  const share = Math.min(
    1,
    cluster.gap / rules.difficulty.coverageGapSaturation,
  );
  return base * (0.4 + 0.6 * share);
}

/**
 * Difficulty is estimated, not measured: how many findings there are, how large
 * the file holding them is, and whether a tool can fix them without judgement.
 * @param {Cluster} cluster
 * @param {number | null} lines
 * @param {any} rules
 * @returns {number}
 */
function difficultyOf(cluster, lines, rules) {
  if (cluster.stale) return 0;
  const config = rules.difficulty;
  const size = logNormal(cluster.count, config.clusterSizeSaturation);
  const bulk = Math.min(1, (lines ?? 0) / config.fileLinesSaturation);
  const raw = config.countWeight * size + config.fileSizeWeight * bulk;
  return 10 * raw * (cluster.autofix ? config.autofixFactor : 1);
}

/**
 * Leverage is what makes this a burndown order rather than a severity list: it
 * rewards the clusters that remove the most entries, finish off a rule
 * entirely, or sit in code the repository is actively editing.
 * @param {Cluster} cluster
 * @param {{maxCount: number, ruleTotals: Map<string, number>, churn: Map<string, number>, maxChurn: number}} context
 * @param {any} rules
 * @returns {number}
 */
function leverageOf(cluster, context, rules) {
  const weights = rules.leverage;
  const ruleTotal =
    context.ruleTotals.get(`${cluster.ratchet}${KEY}${cluster.rule}`) ??
    cluster.count;
  const share = logNormal(cluster.count, context.maxCount);
  const ruleShare = cluster.count / ruleTotal;
  const hot = context.maxChurn
    ? (context.churn.get(cluster.file) ?? 0) / context.maxChurn
    : 0;
  const raw =
    weights.clusterShareWeight * share +
    weights.ruleShareWeight * ruleShare +
    weights.hotspotWeight * hot +
    weights.clearsRuleWeight * (cluster.clearsRule ? 1 : 0);
  return 10 * Math.min(1, raw);
}

/**
 * @param {Cluster} a
 * @param {Cluster} b
 * @returns {number}
 */
function compare(a, b) {
  return (
    b.score - a.score ||
    b.count - a.count ||
    a.ratchet.localeCompare(b.ratchet) ||
    a.rule.localeCompare(b.rule) ||
    a.file.localeCompare(b.file)
  );
}

/**
 * Score and order every cluster. Severity is policy, difficulty and leverage are
 * measured from the repository, and the weights that trade them off live in
 * `ratchet-rules.json` so the ordering can be retuned without touching code.
 * @param {import("./sources.mjs").RawItem[]} items
 * @param {{root: string, rules: any}} options
 * @returns {Cluster[]}
 */
export function rank(items, { root, rules }) {
  const clusters = [...clusterItems(items).values()];
  const churn = churnByFile(root);
  const maxChurn = Math.max(0, ...churn.values());
  const maxCount = Math.max(1, ...clusters.map((entry) => entry.count));

  /** @type {Map<string, number>} */
  const ruleTotals = new Map();
  for (const cluster of clusters) {
    const key = `${cluster.ratchet}${KEY}${cluster.rule}`;
    ruleTotals.set(key, (ruleTotals.get(key) ?? 0) + cluster.count);
  }
  const context = { maxCount, ruleTotals, churn, maxChurn };

  for (const cluster of clusters) {
    const lines = cluster.locatable ? fileLines(root, cluster.file) : 0;
    cluster.stale = lines === null;
    cluster.autofix = matchesAny(rules.autofixable ?? [], cluster.rule);
    cluster.advisory = matchesAny(rules.advisoryRules ?? [], cluster.rule);
    cluster.clearsRule =
      cluster.count ===
      ruleTotals.get(`${cluster.ratchet}${KEY}${cluster.rule}`);
    cluster.severity = severityOf(cluster, rules);
    cluster.difficulty = difficultyOf(cluster, lines, rules);
    cluster.leverage = leverageOf(cluster, context, rules);
    cluster.score =
      100 *
      (rules.weights.severity * (cluster.severity / 10) +
        rules.weights.leverage * (cluster.leverage / 10) +
        rules.weights.difficulty * (1 - cluster.difficulty / 10));
  }
  return clusters.sort(compare);
}

/**
 * Roll ranked clusters up to a coarser unit. The score of a group is the score
 * of its best member, so a roll-up never promotes a group above the item that
 * would actually be worked first.
 * @param {Cluster[]} clusters
 * @param {"rule" | "file" | "ratchet"} by
 * @returns {{key: string, ratchet: string, rule: string, file: string, count: number, files: number, score: number, severity: number, difficulty: number, leverage: number}[]}
 */
export function rollUp(clusters, by) {
  /** @type {Map<string, any>} */
  const groups = new Map();
  for (const cluster of clusters) {
    const key =
      by === "file"
        ? cluster.file
        : by === "ratchet"
          ? cluster.ratchet
          : `${cluster.ratchet}${KEY}${cluster.rule}`;
    const group = groups.get(key) ?? {
      key,
      ratchet: by === "file" ? "(mixed)" : cluster.ratchet,
      rule: by === "rule" ? cluster.rule : "(all)",
      file: by === "file" ? cluster.file : "(all)",
      count: 0,
      files: new Set(),
      score: 0,
      severity: 0,
      difficulty: 0,
      leverage: 0,
    };
    group.count += cluster.count;
    group.files.add(cluster.file);
    for (const field of ["score", "severity", "leverage", "difficulty"]) {
      group[field] = Math.max(group[field], cluster[field]);
    }
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({ ...group, files: group.files.size }))
    .sort((a, b) => b.score - a.score || b.count - a.count);
}
