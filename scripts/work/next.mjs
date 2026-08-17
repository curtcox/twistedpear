#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { isActionable, loadWork, nextAttention, ranked } from "./lib.mjs";
import { auditNudge } from "./audit-clock.mjs";
import {
  detail,
  explain,
  idWidth,
  listFlag,
  oneLine,
  parseFlags,
  startThen,
} from "./render.mjs";

/**
 * @param {string} root
 * @param {{ type?: string[] }} [options]
 * @returns {import("./lib.mjs").WorkItem[]}
 */
export function actionableWork(root = repoRoot(), options = {}) {
  const { items } = loadWork(root);
  let candidates = items.filter(isActionable);
  if (options.type?.length) {
    candidates = candidates.filter((item) => options.type.includes(item.type));
  }
  return ranked(candidates);
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const all = flags.all === true;
  const candidates = actionableWork(repoRoot(), { type: listFlag(flags.type) });

  if (flags.json) {
    if (all) {
      console.log(JSON.stringify(candidates, null, 2));
      return;
    }
    const attention = nextAttention(candidates);
    console.log(JSON.stringify(attention, null, 2));
    return;
  }

  if (candidates.length === 0) {
    console.log("Nothing is unblocked right now.");
    console.log(
      "Run `npm run work:list` to see what everything is waiting on.",
    );
  } else if (all) {
    console.log(`${candidates.length} item(s) unblocked, best first:\n`);
    const width = idWidth(candidates);
    for (const item of candidates) console.log(oneLine(item, width));
  } else {
    const attention = nextAttention(candidates);
    const pick = attention.then ?? attention.pick;
    if (attention.start.length > 0) {
      for (const line of startThen(attention.start, pick)) console.log(line);
      console.log("");
    }
    if (pick) {
      for (const line of detail(pick)) console.log(line);
      console.log("");
      const runnerUp = candidates.find((item) => item.id !== pick.id);
      for (const line of explain(pick, runnerUp)) console.log(line);
    }
    console.log(
      `\n${candidates.length - 1} other unblocked item(s): npm run work:unblocked`,
    );
  }

  // The audit has no scheduler behind it; this is the reminder that makes it
  // periodic, on the command every session already runs.
  const nudge = auditNudge(repoRoot());
  if (nudge) console.log(`\n${nudge}`);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
