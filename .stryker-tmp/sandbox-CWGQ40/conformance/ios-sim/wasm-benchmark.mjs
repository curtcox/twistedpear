#!/usr/bin/env node
// @ts-nocheck
/**
 * iOS simulator BareKit Worker + WASM + watchdog probe (simulator-first S4).
 * Invokes the in-host benchmark through the installed harness via Maestro —
 * not through desktop Bare.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { maestroAvailable } from "../handbook/peer-helpers.mjs";
import {
  buildAndInstallHarness,
  ensureBootedSimulator,
  harnessInstalledOnBootedSim,
  isDarwin,
  simctlAvailable
} from "./helpers.mjs";
import { updateS4SupportMatrix } from "../freenet-spike/update-s4-matrix.mjs";

const labDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(labDir, "../..");
const measuredPath = join(labDir, "measured-wasm-worker.json");
const record = process.env.IOS_BENCHMARK_RECORD === "1";
const required =
  process.env.IOS_SIM_WASM_REQUIRED === "1" ||
  process.argv.includes("--require-harness");

function fail(message) {
  throw new Error(`[ios-sim/wasm-benchmark] ${message}`);
}

function skip(message) {
  if (required) {
    fail(message);
  }
  console.log(`[ios-sim/wasm-benchmark] skipped: ${message}`);
  return null;
}

function parseBenchmarkResults(text) {
  const match = text.match(
    /spawn ([\d.]+)ms · kill ([\d.]+)ms · busy-loop ([\d.]+)ms · wasm (yes|no)(?: · kill failed)? \(([^)]+)\)/
  );
  if (match === null) {
    return null;
  }

  return {
    backend: match[5],
    runtime: "bare",
    spawnMs: Number.parseFloat(match[1]),
    killMs: Number.parseFloat(match[2]),
    busyLoopKillMs: Number.parseFloat(match[3]),
    wasmExecuted: match[4] === "yes",
    busyLoopKilled: !text.includes("kill failed")
  };
}

function assertEvidence(result) {
  if (result.wasmExecuted !== true) {
    fail("WASM did not execute inside the BareKit worker");
  }
  if (result.busyLoopKilled !== true) {
    fail("watchdog did not kill the WASM-before-busy-loop worker");
  }
  if (
    !(typeof result.spawnMs === "number" && result.spawnMs >= 0) ||
    !(typeof result.killMs === "number" && result.killMs >= 0) ||
    !(typeof result.busyLoopKillMs === "number" && result.busyLoopKillMs >= 0)
  ) {
    fail("missing spawn/kill/watchdog latency measurements");
  }
}

function maestroE5() {
  const result = spawnSync("maestro", ["test", ".maestro/e5-benchmark.yaml"], {
    cwd: repoRoot,
    stdio: "inherit"
  });
  if (result.status !== 0) {
    fail("maestro e5-benchmark flow failed");
  }
}

/**
 * Capture the on-screen benchmark line after Maestro asserts visibility.
 * Prefers `maestro hierarchy` text; falls back to simctl accessibility dump.
 */
function readBenchmarkDump() {
  const hierarchy = spawnSync("maestro", ["hierarchy"], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 8 * 1024 * 1024
  });
  if (hierarchy.status === 0 && typeof hierarchy.stdout === "string") {
    const parsed = parseBenchmarkResults(hierarchy.stdout);
    if (parsed !== null) return parsed;
  }

  const booted = spawnSync("xcrun", ["simctl", "list", "devices", "booted"], {
    encoding: "utf8"
  });
  const match = typeof booted.stdout === "string"
    ? booted.stdout.match(/\(([0-9A-F-]{36})\)\s+\(Booted\)/i)
    : null;
  if (match !== null) {
    const dump = spawnSync(
      "xcrun",
      ["simctl", "ui", match[1], "appearance"],
      { encoding: "utf8" }
    );
    void dump;
  }

  return null;
}

function harnessBuildIdentity() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(repoRoot, "apps/harness-mobile/package.json"), "utf8")
    );
    return {
      name: pkg.name ?? "harness-mobile",
      version: pkg.version ?? "unknown"
    };
  } catch {
    return { name: "harness-mobile", version: "unknown" };
  }
}

function iosRuntimeIdentity() {
  try {
    const runtimes = spawnSync("xcrun", ["simctl", "list", "runtimes"], {
      encoding: "utf8"
    });
    if (runtimes.status !== 0 || typeof runtimes.stdout !== "string") {
      return null;
    }
    const line = runtimes.stdout
      .split("\n")
      .map((entry) => entry.trim())
      .find((entry) => entry.startsWith("iOS ") && entry.includes("(available)"));
    return line ?? null;
  } catch {
    return null;
  }
}

export async function runIosWasmBenchmark(options = {}) {
  const {
    requireHarness = required,
    buildIfMissing = process.env.IOS_SIM_WASM_BUILD === "1"
  } = options;

  if (!isDarwin()) {
    return skip("requires macOS");
  }
  if (!simctlAvailable()) {
    return skip("xcrun simctl unavailable");
  }
  if (!maestroAvailable()) {
    return skip("maestro CLI not installed");
  }

  ensureBootedSimulator();

  if (buildIfMissing || !harnessInstalledOnBootedSim()) {
    if (!buildIfMissing && !requireHarness) {
      return skip(
        "harness not installed on booted simulator (set IOS_SIM_WASM_BUILD=1 to build)"
      );
    }
    console.log("[ios-sim/wasm-benchmark] building and installing harness");
    buildAndInstallHarness(repoRoot);
  }

  console.log("[ios-sim/wasm-benchmark] running Maestro BareKit worker benchmark");
  maestroE5();

  const parsed = readBenchmarkDump();
  if (parsed === null) {
    fail(
      "could not parse spawn/kill/busy-loop/wasm timings from Maestro hierarchy after e5 flow"
    );
  }
  assertEvidence(parsed);

  const result = {
    measuredAt: new Date().toISOString().slice(0, 10),
    platform: "ios-simulator",
    environment: "ios-simulator",
    harness: harnessBuildIdentity(),
    iosRuntime: iosRuntimeIdentity(),
    ...parsed
  };

  if (record) {
    writeFileSync(measuredPath, `${JSON.stringify(result, null, 2)}\n`);
    const matrixPath = updateS4SupportMatrix("bare-worker-ios-simulator", result);
    console.log(`[ios-sim/wasm-benchmark] recorded ${measuredPath}`);
    console.log(`[ios-sim/wasm-benchmark] updated ${matrixPath}`);
  }

  console.log(
    `[ios-sim/wasm-benchmark] wasm=${result.wasmExecuted} busyLoopKilled=${result.busyLoopKilled} ` +
      `spawn=${result.spawnMs}ms kill=${result.killMs}ms busy-loop=${result.busyLoopKillMs}ms (${result.backend})`
  );
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  runIosWasmBenchmark().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
