#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { isActionable, loadWork, ranked } from "./lib.mjs";
import { idWidth, listFlag, oneLine, parseFlags } from "./render.mjs";

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} root
 * @returns {import("./lib.mjs").WorkItem[]}
 */
export function selectWork(flags, root = repoRoot()) {
  const { items } = loadWork(root);
  const statuses = listFlag(flags.status);
  const types = listFlag(flags.type);
  const registers = listFlag(flags.register);

  return ranked(
    items.filter((item) => {
      if (statuses.length > 0) {
        if (!statuses.includes(item.status)) return false;
      } else if (item.status === "done") {
        return false;
      }
      if (types.length > 0 && !types.includes(item.type)) return false;
      if (
        registers.length > 0 &&
        !registers.some((name) =>
          item.file.toLowerCase().includes(name.toLowerCase()),
        )
      ) {
        return false;
      }
      if (flags.blocked === true && item.blockers.length === 0) return false;
      if (flags.ready === true && item.blockers.length > 0) return false;
      return true;
    }),
  );
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  const items = selectWork(flags);

  if (flags.json) {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  const ready = items.filter(isActionable);
  const blocked = items.filter(
    (item) => item.status === "open" && item.blockers.length > 0,
  );
  console.log(
    `${items.length} item(s) remaining — ${ready.length} ready, ${blocked.length} blocked, ${items.length - ready.length - blocked.length} not open\n`,
  );

  const width = idWidth(items);
  for (const item of items) {
    console.log(oneLine(item, width));
    for (const blocker of item.blockers) {
      console.log(`${" ".repeat(8)}  ↳ ${blocker.reason}`);
    }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
