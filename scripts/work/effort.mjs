import { existsSync } from "node:fs";
import { join } from "node:path";
import { RATCHETS, groupByRule } from "./ratchets.mjs";

/** Verify commands written by `work:import` for a per-rule ratchet item. */
const CLEAR = /ratchet-clear\.mjs --kind=(\S+) --rule=(\S+)/;

/**
 * Live remaining-file counts for every baselined ESLint-family rule.
 * @param {string} root
 * @returns {Map<string, number>}
 */
export function ratchetFileCounts(root) {
  /** @type {Map<string, number>} */
  const counts = new Map();
  for (const kind of Object.keys(RATCHETS)) {
    if (!existsSync(join(root, RATCHETS[kind].file))) continue;
    for (const { rule, files } of groupByRule(kind, root)) {
      counts.set(`${kind}:${rule}`, files);
    }
  }
  return counts;
}

/**
 * Smaller is easier. Ratchet-imported items use the live file count for their
 * rule (0 once the baseline is clear). Everything else is 1, so unknown-size
 * work is not penalised relative to a 100-file campaign.
 * @param {{ verify?: string }} item
 * @param {Map<string, number>} counts
 * @returns {number}
 */
export function effortOf(item, counts) {
  const match = CLEAR.exec(item.verify ?? "");
  if (!match) return 1;
  return counts.get(`${match[1]}:${match[2]}`) ?? 0;
}
