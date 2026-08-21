#!/usr/bin/env node
/**
 * Verify the GitHub Pages site: every referenced capture is a real image (or an
 * allowlisted pending hatch), published bytes match the source, rendered pages
 * exist, and internal links resolve. `--require-dist` also checks the VitePress
 * output that actually deploys.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ROOT, SITE_DIST, SITE_ROOT, RESULTS_DIR, PAGES_BASE } from "./paths.mjs";
import { findBrokenSiteLinks } from "./validate-links.mjs";
import { summarizeStaticAnalysis } from "./static-analysis-metrics.mjs";
import { gateById } from "../checks/registry.mjs";
import {
  SECTIONS,
  isPendingCapture,
  isPlaceholderPng,
  publicImagesDir,
  referencedImages,
  sectionDir,
  sectionImagesDir,
  surveySection
} from "./section-images.mjs";

const ARTIFACT = path.join(ROOT, "artifacts", "site-pages.json");
const IMG_REF = /(?:src|href)="([^"]+\.(?:png|svg|jpe?g|gif|webp))"/gi;

function distImagesDir(id) {
  return path.join(SITE_DIST, id, "images");
}

function readIfFile(file) {
  return fs.existsSync(file) ? fs.readFileSync(file) : null;
}

function countMarkdownPages(id) {
  const dir = sectionDir(id);
  if (!fs.existsSync(dir)) return 0;
  return fs.readdirSync(dir).filter((name) => name.endsWith(".md")).length;
}

/**
 * @param {{ requireDist?: boolean }} options
 * @returns {{
 *   ok: boolean;
 *   problems: string[];
 *   pages: number;
 *   supplied: number;
 *   pending: number;
 *   placeholderLeaks: number;
 *   brokenLinks: number;
 *   distChecked: boolean;
 *   distImages: number;
 * }}
 */
