import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * Reads a worklet entry together with the sibling modules it imports, so source
 * invariants follow host behaviour across decomposition instead of pinning it to
 * one file.
 */
export function readWorkletSource(entryPath) {
  const seen = new Set();
  const parts = [];

  const visit = (path) => {
    if (seen.has(path)) {
      return;
    }

    seen.add(path);
    const source = readFileSync(path, "utf8");
    parts.push(source);
    for (const match of source.matchAll(/from "(\.\/[^"]+\.mjs)"/g)) {
      visit(resolve(dirname(path), match[1]));
    }
  };

  visit(entryPath);
  return parts.join("\n");
}

/**
 * True when the worklet source handles a host message type, whether it branches
 * on the type or registers it in a handler table.
 */
export function handlesHostMessage(source, type) {
  return new RegExp(`message\\.type === "${type}"|"${type}": `).test(source);
}
