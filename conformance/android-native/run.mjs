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
  ":twistedpear-usb-serial:testDebugUnitTest"
];

function run(command, args, cwd, env = {}) {
  const result = spawnSync(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed with status ${result.status ?? "unknown"}`);
  }
}

function ensureAndroidProject() {
  if (existsSync(androidDir)) {
    return;
  }

  console.log("[android-native] generating android project via expo prebuild");
  run("npx", ["expo", "prebuild", "--platform", "android", "--no-install"], harnessMobile);
}

function main() {
  ensureAndroidProject();

  const gradlew = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
  console.log("[android-native] running JVM unit tests");
  run(gradlew, NATIVE_TEST_TASKS, androidDir);
  console.log("[android-native] ble-bridge, multicast, and usb-serial JVM tests passed");
}

main();
