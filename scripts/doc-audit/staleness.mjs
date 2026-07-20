import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { defaultTpDocForPath } from "./lifecycle-rules.mjs";
import { repoRoot, trackedMarkdownPaths } from "./repo-root.mjs";
import { parseTpDoc, validateTpDoc } from "./tp-doc.mjs";

/** @typedef {{ path: string; level: 'warn' | 'fail'; message: string }} StalenessFinding */

/**
 * @param {string} root
 * @param {string} relPath
 * @returns {string | null} YYYY-MM-DD
 */
function lastGitEditDate(root, relPath) {
  try {
    const iso = execSync(`git log -1 --format=%cs -- "${relPath}"`, {
      cwd: root,
      encoding: "utf8"
    }).trim();
    return iso || null;
  } catch {
    return null;
  }
}

/**
 * @param {string} audited @param {string} gitEdit
 * @returns {'ok' | 'warn' | 'fail'}
 */
function stalenessLevel(audited, gitEdit) {
  const a = Date.parse(`${audited}T00:00:00Z`);
  const g = Date.parse(`${gitEdit}T00:00:00Z`);
  const deltaDays = (g - a) / (86400 * 1000);
  if (deltaDays <= 14) return "ok";
  if (deltaDays <= 30) return "warn";
  return "fail";
}

/**
 * @param {string} root
 * @returns {StalenessFinding[]}
 */
export function auditStaleness(root = repoRoot()) {
  /** @type {StalenessFinding[]} */
  const findings = [];
  for (const rel of trackedMarkdownPaths(root)) {
    const text = readFileSync(join(root, rel), "utf8");
    const meta = parseTpDoc(text) ?? defaultTpDocForPath(rel);
    if (meta.lifecycle !== "live") continue;
    if (meta.register === "none") continue;
    const gitEdit = lastGitEditDate(root, rel);
    if (!gitEdit) continue;
    const level = stalenessLevel(meta.audited, gitEdit);
    if (level === "ok") continue;
    findings.push({
      path: rel,
      level,
      message: `audited ${meta.audited}, last git edit ${gitEdit}`
    });
  }
  return findings;
}

/**
 * @param {string} root
 * @returns {{ missing: string[]; invalid: { path: string; errors: string[] }[]; historicalOutsideArchive: string[] }}
 */
export function auditLifecycleHeaders(root = repoRoot()) {
  /** @type {string[]} */
  const missing = [];
  /** @type {{ path: string; errors: string[] }[]} */
  const invalid = [];
  /** @type {string[]} */
  const historicalOutsideArchive = [];

  for (const rel of trackedMarkdownPaths(root)) {
    const text = readFileSync(join(root, rel), "utf8");
    const meta = parseTpDoc(text);
    if (!meta) {
      missing.push(rel);
      continue;
    }
    const errors = validateTpDoc(meta);
    if (errors.length) invalid.push({ path: rel, errors });
    if (meta.lifecycle === "historical" && !rel.startsWith("archive/")) {
      historicalOutsideArchive.push(rel);
    }
  }

  return { missing, invalid, historicalOutsideArchive };
}

export { validateTpDoc, parseTpDoc };
