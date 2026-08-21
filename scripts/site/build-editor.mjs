#!/usr/bin/env node
/**
 * Build `/editor/` — DevStudio in the page, Guida compiler in a worker.
 *
 * Guards: the main chunk must not contain `compileGuidaMemory`, and both
 * chunks must stay under the recorded byte budgets.
 */
import fs from "node:fs";
import path from "node:path";
import { build } from "esbuild";
import { ROOT, SITE_ROOT } from "./paths.mjs";
import { editorSeeds, readDevstudioBundle, readDevstudioManifest } from "./editor-seeds.mjs";

const sourceDir = path.join(ROOT, "scripts/site/editor");
const outputDir = path.join(SITE_ROOT, "public/editor");
const MAIN_BUDGET = 3_200_000;
const WORKER_BUDGET = 2_200_000;

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.copyFileSync(path.join(sourceDir, "index.html"), path.join(outputDir, "index.html"));

const seeds = editorSeeds();
const assets = {
  EDITOR_SEEDS: seeds,
  DEVSTUDIO_BUNDLE: readDevstudioBundle(),
  DEVSTUDIO_MANIFEST: readDevstudioManifest(),
};

const common = {
  bundle: true,
  format: "esm",
  platform: "browser",
  target: ["es2022"],
  sourcemap: true,
  alias: { "react-native": "react-native-web" },
};

await build({
  ...common,
  entryPoints: [path.join(sourceDir, "entry.tsx")],
  outfile: path.join(outputDir, "app.js"),
  plugins: [
    {
      name: "editor-assets",
      setup(buildApi) {
        buildApi.onResolve({ filter: /^virtual:editor-assets$/ }, () => ({
          path: "editor-assets",
          namespace: "editor",
        }));
        buildApi.onLoad({ filter: /.*/, namespace: "editor" }, () => ({
          contents: `export const EDITOR_SEEDS = ${JSON.stringify(assets.EDITOR_SEEDS)};
export const DEVSTUDIO_BUNDLE = ${JSON.stringify(assets.DEVSTUDIO_BUNDLE)};
export const DEVSTUDIO_MANIFEST = ${JSON.stringify(assets.DEVSTUDIO_MANIFEST)};`,
          loader: "js",
        }));
      },
    },
  ],
});

await build({
  ...common,
  entryPoints: [path.join(sourceDir, "guida-worker.ts")],
  outfile: path.join(outputDir, "guida-worker.js"),
});

const mainSource = fs.readFileSync(path.join(outputDir, "app.js"), "utf8");
if (mainSource.includes("compileGuidaMemory")) {
  throw new Error(
    "editor main chunk contains compileGuidaMemory — the Guida compiler leaked out of the worker",
  );
}

const mainBytes = fs.statSync(path.join(outputDir, "app.js")).size;
const workerBytes = fs.statSync(path.join(outputDir, "guida-worker.js")).size;
if (mainBytes > MAIN_BUDGET) {
  throw new Error(`editor main chunk ${mainBytes} bytes exceeds budget ${MAIN_BUDGET}`);
}
if (workerBytes > WORKER_BUDGET) {
  throw new Error(
    `editor Guida worker ${workerBytes} bytes exceeds budget ${WORKER_BUDGET}`,
  );
}

console.log(
  `Built editor (${seeds.length} seeds) into ${outputDir} — main ${mainBytes} B, worker ${workerBytes} B`,
);
