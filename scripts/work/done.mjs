#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { loadMetadata, loadWork, saveMetadata } from "./lib.mjs";
import {
  appendRow,
  byColumn,
  formatFiles,
  readDoc,
  removeRow,
  setCell,
  writeDoc,
} from "./table.mjs";
import { appendEvent } from "./journal.mjs";
import { auditNudge } from "./audit-clock.mjs";
import { listFlag, parseFlags } from "./render.mjs";

/**
 * Where a closed row belongs. STATUS-SOFTWARE.md is documented as holding only
 * open work, so its rows move to the evidence archive. STATUS-HARDWARE.md rows
 * index prose runbooks that stay where they are, and RELEASE-PLAN gates are
 * statements inside the plan — both flip in place.
 */
const CLOSE_POLICY = {
  "STATUS-SOFTWARE.md": "STATUS-COMPLETE.md",
  "STATUS-HARDWARE.md": null,
  "STATUS-COMPLETE.md": null,
  "STATUS-COMPLETE-PHASES.md": null,
  "STATUS-COMPLETE-PIPELINE.md": null,
  "STATUS-COMPLETE-APPS.md": null,
  "RELEASE-PLAN.md": null,
};

const USAGE = `
npm run work:done -- --id=<ID> --evidence=<path,path> [options]

  --verify="<command>"     override the recorded verification command
  --from-log=<path>        accept an evidence log produced by an earlier run
  --allow-unverified       skip verification; requires --reason
  --reason="<text>"        why verification was not executed
  --no-move                close in place instead of moving the row
`;

/**
 * @param {string} token
 * @returns {string}
 */
function evidenceCell(token) {
  if (/^https?:/.test(token) || token.startsWith("[")) return token;
  return `\`${token}\``;
}

/**
 * @param {string} rel
 * @param {string} root
 * @param {boolean} requireContent an ingested log *is* the evidence, so it must
 *   have some; a command that succeeds silently may legitimately log nothing.
 * @returns {string}
 */
function fingerprint(rel, root, requireContent) {
  const path = join(root, rel);
  if (!existsSync(path)) throw new Error(`evidence log ${rel} does not exist`);
  const bytes = readFileSync(path);
  if (requireContent && bytes.length === 0) {
    throw new Error(`evidence log ${rel} is empty`);
  }
  return `sha256:${createHash("sha256").update(bytes).digest("hex")}`;
}

/**
 * Stream the verification command to the terminal and to an evidence log at the
 * same time, so a multi-hour soak stays observable and still leaves a record.
 * @param {string} command
 * @param {string} logPath
 * @param {string} root
 * @returns {{ exit: number; durationMs: number }}
 */
function runVerification(command, logPath, root) {
  mkdirSync(join(root, "release/evidence-logs"), { recursive: true });
  const started = Date.now();
  const result = spawnSync(
    "bash",
    ["-o", "pipefail", "-c", `{ ${command}; } 2>&1 | tee ${logPath}`],
    { cwd: root, stdio: ["ignore", "inherit", "inherit"] },
  );
  return { exit: result.status ?? 1, durationMs: Date.now() - started };
}

/**
 * @param {Record<string, string | boolean>} flags
 * @param {string} root
 * @returns {{ id: string; unblocked: string[]; log: string }}
 */
