import path from "node:path";
import { readJson } from "../lib.mjs";

/**
 * One unit of ratchet debt, before clustering.
 *
 * @typedef {object} RawItem
 * @property {string} ratchet   Source ratchet id (`lint`, `kotlin`, `coverage`, …).
 * @property {string} rule      What is wrong, normalised across tools.
 * @property {string} file      Where it is, repo-relative where one exists.
 * @property {string} detail    Original message, for context.
 * @property {number} [gap]     Percentage points still missing (coverage only).
 * @property {boolean} [locatable] `file` names a path on disk, so its absence
 *   means the entry is stale rather than that the item has no location.
 */

const UNLOCATABLE_KINDS = new Set(["license", "coverage", "sansio"]);

/**
 * @param {string} kind
 * @param {string} file
 * @returns {boolean}
 */
function isLocatable(kind, file) {
  if (UNLOCATABLE_KINDS.has(kind)) return false;
  // A `#` is where the analyzer's number normalisation ate part of the path, and
  // a `*` is a glob: neither can be checked against the working tree.
  return !file.startsWith("(") && !file.includes("*") && !file.includes("#");
}

const LANGUAGES = ["kotlin", "python", "rust", "shell", "swift"];

/**
 * Every ratchet baseline, with the command that re-measures it and the command
 * that re-records it once the debt is gone. `census-ratchet.json` is deliberately
 * absent: its floors record apparatus that may not shrink, which is the inverse
 * of debt. `mutation-ratchet.json` is a single score rather than a list of
 * findings, so it is reported as a footer note instead of ranked.
 */
export const SOURCES = [
  eslint("lint", "lint-ratchet.json", "lint:all", "lint:all:baseline"),
  eslint(
    "typed",
    "typed-lint-ratchet.json",
    "lint:typed",
    "lint:typed:baseline",
  ),
  eslint(
    "complexity",
    "complexity-ratchet.json",
    "complexity:check",
    "complexity:baseline",
  ),
  {
    id: "structure",
    file: "structure-ratchet.json",
    kind: "structure",
    check: "npm run structure:check",
    baseline: "npm run structure:baseline",
  },
  {
    id: "format",
    file: "format-ratchet.json",
    kind: "path",
    check: "npm run format:check",
    baseline: "npm run format:baseline",
  },
  {
    id: "size",
    file: "size-ratchet.json",
    kind: "size",
    check: "npm run sizes",
    baseline: "npm run sizes:baseline",
  },
  {
    id: "license",
    file: "license-ratchet.json",
    kind: "license",
    check: "npm run licenses:check",
    baseline: "npm run licenses:baseline",
  },
  {
    id: "sansio",
    file: "sansio-ratchet.json",
    kind: "sansio",
    check: "npm run sansio",
    baseline: "edit sansio-ratchet.json (it may only shrink)",
  },
  {
    id: "coverage",
    file: "coverage-ratchet.json",
    kind: "coverage",
    check: "npm run coverage:check",
    baseline: "npm run coverage:baseline",
  },
  ...LANGUAGES.map((language) => ({
    id: language,
    file: `language-ratchets/${language}.json`,
    kind: "language",
    check: `npm run lint:${language}`,
    baseline: `node scripts/languages/check.mjs ${language} --write`,
  })),
];

/**
 * @param {string} id
 * @param {string} file
 * @param {string} check
 * @param {string} baseline
 * @returns {{id: string, file: string, kind: string, check: string, baseline: string}}
 */
function eslint(id, file, check, baseline) {
  return {
    id,
    file,
    kind: "eslint",
    check: `npm run ${check}`,
    baseline: `npm run ${baseline}`,
  };
}

/**
 * ESLint-family entries are `<file>:<rule>:<message>:occurrence-<n>`. Rule ids
 * never contain a colon, so the first two fields are unambiguous however many
 * colons the message carries.
 * @param {string} entry
 * @returns {{rule: string, file: string, detail: string}}
 */
