#!/usr/bin/env node
/**
 * Measure package sizes and estimated transfer times (Phase 3 M9).
 * Writes conformance/budgets/measured.json for LIMITATIONS §6 reference.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages");
const outputDir = resolve(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(outputDir, "measured.json");

/** Conservative effective bitrates used for install-time estimates. */
const BITRATES = {
  lan: 8 * 1024 * 1024,
  ble: 24 * 1024,
  rnode: 1_200
};

function estimateSeconds(bytes, bitsPerSecond) {
  return Math.ceil((bytes * 8) / bitsPerSecond);
}

function formatDuration(seconds) {
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return remainder === 0 ? `${minutes}m` : `${minutes}m ${remainder}s`;
}

async function main() {
  const tinyBytes = readFileSync(resolve(fixtureDir, "tiny.tpkg"));
  const cwd = mkdtempSync(join(tmpdir(), "tp-budgets-"));

  let exampleBytes;
  try {
    await runInit({ cwd, args: [] });
    const packCode = await runPack({
      cwd,
      args: [resolve(fixtureDir, "example-app"), "--out", "example.tpkg"]
    });
    if (packCode !== 0) {
      throw new Error("tp pack failed");
    }

    exampleBytes = readFileSync(join(cwd, "example.tpkg"));
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }

  const packages = [
    { name: "tiny", bytes: tinyBytes.length, description: "Budget hello-world bundle" },
    { name: "example-app", bytes: exampleBytes.length, description: "Typical minimal mini-app" }
  ];

  const measured = {
    measuredAt: new Date().toISOString(),
    bitrates: BITRATES,
    packages: packages.map((pkg) => ({
      ...pkg,
      estimates: {
        lan: { seconds: estimateSeconds(pkg.bytes, BITRATES.lan), human: formatDuration(estimateSeconds(pkg.bytes, BITRATES.lan)) },
        ble: { seconds: estimateSeconds(pkg.bytes, BITRATES.ble), human: formatDuration(estimateSeconds(pkg.bytes, BITRATES.ble)) },
        rnode: { seconds: estimateSeconds(pkg.bytes, BITRATES.rnode), human: formatDuration(estimateSeconds(pkg.bytes, BITRATES.rnode)) }
      }
    })),
    guidance: {
      bleBudgetBytes: 256 * 1024,
      rnodeBulkBlockBytes: 64 * 1024,
      rnodeWarningBytes: 32 * 1024,
      underOneMinuteLanMaxBytes: Math.floor((BITRATES.lan * 60) / 8),
      underOneMinuteBleMaxBytes: Math.floor((BITRATES.ble * 60) / 8),
      underOneMinuteRnodeMaxBytes: Math.floor((BITRATES.rnode * 60) / 8)
    }
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(measured, null, 2)}\n`);

  for (const pkg of measured.packages) {
    console.log(
      `budgets: ${pkg.name} ${pkg.bytes} bytes — LAN ${pkg.estimates.lan.human}, BLE ${pkg.estimates.ble.human}, RNode ${pkg.estimates.rnode.human}`
    );
  }

  console.log(`budgets: wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
