#!/usr/bin/env node
/**
 * Ensure the Electron binary is usable before `electron .`.
 * npm sometimes leaves a partial dist/ (binary without frameworks, or no path.txt).
 */

import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hostDesktopRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const electronDir = join(hostDesktopRoot, "../../node_modules/electron");

function platformPath() {
  switch (process.platform) {
    case "darwin":
      return "Electron.app/Contents/MacOS/Electron";
    case "win32":
      return "electron.exe";
    default:
      return "electron";
  }
}

function isCompleteInstall() {
  const relativePath = platformPath();
  const binaryPath = join(electronDir, "dist", relativePath);
  if (!existsSync(binaryPath)) {
    return false;
  }

  if (process.platform === "darwin") {
    const frameworkPath = join(
      electronDir,
      "dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Electron Framework"
    );
    if (!existsSync(frameworkPath)) {
      return false;
    }
  }

  return true;
}

function writeMetadata() {
  const relativePath = platformPath();
  writeFileSync(join(electronDir, "path.txt"), relativePath);

  const versionFile = join(electronDir, "dist", "version");
  if (!existsSync(versionFile)) {
    const version = JSON.parse(readFileSync(join(electronDir, "package.json"), "utf8")).version;
    writeFileSync(versionFile, version);
  }
}

if (!isCompleteInstall()) {
  const download = spawnSync(process.execPath, [join(hostDesktopRoot, "scripts/download-electron.cjs")], {
    stdio: "inherit"
  });
  if (download.status !== 0) {
    process.exit(download.status ?? 1);
  }
}

if (!isCompleteInstall()) {
  console.error("Electron binary is still missing after download");
  process.exit(1);
}

writeMetadata();
