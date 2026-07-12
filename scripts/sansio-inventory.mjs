#!/usr/bin/env node
/**
 * AST-ish inventory of Sans-IO deny-list usages in protocol roots.
 * Emits violations.json: { generatedAt, roots, violations[], summary }.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "sansio-ratchet.json");
const OUT_PATH = path.join(ROOT, "violations.json");

/** @typedef {{ file: string, line: number, api: string, match: string, suggestedEffect: string }} Violation */

const PATTERNS = [
  { api: "Date.now", re: /\bDate\.now\b/g, suggestedEffect: "Clock" },
  { api: "new Date()", re: /\bnew\s+Date\s*\(\s*\)/g, suggestedEffect: "Clock" },
  { api: "performance.now", re: /\bperformance\.now\b/g, suggestedEffect: "Clock" },
  { api: "process.hrtime", re: /\bprocess\.hrtime\b/g, suggestedEffect: "Clock" },
  { api: "Math.random", re: /\bMath\.random\b/g, suggestedEffect: "Entropy" },
  { api: "crypto.getRandomValues", re: /\bcrypto\.getRandomValues\b/g, suggestedEffect: "Entropy" },
  { api: "crypto.randomBytes", re: /\bcrypto\.randomBytes\s*\(|from\s+["']node:crypto["'].*randomBytes|randomBytes\s*\}\s*from\s+["']node:crypto["']/g, suggestedEffect: "Entropy" },
  { api: "crypto.randomUUID", re: /\b(?:crypto\.)?randomUUID\s*\(/g, suggestedEffect: "Entropy" },
  { api: "setTimeout", re: /(?<!\.)\bsetTimeout\s*\(/g, suggestedEffect: "Timers" },
  { api: "setInterval", re: /(?<!\.)\bsetInterval\s*\(/g, suggestedEffect: "Timers" },
  { api: "setImmediate", re: /(?<!\.)\bsetImmediate\s*\(/g, suggestedEffect: "Timers" },
  { api: "queueMicrotask", re: /\bqueueMicrotask\s*\(/g, suggestedEffect: "Timers" },
  { api: "requestAnimationFrame", re: /\brequestAnimationFrame\s*\(/g, suggestedEffect: "Timers" },
  { api: "fetch", re: /\bfetch\s*\(/g, suggestedEffect: "Transport" },
  { api: "XMLHttpRequest", re: /\bXMLHttpRequest\b/g, suggestedEffect: "Transport" },
  { api: "WebSocket", re: /\bWebSocket\b/g, suggestedEffect: "Transport" },
  { api: "node:net", re: /from\s+["']node:net["']/g, suggestedEffect: "Transport" },
  { api: "node:dgram", re: /from\s+["']node:dgram["']/g, suggestedEffect: "Transport" },
  { api: "node:tls", re: /from\s+["']node:tls["']/g, suggestedEffect: "Transport" },
  { api: "node:http", re: /from\s+["']node:https?["']/g, suggestedEffect: "Transport" },
  { api: "node:fs", re: /from\s+["']node:fs["']/g, suggestedEffect: "Store" },
  { api: "node:os", re: /from\s+["']node:os["']/g, suggestedEffect: "adapter" },
  { api: "process.env", re: /\bprocess\.env\b/g, suggestedEffect: "adapter" },
  { api: "console", re: /\bconsole\.(log|debug|info|warn|error)\s*\(/g, suggestedEffect: "Intent log" },
  { api: "localStorage", re: /\blocalStorage\b/g, suggestedEffect: "Store" },
  { api: "AsyncStorage", re: /\bAsyncStorage\b/g, suggestedEffect: "Store" }
];

function loadConfig() {
  return JSON.parse(fs.readFileSync(CONFIG_PATH, "utf8"));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full, files);
    } else if (entry.isFile() && entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts")) {
      files.push(full);
    }
  }
  return files;
}

function micromatch(file, pattern) {
  // Minimal glob: ** and * only, anchored to repo-relative posix path.
  const rel = file.split(path.sep).join("/");
  const escaped = pattern
    .split(path.sep)
    .join("/")
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ":::DOUBLE:::")
    .replace(/\*/g, "[^/]*")
    .replace(/:::DOUBLE:::/g, ".*");
  return new RegExp(`^${escaped}$`).test(rel);
}

function isAdapter(relPosix, adapterAllowlist) {
  return adapterAllowlist.some((pattern) => micromatch(relPosix, pattern));
}

function scanFile(absPath, relPosix) {
  /** @type {Violation[]} */
  const violations = [];
  const text = fs.readFileSync(absPath, "utf8");
  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) {
      // Skip obvious comment-only lines; imperfect but good enough for inventory.
      if (!trimmed.includes("*/") || trimmed.startsWith("//")) continue;
    }
    for (const pattern of PATTERNS) {
      pattern.re.lastIndex = 0;
      if (!pattern.re.test(line)) continue;
      // Avoid flagging clock.setTimeout / this.setTimeout method names when clearly method access
      // Still flag bare setTimeout( — pattern already requires setTimeout\s*(
      if (pattern.api === "setTimeout" && (/^\s*(?:public\s+|private\s+|protected\s+|async\s+)*setTimeout\s*\(/.test(line) || /\.\s*setTimeout\s*\(/.test(line))) {
        continue;
      }
      if (pattern.api === "setInterval" && (/^\s*(?:public\s+|private\s+|protected\s+|async\s+)*setInterval\s*\(/.test(line) || /\.\s*setInterval\s*\(/.test(line))) {
        continue;
      }
      if (pattern.api === "crypto.randomBytes" && /provider\.randomBytes|this\.provider\.randomBytes|entropy\.randomBytes/.test(line)) {
        continue;
      }
      if (pattern.api === "fetch" && /\.\s*fetch\s*\(/.test(line)) {
        continue;
      }
      violations.push({
        file: relPosix,
        line: i + 1,
        api: pattern.api,
        match: trimmed.slice(0, 120),
        suggestedEffect: pattern.suggestedEffect
      });
    }
  }
  return violations;
}

function main() {
  const config = loadConfig();
  /** @type {Violation[]} */
  const violations = [];
  const scanned = [];

  for (const root of config.protocolRoots) {
    const absRoot = path.join(ROOT, root);
    for (const abs of walk(absRoot)) {
      const relPosix = path.relative(ROOT, abs).split(path.sep).join("/");
      if (isAdapter(relPosix, config.adapterAllowlist ?? [])) {
        continue;
      }
      scanned.push(relPosix);
      violations.push(...scanFile(abs, relPosix));
    }
  }

  violations.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line || a.api.localeCompare(b.api));

  const byFile = {};
  for (const v of violations) {
    byFile[v.file] = (byFile[v.file] ?? 0) + 1;
  }

  const report = {
    generatedAt: new Date().toISOString(),
    roots: config.protocolRoots,
    scannedFileCount: scanned.length,
    violationCount: violations.length,
    filesWithViolations: Object.keys(byFile).sort(),
    summaryByApi: violations.reduce((acc, v) => {
      acc[v.api] = (acc[v.api] ?? 0) + 1;
      return acc;
    }, {}),
    violations
  };

  fs.writeFileSync(OUT_PATH, `${JSON.stringify(report, null, 2)}\n`);
  console.log(`Wrote ${OUT_PATH} (${report.violationCount} violations in ${report.filesWithViolations.length} files)`);
}

main();
