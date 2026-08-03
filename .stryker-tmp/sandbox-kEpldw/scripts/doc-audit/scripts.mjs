// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo-root.mjs";
import { REGISTER_FILES } from "./paths.mjs";

/** @typedef {{ file: string; line: number; script: string; reason?: string }} ScriptFinding */

const PLANNED_ROOT_SCRIPTS = new Set(["test:ui-invariants"]);

const WORKSPACE_SCRIPTS = new Map([
  ["dist", { workspace: "host-desktop", note: "apps/host-desktop" }]
]);

/**
 * @param {string} root
 * @returns {Record<string, true>}
 */
function rootScripts(root) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  /** @type {Record<string, true>} */
  const scripts = {};
  for (const name of Object.keys(pkg.scripts ?? {})) {
    scripts[name] = true;
  }
  return scripts;
}

/**
 * @param {string} line
 * @returns {string[]}
 */
function extractNpmRunScripts(line) {
  /** @type {string[]} */
  const names = [];
  const re = /npm run ([\w:-]+)/g;
  let m;
  while ((m = re.exec(line)) !== null) {
    names.push(m[1]);
  }
  return names;
}

/**
 * @param {string} root
 * @param {{ files?: string[] }} [options]
 * @returns {ScriptFinding[]}
 */
export function auditRegisterScripts(root = repoRoot(), options = {}) {
  const files = options.files ?? REGISTER_FILES;
  const scripts = rootScripts(root);
  /** @type {ScriptFinding[]} */
  const findings = [];

  for (const rel of files) {
    const text = readFileSync(join(root, rel), "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line.includes("npm run")) continue;
      for (const name of extractNpmRunScripts(line)) {
        if (scripts[name]) continue;
        if (WORKSPACE_SCRIPTS.has(name)) {
          if (!line.includes("--workspace=") && !line.includes("workspace=host-desktop")) {
            findings.push({
              file: rel,
              line: i + 1,
              script: name,
              reason: "workspace-local script; cite npm run dist --workspace=host-desktop"
            });
          }
          continue;
        }
        if (PLANNED_ROOT_SCRIPTS.has(name)) continue;
        findings.push({
          file: rel,
          line: i + 1,
          script: name,
          reason: "unknown root script"
        });
      }
    }
  }

  return findings;
}

export { WORKSPACE_SCRIPTS };
