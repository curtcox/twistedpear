/**
 * Handbook build — markdown parsing, applet loading, seed helpers.
 */

import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import "./src/runtime-devstudio.js";

export const root = resolve(dirname(fileURLToPath(import.meta.url)));
export const contentDir = join(root, "content");
export const seedsDir = join(root, "seeds");
export const generatedDir = join(root, "generated");
export const bundlePath = join(root, "bundle.js");
export const catalogOutPath = join(generatedDir, "catalog.json");
export const runtimePaths = [
  join(root, "src", "runtime-render.js"),
  join(root, "src", "runtime-devstudio.js"),
  join(root, "src", "runtime.js"),
];

const EXPECTATION_VALUES = new Set([
  "pass",
  "unavailable",
  "device-gated",
  "fail",
]);
const DIAGNOSTIC_GROUPS = new Set([
  "crypto",
  "interfaces",
  "storage",
  "distribution",
  "runtime",
]);
const EXECUTION_MODES = new Set(["inline", "preview"]);
export const HANDBOOK_PLATFORMS = ["android", "ios", "desktop", "web", "node"];
export const SDK_NAMESPACES = [
  "identity",
  "presence",
  "host",
  "announce",
  "lxmf",
  "storage",
  "resource",
  "workspace",
  "share",
  "apps",
  "ai",
  "ui",
  "peers",
  "freenet",
  "relay",
  "device",
];
export const MIN_CHAPTER_WORDS = {
  "part-1-concepts": 80,
  "part-2-hosts": 80,
  "part-3-sdk": 80,
  "part-4-diagnostics": 40,
};

function isTableSeparator(line) {
  return /^\|?[\s:-]+\|[\s|:-]+\|?$/.test(line.trim());
}

function parseTableRow(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|")) {
    return null;
  }
  const cells = trimmed
    .slice(1, trimmed.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((cell) => cell.trim());
  return cells;
}

export function fail(message) {
  console.error(`handbook build: ${message}`);
  process.exit(1);
}

export function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

export function writeText(path, text) {
  ensureDir(dirname(path));
  writeFileSync(path, text);
}

function parseInlineLinks(line) {
  const links = [];
  const text = line.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label, target) => {
      links.push({ label, target });
      return label;
    },
  );
  return { text, links };
}

export function parseMarkdown(markdown, chapterId) {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks = [];
  let i = 0;
  let codeFenceIndex = 0;
  let paragraphLinks = [];

  const flushParagraph = (buffer) => {
    if (buffer.length === 0) {
      return;
    }
    const joined = buffer.join(" ").trim();
    if (joined.length === 0) {
      return;
    }
    const { text, links } = parseInlineLinks(joined);
    blocks.push({ type: "paragraph", text });
    for (const link of links) {
      paragraphLinks.push(link);
      if (link.target.startsWith("chapter:")) {
        blocks.push({
          type: "chapter-link",
          label: link.label,
          chapterId: link.target.slice("chapter:".length),
        });
      }
    }
    buffer.length = 0;
  };

  const paragraphBuffer = [];

  while (i < lines.length) {
    const line = lines[i];

    if (line.startsWith("```")) {
      flushParagraph(paragraphBuffer);
      const languageRaw = line.slice(3).trim() || "text";
      const language =
        languageRaw === "js" || languageRaw === "javascript"
          ? "javascript"
          : languageRaw === "json"
            ? "json"
            : "text";
      i += 1;
      const codeLines = [];
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i += 1;
      }
      if (i >= lines.length) {
        fail(`Unclosed code fence in chapter ${chapterId}`);
      }
      i += 1;
      const documentId = `chapters/${chapterId}/sample-${codeFenceIndex++}.${language === "javascript" ? "js" : language === "json" ? "json" : "txt"}`;
      blocks.push({
        type: "code",
        documentId,
        language,
        content: codeLines.join("\n") + "\n",
      });
      continue;
    }

    const appletMatch = line.match(
      /^\{\{applet:([A-Za-z0-9][A-Za-z0-9._-]*)\}\}\s*$/,
    );
    if (appletMatch !== null) {
      flushParagraph(paragraphBuffer);
      blocks.push({ type: "applet", appletId: appletMatch[1] });
      i += 1;
      continue;
    }

    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/);
    if (headingMatch !== null) {
      flushParagraph(paragraphBuffer);
      const level = headingMatch[1].length;
      const { text } = parseInlineLinks(headingMatch[2].trim());
      blocks.push({ type: "heading", level, text });
      i += 1;
      continue;
    }

    if (line.trim().startsWith("|")) {
      flushParagraph(paragraphBuffer);
      const headerCells = parseTableRow(line);
      if (
        headerCells === null ||
        i + 1 >= lines.length ||
        !isTableSeparator(lines[i + 1])
      ) {
        paragraphBuffer.push(line.trim());
        i += 1;
        continue;
      }
      i += 2;
      const rows = [];
      while (i < lines.length && lines[i].trim().startsWith("|")) {
        const rowCells = parseTableRow(lines[i]);
        if (rowCells === null) {
          break;
        }
        rows.push(rowCells);
        i += 1;
      }
      blocks.push({ type: "table", headers: headerCells, rows });
      continue;
    }

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph(paragraphBuffer);
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const { text, links } = parseInlineLinks(
          lines[i].replace(/^\s*[-*]\s+/, "").trim(),
        );
        items.push(text);
        paragraphLinks.push(...links);
        i += 1;
      }
      blocks.push({ type: "list", items });
      continue;
    }

    if (line.trim() === "") {
      flushParagraph(paragraphBuffer);
      i += 1;
      continue;
    }

    paragraphBuffer.push(line.trim());
    i += 1;
  }

  flushParagraph(paragraphBuffer);
  return { blocks, links: paragraphLinks };
}