export function closeWork(flags, root = repoRoot()) {
  const id = String(flags.id ?? "");
  if (!id) throw new Error("--id is required");

  const { index } = loadWork(root);
  const item = index.get(id);
  if (!item) throw new Error(`${id} is not in any register`);
  // Derived items have no register row to flip and no closing event to journal.
  // They exist exactly as long as the gate is red, which is the only honest
  // record of whether the work is done.
  if (item.derived) {
    throw new Error(
      `${id} is derived from ${item.file} and clears itself when the gate goes green. Run \`${item.verify}\`, fix what it reports, then re-record with npm run checks:status.`,
    );
  }
  if (item.status === "done") throw new Error(`${id} is already done`);

  const evidence = listFlag(flags.evidence);
  if (evidence.length === 0) {
    throw new Error(
      "--evidence is required — a closed item must cite what proves it",
    );
  }

  const pending = item.blockers.filter((blocker) => blocker.kind === "item");
  if (pending.length > 0) {
    throw new Error(
      `${id} still depends on ${pending.map((blocker) => blocker.ref).join(", ")}`,
    );
  }
  // Closing work that needed hardware the registry says we do not have means one
  // of the two records is wrong. Make the caller say which.
  const unavailable = item.blockers.filter(
    (blocker) => blocker.kind === "resource",
  );
  if (unavailable.length > 0) {
    throw new Error(
      `${id} requires ${unavailable.map((blocker) => blocker.ref).join(", ")}, which work/resources.json marks unavailable — mark it available (with an "acquired" date) before closing`,
    );
  }

  const verify = String(flags.verify ?? item.verify ?? "");
  if (!verify) throw new Error(`${id} has no verification command recorded`);

  const isRunbook = verify.startsWith("runbook:");
  const skip = flags["allow-unverified"] === true;
  const fromLog = flags["from-log"] ? String(flags["from-log"]) : "";
  const reason = String(flags.reason ?? "");
  if (skip && fromLog) {
    throw new Error("--from-log and --allow-unverified are mutually exclusive");
  }
  if ((isRunbook || skip) && !reason) {
    throw new Error(
      isRunbook
        ? `${id} is verified by runbook — pass --allow-unverified --reason="<what you ran>"`
        : '--allow-unverified requires --reason="<why>"',
    );
  }
  if (isRunbook && !skip) {
    throw new Error(
      `${id} is verified by runbook (${verify}) — pass --allow-unverified --reason="<what you ran>"`,
    );
  }

  let log = `release/evidence-logs/${new Date().toISOString().slice(0, 10)}-${id.toLowerCase()}.log`;
  /** @type {{ exit: number; durationMs: number }} */
  let outcome = { exit: 0, durationMs: 0 };
  /** @type {string} */
  let digest = "";

  if (fromLog) {
    // Multi-hour soaks are started by release:start-soaks and watched
    // elsewhere; re-running them inside work:done would mean holding a terminal
    // for three days. Ingest the log they produced instead, fingerprinted so
    // the record names a specific artifact rather than a claim.
    digest = fingerprint(fromLog, root, true);
    log = fromLog;
  } else if (!skip) {
    console.log(`[work:done] verifying ${id}: ${verify}\n`);
    outcome = runVerification(verify, log, root);
    if (outcome.exit !== 0) {
      throw new Error(
        `verification failed with exit ${outcome.exit} — ${id} stays ${item.status}. Log: ${log}`,
      );
    }
    digest = fingerprint(log, root, false);
  }

  const target = flags["no-move"] === true ? null : CLOSE_POLICY[item.file];
  /** @type {string[]} */
  const touched = [item.file];

  if (target) {
    const source = removeRow(readDoc(root, item.file), id);
    writeDoc(root, item.file, source.text);
    const cells = byColumn(source.cells, source.columns);
    const title = cells.Item ?? cells.Gate ?? cells.Needs ?? id;
    writeDoc(
      root,
      target,
      appendRow(readDoc(root, target), {
        ID: id,
        Status: "done",
        Item: title,
        Evidence: evidence.map(evidenceCell).join(", "),
        Verify: `\`${verify}\``,
      }),
    );
    touched.push(target);
  } else {
    writeDoc(
      root,
      item.file,
      setCell(readDoc(root, item.file), id, "Status", "done"),
    );
  }

  const metadata = loadMetadata(root);
  metadata.items[id] = {
    ...metadata.items[id],
    verify,
    completed: new Date().toISOString().slice(0, 10),
    evidence,
  };
  saveMetadata(metadata, root);
  formatFiles(touched, root);

  appendEvent(
    {
      action: "close",
      id,
      from: item.status,
      to: "done",
      type: item.type,
      verify,
      verified: !skip,
      verifiedFrom: skip ? "none" : fromLog ? "log" : "run",
      exit: outcome.exit,
      durationMs: outcome.durationMs,
      evidence,
      ...(skip ? { reason } : { log, digest }),
    },
    root,
  );

  const after = loadWork(root);
  const unblocked = after.items
    .filter(
      (candidate) =>
        candidate.status === "open" &&
        candidate.blockers.length === 0 &&
        candidate.requires.includes(id),
    )
    .map((candidate) => candidate.id);

  return { id, unblocked, log };
}

function main() {
  const flags = parseFlags(process.argv.slice(2));
  if (flags.help || process.argv.length <= 2) {
    console.log(USAGE.trim());
    return;
  }
  try {
    const { id, unblocked } = closeWork(flags);
    console.log(`\nclosed ${id}`);
    console.log(
      unblocked.length > 0
        ? `unblocked: ${unblocked.join(", ")}`
        : "nothing new became unblocked",
    );
    console.log("next: npm run work:next");
    // Closes are the other clock the audit runs on: a burst of them is exactly
    // when the closed-work review has something to say.
    const nudge = auditNudge(repoRoot());
    if (nudge) console.log(nudge);
  } catch (error) {
    console.error(`work:done failed — ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) main();
