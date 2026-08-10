#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { loadWork } from "./lib.mjs";
import { RATCHETS, groupByRule, idFor, verifyFor } from "./ratchets.mjs";
import { addWork } from "./add.mjs";
import { listFlag, parseFlags } from "./render.mjs";

const USAGE = `
npm run work:import [-- options]

  --kind=lint,typed,complexity   which ratchets to read (default: all)
  --top=<n>                      most-frequent rules per ratchet (default 5)
  --min=<n>                      skip rules with fewer entries (default 1)
  --write                        create the items (default: propose only)

Turns baselined ratchet debt into tracked "quality" work, one item per rule.
Grouping by rule rather than by file keeps the count tractable: the lint ratchet
holds thousands of entries but only a handful of distinct rules.
`;

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} root
 * @returns {{ id: string; kind: string; rule: string; count: number; files: number; title: string; verify: string; exists: boolean }[]}
 */
export function proposals(flags, root = repoRoot()) {
  const kinds = listFlag(flags.kind);
  const selected = kinds.length > 0 ? kinds : Object.keys(RATCHETS);
  const top = Number(flags.top ?? 5);
  const min = Number(flags.min ?? 1);
  const { index } = loadWork(root);

  /** @type {ReturnType<typeof proposals>} */
  const out = [];
  for (const kind of selected) {
    for (const { rule, count, files } of groupByRule(kind, root)
      .filter((entry) => entry.count >= min)
      .slice(0, top)) {
      const id = idFor(kind, rule);
      out.push({
        id,
        kind,
        rule,
        count,
        files,
        // No backticks around the rule: the register path audit reads any
        // backticked token containing a slash as a file path, and rule names
        // like @typescript-eslint/no-unused-vars look exactly like one.
        title: `Clear ${count} ${rule} entr${count === 1 ? "y" : "ies"} from the ${kind} ratchet (${files} file${files === 1 ? "" : "s"})`,
        verify: verifyFor(kind, rule),
        exists: index.has(id),
      });
    }
  }
  return out;
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    console.log(USAGE.trim());
    return;
  }

  const candidates = proposals(flags);
  const fresh = candidates.filter((entry) => !entry.exists);

  if (flags.json) {
    console.log(JSON.stringify(candidates, null, 2));
    return;
  }

  if (!flags.write) {
    console.log(`${fresh.length} item(s) would be created:\n`);
    for (const entry of candidates) {
      const mark = entry.exists ? "exists " : "new    ";
      console.log(`${mark}${entry.id}`);
      console.log(`         ${entry.title}`);
    }
    console.log("\npass --write to create them");
    return;
  }

  let created = 0;
  for (const entry of fresh) {
    addWork(
      {
        id: entry.id,
        type: "quality",
        title: entry.title,
        verify: entry.verify,
        notes: `Imported from ${RATCHETS[entry.kind].file}: ${entry.count} baselined ${entry.rule} entries across ${entry.files} files.`,
      },
      repoRoot(),
    );
    console.log(`added ${entry.id}`);
    created++;
  }
  console.log(
    `\ncreated ${created} item(s); ${candidates.length - fresh.length} already existed`,
  );
}

if (import.meta.url === `file://${process.argv[1]}`) main();
