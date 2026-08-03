#!/usr/bin/env node
// @ts-nocheck
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { defaultTpDocForPath } from "./lifecycle-rules.mjs";
import { repoRoot, trackedMarkdownPaths } from "./repo-root.mjs";
import { ensureTpDocBlock, parseTpDoc } from "./tp-doc.mjs";

const root = repoRoot();
let updated = 0;

for (const rel of trackedMarkdownPaths(root)) {
  const abs = join(root, rel);
  const text = readFileSync(abs, "utf8");
  const existing = parseTpDoc(text);
  const meta = existing ?? defaultTpDocForPath(rel);
  const next = ensureTpDocBlock(text, meta);
  if (next !== text) {
    writeFileSync(abs, next.endsWith("\n") ? next : `${next}\n`, "utf8");
    updated++;
  }
}

console.log(`tp-doc headers ensured on ${updated} files`);
