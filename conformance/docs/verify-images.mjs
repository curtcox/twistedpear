#!/usr/bin/env node
/**
 * Verify relative Markdown image links under docs/ resolve to committed files.
 */

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const defaultDocsRoot = join(repoRoot, "docs");

const IMAGE_LINK_RE = /!\[[^\]]*\]\(([^)]+)\)/g;

export function findMarkdownImageLinks(markdown, baseDir) {
  const links = [];
  for (const match of markdown.matchAll(IMAGE_LINK_RE)) {
    const target = match[1].trim();
    if (/^(?:https?:|data:|mailto:|#)/i.test(target)) continue;
    links.push({ target, resolved: resolve(baseDir, target) });
  }
  return links;
}

export function findBrokenDocImages(docsRoot = defaultDocsRoot) {
  const broken = [];

  function walk(dir) {
    for (const name of readdirSync(dir)) {
      const path = join(dir, name);
      const stat = statSync(path);
      if (stat.isDirectory()) {
        walk(path);
        continue;
      }
      if (!name.endsWith(".md")) continue;

      const content = readFileSync(path, "utf8");
      for (const link of findMarkdownImageLinks(content, dirname(path))) {
        if (!existsSync(link.resolved)) {
          broken.push({
            doc: path,
            target: link.target,
            resolved: link.resolved,
          });
        }
      }
    }
  }

  walk(docsRoot);
  return broken;
}

function main() {
  const broken = findBrokenDocImages();
  if (broken.length === 0) {
    console.log("All docs image links resolve.");
    return;
  }

  for (const entry of broken) {
    console.error(`${entry.doc}: missing ${entry.target} (${entry.resolved})`);
  }
  process.exitCode = 1;
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
