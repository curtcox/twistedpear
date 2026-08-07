#!/usr/bin/env node
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { RESULTS_DIR } from "./paths.mjs";

function headSha() {
  const result = spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" });
  return (result.stdout || "unknown").trim();
}

/**
 * Provenance only: does the published summary describe this commit?
 *
 * Deliberately silent about whether the gates it reports passed. That is the
 * Site checks workflow's job (.github/workflows/site-checks.yml, which reads
 * summary.ok from the same artifact). Asserting it here too made a gate finding
 * fail the Pages run, so the Actions list could not answer "did the site
 * publish?" — the very split site-checks.yml exists to create.
 */
export function validatePublicationSummary(summary, expectedSha) {
  const errors = [];
  if (summary.commit !== expectedSha) {
    errors.push(`summary commit ${summary.commit ?? "missing"} does not match ${expectedSha}`);
  }
  if (summary.branchSha !== expectedSha) {
    errors.push(`summary branchSha ${summary.branchSha ?? "missing"} does not match ${expectedSha}`);
  }
  for (const job of summary.jobs ?? []) {
    if (job.commit !== expectedSha || job.branchSha !== expectedSha) {
      errors.push(
        `${job.id ?? "unknown"} provenance commit=${job.commit ?? "missing"}, branchSha=${job.branchSha ?? "missing"}`
      );
    }
  }
  return errors;
}

export function hasExpectedProvenance(value, expectedCommit, expectedBranchSha = expectedCommit) {
  return value.commit === expectedCommit && value.branchSha === expectedBranchSha;
}

const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function readRemoteSummary(url, expectedSha) {
  let lastError;
  for (let attempt = 1; attempt <= 24; attempt += 1) {
    try {
      const response = await fetch(url, { cache: "no-store" });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const summary = await response.json();
      if (summary.branchSha === expectedSha) return summary;
      lastError = new Error(`published branchSha is ${summary.branchSha ?? "missing"}`);
    } catch (error) {
      lastError = error;
    }
    if (attempt < 24) await wait(5_000);
  }
  throw new Error(`Published summary did not converge to ${expectedSha}: ${String(lastError)}`);
}

async function main() {
  const source = process.argv[2] ?? `${RESULTS_DIR}/summary.json`;
  const expectedSha = process.argv[3] ?? process.env.GITHUB_SHA ?? headSha();
  const summary = /^https?:\/\//.test(source)
    ? await readRemoteSummary(source, expectedSha)
    : JSON.parse(fs.readFileSync(source, "utf8"));
  const errors = validatePublicationSummary(summary, expectedSha);
  if (errors.length > 0) {
    for (const error of errors) console.error(error);
    process.exit(1);
  }
  console.log(`Published analysis matches ${expectedSha}.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main();
}
