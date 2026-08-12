#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "@typescript-eslint/parser";
import { readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");
const LIMITS = path.join(ROOT, "api-surface-limits.json");
const limits = readJson(LIMITS, {
  version: 1,
  total: Infinity,
  packages: {},
});

const SOURCE_EXTENSIONS = [".ts", ".tsx", ".mts", ".mjs", ".js", ".jsx"];

/**
 * The source file behind an `exports` target.
 *
 * Packages point their exports map at build output — `./dist/web.js` and
 * `./dist/web.d.ts` — because that is what consumers load. Counting the
 * declarations in `dist` would work only on a machine that had just built, and
 * would report nothing on a clean checkout, so every target is mapped back to
 * the `src` file it is emitted from. `worklet-core` ships `.mjs` from `src`
 * directly and needs no mapping.
 *
 * @param {string} pkgDir
 * @param {string} target
 * @returns {string | null}
 */
function resolveEntry(pkgDir, target) {
  const relative = target.replace(/^\.\//, "");
  const candidates = [relative];
  const emitted = relative.match(/^dist\/(.+)$/);
  if (emitted) {
    const stem = emitted[1].replace(/\.(d\.ts|ts|tsx|mts|js|mjs|cjs|jsx)$/, "");
    candidates.push(`src/${stem}`, `src/${stem}/index`);
  }
  for (const candidate of candidates) {
    const direct = path.join(pkgDir, candidate);
    if (candidate === relative && fs.existsSync(direct) && !emitted)
      return direct;
    for (const extension of SOURCE_EXTENSIONS) {
      const file = `${direct}${extension}`;
      if (fs.existsSync(file)) return file;
    }
  }
  return null;
}

/**
 * The file a relative specifier names, from the importer's directory.
 * @param {string} from
 * @param {string} specifier
 * @returns {string | null}
 */
function resolveRelative(from, specifier) {
  if (!specifier.startsWith(".")) return null;
  const base = path.resolve(path.dirname(from), specifier);
  const stem = base.replace(/\.(js|mjs|cjs|jsx)$/, "");
  for (const candidate of [stem, path.join(stem, "index")])
    for (const extension of SOURCE_EXTENSIONS) {
      const file = `${candidate}${extension}`;
      if (fs.existsSync(file)) return file;
    }
  return fs.existsSync(base) && fs.statSync(base).isFile() ? base : null;
}

/** Every name bound by a declarator target, including destructuring. */
function patternNames(node, into) {
  if (!node) return;
  if (node.type === "Identifier") into.push(node.name);
  else if (node.type === "ObjectPattern")
    for (const property of node.properties)
      patternNames(property.value ?? property.argument, into);
  else if (node.type === "ArrayPattern")
    for (const element of node.elements) patternNames(element, into);
  else if (node.type === "AssignmentPattern") patternNames(node.left, into);
  else if (node.type === "RestElement") patternNames(node.argument, into);
}

const SINGLE_DECLARATIONS = new Set([
  "FunctionDeclaration",
  "TSDeclareFunction",
  "ClassDeclaration",
  "TSInterfaceDeclaration",
  "TSTypeAliasDeclaration",
  "TSEnumDeclaration",
  "TSModuleDeclaration",
]);

/**
 * Every name a module exports, following `export * from` transitively.
 *
 * The recursion is the point. A barrel that re-exports fifteen modules has two
 * public symbols by a naive count and several thousand in practice, and a
 * measurement a barrel can defeat by adding one line is worse than no
 * measurement — it would report the largest surface in the repository as the
 * smallest. `seen` keeps the six known import cycles from running forever.
 *
 * @param {string} file
 * @param {Set<string>} seen
 * @returns {Set<string>}
 */
function exportedNames(file, seen = new Set()) {
  const names = new Set();
  if (seen.has(file)) return names;
  seen.add(file);
  let ast;
  try {
    ast = parse(fs.readFileSync(file, "utf8"), {
      ecmaVersion: 2022,
      sourceType: "module",
      jsx: file.endsWith("x"),
      loc: false,
      range: false,
    });
  } catch (error) {
    throw new Error(`Failed to parse ${path.relative(ROOT, file)}`, {
      cause: error,
    });
  }

  for (const node of ast.body) {
    if (
      node.type === "ExportDefaultDeclaration" ||
      node.type === "TSExportAssignment"
    ) {
      names.add("default");
    } else if (node.type === "ExportNamedDeclaration") {
      const declaration = node.declaration;
      if (declaration?.type === "VariableDeclaration") {
        const bound = [];
        for (const declarator of declaration.declarations)
          patternNames(declarator.id, bound);
        for (const name of bound) names.add(name);
      } else if (declaration && SINGLE_DECLARATIONS.has(declaration.type)) {
        if (declaration.id?.name) names.add(declaration.id.name);
      }
      for (const specifier of node.specifiers)
        names.add(specifier.exported.name ?? specifier.exported.value);
    } else if (node.type === "ExportAllDeclaration") {
      if (node.exported) {
        names.add(node.exported.name ?? node.exported.value);
        continue;
      }
      const target = resolveRelative(file, node.source.value);
      if (target === null) continue;
      // `export *` does not forward a default export.
      for (const name of exportedNames(target, seen))
        if (name !== "default") names.add(name);
    }
  }
  return names;
}

const packages = [];
const unresolved = [];
for (const entry of fs
  .readdirSync(path.join(ROOT, "packages"), { withFileTypes: true })
  .sort((a, b) => a.name.localeCompare(b.name))) {
  if (!entry.isDirectory()) continue;
  const name = entry.name;
  const pkgDir = path.join(ROOT, "packages", name);
  const manifest = readJson(path.join(pkgDir, "package.json"), null);
  if (!manifest?.exports) continue;
  const entryPoints = {};
  for (const [key, value] of Object.entries(manifest.exports)) {
    if (key === "./package.json") continue;
    const target =
      typeof value === "string"
        ? value
        : (value.types ?? value.import ?? value.default);
    if (typeof target !== "string") continue;
    const file = resolveEntry(pkgDir, target);
    if (file === null) {
      unresolved.push(`${name} ${key} -> ${target}`);
      continue;
    }
    entryPoints[key] = exportedNames(file).size;
  }
  packages.push({
    name,
    entryPoints,
    // Entry points overlap — `./web` re-exports much of `.` — so the package
    // total is their sum, not a union. It measures how much surface each
    // documented door opens onto, which is what a consumer sees.
    total: Object.values(entryPoints).reduce((sum, count) => sum + count, 0),
  });
}
const total = packages.reduce((sum, pkg) => sum + pkg.total, 0);

if (write) {
  writeJson(LIMITS, {
    version: 1,
    description:
      "Hard caps on public API surface, one per entry point plus a per-package and repository total. Adding an exported symbol fails `npm run api:check` until the matching number is raised in the same pull request, which is the point: it puts every widening of the public surface in the diff, where it can be argued about. `export * from` is followed transitively, so a barrel cannot hide its size. Run `npm run api:baseline` to recalibrate after an intended change.",
    total,
    packages: Object.fromEntries(
      packages.map((pkg) => [
        pkg.name,
        { total: pkg.total, entryPoints: pkg.entryPoints },
      ]),
    ),
  });
  console.log(
    `API surface: pinned ${total} public symbols across ${packages.length} packages.`,
  );
  process.exit(0);
}

const violations = [];
const slack = [];
for (const pkg of packages) {
  const pinned = limits.packages?.[pkg.name];
  if (!pinned) {
    violations.push(
      `${pkg.name}: not in api-surface-limits.json — run \`npm run api:baseline\` and review the diff`,
    );
    continue;
  }
  for (const [key, count] of Object.entries(pkg.entryPoints)) {
    const cap = pinned.entryPoints?.[key];
    if (cap === undefined)
      violations.push(
        `${pkg.name} ${key}: new entry point exporting ${count} symbol(s)`,
      );
    else if (count > cap)
      violations.push(
        `${pkg.name} ${key}: ${count} exported symbols exceeds its cap of ${cap}`,
      );
    else if (count < cap) slack.push(`${pkg.name} ${key}: ${cap} -> ${count}`);
  }
  for (const key of Object.keys(pinned.entryPoints ?? {}))
    if (!(key in pkg.entryPoints))
      slack.push(`${pkg.name} ${key}: entry point is gone`);
  if (pkg.total > pinned.total)
    violations.push(
      `${pkg.name}: ${pkg.total} exported symbols exceeds its cap of ${pinned.total}`,
    );
}
if (total > limits.total)
  violations.push(
    `repository: ${total} public symbols exceeds the cap of ${limits.total}`,
  );
for (const entry of unresolved)
  violations.push(
    `unresolved entry point ${entry} — the gate cannot measure what it cannot resolve`,
  );

writeJson(path.join(ROOT, "api-surface.json"), {
  version: 1,
  total,
  cap: limits.total,
  packages: packages.length,
  entryPoints: packages.reduce(
    (sum, pkg) => sum + Object.keys(pkg.entryPoints).length,
    0,
  ),
  unresolved: unresolved.length,
  violations: violations.length,
  findings: [...packages].sort((a, b) => b.total - a.total),
});

if (violations.length > 0) {
  console.error(`\nAPI surface: ${violations.length} violation(s):`);
  for (const entry of violations.slice(0, 50)) console.error(`  ${entry}`);
  if (violations.length > 50)
    console.error(`  … and ${violations.length - 50} more.`);
  process.exit(1);
}
if (slack.length > 0)
  console.log(
    `API surface: ${slack.length} cap(s) now have slack; run \`npm run api:baseline\` to reclaim it.`,
  );
console.log(`API surface: ${total} public symbols within limits.`);
