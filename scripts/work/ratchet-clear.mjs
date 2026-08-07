#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { RATCHETS, readEntries } from "./ratchets.mjs";
import { parseFlags } from "./render.mjs";

/**
 * Verification for imported ratchet items: the rule has no remaining baselined
 * entries. Pairing this with the ratchet's own check command is what makes it
 * meaningful — the check proves no new violations, this proves the old ones are
 * gone and the baseline was re-recorded.
 * @param {string} kind
 * @param {string} rule
 * @param {string} root
 * @returns {{ count: number; files: string[] }}
 */
export function remaining(kind, rule, root = repoRoot()) {
  const matches = readEntries(kind, root).filter(
    (entry) => entry.rule === rule,
  );
  return {
    count: matches.length,
    files: [...new Set(matches.map((m) => m.file))],
  };
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const kind = String(flags.kind ?? "");
  const rule = String(flags.rule ?? "");

  if (!RATCHETS[kind] || !rule) {
    console.error(
      `usage: node scripts/work/ratchet-clear.mjs --kind=<${Object.keys(RATCHETS).join("|")}> --rule=<eslint-rule>`,
    );
    process.exit(2);
  }

  const { count, files } = remaining(kind, rule);
  if (count === 0) {
    console.log(`${kind} ratchet is clear of ${rule}`);
    return;
  }
  console.error(
    `${kind} ratchet still baselines ${count} ${rule} entr${count === 1 ? "y" : "ies"} across ${files.length} file(s):`,
  );
  for (const file of files.slice(0, 10)) console.error(`  ${file}`);
  if (files.length > 10) console.error(`  ... and ${files.length - 10} more`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
