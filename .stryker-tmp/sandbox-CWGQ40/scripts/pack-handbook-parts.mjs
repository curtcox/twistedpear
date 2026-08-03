#!/usr/bin/env node
// @ts-nocheck
/**
 * Pack Handbook part mini-apps from apps/handbook/generated/part-packages/.
 * Run after `npm run build:handbook`.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { runInit, runPack } from "../packages/cli/dist/commands/index.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const handbookDir = join(root, "apps/handbook");
const partsRoot = join(handbookDir, "generated/part-packages");
const outRoot = join(handbookDir, "generated/part-packages-packed");

function ensurePartPackages() {
  if (existsSync(partsRoot)) {
    return;
  }
  console.log("part-packages missing — running build:handbook");
  const result = spawnSync("npm", ["run", "build:handbook"], { cwd: root, stdio: "inherit" });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

async function packPart(partId) {
  const sourceDir = join(partsRoot, partId);
  const manifest = JSON.parse(readFileSync(join(sourceDir, "app.manifest.json"), "utf8"));
  const appFolder = manifest.name;

  const cwd = mkdtempSync(join(tmpdir(), "tp-handbook-part-"));
  const appDir = join(cwd, appFolder);
  mkdirSync(appDir, { recursive: true });
  cpSync(join(sourceDir, "app.manifest.json"), join(appDir, "app.manifest.json"));
  cpSync(join(sourceDir, "bundle.js"), join(appDir, "bundle.js"));

  try {
    const initCode = await runInit({ cwd, args: [] });
    if (initCode !== 0) {
      throw new Error(`tp init failed for ${partId}`);
    }

    const outName = `${appFolder}.tpkg`;
    const packCode = await runPack({ cwd, args: [appFolder, "--out", outName] });
    if (packCode !== 0) {
      throw new Error(`tp pack failed for ${partId}`);
    }

    const archive = readFileSync(join(cwd, outName));
    const destDir = join(outRoot, partId);
    mkdirSync(destDir, { recursive: true });
    writeFileSync(join(destDir, outName), archive);

    return {
      partId,
      appId: appFolder,
      version: manifest.version,
      bytes: archive.length,
      path: join(destDir, outName)
    };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

async function main() {
  ensurePartPackages();

  rmSync(outRoot, { recursive: true, force: true });
  mkdirSync(outRoot, { recursive: true });

  const partIds = readdirSync(partsRoot)
    .filter((entry) => statSync(join(partsRoot, entry)).isDirectory())
    .sort();

  if (partIds.length === 0) {
    throw new Error(`No part packages under ${partsRoot}`);
  }

  const results = [];
  for (const partId of partIds) {
    const packed = await packPart(partId);
    results.push(packed);
    console.log(`packed ${packed.appId} v${packed.version} — ${packed.bytes} bytes → ${packed.path}`);
  }

  writeFileSync(join(outRoot, "manifest.json"), `${JSON.stringify(results, null, 2)}\n`);
  console.log(`handbook parts: ${results.length} package(s) → ${outRoot}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
