#!/usr/bin/env node
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import {
  compareDiagnosticSet,
  printDiagnosticResult,
  writeJson,
} from "../ratchet/lib.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "../..");
const BASELINE = join(ROOT, "codeql-ratchet.json");
const REPORT = join(ROOT, "artifacts/security/codeql-alerts.json");

export function repositoryFrom(remote) {
  const match = remote
    .trim()
    .match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/);
  return match ? `${match[1]}/${match[2]}` : null;
}

export function normalizeAlerts(alerts) {
  return alerts
    .filter((alert) => alert.state === "open")
    .map((alert) => {
      const location = alert.most_recent_instance?.location;
      const path = location?.path ?? "unknown";
      const line = location?.start_line ?? 0;
      return `${alert.rule?.id ?? "unknown"} #${alert.number} ${path}:${line} ${alert.rule?.security_severity_level ?? alert.rule?.severity ?? "unknown"}`;
    })
    .sort();
}

function token() {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  if (process.env.GH_TOKEN) return process.env.GH_TOKEN;
  const result = spawnSync("gh", ["auth", "token"], { encoding: "utf8" });
  return result.status === 0 ? result.stdout.trim() : null;
}

function repository() {
  if (process.env.GITHUB_REPOSITORY) return process.env.GITHUB_REPOSITORY;
  const result = spawnSync("git", ["remote", "get-url", "origin"], {
    cwd: ROOT,
    encoding: "utf8",
  });
  return result.status === 0 ? repositoryFrom(result.stdout) : null;
}

async function fetchAlerts(repo, auth) {
  const alerts = [];
  for (let page = 1; ; page += 1) {
    const timeout = {
      signal: AbortSignal.timeout(30_000),
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${auth}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "twistedpear-codeql-gate",
      },
    };
    const response = await fetch(
      `https://api.github.com/repos/${repo}/code-scanning/alerts?state=open&per_page=100&page=${page}`,
      timeout,
    );
    if (!response.ok)
      throw new Error(
        `CodeQL alerts API returned ${response.status}: ${(await response.text()).slice(0, 240)}`,
      );
    const batch = await response.json();
    alerts.push(...batch);
    if (batch.length < 100) return alerts;
  }
}

async function main() {
  const auth = token();
  const repo = repository();
  if (!auth || !repo)
    throw new Error(
      "CodeQL alert import needs GITHUB_TOKEN/GH_TOKEN (or authenticated gh) and a GitHub origin.",
    );
  const raw = await fetchAlerts(repo, auth);
  const findings = normalizeAlerts(raw);
  const comparison = compareDiagnosticSet({
    root: ROOT,
    baselineFile: BASELINE,
    current: findings,
    write: process.argv.includes("--write"),
    allowRegressions: process.argv.includes("--allow-regressions"),
    description:
      "Open GitHub CodeQL alerts imported into the unified gate registry; entries may only disappear.",
    envName: "CODEQL_RATCHET_BASE_REF",
  });
  mkdirSync(dirname(REPORT), { recursive: true });
  writeJson(REPORT, {
    version: 1,
    generatedAt: new Date().toISOString(),
    repository: repo,
    open: findings.length,
    findings,
  });
  if (comparison.wrote) {
    console.log(`codeql-alerts: recorded ${findings.length} open alert(s).`);
    return;
  }
  console.log(`codeql-alerts: ${findings.length} open alert(s).`);
  if (!printDiagnosticResult("CodeQL alerts", comparison)) process.exitCode = 1;
}

if (fileURLToPath(import.meta.url) === process.argv[1]) await main();
