#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { ROOT, SITE_ROOT } from "./paths.mjs";

const sourceDir = path.join(ROOT, "scripts/site/react-native-web-samples");
const appsDir = path.join(ROOT, "cookbook/apps");
const outputDir = path.join(SITE_ROOT, "public/react-native-web");

function titleFor(slug) {
  return slug.replace(/(^|-)([a-z])/g, (_match, separator, letter) => `${separator ? " " : ""}${letter.toUpperCase()}`);
}

function fixtures() {
  return fs.readdirSync(appsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const slug = entry.name;
      const dir = path.join(appsDir, slug);
      const manifest = JSON.parse(fs.readFileSync(path.join(dir, "app.manifest.json"), "utf8"));
      return {
        slug,
        title: titleFor(slug),
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities ?? [],
        publisherPublicKey: manifest.publisherPublicKey || "cookbook-pages-demo",
        bundle: fs.readFileSync(path.join(dir, manifest.entry), "utf8")
      };
    })
    .sort((left, right) => left.title.localeCompare(right.title));
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
