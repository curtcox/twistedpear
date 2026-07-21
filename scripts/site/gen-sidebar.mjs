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
