/**
 * iOS simulator helpers for Handbook Maestro UI smoke.
 */

import { platform } from "node:os";
import { spawnSync } from "node:child_process";
import { HARNESS_BUNDLE_ID } from "../handbook/peer-helpers.mjs";

export function isDarwin() {
  return platform() === "darwin";
}

export function simctl(args) {
  const result = spawnSync("xcrun", ["simctl", ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`simctl ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }

  return result.stdout ?? "";
}

export function simctlAvailable() {
  return spawnSync("xcrun", ["simctl", "list"], { encoding: "utf8" }).status === 0;
}

export function bootedSimulatorUdid() {
  const output = simctl(["list", "devices", "booted"]);
  const match = output.match(/\(([0-9A-F-]{36})\)\s+\(Booted\)/i);
  return match?.[1] ?? null;
}

export function defaultSimulatorName() {
  return process.env.IOS_SIM_DEVICE ?? "iPhone 16";
}

export function bootSimulator(deviceName = defaultSimulatorName()) {
  const listed = simctl(["list", "devices", "available"]);
  const pattern = new RegExp(`${deviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(([0-9A-F-]{36})\\)`);
  const match = listed.match(pattern);
  if (match === null) {
    throw new Error(`No available simulator named ${deviceName}`);
  }

  const udid = match[1];
  simctl(["boot", udid]);
  return udid;
}

export function ensureBootedSimulator(deviceName = defaultSimulatorName()) {
  const booted = bootedSimulatorUdid();
  if (booted !== null) {
    return booted;
  }

  return bootSimulator(deviceName);
}

export function harnessInstalledOnBootedSim() {
  const booted = bootedSimulatorUdid();
  if (booted === null) {
    return false;
  }

  const apps = simctl(["listapps", booted]);
  return apps.includes(HARNESS_BUNDLE_ID);
}

export function buildAndInstallHarness(repoRoot, options = {}) {
  const deviceName = options.deviceName ?? defaultSimulatorName();
  const harnessDir = `${repoRoot}/apps/harness-mobile`;

  const worklet = spawnSync("npm", ["run", "build:worklet"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (worklet.status !== 0) {
    throw new Error("build:worklet failed");
  }

  const prebuild = spawnSync("npx", ["expo", "prebuild", "--platform", "ios", "--no-install"], {
    cwd: harnessDir,
    stdio: "inherit"
  });
  if (prebuild.status !== 0) {
    throw new Error("expo prebuild --platform ios failed");
  }

  const runIos = spawnSync(
    "npx",
    ["expo", "run:ios", "--device", deviceName, "--configuration", "Debug"],
    {
      cwd: harnessDir,
      stdio: "inherit",
      env: {
        ...process.env,
        EXPO_NO_INTERACTIVE: "1"
      }
    }
  );
  if (runIos.status !== 0) {
    throw new Error(`expo run:ios --device ${deviceName} failed`);
  }

  if (!harnessInstalledOnBootedSim()) {
    throw new Error(`Harness not installed on booted simulator after expo run:ios (${HARNESS_BUNDLE_ID})`);
  }
}
