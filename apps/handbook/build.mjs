#!/usr/bin/env node
/**
 * Handbook content pipeline (Phase D0).
 * - Markdown subset → structured chapter blocks
 * - Applets → workspace seeds + catalog entries
 * - Broken-link check
 * - Emit bundle.js (catalog + runtime) and generated/catalog.json
 */

import {
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
  existsSync
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)));
const contentDir = join(root, "content");
const seedsDir = join(root, "seeds");
const generatedDir = join(root, "generated");
const runtimePath = join(root, "src", "runtime.js");
const bundlePath = join(root, "bundle.js");
const catalogOutPath = join(generatedDir, "catalog.json");

const EXPECTATION_VALUES = new Set(["pass", "unavailable", "device-gated", "fail"]);

function fail(message) {
  console.error(`handbook build: ${message}`);
  process.exit(1);
}

function ensureDir(path) {
  mkdirSync(path, { recursive: true });
}

function writeText(path, text) {
  ensureDir(dirname(path));
  writeFileSync(path, text);
}

function parseInlineLinks(line) {
  const links = [];
  const text = line.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, target) => {
    links.push({ label, target });
    return label;
  });
  return { text, links };
}

function parseMarkdown(markdown, chapterId) {
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
          chapterId: link.target.slice("chapter:".length)
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
      blocks.push({ type: "code", documentId, language, content: codeLines.join("\n") + "\n" });
      continue;
    }

    const appletMatch = line.match(/^\{\{applet:([A-Za-z0-9][A-Za-z0-9._-]*)\}\}\s*$/);
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

    if (/^\s*[-*]\s+/.test(line)) {
      flushParagraph(paragraphBuffer);
      const items = [];
      while (i < lines.length && /^\s*[-*]\s+/.test(lines[i])) {
        const { text, links } = parseInlineLinks(lines[i].replace(/^\s*[-*]\s+/, "").trim());
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

function loadToc() {
  const toc = JSON.parse(readFileSync(join(contentDir, "toc.json"), "utf8"));
  if (!Array.isArray(toc.parts) || toc.parts.length === 0) {
    fail("toc.json must declare at least one part");
  }
  return toc;
}

function loadApplets() {
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
    for (const [platform, expectation] of Object.entries(meta.expectations)) {
      if (!EXPECTATION_VALUES.has(expectation)) {
        fail(`Applet ${entry} has invalid expectation "${expectation}" for ${platform}`);
      }
    }

    const source = readFileSync(mainPath, "utf8");
    if (!/export\s+async\s+function\s+run\s*\(/.test(source)) {
      fail(`Applet ${entry} main.js must export async function run(sdk, report)`);
    }

    applets.push({
      id: meta.id,
      title: meta.title,
      capabilities: meta.capabilities,
      surfaces: meta.surfaces ?? [],
      expectations: meta.expectations,
      source
    });
  }

  return applets;
}

function resetSeeds() {
  rmSync(seedsDir, { recursive: true, force: true });
  ensureDir(seedsDir);
}

async function generateReferenceChapters() {
  const refDir = join(contentDir, "part-5-reference");
  ensureDir(refDir);

  let capabilityDefinitions = [];
  let widgetTypes = [];
  let widgetPropKeys = new Map();
  let widgetStyleKeys = new Set();
  let codeEditorLanguages = new Set();
  let hostApiVersion = "0.3.0";
  let hostApiChangelog = [];
  let workspaceLimits = { maxFileBytes: 256 * 1024, maxTotalBytes: 4 * 1024 * 1024, maxFiles: 512 };

  try {
    const runtimeCaps = await import("../../packages/miniapp-runtime/dist/capabilities.js");
    capabilityDefinitions = runtimeCaps.CAPABILITY_DEFINITIONS;
    const runtimeUi = await import("../../packages/miniapp-runtime/dist/ui/schema.js");
    widgetTypes = [...runtimeUi.WIDGET_TYPES].sort();
    widgetPropKeys = runtimeUi.WIDGET_PROP_KEYS;
    widgetStyleKeys = runtimeUi.WIDGET_STYLE_KEYS;
    codeEditorLanguages = runtimeUi.CODE_EDITOR_LANGUAGES;
    const hostApi = await import("../../packages/miniapp-runtime/dist/host-api.js");
    hostApiVersion = hostApi.HOST_API_VERSION;
    hostApiChangelog = hostApi.HOST_API_CHANGELOG;
    const workspace = await import("../../packages/miniapp-runtime/dist/services/workspace.js");
    workspaceLimits = workspace.DEFAULT_WORKSPACE_LIMITS;
  } catch {
    capabilityDefinitions = [
      { id: "identity", description: "Use an app-scoped identity for signing and addressing." },
      { id: "presence", description: "Read coarse peer/interface presence and host info." },
      { id: "announce:subscribe", description: "Receive announces in the app namespace." },
      { id: "announce:publish", description: "Publish the app destination." },
      { id: "lxmf:send", description: "Send LXMF messages from the app destination." },
      { id: "lxmf:receive", description: "Receive LXMF messages for the app destination." },
      { id: "storage:kv", description: "Store local key/value data for this app." },
      { id: "storage:hyperbee", description: "Store ordered local Hyperbee data for this app." },
      { id: "resource:fetch", description: "Fetch package resources through host budget rules." },
      { id: "workspace", description: "Read and write project source files in this app's private workspace." },
      { id: "ai:chat", description: "Send prompts to the host-configured AI service." },
      { id: "apps:package", description: "Package and sign apps under this device's publisher identity." },
      { id: "apps:publish", description: "Publish signed apps so other users can find and install them." },
      { id: "apps:install", description: "Ask the host to install apps from a 256t id." },
      { id: "apps:preview", description: "Run a built app in the host's sandboxed dev-preview slot." },
      { id: "share:cas", description: "Store and retrieve bounded content-addressed data shared by 256t id." }
    ];
    widgetTypes = [
      "button",
      "code-editor",
      "divider",
      "image",
      "list",
      "progress",
      "qr-code",
      "scroll",
      "spacer",
      "switch",
      "text",
      "text-input",
      "view"
    ];
    hostApiChangelog = [{ version: hostApiVersion, note: "See packages/miniapp-runtime/src/host-api.ts" }];
  }

  const capabilitiesMd = [
    "# Capabilities",
    "",
    "Generated from `CAPABILITY_DEFINITIONS` in `packages/miniapp-runtime`.",
    "Every id below must be exercised by at least one Handbook applet (coverage gate).",
    "",
    ...capabilityDefinitions.map((entry) => `- **\`${entry.id}\`** — ${entry.description}`),
    "",
    "Manifests declare the full list; users may grant a subset at install.",
    "Withholding a capability turns matching probes into `not-granted` cards.",
    "",
    "See [Developing mini-apps](chapter:sdk-identity) for tutorials per namespace."
  ].join("\n");

  const widgetLines = [];
  for (const type of widgetTypes) {
    const props = widgetPropKeys.get(type);
    const propList =
      props === undefined || props.size === 0 ? "none" : [...props].sort().map((p) => `\`${p}\``).join(", ");
    widgetLines.push(`- **\`${type}\`** — props: ${propList}`);
  }

  const widgetsMd = [
    "# Widget protocol",
    "",
    "Generated from `WIDGET_TYPES` / `WIDGET_PROP_KEYS` in `packages/miniapp-runtime`.",
    "",
    "Hosts render a declarative tree (`ui.render`). Unknown types, props, styles,",
    "duplicate ids, or oversized trees are rejected.",
    "",
    "## Components",
    "",
    ...widgetLines,
    "",
    "## Styles",
    "",
    widgetStyleKeys.size > 0
      ? [...widgetStyleKeys].sort().map((key) => `- \`${key}\``).join("\n")
      : "- See `WIDGET_STYLE_KEYS` in the runtime.",
    "",
    "## Limits",
    "",
    `- Widget tree JSON budget: 256 KiB (default validator)`,
    `- \`code-editor\` languages: ${[...codeEditorLanguages].sort().join(", ")}`,
    `- \`qr-code\` value: up to 512 characters (94-char 256t ids fit)`,
    "",
    "Live gallery: [Widget gallery](chapter:sdk-widget-gallery)."
  ].join("\n");

  const changelogLines = hostApiChangelog.map(
    (entry) => `- **\`${entry.version}\`** — ${entry.note}`
  );

  const hostApiMd = [
    "# Host API",
    "",
    `Current \`HOST_API_VERSION\`: **\`${hostApiVersion}\`**.`,
    "Manifests pin \`minHostApi\`; hosts reject packages that require a newer API.",
    "",
    "## Changelog",
    "",
    ...changelogLines,
    "",
    "## host.info()",
    "",
    "Returns platform id, host version, API version, roles, interface types, and quota",
    "snapshot — used by the [live difference matrix](chapter:difference-matrix).",
    "",
    "## Workspace quotas",
    "",
    `- ${workspaceLimits.maxFileBytes} bytes/file`,
    `- ${workspaceLimits.maxTotalBytes} bytes total per app`,
    `- ${workspaceLimits.maxFiles} files per app`
  ].join("\n");

  const packagesMd = [
    "# Package format",
    "",
    "Mini-apps ship as deterministic **\`.tpkg\`** archives:",
    "",
    "- Signed manifest (name, version, entry, capabilities, publisher key, `minHostApi`)",
    "- Entry bundle (`bundle.js`) and assets",
    "- Ed25519 signature over the manifest hash",
    "",
    "Packaging flow: [Packaging & preview](chapter:sdk-apps-package).",
    "256t distribution: [docs/256t-distribution.md](../../../docs/256t-distribution.md)."
  ].join("\n");

  writeText(join(refDir, "capabilities.md"), `${capabilitiesMd}\n`);
  writeText(join(refDir, "widgets.md"), `${widgetsMd}\n`);
  writeText(join(refDir, "host-api.md"), `${hostApiMd}\n`);
  writeText(join(refDir, "packages.md"), `${packagesMd}\n`);
}

async function build() {
  await generateReferenceChapters();
  const toc = loadToc();
  const applets = loadApplets();
  const appletIds = new Set(applets.map((applet) => applet.id));
  const chapterIds = new Set();
  const chapters = [];
  const allLinks = [];

  resetSeeds();
  ensureDir(generatedDir);

  for (const part of toc.parts) {
    for (const chapter of part.chapters) {
      if (chapterIds.has(chapter.id)) {
        fail(`Duplicate chapter id: ${chapter.id}`);
      }
      chapterIds.add(chapter.id);

      const markdownPath = join(contentDir, chapter.file);
      if (!existsSync(markdownPath)) {
        fail(`Missing chapter file: ${chapter.file}`);
      }

      const markdown = readFileSync(markdownPath, "utf8");
      const { blocks, links } = parseMarkdown(markdown, chapter.id);
      allLinks.push(...links.map((link) => ({ ...link, from: chapter.id })));

      const seedBlocks = [];
      for (const block of blocks) {
        if (block.type === "code") {
          writeText(join(seedsDir, block.documentId), block.content);
          seedBlocks.push({ type: "code", documentId: block.documentId, language: block.language });
        } else if (block.type === "applet") {
          if (!appletIds.has(block.appletId)) {
            fail(`Chapter ${chapter.id} references unknown applet ${block.appletId}`);
          }
          seedBlocks.push({ type: "applet", appletId: block.appletId });
        } else {
          seedBlocks.push(block);
        }
      }

      // Also store the authored markdown for content-by-reference readers / DevStudio.
      writeText(join(seedsDir, `chapters/${chapter.id}/source.md`), markdown);

      chapters.push({
        id: chapter.id,
        title: chapter.title,
        partId: part.id,
        partTitle: part.title,
        blocks: seedBlocks
      });
    }
  }

  for (const link of allLinks) {
    if (link.target.startsWith("chapter:")) {
      const targetId = link.target.slice("chapter:".length);
      if (!chapterIds.has(targetId)) {
        fail(`Broken chapter link from ${link.from}: ${link.target}`);
      }
    } else if (link.target.startsWith("http://") || link.target.startsWith("https://")) {
      // External links are allowed; not validated at build time.
    } else if (link.target.startsWith("../") || link.target.endsWith(".md")) {
      // Repo-relative doc links are documentation-only; skip host validation.
    } else {
      fail(`Unsupported link target from ${link.from}: ${link.target}`);
    }
  }

  for (const applet of applets) {
    writeText(join(seedsDir, `applets/${applet.id}/main.js`), applet.source);
    writeText(
      join(seedsDir, `applets/${applet.id}/applet.json`),
      `${JSON.stringify(
        {
          id: applet.id,
          title: applet.title,
          capabilities: applet.capabilities,
          surfaces: applet.surfaces,
          expectations: applet.expectations
        },
        null,
        2
      )}\n`
    );
  }

  // Coverage gate: every CAPABILITY_DEFINITIONS id must be exercised by ≥ 1
  // applet and every applet referenced by ≥ 1 chapter. CI fails on new surface
  // without docs.
  const referencedApplets = new Set();
  const coveredCapabilities = new Set();
  for (const chapter of chapters) {
    for (const block of chapter.blocks) {
      if (block.type === "applet") {
        referencedApplets.add(block.appletId);
      }
    }
  }
  for (const applet of applets) {
    if (!referencedApplets.has(applet.id)) {
      fail(`Applet ${applet.id} is not referenced by any chapter`);
    }
    for (const capability of applet.capabilities) {
      coveredCapabilities.add(capability);
    }
  }

  let capabilityDefinitions = [];
  try {
    const runtimeCaps = await import(
      "../../packages/miniapp-runtime/dist/capabilities.js"
    );
    capabilityDefinitions = runtimeCaps.CAPABILITY_DEFINITIONS.map((entry) => entry.id);
  } catch {
    // Fall back when dist is not built yet; D1 CI always runs after `npm run build`.
    capabilityDefinitions = [
      "identity",
      "presence",
      "announce:subscribe",
      "announce:publish",
      "lxmf:send",
      "lxmf:receive",
      "storage:kv",
      "storage:hyperbee",
      "resource:fetch",
      "workspace",
      "ai:chat",
      "apps:package",
      "apps:publish",
      "apps:install",
      "apps:preview",
      "share:cas"
    ];
  }

  for (const capability of capabilityDefinitions) {
    if (!coveredCapabilities.has(capability)) {
      fail(`Capability "${capability}" is not exercised by any applet`);
    }
  }

  const catalog = {
    title: toc.title,
    version: "0.1.0",
    parts: toc.parts.map((part) => ({
      id: part.id,
      title: part.title,
      chapters: part.chapters.map((chapter) => ({ id: chapter.id, title: chapter.title }))
    })),
    chapters,
    applets: applets.map(({ source, ...rest }) => ({
      ...rest,
      sourcePath: `applets/${rest.id}/main.js`
    })),
    seeds: collectSeedManifest(seedsDir)
  };

  writeText(catalogOutPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const runtime = readFileSync(runtimePath, "utf8");
  const bundle = `/* Generated by apps/handbook/build.mjs — do not edit by hand. */\nconst CATALOG = ${JSON.stringify(catalog)};\n${runtime}`;
  writeText(bundlePath, bundle);

  console.log(
    `handbook build: ${chapters.length} chapter(s), ${applets.length} applet(s), ${catalog.seeds.length} seed file(s) → bundle.js`
  );
}

function collectSeedManifest(dir, prefix = "") {
  const files = [];
  for (const entry of readdirSync(dir).sort()) {
    const full = join(dir, entry);
    const rel = prefix === "" ? entry : `${prefix}/${entry}`;
    if (statSync(full).isDirectory()) {
      files.push(...collectSeedManifest(full, rel));
    } else {
      files.push({
        path: rel.split("\\").join("/"),
        content: readFileSync(full, "utf8")
      });
    }
  }
  return files;
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
