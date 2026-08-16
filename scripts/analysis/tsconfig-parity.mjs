#!/usr/bin/env node
/**
 * Strictness parity across every workspace TypeScript project.
 *
 * Before this gate, each package carried its own hand-copied block of thirteen
 * compiler options. That is the kind of duplication nothing notices going
 * wrong: `packages/sim-adversaries` had silently lost `noImplicitOverride` and
 * `noFallthroughCasesInSwitch`, and `apps/harness-mobile` — the largest body of
 * application code in the repository — was missing five flags including
 * `noUncheckedIndexedAccess` and `exactOptionalPropertyTypes`. Every one of
 * those projects typechecked green, because a flag that is absent cannot fail.
 *
 * The fix is `tsconfig.base.json` (strictness, extended by everything) and
 * `tsconfig.package.json` (composite emit, extended by the library packages).
 * This gate keeps them honest in both directions: a project that stops
 * extending them fails, and so does one that re-declares an inherited flag
 * locally — because a local re-declaration is how a project quietly opts out
 * while still looking like it participates.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const BASE = "tsconfig.base.json";
const PACKAGE = "tsconfig.package.json";

/**
 * Projects exempt from the shared base, with the reason.
 *
 * Empty on purpose. An entry here is a workspace whose TypeScript is checked
 * less strictly than the rest, so it belongs in review, not in a config file
 * nobody re-reads.
 */
const EXEMPT = new Map();

/** @param {string} file */
function inheritedFlags(file) {
  return Object.keys(readJson(path.join(ROOT, file)).compilerOptions ?? {});
}

const baseFlags = inheritedFlags(BASE);
const packageFlags = [...baseFlags, ...inheritedFlags(PACKAGE)];

/** Every workspace with a `tsconfig.json`, as repo-relative paths. */
function projects() {
  const found = [];
  for (const group of ["packages", "apps"]) {
    const dir = path.join(ROOT, group);
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir).sort()) {
      const relative = path.join(group, name, "tsconfig.json");
      if (fs.existsSync(path.join(ROOT, relative))) found.push(relative);
    }
  }
  return found;
}

/**
 * `extends` is a string or an array of them; normalize and resolve each entry
 * against the project's own directory so that `../../tsconfig.base.json` and a
 * bare `expo/tsconfig.base` are comparable.
 *
 * @param {string} relative
 * @param {unknown} extendsField
 */
function extendedFiles(relative, extendsField) {
  const entries =
    typeof extendsField === "string"
      ? [extendsField]
      : Array.isArray(extendsField)
        ? extendsField
        : [];
  const from = path.dirname(path.join(ROOT, relative));
  return entries.map((entry) =>
    entry.startsWith(".")
      ? path.relative(ROOT, path.resolve(from, entry))
      : entry,
  );
}

const findings = [];
for (const relative of projects()) {
  if (EXEMPT.has(relative)) continue;
  const config = readJson(path.join(ROOT, relative));
  const extended = extendedFiles(relative, config.extends);

  // A composite project in the root `tsc -b` graph must take the package layer;
  // anything else needs at least the strictness base. `noEmit` is the signal —
  // it is what `apps/harness-mobile` uses to stay out of the build graph.
  const wantsPackageLayer = config.compilerOptions?.noEmit !== true;
  const required = wantsPackageLayer ? PACKAGE : BASE;
  const inherits = wantsPackageLayer
    ? extended.includes(PACKAGE)
    : extended.includes(BASE) || extended.includes(PACKAGE);

  if (!inherits) {
    findings.push(`${relative}: does not extend ${required}`);
    continue;
  }

  const governed = extended.includes(PACKAGE) ? packageFlags : baseFlags;
  for (const flag of Object.keys(config.compilerOptions ?? {})) {
    if (governed.includes(flag)) {
      findings.push(
        `${relative}: re-declares inherited option "${flag}"; remove it and let ${required} govern it`,
      );
    }
  }
}

for (const finding of findings) console.error(`  ${finding}`);
for (const [relative, reason] of EXEMPT) {
  console.warn(`tsconfig-parity: ${relative} exempt — ${reason}`);
}
console.log(
  `tsconfig-parity: ${findings.length === 0 ? "PASS" : "FAIL"}; ${projects().length} project(s), ${baseFlags.length} base flag(s), ${EXEMPT.size} exempt.`,
);
process.exit(findings.length === 0 ? 0 : 1);
