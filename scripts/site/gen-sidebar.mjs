#!/usr/bin/env node
/**
 * Build navigation sidebars from staged docs/specs indexes and emit VitePress config helpers.
 */
import fs from "node:fs";
import path from "node:path";
import { SITE_SRC } from "./paths.mjs";

function listMarkdown(dir, baseUrl) {
  if (!fs.existsSync(dir)) return [];
  /** @type {{ text: string, link: string }[]} */
  const items = [];
  function walk(current, urlBase) {
    const entries = fs.readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    for (const entry of entries) {
      const abs = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(abs, `${urlBase}/${entry.name}`);
      } else if (entry.name.endsWith(".md")) {
        const stem = entry.name.replace(/\.md$/, "");
        const link =
          stem === "README" || stem === "index"
            ? `${urlBase}/`
            : `${urlBase}/${stem}`;
        const text =
          stem === "README" || stem === "index"
            ? "Index"
            : stem;
        items.push({ text, link });
      }
    }
  }
  walk(dir, baseUrl);
  return items;
}

/** First markdown H1, used as the sidebar label. */
function headingOf(file, fallback) {
  const match = fs.readFileSync(file, "utf8").match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : fallback;
}

/**
 * A guide section is a sequence, not an alphabetical set: numbered chapters first in
 * filename order, then the unnumbered back matter.
 *
 * @param {string} section directory name under site/src, also the site route
 * @param {string} label sidebar group heading
 */
function sectionSidebar(section, label) {
  const dir = path.join(SITE_SRC, section);
  if (!fs.existsSync(dir)) return [{ text: label, items: [] }];

  const files = fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "index.md")
    .map((e) => e.name)
    .sort((a, b) => {
      const numbered = (n) => /^\d/.test(n);
      if (numbered(a) !== numbered(b)) return numbered(a) ? -1 : 1;
      return a.localeCompare(b);
    });

  const items = [{ text: headingOf(path.join(dir, "index.md"), label), link: `/${section}/` }];
  for (const name of files) {
    const stem = name.replace(/\.md$/, "");
    items.push({ text: headingOf(path.join(dir, name), stem), link: `/${section}/${stem}` });
  }
  return [{ text: label, items }];
}

function docsSidebar() {
  const docsDir = path.join(SITE_SRC, "docs");
  const items = listMarkdown(docsDir, "/docs").filter(
    (i) => !i.link.includes("/images/")
  );
  // Prefer README first
  items.sort((a, b) => {
    if (a.link === "/docs/") return -1;
    if (b.link === "/docs/") return 1;
    return a.text.localeCompare(b.text);
  });
  return [
    {
      text: "Documentation",
      items
    }
  ];
}

function specsSidebar() {
  const specsDir = path.join(SITE_SRC, "specs");
  const items = [];
  if (!fs.existsSync(specsDir)) return [{ text: "Specifications", items: [] }];

  items.push({ text: "Index", link: "/specs/" });

  const entries = fs.readdirSync(specsDir, { withFileTypes: true }).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const specMd = path.join(specsDir, entry.name, "spec.md");
    if (fs.existsSync(specMd)) {
      items.push({ text: entry.name, link: `/specs/${entry.name}/spec` });
    }
    // media profiles
    if (entry.name === "spec-media") {
      for (const profile of fs.readdirSync(path.join(specsDir, "spec-media")).sort()) {
        if (!profile.endsWith(".md") || profile === "spec.md") continue;
        const stem = profile.replace(/\.md$/, "");
        items.push({
          text: `spec-media/${stem}`,
          link: `/specs/spec-media/${stem}`
        });
      }
    }
  }

  return [{ text: "Specifications", items }];
}

function referenceSidebar() {
  const refDir = path.join(SITE_SRC, "reference");
  const items = listMarkdown(refDir, "/reference");
  items.sort((a, b) => {
    if (a.link === "/reference/" || a.link.endsWith("/README")) return -1;
    if (b.link === "/reference/" || b.link.endsWith("/README")) return 1;
    return a.text.localeCompare(b.text);
  });
  return [{ text: "Reference", items }];
}

function resultsSidebar() {
  const resultsDir = path.join(SITE_SRC, "results");
  if (!fs.existsSync(resultsDir)) {
    return [{ text: "Quality results", items: [{ text: "Index", link: "/results/" }] }];
  }
  const items = [{ text: "Index", link: "/results/" }];
  for (const name of fs.readdirSync(resultsDir).sort()) {
    if (!name.endsWith(".md") || name === "index.md") continue;
    const stem = name.replace(/\.md$/, "");
    items.push({ text: stem, link: `/results/${stem}` });
  }
  return [{ text: "Quality results", items }];
}

function main() {
  const out = path.join(SITE_SRC, ".sidebar.json");
  const data = {
    guide: sectionSidebar("guide", "User guide"),
    authors: sectionSidebar("authors", "App authoring guide"),
    cookbook: sectionSidebar("cookbook", "Cookbook"),
    docs: docsSidebar(),
    specs: specsSidebar(),
    reference: referenceSidebar(),
    results: resultsSidebar()
  };
  ensureDirWrite(out, `${JSON.stringify(data, null, 2)}\n`);
  console.log(`Wrote ${out}`);
}

function ensureDirWrite(file, contents) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, contents);
}

main();
