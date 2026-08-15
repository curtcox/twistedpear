/**
 * Persisted fuzz counterexamples.
 *
 * A crash the fuzzer found in CI used to be gone on the next run: the case was
 * generated from a seed nobody recorded, reported in a log nobody kept, and the
 * next run drew different bytes. That makes a fuzzer a lottery rather than a
 * regression suite.
 *
 * Every case that ever failed is written here as a committed vector and replayed
 * first on every subsequent run, before any new random case is drawn. The file
 * is plain JSON so a counterexample can also be read by a person.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

/**
 * @typedef {{
 *   inputHex: string,
 *   target: string,
 *   operators?: readonly string[],
 *   error?: string,
 *   firstSeen?: string,
 * }} Counterexample
 */

const CORPUS_PATH = resolve("conformance/vectors/fuzz-regressions.json");

export function corpusPath() {
  return CORPUS_PATH;
}

/** @returns {Counterexample[]} */
export function loadCorpus() {
  if (!existsSync(CORPUS_PATH)) return [];
  try {
    const parsed = JSON.parse(readFileSync(CORPUS_PATH, "utf8"));
    return parsed.cases ?? [];
  } catch {
    return [];
  }
}

/**
 * Add a counterexample, keyed on target plus input so a case is recorded once.
 * Returns true when the corpus changed.
 *
 * Sorted on write for the same reason census.json is: an unstable order turns
 * every regeneration into a large diff that hides the one line that matters.
 */
/**
 * @param {Counterexample} example
 * @returns {boolean}
 */
export function recordCounterexample(example) {
  const cases = loadCorpus();
  const key = (entry) => `${entry.target}:${entry.inputHex}`;
  if (cases.some((entry) => key(entry) === key(example))) return false;

  cases.push({ firstSeen: new Date().toISOString(), ...example });
  cases.sort((left, right) => key(left).localeCompare(key(right)));
  mkdirSync(dirname(CORPUS_PATH), { recursive: true });
  writeFileSync(
    CORPUS_PATH,
    `${JSON.stringify({ version: 1, cases }, null, 2)}\n`,
  );
  return true;
}

/**
 * @param {string} target
 * @returns {Counterexample[]}
 */
export function corpusFor(target) {
  return loadCorpus().filter((entry) => entry.target === target);
}
