#!/usr/bin/env node
/**
 * Resolve every `uses:` in `.github/workflows` to a commit SHA, and rewrite the
 * workflows to pin it.
 *
 * This is the maintenance half of the `actions-pinned` gate: the gate is
 * offline and only checks the shape, while this needs the network and the `gh`
 * CLI. Run it when adopting a new action or deliberately bumping one, then
 * commit the result.
 *
 *   node scripts/security/pin-actions.mjs            # report what would change
 *   node scripts/security/pin-actions.mjs --write     # rewrite the workflows
 *
 * The moving tag is preserved as a trailing comment, because the SHA alone is
 * unreadable and the comment is what tells a reviewer that
 * `actions/checkout@08c6903` is v7 rather than something a typo-squatter
 * pushed. `--write` re-resolves the tag in that comment, so bumping an action
 * means editing the comment and re-running rather than hand-copying a digest.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const WORKFLOWS = path.join(ROOT, ".github", "workflows");
const write = process.argv.includes("--write");

/**
 * `owner/repo/sub/path@ref` — capture the repo, any subpath, and the ref.
 *
 * The first group deliberately starts at the beginning of the line rather than
 * at `uses:`, so that the YAML indentation and any `- ` list marker survive the
 * rewrite. Anchoring on `uses:` alone silently reflows every step in the file.
 */
const USES =
  /^(\s*(?:-\s+)?uses:\s*)([\w.-]+\/[\w.-]+)((?:\/[\w.-]+)*)@(\S+)(.*)$/;
const SHA = /^[0-9a-f]{40}$/;

function gh(endpoint) {
  const result = spawnSync("gh", ["api", endpoint], {
    encoding: "utf8",
    cwd: ROOT,
  });
  if (result.status !== 0) {
    throw new Error(
      `gh api ${endpoint} failed (exit ${result.status}): ${(result.stderr ?? "").trim()}`,
    );
  }
  return JSON.parse(result.stdout);
}

const resolved = new Map();

/**
 * Resolve `owner/repo@tag` to the commit it points at.
 *
 * Annotated tags resolve to a tag object rather than a commit, so the tag
 * object is dereferenced once more. Pinning the tag object's own SHA would look
 * like a pin and behave like one, but it is not what the runner checks out.
 */
function commitFor(repo, tag) {
  const key = `${repo}@${tag}`;
  const cached = resolved.get(key);
  if (cached) return cached;
  const ref = gh(`repos/${repo}/git/ref/tags/${tag}`);
  const sha =
    ref.object.type === "tag"
      ? gh(`repos/${repo}/git/tags/${ref.object.sha}`).object.sha
      : ref.object.sha;
  if (!SHA.test(sha)) throw new Error(`${key} resolved to a non-SHA: ${sha}`);
  resolved.set(key, sha);
  return sha;
}

let changed = 0;
let alreadyPinned = 0;
for (const name of fs.readdirSync(WORKFLOWS).sort()) {
  if (!/\.ya?ml$/.test(name)) continue;
  const file = path.join(WORKFLOWS, name);
  const lines = fs.readFileSync(file, "utf8").split("\n");
  let touched = false;

  for (const [index, line] of lines.entries()) {
    const match = USES.exec(line);
    if (!match) continue;
    const [, prefix, repo, subpath, ref, trailing] = match;
    // Local composite actions (`./.github/actions/...`) never match USES, and a
    // docker:// reference has no repo to resolve, so both fall through.
    const tag = SHA.test(ref) ? (/#\s*(\S+)/.exec(trailing)?.[1] ?? null) : ref;
    if (tag === null) {
      console.warn(`${name}:${index + 1}: pinned but no tag comment; skipping`);
      alreadyPinned += 1;
      continue;
    }
    const sha = commitFor(repo, tag);
    const replacement = `${prefix}${repo}${subpath}@${sha} # ${tag}`;
    if (replacement === line.trimEnd()) {
      alreadyPinned += 1;
      continue;
    }
    console.log(`${name}:${index + 1}: ${repo}${subpath}@${tag} -> ${sha}`);
    lines[index] = replacement;
    touched = true;
    changed += 1;
  }

  if (touched && write) fs.writeFileSync(file, lines.join("\n"));
}

console.log(
  `pin-actions: ${changed} reference(s) ${write ? "rewritten" : "would change"}, ${alreadyPinned} already pinned.`,
);
if (!write && changed > 0) {
  console.log("Re-run with --write to apply.");
}
