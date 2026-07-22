#!/usr/bin/env node
/**
 * Full site build: stage → reports render → sidebar → typedoc copy → vitepress → link check.
 *
 * Env:
 *   SITE_SKIP_REPORTS=1  — reuse existing site-results (or placeholder)
 *   SITE_SKIP_TYPEDOC=1  — skip typedoc generation
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { ROOT, SITE_ROOT, SITE_SRC, RESULTS_DIR } from "./paths.mjs";

function run(command, args, opts = {}) {
  console.log(`$ ${command} ${args.join(" ")}`);
  const r = spawnSync(command, args, {
    cwd: ROOT,
    encoding: "utf8",
    stdio: "inherit",
    ...opts
  });
  if ((r.status ?? 1) !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function copyTree(src, dest) {
  if (!fs.existsSync(src)) return;
  ensureDir(dest);
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const from = path.join(src, entry.name);
    const to = path.join(dest, entry.name);
    if (entry.isDirectory()) copyTree(from, to);
    else {
      ensureDir(path.dirname(to));
      fs.copyFileSync(from, to);
    }
  }
}

function main() {
  // 1. Stage docs/specs
  run("node", ["scripts/site/stage.mjs"]);

  // 2. Render reports (expects site-results from run-reports, or placeholder)
  if (!fs.existsSync(path.join(RESULTS_DIR, "summary.json"))) {
    console.warn("No site-results/summary.json — rendering placeholder results page");
  }
  run("node", ["scripts/site/render-reports.mjs"]);

  // 3. Sidebar
  run("node", ["scripts/site/gen-sidebar.mjs"]);

  // 4. TypeDoc → site/public/typedoc (served at /twistedpear/typedoc/ and linked from /api/)
  const publicDir = path.join(SITE_ROOT, "public");
  ensureDir(publicDir);

  if (process.env.SITE_SKIP_TYPEDOC !== "1") {
    run("npm", ["run", "docs:reticulum-ts"]);
  }
  const typedocOut = path.join(ROOT, "packages/reticulum-ts/docs/api");
  const typedocDest = path.join(publicDir, "typedoc");
  fs.rmSync(typedocDest, { recursive: true, force: true });
  if (fs.existsSync(typedocOut)) {
    copyTree(typedocOut, typedocDest);
    console.log(`Copied TypeDoc → ${typedocDest}`);
  } else {
    console.warn("TypeDoc output missing; API pages will be incomplete");
    ensureDir(typedocDest);
    fs.writeFileSync(
      path.join(typedocDest, "index.html"),
      "<!doctype html><title>API</title><p>TypeDoc output was not generated.</p>"
    );
  }

  // Copy standalone HTML docs that VitePress may not process as pages into public
  const simHtml = path.join(SITE_SRC, "docs", "simulation-architecture.html");
  if (fs.existsSync(simHtml)) {
    ensureDir(path.join(publicDir, "docs"));
    fs.copyFileSync(simHtml, path.join(publicDir, "docs", "simulation-architecture.html"));
  }

  // Copy docs images into public for HTML pages / absolute refs
  const imagesSrc = path.join(SITE_SRC, "docs", "images");
  if (fs.existsSync(imagesSrc)) {
    copyTree(imagesSrc, path.join(publicDir, "docs", "images"));
  }

  // Guide screenshots (user guide, authoring guide): real captures where supplied,
  // placeholders otherwise
  run("node", ["scripts/site/section-images.mjs"]);

  // Standalone React Native Web implementations linked from every cookbook recipe.
  run("node", ["scripts/site/build-react-native-web-samples.mjs"]);

  // 5. VitePress build
  run("npx", ["vitepress", "build", "site"]);

  // 6. Ensure public assets land in dist (TypeDoc, standalone HTML, images)
  const dist = path.join(SITE_ROOT, ".vitepress", "dist");
  if (fs.existsSync(publicDir)) {
    copyTree(publicDir, dist);
    console.log(`Merged public/ into ${dist}`);
  }
  fs.writeFileSync(path.join(dist, ".nojekyll"), "");

  // Also copy results raw artifacts into dist for download links
  const rawSrc = path.join(SITE_SRC, "results", "raw");
  if (fs.existsSync(rawSrc)) {
    copyTree(rawSrc, path.join(dist, "results", "raw"));
  }

  // 7. Link validation on staged markdown
  try {
    run("node", ["scripts/site/validate-links.mjs"]);
  } catch (err) {
    console.warn(String(err));
    console.warn("Continuing despite link validation warnings");
  }

  console.log("Site build complete");
}

main();
