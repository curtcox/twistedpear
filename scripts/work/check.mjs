#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { resolveEvidencePath } from "../doc-audit/paths.mjs";
import {
  METADATA_FILE,
  canonicalMetadata,
  findCycles,
  loadMetadata,
  loadWork,
  saveMetadata,
} from "./lib.mjs";
import {
  validateCanonicalForm,
  validateMetadataShape,
  validateResourcesShape,
} from "./validate.mjs";
import {
  auditAppendOnly,
  auditJournalAgainstRegisters,
  auditJournalShape,
} from "./journal.mjs";

/**
 * @param {string} root
 * @returns {string[]}
 */
export function auditCoverage(root = repoRoot()) {
  const { items, orphans } = loadWork(root);
  /** @type {string[]} */
  const problems = [];

  for (const item of items) {
    if (!item.type) {
      problems.push(
        `${item.file}:${item.line} ${item.id}: no entry in ${METADATA_FILE} — add one with npm run work:add`,
      );
    }
  }
  for (const id of orphans) {
    problems.push(
      `${METADATA_FILE} ${id}: no matching register row in any STATUS file`,
    );
  }
  return problems;
}

/**
 * Unresolvable prerequisites are reported as errors rather than treated as
 * permanent blocks, so a typo cannot quietly park an item forever.
 * @param {string} root
 * @returns {string[]}
 */
export function auditPrerequisites(root = repoRoot()) {
  const { items, index } = loadWork(root);
  /** @type {string[]} */
  const problems = [];

  for (const item of items) {
    for (const blocker of item.blockers) {
      if (blocker.kind === "missing") {
        problems.push(`${item.id}: ${blocker.reason}`);
      }
    }
    if (item.status === "done") {
      for (const blocker of item.blockers) {
        if (blocker.kind === "item") {
          problems.push(
            `${item.id}: done but prerequisite ${blocker.ref} is not (${blocker.reason})`,
          );
        }
      }
    }
  }
  for (const cycle of findCycles(index)) {
    problems.push(`prerequisite cycle: ${cycle}`);
  }
  return problems;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function auditVerifyCommands(root = repoRoot()) {
  const { items } = loadWork(root);
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const scripts = new Set(Object.keys(pkg.scripts ?? {}));
  /** @type {string[]} */
  const problems = [];

  for (const item of items) {
    if (!item.verify) continue;
    if (item.verify.startsWith("runbook:")) {
      const target = item.verify.slice("runbook:".length).split("#")[0];
      if (!existsSync(join(root, target))) {
        problems.push(`${item.id}: runbook ${target} does not exist`);
      }
      continue;
    }
    for (const [, name] of item.verify.matchAll(/npm run ([\w:-]+)/g)) {
      if (!scripts.has(name)) {
        problems.push(`${item.id}: verify references missing script "${name}"`);
      }
    }
  }
  return problems;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function auditEvidencePaths(root = repoRoot()) {
  const { items } = loadWork(root);
  /** @type {string[]} */
  const problems = [];

  for (const item of items) {
    for (const token of item.evidence ?? []) {
      if (/^https?:/.test(token)) continue;
      // Strict: a bare basename resolved by repo-wide search is fine for prose,
      // but this is a machine record — evidence must name an actual path.
      const resolved = resolveEvidencePath(root, token, {
        strictBasenames: true,
      });
      if (!resolved.ok) {
        problems.push(`${item.id}: evidence "${token}" — ${resolved.reason}`);
      }
    }
  }
  return problems;
}

/**
 * @param {string} root
 * @returns {{ label: string; problems: string[] }[]}
 */
export function runAllChecks(root = repoRoot()) {
  const { index } = loadWork(root);
  return [
    { label: "metadata shape", problems: validateMetadataShape(root) },
    { label: "resources shape", problems: validateResourcesShape(root) },
    { label: "canonical form", problems: validateCanonicalForm(root) },
    { label: "register coverage", problems: auditCoverage(root) },
    { label: "prerequisites", problems: auditPrerequisites(root) },
    { label: "verify commands", problems: auditVerifyCommands(root) },
    { label: "evidence paths", problems: auditEvidencePaths(root) },
    { label: "journal shape", problems: auditJournalShape(root) },
    { label: "journal append-only", problems: auditAppendOnly(root) },
    {
      label: "journal vs registers",
      problems: auditJournalAgainstRegisters(index, root),
    },
  ];
}

function main() {
  const root = repoRoot();
  if (process.argv.includes("--write")) {
    saveMetadata(loadMetadata(root), root);
    console.log(`normalized ${METADATA_FILE}`);
  }

  const results = runAllChecks(root);
  let failed = 0;
  for (const { label, problems } of results) {
    if (problems.length === 0) {
      console.log(`  ok    ${label}`);
      continue;
    }
    failed += problems.length;
    console.log(`  FAIL  ${label}`);
    for (const problem of problems) console.log(`        ${problem}`);
  }

  if (failed > 0) {
    console.log(`\n${failed} problem(s). See docs/work-tracking.md.`);
    process.exit(1);
  }
  console.log("\nwork registry is consistent.");
}

if (import.meta.url === `file://${process.argv[1]}`) main();

export { canonicalMetadata };
