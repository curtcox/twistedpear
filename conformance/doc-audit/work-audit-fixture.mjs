/** Fixed clock, so every threshold in the audit is exercised by construction. */
export const NOW = Date.parse("2026-06-01T00:00:00Z");
const DAY = 86400000;

/** @param {number} days @param {number} from @returns {string} ISO-8601 */
export const ago = (days, from = NOW) =>
  new Date(from - days * DAY).toISOString();

/** @param {number} days @param {number} from @returns {string} YYYY-MM-DD */
export const dayAgo = (days, from = NOW) => ago(days, from).slice(0, 10);

/** @param {{ check: string }[]} findings @returns {string[]} */
export const checks = (findings) =>
  findings.map((finding) => finding.check).sort();

/** @param {{ check: string }[]} findings @param {string} check */
export const only = (findings, check) =>
  findings.filter((finding) => finding.check === check);
