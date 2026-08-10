#!/usr/bin/env node
/**
 * Close the RQ register items whose soak logs show a pass.
 *
 * This is what `work:done --from-log` was built for: the soaks run for days
 * outside the tool, so the evidence is the log they produced. Each close records
 * that log's SHA-256, so the registry cites a specific artifact.
 */
import { copyFileSync, existsSync, mkdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import { latestValidationDir, rootFrom } from "./common.mjs";
import { scan } from "./watch-soaks.mjs";
import { SOAK_ITEMS } from "./soak-plan.mjs";
import { closeWork } from "../work/done.mjs";
import { loadWork } from "../work/lib.mjs";

const root = rootFrom(import.meta.url);

const USAGE = `
npm run release:record-soaks [-- <log-dir>] [--dry-run]

Closes every RQ item whose plan-duration soak log recorded a pass, citing the
log as evidence. Safe to re-run: items already done are skipped.
`;

/**
 * Repo-relative destination for a soak's archived log. Tracked, unlike .tmp,
 * so the evidence a closed item cites exists for everyone and in CI.
 * @param {string} id
 * @param {Date} [now]
 * @returns {string}
 */
export function evidencePathFor(id, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return `release/evidence-logs/${day}-${id.toLowerCase()}-soak.log`;
}

/**
 * @param {string} sourceLog
 * @param {string} evidenceRel
 */
function archiveLog(sourceLog, evidenceRel) {
  const destination = join(root, evidenceRel);
  mkdirSync(join(root, "release/evidence-logs"), { recursive: true });
  copyFileSync(sourceLog, destination);
}

/**
 * @param {string} logDir
 * @returns {{ id: string; log: string }[]}
 */
export function passedSoaks(logDir) {
  return scan(logDir)
    .filter((result) => result.status === "passed")
    .flatMap((result) => {
      const item = SOAK_ITEMS.find((candidate) =>
        result.command.includes(candidate.script),
      );
      return item ? [{ id: item.id, log: result.log }] : [];
    });
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(USAGE.trim());
    return;
  }
  const positional = argv.find((value) => !value.startsWith("--"));
  const logDir = positional ? resolve(positional) : latestValidationDir(root);
  if (!logDir || !existsSync(logDir)) {
    console.log("No soak run found.");
    return;
  }

  const dryRun = argv.includes("--dry-run");
  const { index } = loadWork(root);
  const passed = passedSoaks(logDir);

  if (passed.length === 0) {
    console.log("No passed soak logs yet.");
    return;
  }

  let closed = 0;
  for (const { id, log } of passed) {
    if (index.get(id)?.status === "done") {
      console.log(`skip  ${id} (already done)`);
      continue;
    }
    const evidenceRel = evidencePathFor(id);
    if (dryRun) {
      console.log(`would close ${id}, archiving ${relative(root, log)}`);
      console.log(`  evidence: ${evidenceRel}`);
      continue;
    }
    try {
      // Soak logs live under .tmp, which is gitignored: citing one directly
      // would satisfy work:check on this machine and fail it everywhere else.
      // Archive into the tracked evidence directory and cite that instead.
      archiveLog(log, evidenceRel);
      closeWork({ id, evidence: evidenceRel, "from-log": evidenceRel }, root);
      console.log(`closed ${id} from ${evidenceRel}`);
      closed += 1;
    } catch (error) {
      console.error(`failed ${id}: ${error.message}`);
      process.exitCode = 1;
    }
  }

  if (!dryRun)
    console.log(`\n${closed} item(s) closed. Next: npm run work:next`);
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
