#!/usr/bin/env node
// @ts-nocheck
/**
 * Handbook gap audit — dead in-app links, word counts, expectations completeness.
 * Exit 0 when clean; exit 1 with a summary when gaps remain.
 */

import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const contentDir = join(root, "apps/handbook/content");
const tocPath = join(contentDir, "toc.json");

const MIN_WORDS_PART_I_III = 80;
const MIN_WORDS_PART_IV = 40;
const HANDBOOK_PLATFORMS = ["android", "ios", "desktop", "web", "node"];

function wordCount(text) {
  return text.split(/\s+/).filter((token) => token.length > 0).length;
}

function loadToc() {
  return JSON.parse(readFileSync(tocPath, "utf8"));
}

function listMarkdownFiles() {
  const files = [];
  function walk(dir) {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        walk(full);
        continue;
      }
      if (entry.endsWith(".md")) {
        files.push(full);
      }
    }
  }
  walk(contentDir);
  return files;
}

function extractLinks(markdown) {
  const links = [];
  const re = /\[([^\]]+)\]\(([^)]+)\)/g;
  let match;
  while ((match = re.exec(markdown)) !== null) {
    links.push({ label: match[1], target: match[2] });
  }
  return links;
}

function partForChapter(chapterId, toc) {
  for (const part of toc.parts) {
    if (part.chapters.some((chapter) => chapter.id === chapterId)) {
      return part.id;
    }
  }
  return null;
}

function auditDeadLinks(toc) {
  const chapterIds = new Set();
  for (const part of toc.parts) {
    for (const chapter of part.chapters) {
      chapterIds.add(chapter.id);
    }
  }

  const issues = [];
  for (const part of toc.parts) {
    for (const chapter of part.chapters) {
      const path = join(contentDir, chapter.file);
      if (!existsSync(path)) {
        issues.push({ kind: "missing-file", chapter: chapter.id, detail: chapter.file });
        continue;
      }
      const markdown = readFileSync(path, "utf8");
      for (const link of extractLinks(markdown)) {
        if (link.target.startsWith("chapter:")) {
          const targetId = link.target.slice("chapter:".length);
          if (!chapterIds.has(targetId)) {
            issues.push({
              kind: "broken-chapter-link",
              chapter: chapter.id,
              detail: link.target
            });
          }
          continue;
        }
        if (link.target.startsWith("http://") || link.target.startsWith("https://")) {
          continue;
        }
        if (link.target.startsWith("../") || link.target.endsWith(".md")) {
          issues.push({
            kind: "dead-in-app-link",
            chapter: chapter.id,
            detail: `${link.label} → ${link.target}`
          });
        }
      }
    }
  }
  return issues;
}

function auditWordCounts(toc) {
  const issues = [];
  for (const part of toc.parts) {
    for (const chapter of part.chapters) {
      if (part.id === "part-5-reference") {
        continue;
      }
      const path = join(contentDir, chapter.file);
      const markdown = readFileSync(path, "utf8");
      const words = wordCount(markdown.replace(/```[\s\S]*?```/g, " ").replace(/\{\{applet:[^}]+\}\}/g, " "));
      const min =
        part.id === "part-4-diagnostics" ? MIN_WORDS_PART_IV : MIN_WORDS_PART_I_III;
      if (words < min) {
        issues.push({
          kind: "thin-chapter",
          chapter: chapter.id,
          detail: `${words} words (minimum ${min})`
        });
      }
    }
  }
  return issues;
}

function auditAppletExpectations() {
  const appletsRoot = join(contentDir, "applets");
  const issues = [];
  if (!existsSync(appletsRoot)) {
    return issues;
  }
  for (const entry of readdirSync(appletsRoot).sort()) {
    const dir = join(appletsRoot, entry);
    if (!statSync(dir).isDirectory()) {
      continue;
    }
    const manifestPath = join(dir, "applet.json");
    if (!existsSync(manifestPath)) {
      continue;
    }
    const meta = JSON.parse(readFileSync(manifestPath, "utf8"));
    for (const platform of HANDBOOK_PLATFORMS) {
      if (meta.expectations?.[platform] === undefined) {
        issues.push({
          kind: "missing-expectation",
          chapter: meta.id,
          detail: `no expectation for platform ${platform}`
        });
      }
    }
  }
  return issues;
}

function main() {
  const toc = loadToc();
  const issues = [
    ...auditDeadLinks(toc),
    ...auditWordCounts(toc),
    ...auditAppletExpectations()
  ];

  if (issues.length === 0) {
    console.log("audit-handbook: no gaps detected");
    return;
  }

  console.error(`audit-handbook: ${issues.length} issue(s)`);
  for (const issue of issues) {
    console.error(`  [${issue.kind}] ${issue.chapter}: ${issue.detail}`);
  }
  process.exit(1);
}

main();
