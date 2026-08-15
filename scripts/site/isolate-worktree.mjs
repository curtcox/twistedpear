/**
 * Restore a clean measurement tree between sequential gate runs.
 *
 * CI runs each gate on a fresh checkout. The Pages report runs every gate in
 * one job, so earlier gates (tests, coverage, structure) leave `dist/` and
 * other gitignored output that later graph gates then measure. That is how
 * `coupling` passed on the published results page while the same commit failed
 * the isolated CI job: generated edges made stale fan-in/fan-out exemptions
 * look still necessary.
 *
 * Only the Pages report should call this (`SITE_REPORT_ISOLATE=1`). A local
 * `site:reports` must not wipe the working tree.
 */
import { spawnSync } from "node:child_process";

export const DEFAULT_KEEP = [
  "node_modules",
  "site-results",
  "imported-static-analysis",
];

/**
 * @param {string} root
 * @param {{ keep?: string[] }} [options]
 */
export function isolateWorktree(root, options = {}) {
  const keep = options.keep ?? DEFAULT_KEEP;
  const checkout = spawnSync("git", ["checkout", "-q", "--", "."], {
    cwd: root,
    encoding: "utf8",
  });
  if (checkout.status !== 0) {
    throw new Error(
      `git checkout failed: ${(checkout.stderr || checkout.stdout || "").trim()}`,
    );
  }
  const clean = spawnSync(
    "git",
    ["clean", "-fdxq", ...keep.flatMap((entry) => ["-e", entry])],
    { cwd: root, encoding: "utf8" },
  );
  if (clean.status !== 0) {
    throw new Error(
      `git clean failed: ${(clean.stderr || clean.stdout || "").trim()}`,
    );
  }
}
