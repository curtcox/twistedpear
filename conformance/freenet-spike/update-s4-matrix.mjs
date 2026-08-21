#!/usr/bin/env node
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
 * @param {string} backendKey
 * @param {object} measured
 */
function measuredNumber(value) {
  return typeof value === "number" ? value : null;
}

function measuredReason(measured) {
  if (typeof measured.wasmUnavailableReason === "string") {
    return measured.wasmUnavailableReason;
  }
  if (typeof measured.reason === "string") return measured.reason;
  return undefined;
}

export function updateS4SupportMatrix(backendKey, measured) {
  const matrix = JSON.parse(readFileSync(matrixPath, "utf8"));
  const existing = matrix.backends?.[backendKey];
  if (existing === undefined) {
    throw new Error(`Unknown S4 backend key: ${backendKey}`);
  }

  const wasmExecuted = measured.wasmExecuted === true;
  const busyLoopKilled = measured.busyLoopKilled === true;
  const passed = wasmExecuted && busyLoopKilled;
  const reason = measuredReason(measured);
  matrix.backends[backendKey] = {
    ...existing,
    status: passed ? "pass" : "fail",
    wasmExecuted,
    busyLoopKilled,
    busyLoopKillMs: measuredNumber(measured.busyLoopKillMs),
    spawnMs: measuredNumber(measured.spawnMs),
    killMs: measuredNumber(measured.killMs),
    measuredAt: measured.measuredAt ?? null,
    environment: measured.environment ?? existing.environment,
  };
  if (passed || reason === undefined) {
    delete matrix.backends[backendKey].reason;
  } else {
    matrix.backends[backendKey].reason = reason;
  }
  matrix.audited =
    typeof measured.measuredAt === "string"
      ? measured.measuredAt
      : matrix.audited;

  writeFileSync(matrixPath, `${JSON.stringify(matrix, null, 2)}\n`);
  return matrixPath;
}
