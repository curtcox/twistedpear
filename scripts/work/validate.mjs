import { readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import {
  METADATA_FILE,
  RESOURCES_FILE,
  TYPES,
  canonicalMetadata,
  loadMetadata,
  loadResources,
} from "./lib.mjs";

const ITEM_KEYS = new Set([
  "type",
  "requires",
  "verify",
  "added",
  "completed",
  "evidence",
  "notes",
]);
const REQUIRED_KEYS = ["type", "requires", "verify", "added"];
const ID_PATTERN = /^[A-Z][A-Z0-9]*(-[A-Z0-9]+)*$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const RESOURCE_PATTERN = /^res:[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Hand-rolled rather than schema-library driven: the shape is seven fields and
 * two enums, and a validator dependency would need entries in the license
 * allowlist, deny.toml, and the knip surface to earn its place.
 * @param {string} root
 * @returns {string[]}
 */
export function validateMetadataShape(root = repoRoot()) {
  const metadata = loadMetadata(root);
  /** @type {string[]} */
  const problems = [];

  if (metadata.version !== 1) {
    problems.push(`${METADATA_FILE}: version must be 1`);
  }
  if (!metadata.items || typeof metadata.items !== "object") {
    problems.push(`${METADATA_FILE}: missing items object`);
    return problems;
  }

  for (const [id, entry] of Object.entries(metadata.items)) {
    const at = `${METADATA_FILE} ${id}`;
    if (!ID_PATTERN.test(id)) {
      problems.push(`${at}: id must be upper-case, dash-separated`);
    }
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      problems.push(`${at}: entry must be an object`);
      continue;
    }
    for (const key of Object.keys(entry)) {
      if (!ITEM_KEYS.has(key)) problems.push(`${at}: unknown field "${key}"`);
    }
    for (const key of REQUIRED_KEYS) {
      if (entry[key] === undefined) problems.push(`${at}: missing "${key}"`);
    }
    if (entry.type !== undefined && !TYPES.includes(entry.type)) {
      problems.push(`${at}: type must be one of ${TYPES.join(", ")}`);
    }
    // GATE-* is derived from checks.json. A hand-written entry under that name
    // would shadow the derived item with one that can be closed by hand, which
    // is the loophole the derivation exists to close.
    if (id.startsWith("GATE-")) {
      problems.push(
        `${at}: GATE-* ids are derived from checks.json and cannot be filed by hand`,
      );
    }
    if (entry.type === "broken-gate") {
      problems.push(
        `${at}: broken-gate is derived from checks.json, not a type work:add may assign`,
      );
    }
    if (entry.requires !== undefined) {
      if (!Array.isArray(entry.requires)) {
        problems.push(`${at}: requires must be an array`);
      } else {
        for (const ref of entry.requires) {
          if (typeof ref !== "string") {
            problems.push(`${at}: requires entries must be strings`);
          } else if (!ID_PATTERN.test(ref) && !RESOURCE_PATTERN.test(ref)) {
            problems.push(
              `${at}: "${ref}" is neither an item id nor a res:token`,
            );
          }
        }
        if (entry.requires.includes(id)) {
          problems.push(`${at}: item requires itself`);
        }
      }
    }
    if (entry.verify !== undefined && typeof entry.verify !== "string") {
      problems.push(`${at}: verify must be a string`);
    }
    if (entry.verify === "") problems.push(`${at}: verify must not be empty`);
    for (const key of ["added", "completed"]) {
      if (entry[key] !== undefined && !DATE_PATTERN.test(entry[key])) {
        problems.push(`${at}: ${key} must be YYYY-MM-DD`);
      }
    }
    if (entry.evidence !== undefined && !Array.isArray(entry.evidence)) {
      problems.push(`${at}: evidence must be an array`);
    }
    if (entry.completed !== undefined && !entry.evidence?.length) {
      problems.push(`${at}: completed items must cite evidence`);
    }
  }

  return problems;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function validateResourcesShape(root = repoRoot()) {
  const file = loadResources(root);
  /** @type {string[]} */
  const problems = [];

  if (file.version !== 1) problems.push(`${RESOURCES_FILE}: version must be 1`);
  if (!file.resources || typeof file.resources !== "object") {
    problems.push(`${RESOURCES_FILE}: missing resources object`);
    return problems;
  }

  for (const [token, entry] of Object.entries(file.resources)) {
    const at = `${RESOURCES_FILE} ${token}`;
    if (!RESOURCE_PATTERN.test(`res:${token}`)) {
      problems.push(`${at}: token must be lower-case, dash-separated`);
    }
    if (!entry || typeof entry !== "object") {
      problems.push(`${at}: entry must be an object`);
      continue;
    }
    if (typeof entry.available !== "boolean") {
      problems.push(`${at}: available must be a boolean`);
    }
    if (entry.note !== undefined && typeof entry.note !== "string") {
      problems.push(`${at}: note must be a string`);
    }
    if (entry.acquired !== undefined && !DATE_PATTERN.test(entry.acquired)) {
      problems.push(`${at}: acquired must be YYYY-MM-DD`);
    }
  }

  return problems;
}

/**
 * @param {string} root
 * @returns {string[]}
 */
export function validateCanonicalForm(root = repoRoot()) {
  const path = join(root, METADATA_FILE);
  let actual;
  try {
    actual = readFileSync(path, "utf8");
  } catch {
    return [`${METADATA_FILE}: missing`];
  }
  const expected = canonicalMetadata(JSON.parse(actual), root);
  if (actual === expected) return [];
  return [
    `${METADATA_FILE}: not in canonical form (sorted ids, fixed key order, 2-space indent). Run: npm run work:check -- --write`,
  ];
}
