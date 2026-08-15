#!/usr/bin/env node
/**
 * Drive the three contract fuzz targets under the pinned nightly.
 *
 * The contracts parse state that arrives from any peer, and until now nothing
 * fuzzed them: the `rust-tests` gate runs their hand-written unit tests, which
 * cover the shapes their authors thought of. `cargo fuzz` covers the ones they
 * did not — its first session found a nine-byte state that makes two of the
 * three try to allocate four billion entries.
 *
 * Two decisions worth stating, because both are load-bearing:
 *
 * **The evolving corpus is not committed.** libFuzzer writes every input it
 * finds interesting into the first corpus directory it is given; that is
 * hundreds of files per session, and committing them would bury the handful
 * that mean something under a diff nobody reads. This run points libFuzzer at a
 * scratch directory for its own bookkeeping and passes the committed corpus as
 * a second, read-only source. What gets committed is the generated seeds and the
 * crashes — the two kinds of file a person can explain.
 *
 * **A crash is copied into the corpus before the gate fails.** Same reason
 * `conformance/fuzz/corpus.mjs` exists: a counterexample that lives only in a
 * CI log is gone by the next run, and the next run draws different bytes.
 */
import { spawnSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { PINS } from "../../../scripts/tools/requirements.mjs";

const fuzzRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(fuzzRoot, "../../..");

const TARGETS = ["locator", "packet-log", "propagation-set"];

/**
 * Bounded, so the gate finishes. libFuzzer runs forever by default, which is
 * right for a fuzzing session and wrong for a check — an unbounded gate is one
 * that either never reports or reports whatever the timeout felt like.
 */
const RUNS = Number.parseInt(process.env.RUST_FUZZ_RUNS ?? "200000", 10);
const MAX_LEN = Number.parseInt(process.env.RUST_FUZZ_MAX_LEN ?? "4096", 10);
/**
 * A single allocation over this is a finding, not a fact of life. Without it
 * the four-billion-entry reservation was invisible: the host allocator
 * over-commits, so nothing was ever touched and RSS never moved. These
 * contracts run in wasm32 linear memory, where a reservation is a real
 * `memory.grow` a node cannot decline politely, so the limit is what makes the
 * fuzzer able to see the bug at all.
 */
const MALLOC_LIMIT_MB = Number.parseInt(
  process.env.RUST_FUZZ_MALLOC_LIMIT_MB ?? "64",
  10,
);

function writeReport(report) {
  const directory = join(repoRoot, "artifacts/rust-fuzz");
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, "rust-fuzz.json"),
    `${JSON.stringify(report, null, 2)}\n`,
  );
}

/** Regenerate the seeds, so a stale corpus cannot silently narrow the run. */
function writeSeeds() {
  const seeded = spawnSync("node", [join(fuzzRoot, "seeds.mjs")], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (seeded.status !== 0) {
    throw new Error(`seed generation failed:\n${seeded.stderr ?? ""}`);
  }
}

/**
 * libFuzzer's own summary lines, so the artifact carries what the run reached
 * rather than only whether it was green. `cov` is the number of edges hit —
 * a gate whose coverage falls has stopped exercising something, and nothing
 * except this number would say so.
 */
function parseSummary(output) {
  const done = [
    ...output.matchAll(/#\d+\s+DONE\s+cov: (\d+) ft: (\d+) corp: (\d+)/g),
  ].at(-1);
  return {
    edges: done ? Number(done[1]) : 0,
    features: done ? Number(done[2]) : 0,
    corpusEntries: done ? Number(done[3]) : 0,
  };
}

function runTarget(target, evolveRoot) {
  const evolve = join(evolveRoot, target);
  mkdirSync(evolve, { recursive: true });
  const committed = join(fuzzRoot, "corpus", target);

  const result = spawnSync(
    "rustup",
    [
      "run",
      PINS["rust-nightly"].version,
      "cargo",
      "fuzz",
      "run",
      "--fuzz-dir",
      "conformance/fuzz/rust",
      target,
      // First directory wins the writes; the committed corpus is only read.
      evolve,
      committed,
      "--",
      `-runs=${RUNS}`,
      `-max_len=${MAX_LEN}`,
      "-rss_limit_mb=2048",
      `-malloc_limit_mb=${MALLOC_LIMIT_MB}`,
    ],
    {
      cwd: repoRoot,
      encoding: "utf8",
      maxBuffer: 256 * 1024 * 1024,
      env: { ...process.env, NO_COLOR: "1" },
    },
  );

  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
  process.stdout.write(output);
  return {
    target,
    ok: result.status === 0,
    ...parseSummary(output),
    crashes: harvestCrashes(target),
  };
}

/**
 * Move whatever cargo-fuzz wrote to `artifacts/<target>/` into the committed
 * corpus, named so the seed regenerator leaves it alone. Returns the names, so
 * the report says which file to look at rather than only that something failed.
 */
function harvestCrashes(target) {
  const artifacts = join(fuzzRoot, "artifacts", target);
  if (!existsSync(artifacts)) return [];
  const found = readdirSync(artifacts);
  for (const name of found) {
    cpSync(
      join(artifacts, name),
      join(fuzzRoot, "corpus", target, `crash-${name}`),
    );
  }
  rmSync(artifacts, { recursive: true, force: true });
  return found.map((name) => `crash-${name}`);
}

function main() {
  writeSeeds();
  const evolveRoot = mkdtempSync(join(tmpdir(), "twistedpear-rust-fuzz-"));
  let results;
  try {
    results = TARGETS.map((target) => runTarget(target, evolveRoot));
  } finally {
    rmSync(evolveRoot, { recursive: true, force: true });
  }

  const failed = results.filter((result) => !result.ok);
  writeReport({
    ok: failed.length === 0,
    toolchain: PINS["rust-nightly"].version,
    cargoFuzz: PINS["cargo-fuzz"].version,
    runs: RUNS,
    maxLen: MAX_LEN,
    mallocLimitMb: MALLOC_LIMIT_MB,
    targets: results,
  });

  console.log("");
  for (const result of results) {
    console.log(
      `${result.ok ? "ok  " : "FAIL"} ${result.target}: ${RUNS} runs, ${result.edges} edges, ${result.corpusEntries} corpus entries`,
    );
  }

  if (failed.length > 0) {
    console.error("");
    for (const result of failed) {
      console.error(
        `${result.target} crashed. Counterexample(s) copied into conformance/fuzz/rust/corpus/${result.target}/: ${result.crashes.join(", ") || "(none written)"} — commit them.`,
      );
    }
    process.exit(1);
  }
}

main();
