import { SOURCES } from "./sources.mjs";

/**
 * @param {string} value
 * @param {number} width
 * @param {"left" | "right"} keep Which end of the value to preserve.
 * @returns {string}
 */
function fit(value, width, keep) {
  if (value.length <= width) return value.padEnd(width);
  return keep === "left"
    ? `${value.slice(0, width - 1)}…`
    : `…${value.slice(value.length - width + 1)}`;
}

/**
 * @param {number} value
 * @returns {string}
 */
function one(value) {
  return value.toFixed(1);
}

/**
 * Numbers are right-aligned; names keep their head, because that is where the
 * tool and rule live; paths keep their tail, because that is where the file
 * name lives.
 * @type {[string, number, "number" | "left" | "right"][]}
 */
const COLUMNS = [
  ["RANK", 4, "number"],
  ["SCORE", 5, "number"],
  ["SEV", 4, "number"],
  ["DIFF", 4, "number"],
  ["LEV", 4, "number"],
  ["N", 5, "number"],
  ["RATCHET", 10, "left"],
  ["RULE", 36, "left"],
  ["FILE", 46, "right"],
];

/**
 * @param {(string | number)[]} cells
 * @returns {string}
 */
function row(cells) {
  return cells
    .map((cell, index) => {
      const [, width, align] = COLUMNS[index];
      const text = String(cell);
      return align === "number"
        ? text.padStart(width).slice(-width)
        : fit(text, width, align);
    })
    .join("  ")
    .trimEnd();
}

/**
 * @param {import("./score.mjs").Cluster} cluster
 * @returns {string}
 */
function marks(cluster) {
  const flags = [
    cluster.stale ? "stale" : "",
    cluster.autofix ? "autofix" : "",
    cluster.clearsRule ? "clears-rule" : "",
    cluster.advisory ? "advisory" : "",
  ].filter(Boolean);
  return flags.length === 0 ? "" : ` [${flags.join(", ")}]`;
}

/**
 * @param {import("./score.mjs").Cluster[]} clusters
 * @param {number} limit
 * @returns {string[]}
 */
export function table(clusters, limit) {
  const lines = [
    row(COLUMNS.map(([label]) => label)),
    COLUMNS.map(([, width]) => "-".repeat(width)).join("  "),
  ];
  clusters.slice(0, limit).forEach((cluster, index) => {
    lines.push(
      row([
        index + 1,
        one(cluster.score),
        one(cluster.severity),
        one(cluster.difficulty),
        one(cluster.leverage),
        cluster.count,
        cluster.ratchet,
        cluster.rule,
        `${cluster.file}${marks(cluster)}`,
      ]),
    );
  });
  return lines;
}

/**
 * @param {ReturnType<typeof import("./score.mjs").rollUp>} groups
 * @param {number} limit
 * @param {string} label
 * @returns {string[]}
 */
export function groupTable(groups, limit, label) {
  const head = `${"RANK".padStart(4)}  ${"SCORE".padStart(5)}  ${"SEV".padStart(4)}  ${"N".padStart(6)}  ${"FILES".padStart(5)}  ${label}`;
  const lines = [head, "-".repeat(head.length)];
  groups.slice(0, limit).forEach((group, index) => {
    const name =
      label === "FILE"
        ? group.file
        : label === "RATCHET"
          ? group.ratchet
          : `${group.ratchet}/${group.rule}`;
    lines.push(
      [
        String(index + 1).padStart(4),
        one(group.score).padStart(5),
        one(group.severity).padStart(4),
        String(group.count).padStart(6),
        String(group.files).padStart(5),
        name,
      ].join("  "),
    );
  });
  return lines;
}

/**
 * The whole point of the ordering: say what to do next, and give the two
 * commands that prove it is done — re-run the check, then re-record the
 * baseline so the entries actually leave the ratchet.
 * @param {import("./score.mjs").Cluster} cluster
 * @returns {string[]}
 */
