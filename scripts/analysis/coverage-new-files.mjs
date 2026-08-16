/**
 * The new-file coverage floor's decision logic, separated from measurement.
 *
 * The per-workspace ratchet is an aggregate, and an aggregate cannot see a new
 * file arrive untested: 400 uncovered lines added to a package sitting at 74%
 * move that number by a point or two, which the 0.5-point tolerance and the
 * ordinary noise of a refactor absorb. Thirty-three files in this repository
 * entered that way, eighty of which still sit at 0%.
 *
 * This floor applies to a file on the day it is added, which is the only day
 * its tests are cheap to write. Existing files are untouched — they are held by
 * their workspace ratchet, and retrofitting a floor onto all 676 of them is a
 * different decision with a different cost.
 *
 * Kept pure and separate so it can be tested without a coverage run; the gate
 * that calls it is on the PR tier but only exercises this branch when a commit
 * happens to add a file.
 */

const METRICS = ["statements", "branches", "functions"];

/**
 * @typedef {{ statements: number, branches: number, functions: number }} Coverage
 * @typedef {{ path: string, metric: string, value: number, floor: number }} Finding
 */

/**
 * Which added files this floor actually judges.
 *
 * A path is skipped when it is outside the coverage roots (tests, scripts,
 * documents — they have no entry in the summary), when it is generated, or when
 * it carries an explicit exemption. Skipping is not the same as passing, so the
 * three reasons are reported separately rather than collapsed into one count.
 *
 * @param {string[]} added
 * @param {Map<string, Coverage>} files
 * @param {(relative: string) => boolean} isGenerated
 * @param {Record<string, string>} exempt
 */
export function selectNewFiles(added, files, isGenerated, exempt = {}) {
  const judged = [];
  const unmeasured = [];
  const generated = [];
  const exempted = [];

  for (const relative of added) {
    if (!files.has(relative)) {
      unmeasured.push(relative);
      continue;
    }
    if (isGenerated(relative)) {
      generated.push(relative);
      continue;
    }
    if (exempt[relative]) {
      exempted.push({ path: relative, reason: exempt[relative] });
      continue;
    }
    judged.push(relative);
  }
  return { judged, unmeasured, generated, exempted };
}

/**
 * Compare each judged file against the floor.
 *
 * The tolerance is the same one the workspace ratchet uses, applied in the same
 * direction: a file within tolerance of the floor passes, so that a rounding
 * difference between two coverage runs cannot flip the gate.
 *
 * @param {string[]} judged
 * @param {Map<string, Coverage>} files
 * @param {Coverage} floors
 * @param {number} tolerance
 * @returns {Finding[]}
 */
export function newFileFindings(judged, files, floors, tolerance = 0) {
  const findings = [];
  for (const relative of judged) {
    const measured = files.get(relative);
    if (!measured) continue;
    for (const metric of METRICS) {
      const floor = floors[metric] ?? 0;
      const value = measured[metric];
      if (value + tolerance < floor) {
        findings.push({ path: relative, metric, value, floor });
      }
    }
  }
  return findings;
}
