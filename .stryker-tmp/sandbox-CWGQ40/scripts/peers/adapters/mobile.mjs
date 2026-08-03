/**
 * iOS simulator and Android emulator harness peers.
 *
 * Both reuse the existing conformance device helpers, and both are brought
 * online by the same Maestro flow (`.maestro/local-peer-up.yaml`): create an
 * identity, connect TCP to the hub, mount the test agent. The simulator reaches
 * the hub on 127.0.0.1; the emulator reaches the host on 10.0.2.2. The adapter
 * also sets `adb reverse` for hub/control/Metro as a fallback on AVDs where
 * host TCP via 10.0.2.2 is flaky.
 *
 * Neither peer is a process this CLI owns, so `running` is a device query
 * rather than a pid check.
 */
// @ts-nocheck

import { spawnSync } from "node:child_process";
import { appendFileSync } from "node:fs";
import { logPath, repoRoot } from "../state.mjs";
import {
  bootedSimulatorUdid,
  buildAndInstallHarness,
  ensureBootedSimulator,
  harnessInstalledOnBootedSim,
  isDarwin,
  simctl,
  simctlAvailable
} from "../../../conformance/ios-sim/helpers.mjs";
import {
  PACKAGE_ID,
  adb,
  buildAndInstallHarness as buildAndInstallAndroidHarness,
  harnessInstalled,
  launchHarness,
  maestroAvailable,
  requireDevice,
  waitForBootComplete
} from "../../../conformance/android-emulator/helpers.mjs";
import { CONTROL_PORT, HUB_PORT } from "../state.mjs";

const HARNESS_BUNDLE_ID = "network.twistedpear.harness";
const FLOW = `${repoRoot}/.maestro/local-peer-up.yaml`;
/** Metro / Expo packager — reverse so the emulator can use localhost. */
const METRO_PORT = 8081;

function adbReverseHubPorts(log) {
  for (const port of [HUB_PORT, CONTROL_PORT, METRO_PORT]) {
    try {
      adb(["reverse", `tcp:${port}`, `tcp:${port}`]);
      log(`android: adb reverse tcp:${port}`);
    } catch (error) {
      throw new Error(
        `adb reverse tcp:${port} failed: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

function maestroEnv() {
  // Prefer the CLI install. Maestro.app's Electron shim becomes Node under
  // ELECTRON_RUN_AS_NODE (common in agent shells) and rejects `--device`.
  const home = process.env.HOME ?? "";
  return {
    ...process.env,
    PATH: `${home}/.maestro/bin:${process.env.PATH ?? ""}`,
    ELECTRON_RUN_AS_NODE: undefined
  };
}

function runFlow(id, device, log) {
  log(`${id}: running ${FLOW}`);
  const result = spawnSync("maestro", ["--device", device, "test", FLOW], {
    cwd: repoRoot,
    encoding: "utf8",
    env: maestroEnv()
  });
  appendFileSync(logPath(id), `${result.stdout ?? ""}${result.stderr ?? ""}`);
  if (result.status !== 0) {
    throw new Error(`maestro test ${FLOW} failed (see ${logPath(id)})`);
  }
}

export const iosAdapter = {
  id: "ios",
  kind: "ios",
  describe: () => "iOS simulator harness (TCP client to 127.0.0.1 hub)",

  async up({ log, build }) {
    if (!isDarwin() || !simctlAvailable()) {
      throw new Error("Xcode command line tools (simctl) are unavailable");
    }
    if (!maestroAvailable()) {
      throw new Error("maestro is not installed (https://maestro.mobile.dev)");
    }

    const udid = ensureBootedSimulator();
    log(`ios: simulator ${udid} booted`);
    if (build || !harnessInstalledOnBootedSim()) {
      log("ios: building and installing the harness (this takes several minutes)");
      buildAndInstallHarness(repoRoot);
    }
    try {
      runFlow("ios", udid, log);
    } catch (error) {
      spawnSync("xcrun", ["simctl", "terminate", udid, HARNESS_BUNDLE_ID], {
        encoding: "utf8"
      });
      throw error;
    }
    return { kind: "ios", udid };
  },

  async down(entry, { log }) {
    if (!isDarwin() || !simctlAvailable()) {
      return;
    }
    const udid = entry.udid ?? bootedSimulatorUdid();
    if (udid === null) {
      return;
    }
    // Terminate the app but leave the simulator booted: rebooting it costs
    // minutes on the next `up` and it holds no peer state of its own.
    spawnSync("xcrun", ["simctl", "terminate", udid, HARNESS_BUNDLE_ID], { encoding: "utf8" });
    log("ios: harness terminated");
  },

  running(entry) {
    if (entry?.udid === undefined || !isDarwin() || !simctlAvailable()) {
      return false;
    }
    const result = simctl(["spawn", entry.udid, "launchctl", "list"]);
    return result.includes(HARNESS_BUNDLE_ID);
  }
};

export const androidAdapter = {
  id: "android",
  kind: "android",
  describe: () => "Android emulator harness (TCP client via adb reverse to 127.0.0.1 hub)",

  async up({ log, build }) {
    if (spawnSync("adb", ["version"], { encoding: "utf8" }).status !== 0) {
      throw new Error("adb is not on PATH (install Android platform tools)");
    }
    // The emulator itself is the user's to start; this adapter attaches to it.
    requireDevice();
    waitForBootComplete();
    if (!maestroAvailable()) {
      throw new Error("maestro is not installed (https://maestro.mobile.dev)");
    }

    if (build || !harnessInstalled()) {
      log("android: building and installing the harness (this takes several minutes)");
      buildAndInstallAndroidHarness(repoRoot);
    }
    if (!harnessInstalled()) {
      throw new Error(
        `${PACKAGE_ID} is not installed on the emulator after build — check adb install logs`
      );
    }
    // Host hub TCP is often refused via 10.0.2.2 even when ICMP works; reverse to
    // loopback matches the harness ANDROID_EMULATOR_HOST = 127.0.0.1.
    adbReverseHubPorts(log);
    // Pre-grant mic so Android-originated WebRTC attach does not block on a
    // runtime permission dialog under Maestro / headless control.
    try {
      adb(["shell", "pm", "grant", PACKAGE_ID, "android.permission.RECORD_AUDIO"]);
      log("android: granted RECORD_AUDIO");
    } catch (error) {
      log(
        `android: RECORD_AUDIO grant skipped (${error instanceof Error ? error.message : String(error)})`
      );
    }
    try {
      runFlow("android", adb(["get-serialno"]).trim(), log);
    } catch (error) {
      try {
        adb(["shell", "am", "force-stop", PACKAGE_ID]);
      } catch {
        // Preserve the setup failure; cleanup is best-effort.
      }
      throw error;
    }
    return { kind: "android" };
  },

  async down(_entry, { log }) {
    try {
      adb(["shell", "am", "force-stop", PACKAGE_ID]);
      log("android: harness stopped");
    } catch {
      // No device attached; nothing to stop.
    }
  },

  running() {
    try {
      return adb(["shell", "pidof", PACKAGE_ID]).trim().length > 0;
    } catch {
      return false;
    }
  }
};
