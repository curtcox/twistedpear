/**
 * Download and extract the Electron binary (child process so async download can finish).
 */

const { spawnSync } = require("node:child_process");
const {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  rmSync,
} = require("node:fs");
const { join } = require("node:path");

const electronDir = join(__dirname, "../../../node_modules/electron");

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

function removePartialInstall() {
  rmSync(join(electronDir, "dist"), { recursive: true, force: true });
  rmSync(join(electronDir, "path.txt"), { force: true });
}

async function downloadZip() {
  const { downloadArtifact } = require("@electron/get");
  const { version } = JSON.parse(
    readFileSync(join(electronDir, "package.json"), "utf8"),
  );

  return downloadArtifact({
    version,
    artifactName: "electron",
    platform: process.env.npm_config_platform ?? process.platform,
    arch: process.env.npm_config_arch ?? process.arch,
    checksums: require(join(electronDir, "checksums.json")),
  });
}

function extractZip(zipPath) {
  const distDir = join(electronDir, "dist");
  mkdirSync(distDir, { recursive: true });

  const result =
    process.platform === "win32"
      ? spawnSync(
          "powershell",
          [
            "-NoProfile",
            "-Command",
            `Expand-Archive -Path '${zipPath}' -DestinationPath '${distDir}' -Force`,
          ],
          { stdio: "inherit" },
        )
      : spawnSync("unzip", ["-q", "-o", zipPath, "-d", distDir], {
          stdio: "inherit",
        });

  if (result.status !== 0) {
    throw new Error(
      `Failed to extract Electron archive (exit ${result.status ?? "unknown"})`,
    );
  }

  const srcTypeDefPath = join(distDir, "electron.d.ts");
  const targetTypeDefPath = join(electronDir, "electron.d.ts");
  if (existsSync(srcTypeDefPath)) {
    renameSync(srcTypeDefPath, targetTypeDefPath);
  }
}

async function main() {
  if (isCompleteInstall()) {
    return;
  }

  removePartialInstall();
  const zipPath = await downloadZip();
  extractZip(zipPath);

  if (!isCompleteInstall()) {
    throw new Error("Electron binary is still missing after download");
  }
}

main().catch((error) => {
  console.error(
    error instanceof Error ? (error.stack ?? error.message) : error,
  );
  process.exit(1);
});
