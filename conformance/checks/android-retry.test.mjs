/**
 * The Android gate retries transient Gradle dependency resolution.
 *
 * That retry is the only thing standing between `kotlin-tests` and the coin
 * flip it used to be, and it cannot be exercised by running the gate: the gate
 * needs an Android SDK, and it only misbehaves when the plugin portal does.
 * These tests drive the retry against scripted child processes instead, so the
 * two properties that make a retry honest — it retries the network, and it
 * never retries a failing test — are checked on every PR.
 */
import { describe, expect, it } from "vitest";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { runGradleWithRetry, transientReason } from "../android-native/run.mjs";

/** Verbatim from the run that turned kotlin-tests red at 45ffba32. */
const FOOJAY_FAILURE = `
Plugin [id: 'org.gradle.toolchains.foojay-resolver-convention', version: '1.0.0'] was not found in any of the following sources:

- Gradle Core Plugins (plugin is not in 'org.gradle' namespace)
- Included Builds (No included builds contain this plugin)
- Plugin Repositories (could not resolve plugin artifact 'org.gradle.toolchains.foojay-resolver-convention:org.gradle.toolchains.foojay-resolver-convention.gradle.plugin:1.0.0')
  Searched in the following repositories:
    MavenRepo
    Google
    Gradle Central Plugin Repository
`;

/** A Kotlin assertion that genuinely does not hold. */
const REAL_TEST_FAILURE = `
> Task :twistedpear-ble-bridge:testDebugUnitTest FAILED

BleBridgeTest > encodes an advertisement FAILED
    org.opentest4j.AssertionFailedError: expected: <3> but was: <4>
`;

/**
 * Write a script that fails with `output` for its first `failures` runs and
 * succeeds afterwards, tracking attempts in a counter file on disk because each
 * attempt is a fresh process.
 */
function scriptedCommand(output, failures) {
  const directory = mkdtempSync(join(tmpdir(), "tp-android-retry-"));
  const counter = join(directory, "attempts");
  const script = join(directory, "fake-gradlew.mjs");
  writeFileSync(
    script,
    `import { appendFileSync, readFileSync, existsSync } from "node:fs";
appendFileSync(${JSON.stringify(counter)}, "x");
const attempts = existsSync(${JSON.stringify(counter)})
  ? readFileSync(${JSON.stringify(counter)}, "utf8").length
  : 0;
if (attempts <= ${failures}) {
  process.stderr.write(${JSON.stringify(output)});
  process.exit(1);
}
process.stdout.write("BUILD SUCCESSFUL\\n");
`,
  );
  return { script, directory };
}

describe("transientReason", () => {
  it("classifies the foojay plugin-portal failure as transient", () => {
    expect(transientReason(FOOJAY_FAILURE)).not.toBeNull();
  });

  it("does not classify a failing Kotlin test as transient", () => {
    expect(transientReason(REAL_TEST_FAILURE)).toBeNull();
  });
});

describe("runGradleWithRetry", () => {
  it("reports one attempt when the build passes first time", () => {
    const { script, directory } = scriptedCommand(FOOJAY_FAILURE, 0);
    expect(runGradleWithRetry("node", [script], directory)).toEqual({
      attemptsUsed: 1,
    });
  });

  it("retries a transient resolution failure and records the attempt count", () => {
    const { script, directory } = scriptedCommand(FOOJAY_FAILURE, 1);
    expect(runGradleWithRetry("node", [script], directory)).toEqual({
      attemptsUsed: 2,
    });
  });

  it("gives up rather than retrying forever", () => {
    const { script, directory } = scriptedCommand(FOOJAY_FAILURE, 99);
    expect(() => runGradleWithRetry("node", [script], directory)).toThrow(
      /still failing after 3 attempts/,
    );
  });

  it("never retries a genuine test failure", () => {
    const { script, directory } = scriptedCommand(REAL_TEST_FAILURE, 1);
    // Scripted to succeed on the second run: if this returned instead of
    // throwing, the retry would be masking a red suite.
    expect(() => runGradleWithRetry("node", [script], directory)).toThrow(
      /failed with status 1/,
    );
  });
});
