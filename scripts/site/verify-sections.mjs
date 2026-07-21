#!/usr/bin/env node
/**
 * Fail the Pages build if a reader-facing guide section did not make it into the deployed site.
 *
 * The user guide and the app authoring guide are the parts of the site aimed at people who are
 * not reading the repository, so a silent staging or routing regression that drops one should
 * stop the deploy rather than publish a site with a dead nav tab.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_ROOT, SITE_DIST } from "./paths.mjs";
import { SECTIONS, referencedImages, publicImagesDir, sectionDir } from "./section-images.mjs";

/** @param {string[]} problems */
function report(problems) {
  if (problems.length === 0) return;
  console.error("Guide section verification failed:");
  for (const problem of problems) console.error(`  - ${problem}`);
  process.exit(1);
}

/**
 * @param {{ id: string; label: string }} section
 * @param {string[]} problems
 */
function verifySection(section, problems) {
  const { id, label } = section;
  const dir = sectionDir(id);

  if (!fs.existsSync(dir)) {
    problems.push(`${id}/ is missing`);
    return;
  }

  const sources = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md"))
    .map((e) => e.name);

  if (sources.length === 0) problems.push(`${id}/ contains no markdown`);

  // Every source chapter must have a rendered HTML page.
  for (const name of sources) {
    const stem = name.replace(/\.md$/, "");
    const rendered =
      stem === "README"
        ? path.join(SITE_DIST, id, "index.html")
        : path.join(SITE_DIST, id, `${stem}.html`);
    if (!fs.existsSync(rendered)) {
      problems.push(`${id}/${name} did not render (expected ${path.relative(ROOT, rendered)})`);
    }
  }

  // Every referenced screenshot must resolve to a file, real or placeholder.
  const images = publicImagesDir(id);
  for (const image of referencedImages(id)) {
    if (!fs.existsSync(path.join(images, image))) {
      problems.push(`screenshot /${id}/images/${image} is referenced but not published`);
    }
  }

  // The section must be reachable from the generated navigation.
  const sidebarFile = path.join(SITE_ROOT, "src", ".sidebar.json");
  if (!fs.existsSync(sidebarFile)) {
    problems.push("site/src/.sidebar.json is missing");
    return;
  }
  const sidebar = JSON.parse(fs.readFileSync(sidebarFile, "utf8"));
  const items = sidebar[id]?.[0]?.items ?? [];
  if (items.length < sources.length) {
    problems.push(`${label} sidebar has ${items.length} entries for ${sources.length} chapters`);
  }

  console.log(`${label} published: ${sources.length} pages, navigation present`);
}

function main() {
  /** @type {string[]} */
  const problems = [];
  for (const section of SECTIONS) verifySection(section, problems);
  report(problems);
}

main();
