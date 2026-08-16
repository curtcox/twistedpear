#!/usr/bin/env node
/**
 * Spell-check the prose surface this repository publishes.
 *
 * `doc-audit` already enforces a great deal about these files: that each
 * declares a lifecycle, that `planned` and `live` documents point at each
 * other, that a `historical` one lives under `archive/`, that every link and
 * image resolves. All of it is structure. None of it reads a sentence.
 *
 * The published site is the user guide, the app-authoring guide, twenty-five
 * cookbook samples, the specs, and the docs tree — the parts of the project a
 * reader meets before any code. A typo there is not a build failure, which is
 * exactly why nothing had ever caught one.
 *
 * The dictionary is the interesting half. `project-words.txt` holds the terms
 * no general dictionary knows: protocol names, package names, contributors,
 * coinages like "holepunching" and "unforgeable". Baselining adds words in
 * bulk, so the guard against a real misspelling being blessed forever is that
 * the additions arrive as a reviewable diff — one word per line, sorted, in a
 * file whose every entry is a claim that this spelling is intended.
 *
 * Scope is this repository's own prose. Vendored trees are excluded in
 * `cspell.json`, which is not incidental: the first run reported `vitualenv`
 * from `apps/harness-mobile/ios/Pods/SocketRocket/README.md`, a real typo in
 * someone else's README that this project cannot fix and should not baseline.
 *
 * Usage: node scripts/analysis/spelling.mjs [--write]
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const DICTIONARY = path.join(ROOT, "project-words.txt");
const write = process.argv.includes("--write");

/**
 * The prose surface, as globs handed straight to cspell.
 *
 * Passed as argv rather than expanded by a shell: `STATUS-*.md` and `**` mean
 * different things to zsh, bash, and cspell, and letting the shell win made an
 * earlier version silently check zero files and report a clean tree.
 */
const GLOBS = [
  "README.md",
  "AGENTS.md",
  "LIMITATIONS.md",
  "RELEASE-PLAN.md",
  "STATUS-*.md",
  "docs/**/*.md",
  "guide/**/*.md",
  "authors/**/*.md",
  "cookbook/**/*.md",
  "specs/**/*.md",
];

/**
 * @param {string[]} extra
 * @returns {{stdout: string, status: number | null}}
 */
function cspell(extra) {
  return spawnSync(
    process.execPath,
    [
      "node_modules/cspell/bin.mjs",
      "lint",
      "--no-progress",
      "--no-color",
      ...extra,
      ...GLOBS,
    ],
    { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
}

/** Every unknown word, deduplicated, in the order cspell reports them. */
function unknownWords() {
  const result = cspell(["--unique", "--words-only"]);
  return [
    ...new Set(
      result.stdout
        .split("\n")
        .map((line) => line.trim())
        .filter((line) => line !== ""),
    ),
  ];
}

/** Case-insensitive, so the dictionary sorts the way a reader would expect. */
const collate = (left, right) =>
  left.toLowerCase().localeCompare(right.toLowerCase()) ||
  left.localeCompare(right);

if (write) {
  const words = unknownWords();
  const existing = fs.existsSync(DICTIONARY)
    ? fs
        .readFileSync(DICTIONARY, "utf8")
        .split("\n")
        .filter((line) => line.trim() !== "" && !line.startsWith("#"))
    : [];
  const merged = [...new Set([...existing, ...words])].sort(collate);
  fs.writeFileSync(
    DICTIONARY,
    `# Words this repository uses that no general dictionary knows: protocol\n` +
      `# names, package names, contributors, and coinages. One per line.\n` +
      `#\n` +
      `# Written by \`npm run spelling:baseline\`, which adds in bulk — so this\n` +
      `# diff is the review. Every line is a claim that the spelling is intended.\n` +
      `${merged.join("\n")}\n`,
  );
  console.log(
    `spelling: dictionary holds ${merged.length} word(s), ${merged.length - existing.length} added.`,
  );
  process.exit(0);
}

const report = cspell([]);
const issues = report.stdout
  .split("\n")
  .filter((line) => /- Unknown word/.test(line));

for (const issue of issues) console.error(`  ${issue.trim()}`);

// A word in the dictionary that no longer appears anywhere is reported but does
// not fail: unlike an allowlist, a stale dictionary entry permits nothing that
// was not already intended, and prose churns far too much to make every removed
// term a build failure.
const dictionary = fs.existsSync(DICTIONARY)
  ? fs
      .readFileSync(DICTIONARY, "utf8")
      .split("\n")
      .filter((line) => line.trim() !== "" && !line.startsWith("#"))
  : [];
const used = wordsNeedingDictionary();
const stale = dictionary.filter((word) => !used.has(word.toLowerCase()));
if (stale.length > 0)
  console.warn(
    `spelling: ${stale.length} dictionary word(s) no longer appear in the prose; run npm run spelling:baseline to tighten.`,
  );

/**
 * The words the dictionary has to cover: what cspell reports with an empty one.
 *
 * cspell only ever reports what it *failed* to match, so with the real
 * dictionary loaded its entries are invisible by construction and it cannot say
 * which are still earning their place. Running it against an empty dictionary
 * asks the question directly.
 *
 * A hand-rolled tokenizer was the obvious alternative and is the wrong tool:
 * cspell splits `well-formedness` into two words and folds case its own way, so
 * a regex scan disagreed on nine entries — accented words it could not match,
 * and hyphenated compounds it kept whole. Any reimplementation drifts. This
 * reuses cspell's own splitting, which is the only definition that matters.
 *
 * @returns {Set<string>} lowercased
 */
function wordsNeedingDictionary() {
  const directory = path.join(ROOT, "artifacts", "spelling");
  fs.mkdirSync(directory, { recursive: true });
  const empty = path.join(directory, "empty-dictionary.txt");
  fs.writeFileSync(empty, "");
  const config = JSON.parse(
    fs.readFileSync(path.join(ROOT, "cspell.json"), "utf8"),
  );
  config.dictionaryDefinitions = config.dictionaryDefinitions.map(
    (definition) =>
      definition.name === "twistedpear"
        ? { ...definition, path: empty }
        : definition,
  );
  // Without this, cspell still discovers the real `cspell.json` next to each
  // checked file and merges it in, restoring the very dictionary this run is
  // trying to do without — and reporting a freshly-written dictionary as
  // entirely stale.
  config.noConfigSearch = true;
  const configFile = path.join(directory, "cspell-no-project-words.json");
  fs.writeFileSync(configFile, JSON.stringify(config, null, 2));
  const result = cspell(["--unique", "--words-only", "--config", configFile]);
  return new Set(
    result.stdout
      .split("\n")
      .map((line) => line.trim().toLowerCase())
      .filter((line) => line !== ""),
  );
}

// cspell prints findings on stdout and its summary on stderr.
const checked = /Files checked:\s*(\d+)/.exec(report.stderr)?.[1] ?? "0";
if (checked === "0") {
  console.error(
    "spelling: cspell checked zero files; the globs match nothing, so a clean result means nothing.",
  );
  process.exit(1);
}
console.log(
  `spelling: ${issues.length === 0 ? "PASS" : "FAIL"}; ${checked} files, ${dictionary.length} dictionary words, ${issues.length} unknown word(s).`,
);
process.exit(issues.length === 0 ? 0 : 1);