export function startHere(cluster) {
  const source = SOURCES.find((entry) => entry.id === cluster.ratchet);
  const lines = [
    "Start here:",
    `  ${cluster.ratchet} / ${cluster.rule}`,
    `  ${cluster.file} — ${cluster.count} entr${cluster.count === 1 ? "y" : "ies"}${marks(cluster)}`,
  ];
  if (cluster.detail) lines.push(`  e.g. ${cluster.detail.slice(0, 100)}`);
  lines.push(
    `  severity ${one(cluster.severity)}/10, difficulty ${one(cluster.difficulty)}/10, leverage ${one(cluster.leverage)}/10`,
  );
  if (cluster.stale) {
    lines.push(
      "  The file is gone; re-recording the baseline is the whole fix.",
    );
  }
  if (cluster.advisory) {
    lines.push(
      "  A recorded allowance, not a finding: the work is narrowing it — a",
      "  tighter glob, or one fewer file behind it — not deleting the entry.",
    );
  }
  if (source) {
    lines.push("", `  verify:   ${source.check}`);
    lines.push(`  re-record: ${source.baseline}`);
  }
  return lines;
}

/**
 * @param {object} input
 * @param {import("./score.mjs").Cluster[]} input.clusters
 * @param {Map<string, number>} input.perRatchet
 * @param {string[]} input.missing
 * @param {{score: number} | null} input.mutation
 * @param {{shown: number, hidden: number}} input.advisory
 * @returns {string[]}
 */
export function summary({ clusters, perRatchet, missing, mutation, advisory }) {
  const total = clusters.reduce((sum, cluster) => sum + cluster.count, 0);
  const stale = clusters.filter((cluster) => cluster.stale);
  const clear = [...perRatchet].filter(([, count]) => count === 0);

  // Counted from what is shown, so a filtered run reports the filtered slice
  // rather than the whole repository.
  /** @type {Map<string, number>} */
  const shown = new Map();
  for (const cluster of clusters) {
    shown.set(
      cluster.ratchet,
      (shown.get(cluster.ratchet) ?? 0) + cluster.count,
    );
  }
  const populated = [...shown]
    .sort((a, b) => b[1] - a[1])
    .map(([id, count]) => `${id} ${count}`)
    .join(", ");

  const lines = [
    "",
    `${total} entr${total === 1 ? "y" : "ies"} in ${clusters.length} cluster(s) across ${shown.size} ratchet(s).`,
    `  by ratchet: ${populated || "none"}`,
    `  already clear: ${clear.map(([id]) => id).join(", ") || "none"}`,
  ];
  if (stale.length > 0) {
    const entries = stale.reduce((sum, cluster) => sum + cluster.count, 0);
    lines.push(
      `  stale: ${entries} entr${entries === 1 ? "y" : "ies"} name files that no longer exist — re-record those baselines for a free win.`,
    );
  }
  if (advisory.hidden > 0) {
    lines.push(
      `  advisory: ${advisory.hidden} recorded allowance(s) dropped by --exclude-advisory.`,
    );
  } else if (advisory.shown > 0) {
    lines.push(
      `  advisory: ${advisory.shown} of those are recorded allowances (Sans-IO) — narrow them, do not expect to delete them.`,
    );
  }
  if (mutation) {
    // This said "not rankable: … is a single number" until the floor was split
    // per package. It now names the weakest package, which is a thing someone
    // can go and work on — the whole point of this ranking.
    const weakest = mutation.packages[0];
    lines.push(
      weakest === undefined
        ? `  mutation: combined floor ${mutation.combined}%, no per-package floors recorded; run npm run mutation:baseline.`
        : `  mutation: combined floor ${mutation.combined}%; weakest package ${weakest.name} at ${weakest.floor}% of ${mutation.packages.length}, raised by writing tests then npm run mutation:baseline.`,
    );
  }
  // Per-project percentages rather than a list of findings, so there is nothing
  // to sit down and clear one row at a time. Named here so the ranking is not
  // mistaken for the complete set of ratchets.
  lines.push(
    `  not rankable: type-coverage floors are per-project percentages, raised by npm run type-coverage:baseline.`,
  );
  for (const file of missing) lines.push(`  missing baseline file: ${file}`);
  return lines;
}
