#!/usr/bin/env node
/**
 * Measure package sizes and estimated transfer times (Phase 3 M9).
 * Writes conformance/budgets/measured.json for LIMITATIONS §6 reference.
 */

import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  cpSync,
  mkdtempSync,
  rmSync,
  readdirSync,
  statSync,
  existsSync,
} from "node:fs";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { runInit, runPack } from "../../packages/cli/dist/commands/index.js";
import { measureGuidaHello } from "./guida.mjs";

const fixtureDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/packages",
);
const examplesDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/examples",
);
const handbookDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../apps/handbook",
);
const outputDir = resolve(dirname(fileURLToPath(import.meta.url)));
const outputPath = join(outputDir, "measured.json");

/** Conservative effective bitrates used for install-time estimates. */
const BITRATES = {
  lan: 8 * 1024 * 1024,
  ble: 24 * 1024,
  rnode: 1_200,
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
  const examplePackages = [];
  try {
    await runInit({
      cwd,
      identityPassphrase: "conformance identity passphrase",
      args: [],
    });
    const packCode = await runPack({
      cwd,
      args: [resolve(fixtureDir, "example-app"), "--out", "example.tpkg"],
    });
    if (packCode !== 0) {
      throw new Error("tp pack failed");
    }

    exampleBytes = readFileSync(join(cwd, "example.tpkg"));

    for (const name of ["chat", "file-drop", "board"]) {
      const exampleCwd = mkdtempSync(join(tmpdir(), `tp-budgets-${name}-`));
      const appDir = join(exampleCwd, name);
      cpSync(join(examplesDir, name), appDir, { recursive: true });

      try {
        const initCode = await runInit({
          cwd: exampleCwd,
          identityPassphrase: "conformance identity passphrase",
          args: [],
        });
        if (initCode !== 0) {
          throw new Error(`tp init failed for ${name}`);
        }

        const packed = await runPack({
          cwd: exampleCwd,
          args: [name, "--out", `${name}.tpkg`],
        });
        if (packed !== 0) {
          throw new Error(`tp pack failed for ${name}`);
        }

        examplePackages.push({
          name,
          bytes: readFileSync(join(exampleCwd, `${name}.tpkg`)).length,
          description: `Phase 4 example app: ${name}`,
        });
      } finally {
        rmSync(exampleCwd, { recursive: true, force: true });
      }
    }

    const handbookCwd = mkdtempSync(join(tmpdir(), "tp-budgets-handbook-"));
    const handbookBuild = spawnSync(
      process.execPath,
      [join(handbookDir, "build.mjs")],
      {
        cwd: handbookDir,
        encoding: "utf8",
      },
    );
    if (handbookBuild.status !== 0) {
      throw new Error(
        `handbook build failed:\n${handbookBuild.stdout}\n${handbookBuild.stderr}`,
      );
    }
    const handbookAppDir = join(handbookCwd, "handbook");
    mkdirSync(handbookAppDir, { recursive: true });
    cpSync(
      join(handbookDir, "app.manifest.json"),
      join(handbookAppDir, "app.manifest.json"),
    );
    cpSync(join(handbookDir, "bundle.js"), join(handbookAppDir, "bundle.js"));
    try {
      const initCode = await runInit({
        cwd: handbookCwd,
        identityPassphrase: "conformance identity passphrase",
        args: [],
      });
      if (initCode !== 0) {
        throw new Error("tp init failed for handbook");
      }
      const packed = await runPack({
        cwd: handbookCwd,
        args: ["handbook", "--out", "handbook.tpkg"],
      });
      if (packed !== 0) {
        throw new Error("tp pack failed for handbook");
      }
      examplePackages.push({
        name: "handbook",
        bytes: readFileSync(join(handbookCwd, "handbook.tpkg")).length,
        description:
          "Phase D Handbook (full docs + applets; exceeds BLE example budget by design)",
      });

      const partsRoot = join(handbookDir, "generated/part-packages");
      if (existsSync(partsRoot)) {
        for (const partId of readdirSync(partsRoot).sort()) {
          const partDir = join(partsRoot, partId);
          if (!statSync(partDir).isDirectory()) {
            continue;
          }
          const manifest = JSON.parse(
            readFileSync(join(partDir, "app.manifest.json"), "utf8"),
          );
          const partCwd = mkdtempSync(
            join(tmpdir(), `tp-budgets-${manifest.name}-`),
          );
          const partAppDir = join(partCwd, manifest.name);
          mkdirSync(partAppDir, { recursive: true });
          cpSync(
            join(partDir, "app.manifest.json"),
            join(partAppDir, "app.manifest.json"),
          );
          cpSync(join(partDir, "bundle.js"), join(partAppDir, "bundle.js"));
          try {
            const partInit = await runInit({
              cwd: partCwd,
              identityPassphrase: "conformance identity passphrase",
              args: [],
            });
            if (partInit !== 0) {
              throw new Error(`tp init failed for ${manifest.name}`);
            }
            const partPack = await runPack({
              cwd: partCwd,
              args: [manifest.name, "--out", `${manifest.name}.tpkg`],
            });
            if (partPack !== 0) {
              throw new Error(`tp pack failed for ${manifest.name}`);
            }
            examplePackages.push({
              name: manifest.name,
              bytes: readFileSync(join(partCwd, `${manifest.name}.tpkg`))
                .length,
              description: `Handbook part package (${partId})`,
            });
          } finally {
            rmSync(partCwd, { recursive: true, force: true });
          }
        }
      }
    } finally {
      rmSync(handbookCwd, { recursive: true, force: true });
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }

  const guidaHello = await measureGuidaHello();

  const packages = [
    {
      name: "tiny",
      bytes: tinyBytes.length,
      description: "Budget hello-world bundle",
    },
    {
      name: "example-app",
      bytes: exampleBytes.length,
      description: "Typical minimal mini-app",
    },
    {
      name: "hello-js",
      bytes: guidaHello.js.bytes,
      description: "JavaScript hello twin (Guida comparison)",
    },
    {
      name: "hello-guida",
      bytes: guidaHello.guida.bytes,
      description: "Guida hello world plus shim",
    },
    ...examplePackages,
  ];

  const measured = {
    measuredAt: new Date().toISOString(),
    bitrates: BITRATES,
    packages: packages.map((pkg) => ({
      ...pkg,
      estimates: {
        lan: {
          seconds: estimateSeconds(pkg.bytes, BITRATES.lan),
          human: formatDuration(estimateSeconds(pkg.bytes, BITRATES.lan)),
        },
        ble: {
          seconds: estimateSeconds(pkg.bytes, BITRATES.ble),
          human: formatDuration(estimateSeconds(pkg.bytes, BITRATES.ble)),
        },
        rnode: {
          seconds: estimateSeconds(pkg.bytes, BITRATES.rnode),
          human: formatDuration(estimateSeconds(pkg.bytes, BITRATES.rnode)),
        },
      },
    })),
    guidance: {
      bleBudgetBytes: 256 * 1024,
      rnodeBulkBlockBytes: 64 * 1024,
      rnodeWarningBytes: 32 * 1024,
      underOneMinuteLanMaxBytes: Math.floor((BITRATES.lan * 60) / 8),
      underOneMinuteBleMaxBytes: Math.floor((BITRATES.ble * 60) / 8),
      underOneMinuteRnodeMaxBytes: Math.floor((BITRATES.rnode * 60) / 8),
    },
    guidaHello: {
      js: guidaHello.js,
      guida: guidaHello.guida,
    },
  };

  mkdirSync(outputDir, { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(measured, null, 2)}\n`);

  for (const pkg of measured.packages) {
    console.log(
      `budgets: ${pkg.name} ${pkg.bytes} bytes — LAN ${pkg.estimates.lan.human}, BLE ${pkg.estimates.ble.human}, RNode ${pkg.estimates.rnode.human}`,
    );
  }

  console.log(`budgets: wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
