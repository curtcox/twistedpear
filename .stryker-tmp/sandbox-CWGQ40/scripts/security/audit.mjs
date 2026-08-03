#!/usr/bin/env node
// @ts-nocheck
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { baseRef, jsonAtRef, readJson, writeJson } from "../ratchet/lib.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const FILE = path.join(ROOT, "audit-allowlist.json");
const full = process.argv.includes("--full");
const baseline = process.argv.includes("--write");
const allowRegressions = process.argv.includes("--allow-regressions");
const policy = readJson(FILE, { version: 1, entries: [] });
const today = new Date().toISOString().slice(0, 10);
let failed = false;

for (const entry of policy.entries ?? []) {
  if (!entry.id || !entry.reason || !/^\d{4}-\d{2}-\d{2}$/.test(entry.expires ?? "")) {
    console.error(`Invalid advisory exception: ${JSON.stringify(entry)}`);
    failed = true;
  } else if (entry.expires < today) {
    console.error(`Expired advisory exception ${entry.id} (${entry.expires}): ${entry.reason}`);
    failed = true;
  }
}
const ref = baseRef(ROOT, "AUDIT_RATCHET_BASE_REF");
const previous = ref ? jsonAtRef(ROOT, ref, "audit-allowlist.json") : null;
if (previous) {
  const old = new Set((previous.entries ?? []).map((entry) => entry.id));
  for (const entry of policy.entries ?? []) {
    if (!old.has(entry.id)) {
      console.error(`Advisory allowlist grew vs ${ref}: + ${entry.id}`);
      failed = true;
    }
  }
}

if (full || baseline) {
  const result = spawnSync("npm", ["audit", "--json"], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  const audit = JSON.parse(result.stdout || "{}");
  writeJson(path.join(ROOT, "audit.json"), audit);
  if (audit.error || audit.message) {
    console.error(`npm audit failed: ${audit.message ?? audit.error?.summary ?? "unknown error"}`);
    process.exit(1);
  }
  const vulnerable = Object.entries(audit.vulnerabilities ?? {})
    .filter(([, detail]) => ["high", "critical"].includes(detail.severity))
    .map(([name, detail]) => ({ id: name, severity: detail.severity, direct: detail.isDirect === true }));
  if (baseline) {
    if (vulnerable.length > 0 && !allowRegressions && (policy.entries ?? []).length === 0) {
      console.error("Refusing to establish a non-empty advisory allowlist without --allow-regressions.");
      process.exit(1);
    }
    const expiry = new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10);
    writeJson(FILE, {
      version: 1,
      description: "Temporary high/critical npm advisory exceptions. Each exception requires a reason and expires; this list may not grow on a PR.",
      entries: vulnerable.map((item) => ({ ...item, expires: expiry, reason: "Existing dependency graph when the advisory gate was established; upgrade or remove before expiry." }))
    });
    console.log(`Advisory gate: wrote ${vulnerable.length} temporary exceptions.`);
    process.exit(0);
  }
  const allowed = new Set((policy.entries ?? []).map((entry) => entry.id));
  for (const item of vulnerable) {
    if (!allowed.has(item.id)) {
      console.error(`Unallowlisted ${item.severity} advisory: ${item.id}`);
      failed = true;
    }
  }
  console.log(`Advisory gate: ${vulnerable.length} high/critical vulnerable packages, ${allowed.size} temporary exceptions.`);
} else {
  console.log(`Advisory policy: ${(policy.entries ?? []).length} valid, unexpired temporary exceptions.`);
}
if (failed) process.exit(1);
