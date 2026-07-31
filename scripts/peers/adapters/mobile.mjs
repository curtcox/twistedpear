/**
 * iOS simulator and Android emulator harness peers.
 *
 * Both reuse the existing conformance device helpers, and both are brought
 * online by the same Maestro flow (`.maestro/local-peer-up.yaml`): create an
 * identity, connect TCP to the hub, mount the test agent. The simulator reaches
 * the hub on 127.0.0.1; the emulator reaches the host on 10.0.2.2 — the app
 * already picks the right one per platform.
 *
 * Neither peer is a process this CLI owns, so `running` is a device query
 * rather than a pid check.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, existsSync } from "node:fs";
import { join } from "node:path";
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
  launchHarness,
  maestroAvailable,
  requireDevice,
  waitForBootComplete
} from "../../../conformance/android-emulator/helpers.mjs";

const HARNESS_BUNDLE_ID = "network.twistedpear.harness";
const FLOW = `${repoRoot}/.maestro/local-peer-up.yaml`;

function runFlow(id, device, log) {
  log(`${id}: running ${FLOW}`);
  const result = spawnSync("maestro", ["--device", device, "test", FLOW], { cwd: repoRoot, encoding: "utf8" });
  appendFileSync(logPath(id), `${result.stdout ?? ""}${result.stderr ?? ""}`);
  if (result.status !== 0) {
    throw new Error(`maestro test ${FLOW} failed (see ${logPath(id)})`);
  }
}

function buildAndInstallAndroidHarness() {
  const harnessDir = join(repoRoot, "apps", "harness-mobile");
  const androidDir = join(harnessDir, "android");
  const prebuild = spawnSync("npx", ["expo", "prebuild", "--platform", "android", "--no-install"], {
    cwd: harnessDir,
    stdio: "inherit",
    env: { ...process.env, EXPO_NO_INTERACTIVE: "1" }
  });
  if (prebuild.status !== 0) throw new Error("expo prebuild --platform android failed");
  const assembled = spawnSync("./gradlew", ["assembleDebug"], { cwd: androidDir, stdio: "inherit" });
  if (assembled.status !== 0) throw new Error("Android debug harness build failed");
  const apk = join(androidDir, "app", "build", "outputs", "apk", "debug", "app-debug.apk");
  if (!existsSync(apk)) throw new Error(`Android debug APK is missing: ${apk}`);
  adb(["install", "-r", apk]);
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
  describe: () => "Android emulator harness (TCP client to 10.0.2.2 hub)",

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

    let installed = adb(["shell", "pm", "list", "packages", PACKAGE_ID]);
    if (build) {
      log("android: rebuilding and installing the harness");
      buildAndInstallAndroidHarness();
      installed = adb(["shell", "pm", "list", "packages", PACKAGE_ID]);
    }
    if (!installed.includes(PACKAGE_ID)) {
      throw new Error(
        `${PACKAGE_ID} is not installed on the emulator — build and install it with \`npx expo run:android\` in apps/harness-mobile`
      );
    }
    launchHarness();
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
