import fs from "node:fs";
import path from "node:path";

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"];

/**
 * @param {string} root
 * @param {...string} stems
 * @returns {string | null}
 */
export function firstExisting(root, ...stems) {
  for (const stem of stems)
    for (const extension of SOURCE_EXTENSIONS)
      if (fs.existsSync(path.join(root, `${stem}${extension}`)))
        return `${stem}${extension}`;
  return null;
}

/**
 * Repo-relative path of a cruiser dependency, even when the file is missing.
 *
 * Worklets import compiled output as `../packages/foo/dist/bar.js`. When
 * `dist/` exists, cruiser reports that as `packages/foo/dist/bar.js`. When it
 * does not — a clean CI checkout — `resolved` is left as the relative
 * specifier, which does not match `^(packages|apps)/`, so the edge vanished.
 * Joining the specifier onto the importer is what makes the graph identical
 * either way.
 *
 * @param {string} source
 * @param {{ resolved?: string, module?: string }} dependency
 * @returns {string | null}
 */
export function cruiseResolved(source, dependency) {
  const raw = dependency.resolved || dependency.module;
  if (!raw) return null;
  if (raw.startsWith("./") || raw.startsWith("../"))
    return path.posix.normalize(`${path.posix.dirname(source)}/${raw}`);
  return raw;
}

/**
 * The authored module a dependency actually names.
 *
 * TypeScript project references resolve `@twistedpear/reticulum-ts` to that
 * package's *declaration output*, so every single cross-package import arrives
 * pointing at `packages/<name>/dist/**.d.ts`. Dropping `dist/` as generated —
 * which it is, and whose complexity nobody can edit — therefore deletes every
 * inter-package edge in the repository and leaves a graph in which no package
 * depends on any other. Mapping the emitted path back to the source it was
 * emitted from is what makes the component metrics mean anything.
 *
 * @param {string} root
 * @param {string} target
 * @returns {string | null}
 */
export function normalizeTarget(root, target) {
  const scoped = target.match(/^@twistedpear\/([^/]+)/);
  if (scoped) return firstExisting(root, `packages/${scoped[1]}/src/index`);
  const emitted = target.match(/^((?:packages|apps)\/[^/]+)\/dist\/(.+)$/);
  if (!emitted) return target;
  const [, component, rest] = emitted;
  const stem = rest.replace(/\.(d\.ts|ts|tsx|js|jsx|mjs|cjs)$/, "");
  return firstExisting(
    root,
    `${component}/src/${stem}`,
    `${component}/src/${stem}/index`,
    `${component}/src/index`,
  );
}
