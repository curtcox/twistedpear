#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { ROOT } from "./paths.mjs";
import { cookbookEditorSeeds } from "./cookbook-fixtures.mjs";

const HELLO_JS = `import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    style: { padding: 16, gap: 12 },
    children: [
      { id: "title", type: "text", props: { value: "Hello from DevStudio" }, style: { fontSize: 20, fontWeight: "bold" } },
      { id: "body", type: "text", props: { value: "This app was built inside a mini-app." } }
    ]
  }
});
`;

function helloJsSeed() {
  const appJson = JSON.stringify(
    { name: "hello-app", version: "0.1.0", entry: "bundle.js", capabilities: [] },
    null,
    2,
  );
  return {
    slug: "hello",
    title: "JavaScript hello",
    project: "hello-app",
    files: {
      "hello-app/app.json": `${appJson}\n`,
      "hello-app/bundle.js": HELLO_JS,
    },
  };
}

function helloGuidaSeed() {
  const dir = path.join(ROOT, "packages/guida-twistedpear/templates/hello");
  const manifest = JSON.parse(
    fs.readFileSync(path.join(dir, "app.manifest.json"), "utf8"),
  );
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
  return {
    slug: "hello-guida",
    title: "Guida hello",
    project: "hello-guida",
    files: {
      "hello-guida/app.json": `${appJson}\n`,
      "hello-guida/elm.json": fs.readFileSync(path.join(dir, "elm.json"), "utf8"),
      "hello-guida/src/Main.elm": fs.readFileSync(
        path.join(dir, "src/Main.elm"),
        "utf8",
      ),
    },
  };
}

export function editorSeeds() {
  return [helloJsSeed(), helloGuidaSeed(), ...cookbookEditorSeeds()];
}

export function readDevstudioBundle() {
  return fs.readFileSync(path.join(ROOT, "apps/devstudio/bundle.js"), "utf8");
}

export function readDevstudioManifest() {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, "apps/devstudio/app.manifest.json"), "utf8"),
  );
}
