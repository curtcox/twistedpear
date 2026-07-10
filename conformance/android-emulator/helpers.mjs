/**
 * Shared adb helpers for Android emulator lab automation.
 */

import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const labDir = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ID = "network.twistedpear.harness";
export const FOREGROUND_SERVICE = "network.twistedpear.harness.NodeForegroundService";
export const NOTIFICATION_TITLE = "TwistedPear node active";

export function adb(args, options = {}) {
  const result = spawnSync("adb", args, {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe"
  });

  if (result.status !== 0) {
    throw new Error(`adb ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout ?? "";
}

export function requireDevice() {
  const devices = adb(["devices"]);
  const serials = devices
    .split("\n")
    .slice(1)
    .map((line) => line.trim().split("\t")[0])
    .filter((serial) => serial.length > 0 && !serial.startsWith("*"));

  if (serials.length === 0) {
    throw new Error("No adb device connected (start an emulator or set ANDROID_SERIAL)");
  }

  return process.env.ANDROID_SERIAL ?? serials[0];
}

export function waitForBootComplete(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const booted = adb(["shell", "getprop", "sys.boot_completed"]).trim();
    if (booted === "1") {
      return;
    }

    spawnSync("sleep", ["2"]);
  }

  throw new Error("Timed out waiting for emulator boot");
}

export function waitForFixtureMeta(timeoutMs = 120_000) {
  const metaPath = join(labDir, "fixture-meta.json");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      if (typeof meta.appId === "string" && meta.appId.length > 0) {
        return meta;
      }
    }

    spawnSync("sleep", ["1"]);
  }

  throw new Error("Timed out waiting for fixture-meta.json (host-peer publish still running?)");
}

export function isForegroundServiceRunning() {
  const services = adb(["shell", "dumpsys", "activity", "services", PACKAGE_ID]);
  return services.includes(FOREGROUND_SERVICE);
}

export function hasForegroundNotification() {
  const notifications = adb(["shell", "dumpsys", "notification", "--noredact"]);
  return notifications.includes(NOTIFICATION_TITLE) || notifications.includes("TwistedPear");
}

export function pressHome() {
  adb(["shell", "input", "keyevent", "KEYCODE_HOME"]);
}

export function launchHarness() {
  adb([
    "shell",
    "am",
    "start",
    "-n",
    `${PACKAGE_ID}/.MainActivity`,
    "-a",
    "android.intent.action.MAIN",
    "-c",
    "android.intent.category.LAUNCHER"
  ]);
}

export function maestro(args) {
  const result = spawnSync("maestro", args, { stdio: "inherit" });
  if (result.status !== 0) {
    throw new Error(`maestro ${args.join(" ")} failed`);
  }
}

export function maestroAvailable() {
  const result = spawnSync("maestro", ["--version"], { encoding: "utf8" });
  return result.status === 0;
}

export function readFixtureAppId() {
  const meta = JSON.parse(readFileSync(join(labDir, "fixture-meta.json"), "utf8"));
  if (typeof meta.appId !== "string" || meta.appId.length === 0) {
    throw new Error("fixture-meta.json missing appId (start host-peer first)");
  }

  return meta.appId;
}

export function waitForHandbookMeta(timeoutMs = 180_000) {
  const metaPath = join(labDir, "handbook-fixture-meta.json");
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (existsSync(metaPath)) {
      const meta = JSON.parse(readFileSync(metaPath, "utf8"));
      if (typeof meta.appId === "string" && meta.appId.length > 0) {
        return meta;
      }
    }

    spawnSync("sleep", ["1"]);
  }

  throw new Error("Timed out waiting for handbook-fixture-meta.json (handbook-peer still starting?)");
}

export function maestroWithFixtureEnv(flowPath) {
  const appId = readFixtureAppId();
  maestro(["test", "-e", `APP_ID=${appId}`, flowPath]);
}

export function maestroHandbookSmoke() {
  maestro(["test", ".maestro/handbook-smoke.yaml"]);
}
