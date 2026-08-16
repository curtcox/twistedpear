import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson } from "../ratchet/lib.mjs";

const round = (value) => Math.round(value * 10) / 10;

export function percentage(covered, missed) {
  const total = covered + missed;
  return total === 0 ? 0 : round((covered / total) * 100);
}

export function coverageFindings(measured, floors, metrics, tolerance) {
  const findings = [];
  for (const [scope, scopeFloors] of Object.entries(floors)) {
    const current = measured[scope];
    if (!current) {
      findings.push(`${scope}: has a recorded floor but was not measured`);
      continue;
    }
    for (const metric of metrics)
      if (current[metric] + tolerance < (scopeFloors[metric] ?? 0))
        findings.push(
          `${scope} ${metric}: ${current[metric]}% < floor ${scopeFloors[metric]}%`,
        );
  }
  for (const scope of Object.keys(measured))
    if (!floors[scope]) findings.push(`${scope}: measured without a floor`);
  return findings;
}

export function applyCoveragePolicy({
  root,
  language,
  measured,
  metrics,
  description,
  write,
  allowRegressions,
}) {
  const ratchetPath = path.join(
    root,
    "language-ratchets",
    `${language}-coverage.json`,
  );
  const recorded = readJson(ratchetPath, { scopes: {}, tolerance: 0.5 });
  const tolerance = recorded.tolerance ?? 0.5;

  if (write) {
    const scopes = {};
    for (const [scope, current] of Object.entries(measured)) {
      const prior = recorded.scopes?.[scope] ?? {};
      scopes[scope] = Object.fromEntries(
        metrics.map((metric) => {
          const now = current[metric];
          const was = prior[metric] ?? 0;
          if (!allowRegressions && now + tolerance < was)
            throw new Error(
              `Refusing to lower ${scope} ${metric}: ${was} -> ${now}`,
            );
          return [metric, allowRegressions ? now : Math.max(was, now)];
        }),
      );
    }
    writeJson(ratchetPath, {
      version: 1,
      description,
      tolerance,
      scopes,
    });
    console.log(
      `${language} coverage: wrote ${Object.keys(scopes).length} scope floor(s).`,
    );
    return 0;
  }

  const findings = coverageFindings(
    measured,
    recorded.scopes ?? {},
    metrics,
    tolerance,
  );
  const artifactPath = path.join(
    root,
    "artifacts/languages",
    `${language}-coverage.json`,
  );
  fs.mkdirSync(path.dirname(artifactPath), { recursive: true });
  writeJson(artifactPath, {
    version: 1,
    language,
    generatedAt: new Date().toISOString(),
    metrics,
    tolerance,
    scopes: measured,
    findings,
  });
  for (const finding of findings) console.error(`  ${finding}`);
  console.log(
    `${language} coverage: ${findings.length === 0 ? "PASS" : "FAIL"}; ${Object.keys(measured).length} scope(s).`,
  );
  return findings.length === 0 ? 0 : 1;
}