export function inspectSite(options = {}) {
  const requireDist = Boolean(options.requireDist);
  /** @type {string[]} */
  const problems = [];
  let supplied = 0;
  let pending = 0;
  let placeholderLeaks = 0;
  let distImages = 0;
  let pages = 0;

  if (requireDist && !fs.existsSync(SITE_DIST)) {
    problems.push("site/.vitepress/dist is missing; run npm run site:build");
  }

  const requiredPublicPages = [
    "react-native-web/index.html",
    "editor/index.html",
    "editor/app.js",
    "editor/guida-worker.js",
  ];
  for (const rel of requiredPublicPages) {
    const published = path.join(SITE_ROOT, "public", rel);
    if (!fs.existsSync(published)) {
      problems.push(`missing public page ${rel}`);
    }
    if (requireDist && fs.existsSync(SITE_DIST)) {
      const distFile = path.join(SITE_DIST, rel);
      if (!fs.existsSync(distFile)) {
        problems.push(`dist missing /${rel}`);
      }
    }
  }

  if (!fs.existsSync(path.join(SITE_SRC, "samples/index.md"))) {
    problems.push("samples catalog page missing; run npm run site:stage");
  }
  if (!fs.existsSync(path.join(SITE_SRC, "samples/catalog.json"))) {
    problems.push("samples catalog data missing; run npm run site:stage");
  }
  if (requireDist && fs.existsSync(SITE_DIST) && !fs.existsSync(path.join(SITE_DIST, "samples/index.html"))) {
    problems.push("dist missing /samples/");
  }

  for (const { id, label } of SECTIONS) {
    const dir = sectionDir(id);
    if (!fs.existsSync(dir)) {
      problems.push(`${id}/ is missing`);
      continue;
    }
    const sources = fs
      .readdirSync(dir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name);
    pages += sources.length;
    if (sources.length === 0) problems.push(`${id}/ contains no markdown`);

    for (const name of sources) {
      const stem = name.replace(/\.md$/, "");
      const rendered =
        stem === "README"
          ? path.join(SITE_DIST, id, "index.html")
          : path.join(SITE_DIST, id, `${stem}.html`);
      if (requireDist && fs.existsSync(SITE_DIST) && !fs.existsSync(rendered)) {
        problems.push(`${label}: ${name} did not render (${path.relative(ROOT, rendered)})`);
      }
    }

    const { names } = surveySection(id);
    for (const name of names) {
      const srcPath = path.join(sectionImagesDir(id), name);
      const pubPath = path.join(publicImagesDir(id), name);
      const distPath = path.join(distImagesDir(id), name);
      const src = readIfFile(srcPath);
      const published = readIfFile(pubPath);
      const dist = readIfFile(distPath);
      const pendingName = isPendingCapture(id, name);

      if (!src) {
        if (!pendingName) {
          problems.push(`missing capture ${id}/images/${name}`);
        } else pending += 1;
        if (published && !pendingName && isPlaceholderPng(published)) {
          problems.push(`placeholder published for ${id}/images/${name}`);
          placeholderLeaks += 1;
        }
        if (pendingName && !published) {
          problems.push(`pending capture ${id}/images/${name} was not published`);
        }
        if (requireDist && fs.existsSync(SITE_DIST)) {
          if (!dist) problems.push(`dist missing /${id}/images/${name}`);
          else if (!pendingName && isPlaceholderPng(dist)) {
            problems.push(`placeholder deployed for ${id}/images/${name}`);
            placeholderLeaks += 1;
          } else distImages += 1;
        }
        continue;
      }

      supplied += 1;
      if (pendingName) {
        problems.push(`PENDING_CAPTURES still lists supplied ${id}/images/${name}`);
      }
      if (isPlaceholderPng(src)) {
        problems.push(`committed placeholder ${id}/images/${name}`);
        placeholderLeaks += 1;
      }
      if (!published) problems.push(`not published ${id}/images/${name}`);
      else if (isPlaceholderPng(published)) {
        problems.push(`placeholder published for supplied ${id}/images/${name}`);
        placeholderLeaks += 1;
      } else if (!src.equals(published)) {
        problems.push(`public copy differs from source ${id}/images/${name}`);
      }
      if (requireDist && fs.existsSync(SITE_DIST)) {
        if (!dist) problems.push(`dist missing /${id}/images/${name}`);
        else if (isPlaceholderPng(dist)) {
          problems.push(`placeholder deployed for supplied ${id}/images/${name}`);
          placeholderLeaks += 1;
        } else if (!src.equals(dist)) {
          problems.push(`dist copy differs from source ${id}/images/${name}`);
        } else distImages += 1;
      }
    }
  }

  if (requireDist && fs.existsSync(SITE_DIST)) {
    problems.push(...inspectDistHtmlImages());
  }

  const links = fs.existsSync(path.join(SITE_ROOT, "src"))
    ? findBrokenSiteLinks()
    : { files: 0, broken: ["site/src is missing; run npm run site:stage"] };

  const result = {
    ok: problems.length === 0 && links.broken.length === 0,
    problems: [...problems, ...links.broken.map((item) => `link ${item}`)],
    pages,
    supplied,
    pending,
    placeholderLeaks,
    brokenLinks: links.broken.length,
    distChecked: requireDist && fs.existsSync(SITE_DIST),
    distImages,
    referenced: SECTIONS.reduce((sum, section) => sum + referencedImages(section.id).length, 0),
    markdownPages: SECTIONS.reduce((sum, section) => sum + countMarkdownPages(section.id), 0)
  };
  return result;
}

