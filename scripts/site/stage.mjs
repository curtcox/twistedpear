#!/usr/bin/env node
/**
 * Stage documentation and specifications into site/src for VitePress.
 */
import fs from "node:fs";
import path from "node:path";
import { ROOT, SITE_SRC, REPO_URL } from "./paths.mjs";

const ROOT_DOCS = [
  "README.md",
  "RELEASE-PLAN.md",
  "LIMITATIONS.md",
  "STATUS-COMPLETE.md",
  "STATUS-COMPLETE-PHASES.md",
  "STATUS-SOFTWARE.md",
  "STATUS-HARDWARE.md"
];

const EXCLUDE_DOCS = new Set([]);

const GITHUB_TOP = new Set([
  "packages",
  "apps",
  "archive",
  "formal",
  "conformance",
  ".github",
  "scripts",
  "site",
  "release",
  "node_modules",
  "STATUS-COMPLETE.md",
  "STATUS-COMPLETE-PHASES.md",
  "STATUS-SOFTWARE.md",
  "STATUS-HARDWARE.md",
  "RELEASE-PLAN.md",
  "LIMITATIONS.md",
  "README.md"
]);

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function rmrf(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function isExternalOrSpecial(href) {
  return (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#") ||
    href.startsWith("data:")
  );
}

/** Resolve a link from a staged file to a repo-root-relative posix path. */
function resolveRepoPath(siteRel, hrefPath) {
  const dir = path.posix.dirname(siteRel);
  return path.posix.normalize(path.posix.join(dir, hrefPath));
}

function stripMd(p) {
  return p.replace(/\.md$/, "").replace(/\/README$/, "/").replace(/\/index$/, "/");
}

function githubBlob(repoPath) {
  return `${REPO_URL}/blob/main/${repoPath.replace(/^\.\//, "")}`;
}

function githubTree(repoPath) {
  return `${REPO_URL}/tree/main/${repoPath.replace(/^\.\//, "").replace(/\/$/, "")}`;
}

/**
 * Rewrite markdown links so VitePress only sees in-site or absolute http URLs.
 */
function rewriteMarkdownLinks(text, siteRel) {
  return text.replace(/(!?\[[^\]]*\]\()([^)\s]+)(\))/g, (full, open, href, close) => {
    if (isExternalOrSpecial(href)) return full;

    const hashIdx = href.indexOf("#");
    const rawPath = hashIdx === -1 ? href : href.slice(0, hashIdx);
    const hashSuffix = hashIdx === -1 ? "" : href.slice(hashIdx);
    if (!rawPath) return full;

    // Already absolute site path
    if (rawPath.startsWith("/")) {
      // Non-published artifact under /specs/... → GitHub when not a staged markdown page
      if (
        /^\/specs\/[^/]+\/(model|vectors|schema|streams|tapes)(\/|$)/.test(rawPath) ||
        (rawPath.startsWith("/specs/") &&
          /\.(json|tla|cfg|png|svg)$/i.test(rawPath))
      ) {
        const repoPath = rawPath.replace(/^\//, "");
        return `${open}${githubBlob(repoPath)}${hashSuffix}${close}`;
      }
      return full;
    }

    const joined = resolveRepoPath(siteRel, rawPath);

    // Map site-relative join back to repo path depending on stage root.
    let repoPath = joined;
    if (siteRel.startsWith("docs/")) {
      // joined like docs/foo or reference/STATUS or packages/...
      if (joined.startsWith("docs/")) {
        repoPath = joined;
      } else if (joined.startsWith("../")) {
        repoPath = path.posix.normalize(joined.replace(/^(\.\.\/)+/, ""));
      } else {
        repoPath = joined;
      }
      // When resolveRepoPath already normalized out of docs/, e.g. specs/..., packages/...
      if (!joined.startsWith("docs/") && !joined.startsWith("reference/")) {
        // from docs/x.md linking ../STATUS-COMPLETE.md → reference/STATUS-COMPLETE.md in join?
        // resolveRepoPath("docs/README.md", "../STATUS-COMPLETE.md") => "STATUS-COMPLETE.md"
        repoPath = joined.startsWith("docs/")
          ? joined
          : joined;
      }
    } else if (siteRel.startsWith("specs/")) {
      if (joined.startsWith("specs/")) {
        repoPath = joined;
      } else {
        // ../../STATUS-HARDWARE.md from specs/spec-media/ble.md → STATUS-HARDWARE.md
        repoPath = path.posix.normalize(
          path.posix.join(
            path.posix.dirname(siteRel.replace(/^specs\//, "specs/")),
            rawPath
          )
        );
        // Better: compute from repo
        const repoFile = path.posix.join(
          path.posix.dirname(siteRel),
          rawPath
        );
        repoPath = path.posix.normalize(repoFile);
        // If still under specs/, fine; if escapes to root file, strip leading ../
        while (repoPath.startsWith("../")) {
          repoPath = repoPath.slice(3);
        }
      }
    } else if (siteRel.startsWith("reference/")) {
      // Root docs: ./docs/foo → docs/foo; ./packages → packages; ./STATUS → sibling
      repoPath = path.posix.normalize(path.posix.join(".", rawPath.replace(/^\.\//, "")));
      if (repoPath.startsWith("reference/")) {
        repoPath = repoPath.slice("reference/".length);
      }
    }

    // Normalize accidental reference/ prefix
    if (repoPath.startsWith("reference/") && ROOT_DOCS.includes(path.posix.basename(repoPath))) {
      const base = path.posix.basename(repoPath);
      return `${open}/reference/${stripMd(base)}${hashSuffix}${close}`;
    }

    // Root status / plan docs → /reference/...
    const baseName = path.posix.basename(repoPath);
    const baseMd = baseName.endsWith(".md") ? baseName : `${baseName}.md`;
    if (
      (ROOT_DOCS.includes(baseMd) || ROOT_DOCS.includes(baseName)) &&
      !repoPath.includes("/")
    ) {
      const stem = baseMd.replace(/\.md$/, "");
      const link = stem === "README" ? "/reference/" : `/reference/${stem}`;
      return `${open}${link}${hashSuffix}${close}`;
    }

    // guide/… → /guide/…, authors/… → /authors/…, cookbook/… → /cookbook/…
    for (const section of ["guide", "authors", "cookbook"]) {
      const prefix = `${section}/`;
      if (!repoPath.startsWith(prefix)) continue;
      let rest = repoPath.slice(prefix.length);
      if (/\.(png|jpg|jpeg|gif|svg|webp)$/i.test(rest)) {
        return `${open}/${section}/${rest}${hashSuffix}${close}`;
      }
      // Sample-app sources live in the section tree but are not staged as pages. Only
      // markdown becomes a site route; everything else has to resolve on GitHub, as does
      // a directory with no README.md to render as its index.
      const isDirLink = rest.endsWith("/");
      const hasIndex =
        isDirLink && fs.existsSync(path.join(ROOT, repoPath.replace(/\/$/, ""), "README.md"));
      if (!rest.endsWith(".md") && (!isDirLink || !hasIndex)) {
        return `${open}${githubBlob(repoPath)}${hashSuffix}${close}`;
      }
      rest = stripMd(rest);
      if (rest === "README" || rest === "" || rest === "index") {
        return `${open}/${section}/${hashSuffix}${close}`;
      }
      return `${open}/${section}/${rest}${hashSuffix}${close}`;
    }

    // docs/… → /docs/…
    if (repoPath.startsWith("docs/")) {
      let rest = repoPath.slice("docs/".length);
      // HTML standalone page served from public/
      if (rest.endsWith(".html")) {
        return `${open}/docs/${rest}${hashSuffix}${close}`;
      }
      rest = stripMd(rest);
      if (rest === "README" || rest === "" || rest === "index") {
        return `${open}/docs/${hashSuffix}${close}`;
      }
      return `${open}/docs/${rest}${hashSuffix}${close}`;
    }

    // specs/… markdown → /specs/…; model/vectors/schema/streams → GitHub
    if (repoPath.startsWith("specs/")) {
      if (repoPath.endsWith("/") && !fs.existsSync(path.join(ROOT, repoPath, "README.md"))) {
        return `${open}${githubTree(repoPath)}${hashSuffix}${close}`;
      }
      if (/\/(model|vectors|schema|streams|tapes)(\/|$)/.test(repoPath) || /\.(json|tla|cfg)$/i.test(repoPath)) {
        return `${open}${githubBlob(repoPath)}${hashSuffix}${close}`;
      }
      let rest = repoPath.slice("specs/".length);
      rest = stripMd(rest);
      if (rest === "README" || rest === "" || rest === "index") {
        return `${open}/specs/${hashSuffix}${close}`;
      }
      return `${open}/specs/${rest}${hashSuffix}${close}`;
    }

    // Known GitHub-only tops
    const top = repoPath.split("/")[0];
    if (
      GITHUB_TOP.has(top) ||
      top === "packages" ||
      top === "apps" ||
      top === "archive" ||
      top === "formal" ||
      top === "conformance" ||
      top === "scripts" ||
      top === "release" ||
      top === ".github"
    ) {
      // Directory links without file — still fine for GitHub
      return `${open}${githubBlob(repoPath)}${hashSuffix}${close}`;
    }

    // In-tree relative docs/specs links that stayed local (same folder images etc.)
    if (
      rawPath.match(/\.(png|jpg|jpeg|gif|svg|webp)$/i) ||
      rawPath.endsWith(".html")
    ) {
      if (rawPath.endsWith(".html") && siteRel.startsWith("docs/")) {
        return `${open}/docs/${path.posix.basename(rawPath)}${hashSuffix}${close}`;
      }
      return full;
    }

    // Same-directory markdown within docs/specs — leave relative for VitePress
    if (siteRel.startsWith("docs/") || siteRel.startsWith("specs/")) {
      if (!rawPath.startsWith("../") && rawPath.endsWith(".md")) {
        return full;
      }
      if (!rawPath.startsWith("../") && !rawPath.includes("/")) {
        return full;
      }
    }

    // Fallback: GitHub
    return `${open}${githubBlob(repoPath)}${hashSuffix}${close}`;
  });
}

function stageMarkdownFile(srcAbs, destAbs, siteRel) {
  let dest = destAbs;
  let rel = siteRel;
  // VitePress resolves directory indexes as index.md; README.md alone trips dead-link checks for /path/.
  if (path.posix.basename(rel) === "README.md") {
    dest = path.join(path.dirname(destAbs), "index.md");
    rel = path.posix.join(path.posix.dirname(rel), "index.md");
  }
  let source = fs.readFileSync(srcAbs, "utf8");
  const samplePage = siteRel.match(/^cookbook\/apps\/([^/]+)\/README\.md$/);
  if (samplePage !== null) {
    const slug = samplePage[1];
    source = source.replace(
      /^(# [^\n]+)$/m,
      `$1\n\n> **Run it in a browser:** [Open the React Native Web implementation](/react-native-web/?app=${slug}).`
    );
  }
  if (/^cookbook\/\d{2}-/.test(siteRel)) {
    source = source.replace(/^## ([^\n]+)$/gm, (heading, title) => {
      const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      if (!fs.existsSync(path.join(ROOT, "cookbook", "apps", slug, "app.manifest.json"))) return heading;
      return `${heading}\n\n> **Run it in a browser:** [Open the React Native Web implementation](/react-native-web/?app=${slug}).`;
    });
  }
  const text = rewriteMarkdownLinks(source, siteRel);
  ensureDir(path.dirname(dest));
  fs.writeFileSync(dest, text);
}

function writeLanding() {
  const landing = `---
layout: home
hero:
  name: TwistedPear
  text: Peer-to-peer application platform
  tagline: Documentation, specifications, and quality reports from the latest main build.
  actions:
    - theme: brand
      text: User guide
      link: /guide/
    - theme: brand
      text: Build an app
      link: /authors/
    - theme: alt
      text: Cookbook
      link: /cookbook/
    - theme: alt
      text: Documentation
      link: /docs/
    - theme: alt
      text: Specifications
      link: /specs/
    - theme: alt
      text: Quality results
      link: /results/
features:
  - title: User guide
    details: Install a host, join a network, and run mini-apps. Written for people using TwistedPear, not building it.
    link: /guide/
  - title: App authoring guide
    details: Write, preview, package, sign, and publish a mini-app — in DevStudio or with the tp CLI.
    link: /authors/
  - title: Cookbook
    details: Twenty-five complete sample mini-apps, from a no-capability calculator to an app that publishes other apps.
    link: /cookbook/
  - title: Documentation
    details: Canonical guides for hosts, runtime, distribution, networking, and release operations.
    link: /docs/
  - title: Specifications
    details: Quasi-independent normative specs with vectors and formal models.
    link: /specs/
  - title: Quality results
    details: Unit tests, TypeScript, Sans-IO policy, and formal/TLA checks from the latest deploy.
    link: /results/
  - title: API reference
    details: TypeDoc for @twistedpear/reticulum-ts.
    link: /typedoc/
---
`;
  fs.writeFileSync(path.join(SITE_SRC, "index.md"), landing);
}

function stageRootDocs() {
  for (const name of ROOT_DOCS) {
    const src = path.join(ROOT, name);
    if (!fs.existsSync(src)) continue;
    stageMarkdownFile(src, path.join(SITE_SRC, "reference", name), `reference/${name}`);
  }
}

function stageDocs() {
  const docsDir = path.join(ROOT, "docs");
  function walk(dir, relBase) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.posix.join(relBase, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
        continue;
      }
      if (EXCLUDE_DOCS.has(entry.name)) continue;
      if (
        entry.name.endsWith(".md") ||
        entry.name.endsWith(".html") ||
        /\.(png|jpg|jpeg|gif|svg|webp)$/i.test(entry.name)
      ) {
        if (entry.name.endsWith(".md")) {
          stageMarkdownFile(abs, path.join(SITE_SRC, rel), rel);
        } else {
          copyFile(abs, path.join(SITE_SRC, rel));
        }
      }
    }
  }
  walk(docsDir, "docs");
}

/**
 * Stage a reader-facing guide section (the end-user guide, the app authoring guide).
 * Screenshots are referenced by absolute site path and are published separately by
 * section-images.mjs, so only markdown is staged here.
 *
 * @param {string} section directory name at the repository root, also the site route
 */
function stageSection(section) {
  const sectionDir = path.join(ROOT, section);
  if (!fs.existsSync(sectionDir)) return;
  function walk(dir, relBase) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.posix.join(relBase, entry.name);
      if (entry.isDirectory()) {
        walk(abs, rel);
      } else if (entry.name.endsWith(".md")) {
        stageMarkdownFile(abs, path.join(SITE_SRC, rel), rel);
      }
    }
  }
  walk(sectionDir, section);
}

function stageSpecs() {
  const specsDir = path.join(ROOT, "specs");
  function walk(dir, relBase) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      const rel = path.posix.join(relBase, entry.name);
      if (entry.isDirectory()) {
        if (["model", "vectors", "schema", "streams"].includes(entry.name)) continue;
        walk(abs, rel);
      } else if (entry.name.endsWith(".md")) {
        stageMarkdownFile(abs, path.join(SITE_SRC, rel), rel);
      }
    }
  }
  walk(specsDir, "specs");
}

function stageApiPlaceholder() {
  ensureDir(path.join(SITE_SRC, "api"));
  fs.writeFileSync(
    path.join(SITE_SRC, "api", "index.md"),
    `# API reference

TypeDoc for \`@twistedpear/reticulum-ts\`.

<a href="/typedoc/">Open the API reference</a>
`
  );
}

function stageResultsPlaceholder() {
  const resultsIndex = path.join(SITE_SRC, "results", "index.md");
  if (!fs.existsSync(resultsIndex)) {
    ensureDir(path.dirname(resultsIndex));
    fs.writeFileSync(
      resultsIndex,
      `# Quality results

Reports are generated by \`npm run site:reports\` during the Pages workflow.
`
    );
  }
}

function main() {
  rmrf(SITE_SRC);
  ensureDir(SITE_SRC);
  writeLanding();
  stageRootDocs();
  stageSection("guide");
  stageSection("authors");
  stageSection("cookbook");
  stageDocs();
  stageSpecs();
  stageApiPlaceholder();
  stageResultsPlaceholder();
  console.log(`Staged site content into ${SITE_SRC}`);
}

main();
