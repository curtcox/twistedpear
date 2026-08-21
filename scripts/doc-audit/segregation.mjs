import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot, trackedMarkdownPaths } from "./repo-root.mjs";
import { parseTpDoc } from "./tp-doc.mjs";

/**
 * Rules that keep current implementation, planned work, and historical material in
 * separate files.
 *
 * 1. `historical` lives only under `archive/`, and `archive/` holds only `historical`.
 * 2. A `counterpart:` must resolve, must name the opposite lifecycle, and must point back.
 * 3. A `planned` document must link at least one `live` document, so a reader who lands on
 *    a plan can always reach the description of what actually ships.
 * 4. A `live` document must not carry a section whose heading announces planned work.
 */

/**
 * Whole headings — not substrings — that announce work rather than describe behaviour.
 * "## Phase 6 — Desktop host" is a record of a delivered phase and is fine; "## Phasing"
 * is a delivery schedule and belongs in a plan.
 */
const PLANNED_HEADING =
  /^#{2,6}\s+(phasing|roadmap|delivery sequence|sequencing|future work|remaining work|next steps|open questions|to ?do|planned work|proposed work|phase exit checklists)\s*$/i;

/**
 * The four status registers are the sanctioned exception: they are deliberately disjoint
 * ledgers of done / open / gated work, indexed from docs/README.md, and predate the
 * live-vs-plan file split.
 */
const REGISTER_PATHS = new Set([
  "STATUS-COMPLETE.md",
  "STATUS-COMPLETE-PHASES.md",
  "STATUS-COMPLETE-PIPELINE.md",
  "STATUS-COMPLETE-APPS.md",
  "STATUS-SOFTWARE.md",
  "STATUS-HARDWARE.md",
  "RELEASE-PLAN.md",
]);

/** @typedef {{ path: string; message: string }} Finding */

/**
 * @param {string} root
 * @returns {{ path: string; meta: ReturnType<typeof parseTpDoc>; text: string }[]}
 */
function loadDocs(root) {
  return trackedMarkdownPaths(root)
    .map((rel) => {
      const abs = join(root, rel);
      // A tracked path can be absent mid-rename in a dirty worktree.
      if (!existsSync(abs)) return null;
      const text = readFileSync(abs, "utf8");
      return { path: rel, meta: parseTpDoc(text), text };
    })
    .filter((doc) => doc?.meta);
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditArchivePlacement(root = repoRoot()) {
  /** @type {Finding[]} */
  const findings = [];
  for (const { path, meta } of loadDocs(root)) {
    const inArchive = path.startsWith("archive/");
    if (meta.lifecycle === "historical" && !inArchive) {
      findings.push({
        path,
        message: "lifecycle: historical must live under archive/",
      });
    }
    if (inArchive && meta.lifecycle !== "historical") {
      findings.push({
        path,
        message: `archive/ holds only historical documents, found lifecycle: ${meta.lifecycle}`,
      });
    }
  }
  return findings;
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditCounterparts(root = repoRoot()) {
  const docs = loadDocs(root);
  const byPath = new Map(docs.map((doc) => [doc.path, doc]));
  /** @type {Finding[]} */
  const findings = [];

  for (const { path, meta } of docs) {
    if (!meta.counterpart) continue;
    const other = byPath.get(meta.counterpart);
    if (!other) {
      findings.push({
        path,
        message: `counterpart ${meta.counterpart} is not a tracked markdown file with a tp-doc header`,
      });
      continue;
    }
    const pair = new Set([meta.lifecycle, other.meta.lifecycle]);
    if (!(pair.has("live") && pair.has("planned"))) {
      findings.push({
        path,
        message: `counterpart pair must be one live and one planned, got ${meta.lifecycle} and ${other.meta.lifecycle}`,
      });
    }
    if (other.meta.counterpart !== path) {
      findings.push({
        path,
        message: `counterpart ${meta.counterpart} does not point back (it names ${other.meta.counterpart ?? "nothing"})`,
      });
    }
  }
  return findings;
}

/**
 * Every planned document must link at least one live document.
 *
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditPlannedLinksToLive(root = repoRoot()) {
  const docs = loadDocs(root);
  const lifecycleByPath = new Map(
    docs.map((doc) => [doc.path, doc.meta.lifecycle]),
  );
  /** @type {Finding[]} */
  const findings = [];

  for (const { path, meta, text } of docs) {
    if (meta.lifecycle !== "planned") continue;
    const dir = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
    const targets = [...text.matchAll(/\[[^\]]*\]\(([^)\s#]+)(?:#[^)\s]*)?\)/g)]
      .map((m) => m[1])
      .filter((t) => !/^(https?:|mailto:)/.test(t))
      .map((t) => normalize(dir ? `${dir}/${t}` : t));
    const reachesLive = targets.some(
      (t) => lifecycleByPath.get(t) === "live" && existsSync(join(root, t)),
    );
    if (!reachesLive) {
      findings.push({
        path,
        message:
          "a planned document must link the live document describing what ships today",
      });
    }
  }
  return findings;
}

/**
 * @param {string} root
 * @returns {Finding[]}
 */
export function auditLiveDocsHaveNoPlanSections(root = repoRoot()) {
  /** @type {Finding[]} */
  const findings = [];
  for (const { path, meta, text } of loadDocs(root)) {
    if (meta.lifecycle !== "live") continue;
    if (REGISTER_PATHS.has(path)) continue;
    let fenced = false;
    text.split("\n").forEach((line, index) => {
      if (line.startsWith("```")) fenced = !fenced;
      if (fenced) return;
      if (!PLANNED_HEADING.test(line)) return;
      findings.push({
        path,
        message: `line ${index + 1}: planned-work heading in a live document — move it to the -plan.md counterpart: ${line.trim()}`,
      });
    });
  }
  return findings;
}

/** @param {string} p */
function normalize(p) {
  const parts = [];
  for (const segment of p.split("/")) {
    if (!segment || segment === ".") continue;
    if (segment === "..") parts.pop();
    else parts.push(segment);
  }
  return parts.join("/");
}
