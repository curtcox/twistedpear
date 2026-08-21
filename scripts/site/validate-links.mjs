#!/usr/bin/env node
/**
 * Validate internal Markdown links in the staged site tree.
 * Exits non-zero on broken in-site targets.
 */
import fs from "node:fs";
import path from "node:path";
import { SITE_SRC, SITE_ROOT } from "./paths.mjs";

function collectFiles(dir, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "raw" || entry.name === "typedoc") continue;
      collectFiles(abs, acc);
    } else if (entry.name.endsWith(".md") || entry.name.endsWith(".html")) {
      acc.push(abs);
    }
  }
  return acc;
}

function existsTarget(fromAbs, href) {
  const hashIdx = href.indexOf("#");
  const withoutHash = hashIdx === -1 ? href : href.slice(0, hashIdx);
  const queryIdx = withoutHash.indexOf("?");
  const raw = queryIdx === -1 ? withoutHash : withoutHash.slice(0, queryIdx);
  if (!raw) return true;

  // Absolute site paths like /docs/foo
  if (raw.startsWith("/")) {
    const cleaned = raw.replace(/\/$/, "").replace(/^\//, "");
    const candidates = [
      path.join(SITE_SRC, `${cleaned}.md`),
      path.join(SITE_SRC, cleaned, "index.md"),
      path.join(SITE_SRC, cleaned, "README.md"),
      path.join(SITE_SRC, cleaned),
      path.join(SITE_ROOT, "public", cleaned),
      path.join(SITE_ROOT, "public", `${cleaned}.html`),
      path.join(SITE_ROOT, "public", cleaned, "index.html")
    ];
    return candidates.some((c) => fs.existsSync(c));
  }

  const fromDir = path.dirname(fromAbs);
  const resolved = path.normalize(path.join(fromDir, raw));
  const candidates = [
    resolved,
    `${resolved}.md`,
    path.join(resolved, "index.md"),
    path.join(resolved, "README.md"),
    `${resolved}.html`
  ];
  return candidates.some((c) => fs.existsSync(c));
}

function skipHref(href) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#") ||
    href.startsWith("data:") ||
    href.includes("typedoc") ||
    href.includes("/raw/") ||
    href.startsWith("./raw/")
  );
}

/** @returns {{ files: number; broken: string[] }} */
export function findBrokenSiteLinks() {
  const files = collectFiles(SITE_SRC);
  /** @type {string[]} */
  const broken = [];

  for (const file of files) {
    if (!file.endsWith(".md")) continue;
    const text = fs.readFileSync(file, "utf8");
    const rel = path.relative(SITE_SRC, file);
    const re = /\[[^\]]*\]\(([^)\s]+)\)/g;
    let m;
    while ((m = re.exec(text))) {
      const href = m[1];
      if (skipHref(href)) continue;
      if (!existsTarget(file, href)) broken.push(`${rel}: ${href}`);
    }
  }
  return { files: files.length, broken };
}

function main() {
  const { files, broken } = findBrokenSiteLinks();
  if (broken.length) {
    console.error(`Broken internal links (${broken.length}):`);
    for (const b of broken.slice(0, 50)) console.error(`  ${b}`);
    if (broken.length > 50) console.error(`  … and ${broken.length - 50} more`);
    process.exit(1);
  }
  console.log(`Validated links in ${files} files — ok`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