function inspectDistHtmlImages() {
  /** @type {string[]} */
  const problems = [];
  /** @type {string[]} */
  const files = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "typedoc" || entry.name === "raw") continue;
        walk(abs);
      } else if (entry.name.endsWith(".html")) files.push(abs);
    }
  }
  walk(SITE_DIST);
  for (const file of files) {
    const html = fs.readFileSync(file, "utf8");
    IMG_REF.lastIndex = 0;
    let match;
    while ((match = IMG_REF.exec(html))) {
      const href = match[1].split("#")[0].split("?")[0];
      if (/^https?:/i.test(href) || href.startsWith("data:")) continue;
      if (!/\/(guide|authors|cookbook|docs)\/images\//.test(href)) continue;
      const stripped = href.startsWith(PAGES_BASE)
        ? href.slice(PAGES_BASE.length)
        : href.replace(/^\//, "");
      const resolved = href.startsWith("/") || href.startsWith(PAGES_BASE)
        ? path.normalize(path.join(SITE_DIST, stripped))
        : path.normalize(path.join(path.dirname(file), href));
      if (!resolved.startsWith(SITE_DIST)) continue;
      if (!fs.existsSync(resolved)) {
        problems.push(`${path.relative(SITE_DIST, file)}: missing ${href}`);
      }
    }
  }
  return problems;
}

export function writeSitePagesArtifact(result) {
  fs.mkdirSync(path.dirname(ARTIFACT), { recursive: true });
  const payload = {
    ok: result.ok,
    pages: result.pages,
    supplied: result.supplied,
    pending: result.pending,
    placeholderLeaks: result.placeholderLeaks,
    brokenLinks: result.brokenLinks,
    distChecked: result.distChecked,
    distImages: result.distImages,
    problems: result.problems
  };
  fs.writeFileSync(ARTIFACT, `${JSON.stringify(payload, null, 2)}\n`);
  return ARTIFACT;
}

function recordIntoSummary(result) {
  const summaryPath = path.join(RESULTS_DIR, "summary.json");
  if (!fs.existsSync(summaryPath)) return;
  const dest = path.join(RESULTS_DIR, "artifacts", "site-pages.json");
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(ARTIFACT, dest);
  const summary = JSON.parse(fs.readFileSync(summaryPath, "utf8"));
  const job = (summary.jobs ?? []).find((entry) => entry.id === "site-pages");
  const gate = gateById("site-pages");
  if (job && gate) {
    job.ok = result.ok;
    job.exitCode = result.ok ? 0 : 1;
    job.finishedAt = new Date().toISOString();
    job.metrics = summarizeStaticAnalysis(gate, path.join(RESULTS_DIR, "artifacts"), job);
  }
  summary.ok = (summary.jobs ?? []).every((entry) => entry.ok);
  summary.failed = (summary.jobs ?? []).filter((entry) => !entry.ok).map((entry) => entry.id);
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
  spawnSync(process.execPath, ["scripts/site/render-reports.mjs"], {
    cwd: ROOT,
    stdio: "inherit"
  });
}

function run(script) {
  const result = spawnSync(process.execPath, [script], { cwd: ROOT, stdio: "inherit" });
  if ((result.status ?? 1) !== 0) {
    throw new Error(`${script} failed`);
  }
}

function main() {
  const requireDist = process.argv.includes("--require-dist");
  const record = process.argv.includes("--record");
  if (!requireDist) {
    run("scripts/site/stage.mjs");
    run("scripts/site/section-images.mjs");
    // Cookbook and sample-catalog pages link at /react-native-web/ and /editor/;
    // those are esbuild outputs, not staged markdown, so verify has to build them.
    run("scripts/site/build-react-native-web-samples.mjs");
    run("scripts/site/build-editor.mjs");
  }
  const result = inspectSite({ requireDist });
  writeSitePagesArtifact(result);
  if (record) recordIntoSummary(result);
  if (result.problems.length) {
    console.error(`GitHub Pages site integrity failed (${result.problems.length}):`);
    for (const problem of result.problems.slice(0, 80)) console.error(`  - ${problem}`);
    if (result.problems.length > 80) {
      console.error(`  … and ${result.problems.length - 80} more`);
    }
    process.exit(1);
  }
  console.log(
    `GitHub Pages site integrity ok — ${result.pages} pages, ${result.supplied} images, ${result.pending} pending captures` +
      (result.distChecked ? `, ${result.distImages} dist images` : "")
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main();
}
