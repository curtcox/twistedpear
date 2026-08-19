/**
 * iOS simulator helpers for Handbook Maestro UI smoke.
 */

import { existsSync, utimesSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { platform } from "node:os";
import { spawnSync } from "node:child_process";
import { HARNESS_BUNDLE_ID } from "../handbook/peer-helpers.mjs";

const labDir = dirname(fileURLToPath(import.meta.url));
const defaultDerivedDataPath = join(labDir, ".ios-derived");

export function isDarwin() {
  return platform() === "darwin";
}

export function simctl(args) {
  const result = spawnSync("xcrun", ["simctl", ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(
      `simctl ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }

  return result.stdout ?? "";
}

export function simctlAvailable() {
  return (
    spawnSync("xcrun", ["simctl", "list"], { encoding: "utf8" }).status === 0
  );
}

export function bootedSimulatorUdid() {
  const output = simctl(["list", "devices", "booted"]);
  const match = output.match(/\(([0-9A-F-]{36})\)\s+\(Booted\)/i);
  return match?.[1] ?? null;
}

export function defaultSimulatorName() {
  if (
    process.env.IOS_SIM_DEVICE !== undefined &&
    process.env.IOS_SIM_DEVICE.length > 0
  ) {
    return process.env.IOS_SIM_DEVICE;
  }

  const listed = simctl(["list", "devices", "available"]);
  const preferred = [
    "iPhone 17 Pro",
    "iPhone 16",
    "iPhone 15",
    "iPhone 14",
    "iPhone SE (3rd generation)",
  ];
  for (const name of preferred) {
    if (listed.includes(`${name} (`)) {
      return name;
    }
  }

  const fallback = listed.match(/^\s+(iPhone[^\n(]+) \(/m);
  if (fallback !== null) {
    return fallback[1].trim();
  }

  throw new Error("No available iPhone simulator found (set IOS_SIM_DEVICE)");
}

export function bootSimulator(deviceName = defaultSimulatorName()) {
  const listed = simctl(["list", "devices", "available"]);
  const pattern = new RegExp(
    `${deviceName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\(([0-9A-F-]{36})\\)`,
  );
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

export function harnessAppPath(
  repoRoot,
  derivedDataPath = defaultDerivedDataPath,
) {
  return join(
    derivedDataPath,
    "Build",
    "Products",
    "Release-iphonesimulator",
    "TwistedPearHarness.app",
  );
}

/**
 * Release simulator build with an embedded JS bundle (no Metro picker).
 * `expo run:ios` opens the dev-client URL even with `--no-bundler`; xcodebuild
 * installs the same Release binary Maestro expects.
 */
export function buildHarnessApp(
  repoRoot,
  options = {},
) {
  const harnessDir = join(repoRoot, "apps/harness-mobile");
  const iosDir = join(harnessDir, "ios");
  const derivedDataPath = options.derivedDataPath ?? defaultDerivedDataPath;
  const env = {
    ...process.env,
    EXPO_NO_INTERACTIVE: "1",
  };

  const worklet = spawnSync("npm", ["run", "build:worklet"], {
    cwd: repoRoot,
    stdio: "inherit",
    env,
  });
  if (worklet.status !== 0) {
    throw new Error("build:worklet failed");
  }

  const bareAddons = spawnSync(
    "node",
    ["scripts/link-bare-addons.mjs", "ios"],
    {
      cwd: harnessDir,
      stdio: "inherit",
      env,
    },
  );
  if (bareAddons.status !== 0) {
    throw new Error("link-bare-addons ios failed");
  }

  const iosWorkspace = join(iosDir, "TwistedPearHarness.xcworkspace");
  const skipPrebuild =
    options.skipPrebuild === true ||
    (process.env.IOS_SIM_PREBUILD !== "1" && existsSync(iosWorkspace));
  if (!skipPrebuild) {
    const prebuild = spawnSync(
      "npx",
      ["expo", "prebuild", "--platform", "ios", "--no-install"],
      {
        cwd: harnessDir,
        stdio: "inherit",
        env,
      },
    );
    if (prebuild.status !== 0) {
      throw new Error("expo prebuild --platform ios failed");
    }

    const pods = spawnSync("npx", ["pod-install"], {
      cwd: harnessDir,
      stdio: "inherit",
      env,
    });
    if (pods.status !== 0) {
      throw new Error("pod-install failed");
    }
  }

  const jsEntry = join(harnessDir, "index.js");
  const workletBundle = join(harnessDir, "worklet/worklet.bundle.mjs");
  const now = new Date();
  if (existsSync(jsEntry)) {
    utimesSync(jsEntry, now, now);
  }
  if (existsSync(workletBundle)) {
    utimesSync(workletBundle, now, now);
  }

  const xcodebuild = spawnSync(
    "xcodebuild",
    [
      "-workspace",
      join(iosDir, "TwistedPearHarness.xcworkspace"),
      "-scheme",
      "TwistedPearHarness",
      "-configuration",
      "Release",
      "-sdk",
      "iphonesimulator",
      "-derivedDataPath",
      derivedDataPath,
      "CODE_SIGNING_ALLOWED=NO",
      "build",
    ],
    {
      cwd: harnessDir,
      stdio: "inherit",
      env,
    },
  );
  if (xcodebuild.status !== 0) {
    throw new Error("xcodebuild Release iphonesimulator failed");
  }

  const appPath = harnessAppPath(repoRoot, derivedDataPath);
  if (!existsSync(appPath)) {
    throw new Error(`iOS Release harness app is missing: ${appPath}`);
  }
  return appPath;
}

export function installHarnessApp(appPath, udid = "booted") {
  simctl(["install", udid, appPath]);
}

export function launchHarness() {
  simctl(["launch", "booted", HARNESS_BUNDLE_ID]);
}

export function buildAndInstallHarness(repoRoot, options = {}) {
  ensureBootedSimulator(options.deviceName);
  const appPath = buildHarnessApp(repoRoot, options);
  installHarnessApp(appPath);
  if (!harnessInstalledOnBootedSim()) {
    throw new Error(
      `Harness not installed on booted simulator after install (${HARNESS_BUNDLE_ID})`,
    );
  }
}
