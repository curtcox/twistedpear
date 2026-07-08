#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { platform } from "node:os";
import { runStorePostureChecks } from "./store-posture.mjs";
import { runIosTcpSlice } from "./tcp-slice.mjs";
import { runIosFullLoop } from "./full-loop.mjs";
import { runIosLifecycleSlice } from "./lifecycle.mjs";
import { runUsbSerialProbe } from "./usb-probe.mjs";
import { runIosDevLoop } from "./dev-loop.mjs";
import { runIosHostileSmoke } from "./hostile-smoke.mjs";
import { runIosHandbookSlice } from "./handbook.mjs";
import { runIosInterfacePolicy } from "./interface-policy.mjs";
import { runIosCryptoBenchmark } from "./crypto-benchmark.mjs";
import { runBonjourInterop } from "../bonjour-interop/run.mjs";

const requireXcode = process.argv.includes("--require-xcode") || process.env.IOS_SIM_REQUIRED === "1";
const requirePeer = process.argv.includes("--require-peer") || process.env.IOS_SIM_TCP_REQUIRED === "1";

function run(cmd, args, options = {}) {
  const result = spawnSync(cmd, args, {
    stdio: "pipe",
    encoding: "utf8",
    ...options
  });

  return {
    ok: result.status === 0,
    status: result.status ?? 1,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? ""
  };
}

function fail(message) {
  console.error(`[ios-sim] ${message}`);
  process.exit(1);
}

if (platform() !== "darwin") {
  const message = "iOS simulator lane requires macOS; skipping host-incompatible check";
  if (requireXcode) {
    fail(message);
  }

  console.log(`[ios-sim] ${message}`);
  process.exit(0);
}

const simctl = run("xcrun", ["simctl", "list", "devices", "available"]);
if (!simctl.ok) {
  fail(`xcrun simctl unavailable\n${simctl.stderr}`);
}

const build = run("npm", ["run", "build:worklet"], {
  cwd: new URL("../../", import.meta.url)
});
if (!build.ok) {
  fail(`worklet bundle failed\n${build.stdout}\n${build.stderr}`);
}

const postureBuild = run("npm", ["run", "build:worklet"], {
  cwd: new URL("../../", import.meta.url),
  env: {
    ...process.env,
    TWISTEDPEAR_STORE_POSTURE: "store"
  }
});
if (!postureBuild.ok) {
  fail(`store posture worklet bundle failed\n${postureBuild.stdout}\n${postureBuild.stderr}`);
}

const storePosture = readFileSync(
  new URL("../../apps/harness-mobile/worklet/store-posture.generated.mjs", import.meta.url),
  "utf8"
);
if (!storePosture.includes('"store"') || !storePosture.includes("STORE_VARIANT = true")) {
  fail("store posture worklet metadata was not generated correctly");
}

const tests = run("npm", ["test", "--", "packages/reticulum-interfaces/test/auto-discovery.test.ts", "packages/reticulum-interfaces/test/bonjour-mdns.test.ts"], {
  cwd: new URL("../../", import.meta.url)
});
if (!tests.ok) {
  fail(`discovery provider tests failed\n${tests.stdout}\n${tests.stderr}`);
}

const bleSpecTests = run("swift", ["test"], {
  cwd: new URL("../../apps/harness-mobile/modules/ble-bridge", import.meta.url)
});
if (!bleSpecTests.ok) {
  fail(`BLE bridge spec tests failed\n${bleSpecTests.stdout}\n${bleSpecTests.stderr}`);
}

try {
  runUsbSerialProbe();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runBonjourInterop();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  runIosInterfacePolicy();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  runIosCryptoBenchmark();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runIosHostileSmoke();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runIosHandbookSlice();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runIosDevLoop();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runIosFullLoop();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runIosLifecycleSlice({ requirePeer });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runStorePostureChecks();
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

try {
  await runIosTcpSlice({ requirePeer });
} catch (error) {
  fail(error instanceof Error ? error.message : String(error));
}

console.log("[ios-sim] toolchain smoke passed: simctl available, dev/store worklets bundle, usb probe, bonjour interop, crypto decision, interface policy, hostile smoke, handbook slice, dev loop, full loop, discovery policy, BLE spec tests, store-posture refusal" + (requirePeer ? ", tcp slice, lifecycle quiesce" : " (tcp/lifecycle skipped without leaf-echo peer)"));
