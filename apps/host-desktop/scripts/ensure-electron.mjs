#!/usr/bin/env node
/**
 * Ensure the Electron binary is usable before `electron .`.
 * npm sometimes leaves a partial dist/ (binary without frameworks, or no path.txt).
 *
 * `--best-effort` (how postinstall runs it) downgrades every failure to a
 * warning. An install is not the moment to insist on a working Electron: the
 * download needs the network, and npm can run the postinstall while it is still
 * rearranging node_modules, so a hard exit there aborts the whole install and
 * leaves the lockfile untouched. Without the flag — `npm run start`, where the
 * binary is about to be executed — a missing Electron is still fatal.
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
      "dist/Electron.app/Contents/Frameworks/Electron Framework.framework/Electron Framework",
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
    const version = JSON.parse(
      readFileSync(join(electronDir, "package.json"), "utf8"),
    ).version;
    writeFileSync(versionFile, version);
  }
}

const bestEffort = process.argv.includes("--best-effort");

/**
 * @param {string} reason
 * @returns {never}
 */
function giveUp(reason) {
  if (!bestEffort) {
    console.error(reason);
    process.exit(1);
  }
  console.warn(
    `${reason}\nContinuing without it. Run \`npm run start --workspace=host-desktop\` to download Electron once the install has settled.`,
  );
  process.exit(0);
}

if (!isCompleteInstall()) {
  const download = spawnSync(
    process.execPath,
    [join(hostDesktopRoot, "scripts/download-electron.cjs")],
    {
      stdio: "inherit",
    },
  );
  if (download.status !== 0) {
    giveUp(
      `Downloading Electron failed (exit ${download.status ?? "unknown"}).`,
    );
  }
}

if (!isCompleteInstall()) {
  giveUp("Electron binary is still missing after download");
}

writeMetadata();
