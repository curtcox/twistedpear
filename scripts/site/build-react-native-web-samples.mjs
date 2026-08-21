#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { ROOT, SITE_ROOT } from "./paths.mjs";
import { cookbookRnwFixtures } from "./cookbook-fixtures.mjs";

const sourceDir = path.join(ROOT, "scripts/site/react-native-web-samples");
const outputDir = path.join(SITE_ROOT, "public/react-native-web");

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, "index.html"), path.join(outputDir, "index.html"));

const fixtures = cookbookRnwFixtures();

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
        contents: `export const COOKBOOK_FIXTURES = ${JSON.stringify(fixtures)};`,
        loader: "js"
      }));
    }
  }]
});

console.log(`Built ${fixtures.length} React Native Web cookbook samples into ${outputDir}`);
