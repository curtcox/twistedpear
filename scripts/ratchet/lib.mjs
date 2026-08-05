import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const NO_FALLBACK = Symbol("no fallback");

export function readJson(file, fallback = NO_FALLBACK) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch (error) {
    if (
      fallback !== NO_FALLBACK &&
      /** @type {NodeJS.ErrnoException} */ (error).code === "ENOENT"
    ) {
      return fallback;
    }
    throw error;
  }
}

export function writeJson(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}

function refExists(root, ref) {
  return (
    spawnSync("git", ["rev-parse", "--verify", "--quiet", `${ref}^{commit}`], {
      cwd: root,
      encoding: "utf8",
    }).status === 0
  );
}

export function baseRef(root, envName = "RATCHET_BASE_REF") {
  const candidates = [
    process.env[envName],
    process.env.GITHUB_BASE_REF
      ? `origin/${process.env.GITHUB_BASE_REF}`
      : null,
    "origin/main",
    "HEAD~1",
    "HEAD",
  ].filter(Boolean);
  return candidates.find((ref) => refExists(root, ref)) ?? null;
}

export function jsonAtRef(root, ref, relativeFile) {
  const result = spawnSync("git", ["show", `${ref}:${relativeFile}`], {
    cwd: root,
    encoding: "utf8",
  });
  if (result.status !== 0 || !result.stdout) return null;
  try {
    return JSON.parse(result.stdout);
  } catch {
    return null;
  }
}

export function compareDiagnosticSet({
  root,
  baselineFile,
  current,
  write = false,
  allowRegressions = false,
  description,
  envName,
}) {
  const relative = path.relative(root, baselineFile);
  const baseline = readJson(baselineFile, {
    version: 1,
    description,
    entries: [],
  });
  const previousEntries = new Set(baseline.entries ?? []);
  const currentEntries = [...new Set(current)].sort();
  const additions = currentEntries.filter(
    (entry) => !previousEntries.has(entry),
  );
  const stale = [...previousEntries]
    .filter((entry) => !currentEntries.includes(entry))
    .sort();

  if (write) {
    if (additions.length > 0 && !allowRegressions) {
      throw new Error(
        `Refusing to loosen ${relative}; ${additions.length} new finding(s). Pass --allow-regressions to establish an intentional baseline.`,
      );
    }
    writeJson(baselineFile, {
      version: 1,
      description,
      entries: currentEntries,
    });
    return { additions, stale, wrote: true, base: null };
  }

  const ref = baseRef(root, envName);
  const prior = ref ? jsonAtRef(root, ref, relative) : null;
  const priorEntries = new Set(prior?.entries ?? []);
  const baselineGrowth = prior
    ? [...previousEntries].filter((entry) => !priorEntries.has(entry)).sort()
    : [];
  return { additions, stale, baselineGrowth, wrote: false, base: ref };
}

export function printDiagnosticResult(label, result) {
  for (const entry of result.additions ?? []) console.error(`  + ${entry}`);
  for (const entry of result.baselineGrowth ?? [])
    console.error(`  baseline + ${entry}`);
  if ((result.stale ?? []).length > 0) {
    console.warn(
      `${label}: ${(result.stale ?? []).length} stale baseline finding(s); run the baseline command to tighten it.`,
    );
  }
  const failed =
    (result.additions ?? []).length > 0 ||
    (result.baselineGrowth ?? []).length > 0;
  console.log(
    `${label}: ${failed ? "FAIL" : "PASS"}; ${(result.additions ?? []).length} new, ${(result.stale ?? []).length} stale.`,
  );
  return !failed;
}
