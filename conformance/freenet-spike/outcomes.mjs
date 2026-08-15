/**
 * Scenario bookkeeping for the distinct-node Freenet run.
 *
 * Split out from `run-distinct-nodes.mjs` so it can be tested without a
 * three-node Freenet mesh. The run itself needs a real Freenet binary and a
 * couple of minutes; the part that decides whether a run counts as clean,
 * degraded, or failed is ordinary data handling and should not need either.
 */

/**
 * @typedef {{
 *   label: string,
 *   status: "passed" | "degraded" | "failed",
 *   attempts: number,
 *   diagnostic: boolean,
 *   message?: string,
 * }} Outcome
 */

/**
 * Summarize scenario outcomes.
 *
 * `retried` is the number that matters: a run that passed on its third attempt
 * and a run that passed first time used to be the same green, so the only way
 * to learn this job was flaky was to watch it over days.
 *
 * @param {Outcome[]} outcomes
 * @param {string} label
 */
export function summarizeOutcomes(outcomes, label) {
  return {
    version: 1,
    label,
    scenarios: outcomes.length,
    retried: outcomes.filter((entry) => entry.attempts > 1).length,
    degraded: outcomes.filter((entry) => entry.status === "degraded").length,
    failed: outcomes.filter((entry) => entry.status === "failed").length,
    clean: outcomes.every(
      (entry) => entry.status === "passed" && entry.attempts === 1,
    ),
    detail: outcomes,
  };
}

/**
 * One line per scenario, plus a note when the run was not clean.
 * @param {Outcome[]} outcomes
 */
export function formatOutcomes(outcomes) {
  const lines = outcomes.map(
    (entry) =>
      `  ${entry.status.padEnd(8)} ${entry.label} (attempt${
        entry.attempts === 1 ? "" : "s"
      }: ${entry.attempts})`,
  );
  const retried = outcomes.filter((entry) => entry.attempts > 1).length;
  if (retried > 0) {
    lines.push(
      `  note: ${retried} scenario(s) needed a retry; this run was not clean.`,
    );
  }
  return lines.join("\n");
}
