/** Interactive-compile bar for Guida P5.0. Times are wall-clock milliseconds. */
export const PARSE_USABLE_MS = 5_000;
export const COMPILE_USABLE_MS = 10_000;
export const COMPILE_SLOW_MS = 30_000;
export const HEAP_USABLE_BYTES = 512 * 1024 * 1024;

/**
 * @param {{
 *   available?: boolean,
 *   coldParseMs?: number,
 *   helloCompileMs?: number,
 *   peakHeapBytes?: number,
 *   error?: string,
 * }} sample
 * @returns {"usable" | "slow" | "unusable" | "unavailable"}
 */
export function verdictFor(sample) {
  if (sample.available === false) return "unavailable";
  if (sample.error && sample.available !== true) return "unavailable";
  const parseMs = sample.coldParseMs;
  const compileMs = sample.helloCompileMs;
  const heap = sample.peakHeapBytes;
  if (
    typeof parseMs !== "number" ||
    typeof compileMs !== "number" ||
    !Number.isFinite(parseMs) ||
    !Number.isFinite(compileMs)
  ) {
    return "unavailable";
  }
  if (compileMs > COMPILE_SLOW_MS) return "unusable";
  if (typeof heap === "number" && heap > HEAP_USABLE_BYTES) return "unusable";
  if (parseMs > PARSE_USABLE_MS || compileMs > COMPILE_USABLE_MS) return "slow";
  return "usable";
}

export function fallbackFor(verdict) {
  if (verdict === "usable") return "local";
  if (verdict === "slow") return "local-with-wait";
  return "peer-delegate";
}
