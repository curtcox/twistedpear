#!/usr/bin/env node
/**
 * Documentation samples must present a Guida version next to JavaScript.
 *
 *   node scripts/doc-audit/guida-doc-samples.mjs
 *   node scripts/doc-audit/guida-doc-samples.mjs --scope=apps
 *   node scripts/doc-audit/guida-doc-samples.mjs --scope=prose
 *
 * `apps` — every documented sample app directory has elm.json + src/Main.elm,
 * and its documenting page links both bundle.js and Main.elm.
 * `prose` — authoring-guide, cookbook chapters, handbook SDK pages, and
 * docs/miniapp-sdk.md: a heading section that fences JavaScript also fences
 * Elm or links a .elm file.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "./repo-root.mjs";

const USAGE = `usage: node scripts/doc-audit/guida-doc-samples.mjs [--scope=apps|prose|all]`;

const SAMPLE_ROOTS = ["cookbook/apps", "apps/examples", "cookbook/examples"];

const PROSE_PATHS = ["docs/miniapp-sdk.md"];

const PROSE_DIRS = ["authors", "cookbook", "apps/handbook/content/part-3-sdk"];

const PROSE_SKIP = new Set([
  "authors/04b-building-the-ui-in-guida.md",
  "authors/appendix-feature-status.md",
  "authors/README.md",
  "cookbook/README.md",
  "cookbook/appendix-feature-status.md",
  "cookbook/appendix-app-index.md",
]);

/** @typedef {{ path: string; message: string }} Finding */

/**
 * @param {string} dir
 * @returns {string[]}
 */
function childDirs(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .map((name) => join(dir, name))
    .filter((path) => statSync(path).isDirectory())
    .sort();
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function fenceLangs(text) {
  return [...text.matchAll(/^```(\w+)/gm)].map((match) => match[1]);
}

/**
 * @param {string} text
 * @returns {boolean}
 */
function hasElmListing(text) {
  const langs = fenceLangs(text);
  if (langs.includes("elm")) return true;
  return /\]\([^)\s]+\.elm\)/.test(text);
}

/**
 * @param {string} text
 * @returns {string[]}
 */
function h2Sections(text) {
  const parts = text.split(/^## /m);
  if (parts.length <= 1) return [text];
  const sections = [];
  if (parts[0].trim()) sections.push(parts[0]);
  for (const part of parts.slice(1)) sections.push(`## ${part}`);
  return sections;
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
function auditSampleApps(root) {
  /** @type {Finding[]} */
  const findings = [];
  for (const relRoot of SAMPLE_ROOTS) {
    for (const dir of childDirs(join(root, relRoot))) {
      const rel = dir.slice(root.length + 1);
      const manifest = join(dir, "app.manifest.json");
      const bundle = join(dir, "bundle.js");
      if (!existsSync(manifest) || !existsSync(bundle)) continue;
      const elmJson = join(dir, "elm.json");
      const mainElm = join(dir, "src/Main.elm");
      if (!existsSync(elmJson) || !existsSync(mainElm)) {
        findings.push({
          path: rel,
          message: "documented sample app is missing elm.json + src/Main.elm",
        });
      }
      const readmePath = existsSync(join(dir, "README.md"))
        ? join(dir, "README.md")
        : relRoot === "apps/examples"
          ? join(root, "apps/examples/README.md")
          : null;
      const readmeRel = readmePath
        ? readmePath.slice(root.length + 1)
        : `${rel}/README.md`;
      if (!readmePath || !existsSync(readmePath)) {
        findings.push({
          path: rel,
          message:
            "documented sample app has no README that can list Guida source",
        });
        continue;
      }
      const readme = readFileSync(readmePath, "utf8");
      const hasJs = readme.includes("bundle.js");
      const hasElm =
        readme.includes("Main.elm") || readme.includes("src/Main.elm");
      if (!hasJs || !hasElm) {
        findings.push({
          path: readmeRel,
          message: `${rel} documenting page must link both bundle.js and Main.elm`,
        });
      }
    }
  }
  return findings;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
function proseFiles(root) {
  /** @type {string[]} */
  const files = [...PROSE_PATHS];
  for (const relDir of PROSE_DIRS) {
    const abs = join(root, relDir);
    if (!existsSync(abs)) continue;
    for (const name of readdirSync(abs).sort()) {
      if (!name.endsWith(".md")) continue;
      files.push(join(relDir, name));
    }
  }
  return files.filter(
    (rel) => !PROSE_SKIP.has(rel) && !rel.includes("/images/"),
  );
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
function auditProse(root) {
  /** @type {Finding[]} */
  const findings = [];
  for (const rel of proseFiles(root)) {
    const abs = join(root, rel);
    if (!existsSync(abs)) continue;
    const text = readFileSync(abs, "utf8");
    for (const section of h2Sections(text)) {
      const langs = fenceLangs(section);
      const js = langs.includes("javascript") || langs.includes("js");
      if (!js) continue;
      if (hasElmListing(section)) continue;
      const heading = section.startsWith("## ")
        ? section
            .split("\n", 1)[0]
            .replace(/^##\s+/, "")
            .trim()
        : "(lead)";
      findings.push({
        path: rel,
        message: `JavaScript sample in "${heading}" has no Guida listing (elm fence or .elm link)`,
      });
    }
  }
  return findings;
}

/**
 * @param {string[]} argv
 * @returns {string}
 */
function parseScope(argv) {
  const flag = argv.find((arg) => arg.startsWith("--scope="));
  if (!flag) return "all";
  const scope = flag.slice("--scope=".length);
  if (scope !== "apps" && scope !== "prose" && scope !== "all") {
    throw new Error(USAGE);
  }
  return scope;
}

/**
 * @param {Finding[]} findings
 */
function report(findings) {
  if (findings.length === 0) {
    console.log("guida-doc-samples: ok");
    return;
  }
  for (const finding of findings) {
    console.error(`${finding.path}: ${finding.message}`);
  }
  console.error(`guida-doc-samples: ${findings.length} gap(s)`);
  process.exitCode = 1;
}

function main() {
  const argv = process.argv.slice(2);
  if (argv.includes("--help") || argv.includes("-h")) {
    console.log(USAGE);
    return;
  }
  const root = repoRoot();
  const scope = parseScope(argv.filter((arg) => arg !== "--help"));
  /** @type {Finding[]} */
  const findings = [];
  if (scope === "apps" || scope === "all")
    findings.push(...auditSampleApps(root));
  if (scope === "prose" || scope === "all") findings.push(...auditProse(root));
  report(findings);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
