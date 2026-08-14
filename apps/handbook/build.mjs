#!/usr/bin/env node
/**
 * Handbook content pipeline (Phase D0).
 * - Markdown subset → structured chapter blocks
 * - Applets → workspace seeds + catalog entries
 * - Broken-link check
 * - Emit bundle.js (catalog + runtime) and generated/catalog.json
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  HANDBOOK_PLATFORMS,
  MIN_CHAPTER_WORDS,
  SDK_NAMESPACES,
  bundlePath,
  catalogOutPath,
  chapterTextForSearch,
  chapterWordCount,
  collectSeedManifest,
  contentDir,
  ensureDir,
  fail,
  generatedDir,
  loadApplets,
  loadToc,
  parseMarkdown,
  resetSeeds,
  root,
  runtimePaths,
  seedsDir,
  writeText,
} from "./build-content.mjs";
import { generateReferenceChapters } from "./build-reference.mjs";

function readRuntimeSource() {
  return runtimePaths.map((path) => readFileSync(path, "utf8")).join("\n");
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
          seedBlocks.push({
            type: "code",
            documentId: block.documentId,
            language: block.language,
          });
        } else if (block.type === "applet") {
          if (!appletIds.has(block.appletId)) {
            fail(
              `Chapter ${chapter.id} references unknown applet ${block.appletId}`,
            );
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
        blocks: seedBlocks,
        searchText: "",
      });
    }
  }

  for (const chapter of chapters) {
    chapter.searchText = chapterTextForSearch(chapter).toLowerCase();
    const minWords = MIN_CHAPTER_WORDS[chapter.partId];
    if (minWords !== undefined) {
      const words = chapterWordCount(chapter);
      if (words < minWords) {
        fail(
          `Chapter ${chapter.id} is too thin (${words} < ${minWords} words)`,
        );
      }
    }
  }

  for (const link of allLinks) {
    if (link.target.startsWith("chapter:")) {
      const targetId = link.target.slice("chapter:".length);
      if (!chapterIds.has(targetId)) {
        fail(`Broken chapter link from ${link.from}: ${link.target}`);
      }
    } else if (
      link.target.startsWith("http://") ||
      link.target.startsWith("https://")
    ) {
      // External URLs are allowed.
    } else if (link.target.startsWith("../") || link.target.endsWith(".md")) {
      fail(
        `Dead in-app link from ${link.from}: ${link.target} — use chapter:id targets`,
      );
    } else {
      fail(`Unsupported link target from ${link.from}: ${link.target}`);
    }
  }

  for (const applet of applets) {
    for (const platform of HANDBOOK_PLATFORMS) {
      if (applet.expectations[platform] === undefined) {
        fail(
          `Applet ${applet.id} missing expectation for platform ${platform}`,
        );
      }
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
          group: applet.group,
          executionModes: applet.executionModes,
          preview: applet.preview,
          capabilities: applet.capabilities,
          surfaces: applet.surfaces,
          expectations: applet.expectations,
        },
        null,
        2,
      )}\n`,
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

  let capabilityDefinitions;
  let capabilityDescriptions = new Map();
  try {
    const runtimeCaps =
      await import("../../packages/miniapp-runtime/dist/capabilities.js");
    capabilityDefinitions = runtimeCaps.CAPABILITY_DEFINITIONS.map(
      (entry) => entry.id,
    );
    capabilityDescriptions = new Map(
      runtimeCaps.CAPABILITY_DEFINITIONS.map((entry) => [
        entry.id,
        entry.description,
      ]),
    );
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
      "ai:embed",
      "apps:package",
      "apps:publish",
      "apps:install",
      "apps:preview",
      "share:cas",
    ];
    capabilityDescriptions = new Map(
      capabilityDefinitions.map((id) => [id, id]),
    );
  }

  for (const capability of capabilityDefinitions) {
    if (!coveredCapabilities.has(capability)) {
      fail(`Capability "${capability}" is not exercised by any applet`);
    }
  }

  const allChapterText = chapters
    .map((chapter) => chapter.searchText)
    .join("\n");
  const allSurfacePrefixes = applets
    .flatMap((applet) =>
      (applet.surfaces ?? []).map((surface) => surface.split(".")[0]),
    )
    .join(" ")
    .toLowerCase();
  for (const namespace of SDK_NAMESPACES) {
    if (
      !allChapterText.includes(namespace) &&
      !allSurfacePrefixes.includes(namespace)
    ) {
      fail(
        `SDK namespace "${namespace}" is not referenced in any chapter or applet surface`,
      );
    }
  }

  const manifestPath = join(root, "app.manifest.json");
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  const manifestCapabilities = (manifest.capabilities ?? []).map((id) => ({
    id,
    description: capabilityDescriptions.get(id) ?? id,
  }));

  const catalog = {
    title: toc.title,
    version: manifest.version ?? "0.2.0",
    manifestCapabilities,
    parts: toc.parts.map((part) => ({
      id: part.id,
      title: part.title,
      chapters: part.chapters.map((chapter) => ({
        id: chapter.id,
        title: chapter.title,
      })),
    })),
    chapters,
    applets: applets.map((applet) => {
      const rest = { ...applet };
      delete rest.source;
      return {
        ...rest,
        sourcePath: `applets/${rest.id}/main.js`,
      };
    }),
    seeds: collectSeedManifest(seedsDir),
  };

  writeText(catalogOutPath, `${JSON.stringify(catalog, null, 2)}\n`);

  const runtime = readRuntimeSource();
  const bundle = `/* Generated by apps/handbook/build.mjs — do not edit by hand. */\nconst CATALOG = ${JSON.stringify(catalog)};\n${runtime}`;
  writeText(bundlePath, bundle);

  buildPartPackages({
    toc,
    chapters,
    applets,
    manifest,
    capabilityDescriptions,
    runtime,
    seeds: catalog.seeds,
  });

  console.log(
    `handbook build: ${chapters.length} chapter(s), ${applets.length} applet(s), ${catalog.seeds.length} seed file(s) → bundle.js; ${toc.parts.length} part package(s) → generated/part-packages/`,
  );
}

function buildPartPackages({
  toc,
  chapters,
  applets,
  manifest,
  capabilityDescriptions,
  runtime,
  seeds,
}) {
  const partsRoot = join(generatedDir, "part-packages");
  rmSync(partsRoot, { recursive: true, force: true });

  for (const part of toc.parts) {
    const partChapters = chapters.filter(
      (chapter) => chapter.partId === part.id,
    );
    const referencedApplets = new Set();
    for (const chapter of partChapters) {
      for (const block of chapter.blocks) {
        if (block.type === "applet") {
          referencedApplets.add(block.appletId);
        }
      }
    }

    const partApplets = applets
      .filter((applet) => referencedApplets.has(applet.id))
      .map((applet) => {
        const rest = { ...applet };
        delete rest.source;
        return {
          ...rest,
          sourcePath: `applets/${rest.id}/main.js`,
        };
      });

    const chapterIds = new Set(partChapters.map((chapter) => chapter.id));
    const partSeeds = seeds.filter((seed) => {
      if (seed.path.startsWith("chapters/")) {
        const chapterId = seed.path.split("/")[1];
        return chapterIds.has(chapterId);
      }
      if (seed.path.startsWith("applets/")) {
        return [...referencedApplets].some((id) =>
          seed.path.startsWith(`applets/${id}/`),
        );
      }
      return false;
    });

    const partCapabilityIds = new Set([
      "identity",
      "presence",
      "storage:kv",
      "workspace",
    ]);
    for (const applet of partApplets) {
      for (const capability of applet.capabilities ?? []) {
        partCapabilityIds.add(capability);
      }
    }

    const partManifest = {
      ...manifest,
      name: `handbook-${part.id}`,
      capabilities: (manifest.capabilities ?? []).filter((id) =>
        partCapabilityIds.has(id),
      ),
    };
    if (partManifest.capabilities.length === 0) {
      partManifest.capabilities = ["identity", "storage:kv"];
    }

    const partManifestCapabilities = partManifest.capabilities.map((id) => ({
      id,
      description: capabilityDescriptions.get(id) ?? id,
    }));

    const partCatalog = {
      title: `${toc.title} — ${part.title}`,
      version: manifest.version ?? "0.2.0",
      manifestCapabilities: partManifestCapabilities,
      parts: [
        {
          id: part.id,
          title: part.title,
          chapters: part.chapters.map((chapter) => ({
            id: chapter.id,
            title: chapter.title,
          })),
        },
      ],
      chapters: partChapters,
      applets: partApplets,
      seeds: partSeeds,
    };

    const partDir = join(partsRoot, part.id);
    writeText(
      join(partDir, "app.manifest.json"),
      `${JSON.stringify(partManifest, null, 2)}\n`,
    );
    writeText(
      join(partDir, "bundle.js"),
      `/* Generated part package ${part.id} */\nconst CATALOG = ${JSON.stringify(partCatalog)};\n${runtime}`,
    );
  }
}

build().catch((error) => {
  console.error(error);
  process.exit(1);
});
