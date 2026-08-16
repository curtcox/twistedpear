/**
 * Changed-line coverage policy, separated from Vitest and git process I/O.
 *
 * A workspace-wide percentage cannot see an uncovered branch added to a large
 * existing file. This module intersects a zero-context git diff with Istanbul's
 * statement and branch locations so only executable code authored by the
 * change is judged.
 */

/** @typedef {{ start: { line: number }, end: { line: number } }} Location */

/** @param {string} line */
function newDiffPath(line) {
  if (!line.startsWith("+++ ")) return undefined;
  const named = line.slice(4);
  return named === "/dev/null" ? null : named.replace(/^b\//, "");
}

/** @param {Map<string, Set<number>>} changed @param {string} file @param {string} line */
function addHunk(changed, file, line) {
  if (!line.startsWith("@@")) return;
  const match = /\+(\d+)(?:,(\d+))?/.exec(line);
  if (match === null) return;
  const start = Number(match[1]);
  const count = match[2] === undefined ? 1 : Number(match[2]);
  for (let offset = 0; offset < count; offset += 1)
    changed.get(file)?.add(start + offset);
}

/**
 * Parse the new-file line numbers from a unified diff.
 *
 * @param {string} text
 * @returns {Map<string, Set<number>>}
 */
export function changedLinesFromDiff(text) {
  const changed = new Map();
  let file = null;
  for (const line of text.split(/\r?\n/)) {
    const nextFile = newDiffPath(line);
    if (nextFile !== undefined) {
      file = nextFile;
      if (file !== null && !changed.has(file)) changed.set(file, new Set());
      continue;
    }
    if (file !== null) addHunk(changed, file, line);
  }
  return changed;
}

/** @param {Location} location @param {Set<number>} changed */
function intersects(location, changed) {
  for (let line = location.start.line; line <= location.end.line; line += 1)
    if (changed.has(line)) return true;
  return false;
}

/** @param {Record<string, any>} report @param {Set<number>} lines */
function statementScore(report, lines) {
  let total = 0;
  let covered = 0;
  for (const [id, location] of Object.entries(report.statementMap ?? {})) {
    if (!intersects(location, lines)) continue;
    total += 1;
    if ((report.s?.[id] ?? 0) > 0) covered += 1;
  }
  return { covered, total };
}

/** @param {Record<string, any>} report @param {Set<number>} lines */
function branchScore(report, lines) {
  let total = 0;
  let covered = 0;
  for (const [id, branch] of Object.entries(report.branchMap ?? {})) {
    const hits = report.b?.[id] ?? [];
    for (const [index, location] of (branch.locations ?? []).entries()) {
      if (!intersects(location, lines)) continue;
      total += 1;
      if ((hits[index] ?? 0) > 0) covered += 1;
    }
  }
  return { covered, total };
}

/** @param {string} absolute @param {string} normalizedRoot */
function relativeCoveragePath(absolute, normalizedRoot) {
  const normalized = absolute.replaceAll("\\", "/");
  return normalized.startsWith(`${normalizedRoot}/`)
    ? normalized.slice(normalizedRoot.length + 1)
    : normalized;
}

/**
 * Score executable coverage locations intersecting changed lines.
 *
 * @param {Map<string, Set<number>>} changed
 * @param {Record<string, any>} coverage Istanbul JSON keyed by absolute file
 * @param {string} root repository root
 * @param {(relative: string) => boolean} isGenerated
 * @param {Record<string, string>} exempt
 */
export function changedCoverage(
  changed,
  coverage,
  root,
  isGenerated,
  exempt = {},
) {
  const scores = [];
  const normalizedRoot = root.replaceAll("\\", "/").replace(/\/$/, "");
  for (const [absolute, report] of Object.entries(coverage)) {
    const relative = relativeCoveragePath(absolute, normalizedRoot);
    const lines = changed.get(relative);
    if (lines === undefined || isGenerated(relative) || exempt[relative])
      continue;

    scores.push({
      path: relative,
      statements: statementScore(report, lines),
      branches: branchScore(report, lines),
    });
  }
  return scores.sort((left, right) => left.path.localeCompare(right.path));
}

/**
 * @param {ReturnType<typeof changedCoverage>} scores
 * @param {{ statements?: number, branches?: number }} floors
 * @param {number} tolerance
 */
export function changedCoverageFindings(scores, floors, tolerance = 0) {
  const findings = [];
  for (const score of scores) {
    for (const metric of ["statements", "branches"]) {
      const measured = score[metric];
      const floor = floors[metric];
      if (floor === undefined || measured.total === 0) continue;
      const value =
        Math.round((measured.covered / measured.total) * 10000) / 100;
      if (value + tolerance < floor)
        findings.push({ path: score.path, metric, value, floor, ...measured });
    }
  }
  return findings;
}
