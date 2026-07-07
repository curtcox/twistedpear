/**
 * Shared adb helpers for Android emulator lab automation.
 */

import { spawnSync } from "node:child_process";

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
