#!/usr/bin/env node
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { TYPES, loadMetadata, loadWork, saveMetadata } from "./lib.mjs";
import { appendRow, formatFiles, readDoc, writeDoc } from "./table.mjs";
import { appendEvent } from "./journal.mjs";
import { listFlag, parseFlags } from "./render.mjs";

const DEFAULT_REGISTER = "STATUS-SOFTWARE.md";
const DEFAULT_SECTION = "Backlog";

const USAGE = `
npm run work:add -- --id=<ID> --type=<${TYPES.join("|")}> --title="<what>" [options]

  --verify="<command>"   command that proves the work is done (required)
  --requires=A,res:b     prerequisites: item ids and/or res: resource tokens
  --register=<file>      register file (default ${DEFAULT_REGISTER})
  --section=<heading>    table heading within it (default "${DEFAULT_SECTION}")
  --evidence="<text>"    initial evidence cell (default "—")
  --notes="<text>"       free-form note stored in work/metadata.json
  --unattended           this is a wait (a soak); work:next starts it, then names the hands-on item
`;

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} root
 * @returns {{ id: string; register: string }}
 */
export function addWork(flags, root = repoRoot()) {
  const id = String(flags.id ?? "");
  const type = String(flags.type ?? "");
  const title = String(flags.title ?? "");
  const verify = String(flags.verify ?? "");
  const register = String(flags.register ?? DEFAULT_REGISTER);
  const section = String(flags.section ?? DEFAULT_SECTION);
  const requires = listFlag(flags.requires);

  if (!id) throw new Error("--id is required");
  // Both halves of the derived namespace are closed here as well as in
  // validate.mjs, so the refusal arrives when the command is typed rather than
  // at the next work:check with a half-written entry already on disk.
  if (id.startsWith("GATE-")) {
    throw new Error(
      "GATE-* ids are derived from checks.json — a red gate is tracked by fixing it, not by filing a row",
    );
  }
  if (type === "broken-gate") {
    throw new Error(
      "broken-gate is derived from checks.json and cannot be assigned by hand",
    );
  }
  if (!TYPES.includes(type)) {
    throw new Error(`--type must be one of ${TYPES.join(", ")}`);
  }
  if (!title) throw new Error("--title is required");
  if (!verify) {
    throw new Error(
      "--verify is required — work:done will refuse to close an item with no way to check it",
    );
  }

  const { index } = loadWork(root);
  if (index.has(id)) {
    const existing = index.get(id);
    throw new Error(
      `${id} already exists in ${existing.file}:${existing.line}`,
    );
  }
  for (const ref of requires) {
    if (ref.startsWith("res:")) continue;
    if (!index.has(ref)) throw new Error(`prerequisite ${ref} does not exist`);
  }

  const text = appendRow(
    readDoc(root, register),
    {
      ID: id,
      Status: "open",
      Item: title,
      Evidence: String(flags.evidence ?? "—"),
      "Current evidence": String(flags.evidence ?? "—"),
      Verify: `\`${verify}\``,
      "Completion criterion": `\`${verify}\``,
    },
    section,
  );
  writeDoc(root, register, text);

  const metadata = loadMetadata(root);
  metadata.items[id] = {
    type,
    requires,
    verify,
    added: new Date().toISOString().slice(0, 10),
    ...(flags.notes ? { notes: String(flags.notes) } : {}),
    ...(flags.unattended === true ? { unattended: true } : {}),
  };
  saveMetadata(metadata, root);

  formatFiles([register], root);
  appendEvent(
    {
      action: "add",
      id,
      to: "open",
      type,
      verify,
      ...(requires.length ? { requires } : {}),
    },
    root,
  );

  return { id, register };
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help || process.argv.length <= 2) {
    console.log(USAGE.trim());
    return;
  }
  try {
    const { id, register } = addWork(flags);
    console.log(`added ${id} to ${register} (status: open)`);
    console.log(
      "run `npm run work:check` to confirm the registry is consistent",
    );
  } catch (error) {
    console.error(`work:add failed — ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
