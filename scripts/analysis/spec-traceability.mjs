#!/usr/bin/env node
/**
 * Evidence citations in the specification tree, resolved.
 *
 * `specs/spec-wire/spec.md` states the rule itself: "A profile is _done_ when
 * every subset row cites at least one pinned vector or interop test." Nothing
 * checked it. `doc-audit` checks a great deal about these files — lifecycle
 * headers, counterpart pairing, archive placement, every markdown link and image
 * resolving — but a citation written as an inline code span is not a link, and
 * that is the form every vector key, test title, and npm command takes. Deleting
 * a vector key silently un-pins a normative claim; renaming a test leaves the
 * spec citing evidence that no longer exists.
 *
 * Four citation forms are resolved here:
 *
 *   `crypto.json` → `sha256`                  vector file, and the key inside it
 *   `link.test.ts` ("Link identification")    test file, and the title inside it
 *   `npm run test:interop`                    a script in package.json
 *   an empty Pinned-by cell                   the profiles' own done-rule
 *
 * Markdown links are deliberately not re-checked: `doc-audit` already resolves
 * them, and a second report of the same finding makes both less useful.
 *
 * Everything is derived rather than configured — which specs are profiles comes
 * from their having a Subset table, and which are normative comes from the index
 * in `specs/README.md`. A list of specs kept here by hand would go stale exactly
 * as the citations do.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

const SPECS = "specs";

/** Directories a bare vector filename may name. */
const VECTOR_ROOTS = ["conformance/vectors"];

const WAIVERS = path.join(ROOT, "spec-traceability-waivers.json");

/**
 * Cells of one markdown table row, trimmed. Returns `null` for a non-row or the
 * `|---|---|` separator.
 *
 * @param {string} line
 */
export function tableCells(line) {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return null;
  const cells = trimmed
    .slice(1, -1)
    .split(/(?<!\\)\|/)
    .map((cell) => cell.trim());
  if (cells.every((cell) => /^:?-{3,}:?$/.test(cell))) return null;
  return cells;
}

/**
 * Rows of the `## 2. Subset` table, as `{ feature, pinnedBy, line }`.
 *
 * @param {string} text
 */
export function subsetRows(text) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => /^##\s+2\.\s+Subset\b/.test(line));
  if (start === -1) return [];
  const rows = [];
  let header = null;
  for (let index = start + 1; index < lines.length; index += 1) {
    const line = lines[index] ?? "";
    if (/^##\s/.test(line)) break;
    const cells = tableCells(line);
    if (cells === null) continue;
    if (header === null) {
      header = cells;
      continue;
    }
    const pinnedAt = header.findIndex((cell) => /pinned by/i.test(cell));
    rows.push({
      feature: cells[0] ?? "",
      pinnedBy: pinnedAt === -1 ? "" : (cells[pinnedAt] ?? ""),
      line: index + 1,
    });
  }
  return rows;
}

/**
 * Every `` `file.json` → `key` `` citation in a chunk of prose.
 *
 * The arrow is written as `→` throughout the tree; `->` is accepted so a plain
 * ASCII edit does not silently stop being checked.
 *
 * @param {string} text
 */
