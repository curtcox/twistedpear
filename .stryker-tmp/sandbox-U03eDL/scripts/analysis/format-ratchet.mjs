#!/usr/bin/env node
// @ts-nocheck
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { compareDiagnosticSet, printDiagnosticResult, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const write = process.argv.includes("--write");
const result = spawnSync(process.execPath, ["node_modules/prettier/bin/prettier.cjs", "--list-different", "."], {
  cwd: ROOT,
  encoding: "utf8",
  maxBuffer: 64 * 1024 * 1024
});
const files = (result.stdout ?? "").split(/\r?\n/).filter(Boolean).sort();
writeJson(path.join(ROOT, "format.json"), { version: 1, count: files.length, files });
const comparison = compareDiagnosticSet({
  root: ROOT,
  baselineFile: path.join(ROOT, "format-ratchet.json"),
  current: files,
  write,
  allowRegressions: process.argv.includes("--allow-regressions"),
  description: "Files not yet mechanically formatted when the formatting gate landed; entries may only disappear.",
  envName: "FORMAT_RATCHET_BASE_REF"
});
if (write) console.log(`Formatting ratchet: wrote ${files.length} entries.`);
else if (!printDiagnosticResult("Formatting ratchet", comparison)) process.exit(1);
