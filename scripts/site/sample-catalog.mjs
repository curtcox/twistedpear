#!/usr/bin/env node
/**
 * Build the documentation-site sample catalog from every fenced listing in
 * published markdown. Used by site:stage; also importable from tests.
 */
import fs from "node:fs";
import path from "node:path";
import { PAGES_BASE, REPO_URL, ROOT, SITE_SRC } from "./paths.mjs";
import {
  COOKBOOK_APPS_DIR,
  cookbookSectionHrefs,
  headingSlug,
  titleFor,
} from "./cookbook-fixtures.mjs";
import { editorSeeds } from "./editor-seeds.mjs";

const PUBLISHED_DIRS = ["authors", "cookbook", "docs", "guide", "specs"];
const ROOT_DOCS = [
  "README.md",
  "RELEASE-PLAN.md",
  "LIMITATIONS.md",
  "STATUS-COMPLETE.md",
  "STATUS-COMPLETE-PHASES.md",
  "STATUS-COMPLETE-PIPELINE.md",
  "STATUS-COMPLETE-APPS.md",
  "STATUS-SOFTWARE.md",
  "STATUS-HARDWARE.md",
];

const LANGUAGE_LABEL = {
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  elm: "Guida",
  json: "JSON",
  sh: "Shell",
  bash: "Shell",
  shell: "Shell",
  mermaid: "Mermaid",
  html: "HTML",
  css: "CSS",
  python: "Python",
  py: "Python",
  text: "Text",
};

const EDITOR_HINTS = [
  { prefix: "authors/02-hello-world", slug: "hello" },
  { prefix: "authors/04b-building-the-ui-in-guida", slug: "hello-guida" },
];

/**
 * @param {string} text
 * @returns {object[]}
 */
export function extractFences(text) {
  const lines = text.split("\n");
  const fences = [];
  for (let index = 0; index < lines.length; index += 1) {
    if (!lines[index].startsWith("```")) continue;
    const open = lines[index].slice(3);
    const startLine = index + 1;
    const body = [];
    index += 1;
    while (index < lines.length && !lines[index].startsWith("```")) {
      body.push(lines[index]);
      index += 1;
    }
    fences.push({
      language: open.trim().split(/\s+/)[0] || "text",
      body: body.join("\n"),
      startLine,
      endLine: index + 1,
    });
  }
  return fences;
}

/**
 * @param {string} lang
 * @returns {string}
 */
export function languageLabel(lang) {
  return LANGUAGE_LABEL[lang.toLowerCase()] ?? (lang || "Text");
}

/**
 * @param {string} rel
 * @returns {string}
 */
export function sitePathFor(rel) {
  if (ROOT_DOCS.includes(rel)) {
    return rel === "README.md" ? "/reference/" : `/reference/${rel.replace(/\.md$/, "")}`;
  }
  const withoutMd = rel.replace(/\.md$/, "");
  if (withoutMd.endsWith("/README") || withoutMd.endsWith("/index")) {
    return `/${withoutMd.replace(/\/(README|index)$/, "")}/`;
  }
  return `/${withoutMd}`;
}

/**
 * @param {string[]} lines
 * @param {number} fenceLineIndex zero-based index of the opening fence
 */
function headingsBefore(lines, fenceLineIndex) {
  let h1 = "";
  let h2 = "";
  let h3 = "";
  for (let index = 0; index < fenceLineIndex; index += 1) {
    const line = lines[index];
    if (line.startsWith("# ")) h1 = line.slice(2).trim();
    else if (line.startsWith("## ")) h2 = line.slice(3).trim();
    else if (line.startsWith("### ")) h3 = line.slice(4).trim();
  }
  return { h1, h2, h3 };
}

/**
 * @param {string[]} lines
 * @param {number} fenceLineIndex
 * @returns {string}
 */
function skipBlank(lines, index) {
  while (index >= 0 && lines[index].trim() === "") index -= 1;
  return index;
}

