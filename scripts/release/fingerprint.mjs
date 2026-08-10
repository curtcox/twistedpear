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
 *
 * `checks.json` is excluded for the same reason and one more: recording gate
 * results must not perturb the digest those results are recorded against.
 */
export const APPLICATION_PATHS = [
  "apps",
  "packages",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
];

/**
 * This module is a leaf on purpose. Both the soak guard and the checks status
 * file need the application fingerprint, and the soak guard needs the checks
 * status — routing the fingerprint through the guard would make that a cycle,
 * which deadlocks the first module to reach top-level await.
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
export function present(root, paths) {
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

/** Files whose own contents must not perturb the tree digest they describe. */
const SELF_DESCRIBING = ["checks.json", "checks-waivers.json"];

/**
 * Content identity of the *whole* tracked tree, not just the application.
 *
 * The two digests answer different questions and cannot be the same one.
 * {@link applicationFingerprint} asks "is this the code the soak is
 * qualifying?", and deliberately ignores `scripts/`, `docs/`, and the registers
 * so triage tooling stays editable mid-run. The gates read all of those: an edit
 * under `scripts/` can turn `format`, `lint`, or `unit-tests` red while leaving
 * the application digest identical. Freshness of a gate record therefore has to
 * be measured against everything the gates actually read.
 *
 * The gate record and its waivers are excluded, since writing them is what this
 * digest is stamped onto.
 * @param {string} [root]
 * @returns {string}
 */
export function treeFingerprint(root = defaultRoot) {
  const exclude = SELF_DESCRIBING.map((file) => `:(exclude)${file}`);
  const scope = [".", ...exclude];
  const head = git(root, ["rev-parse", "HEAD"]).trim();
  const patch = git(root, ["diff", "HEAD", "--", ...scope]);
  const untracked = git(root, [
    "ls-files",
    "--others",
    "--exclude-standard",
    "--",
    ...scope,
  ])
    .split("\n")
    .filter(Boolean);
  const untrackedDigests = untracked.map(
    (file) =>
      `${file} ${createHash("sha256")
        .update(readFileSync(join(root, file)))
        .digest("hex")}`,
  );
  return createHash("sha256")
    .update([head, patch, ...untrackedDigests].join("\n"))
    .digest("hex");
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
