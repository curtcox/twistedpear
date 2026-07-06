#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { platform } from "node:os";

const requireXcode = process.argv.includes("--require-xcode") || process.env.IOS_SIM_REQUIRED === "1";

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

const tests = run("npm", ["test", "--", "packages/reticulum-interfaces/test/auto-discovery.test.ts"], {
  cwd: new URL("../../", import.meta.url)
});
if (!tests.ok) {
  fail(`discovery provider tests failed\n${tests.stdout}\n${tests.stderr}`);
}

console.log("[ios-sim] toolchain smoke passed: simctl available, dev/store worklets bundle, discovery policy green");
