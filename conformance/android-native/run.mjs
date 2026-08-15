#!/usr/bin/env node
/**
 * Android native-module JVM unit tests (Phase 2/3 emulator lab CI tier).
 * Runs bridge logic tests for BLE, multicast, and USB serial modules.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const harnessMobile = join(repoRoot, "apps/harness-mobile");
const androidDir = join(harnessMobile, "android");

const NATIVE_TEST_TASKS = [
  ":twistedpear-ble-bridge:testDebugUnitTest",
  ":twistedpear-multicast:testDebugUnitTest",
  ":twistedpear-usb-serial:testDebugUnitTest",
];

/**
 * Failures that are the network's fault rather than the code's.
 *
 * The Android build resolves plugins declared by a third-party included build:
 * `@react-native/gradle-plugin` pulls
 * `org.gradle.toolchains.foojay-resolver-convention` from the plugin portal. We
 * do not declare it, and `npm ci` rewrites the file that does, so there is
 * nothing here to pin — a portal hiccup made this gate a coin flip, and a flaky
 * gate is worse than a missing one because it trains everyone to re-run.
 *
 * Retrying is therefore narrow and deliberate: only a failure whose output
 * matches one of these, only twice, and never a Kotlin test that actually
 * failed. `attemptsUsed` is reported so a pass that needed a retry is visible
 * on /results/ instead of being indistinguishable from a clean one.
 */
export const TRANSIENT_GRADLE_PATTERNS = [
  /was not found in any of the following sources/,
  /Could not resolve all (?:files|dependencies|artifacts) for/,
  /Could not (?:GET|HEAD|download) /,
  /Read timed out/,
  /Connection reset/,
  /Premature end of Content-Length/,
];

export function transientReason(output) {
  return (
    TRANSIENT_GRADLE_PATTERNS.find((pattern) => pattern.test(output))?.source ??
    null
  );
}

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(
      `${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`,
    );
  }
}

/**
 * Run Gradle, retrying only transient dependency-resolution failures.
 *
 * Output is captured rather than inherited so the retry decision can be made on
 * what Gradle actually said; it is echoed either way, so the log reads the same
 * as before.
 */
export function runGradleWithRetry(command, args, cwd, maxAttempts = 3) {
  let lastFailure = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = spawnSync(command, args, {
      cwd,
      env: process.env,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
    });

    const output = `${result.stdout ?? ""}${result.stderr ?? ""}`;
    process.stdout.write(result.stdout ?? "");
    process.stderr.write(result.stderr ?? "");

    if (result.status === 0) {
      return { attemptsUsed: attempt };
    }

    const reason = transientReason(output);
    lastFailure = `${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`;

    if (reason === null) {
      // A real failure. Do not retry it — that is how a broken test becomes a
      // gate nobody trusts.
      throw new Error(lastFailure);
    }

    if (attempt < maxAttempts) {
      console.warn(
        `[android-native] transient dependency resolution failure on attempt ${attempt}/${maxAttempts} (matched /${reason}/); retrying`,
      );
    }
  }

  throw new Error(
    `${lastFailure} — still failing after ${maxAttempts} attempts against transient dependency resolution`,
  );
}

function ensureAndroidProject() {
  if (existsSync(androidDir)) {
    return;
  }

  console.log("[android-native] generating android project via expo prebuild");
  run(
    "npx",
    ["expo", "prebuild", "--platform", "android", "--no-install"],
    harnessMobile,
  );
}

function main() {
  ensureAndroidProject();

  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  console.log("[android-native] running JVM unit tests");
  const { attemptsUsed } = runGradleWithRetry(
    gradlew,
    NATIVE_TEST_TASKS,
    androidDir,
  );
  console.log(
    "[android-native] ble-bridge, multicast, and usb-serial JVM tests passed",
  );
  // Machine-readable, so `scripts/languages/test.mjs` can record a pass that
  // needed a retry rather than reporting it as an ordinary green.
  console.log(`[android-native] attempts=${attemptsUsed}`);
}

// Importable for tests without running the Android build, which needs an SDK
// this file's own gate declares and most machines do not have.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main();
}