export function vectorCitations(text) {
  const found = [];
  // `crypto.json` → `hkdfSha256`, `identity.json` → `hkdf` puts two citations
  // on one line. The key list must stop before the next filename rather than
  // swallowing it: excluding it after the fact still consumes it, which left
  // the second citation unmatched and therefore unchecked — a hole that looked
  // exactly like a pass.
  for (const match of text.matchAll(
    /`([\w.-]+\.json)`\s*(?:→|->)\s*((?:`(?![\w.-]*\.json`)[\w.-]+`(?:\s*,\s*)?)+)/g,
  )) {
    const file = match[1];
    for (const key of (match[2] ?? "").matchAll(/`([\w.-]+)`/g)) {
      found.push({ file, key: key[1] });
    }
  }
  return found;
}

/**
 * Every `` `name.test.ts` ("title") `` citation, including the later titles in
 * a list like `("first…", "second")`.
 *
 * @param {string} text
 */
export function testCitations(text) {
  const found = [];
  for (const match of text.matchAll(
    /`([\w./-]+\.test\.[tm]?[jt]s)`[^("]*\(([^)]*)\)/g,
  )) {
    for (const title of (match[2] ?? "").matchAll(/"([^"]+)"/g)) {
      found.push({ file: match[1], title: title[1] });
    }
  }
  return found;
}

/**
 * Whether a cited title names a real test.
 *
 * SPEC-MEDIA abbreviates long titles with a trailing ellipsis — `"adds an
 * interface scope…"` for a test actually called "adds an interface scope to
 * unscoped IPv6 addresses". That is a citation convention, not rot, so an
 * elided title matches on its prefix. A title without an ellipsis still has to
 * match exactly, which is what catches a renamed test.
 *
 * @param {string} source
 * @param {string} title
 */
export function titleMatches(source, title) {
  const elided = /(?:…|\.\.\.)\s*$/.test(title);
  if (!elided) return source.includes(title);
  const prefix = title.replace(/(?:…|\.\.\.)\s*$/, "").trim();
  return prefix !== "" && source.includes(prefix);
}

/** Every `npm run <script>` mentioned. */
export function scriptCitations(text) {
  return [...text.matchAll(/npm run ([\w:-]+)/g)].map((match) => match[1]);
}

/** Files under `dir` whose basename matches, searched shallowly then deeply. */
function findByBasename(basename, roots) {
  for (const root of roots) {
    const candidate = path.join(ROOT, root, basename);
    if (fs.existsSync(candidate)) return path.join(root, basename);
  }
  return null;
}

/** Every tracked file whose basename is `basename`, anywhere in the tree. */
function locateAnywhere(basename, cache) {
  if (cache.has(basename)) return cache.get(basename);
  const found = [];
  const skip = new Set([
    "node_modules",
    ".git",
    "dist",
    "target",
    "Pods",
    "build",
    ".build",
    ".expo",
    "archive",
    "site",
  ]);
  const walk = (dir) => {
    let entries;
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (entry.name.startsWith(".") && entry.name !== ".") continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (skip.has(entry.name)) continue;
        walk(full);
      } else if (entry.name === basename) {
        found.push(path.relative(ROOT, full));
      }
    }
  };
  walk(ROOT);
  cache.set(basename, found);
  return found;
}

/**
 * Whether a vector file pins the case a spec cites.
 *
 * The tree writes a cited case two ways, and both are the same claim. Some
 * vector files key cases by object property — `crypto.json` → `sha256` — while
 * others hold an array of named entries, so `lxmf.json` → `hello-world` is the
 * `name` of one of `messages`. Accepting only the first form reported three
 * live, correctly-pinned rows in SPEC-MSG as broken.
 *
 * @param {unknown} value
 * @param {string} key
 */
export function hasKey(value, key) {
  if (value === null || typeof value !== "object") return false;
  if (!Array.isArray(value)) {
    if (Object.hasOwn(value, key)) return true;
    for (const field of ["name", "id", "case"]) {
      if (value[field] === key) return true;
    }
  }
  for (const child of Array.isArray(value) ? value : Object.values(value)) {
    if (hasKey(child, key)) return true;
  }
  return false;
}

/**
 * Spec statuses from the index tables in `specs/README.md`, as name → label.
 *
 * @param {string} text
 */
export function indexStatuses(text) {
  const statuses = new Map();
  for (const line of text.split(/\r?\n/)) {
    const cells = tableCells(line);
    if (cells === null || cells.length < 2) continue;
    const link = /\[([A-Z-]+)\]\(([\w-]+)\/spec\.md\)/.exec(cells[0] ?? "");
    if (link === null) continue;
    statuses.set(link[2], (cells.at(-1) ?? "").toLowerCase());
  }
  return statuses;
}

function main() {
  const findings = [];
  const scripts = new Set(
    Object.keys(readJson(path.join(ROOT, "package.json")).scripts ?? {}),
  );
  const statuses = indexStatuses(
    fs.readFileSync(path.join(ROOT, SPECS, "README.md"), "utf8"),
  );
  const locateCache = new Map();

  const specDirs = fs
    .readdirSync(path.join(ROOT, SPECS))
    .filter((name) => name.startsWith("spec-"))
    .filter((name) => fs.existsSync(path.join(ROOT, SPECS, name, "spec.md")))
    .sort();

  let vectorChecks = 0;
  let testChecks = 0;
  let scriptChecks = 0;
  let subsetChecks = 0;
  let profiles = 0;

  for (const name of specDirs) {
    // Every document in the directory, not only `spec.md`. SPEC-MEDIA is a
    // dispatcher: its own page holds no citations and delegates to six
    // per-medium profiles beside it, four of which carry Subset tables. Reading
    // only `spec.md` measured none of them and reported the parent as an
    // uncited normative spec, which was a bug in the gate rather than in
    // the tree.
    const documents = fs
      .readdirSync(path.join(ROOT, SPECS, name))
      .filter((entry) => entry.endsWith(".md"))
      .sort();
    const specTexts = [];

    for (const document of documents) {
      const relative = path.join(SPECS, name, document);
      const text = fs.readFileSync(path.join(ROOT, relative), "utf8");
      specTexts.push(text);

      // 1. The profiles' own done-rule: every subset row cites something.
      const rows = subsetRows(text);
      if (rows.length > 0) profiles += 1;
      for (const row of rows) {
        subsetChecks += 1;
        if (row.pinnedBy === "") {
          findings.push(
            `${relative}:${row.line}: subset row "${row.feature}" has an empty "Pinned by" cell; a profile is done only when every row cites a vector or an interop test`,
          );
        }
      }

      // 2. Vector citations resolve to a file and a key inside it.
      for (const citation of vectorCitations(text)) {
        vectorChecks += 1;
        const found =
          findByBasename(citation.file, [
            ...VECTOR_ROOTS,
            path.join(SPECS, name, "vectors"),
          ]) ??
          locateAnywhere(citation.file, locateCache).find((candidate) =>
            candidate.includes("vectors"),
          );
        if (found === undefined || found === null) {
          findings.push(
            `${relative}: cites vector file \`${citation.file}\`, which does not exist`,
          );
          continue;
        }
        let parsed;
        try {
          parsed = readJson(path.join(ROOT, found));
        } catch (error) {
          findings.push(
            `${relative}: ${found} is not readable JSON (${error.message})`,
          );
          continue;
        }
        if (!hasKey(parsed, citation.key)) {
          findings.push(
            `${relative}: cites \`${citation.file}\` → \`${citation.key}\`, but ${found} has no such key; the claim is no longer pinned`,
          );
        }
      }

      // 3. Test citations resolve to a file and a title inside it.
      for (const citation of testCitations(text)) {
        testChecks += 1;
        const basename = path.basename(citation.file);
        const candidates = citation.file.includes("/")
          ? [citation.file].filter((candidate) =>
              fs.existsSync(path.join(ROOT, candidate)),
            )
          : locateAnywhere(basename, locateCache);
        if (candidates.length === 0) {
          findings.push(
            `${relative}: cites test file \`${citation.file}\`, which does not exist`,
          );
          continue;
        }
        const matched = candidates.some((candidate) =>
          titleMatches(
            fs.readFileSync(path.join(ROOT, candidate), "utf8"),
            citation.title,
          ),
        );
        if (!matched) {
          findings.push(
            `${relative}: cites \`${citation.file}\` ("${citation.title}"), but no such test title exists in ${candidates.join(", ")}`,
          );
        }
      }

      // 4. Cited commands exist. `doc-audit` does this for the status registers
      //    and stops there, so a spec could cite a script deleted a year ago.
      for (const script of scriptCitations(text)) {
        scriptChecks += 1;
        if (!scripts.has(script)) {
          findings.push(
            `${relative}: cites \`npm run ${script}\`, which is not a script in package.json`,
          );
        }
      }
    }

    // 5. The index's own status definition: "normative" means machine-checkable
    //    artifacts exist and are cross-checked. A normative spec citing nothing
    //    checkable is the label claiming more than the tree holds. Judged over
    //    the whole directory, since a dispatcher page delegates its evidence to
    //    the profiles beside it.
    const status = statuses.get(name) ?? "";
    if (status.includes("normative")) {
      const checkable = specTexts.some(
        (text) =>
          vectorCitations(text).length > 0 ||
          testCitations(text).length > 0 ||
          scriptCitations(text).length > 0 ||
          /\.(tla|cfg|json|spthy|pv)\)/.test(text),
      );
      if (!checkable) {
        findings.push(
          `${path.join(SPECS, name)}: indexed as normative but cites no vector, model, test, or command`,
        );
      }
    }
  }

  // A spec that stops being discovered would retire all of its checks silently.
  if (specDirs.length === 0) {
    findings.push("specs: no spec directories found; the tree layout changed");
  }

  // Recorded findings, each with a reason. An entry is debt rather than
  // permission: everything not listed is enforced at zero, and a listing that
  // no longer matches anything is reported so a fixed citation loses its waiver
  // instead of quietly licensing the next one.
  const waivers = readJson(WAIVERS).waivers ?? [];
  const waived = new Map(waivers.map((entry) => [entry.finding, entry]));
  const unwaived = findings.filter((finding) => !waived.has(finding));
  const applied = findings.filter((finding) => waived.has(finding));
  const stale = waivers.filter((entry) => !findings.includes(entry.finding));

  for (const finding of unwaived) console.error(`  ${finding}`);
  for (const entry of applied) {
    console.warn(`  waived ${waived.get(entry).id}: ${entry}`);
  }
  for (const entry of stale) {
    console.error(
      `  stale waiver ${entry.id}: no longer matches any finding; remove it from ${path.relative(ROOT, WAIVERS)}`,
    );
  }
  findings.length = 0;
  findings.push(
    ...unwaived,
    ...stale.map((entry) => `stale waiver ${entry.id}`),
  );

  const artifact = path.join(
    ROOT,
    "artifacts/checks/spec-traceability-detail.json",
  );
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(
    artifact,
    `${JSON.stringify(
      {
        version: 1,
        generatedAt: new Date().toISOString(),
        ok: findings.length === 0,
        specs: specDirs.length,
        profiles,
        checks: {
          subsetRows: subsetChecks,
          vectorKeys: vectorChecks,
          testTitles: testChecks,
          commands: scriptChecks,
        },
        findings,
      },
      null,
      2,
    )}\n`,
  );

  console.log(
    `spec-traceability: ${findings.length === 0 ? "PASS" : "FAIL"}; ${specDirs.length} spec(s), ${profiles} profile(s), ${subsetChecks} subset row(s), ${vectorChecks} vector key(s), ${testChecks} test title(s), ${scriptChecks} command(s).`,
  );
  process.exit(findings.length === 0 ? 0 : 1);
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  main();
}
