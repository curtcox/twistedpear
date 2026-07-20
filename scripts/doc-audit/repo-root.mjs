import { execSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

/** @returns {string} */
export function repoRoot() {
  return join(here, "../..");
}

/** @returns {string[]} */
export function trackedMarkdownPaths(root = repoRoot()) {
  const out = execSync("git ls-files '*.md'", { cwd: root, encoding: "utf8" });
  return out
    .trim()
    .split("\n")
    .filter(Boolean)
    .sort();
}
