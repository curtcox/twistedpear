#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { repoRoot } from "../doc-audit/repo-root.mjs";

/**
 * The advisory check that actually looks at advisories.
 *
 * `audit:policy` — the PR-tier gate — only validates that `audit-allowlist.json`
 * is well-formed and unexpired. It never runs `npm audit`, which is why it can
 * be green while GitHub is reporting open Dependabot alerts. This is the check
 * that reconciles the two, and it is what the soak guard requires: shipping
 * eleven days of soak evidence for a tree with known unfixed high-severity
 * dependencies is not evidence anyone should act on.
 *
 * The allowlist is the escape hatch, and it already has the right shape — a
 * reason and an expiry per entry — so this adds no second exemption mechanism.
 */
const SEVERITIES = new Set(["high", "critical"]);

/**
 * @typedef {object} Advisory
 * @property {string} id package name
 * @property {string} severity
 * @property {boolean} direct
 * @property {string} source "npm" or "dependabot"
 * @property {string} [scope] "runtime" or "development"
 * @property {string} [reference]
 */

/**
 * @param {string} root
 * @returns {{ entries: { id: string; reason: string; expires: string }[] }}
 */
export function readAllowlist(root) {
  const file = join(root, "audit-allowlist.json");
  if (!existsSync(file)) return { entries: [] };
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch {
    return { entries: [] };
  }
}

/**
 * @param {string} root
 * @returns {Advisory[]}
 */
export function fromNpm(root) {
  const result = spawnSync("npm", ["audit", "--json"], {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
  let audit;
  try {
    audit = JSON.parse(result.stdout || "{}");
  } catch {
    return [];
  }
  return Object.entries(audit.vulnerabilities ?? {})
    .filter(([, detail]) => SEVERITIES.has(detail.severity))
    .map(([name, detail]) => ({
      id: name,
      severity: detail.severity,
      direct: detail.isDirect === true,
      source: "npm",
    }));
}

/**
 * GitHub's own view. `npm audit` reads the lockfile; Dependabot reads the
 * repository and knows about ecosystems npm cannot see, so the two disagree
 * often enough that checking only one leaves alerts open with a green gate.
 * Absent or unauthenticated `gh` is not a failure — it just means this half of
 * the picture is unavailable, and the caller is told so rather than being given
 * a false all-clear.
 * @param {string} root
 * @returns {{ available: boolean; advisories: Advisory[]; reason?: string }}
 */
export function fromDependabot(root) {
  const probe = spawnSync("gh", ["auth", "status"], { encoding: "utf8" });
  if (probe.status !== 0)
    return {
      available: false,
      advisories: [],
      reason: "gh is not installed or not authenticated",
    };
  const result = spawnSync(
    "gh",
    [
      "api",
      "repos/{owner}/{repo}/dependabot/alerts",
      "--paginate",
      "-q",
      '.[] | select(.state=="open") | [.security_advisory.severity, .dependency.package.name, .security_advisory.ghsa_id, .dependency.scope] | @tsv',
    ],
    { cwd: root, encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
  );
  if (result.status !== 0)
    return {
      available: false,
      advisories: [],
      reason: (result.stderr || "gh api failed").trim().split("\n")[0],
    };
  const advisories = result.stdout
    .split("\n")
    .filter(Boolean)
    .map((line) => {
      const [severity, id, reference, scope] = line.split("\t");
      return {
        id,
        severity,
        direct: false,
        source: "dependabot",
        scope,
        reference,
      };
    })
    .filter((advisory) => SEVERITIES.has(advisory.severity));
  return { available: true, advisories };
}

/**
 * @param {string} root
 * @param {{ now?: Date; dependabot?: boolean }} [options]
 */
export function resolve(root = repoRoot(), options = {}) {
  const { now = new Date(), dependabot = true } = options;
  const today = now.toISOString().slice(0, 10);
  const allowlist = readAllowlist(root);
  const active = new Set(
    (allowlist.entries ?? [])
      .filter((entry) => (entry.expires ?? "") >= today)
      .map((entry) => entry.id),
  );
  const expired = (allowlist.entries ?? []).filter(
    (entry) => (entry.expires ?? "") < today,
  );

  const github = dependabot
    ? fromDependabot(root)
    : { available: false, advisories: [], reason: "not requested" };
  /** @type {Map<string, Advisory>} */
  const all = new Map();
  for (const advisory of [...fromNpm(root), ...github.advisories]) {
    // One entry per package: the same weakness reported by both sources is one
    // thing to fix, not two.
    if (!all.has(advisory.id)) all.set(advisory.id, advisory);
  }

  const advisories = [...all.values()].sort((a, b) =>
    a.id < b.id ? -1 : a.id > b.id ? 1 : 0,
  );
  return {
    advisories,
    unresolved: advisories.filter((advisory) => !active.has(advisory.id)),
    allowlisted: advisories.filter((advisory) => active.has(advisory.id)),
    expired,
    dependabot: github,
  };
}

function main(argv = process.argv.slice(2)) {
  const root = repoRoot();
  const state = resolve(root, {
    dependabot: !argv.includes("--no-dependabot"),
  });

  if (argv.includes("--json")) {
    console.log(JSON.stringify(state, null, 2));
    if (state.unresolved.length > 0 || state.expired.length > 0)
      process.exitCode = 1;
    return;
  }

  if (!state.dependabot.available) {
    console.log(
      `Dependabot alerts unavailable (${state.dependabot.reason}); npm audit only.`,
    );
  }
  for (const advisory of state.unresolved) {
    console.error(
      `Unresolved ${advisory.severity} advisory: ${advisory.id}` +
        `${advisory.scope ? ` (${advisory.scope})` : ""}` +
        `${advisory.reference ? ` ${advisory.reference}` : ""} [${advisory.source}]`,
    );
  }
  for (const entry of state.expired) {
    console.error(
      `Expired allowlist entry ${entry.id} (${entry.expires}): ${entry.reason}`,
    );
  }
  console.log(
    `Advisories: ${state.unresolved.length} unresolved, ${state.allowlisted.length} allowlisted, ${state.expired.length} expired exception(s).`,
  );
  if (state.unresolved.length > 0) {
    console.log(
      "Fix what can be fixed with `npm run audit:fix`; for the rest, add a reasoned, expiring entry to audit-allowlist.json.",
    );
  }
  if (state.unresolved.length > 0 || state.expired.length > 0)
    process.exitCode = 1;
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
