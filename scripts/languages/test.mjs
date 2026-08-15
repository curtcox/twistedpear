#!/usr/bin/env node
/**
 * Native-language unit tests: Rust, Swift, Kotlin.
 *
 * These suites were written and committed but never executed. The language
 * gates ran analyzers only — `cargo fmt`/`clippy`/`deny`, SwiftLint, ktlint —
 * which is style and soundness, not behaviour, so a `#[test]` that stopped
 * holding would have failed silently and forever. The Android tests did run,
 * but only from a `workflow_dispatch` lab workflow that nothing triggers on a
 * change.
 *
 * Unlike `check.mjs`, nothing here is ratcheted. A failing test is a failing
 * test: there is no baseline of "tests that are allowed to fail", because that
 * is not a thing a test suite should have.
 *
 * Usage: node scripts/languages/test.mjs <rust|swift|kotlin>
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const language = process.argv[2];

// The toolchain the analyzer gate pins. Tests must run under the same compiler
// the lint gate checks against, or the two gates are describing different code.
const RUST_TOOLCHAIN = "1.97.1";

const tracked = (pattern) => {
  const result = spawnSync("git", ["ls-files", pattern], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return (result.stdout ?? "").split(/\r?\n/).filter(Boolean);
};

function run(command, args, cwd = ROOT, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, NO_COLOR: "1", FORCE_COLOR: "0", ...env },
  });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");
  return {
    status: result.status ?? 1,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/** @type {{id: string, command: string, ok: boolean, tests: number|null}[]} */
const suites = [];

if (language === "rust") {
  // Every tracked crate, not only the three shipped contracts the analyzer gate
  // covers. The freenet spike crate holds four tests of its own; scoping tests
  // to "shipped" would leave them in the same never-run state this gate exists
  // to end.
  for (const manifest of tracked("*Cargo.toml")) {
    const { status, output } = run("rustup", [
      "run",
      RUST_TOOLCHAIN,
      "cargo",
      "test",
      "--manifest-path",
      manifest,
    ]);
    // "test result: ok. 4 passed; 0 failed; ..." — summed across test binaries.
    const passed = [
      ...output.matchAll(/test result: \w+\. (\d+) passed;/g),
    ].reduce((sum, [, count]) => sum + Number(count), 0);
    suites.push({
      id: path.dirname(manifest),
      command: `cargo test --manifest-path ${manifest}`,
      ok: status === 0,
      tests: passed,
    });
  }
} else if (language === "swift") {
  // Swift packages with a Tests directory. `swift test` on a package without
  // one fails rather than no-opping, so the presence of the directory is the
  // selector.
  for (const manifest of tracked("*Package.swift")) {
    const packageDir = path.join(ROOT, path.dirname(manifest));
    if (!fs.existsSync(path.join(packageDir, "Tests"))) continue;
    const { status, output } = run("swift", ["test"], packageDir);
    // "Executed 3 tests, with 0 failures"
    const executed = output.match(/Executed (\d+) tests?/);
    suites.push({
      id: path.dirname(manifest),
      command: `swift test (${path.dirname(manifest)})`,
      ok: status === 0,
      tests: executed ? Number(executed[1]) : null,
    });
  }
} else if (language === "kotlin") {
  // Delegates to the existing Android runner, which prebuilds the Expo project
  // when it is absent and then runs the three JVM unit-test tasks.
  const { status } = run("node", ["conformance/android-native/run.mjs"]);
  suites.push({
    id: "apps/harness-mobile/android",
    command: "node conformance/android-native/run.mjs",
    ok: status === 0,
    tests: null,
  });
} else {
  console.error(
    `Unknown language: ${language}. Expected rust, swift, or kotlin.`,
  );
  process.exit(2);
}

if (suites.length === 0) {
  // Not a pass. A gate that silently finds nothing to run is how a suite
  // disappears without anybody noticing — the same failure this gate exists to
  // prevent, one level up.
  console.error(`${language}: no test suites found; expected at least one.`);
  process.exit(1);
}

const output = path.join(
  ROOT,
  "artifacts",
  "languages",
  `${language}-tests.json`,
);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(
  output,
  `${JSON.stringify(
    {
      version: 1,
      language,
      generatedAt: new Date().toISOString(),
      suites: suites.length,
      tests: suites.reduce((sum, suite) => sum + (suite.tests ?? 0), 0),
      failed: suites.filter((suite) => !suite.ok).length,
      detail: suites,
    },
    null,
    2,
  )}\n`,
);

const failed = suites.filter((suite) => !suite.ok);
console.log(
  `${language} tests: ${suites.length} suite(s), ${suites.reduce((sum, suite) => sum + (suite.tests ?? 0), 0)} test(s), ${failed.length} failing.`,
);
for (const suite of failed) console.error(`  FAILED ${suite.command}`);
if (failed.length > 0) process.exit(1);
