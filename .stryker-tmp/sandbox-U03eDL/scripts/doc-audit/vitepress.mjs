// @ts-nocheck
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, trackedMarkdownPaths } from "./repo-root.mjs";

const PUBLISHED_PREFIXES = ["authors/", "cookbook/", "docs/", "guide/", "specs/"];
const MULTILINE_CODE_WITH_TAG_RE =
  /`[^`\n]*\n[^`]*<[a-z][a-z0-9_-]*(?:\s[^>]*)?>[^`]*`/g;

function withoutFencedCode(text) {
  let inFence = false;
  return text
    .split("\n")
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return "";
      }
      return inFence ? "" : line;
    })
    .join("\n");
}

/**
 * Find inline-code spans that cross a source line before an HTML-like token.
 *
 * VitePress can pass the token through to Vue as an unterminated component tag,
 * even though ordinary Markdown renderers accept the multiline code span.
 *
 * @param {string} text
 * @returns {{ line: number; excerpt: string }[]}
 */
export function findMultilineCodeTagSpans(text) {
  const source = withoutFencedCode(text);
  return [...source.matchAll(MULTILINE_CODE_WITH_TAG_RE)].map((match) => ({
    line: source.slice(0, match.index).split("\n").length,
    excerpt: match[0]
  }));
}

/**
 * @param {string} root
 * @param {string[]} [files]
 * @returns {{ doc: string; line: number; excerpt: string }[]}
 */
export function findPublishedVitePressMarkdownHazards(
  root = repoRoot(),
  files = trackedMarkdownPaths(root)
) {
  return files
    .filter((file) => PUBLISHED_PREFIXES.some((prefix) => file.startsWith(prefix)))
    .flatMap((file) =>
      findMultilineCodeTagSpans(readFileSync(join(root, file), "utf8")).map(
        (hazard) => ({ doc: file, ...hazard })
      )
    );
}
