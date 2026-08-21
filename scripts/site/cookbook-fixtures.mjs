#!/usr/bin/env node
/**
 * Shared cookbook-app reader for the React Native Web samples page and the
 * in-browser editor catalog.
 */
import fs from "node:fs";
import path from "node:path";
import { PAGES_BASE, ROOT } from "./paths.mjs";

export const COOKBOOK_DIR = path.join(ROOT, "cookbook");
export const COOKBOOK_APPS_DIR = path.join(COOKBOOK_DIR, "apps");

export function titleFor(slug) {
  return slug.replace(
    /(^|-)([a-z])/g,
    (_match, separator, letter) => `${separator ? " " : ""}${letter.toUpperCase()}`,
  );
}

export function headingSlug(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Map each sample slug to its chapter section on the deployed VitePress site. */
export function cookbookSectionHrefs() {
  const base = PAGES_BASE.endsWith("/") ? PAGES_BASE.slice(0, -1) : PAGES_BASE;
  const hrefs = new Map();
  for (const name of fs.readdirSync(COOKBOOK_DIR)) {
    if (!/^\d{2}-.+\.md$/.test(name)) continue;
    const chapter = name.replace(/\.md$/, "");
    const text = fs.readFileSync(path.join(COOKBOOK_DIR, name), "utf8");
    for (const match of text.matchAll(/^## ([^\n]+)$/gm)) {
      const slug = headingSlug(match[1]);
      if (!fs.existsSync(path.join(COOKBOOK_APPS_DIR, slug, "app.manifest.json"))) {
        continue;
      }
      hrefs.set(slug, `${base}/cookbook/${chapter}#${slug}`);
    }
  }
  return hrefs;
}

/** Read an app's `assets/*.svg` into a { name: svgSource } map the widget renderer resolves. */
export function readAssets(dir) {
  const assetsDir = path.join(dir, "assets");
  if (!fs.existsSync(assetsDir)) return {};
  const assets = {};
  for (const file of fs.readdirSync(assetsDir)) {
    if (!file.endsWith(".svg")) continue;
    assets[file.slice(0, -".svg".length)] = fs.readFileSync(
      path.join(assetsDir, file),
      "utf8",
    );
  }
  return assets;
}

function listCookbookAppDirs() {
  return fs
    .readdirSync(COOKBOOK_APPS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * Fixtures for `/react-native-web/`: compiled bundle plus the fields the
 * samples page needs to launch MiniappHost.
 */
export function cookbookRnwFixtures() {
  const sections = cookbookSectionHrefs();
  const list = listCookbookAppDirs().map((slug) => {
    const dir = path.join(COOKBOOK_APPS_DIR, slug);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "app.manifest.json"), "utf8"),
    );
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
      bundle: fs.readFileSync(path.join(dir, manifest.entry), "utf8"),
      assets: readAssets(dir),
    };
  });
  if (list.length === 0) throw new Error("no cookbook fixtures found");
  return list.sort((left, right) => left.title.localeCompare(right.title));
}

function collectWorkspaceFiles(dir, prefix = "") {
  /** @type {Record<string, string>} */
  const files = {};
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir).sort()) {
    if (name === "README.md" || name === "assets") continue;
    const full = path.join(dir, name);
    const rel = prefix === "" ? name : `${prefix}/${name}`;
    if (fs.statSync(full).isDirectory()) {
      Object.assign(files, collectWorkspaceFiles(full, rel));
    } else if (name.endsWith(".svg")) {
      continue;
    } else {
      files[rel] = fs.readFileSync(full, "utf8");
    }
  }
  return files;
}

/**
 * Workspace file maps the editor seeds into DevStudio. Cookbook apps keep
 * `app.json` (from the manifest) plus sources; `app.manifest.json` is omitted
 * so DevStudio's project layout matches a host workspace.
 */
export function cookbookEditorSeeds() {
  return listCookbookAppDirs().map((slug) => {
    const dir = path.join(COOKBOOK_APPS_DIR, slug);
    const manifest = JSON.parse(
      fs.readFileSync(path.join(dir, "app.manifest.json"), "utf8"),
    );
    const collected = collectWorkspaceFiles(dir);
    delete collected["app.manifest.json"];
    const appJson = JSON.stringify(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry ?? "bundle.js",
        capabilities: manifest.capabilities ?? [],
      },
      null,
      2,
    );
    /** @type {Record<string, string>} */
    const files = {};
    files[`${slug}/app.json`] = `${appJson}\n`;
    for (const [rel, content] of Object.entries(collected)) {
      files[`${slug}/${rel}`] = content;
    }
    return {
      slug,
      title: titleFor(slug),
      project: slug,
      files,
    };
  });
}
