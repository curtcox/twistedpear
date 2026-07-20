import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { repoRoot } from "./repo-root.mjs";
import { trackedMarkdownPaths } from "./repo-root.mjs";

const LINK_RE = /(?<!!)\[[^\]]*\]\(([^)]+)\)/g;

/**
 * @param {string} root
 * @param {string[]} [files]
 * @returns {{ doc: string; target: string; line: number }[]}
 */
export function findBrokenMarkdownLinks(root = repoRoot(), files = trackedMarkdownPaths(root)) {
  /** @type {{ doc: string; target: string; line: number }[]} */
  const broken = [];

  for (const rel of files) {
    if (rel.startsWith("archive/")) continue;
    const abs = join(root, rel);
    const text = readFileSync(abs, "utf8");
    const lines = text.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      let m;
      LINK_RE.lastIndex = 0;
      while ((m = LINK_RE.exec(line)) !== null) {
        const target = m[1].trim();
        if (
          target.startsWith("http://") ||
          target.startsWith("https://") ||
          target.startsWith("mailto:") ||
          target.startsWith("#") ||
          target.startsWith("chapter:")
        ) {
          continue;
        }
        const pathPart = target.split("#")[0].split("?")[0];
        if (!pathPart) continue;
        if (!/\.(md|html)$/i.test(pathPart) && !pathPart.includes("/")) {
          continue;
        }
        const resolved = join(dirname(abs), pathPart);
        if (!existsSync(resolved)) {
          broken.push({ doc: rel, target, line: i + 1 });
        }
      }
    }
  }

  return broken;
}
