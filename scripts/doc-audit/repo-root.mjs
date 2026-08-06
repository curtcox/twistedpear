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
  // Include pending, untracked documents so a newly created live/planned pair can
  // be validated before it is staged.
  const out = execSync(
    "git ls-files --cached --others --exclude-standard -- '*.md'",
    { cwd: root, encoding: "utf8" },
  );
  return out.trim().split("\n").filter(Boolean).sort();
}
