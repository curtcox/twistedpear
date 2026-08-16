#!/usr/bin/env node
/**
 * Every third-party GitHub Action must be pinned to a commit SHA.
 *
 * A moving tag is a standing write grant to whoever can push it. `actionlint`
 * does not check this — it validates workflow syntax and expressions, not
 * supply-chain posture — so until 2026-08-15 all 226 `uses:` references here
 * were mutable tags, next to a repository that verifies a code-maat jar against
 * a SHA-256 digest and reconciles every npm advisory against an allowlist. This
 * was the unlocked door.
 *
 * The check is offline and shape-only: it does not ask GitHub whether a SHA is
 * still reachable, because a gate that needs the network to say "unchanged" is a
 * gate that fails when GitHub does. `scripts/security/pin-actions.mjs` is the
 * half that resolves tags, and it is run by hand.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const WORKFLOWS = path.join(ROOT, ".github", "workflows");

const USES = /^\s*(?:-\s+)?uses:\s*(\S+)(.*)$/;
const SHA = /^[0-9a-f]{40}$/;

/**
 * References exempt from pinning.
 *
 * Local composite actions (`./.github/...`) are already part of this
 * repository — pinning one to a SHA would pin the workflow to an older copy of
 * itself. Nothing else belongs here.
 */
const isLocal = (reference) => reference.startsWith("./");

const findings = [];
let pinned = 0;
let local = 0;

for (const name of fs.readdirSync(WORKFLOWS).sort()) {
  if (!/\.ya?ml$/.test(name)) continue;
  const lines = fs.readFileSync(path.join(WORKFLOWS, name), "utf8").split("\n");

  for (const [index, line] of lines.entries()) {
    const match = USES.exec(line);
    if (!match) continue;
    const [, reference, trailing] = match;
    const where = `.github/workflows/${name}:${index + 1}`;

    if (isLocal(reference)) {
      local += 1;
      continue;
    }

    const at = reference.lastIndexOf("@");
    const ref = at === -1 ? "" : reference.slice(at + 1);
    if (!SHA.test(ref)) {
      findings.push(
        `${where}: ${reference} is not pinned to a commit SHA; run node scripts/security/pin-actions.mjs --write`,
      );
      continue;
    }
    // The trailing `# v7` is not decoration. Without it a reviewer cannot tell
    // an intentional pin from a digest someone pasted, and the version a bump
    // should start from is lost.
    if (!/#\s*\S/.test(trailing)) {
      findings.push(
        `${where}: ${reference.slice(0, at)} is pinned but carries no version comment; append "# <tag>"`,
      );
      continue;
    }
    pinned += 1;
  }
}

for (const finding of findings) console.error(`  ${finding}`);
console.log(
  `actions-pinned: ${findings.length === 0 ? "PASS" : "FAIL"}; ${pinned} pinned, ${local} local, ${findings.length} unpinned.`,
);
process.exit(findings.length === 0 ? 0 : 1);
