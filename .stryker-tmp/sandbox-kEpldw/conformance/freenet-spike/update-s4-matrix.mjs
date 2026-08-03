#!/usr/bin/env node
// @ts-nocheck
/**
 * Merge recorded Android/iOS BareKit benchmark artifacts into s4-support-matrix.json.
 * Invoked by e5-worker / ios wasm-benchmark when *_BENCHMARK_RECORD=1.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const spikeDir = dirname(fileURLToPath(import.meta.url));
const matrixPath = join(spikeDir, "s4-support-matrix.json");

/**
 * @param {"bare-worker-android-emulator" | "bare-worker-ios-simulator"} backendKey
 * @param {Record<string, unknown>} measured
 */
export function updateS4SupportMatrix(backendKey, measured) {
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  const existing = matrix.backends?.[backendKey];
  if (existing === undefined) {
    throw new Error(`Unknown S4 backend key: ${backendKey}`);
  }

  const wasmExecuted = measured.wasmExecuted === true;
  const busyLoopKilled = measured.busyLoopKilled === true;
  matrix.backends[backendKey] = {
    ...existing,
    status: wasmExecuted && busyLoopKilled ? "pass" : "fail",
    wasmExecuted,
    busyLoopKilled,
    busyLoopKillMs:
      typeof measured.busyLoopKillMs === "number" ? measured.busyLoopKillMs : null,
    spawnMs: typeof measured.spawnMs === "number" ? measured.spawnMs : null,
    killMs: typeof measured.killMs === "number" ? measured.killMs : null,
    measuredAt: measured.measuredAt ?? null,
    environment: measured.environment ?? existing.environment,
    reason: undefined
  };
  delete matrix.backends[backendKey].reason;
  matrix.audited =
    typeof measured.measuredAt === "string" ? measured.measuredAt : matrix.audited;

  writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
  return matrixPath;
}
