import { spawnSync } from "node:child_process";

/**
 * Paths whose complexity nobody can reduce by editing them.
 *
 * Every gate in this directory measures authored code. Bundles, concatenation
 * parts, vendored third-party sources and emitted output all parse fine and all
 * score terribly, and pinning them would build an exemption list that can never
 * drain because the only way to change those files is to change the generator.
 *
 * Two of these are anchored at the repository root on purpose. `site/` is the
 * built Pages output but `scripts/site/` is the hand-written builder for it, and
 * `archive/` is the retired-code tree while nothing else is called that. The
 * rest can appear at any depth.
 */
export const GENERATED_PATH_PATTERN = new RegExp(
  [
    "(^|/)node_modules/",
    "(^|/)dist/",
    "^archive/",
    "^site/",
    "(^|/)__pycache__/",
    "(^|/)vendor/",
    "(^|/)generated/",
    "(^|/)seeds/",
    "(^|/)seed/",
    // Native toolchain output: Gradle, SwiftPM, Expo prebuild, CocoaPods.
    "(^|/)(build|\\.build|\\.gradle|\\.expo|Pods)/",
    "\\.gen\\.(ts|tsx|js|mjs|cjs)$",
    "\\.generated\\.(mjs|js|cjs)$",
    "(^|/)bundle\\.js$",
    "\\.bundle\\.(js|mjs)$",
    // Files split purely to satisfy the file-size ratchet, then concatenated.
    "-part-\\d+\\.mjs$",
    "-extracted-\\d+\\.mjs$",
    "(^|/)web-hyper-fetch\\.js$",
  ].join("|"),
);

/**
 * @param {string} relative repository-relative path, `/`-separated
 * @returns {boolean}
 */
export function isGeneratedPath(relative) {
  return GENERATED_PATH_PATTERN.test(relative);
}

/**
 * Which of `relatives` git ignores.
 *
 * The pattern above catches generated files that are committed; this catches
 * the much larger set that is not. Build output lands inside the analysis roots
 * on any machine that has run a build, and a gate whose result depends on
 * whether someone ran `npm run build` first is not a gate. One batched
 * `check-ignore` beats one process per file: `--stdin` reads NUL-separated
 * paths and echoes back the ignored ones, and exit status 1 simply means none
 * matched.
 *
 * @param {string} root
 * @param {string[]} relatives
 * @returns {Set<string>}
 */
export function gitIgnoredPaths(root, relatives) {
  if (relatives.length === 0) return new Set();
  const result = spawnSync(
    "git",
    ["check-ignore", "--stdin", "-z", "--no-index"],
    {
      cwd: root,
      input: `${relatives.join("\0")}\0`,
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
    },
  );
  if (result.status !== 0 && result.status !== 1) {
    throw new Error(
      `git check-ignore failed (exit ${result.status}): ${result.stderr ?? ""}`,
    );
  }
  return new Set((result.stdout ?? "").split("\0").filter(Boolean));
}

/**
 * The authored subset of `relatives`, in the order given.
 * @param {string} root
 * @param {string[]} relatives
 * @returns {string[]}
 */
export function authoredPaths(root, relatives) {
  const candidates = relatives.filter((relative) => !isGeneratedPath(relative));
  const ignored = gitIgnoredPaths(root, candidates);
  return candidates.filter((relative) => !ignored.has(relative));
}
