#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { rootFrom } from "./common.mjs";
import { gateStatus } from "../checks/status.mjs";
import {
  APPLICATION_PATHS,
  applicationFingerprint,
  changedApplicationPaths,
  currentBranch,
  treeFingerprint,
} from "./fingerprint.mjs";

const defaultRoot = rootFrom(import.meta.url);

export {
  APPLICATION_PATHS,
  applicationFingerprint,
  changedApplicationPaths,
  currentBranch,
  treeFingerprint,
};

/** Plan-duration soaks run only from a release branch. */
export const RELEASE_BRANCH = /^release\/[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

/**
 * @param {string} branch
 * @returns {boolean}
 */
export function isReleaseBranch(branch) {
  return RELEASE_BRANCH.test(branch);
}

/**
 * The green-gate half of the guard: a plan-duration soak may not start against
 * a tree that fails its own static-analysis gates.
 *
 * Eleven days of wall-clock spent qualifying a revision already known to be
 * broken produces evidence nobody should accept, and the schedule cost of
 * discovering that afterwards is a full restart. The check is on the recorded
 * result rather than a fresh run, but it is only accepted when the record was
 * measured on *this* application digest — a stale `checks.json` is refused the
 * same as a red one, because a green result for other code proves nothing here.
 * @param {string} root
 * @param {string} digest
 * @param {Date} [now]
 * @returns {{ waived: string[] }}
 */
export function assertGatesGreen(root, digest, now = new Date()) {
  const state = gateStatus(root, {
    digest,
    treeDigest: treeFingerprint(root),
    now,
  });
  if (state.staleReason) throw new Error(state.staleReason);
  if (state.stale.length > 0) {
    throw new Error(
      `${state.stale.length} gate(s) have no result for this tree:\n${state.stale
        .map((gate) => `  ${gate.id} (last measured on another tree)`)
        .join("\n")}\n` +
        `Run npm run checks:status here, or — for a gate whose toolchain this machine does not have — ` +
        `record why with npm run checks:waive -- --gate=<id> --reason="…". An unmeasured gate is not a green one.`,
    );
  }
  if (state.blocking.length > 0) {
    const lines = state.blocking.map((gate) => {
      const expired =
        gate.waiver === "expired"
          ? ` (waiver expired ${gate.waiverRecord?.expires})`
          : "";
      return `  ${gate.id}${expired}${gate.detail ? ` — ${gate.detail}` : ""}`;
    });
    throw new Error(
      `refusing to soak a tree with ${state.blocking.length} red gate(s):\n${lines.join("\n")}\n` +
        `Fix them, or record a bounded exemption: npm run checks:waive -- --gate=<id> --reason="…"`,
    );
  }
  return { waived: state.waived.map((gate) => gate.id) };
}

/**
 * Capture the baseline a soak run is qualifying. Refuses anything that would
 * make the resulting evidence unattributable: a non-release branch, an
 * application tree with uncommitted work, or a tree with red gates.
 * @param {string} [root]
 * @param {string[]} [paths]
 * @param {{ now?: Date }} [options]
 * @returns {{ branch: string; head: string; digest: string; at: string; paths: string[]; waivedGates: string[] }}
 */
export function captureBaseline(
  root = defaultRoot,
  paths = APPLICATION_PATHS,
  options = {},
) {
  const branch = currentBranch(root);
  if (!isReleaseBranch(branch))
    throw new Error(
      `plan-duration soaks run only from a release branch; HEAD is on "${branch}". ` +
        `Cut one first: git switch -c release/v1.0.0`,
    );
  const fingerprint = applicationFingerprint(root, paths);
  if (fingerprint.dirty.length > 0)
    throw new Error(
      `refusing to soak an uncommitted application tree; commit or stash first:\n  ${fingerprint.dirty.join("\n  ")}`,
    );
  const { waived } = assertGatesGreen(root, fingerprint.digest, options.now);
  return {
    branch,
    head: fingerprint.head,
    digest: fingerprint.digest,
    at: new Date().toISOString(),
    paths,
    waivedGates: waived,
  };
}

/**
 * @param {{ branch: string; head: string; digest: string; paths?: string[] }} baseline
 * @param {string} [root]
 * @returns {{ ok: boolean; branch: string; head: string; digest: string; changed: string[]; reason: string }}
 */
export function verifyBaseline(baseline, root = defaultRoot) {
  const paths = baseline.paths ?? APPLICATION_PATHS;
  const branch = currentBranch(root);
  const fingerprint = applicationFingerprint(root, paths);
  const changed = changedApplicationPaths(baseline, root, paths);
  const ok =
    branch === baseline.branch && fingerprint.digest === baseline.digest;
  const reason = ok
    ? "application tree unchanged since the soak started"
    : branch !== baseline.branch
      ? `branch moved from ${baseline.branch} to ${branch}`
      : `application code changed after the soak started: ${changed.join(", ")}`;
  return {
    ok,
    branch,
    head: fingerprint.head,
    digest: fingerprint.digest,
    changed,
    reason,
  };
}

function main(argv = process.argv.slice(2)) {
  const rootIndex = argv.indexOf("--root");
  const root = rootIndex >= 0 ? argv[rootIndex + 1] : defaultRoot;
  const baselineIndex = argv.indexOf("--baseline");
  if (baselineIndex >= 0) {
    const baseline = JSON.parse(readFileSync(argv[baselineIndex + 1], "utf8"));
    const result = verifyBaseline(baseline, root);
    console.log(JSON.stringify(result, null, 2));
    if (!result.ok) process.exitCode = 1;
    return;
  }
  try {
    console.log(JSON.stringify(captureBaseline(root), null, 2));
  } catch (error) {
    console.error(`soak guard: ${error.message}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === new URL(`file://${process.argv[1]}`).href) main();