function skipDecorations(lines, index) {
  index = skipBlank(lines, index);
  while (index >= 0 && /^#{1,6} /.test(lines[index])) index -= 1;
  index = skipBlank(lines, index);
  while (
    index >= 0 &&
    (/^!\[/.test(lines[index]) ||
      /^(-{3,}|\*{3,}|_{3,})$/.test(lines[index].trim()) ||
      /^\*\*Screenshot/.test(lines[index]) ||
      /^\*\*Diagram/.test(lines[index]))
  ) {
    index = skipBlank(lines, index - 1);
  }
  return index;
}

function collectDescription(lines, index) {
  const collected = [];
  while (index >= 0) {
    const line = lines[index];
    if (line.trim() === "") break;
    if (/^#{1,6} /.test(line) || line.startsWith("```") || /^\|/.test(line)) break;
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) break;
    if (/^!\[/.test(line) || /^<!--/.test(line)) break;
    collected.push(line);
    index -= 1;
  }
  return collected
    .reverse()
    .join(" ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function descriptionBefore(lines, fenceLineIndex) {
  const index = skipDecorations(lines, fenceLineIndex - 1);
  if (index < 0) return "";
  return collectDescription(lines, index);
}

/**
 * @param {string} source
 * @param {string} snippet
 * @returns {object | null}
 */
export function findSnippet(source, snippet) {
  const needle = snippet.trim();
  if (needle.length < 24) return null;
  const at = source.indexOf(needle);
  if (at === -1) return null;
  const startLine = source.slice(0, at).split("\n").length;
  const endLine = startLine + needle.split("\n").length - 1;
  return { startLine, endLine };
}

function walkMarkdown(dir, relBase, acc) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    const rel = path.posix.join(relBase, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "images") continue;
      walkMarkdown(abs, rel, acc);
    } else if (entry.name.endsWith(".md")) {
      acc.push(rel);
    }
  }
}

/** @param {string} [root] @returns {string[]} */
export function publishedMarkdownRelPaths(root = ROOT) {
  /** @type {string[]} */
  const files = [];
  for (const dir of PUBLISHED_DIRS) {
    walkMarkdown(path.join(root, dir), dir, files);
  }
  for (const name of ROOT_DOCS) {
    if (fs.existsSync(path.join(root, name))) files.push(name);
  }
  return files.sort();
}

function githubBlob(repoPath, startLine, endLine) {
  return `${REPO_URL}/blob/main/${repoPath.replace(/^\.\//, "")}#L${startLine}-L${endLine}`;
}

/**
 * @param {string} [root]
 * @returns {Map<string, object>}
 */
function loadCookbookApps(root = ROOT) {
  const sections = cookbookSectionHrefs();
  const base = PAGES_BASE.endsWith("/") ? PAGES_BASE.slice(0, -1) : PAGES_BASE;
  /** @type {ReturnType<typeof loadCookbookApps>} */
  const apps = new Map();
  if (!fs.existsSync(COOKBOOK_APPS_DIR)) return apps;
  for (const slug of fs.readdirSync(COOKBOOK_APPS_DIR).sort()) {
    const dir = path.join(COOKBOOK_APPS_DIR, slug);
    const manifestPath = path.join(dir, "app.manifest.json");
    if (!fs.existsSync(manifestPath)) continue;
    const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
    const jsPath = path.posix.join("cookbook/apps", slug, manifest.entry ?? "bundle.js");
    const elmPath = path.posix.join("cookbook/apps", slug, "src/Main.elm");
    const cookbookHref = sections.get(slug) ?? `${base}/cookbook/apps/${slug}/`;
    const docsPath = cookbookHref.startsWith(base)
      ? cookbookHref.slice(base.length) || "/"
      : cookbookHref;
    apps.set(slug, {
      slug,
      title: titleFor(slug),
      capabilities: manifest.capabilities ?? [],
      jsPath,
      elmPath,
      js: fs.existsSync(path.join(root, jsPath)) ? fs.readFileSync(path.join(root, jsPath), "utf8") : "",
      elm: fs.existsSync(path.join(root, elmPath))
        ? fs.readFileSync(path.join(root, elmPath), "utf8")
        : "",
      docsPath,
    });
  }
  return apps;
}

function editorSlugSet() {
  return new Set(editorSeeds().map((seed) => seed.slug));
}

function editorSlugFor(rel, apps, headings) {
  for (const hint of EDITOR_HINTS) {
    if (rel.startsWith(hint.prefix)) return hint.slug;
  }
  const fromPath = rel.match(/^cookbook\/apps\/([^/]+)\//);
  if (fromPath !== null && apps.has(fromPath[1])) return fromPath[1];
  for (const heading of [headings.h2, headings.h3, headings.h1]) {
    if (heading === "") continue;
    const slug = headingSlug(heading);
    if (apps.has(slug)) return slug;
  }
  return null;
}

function githubForFence(rel, fence, app) {
  if (app !== null) {
    const source =
      fence.language === "elm" ? { text: app.elm, path: app.elmPath } : { text: app.js, path: app.jsPath };
    const hit = source.text === "" ? null : findSnippet(source.text, fence.body);
    if (hit !== null) return githubBlob(source.path, hit.startLine, hit.endLine);
  }
  return githubBlob(rel, fence.startLine, fence.endLine);
}

function usefulDescription(text) {
  const trimmed = text.trim();
  if (trimmed.length < 12 || /^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) return "";
  return trimmed;
}

function sampleName(headings, lang, app) {
  const label = languageLabel(lang);
  if (app !== null) return `${app.title} (${label})`;
  const heading = ["JavaScript", "Guida", "The interesting part"].includes(headings.h3)
    ? headings.h2 || headings.h1
    : headings.h3 || headings.h2 || headings.h1;
  return heading === "" ? label : `${heading} (${label})`;
}

function chapterLabel(rel, headings) {
  const title = headings.h1 || path.posix.basename(rel, ".md");
  if (headings.h2 !== "" && headings.h2 !== title) return `${title} · ${headings.h2}`;
  return title;
}

function docsHref(rel, headings, app) {
  if (app !== null) return app.docsPath;
  const page = sitePathFor(rel);
  const heading = headings.h2 || headings.h3;
  return heading === "" ? page : `${page}#${headingSlug(heading)}`;
}

function searchText(row) {
  return [
    row.name,
    row.description,
    row.language,
    row.chapter,
    row.capabilities.join(" "),
    row.sourcePath,
    row.id,
  ]
    .join(" ")
    .toLowerCase();
}

/**
 * @param {string} [root]
 */
function catalogRowForFence(rel, text, lines, fence, apps, editors) {
  const headings = headingsBefore(lines, fence.startLine - 1);
  const slug = editorSlugFor(rel, apps, headings);
  const app = slug !== null && apps.has(slug) ? apps.get(slug) : null;
  const editorSlug = slug !== null && editors.has(slug) ? slug : null;
  const description =
    usefulDescription(descriptionBefore(lines, fence.startLine - 1)) ||
    `${chapterLabel(rel, headings)} code listing.`;
  const row = {
    id: `${rel}:${fence.startLine}`,
    name: sampleName(headings, fence.language, app ?? null),
    description:
      description.length > 280
        ? `${description.slice(0, 277).trim()}…`
        : description,
    language: languageLabel(fence.language),
    chapter: chapterLabel(rel, headings),
    capabilities: app?.capabilities ?? [],
    githubHref: githubForFence(rel, fence, app ?? null),
    docsHref: docsHref(rel, headings, app ?? null),
    rnwHref:
      app !== null
        ? `/react-native-web/?app=${encodeURIComponent(app.slug)}`
        : null,
    editorHref:
      editorSlug !== null
        ? `/editor/?app=${encodeURIComponent(editorSlug)}`
        : null,
    sourcePath: rel,
  };
  return { ...row, searchText: searchText(row) };
}

function uniquifyCatalogNames(rows) {
  const seen = new Map();
  for (const row of rows) {
    const key = /** @type {string} */ (row.name);
    const count = (seen.get(key) ?? 0) + 1;
    seen.set(key, count);
    if (count > 1) row.name = `${key} — ${count}`;
    row.searchText = searchText(row);
  }
}

export function buildSampleCatalog(root = ROOT) {
  const apps = loadCookbookApps(root);
  const editors = editorSlugSet();
  /** @type {Record<string, unknown>[]} */
  const rows = [];
  for (const rel of publishedMarkdownRelPaths(root)) {
    const text = fs.readFileSync(path.join(root, rel), "utf8");
    const lines = text.split("\n");
    for (const fence of extractFences(text)) {
      rows.push(catalogRowForFence(rel, text, lines, fence, apps, editors));
    }
  }
  uniquifyCatalogNames(rows);
  rows.sort((left, right) =>
    String(left.name).localeCompare(String(right.name)),
  );
  return rows;
}

const PAGE_INTRO = `# Sample catalog

Every fenced code listing in the published documentation, with incremental search.
Source links open the listing (or the matching sample-app file) on GitHub. Live and
editor columns are filled when the listing belongs to a cookbook sample or an
authoring-guide hello project; otherwise they are marked unavailable.

<script setup>
import catalog from "./catalog.json";
</script>

<SampleCatalog :rows="catalog" />
`;

/**
 * @param {string} [siteSrc]
 * @param {string} [root]
 */
export function writeSamplePages(siteSrc = SITE_SRC, root = ROOT) {
  const rows = buildSampleCatalog(root);
  const dir = path.join(siteSrc, "samples");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "catalog.json"), `${JSON.stringify(rows)}\n`);
  fs.writeFileSync(path.join(dir, "index.md"), PAGE_INTRO);
  return rows;
}

function main() {
  const rows = writeSamplePages();
  console.log(`Wrote ${rows.length} sample-catalog rows`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
