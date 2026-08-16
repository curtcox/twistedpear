import path from "node:path";

/**
 * ANSI colour, which has to be stripped rather than merely asked for.
 *
 * The environment below sets `NO_COLOR=1` and `FORCE_COLOR=0`, and ruff still
 * coloured its output: its terminal-detection reads *any* `FORCE_COLOR`,
 * including `0`, as "colour was forced", and that beats `NO_COLOR`. What
 * reached the ratchet was `ruff:<esc>[1m<esc>[94m--> launcher.py:#:#`, which is
 * wrong twice. The digits inside `<esc>[94m` go through the line-number
 * normaliser like any other number, so a change of palette rewrites every key;
 * and the escape at the start of `E402 Module level import not at top of file`
 * stops that line matching the rule-code pattern at all, so the baseline
 * recorded where a finding was without recording what it was. `--color never`
 * fixes ruff specifically; stripping fixes whichever tool does this next.
 */
export const ANSI = new RegExp(
  `${String.fromCharCode(27)}\\[[0-9;?]*[ -/]*[@-~]`,
  "g",
);

/** The line an analyzer starts a diagnostic on. */
export const DIAGNOSTIC =
  /^(?:[A-Z]\d{3}\b|Would reformat:|error(?:\[.*\])?:|warning:)|\.(?:kt|swift|py|rs):\d+(?::\d+)?:|:\d+(?::\d+)?:\s+(?:error|warning):/i;

/**
 * The location line ruff and clippy print *under* a diagnostic rather than on
 * it. Recorded as an entry of its own it says where a finding is without saying
 * what it is, while the line above says what without saying where — so four
 * E402s across three files came out as one key repeated with an occurrence
 * index, and inserting one in an early file renumbered the rest and read as new.
 */
export const LOCATION = /^-->\s+(\S+)\s*$/;

/**
 * Ratchet keys for one analyzer run.
 *
 * Line numbers are normalised away because reformatting a file moves every one
 * of them and no findings; two findings that normalise alike are told apart by
 * an occurrence index, which is why the key has to carry the file.
 *
 * @param {string} command
 * @param {string} output
 * @param {Map<string, number>} occurrences shared across runs
 * @param {string} root absolute paths under this are stripped from the key
 * @returns {string[]}
 */
export function findingsFrom(command, output, occurrences, root) {
  const found = [];
  let pending = null;
  const flush = () => {
    if (pending === null) return;
    const normalized = `${command}:${pending.replace(/\d+(?:\.\d+)?/g, "#")}`;
    const occurrence = (occurrences.get(normalized) ?? 0) + 1;
    occurrences.set(normalized, occurrence);
    found.push(`${normalized}:occurrence-${occurrence}`);
    pending = null;
  };

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line
      .replaceAll(ANSI, "")
      .trim()
      .replaceAll(`${root}${path.sep}`, "");
    const location = LOCATION.exec(trimmed);
    if (location !== null && pending !== null) {
      pending = `${pending} ${location[1]}`;
      flush();
    } else if (DIAGNOSTIC.test(trimmed)) {
      flush();
      pending = trimmed;
    }
  }
  flush();
  return found;
}
