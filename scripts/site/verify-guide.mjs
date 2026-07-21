#!/usr/bin/env node
/**
 * Fail the Pages build if the end-user guide did not make it into the deployed site.
 *
 * The guide is the one part of the site aimed at people who are not reading the repo, so a
 * silent staging or routing regression that drops it should stop the deploy rather than
 * publish a site with a dead Guide tab.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_ROOT, SITE_DIST } from "./paths.mjs";
import { referencedImages } from "./guide-images.mjs";

const GUIDE_DIR = path.join(ROOT, "guide");

/** @param {string[]} problems */
function report(problems) {
  if (problems.length === 0) return;
  console.error("User guide verification failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

function main() {
  /** @type {string[]} */
  const problems = [];

  const sources = fs
    .readdirSync(GUIDE_DIR, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name);

  if (sources.length === 0) problems.push("guide/ contains no markdown");

  // Every source chapter must have a rendered HTML page.
  for (const name of sources) {
    const stem = name.replace(/\.md$/, "");
    const rendered =
      stem === "README"
        ? path.join(SITE_DIST, "guide", "index.html")
        : path.join(SITE_DIST, "guide", `${stem}.html`);
    if (!fs.existsSync(rendered)) {
      problems.push(`guide/${name} did not render (expected ${path.relative(ROOT, rendered)})`);
    }
  }

  // Every referenced screenshot must resolve to a file, real or placeholder.
  const publicImages = path.join(SITE_ROOT, "public", "guide", "images");
  for (const image of referencedImages()) {
    if (!fs.existsSync(path.join(publicImages, image))) {
      problems.push(`screenshot /guide/images/${image} is referenced but not published`);
    }
  }

  // The Guide entry must be reachable from the generated navigation.
  const sidebarFile = path.join(SITE_ROOT, "src", ".sidebar.json");
  if (!fs.existsSync(sidebarFile)) {
    problems.push("site/src/.sidebar.json is missing");
  } else {
    const sidebar = JSON.parse(fs.readFileSync(sidebarFile, "utf8"));
    const items = sidebar.guide?.[0]?.items ?? [];
    if (items.length < sources.length) {
      problems.push(
        `guide sidebar has ${items.length} entries for ${sources.length} chapters`
      );
    }
  }

  report(problems);
  console.log(`User guide published: ${sources.length} pages, navigation present`);
}

main();
