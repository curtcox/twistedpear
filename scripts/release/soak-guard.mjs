#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { rootFrom } from "./common.mjs";

const defaultRoot = rootFrom(import.meta.url);

/**
 * Paths a plan-duration soak qualifies. A change to any of them after the run
 * starts means the pass no longer describes the tree it would be recorded
 * against, so the guard fails the run instead of letting stale evidence reach
 * G1. Deliberately excluded: `conformance/`, `scripts/`, `docs/`, and the
 * status registers — triage tooling and evidence recording must stay editable
 * while an eleven-day run is in flight.
 */
export const APPLICATION_PATHS = [
  "apps",
  "packages",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
];

/** Plan-duration soaks run only from a release branch. */
export const RELEASE_BRANCH = /^release\/[A-Za-z0-9][A-Za-z0-9._\-/]*$/;

/**
 * @param {string} root
 * @param {string[]} args
 * @returns {string}
 */
function git(root, args) {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    maxBuffer: 256 * 1024 * 1024,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

/**
 * @param {string} root
 * @param {string[]} paths
 * @returns {string[]}
 */
function present(root, paths) {
  return paths.filter((path) => existsSync(join(root, path)));
}

/**
 * @param {string} [root]
 * @returns {string}
 */
export function currentBranch(root = defaultRoot) {
  return git(root, ["rev-parse", "--abbrev-ref", "HEAD"]).trim();
}

/**
 * @param {string} branch
 * @returns {boolean}
 */
export function isReleaseBranch(branch) {
  return RELEASE_BRANCH.test(branch);
}

/**
 * Content identity of the application tree: HEAD plus every uncommitted or
 * untracked change under {@link APPLICATION_PATHS}. Two runs share a digest
 * only if they would build byte-identical sources.
 * @param {string} [root]
 * @param {string[]} [paths]
 * @returns {{ head: string; digest: string; dirty: string[] }}
 */
export function applicationFingerprint(
  root = defaultRoot,
  paths = APPLICATION_PATHS,
) {
  const scope = present(root, paths);
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const patch = scope.length ? git(root, ["diff", "HEAD", "--", ...scope]) : "";
  const untracked = scope.length
    ? git(root, ["ls-files", "--others", "--exclude-standard", "--", ...scope])
        .split("\n")
        .filter(Boolean)
    : [];
  const untrackedDigests = untracked.map(
    (file) =>
      `${file} ${createHash("sha256")
        .update(readFileSync(join(root, file)))
        .digest("hex")}`,
  );
  const dirty = [
    ...git(root, ["diff", "--name-only", "HEAD", "--", ...scope])
      .split("\n")
      .filter(Boolean),
    ...untracked,
  ].sort();
  return {
    head,
    digest: createHash("sha256")
      .update([head, patch, ...untrackedDigests].join("\n"))
      .digest("hex"),
    dirty,
  };
}

/**
 * Capture the baseline a soak run is qualifying. Refuses anything that would
 * make the resulting evidence unattributable: a non-release branch, or an
 * application tree with uncommitted work.
 * @param {string} [root]
 * @param {string[]} [paths]
 * @returns {{ branch: string; head: string; digest: string; at: string; paths: string[] }}
 */
export function captureBaseline(root = defaultRoot, paths = APPLICATION_PATHS) {
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
  return {
    branch,
    head: fingerprint.head,
    digest: fingerprint.digest,
    at: new Date().toISOString(),
    paths,
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

/**
 * Every application path that differs from the baseline commit, whether it was
 * committed, edited in the working tree, or newly added.
 * @param {{ head: string; paths?: string[] }} baseline
 * @param {string} [root]
 * @param {string[]} [paths]
 * @returns {string[]}
 */
export function changedApplicationPaths(
  baseline,
  root = defaultRoot,
  paths = baseline.paths ?? APPLICATION_PATHS,
) {
  const scope = present(root, paths);
  if (scope.length === 0) return [];
  const names = new Set();
  for (const args of [
    ["diff", "--name-only", baseline.head, "HEAD", "--", ...scope],
    ["diff", "--name-only", "HEAD", "--", ...scope],
    ["ls-files", "--others", "--exclude-standard", "--", ...scope],
  ])
    for (const line of git(root, args).split("\n")) if (line) names.add(line);
  return [...names].sort();
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
