#!/usr/bin/env node
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { baseRef, jsonAtRef, readJson } from "../ratchet/lib.mjs";
import apiExtractor from "../survey/tools/api-extractor.mjs";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const POLICY = path.join(ROOT, "api-signatures-policy.json");

function reports() {
  const result = apiExtractor.run();
  const unexpectedSkips = result.summary.skipped.filter(
    (entry) => entry.package !== "packages/worklet-core",
  );
  if (unexpectedSkips.length > 0)
    throw new Error(
      `API extraction skipped ${unexpectedSkips.map((entry) => `${entry.package}${entry.entryPoint ? ` ${entry.entryPoint}` : ""}: ${entry.reason}`).join("; ")}`,
    );
  return new Map(
    result.findings.map((finding) => [
      path.basename(finding.report),
      {
        package: finding.package,
        text: fs.readFileSync(path.join(ROOT, finding.report), "utf8"),
      },
    ]),
  );
}

/** @param {Map<string, { package: string, text: string }>} current */
export function signatureEntries(current) {
  return Object.fromEntries(
    [...current].map(([file, report]) => [
      file,
      {
        package: report.package,
        sha256: createHash("sha256").update(report.text).digest("hex"),
      },
    ]),
  );
}

export function signatureDigestFailures(expected, actual) {
  const files = new Set([...Object.keys(expected), ...Object.keys(actual)]);
  return [...files]
    .sort()
    .filter((file) => expected[file]?.sha256 !== actual[file]?.sha256)
    .map((file) => `${file}: signature digest differs from baseline`);
}

export function packagesWithChangedBaselines(previous, current) {
  const changed = new Set();
  const files = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const file of files) {
    if (previous[file]?.sha256 === current[file]?.sha256) continue;
    const packageDir = current[file]?.package ?? previous[file]?.package;
    if (packageDir) changed.add(packageDir);
  }
  return [...changed].sort();
}

function packageVersion(packageDir) {
  return JSON.parse(
    fs.readFileSync(path.join(ROOT, packageDir, "package.json"), "utf8"),
  ).version;
}

function main() {
  const write = process.argv.includes("--write");
  const current = reports();
  const entries = signatureEntries(current);
  if (write) {
    fs.writeFileSync(
      POLICY,
      `${JSON.stringify(
        {
          version: 1,
          description:
            "SHA-256 digests of API Extractor's stable Markdown signatures. Full reports are CI artifacts. After bootstrap, changing a digest also requires changing that package version.",
          reports: current.size,
          entries,
        },
        null,
        2,
      )}\n`,
    );
    console.log(`API signatures: wrote ${current.size} report baseline(s).`);
    return;
  }

  const policy = readJson(POLICY, { entries: {} });
  const failures = signatureDigestFailures(policy.entries ?? {}, entries);
  const ref = baseRef(ROOT, "API_SIGNATURES_BASE_REF");
  const policyAtBase = ref
    ? jsonAtRef(ROOT, ref, "api-signatures-policy.json")
    : null;
  if (policyAtBase !== null) {
    for (const packageDir of packagesWithChangedBaselines(
      policyAtBase.entries ?? {},
      policy.entries ?? {},
    )) {
      const previousVersion = jsonAtRef(
        ROOT,
        ref,
        `${packageDir}/package.json`,
      )?.version;
      if (packageVersion(packageDir) === previousVersion)
        failures.push(
          `${packageDir}: API baseline changed without a package version change`,
        );
    }
  }

  for (const failure of failures) console.error(`  ${failure}`);
  console.log(
    `API signatures: ${failures.length === 0 ? "PASS" : "FAIL"}; ${current.size} entry point(s) checked${ref ? ` against ${ref}` : ""}.`,
  );
  if (failures.length > 0) process.exitCode = 1;
}

const invokedDirectly =
  process.argv[1] !== undefined &&
  fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
if (invokedDirectly) main();
