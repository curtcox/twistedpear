#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { repoRoot } from "../doc-audit/repo-root.mjs";
import { resolve } from "./advisories.mjs";

const USAGE = `
npm run audit:fix [-- --dry-run] [--force]

Applies the dependency upgrades that resolve advisories without changing any
declared major version, then reports what is left.

  --dry-run   show what npm would change, install nothing
  --force     also take breaking major upgrades (npm audit fix --force)

Anything still unresolved afterwards needs a decision, not a command: either an
upgrade that changes behaviour, or a reasoned, expiring entry in
audit-allowlist.json. The advisories gate accepts the second; it does not accept
silence.
`;

/**
 * @param {string} root
 * @param {{ dryRun?: boolean; force?: boolean }} options
 * @returns {{ ok: boolean; output: string }}
 */
export function applyFixes(root, options = {}) {
  const args = ["audit", "fix"];
  if (options.dryRun) args.push("--dry-run");
  if (options.force) args.push("--force");
  const result = spawnSync("npm", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  return {
    ok: result.status === 0,
    output: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/**
 * @param {ReturnType<typeof resolve>} before
 * @param {ReturnType<typeof resolve>} after
 * @returns {string[]}
 */
export function summarize(before, after) {
  const was = new Set(before.unresolved.map((advisory) => advisory.id));
  const is = new Set(after.unresolved.map((advisory) => advisory.id));
  const fixed = [...was].filter((id) => !is.has(id)).sort();
  const remaining = after.unresolved;
  const lines = [];
  lines.push(
    fixed.length > 0
      ? `Fixed: ${fixed.join(", ")}`
      : "Nothing was fixable without a breaking upgrade.",
  );
  if (remaining.length === 0) {
    lines.push("No unresolved advisories remain.");
    return lines;
  }
  lines.push(`Still unresolved (${remaining.length}):`);
  for (const advisory of remaining) {
    lines.push(
      `  ${advisory.severity.padEnd(8)} ${advisory.id}${
        advisory.scope ? ` (${advisory.scope})` : ""
      }${advisory.reference ? ` ${advisory.reference}` : ""}`,
    );
  }
  lines.push("");
  lines.push(
    "Each needs a decision: upgrade past the breaking change, remove the dependency,",
  );
  lines.push(
    "or add a reasoned entry with an expiry to audit-allowlist.json. A development-only",
  );
  lines.push(
    "advisory is still a decision — record why it is acceptable, do not leave it silent.",
  );
  return lines;
}

function main(argv = process.argv.slice(2)) {
  if (argv.includes("--help")) {
    console.log(USAGE.trim());
    return;
  }
  const root = repoRoot();
  const dryRun = argv.includes("--dry-run");
  const force = argv.includes("--force");

  if (force && !dryRun) {
    console.log(
      "--force takes breaking major upgrades. Re-run the full test suite and the gates afterwards.\n",
    );
  }

  const before = resolve(root);
  console.log(
    `Before: ${before.unresolved.length} unresolved, ${before.allowlisted.length} allowlisted.`,
  );
  if (before.unresolved.length === 0 && before.expired.length === 0) {
    console.log("Nothing to fix.");
    return;
  }

  const result = applyFixes(root, { dryRun, force });
  console.log(result.output.trim());
  if (dryRun) return;

  const after = resolve(root);
  console.log("");
  for (const line of summarize(before, after)) console.log(line);
  if (after.unresolved.length > 0) process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
