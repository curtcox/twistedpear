import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "./repo-root.mjs";
import { trackedMarkdownPaths } from "./repo-root.mjs";

const LINK_RE = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;

const SKIPPED_PREFIXES = ["http://", "https://", "mailto:", "#", "chapter:"];

/**
 * @param {string} target
 * @returns {boolean}
 */
function isExternalOrAnchorLink(target) {
  return SKIPPED_PREFIXES.some((prefix) => target.startsWith(prefix));
}

/**
 * @param {string} pathPart
 * @returns {boolean}
 */
function isLinkablePath(pathPart) {
  if (!pathPart) return false;
  if (/\.(md|html)$/i.test(pathPart)) return true;
  return pathPart.includes("/");
}

/**
 * @param {string} abs
 * @param {string} rel
 * @param {string} line
 * @param {number} index
 * @param {{ doc: string; target: string; line: number }[]} broken
 */
function checkLineForBrokenLinks(abs, rel, line, index, broken) {
  let m;
  LINK_RE.lastIndex = 0;
  while ((m = LINK_RE.exec(line)) !== null) {
    const target = m[1].trim();
    if (isExternalOrAnchorLink(target)) continue;
    const pathPart = target.split("#")[0].split("?")[0];
    if (!isLinkablePath(pathPart)) continue;
    const resolved = join(dirname(abs), pathPart);
    if (!existsSync(resolved)) {
      broken.push({ doc: rel, target, line: index + 1 });
    }
  }
}

/**
 * @param {string} root
 * @param {string[]} [files]
 * @returns {{ doc: string; target: string; line: number }[]}
 */
export function findBrokenMarkdownLinks(
  root = repoRoot(),
  files = trackedMarkdownPaths(root),
) {
  /** @type {{ doc: string; target: string; line: number }[]} */
  const broken = [];

  for (const rel of files) {
    if (rel.startsWith("archive/")) continue;
    const abs = join(root, rel);
    const text = readFileSync(abs, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      checkLineForBrokenLinks(abs, rel, lines[i], i, broken);
    }
  }

  return broken;
}
