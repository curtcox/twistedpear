#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { PAGES_BASE, ROOT, SITE_ROOT } from "./paths.mjs";

const sourceDir = path.join(ROOT, "scripts/site/react-native-web-samples");
const cookbookDir = path.join(ROOT, "cookbook");
const appsDir = path.join(cookbookDir, "apps");
const outputDir = path.join(SITE_ROOT, "public/react-native-web");

function titleFor(slug) {
  return slug.replace(/(^|-)([a-z])/g, (_match, separator, letter) => `${separator ? " " : ""}${letter.toUpperCase()}`);
}

function headingSlug(title) {
  return title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/** Map each sample slug to its chapter section on the deployed VitePress site. */
function cookbookSectionHrefs() {
  const base = PAGES_BASE.endsWith("/") ? PAGES_BASE.slice(0, -1) : PAGES_BASE;
  const hrefs = new Map();
  for (const name of fs.readdirSync(cookbookDir)) {
    if (!/^\d{2}-.+\.md$/.test(name)) continue;
    const chapter = name.replace(/\.md$/, "");
    const text = fs.readFileSync(path.join(cookbookDir, name), "utf8");
    for (const match of text.matchAll(/^## ([^\n]+)$/gm)) {
      const slug = headingSlug(match[1]);
      if (!fs.existsSync(path.join(appsDir, slug, "app.manifest.json"))) continue;
      hrefs.set(slug, `${base}/cookbook/${chapter}#${slug}`);
    }
  }
  return hrefs;
}

function fixtures() {
  const sections = cookbookSectionHrefs();
  const list = fs.readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const dir = path.join(appsDir, slug);
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, "app.manifest.json"), "utf8"));
      const cookbookHref = sections.get(slug);
      if (cookbookHref === undefined) {
        throw new Error(`no cookbook chapter section found for sample app ${slug}`);
      }
      return {
        slug,
        title: titleFor(slug),
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities ?? [],
        publisherPublicKey: manifest.publisherPublicKey || "cookbook-pages-demo",
        cookbookHref,
        bundle: fs.readFileSync(path.join(dir, manifest.entry), "utf8")
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
  if (list.length !== 25) {
    throw new Error(`expected 25 cookbook fixtures, found ${list.length}`);
  }
  return list;
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, "index.html"), path.join(outputDir, "index.html"));

await build({
  entryPoints: [path.join(sourceDir, "entry.tsx")],
  outfile: path.join(outputDir, "app.js"),
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  alias: { "react-native": "react-native-web" },
  plugins: [{
    name: "cookbook-fixtures",
    setup(buildApi) {
      buildApi.onResolve({ filter: /^virtual:cookbook-fixtures$/ }, () => ({
        path: "cookbook-fixtures",
        namespace: "cookbook"
      }));
      buildApi.onLoad({ filter: /.*/, namespace: "cookbook" }, () => ({
        contents: `export const COOKBOOK_FIXTURES = ${JSON.stringify(fixtures())};`,
        loader: "js"
      }));
    }
  }]
});

console.log(`Built 25 React Native Web cookbook samples into ${outputDir}`);
