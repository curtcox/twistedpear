/**
 * Hello-world Guida sources plus vendored TwistedPear modules, as a file map.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../..");
const helloDir = join(repoRoot, "packages/guida-twistedpear/templates/hello");
const vendorDir = join(repoRoot, "packages/guida-twistedpear/elm");

function walkFiles(root, prefix = "") {
  /** @type {Array<{ path: string, content: string }>} */
  const files = [];
  for (const name of readdirSync(root).sort()) {
    const full = join(root, name);
    const rel = prefix === "" ? name : `${prefix}/${name}`;
    if (statSync(full).isDirectory()) {
      files.push(...walkFiles(full, rel));
    } else {
      files.push({ path: rel, content: readFileSync(full, "utf8") });
    }
  }
  return files;
}

export function collectHelloFiles() {
  const elmJson = JSON.parse(readFileSync(join(helloDir, "elm.json"), "utf8"));
  elmJson["source-directories"] = ["src", "guida-vendor"];
  const files = [
    { path: "elm.json", content: `${JSON.stringify(elmJson, null, 4)}\n` },
    {
      path: "src/Main.elm",
      content: readFileSync(join(helloDir, "src/Main.elm"), "utf8"),
    },
  ];
  for (const file of walkFiles(vendorDir)) {
    files.push({
      path: `guida-vendor/${file.path}`,
      content: file.content,
    });
  }
  return files;
}

export function collectCookbookMeasureFiles(slug) {
  const appDir = join(repoRoot, "cookbook/apps", slug);
  const elmJson = JSON.parse(readFileSync(join(appDir, "elm.json"), "utf8"));
  elmJson["source-directories"] = ["src", "guida-vendor"];
  const files = [
    { path: "elm.json", content: `${JSON.stringify(elmJson, null, 4)}\n` },
    {
      path: "src/Main.elm",
      content: readFileSync(join(appDir, "src/Main.elm"), "utf8"),
    },
  ];
  for (const file of walkFiles(vendorDir)) {
    files.push({
      path: `guida-vendor/${file.path}`,
      content: file.content,
    });
  }
  return files;
}
