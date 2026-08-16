#!/usr/bin/env node
/**
 * No dependency may run code at install time without being named here.
 *
 * `npm ci` executes `preinstall`, `install`, and `postinstall` from every
 * package in the tree, transitive ones included, with the developer's full
 * privileges and before a single test has run. It is the shortest path from a
 * compromised publish to arbitrary code on a laptop and in CI, and it bypasses
 * everything this repository already does about supply chain: Actions are
 * pinned to commit SHAs, the registry's signatures are verified, licenses are
 * reconciled against a policy, advisories against an allowlist, and a code-maat
 * jar against a SHA-256 digest. The front door was locked and this window was
 * open.
 *
 * Two halves, and neither works alone:
 *
 * 1. `.npmrc` sets `ignore-scripts=true`, so npm runs none of them.
 * 2. This gate enumerates the scripts that *would* have run and fails on any
 *    not already reviewed and recorded in `install-scripts-allowlist.json`.
 *
 * Without (1) the allowlist is a description of code that already ran. Without
 * (2) a dependency could start shipping an install script, npm would silently
 * skip it, and nobody would ever look at what it was for — including the case
 * where skipping it quietly breaks the package. So the allowlist is not a set
 * of permissions: nothing here is executed. It is the set of install scripts
 * someone has looked at and confirmed the repository works without.
 *
 * Verified 2026-08-16 against a clean `ignore-scripts=true` install: ast-grep
 * falls back to runtime binary resolution with a warning, esbuild's CLI and JS
 * API both work from the platform package, and `@serialport/bindings-cpp`
 * resolves its prebuild through node-gyp-build at require time. No `npm
 * rebuild` step is needed anywhere, which is why no workflow grew one.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const ALLOWLIST = path.join(ROOT, "install-scripts-allowlist.json");
const MODULES = path.join(ROOT, "node_modules");
const write = process.argv.includes("--write");

/** The lifecycle hooks npm runs during install, in the order it runs them. */
const HOOKS = ["preinstall", "install", "postinstall"];

/**
 * Confirm npm is actually configured to skip these.
 *
 * The allowlist is a list of code that did not run. If `ignore-scripts` is
 * removed from `.npmrc` the same list becomes a list of code that did, while
 * still passing — the failure mode most worth catching, because nothing else
 * about the repository would look any different.
 *
 * @returns {string[]}
 */
function npmrcFindings() {
  const file = path.join(ROOT, ".npmrc");
  const text = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : "";
  return /^\s*ignore-scripts\s*=\s*true\s*$/m.test(text)
    ? []
    : [
        ".npmrc: ignore-scripts is not set to true, so npm runs every dependency's install scripts and this allowlist describes code that already ran.",
      ];
}

/**
 * Every installed package that declares an install hook.
 *
 * Walks `node_modules` directly rather than reading `package-lock.json`: the
 * lockfile records `hasInstallScript` for the resolved tree, but only the
 * unpacked package says what the script actually is, and the whole point is to
 * put that text in front of a reviewer.
 *
 * @param {string} directory a node_modules directory
 * @param {Map<string, {hooks: Record<string, string>, version: string}>} found
 */
function collect(directory, found = new Map()) {
  let entries;
  try {
    entries = fs.readdirSync(directory, { withFileTypes: true });
  } catch {
    return found;
  }
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith(".")) continue;
    const packageDir = path.join(directory, entry.name);
    // A scope directory holds packages, not a package.
    if (entry.name.startsWith("@")) {
      collect(packageDir, found);
      continue;
    }
    const manifest = readJson(path.join(packageDir, "package.json"), null);
    if (manifest) {
      const hooks = Object.fromEntries(
        HOOKS.filter((hook) => manifest.scripts?.[hook]).map((hook) => [
          hook,
          manifest.scripts[hook],
        ]),
      );
      if (Object.keys(hooks).length > 0)
        found.set(manifest.name ?? entry.name, {
          hooks,
          version: manifest.version ?? "",
        });
    }
    collect(path.join(packageDir, "node_modules"), found);
  }
  return found;
}

if (!fs.existsSync(MODULES)) {
  console.error(
    "install-scripts: node_modules is absent; run npm ci before this gate. Refusing to report a clean tree from an empty one.",
  );
  process.exit(1);
}

const found = collect(MODULES);
const recorded = readJson(ALLOWLIST, { packages: {} });

if (write) {
  writeJson(ALLOWLIST, {
    version: 1,
    description:
      "Dependency install scripts that have been reviewed. `.npmrc` sets ignore-scripts=true, so none of these run; this records that someone read each one and confirmed the repository works without it. Written by `npm run install-scripts:baseline`; every entry needs a reason.",
    packages: Object.fromEntries(
      [...found.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, { hooks }]) => [
          name,
          { hooks, reason: recorded.packages?.[name]?.reason ?? "" },
        ]),
    ),
  });
  console.log(
    `install-scripts: recorded ${found.size} package(s) with install scripts.`,
  );
  process.exit(0);
}

const skipping = npmrcFindings();
const findings = [...skipping];

for (const [name, { hooks, version }] of [...found].sort()) {
  const entry = recorded.packages?.[name];
  if (!entry) {
    findings.push(
      `${name}@${version} runs an install script that has never been reviewed: ${Object.entries(
        hooks,
      )
        .map(([hook, script]) => `${hook}: ${script}`)
        .join(
          " | ",
        )}. Read it, then record it with npm run install-scripts:baseline and write down why it is there.`,
    );
    continue;
  }
  // A script whose text changed is a new script. The reason recorded against
  // the old text says nothing about the new one.
  for (const [hook, script] of Object.entries(hooks))
    if (entry.hooks?.[hook] !== script)
      findings.push(
        `${name}@${version}: its ${hook} script changed to "${script}" (reviewed: "${entry.hooks?.[hook] ?? "none"}"). Re-read it and re-baseline.`,
      );
  if (!entry.reason)
    findings.push(
      `${name}: recorded with no reason. Say what the script does and why skipping it is safe.`,
    );
}

// A stale entry is not harmless: it is the allowlist claiming to cover a
// package that is no longer installed, which makes it look larger and better
// reviewed than it is.
for (const name of Object.keys(recorded.packages ?? {}))
  if (!found.has(name))
    findings.push(
      `${name}: recorded in the allowlist but no longer installs anything. Re-baseline to drop it.`,
    );

for (const finding of findings) console.error(`  ${finding}`);
console.log(
  `install-scripts: ${findings.length === 0 ? "PASS" : "FAIL"}; ${found.size} package(s) with install scripts, ${skipping.length === 0 ? "all skipped by ignore-scripts" : "AND NPM IS RUNNING THEM"}, ${findings.length} finding(s).`,
);
process.exit(findings.length === 0 ? 0 : 1);
