/**
 * Heartbeat for long soaks.
 *
 * A plan-duration soak writes nothing to its log between start and finish, so a
 * 72 h run is indistinguishable from a hung one for three days. These emit a
 * single parseable line on a fixed interval; scripts/release/watch-soaks.mjs
 * turns them into percentage and ETA.
 *
 * Format (one line, stable — the watcher parses it):
 *   [soak] progress <done>/<total> <unit> (<pct>%) elapsed <ms> eta <ISO>
 */

const DEFAULT_INTERVAL_MS = 5 * 60 * 1000;

/**
 * @param {object} options
 * @param {number} options.total total work: milliseconds, or a cycle count
 * @param {"ms" | "cycles"} [options.unit]
 * @param {number} [options.intervalMs]
 * @param {(line: string) => void} [options.write]
 * @param {() => number} [options.now]
 * @returns {{ report: (done: number) => void; done: () => void }}
 */
export function soakProgress(options) {
  const unit = options.unit ?? "ms";
  const now = options.now ?? Date.now;
  const write = options.write ?? ((line) => console.log(line));
  const intervalMs = Number.parseInt(
    process.env.SOAK_PROGRESS_INTERVAL_MS ?? "",
    10,
  );
  const every =
    Number.isFinite(intervalMs) && intervalMs > 0
      ? intervalMs
      : (options.intervalMs ?? DEFAULT_INTERVAL_MS);

  const started = now();
  let lastReport = 0;

  /**
   * Safe to call in a tight loop: it only writes when the interval has elapsed.
   * @param {number} done
   */
  function report(done) {
    const at = now();
    if (lastReport !== 0 && at - lastReport < every) return;
    lastReport = at;
    write(formatProgress({ done, total: options.total, unit, started, at }));
  }

  function done() {
    write(
      formatProgress({
        done: options.total,
        total: options.total,
        unit,
        started,
        at: now(),
      }),
    );
  }

  return { report, done };
}

/**
 * @param {{ done: number; total: number; unit: string; started: number; at: number }} state
 * @returns {string}
 */
export function formatProgress(state) {
  const fraction = state.total > 0 ? Math.min(state.done / state.total, 1) : 0;
  const percent = (fraction * 100).toFixed(1);
  const elapsed = state.at - state.started;
  // Project from observed rate rather than from the nominal duration: a cycle
  // soak that is running slow should report the ETA it is actually tracking to.
  const remaining =
    fraction > 0 ? Math.max(elapsed / fraction - elapsed, 0) : NaN;
  const eta = Number.isFinite(remaining)
    ? new Date(state.at + remaining).toISOString()
    : "unknown";
  return `[soak] progress ${Math.round(state.done)}/${Math.round(state.total)} ${state.unit} (${percent}%) elapsed ${elapsed} eta ${eta}`;
}

/**
 * @param {string} text a soak log
 * @returns {{ done: number; total: number; unit: string; percent: number; elapsedMs: number; eta: string } | null}
 */
export function lastProgress(text) {
  const matches = [
    ...text.matchAll(
      /\[soak\] progress (\d+)\/(\d+) (\w+) \(([\d.]+)%\) elapsed (\d+) eta (\S+)/g,
    ),
  ];
  const last = matches.at(-1);
  if (!last) return null;
  return {
    done: Number(last[1]),
    total: Number(last[2]),
    unit: last[3],
    percent: Number(last[4]),
    elapsedMs: Number(last[5]),
    eta: last[6],
  };
}
