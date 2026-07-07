#!/usr/bin/env node
/**
 * E5 Bare Worker benchmark on Android emulator (Phase 3/4 emulator lab).
 * Assumes E1 installed via Hyperdrive; records spawn/kill/busy-loop metrics from the harness UI.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  adb,
  launchHarness,
  maestroAvailable,
  maestroWithFixtureEnv,
  requireDevice,
  waitForBootComplete
} from "./helpers.mjs";

const labDir = dirname(fileURLToPath(import.meta.url));
const measuredPath = join(labDir, "measured-worker.json");
const record = process.env.ANDROID_BENCHMARK_RECORD === "1";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

function parseBenchmarkResults(text) {
  const match = text.match(/spawn ([\d.]+)ms · kill ([\d.]+)ms · busy-loop ([\d.]+)ms \(([^)]+)\)/);
  if (match === null) {
    throw new Error(`Could not parse benchmark results from UI dump`);
  }

  return {
    backend: match[4],
    runtime: "bare",
    spawnMs: Number.parseFloat(match[1]),
    killMs: Number.parseFloat(match[2]),
    busyLoopKillMs: Number.parseFloat(match[3]),
    busyLoopKilled: true
  };
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
    throw new Error("maestro CLI not found (install from https://maestro.mobile.dev)");
  }

  readFileSync(join(labDir, "fixture-meta.json"), "utf8");
  launchHarness();
  await sleep(2_000);

  maestroWithFixtureEnv(".maestro/e5-benchmark.yaml");

  const uiDump = readBenchmarkFromUi();
  const parsed = parseBenchmarkResults(uiDump);
  const meta = JSON.parse(readFileSync(join(labDir, "fixture-meta.json"), "utf8"));
  const result = {
    measuredAt: new Date().toISOString().slice(0, 10),
    platform: "android-emulator",
    hyperdrivePath: "verified-by-e1",
    appId: meta.appId,
    ...parsed
  };

  if (record) {
    writeFileSync(measuredPath, `${JSON.stringify(result, null, 2)}\n`);
    console.log(`android-emulator/e5-worker: recorded ${measuredPath}`);
  }

  console.log(
    `android-emulator/e5-worker: spawn ${result.spawnMs}ms, kill ${result.killMs}ms, ` +
      `busy-loop ${result.busyLoopKillMs}ms (${result.backend})`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
