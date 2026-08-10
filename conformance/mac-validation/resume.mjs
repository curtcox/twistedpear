import { existsSync, readFileSync } from "node:fs";

/**
 * Plan-duration Stage 8 runs for roughly eleven days, so it has to survive being
 * stopped. The eight soaks are independent and serial, and every command log
 * ends with an explicit exit marker, so "already finished" is a property of the
 * log directory rather than something that needs new bookkeeping.
 *
 * Only whole commands are resumable. The duration-based soaks are continuous
 * wall-clock runs (`while Date.now() - started < DURATION_MS`) and the criterion
 * is uninterrupted uptime, so a partially elapsed soak restarts from zero — that
 * is a real cost, not a bug to paper over.
 */

/**
 * Soaks whose prerequisites are missing print `<name>: skipped (...)` and exit
 * 0 — link-soak and transport-node-soak both do this without INTEROP=1 and a
 * running Docker. Exit 0 alone therefore does not mean the soak ran, and
 * treating a skip as a pass would close a release gate on evidence that the
 * work never happened.
 */
const SKIP_MARKER = /^[\w/-]+: skipped\b/m;

/**
 * @param {string} text
 * @returns {boolean}
 */
export function wasSkipped(text) {
  return SKIP_MARKER.test(text);
}

/**
 * @param {string} logPath
 * @returns {number | null} exit status, or null if the log is absent or the run
 *   never finished (killed mid-command, so no marker was ever written).
 */
export function recordedExit(logPath) {
  if (!existsSync(logPath)) return null;
  const match = /\[mac-validation\] exit: (\S+)\s*$/m.exec(
    readFileSync(logPath, "utf8"),
  );
  if (!match) return null;
  const status = Number.parseInt(match[1], 10);
  return Number.isNaN(status) ? null : status;
}

/**
 * A skipped soak is deliberately *not* "already passed": fix the prerequisite
 * and `--resume` will run it rather than stepping over it.
 * @param {string} logPath
 * @returns {boolean}
 */
export function alreadyPassed(logPath) {
  if (!existsSync(logPath)) return false;
  if (wasSkipped(readFileSync(logPath, "utf8"))) return false;
  return recordedExit(logPath) === 0;
}

/**
 * Describe what a resumed run would skip, for the banner printed at startup.
 * @param {{ logPath: string; label: string }[]} entries
 * @returns {{ skipped: string[]; pending: string[] }}
 */
export function resumePlan(entries) {
  /** @type {string[]} */
  const skipped = [];
  /** @type {string[]} */
  const pending = [];
  for (const entry of entries) {
    if (alreadyPassed(entry.logPath)) skipped.push(entry.label);
    else pending.push(entry.label);
  }
  return { skipped, pending };
}
