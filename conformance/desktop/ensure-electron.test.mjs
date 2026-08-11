/**
 * host-desktop's postinstall runs inside every `npm install` in this repo,
 * including the one `npm audit fix` performs. npm rearranges node_modules while
 * installing, so the postinstall can run at a point where the downloader's own
 * dependency is not resolvable yet — and a hard exit there aborts the whole
 * install and leaves the lockfile untouched.
 *
 * These tests drive the scripts in a tree that has an `electron` package but no
 * `@electron/get`, which is exactly that window.
 */

import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const scriptDir = join(repoRoot, "apps/host-desktop/scripts");

/**
 * A tree shaped like the repo — an installed `electron` with no binary yet, and
 * no `@electron/get` anywhere above it. Built under the OS temp dir so module
 * resolution cannot climb back into this repo's node_modules.
 *
 * @returns {string} the tree's root
 */
function treeWithoutElectronGet() {
  const root = mkdtempSync(join(tmpdir(), "ensure-electron-"));
  const scripts = join(root, "apps/host-desktop/scripts");
  mkdirSync(scripts, { recursive: true });
  for (const name of ["ensure-electron.mjs", "download-electron.cjs"]) {
    copyFileSync(join(scriptDir, name), join(scripts, name));
  }
  const electron = join(root, "node_modules/electron");
  mkdirSync(electron, { recursive: true });
  writeFileSync(
    join(electron, "package.json"),
    JSON.stringify({ name: "electron", version: "43.3.0" }),
  );
  writeFileSync(join(electron, "checksums.json"), "{}");
  return root;
}

/**
 * @param {string} root
 * @param {string[]} args
 */
function ensureElectron(root, args = []) {
  const result = spawnSync(
    process.execPath,
    [join(root, "apps/host-desktop/scripts/ensure-electron.mjs"), ...args],
    { cwd: root, encoding: "utf8" },
  );
  return {
    status: result.status,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

describe("host-desktop postinstall", () => {
  it("does not abort the install when the Electron download cannot run", () => {
    const result = ensureElectron(treeWithoutElectronGet(), ["--best-effort"]);
    expect(result.status).toBe(0);
    expect(result.output).toContain("Continuing without it");
  });

  it("says how to get Electron once the install has settled", () => {
    const result = ensureElectron(treeWithoutElectronGet(), ["--best-effort"]);
    expect(result.output).toContain("npm run start --workspace=host-desktop");
  });

  it("still fails when the binary is about to be run", () => {
    // `npm run start` invokes the same script without --best-effort, where a
    // missing Electron is a real failure rather than an install-order accident.
    const result = ensureElectron(treeWithoutElectronGet());
    expect(result.status).toBe(1);
    expect(result.output).not.toContain("Continuing without it");
  });

  it("explains an unresolvable @electron/get rather than dumping a stack", () => {
    const result = ensureElectron(treeWithoutElectronGet(), ["--best-effort"]);
    expect(result.output).toContain("@electron/get is not resolvable");
    expect(result.output).not.toContain("Cannot find module");
    expect(result.output).not.toContain("_resolveFilename");
  });
});
