#!/usr/bin/env node
/**
 * Fetch the telemetry history for the site build.
 *
 *   node scripts/ci/fetch-history.mjs [--into=.tmp/ci-metrics] [--depth=1]
 *
 * Exits 0 when the branch does not exist or cannot be reached. The CI cost
 * report renders a placeholder in that case, and a site publish must not fail
 * because a measurement store is empty.
 */
import fs from "node:fs";
import path from "node:path";
import { BRANCH, branchExists, git, remoteUrl } from "./store-branch.mjs";

const args = new Map(
  process.argv.slice(2).map((arg) => {
    const [key, ...rest] = arg.replace(/^--/, "").split("=");
    return [key, rest.join("=") || "true"];
  }),
);

const into = path.resolve(
  args.get("into") ?? process.env.CI_METRICS_DIR ?? ".tmp/ci-metrics",
);
const depth = args.get("depth") ?? "1";

function main() {
  const url = remoteUrl() ?? `https://github.com/curtcox/twistedpear.git`;
  if (!branchExists(url)) {
    console.log(
      `No ${BRANCH} branch yet; the CI cost report will render its placeholder.`,
    );
    return;
  }
  fs.rmSync(into, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(into), { recursive: true });
  git([
    "clone",
    "--branch",
    BRANCH,
    "--single-branch",
    `--depth=${depth}`,
    url,
    into,
  ]);
  const index = path.join(into, "index.ndjson");
  const runs = fs.existsSync(index)
    ? fs
        .readFileSync(index, "utf8")
        .split("\n")
        .filter((line) => line.trim()).length
    : 0;
  console.log(`Fetched ${runs} recorded run(s) from ${BRANCH} into ${into}`);
}

let failure = null;
try {
  main();
} catch (error) {
  failure = error;
}

if (failure) {
  // Exits 0 regardless: the CI cost report renders its placeholder when the
  // store is absent, and a site publish must not fail because a measurement
  // could not be fetched. The reason still belongs in the build log.
  console.warn(`Could not fetch the CI telemetry history: ${failure.message}`);
  process.exitCode = 0;
}
