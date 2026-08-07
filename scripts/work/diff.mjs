#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { parseRegisterRows } from "../doc-audit/register.mjs";
import { REGISTER_FILES } from "../doc-audit/paths.mjs";
import {
  METADATA_FILE,
  RESOURCES_FILE,
  loadMetadata,
  loadResources,
  loadWork,
} from "./lib.mjs";
import { parseFlags } from "./render.mjs";

const USAGE = `
npm run work:diff [-- options]

  --since=<rev>   git revision to compare against (default HEAD)
  --json          machine-readable

Reconstructs the work registry from committed content and diffs it against the
working tree. Deliberately independent of work/history.jsonl, so the two can be
compared against each other.
`;

/**
 * @param {string} root
 * @param {string} rev
 * @param {string} file
 * @returns {string | null}
 */
function showAtRev(root, rev, file) {
  const result = spawnSync("git", ["show", `${rev}:${file}`], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return result.status === 0 ? result.stdout : null;
}

/**
 * @param {string} root
 * @param {string} rev
 * @returns {{ items: Map<string, { status: string; type: string; requires: string[] }>; resources: Map<string, boolean> }}
 */
export function snapshotAt(root, rev) {
  /** @type {Map<string, { status: string; type: string; requires: string[] }>} */
  const items = new Map();

  for (const file of REGISTER_FILES) {
    const text = showAtRev(root, rev, file);
    if (text === null) continue;
    for (const row of parseRegisterRows(text, file)) {
      items.set(row.id, { status: row.status, type: "", requires: [] });
    }
  }

  const metaText = showAtRev(root, rev, METADATA_FILE);
  const metadata = metaText ? JSON.parse(metaText) : { items: {} };
  for (const [id, entry] of Object.entries(metadata.items ?? {})) {
    const item = items.get(id);
    if (!item) continue;
    item.type = entry.type ?? "";
    item.requires = entry.requires ?? [];
  }

  const resourceText = showAtRev(root, rev, RESOURCES_FILE);
  const resourceFile = resourceText
    ? JSON.parse(resourceText)
    : { resources: {} };
  /** @type {Map<string, boolean>} */
  const resources = new Map(
    Object.entries(resourceFile.resources ?? {}).map(([token, entry]) => [
      token,
      Boolean(entry.available),
    ]),
  );

  return { items, resources };
}

/**
 * @param {string} root
 * @returns {ReturnType<typeof snapshotAt>}
 */
function snapshotNow(root) {
  const { items } = loadWork(root);
  const metadata = loadMetadata(root);
  return {
    items: new Map(
      items.map((item) => [
        item.id,
        {
          status: item.status,
          type: item.type,
          requires: metadata.items[item.id]?.requires ?? [],
        },
      ]),
    ),
    resources: new Map(
      Object.entries(loadResources(root).resources ?? {}).map(
        ([token, entry]) => [token, Boolean(entry.available)],
      ),
    ),
  };
}

/**
 * @param {string} rev
 * @param {string} root
 * @returns {{ kind: string; id: string; detail: string }[]}
 */
export function diffSince(rev, root = repoRoot()) {
  const before = snapshotAt(root, rev);
  const after = snapshotNow(root);
  /** @type {{ kind: string; id: string; detail: string }[]} */
  const changes = [];

  for (const [id, now] of after.items) {
    const then = before.items.get(id);
    if (!then) {
      changes.push({
        kind: "added",
        id,
        detail: `${now.type} (${now.status})`,
      });
      continue;
    }
    if (then.status !== now.status) {
      changes.push({
        kind:
          now.status === "done"
            ? "closed"
            : then.status === "done"
              ? "reopened"
              : "status",
        id,
        detail: `${then.status} -> ${now.status}`,
      });
    }
    if (then.type !== now.type) {
      changes.push({
        kind: "retyped",
        id,
        detail: `${then.type || "untyped"} -> ${now.type || "untyped"}`,
      });
    }
    const wasRequires = then.requires.join(",");
    const nowRequires = now.requires.join(",");
    if (wasRequires !== nowRequires) {
      changes.push({
        kind: "requires",
        id,
        detail: `[${wasRequires}] -> [${nowRequires}]`,
      });
    }
  }

  for (const id of before.items.keys()) {
    if (!after.items.has(id)) {
      changes.push({
        kind: "removed",
        id,
        detail: "no longer in any register",
      });
    }
  }

  for (const [token, available] of after.resources) {
    const was = before.resources.get(token);
    if (was === undefined) {
      changes.push({
        kind: "resource",
        id: `res:${token}`,
        detail: `declared (${available ? "available" : "unavailable"})`,
      });
    } else if (was !== available) {
      changes.push({
        kind: "resource",
        id: `res:${token}`,
        detail: available ? "became available" : "became unavailable",
      });
    }
  }

  return changes;
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help) {
    console.log(USAGE.trim());
    return;
  }
  const rev = String(flags.since ?? "HEAD");
  try {
    const changes = diffSince(rev);
    if (flags.json) {
      console.log(JSON.stringify(changes, null, 2));
      return;
    }
    if (changes.length === 0) {
      console.log(`No work-registry changes since ${rev}.`);
      return;
    }
    console.log(`${changes.length} change(s) since ${rev}:\n`);
    for (const change of changes) {
      console.log(
        `${change.kind.padEnd(9)} ${change.id.padEnd(15)} ${change.detail}`,
      );
    }
  } catch (error) {
    console.error(`work:diff failed — ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