function parseEslintEntry(entry) {
  const parts = entry.split(":");
  return {
    file: parts[0] || "(unknown)",
    rule: parts[1] || "(unknown)",
    detail: parts.slice(2, -1).join(":"),
  };
}

/**
 * Structure entries come from three producers with three shapes:
 * `knip:<kind>:<file>:<symbol>`, `depcruise:<rule>:<from>:<to>`, and
 * `layer:<package>:<dependency-type>:<dependency>`.
 * @param {string} entry
 * @returns {{rule: string, file: string, detail: string}}
 */
function parseStructureEntry(entry) {
  const parts = entry.split(":");
  if (parts[0] === "layer") {
    return {
      rule: `layer:${parts[2] ?? "dependencies"}`,
      file: `packages/${parts[1]}`,
      detail: `depends on ${parts.slice(3).join(":")}`,
    };
  }
  return {
    rule: `${parts[0]}:${parts[1]}`,
    file: parts[2] || "(unknown)",
    detail: parts.slice(3).join(":"),
  };
}

const SOURCE_FILE = /[\w./@+#-]+\.(?:kt|kts|swift|py|rs|sh|bash|toml)\b/;

/**
 * Reduce one analyzer line to a rule name. Each tool marks its rule differently:
 * ktlint and SwiftLint put it in trailing parentheses, mypy in trailing brackets,
 * Ruff on its own code line. Anything unrecognised degrades to a slug of the
 * message, which still clusters identical findings together.
 * @param {string} body
 * @returns {string}
 */
function languageRule(body) {
  const trailing = body.match(/\(((?:standard:)?[a-z][a-z0-9_-]*)\)\s*$/);
  if (trailing) return trailing[1];
  const bracketed = body.match(/\[([a-z][a-z0-9-]*)\]\s*$/);
  if (bracketed) return bracketed[1];
  if (body.startsWith("-->")) return "location";
  if (body.startsWith("Would reformat")) return "format";
  if (body.endsWith("nonzero-exit")) return "nonzero-exit";
  const code = body.match(/^([A-Z]+#)\s/);
  if (code) return code[1];
  return slug(body);
}

/**
 * @param {string} text
 * @returns {string}
 */
function slug(text) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .split("-")
      .slice(0, 5)
      .join("-") || "finding"
  );
}

/**
 * Language entries are `<tool>:<analyzer line with numbers replaced by #>:occurrence-<n>`.
 * @param {string} entry
 * @returns {{rule: string, file: string, detail: string}}
 */
function parseLanguageEntry(entry) {
  const raw = entry.replace(/:occurrence-\d+$/, "");
  const separator = raw.indexOf(":");
  const tool = separator === -1 ? raw : raw.slice(0, separator);
  const body = separator === -1 ? "" : raw.slice(separator + 1).trim();
  return {
    rule: `${tool}:${languageRule(body)}`,
    file: body.match(SOURCE_FILE)?.[0] ?? "(repository)",
    detail: body,
  };
}

/**
 * @param {string} entry
 * @returns {{rule: string, file: string, detail: string}}
 */
function parseLicenseEntry(entry) {
  const split = entry.lastIndexOf(":");
  const spec = split === -1 ? entry : entry.slice(0, split);
  const expression = split === -1 ? "UNKNOWN" : entry.slice(split + 1);
  return {
    rule: `license:${expression}`,
    file: spec,
    detail: `${spec} is licensed ${expression}`,
  };
}

/**
 * @param {string} ratchet
 * @param {any} baseline
 * @param {string} kind
 * @returns {RawItem[]}
 */
function parseEntries(ratchet, baseline, kind) {
  const parsers = {
    eslint: parseEslintEntry,
    structure: parseStructureEntry,
    language: parseLanguageEntry,
    license: parseLicenseEntry,
  };
  const parse = parsers[kind];
  const entries = baseline.entries ?? [];
  if (kind === "size") {
    return entries.map((entry) => ({
      ratchet,
      rule: "size:oversized",
      file: typeof entry === "string" ? entry : (entry.file ?? "(unknown)"),
      detail:
        typeof entry === "string"
          ? "over the danger threshold"
          : `${entry.lines} lines`,
    }));
  }
  if (kind === "path") {
    return entries.map((entry) => ({
      ratchet,
      rule: `${ratchet}:unformatted`,
      file: String(entry),
      detail: "not mechanically formatted",
    }));
  }
  return entries.map((entry) => ({ ratchet, ...parse(String(entry)) }));
}

/**
 * The Sans-IO ratchet is a set of allowances rather than findings. Only
 * `exceptions` is debt in the ordinary sense; the adapter and dependency
 * allowlists record where I/O is *supposed* to live, so they are marked
 * advisory in `ratchet-rules.json` and hidden unless asked for.
 * @param {any} baseline
 * @returns {RawItem[]}
 */
function parseSansio(baseline) {
  /** @type {[string, string, string][]} */
  const lists = [
    ["exceptions", "sansio:exception", "excepted from the Sans-IO deny list"],
    [
      "adapterAllowlist",
      "sansio:adapter-allowlist",
      "allowed to perform I/O as an adapter",
    ],
    [
      "protocolDependencyAllowlist",
      "sansio:protocol-dependency",
      "allowed as a protocol dependency",
    ],
  ];
  return lists.flatMap(([key, rule, detail]) =>
    (baseline[key] ?? []).map((value) => ({
      ratchet: "sansio",
      rule,
      file: String(value),
      detail,
    })),
  );
}

/**
 * Coverage has no finding list: the debt is the distance between each recorded
 * floor and the target every package is meant to reach.
 * @param {any} baseline
 * @param {{statements: number, branches: number, functions: number}} targets
 * @returns {RawItem[]}
 */
function parseCoverage(baseline, targets) {
  const items = [];
  for (const [pkg, metrics] of Object.entries(baseline.packages ?? {})) {
    for (const [metric, target] of Object.entries(targets)) {
      const value = Number(metrics[metric] ?? 0);
      const gap = Number((target - value).toFixed(2));
      if (gap <= 0) continue;
      items.push({
        ratchet: "coverage",
        rule: `coverage:${metric}`,
        file: pkg,
        detail: `${value}% of ${target}% ${metric}`,
        gap,
      });
    }
  }
  return items;
}

/**
 * Read every ratchet baseline and flatten it into comparable items.
 * @param {string} root
 * @param {any} rules
 * @returns {{items: RawItem[], perRatchet: Map<string, number>, missing: string[]}}
 */
export function collect(root, rules) {
  /** @type {RawItem[]} */
  const items = [];
  /** @type {Map<string, number>} */
  const perRatchet = new Map();
  /** @type {string[]} */
  const missing = [];

  for (const source of SOURCES) {
    const baseline = readJson(path.join(root, source.file), null);
    if (baseline === null) {
      missing.push(source.file);
      perRatchet.set(source.id, 0);
      continue;
    }
    let parsed;
    if (source.kind === "sansio") parsed = parseSansio(baseline);
    else if (source.kind === "coverage")
      parsed = parseCoverage(baseline, rules.coverageTargets);
    else parsed = parseEntries(source.id, baseline, source.kind);
    perRatchet.set(source.id, parsed.length);
    for (const item of parsed) {
      item.locatable = isLocatable(source.kind, item.file);
      items.push(item);
    }
  }
  return { items, perRatchet, missing };
}

/**
 * The mutation ratchet is one number, so it cannot be burned down item by item.
 * @param {string} root
 * @returns {{score: number} | null}
 */
export function mutationFloor(root) {
  const baseline = readJson(path.join(root, "mutation-ratchet.json"), null);
  return baseline === null ? null : { score: Number(baseline.score ?? 0) };
}
