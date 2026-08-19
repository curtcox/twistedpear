/**
 * Shared adb helpers for Android emulator lab automation.
 */

import { existsSync, readFileSync, utimesSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const labDir = dirname(fileURLToPath(import.meta.url));

export const PACKAGE_ID = "network.twistedpear.harness";
export const FOREGROUND_SERVICE =
  "network.twistedpear.harness.NodeForegroundService";
export const NOTIFICATION_TITLE = "TwistedPear node active";

export function adb(args, options = {}) {
  const result = spawnSync("adb", args, {
    encoding: "utf8",
    stdio: options.inherit ? "inherit" : "pipe",
  });

  if (result.status !== 0) {
    throw new Error(
      `adb ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
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
    throw new Error(
      "No adb device connected (start an emulator or set ANDROID_SERIAL)",
    );
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

  throw new Error(
    "Timed out waiting for fixture-meta.json (host-peer publish still running?)",
  );
}

export function isForegroundServiceRunning() {
  const services = adb([
    "shell",
    "dumpsys",
    "activity",
    "services",
    PACKAGE_ID,
  ]);
  return services.includes(FOREGROUND_SERVICE);
}

export function hasForegroundNotification() {
  const notifications = adb(["shell", "dumpsys", "notification", "--noredact"]);
  return (
    notifications.includes(NOTIFICATION_TITLE) ||
    notifications.includes("TwistedPear")
  );
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
    "android.intent.category.LAUNCHER",
  ]);
}

export function harnessInstalled() {
  try {
    return adb(["shell", "pm", "list", "packages", PACKAGE_ID]).includes(
      PACKAGE_ID,
    );
  } catch {
    return false;
  }
}

function defaultJavaHome() {
  if (typeof process.env.JAVA_HOME === "string" && process.env.JAVA_HOME) {
    return process.env.JAVA_HOME;
  }
  const brewJdk17 = "/opt/homebrew/opt/openjdk@17";
  return existsSync(join(brewJdk17, "bin", "java")) ? brewJdk17 : undefined;
}

function defaultAndroidHome() {
  return (
    process.env.ANDROID_HOME ?? `${process.env.HOME ?? ""}/Library/Android/sdk`
  );
}

export function harnessApkPath(
  repoRoot = join(labDir, "../.."),
  variant = "release",
) {
  return join(
    repoRoot,
    "apps",
    "harness-mobile",
    "android",
    "app",
    "build",
    "outputs",
    "apk",
    variant,
    `app-${variant}.apk`,
  );
}

/**
 * Prebuild and assemble the harness APK.
 *
 * Release (the default) embeds the JS bundle so Maestro reaches Create identity
 * without the expo-dev-client Metro picker. Debug + Metro is what produced
 * PlatformConstants missing from the TurboModule registry. Stop the emulator
 * on a 16 GB host before calling this — the guest plus release dex OOMs.
 */
export function buildHarnessApk(
  repoRoot = join(labDir, "../.."),
  options = {},
) {
  const variant = options.variant ?? "release";
  const harnessDir = join(repoRoot, "apps", "harness-mobile");
  const androidDir = join(harnessDir, "android");
  const javaHome = defaultJavaHome();
  const env = {
    ...process.env,
    EXPO_NO_INTERACTIVE: "1",
    ANDROID_HOME: defaultAndroidHome(),
    ...(javaHome === undefined ? {} : { JAVA_HOME: javaHome }),
  };
  const prebuild = spawnSync(
    "npx",
    ["expo", "prebuild", "--platform", "android", "--no-install"],
    {
      cwd: harnessDir,
      stdio: "inherit",
      env,
    },
  );
  if (prebuild.status !== 0)
    throw new Error("expo prebuild --platform android failed");
  // Bare TCP/FS addons must land in react-native-bare-kit's jniLibs addons dir
  // before assemble; otherwise the worklet cannot open host sockets.
  const linkAddons = spawnSync(
    "node",
    ["scripts/link-bare-addons.mjs", "android"],
    {
      cwd: harnessDir,
      stdio: "inherit",
      env,
    },
  );
  if (linkAddons.status !== 0)
    throw new Error("link-bare-addons android failed");
  // createBundleReleaseJsAndAssets does not list worklet.bundle.mjs as an input,
  // so a pack-only refresh would otherwise stay UP-TO-DATE.
  const jsEntry = join(harnessDir, "index.js");
  if (existsSync(jsEntry)) {
    const now = new Date();
    utimesSync(jsEntry, now, now);
  }
  const gradleArgs = [
    variant === "release" ? "assembleRelease" : "assembleDebug",
    "-PreactNativeArchitectures=arm64-v8a",
  ];
  if (variant === "release") {
    gradleArgs.push(
      "-x",
      "lintVitalAnalyzeRelease",
      "-x",
      "lintVitalReportRelease",
      "-x",
      "lintVitalRelease",
    );
  }
  const assembled = spawnSync("./gradlew", gradleArgs, {
    cwd: androidDir,
    stdio: "inherit",
    env: {
      ...env,
      GRADLE_OPTS:
        process.env.GRADLE_OPTS ??
        "-Dorg.gradle.jvmargs=-Xmx3g -XX:MaxMetaspaceSize=512m",
    },
  });
  if (assembled.status !== 0) {
    throw new Error(`Android ${variant} harness build failed`);
  }
  const apk = harnessApkPath(repoRoot, variant);
  if (!existsSync(apk)) {
    throw new Error(`Android ${variant} APK is missing: ${apk}`);
  }
  return apk;
}

export function installHarnessApk(
  repoRoot = join(labDir, "../.."),
  variant = "release",
) {
  const apk = harnessApkPath(repoRoot, variant);
  if (!existsSync(apk)) {
    throw new Error(`Android ${variant} APK is missing: ${apk}`);
  }
  adb(["install", "-r", apk]);
}

/** Prebuild, assembleRelease, and adb-install the harness (several minutes). */
export function buildAndInstallHarness(repoRoot = join(labDir, "../..")) {
  buildHarnessApk(repoRoot, { variant: "release" });
  installHarnessApk(repoRoot, "release");
}

export function maestro(args) {
  const env = {
    ...process.env,
    PATH: `${process.env.HOME ?? ""}/.maestro/bin:${process.env.PATH ?? ""}`,
  };
  const result = spawnSync("maestro", args, { stdio: "inherit", env });
  if (result.status !== 0) {
    throw new Error(`maestro ${args.join(" ")} failed`);
  }
}

export function maestroAvailable() {
  const env = {
    ...process.env,
    PATH: `${process.env.HOME ?? ""}/.maestro/bin:${process.env.PATH ?? ""}`,
  };
  const result = spawnSync("maestro", ["--version"], { encoding: "utf8", env });
  return result.status === 0;
}

export function readFixtureAppId() {
  const meta = JSON.parse(
    readFileSync(join(labDir, "fixture-meta.json"), "utf8"),
  );
  if (typeof meta.appId !== "string" || meta.appId.length === 0) {
    throw new Error("fixture-meta.json missing appId (start host-peer first)");
  }

  return meta.appId;
}

export {
  HANDBOOK_FIXTURE_META_PATH,
  HARNESS_BUNDLE_ID,
  dockerAvailable,
  maestroHandbookSmoke,
  waitForHandbookMeta,
} from "../handbook/peer-helpers.mjs";

export function maestroWithFixtureEnv(flowPath) {
  const appId = readFixtureAppId();
  maestro(["test", "-e", `APP_ID=${appId}`, flowPath]);
}
