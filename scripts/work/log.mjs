#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { HISTORY_FILE } from "./lib.mjs";
import { readJournal } from "./journal.mjs";
import { listFlag, parseFlags } from "./render.mjs";

const USAGE = `
npm run work:log [-- options]

  --since=<date|rev>   only events at or after a date (YYYY-MM-DD) or git revision
  --id=<ID>            only events for one item
  --type=<t,t>         only events for these classes
  --action=<a,a>       add | close | reopen | retype | requires | resource
  --unverified         only closes recorded without running their verification
  --limit=<n>          default 20; --limit=0 for everything
  --json               machine-readable
`;

/**
 * Resolve --since to a date. A git revision is resolved to its commit date, so
 * "what changed since the release branch point" and "what changed since Monday"
 * are the same query.
 * @param {string} since
 * @param {string} root
 * @returns {string}
 */
export function resolveSince(since, root = repoRoot()) {
  if (/^\d{4}-\d{2}-\d{2}/.test(since)) return since;
  const result = spawnSync("git", ["log", "-1", "--format=%cI", since], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout.trim()) {
    throw new Error(`--since=${since} is neither a date nor a git revision`);
  }
  return result.stdout.trim();
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} root
 * @returns {import("./journal.mjs").JournalEvent[]}
 */
export function selectEvents(flags, root = repoRoot()) {
  const types = listFlag(flags.type);
  const actions = listFlag(flags.action);
  const since = flags.since ? resolveSince(String(flags.since), root) : "";

  let events = readJournal(root).filter((event) => !event.malformed);
  if (since) events = events.filter((event) => event.at >= since);
  if (flags.id)
    events = events.filter((event) => event.id === String(flags.id));
  if (types.length > 0) events = events.filter((e) => types.includes(e.type));
  if (actions.length > 0)
    events = events.filter((e) => actions.includes(e.action));
  if (flags.unverified === true) {
    events = events.filter((e) => e.action === "close" && e.verified === false);
  }

  events.reverse();
  const limit = flags.limit === undefined ? 20 : Number(flags.limit);
  return limit > 0 ? events.slice(0, limit) : events;
}

/**
 * @param {import("./journal.mjs").JournalEvent} event
 * @returns {string}
 */
function describe(event) {
  const when = event.at.slice(0, 16).replace("T", " ");
  const head = `${when}  ${event.action.padEnd(8)} ${event.id} (${event.actor})`;
  if (event.action === "retype") {
    return `${head}\n${" ".repeat(18)}${event.from} -> ${event.to}: ${event.reason}`;
  }
  if (event.action !== "close") return head;
  if (event.verified === false) {
    return `${head}\n${" ".repeat(18)}unverified — ${event.reason}`;
  }
  if (event.verifiedFrom === "log") {
    return `${head}\n${" ".repeat(18)}verified from log ${event.log} (${event.digest?.slice(0, 19)}…)`;
  }
  const minutes = Math.round((event.durationMs ?? 0) / 60000);
  return `${head}\n${" ".repeat(18)}verified in ${minutes} min — ${event.verify}`;
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    console.log(USAGE.trim());
    return;
  }
  try {
    const events = selectEvents(flags);
    if (flags.json) {
      console.log(JSON.stringify(events, null, 2));
      return;
    }
    if (events.length === 0) {
      console.log(`No matching events in ${HISTORY_FILE}.`);
      return;
    }
    console.log(`${events.length} event(s), newest first:\n`);
    for (const event of events) console.log(describe(event));
  } catch (error) {
    console.error(`work:log failed — ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
