/**
 * Compare two censuses. See `census-collect.mjs` for the two shapes being
 * compared and `census.mjs` for what gets compared against what.
 */
import { direction } from "./census-collect.mjs";

/**
 * @typedef {object} Census
 * @property {Record<string, string[]>} members named things that must not vanish
 * @property {Record<string, number>} counts numbers with a declared direction
 */

/**
 * Members that vanished and counts that moved the wrong way.
 *
 * Only regressions are reported. Growth needs no ceremony: adding a gate or a
 * hundred tests is the outcome this gate exists to protect, and failing a build
 * over it would teach people to route around the census.
 *
 * @param {Partial<Census>} prior
 * @param {Census} current
 * @param {string} source what `prior` came from, named in the message
 * @returns {string[]}
 */
export function regressions(prior, current, source) {
  const findings = [];
  for (const [group, entries] of Object.entries(prior.members ?? {})) {
    const present = new Set(current.members[group] ?? []);
    for (const entry of entries)
      if (!present.has(entry))
        findings.push(`${group}: "${entry}" is gone (was in ${source})`);
  }
  for (const [key, was] of Object.entries(prior.counts ?? {})) {
    // A key whose prefix no longer has a declared direction was renamed or
    // retired in code. The member lists carry the structural loss; guessing a
    // direction for a measurement that no longer exists would not.
    const moved = direction(key);
    if (moved === null) continue;
    const now = current.counts[key];
    if (now === undefined) {
      findings.push(`${key}: no longer measured at all (was ${was})`);
      continue;
    }
    if (moved === "up" ? now < was : now > was)
      findings.push(`${key}: ${was} → ${now} (${source} held ${was})`);
  }
  return findings.sort();
}

/**
 * Rules that are not ratcheted, because there is no defensible non-zero value
 * for either of them.
 *
 * A job absent from `ci-green`'s `needs` runs on every pull request and gates
 * nothing — it burns CI minutes to produce a result no branch protection reads.
 * actionlint catches the opposite mistake, a `needs` naming a job that does not
 * exist; nothing catches this one. A focused test silently skips every other
 * test in its file, which is a large, invisible drop in what runs. A test file
 * no Vitest project collects is the same loss carried further: the file is
 * reviewed, committed, and never executed.
 *
 * @param {Census & {focusedTests: string[], uncollectedTests: string[]}} current
 * @param {{nonGatingJobs?: {job: string, reason: string}[]}} rules
 * @returns {string[]}
 */
export function invariants(current, rules) {
  const allowed = new Set([
    // `ci-green` is the aggregate itself; it cannot depend on itself.
    "ci-green",
    ...(rules.nonGatingJobs ?? []).map((entry) => entry.job),
  ]);
  const gating = new Set(current.members.ciGating);
  return [
    ...current.members.ciJobs
      .filter((job) => !gating.has(job) && !allowed.has(job))
      .map(
        (job) =>
          `ci.yml: job "${job}" is not in ci-green's needs, so it runs on every pull request and gates nothing. Add it there, or record it in census-rules.json with a reason.`,
      ),
    ...current.focusedTests.map(
      (file) =>
        `${file}: a focused test (.only) silently skips every other test in its file.`,
    ),
    ...current.uncollectedTests.map(
      (file) =>
        `${file}: no vitest project collects this file, so none of its tests run. Add its directory to the include globs in vitest.config.ts.`,
    ),
  ];
}