export function loadToc() {
  const toc = JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf8"));
  if (!Array.isArray(toc.parts) || toc.parts.length === 0) {
    fail("toc.json must declare at least one part");
  }
  return toc;
}

export function loadApplets() {
  const appletsRoot = join(contentDir, "applets");
  if (!existsSync(appletsRoot)) {
    return [];
  }

  const applets = [];
  for (const entry of readdirSync(appletsRoot).sort()) {
    const dir = join(appletsRoot, entry);
    if (!statSync(dir).isDirectory()) {
      continue;
    }

    const manifestPath = join(dir, "applet.json");
    const mainPath = join(dir, "main.js");
    if (!existsSync(manifestPath) || !existsSync(mainPath)) {
      fail(`Applet ${entry} needs applet.json and main.js`);
    }

    const meta = JSON.parse(readFileSync(manifestPath, "utf8"));
    if (meta.id !== entry) {
      fail(`Applet folder "${entry}" must match applet.json id "${meta.id}"`);
    }
    if (!Array.isArray(meta.capabilities) || meta.capabilities.length === 0) {
      fail(`Applet ${entry} must declare capabilities`);
    }
    if (!meta.expectations || typeof meta.expectations !== "object") {
      fail(`Applet ${entry} must declare expectations`);
    }
    if (meta.group !== undefined && !DIAGNOSTIC_GROUPS.has(meta.group)) {
      fail(`Applet ${entry} has invalid diagnostic group "${meta.group}"`);
    }
    const executionModes = meta.executionModes ?? ["inline"];
    if (!Array.isArray(executionModes) || executionModes.length === 0) {
      fail(`Applet ${entry} must declare executionModes (default inline)`);
    }
    for (const mode of executionModes) {
      if (!EXECUTION_MODES.has(mode)) {
        fail(`Applet ${entry} has invalid execution mode "${mode}"`);
      }
    }
    if (executionModes.includes("preview")) {
      const preview = meta.preview;
      if (preview === undefined || typeof preview !== "object") {
        fail(`Applet ${entry} with preview mode must declare preview config`);
      }
      if (typeof preview.project !== "string" || preview.project.length === 0) {
        fail(`Applet ${entry} preview.project is required`);
      }
      if (
        preview.manifest === undefined ||
        typeof preview.manifest !== "object"
      ) {
        fail(`Applet ${entry} preview.manifest is required`);
      }
      if (!Array.isArray(preview.grants)) {
        fail(`Applet ${entry} preview.grants must be an array`);
      }
      if (preview.files === undefined || typeof preview.files !== "object") {
        fail(`Applet ${entry} preview.files is required`);
      }
    }
    for (const [platform, expectation] of Object.entries(meta.expectations)) {
      if (!EXPECTATION_VALUES.has(expectation)) {
        fail(
          `Applet ${entry} has invalid expectation "${expectation}" for ${platform}`,
        );
      }
    }

    const source = readFileSync(mainPath, "utf8");
    if (!/export\s+async\s+function\s+run\s*\(/.test(source)) {
      fail(
        `Applet ${entry} main.js must export async function run(sdk, report)`,
      );
    }

    applets.push({
      id: meta.id,
      title: meta.title,
      group: meta.group ?? "runtime",
      executionModes,
      preview: meta.preview ?? null,
      capabilities: meta.capabilities,
      surfaces: meta.surfaces ?? [],
      expectations: meta.expectations,
      source,
    });
  }

  return applets;
}

export function chapterTextForSearch(chapter) {
  const parts = [chapter.title, chapter.partTitle];
  for (const block of chapter.blocks) {
    if (block.type === "paragraph" || block.type === "heading") {
      parts.push(block.text);
    }
    if (block.type === "list") {
      parts.push(...block.items);
    }
    if (block.type === "table") {
      parts.push(...block.headers);
      for (const row of block.rows) {
        parts.push(...row);
      }
    }
  }
  return parts.join(" ");
}

export function chapterWordCount(chapter) {
  return chapterTextForSearch(chapter)
    .split(/\s+/)
    .filter((token) => token.length > 0).length;
}

export function resetSeeds() {
  rmSync(seedsDir, { recursive: true, force: true });
  ensureDir(seedsDir);
}

export function collectSeedManifest(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const rel = prefix === "" ? entry : `${prefix}/${entry}`;
    if (statSync(full).isDirectory()) {
      files.push(...collectSeedManifest(full, rel));
    } else {
      files.push({
        path: rel.split("\\").join("/"),
        content: readFileSync(full, "utf8"),
      });
    }
  }
  return files;
}
