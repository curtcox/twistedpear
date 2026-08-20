import {
  existsSync,
  readFileSync,
  readdirSync,
  statSync,
} from "node:fs";
import { join } from "node:path";
import type { PackageFile } from "@twistedpear/app-registry";
import { readBytes } from "../config.js";

const ALWAYS_IGNORE = [
  "guida-stuff/",
  "guida-vendor/",
  "elm-stuff/",
  ".git/",
  "node_modules/",
  ".tpignore",
];

const GUIDA_SOURCE_IGNORE = ["*.elm", "elm.json", "index.html"];

export function loadTpIgnore(appDir: string): ReadonlyArray<string> {
  const patterns = [...ALWAYS_IGNORE];
  if (existsSync(join(appDir, "elm.json"))) {
    patterns.push(...GUIDA_SOURCE_IGNORE);
  }
  const ignoreFile = join(appDir, ".tpignore");
  if (!existsSync(ignoreFile)) return patterns;
  for (const raw of readFileSync(ignoreFile, "utf8").split(/\r?\n/u)) {
    const line = raw.trim();
    if (line.length === 0 || line.startsWith("#")) continue;
    patterns.push(line);
  }
  return patterns;
}

export function pathIgnored(
  relativePath: string,
  patterns: ReadonlyArray<string>,
): boolean {
  const normalized = relativePath.split("\\").join("/");
  return patterns.some((pattern) => matchIgnore(normalized, pattern));
}

function matchIgnore(path: string, pattern: string): boolean {
  const directory = pattern.endsWith("/");
  const body = directory ? pattern.slice(0, -1) : pattern;
  if (directory) {
    return path === body || path.startsWith(`${body}/`);
  }
  if (body.startsWith("*.")) {
    const suffix = body.slice(1);
    return path.endsWith(suffix) || path.split("/").some((part) => part.endsWith(suffix));
  }
  return path === body || path.endsWith(`/${body}`);
}

export function collectAppFiles(appDir: string): PackageFile[] {
  const files: PackageFile[] = [];
  const patterns = loadTpIgnore(appDir);

  const walk = (relativeDir: string) => {
    const absolute = join(appDir, relativeDir);
    for (const entry of readdirSync(absolute)) {
      const rel = relativeDir === "." ? entry : join(relativeDir, entry);
      const normalized = rel.split("\\").join("/");
      if (pathIgnored(normalized, patterns)) continue;
      const full = join(appDir, rel);
      const stats = statSync(full);
      if (stats.isDirectory()) {
        walk(rel);
      } else if (entry !== "app.manifest.json") {
        files.push({
          path: normalized,
          content: readBytes(full),
        });
      }
    }
  };

  walk(".");
  return files.sort((left, right) => left.path.localeCompare(right.path));
}
