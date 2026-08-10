#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { TYPES, loadMetadata, loadWork, saveMetadata } from "./lib.mjs";
import { appendEvent } from "./journal.mjs";
import { parseFlags } from "./render.mjs";

const USAGE = `
npm run work:retype -- --id=<ID> --type=<${TYPES.join("|")}> --reason="<why>"

Reclassifying an item changes where it lands in work:next, so the change is
journaled with its reason rather than being a silent edit of work/metadata.json.
`;

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} root
 * @returns {{ id: string; from: string; to: string }}
 */
export function retypeWork(flags, root = repoRoot()) {
  const id = String(flags.id ?? "");
  const type = String(flags.type ?? "");
  const reason = String(flags.reason ?? "");

  if (!id) throw new Error("--id is required");
  if (!TYPES.includes(type)) {
    throw new Error(`--type must be one of ${TYPES.join(", ")}`);
  }
  if (!reason) {
    throw new Error(
      "--reason is required — say why the classification changed",
    );
  }

  const { index } = loadWork(root);
  const item = index.get(id);
  if (!item) throw new Error(`${id} is not in any register`);
  if (item.derived) {
    throw new Error(
      `${id} is derived from ${item.file} — a red gate cannot be reclassified into a lower priority. Fix the gate, or record a bounded exemption with npm run checks:waive.`,
    );
  }
  if (item.type === type) throw new Error(`${id} is already ${type}`);

  const metadata = loadMetadata(root);
  metadata.items[id] = { ...metadata.items[id], type };
  saveMetadata(metadata, root);

  appendEvent(
    { action: "retype", id, from: item.type, to: type, type, reason },
    root,
  );

  return { id, from: item.type, to: type };
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help || process.argv.length <= 2) {
    console.log(USAGE.trim());
    return;
  }
  try {
    const { id, from, to } = retypeWork(flags);
    console.log(`${id}: ${from} -> ${to}`);
    console.log("next: npm run work:next");
  } catch (error) {
    console.error(`work:retype failed — ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
