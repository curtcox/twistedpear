/**
 * Shared git plumbing for the `ci-metrics` orphan branch.
 *
 * The branch has no ancestor in `main` on purpose. It carries an append stream
 * that grows once per CI run, and merging that into the source history would
 * make `git log` useless for the thing it is actually for.
 */
import { spawnSync } from "node:child_process";

export const BRANCH = process.env.CI_METRICS_BRANCH ?? "ci-metrics";

export function git(args, options = {}) {
  const result = spawnSync("git", args, { encoding: "utf8", ...options });
  if (options.allowFailure !== true && (result.status ?? 1) !== 0) {
    throw new Error(
      `git ${args.join(" ")} failed: ${result.stderr || result.stdout}`,
    );
  }
  return result;
}

export function remoteUrl() {
  const slug = process.env.GITHUB_REPOSITORY;
  const server = process.env.GITHUB_SERVER_URL ?? "https://github.com";
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (!slug) return null;
  if (token) {
    return `${server.replace("https://", `https://x-access-token:${token}@`)}/${slug}.git`;
  }
  return `${server}/${slug}.git`;
}

export function branchExists(url) {
  const result = git(["ls-remote", "--heads", url, BRANCH], {
    allowFailure: true,
  });
  return (result.stdout ?? "").includes(`refs/heads/${BRANCH}`);
}

export function configureIdentity(cwd) {
  git(["config", "user.name", "github-actions[bot]"], { cwd });
  git(
    [
      "config",
      "user.email",
      "41898282+github-actions[bot]@users.noreply.github.com",
    ],
    { cwd },
  );
}
