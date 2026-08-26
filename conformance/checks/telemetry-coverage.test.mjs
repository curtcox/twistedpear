/**
 * Every workflow job is measured, or its exemption is written down.
 *
 * The published CI cost report claims to describe what a change to `main`
 * costs. That claim is only true while the jobs doing the costing are actually
 * sampled, and a new job arrives uninstrumented by default — silently, since a
 * missing sampler produces no error, only an absence in a report nobody is
 * reading line by line. This test is what makes the absence loud.
 *
 * Timings are unaffected either way: `scripts/ci/collect-run.mjs` reads those
 * from the Actions API and needs no cooperation from the job.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");

function coverage() {
  const result = spawnSync(
    process.execPath,
    [path.join(root, "scripts/ci/telemetry-coverage.mjs"), "--json"],
    { cwd: root, encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  return JSON.parse(result.stdout);
}

const waivers = JSON.parse(
  fs.readFileSync(path.join(root, "telemetry-waivers.json"), "utf8"),
);

describe("CI telemetry coverage", () => {
  it("samples every workflow job that is not waived", () => {
    const { missing } = coverage();
    expect(
      missing.map((row) => row.key),
      "add the telemetry action pair to these jobs, or record why not in telemetry-waivers.json",
    ).toEqual([]);
  });

  it("keeps a reason against every waiver", () => {
    for (const [key, reason] of Object.entries(waivers.jobs ?? {})) {
      expect(reason, `${key} is waived without a reason`).toBeTruthy();
      expect(
        String(reason).length,
        `${key}'s reason is too terse to be useful`,
      ).toBeGreaterThan(30);
    }
  });

  it("does not waive a job that no longer exists", () => {
    const { rows } = coverage();
    const known = new Set(rows.map((row) => row.key));
    for (const key of Object.keys(waivers.jobs ?? {})) {
      expect(
        known.has(key),
        `${key} is waived but is not a job in .github/workflows`,
      ).toBe(true);
    }
  });

  it("instruments the great majority of jobs", () => {
    const { rows, instrumented } = coverage();
    // A guard against a future edit that waives its way out of the report
    // rather than measuring: the waiver list is for jobs that cannot be
    // sampled, and there are only a handful of those.
    expect(instrumented / rows.length).toBeGreaterThan(0.9);
  });
});
