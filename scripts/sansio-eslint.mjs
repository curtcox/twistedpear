#!/usr/bin/env node
/**
 * Run ESLint on protocol roots excluding ratchet exception files.
 * Uses --no-inline-config so deny-list rules cannot be disabled inline.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ratchet = JSON.parse(fs.readFileSync(path.join(ROOT, "sansio-ratchet.json"), "utf8"));
const excepted = new Set(ratchet.exceptions.map((e) => (typeof e === "string" ? e : e.file)));

const targets = [];
for (const root of ratchet.protocolRoots) {
  const abs = path.join(ROOT, root);
  if (!fs.existsSync(abs)) continue;
  walk(abs, targets);
}

function walk(dir, out) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "dist" || entry.name === "node_modules") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".ts")) {
      const rel = path.relative(ROOT, full).split(path.sep).join("/");
      if (excepted.has(rel)) continue;
      if ((ratchet.adapterAllowlist ?? []).some((p) => matchGlob(rel, p))) continue;
      out.push(rel);
    }
  }
}

function matchGlob(file, pattern) {
  const escaped = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*\*/g, ":::DOUBLE:::")
    .replace(/\*/g, "[^/]*")
    .replace(/:::DOUBLE:::/g, ".*");
  return new RegExp(`^${escaped}$`).test(file);
}

if (targets.length === 0) {
  console.log("Sans-IO eslint: no non-excepted protocol files to lint");
  process.exit(0);
}

const result = spawnSync(
  path.join(ROOT, "node_modules/.bin/eslint"),
  ["--no-inline-config", "--max-warnings", "0", ...targets],
  { cwd: ROOT, encoding: "utf8", stdio: "inherit" }
);
process.exit(result.status ?? 1);
