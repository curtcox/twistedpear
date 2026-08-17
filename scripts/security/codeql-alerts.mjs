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

export const retryableAlertStatuses = new Set([429, 500, 502, 503]);
export const ALERT_RETRY_ATTEMPTS = 8;
export const ALERT_RETRY_BASE_MS = 2_000;
export const ALERT_RETRY_CAP_MS = 30_000;
export const ALERT_RETRY_AFTER_CAP_MS = 60_000;
export const ALERT_FETCH_TIMEOUT_MS = 30_000;

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

export function parseRetryAfterMs(header) {
  if (header == null || header === "") return null;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds >= 0) {
    return Math.min(seconds * 1000, ALERT_RETRY_AFTER_CAP_MS);
  }
  const date = Date.parse(header);
  if (Number.isNaN(date)) return null;
  return Math.min(Math.max(0, date - Date.now()), ALERT_RETRY_AFTER_CAP_MS);
}

export function alertRetryDelayMs(attempt, retryAfterHeader) {
  const fromHeader = parseRetryAfterMs(retryAfterHeader);
  if (fromHeader != null) return fromHeader;
  return Math.min(ALERT_RETRY_BASE_MS * 2 ** (attempt - 1), ALERT_RETRY_CAP_MS);
}

export function isRetryableAlertError(error) {
  if (!error || typeof error !== "object") return false;
  const name = error.name;
  return (
    name === "AbortError" || name === "TimeoutError" || name === "TypeError"
  );
}

export function isUnavailableAlertError(error) {
  if (isRetryableAlertError(error)) return true;
  return /API returned (429|500|502|503)\b/.test(String(error?.message ?? ""));
}

function retryAfterHeader(response) {
  return response.headers?.get?.("retry-after") ?? null;
}

function attemptFetchOptions(options, timeoutMs) {
  if (timeoutMs == null) return options;
  return { ...options, signal: AbortSignal.timeout(timeoutMs) };
}

export async function fetchJsonWithRetry(
  url,
  options,
  {
    fetchImpl = globalThis.fetch,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
    attempts = ALERT_RETRY_ATTEMPTS,
    timeoutMs,
  } = {},
) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetchImpl(url, attemptFetchOptions(options, timeoutMs));
    } catch (error) {
      lastError = error;
      if (!isRetryableAlertError(error) || attempt === attempts) throw error;
      await sleep(alertRetryDelayMs(attempt));
      continue;
    }
    if (response.ok) return response.json();
    lastError = new Error(
      `CodeQL alerts API returned ${response.status}: ${(await response.text()).slice(0, 240)}`,
    );
    if (!retryableAlertStatuses.has(response.status) || attempt === attempts) {
      throw lastError;
    }
    await sleep(alertRetryDelayMs(attempt, retryAfterHeader(response)));
  }
  throw lastError;
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
  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${auth}`,
    "x-github-api-version": "2022-11-28",
    "user-agent": "twistedpear-codeql-gate",
  };
  for (let page = 1; ; page += 1) {
    const batch = await fetchJsonWithRetry(
      `https://api.github.com/repos/${repo}/code-scanning/alerts?state=open&per_page=100&page=${page}`,
      { headers },
      { timeoutMs: ALERT_FETCH_TIMEOUT_MS },
    );
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
  let raw;
  try {
    raw = await fetchAlerts(repo, auth);
  } catch (error) {
    if (!isUnavailableAlertError(error)) throw error;
    mkdirSync(dirname(REPORT), { recursive: true });
    writeJson(REPORT, {
      version: 1,
      generatedAt: new Date().toISOString(),
      repository: repo,
      skipped: true,
      skipReason: String(error.message),
      open: 0,
      findings: [],
    });
    console.warn(`codeql-alerts: skipped; ${error.message}`);
    return;
  }
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
