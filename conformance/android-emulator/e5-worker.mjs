#!/usr/bin/env node
/**
 * E5 Bare Worker benchmark on Android emulator (Phase 3/4 emulator lab).
 * Records spawn/kill/busy-loop/WASM metrics from the in-host benchmark control.
 * E1 Hyperdrive fixture metadata is recorded when present, not required.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  adb,
  launchHarness,
  maestro,
  maestroAvailable,
  requireDevice,
  waitForBootComplete,
} from "./helpers.mjs";
import { updateS4SupportMatrix } from "../freenet-spike/update-s4-matrix.mjs";

const labDir = dirname(fileURLToPath(import.meta.url));
const measuredPath = join(labDir, "measured-worker.json");
const record = process.env.ANDROID_BENCHMARK_RECORD === "1";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function parseBenchmarkResults(text) {
  const match = text.match(
    /spawn ([\d.]+)ms · kill ([\d.]+)ms · busy-loop ([\d.]+)ms · wasm (yes|no)(?: · kill failed)? \(([^)]+)\)/,
  );
  if (match === null) {
    throw new Error(`Could not parse benchmark results from UI dump`);
  }

  const wasmExecuted = match[4] === "yes";
  const busyLoopKilled = !text.includes("kill failed");
  return {
    backend: match[5],
    runtime: "bare",
    spawnMs: Number.parseFloat(match[1]),
    killMs: Number.parseFloat(match[2]),
    busyLoopKillMs: Number.parseFloat(match[3]),
    wasmExecuted,
    busyLoopKilled,
  };
}

function assertE5Evidence(result) {
  if (result.wasmExecuted !== true) {
    throw new Error(
      "E5 failed: WASM did not execute inside the BareKit worker",
    );
  }
  if (result.busyLoopKilled !== true) {
    throw new Error(
      "E5 failed: watchdog did not kill the WASM-before-busy-loop worker",
    );
  }
  if (
    !(result.spawnMs >= 0) ||
    !(result.killMs >= 0) ||
    !(result.busyLoopKillMs >= 0)
  ) {
    throw new Error(
      "E5 failed: missing spawn/kill/watchdog latency measurements",
    );
  }
}

function readBenchmarkFromUi() {
  const dumpPath = "/sdcard/tp-benchmark-ui.xml";
  adb(["shell", "uiautomator", "dump", dumpPath]);
  return adb(["shell", "cat", dumpPath]);
}

async function main() {
  requireDevice();
  waitForBootComplete();

  if (!maestroAvailable()) {
    throw new Error(
      "maestro CLI not found (install from https://maestro.mobile.dev)",
    );
  }

  launchHarness();
  await sleep(2_000);

  maestro(["test", ".maestro/e5-benchmark.yaml"]);

  const uiDump = readBenchmarkFromUi();
  const parsed = parseBenchmarkResults(uiDump);
  assertE5Evidence(parsed);
  let appId = "in-host-benchmark";
  let hyperdrivePath = "not-required-for-worker-benchmark";
  try {
    const meta = JSON.parse(
      readFileSync(join(labDir, "fixture-meta.json"), "utf8"),
    );
    if (typeof meta.appId === "string" && meta.appId.length > 0) {
      appId = meta.appId;
      hyperdrivePath = "verified-by-e1";
    }
  } catch {
    // E5 measures the in-host Bare worker; E1 fixture metadata is optional.
  }
  const result = {
    measuredAt: new Date().toISOString().slice(0, 10),
    platform: "android-emulator",
    environment: "android-emulator",
    hyperdrivePath,
    appId,
    ...parsed,
  };

  if (record) {
    writeFileSync(measuredPath, `${JSON.stringify(result, null, 2)}\n`);
    const matrixPath = updateS4SupportMatrix(
      "bare-worker-android-emulator",
      result,
    );
    console.log(`android-emulator/e5-worker: recorded ${measuredPath}`);
    console.log(`android-emulator/e5-worker: updated ${matrixPath}`);
  }

  console.log(
    `android-emulator/e5-worker: spawn ${result.spawnMs}ms, kill ${result.killMs}ms, ` +
      `busy-loop ${result.busyLoopKillMs}ms, wasm=${result.wasmExecuted} (${result.backend})`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
