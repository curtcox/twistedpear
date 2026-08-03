// @ts-nocheck
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/** Reads an entry together with its local source modules. */
export function readModuleSource(entryPath) {
  const seen = new Set();
  const parts = [];

  const visit = (path) => {
    if (seen.has(path)) return;
    seen.add(path);
    const source = readFileSync(path, "utf8");
    parts.push(source);
    for (const match of source.matchAll(/from "(\.\/[^\"]+\.(?:mjs|js))"/g)) {
      const requested = resolve(dirname(path), match[1]);
      const candidates = existsSync(requested)
        ? [requested]
        : [requested.replace(/\.js$/, ".ts"), requested.replace(/\.js$/, ".tsx")];
      const resolved = candidates.find((candidate) => existsSync(candidate));
      if (resolved !== undefined) visit(resolved);
    }
  };

  visit(entryPath);
  return parts.join("\n");
}

export const readWorkletSource = readModuleSource;

/** True when the source handles a host message type. */
export function handlesHostMessage(source, type) {
  return new RegExp(`message\\.type === "${type}"|"${type}": `).test(source);
}
