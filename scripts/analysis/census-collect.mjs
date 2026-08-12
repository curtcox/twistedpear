/**
 * Measure the quality apparatus, not the code it inspects.
 *
 * Every other gate in this directory asks whether the repository is good. None
 * of them ask whether the question is still being asked. Delete a gate from
 * `scripts/checks/registry.mjs` and the CI matrix silently shrinks, `ci-green`
 * passes, and the dashboard reports only the gates that still exist. Delete a
 * few hundred tests and every ratchet gets *easier*: coverage percentages hold,
 * finding counts drop, the mutation score can rise. The whole system reads a
 * shrinking scope as an improving repository.
 *
 * This module reduces the apparatus to two shapes, so the comparison in
 * `census.mjs` stays a single loop:
 *
 * - **members** — named things that must not vanish (a gate, a CI job, a
 *   conformance runner). Disappearance is the finding.
 * - **counts** — numbers with a declared direction. Test totals may only rise;
 *   skipped tests and allowed-finding baselines may only fall.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parse as parseYaml } from "yaml";
import { readJson } from "../ratchet/lib.mjs";
import { gates } from "../checks/registry.mjs";

/** Count prefixes that may only rise. */
const RISING = [
  "tests:",
  "test-files:",
  "gates:",
  "ci:",
  "conformance:",
  "scripts:",
  "floor:",
];

/** Count prefixes that may only fall. */
const FALLING = ["skips:", "waivers:", "baseline-entries:", "budget:"];

/**
 * Which way a count is allowed to move.
 *
 * An undeclared prefix throws rather than defaulting, so a new measurement
 * cannot be added without someone stating what a regression in it looks like.
 *
 * @param {string} key
 * @returns {"up" | "down" | null}
 */
export function direction(key) {
  if (RISING.some((prefix) => key.startsWith(prefix))) return "up";
  if (FALLING.some((prefix) => key.startsWith(prefix))) return "down";
  return null;
}

/**
 * Allowed-finding baselines, named by the field holding the findings. Growth in
 * any of them is quality moving out.
 *
 * Each field is named rather than discovered, and a missing one throws: the
 * first draft of this looked for `entries` everywhere and silently counted
 * nothing for `sansio-ratchet.json`, which keeps its exemptions under three
 * other names. A measurement that quietly measures nothing is the failure this
 * whole gate exists to catch.
 */
const BASELINES = [
  ["lint-ratchet.json", "entries"],
  ["typed-lint-ratchet.json", "entries"],
  ["format-ratchet.json", "entries"],
  ["structure-ratchet.json", "entries"],
  ["complexity-ratchet.json", "entries"],
  ["size-ratchet.json", "entries"],
  ["sansio-ratchet.json", "adapterAllowlist"],
  ["sansio-ratchet.json", "exceptions"],
  ["sansio-ratchet.json", "protocolDependencyAllowlist"],
];

const SKIPPED = /\b(?:it|test|describe|suite)\.(?:skip|todo)\b/g;
const FOCUSED = /\b(?:it|test|describe|suite)\.only\b/g;

/**
 * The component a test file belongs to. Package and app tests are grouped by
 * package so that moving a suite between packages is visible as a pair of
 * deltas rather than as nothing at all.
 *
 * @param {string} root
 * @param {string} file absolute path
 */
function componentOf(root, file) {
  const segments = path.relative(root, file).split(path.sep);
  return ["packages", "apps", "conformance"].includes(segments[0]) &&
    segments[1]
    ? `${segments[0]}/${segments[1]}`
    : segments[0];
}

/**
 * Every test Vitest can collect, by component.
 *
 * Collection rather than execution: `vitest list` imports each test file and
 * reports what it declared, which expands `.each` tables and costs seconds
 * instead of the full suite. It needs the workspace built, because test files
 * import `@twistedpear/*` through emitted declarations.
 *
 * @param {string} root
 */
function testInventory(root) {
  const output = path.join(root, "artifacts", "census", "tests.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  const listed = spawnSync(
    process.execPath,
    ["node_modules/vitest/vitest.mjs", "list", `--json=${output}`],
    { cwd: root, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  if (listed.status !== 0) {
    process.stderr.write(listed.stderr ?? "");
    throw new Error(
      `vitest could not collect the suite (exit ${listed.status}); the census cannot count what will not load.`,
    );
  }
  /** @type {{name: string, file: string, projectName: string}[]} */
  const tests = readJson(output);
  const counts = { "tests:total": tests.length };
  const files = new Map();
  const projects = new Set();
  for (const test of tests) {
    const component = componentOf(root, test.file);
    counts[`tests:${component}`] = (counts[`tests:${component}`] ?? 0) + 1;
    if (!files.has(component)) files.set(component, new Set());
    files.get(component).add(test.file);
    projects.add(test.projectName);
  }
  let total = 0;
  for (const [component, paths] of files) {
    counts[`test-files:${component}`] = paths.size;
    total += paths.size;
  }
  counts["test-files:total"] = total;
  return {
    counts,
    projects: [...projects].sort(),
    files: [...new Set(tests.map((test) => test.file))].sort(),
  };
}

/**
 * Suppressed and focused tests. A suite can be hollowed out without deleting a
 * line of it, and `.only` silently drops every sibling test in its file.
 *
 * @param {string[]} files absolute paths
 */
function suppressionInventory(files) {
  let skipped = 0;
  const focused = [];
  for (const file of files) {
    const source = fs.readFileSync(file, "utf8");
    skipped += (source.match(SKIPPED) ?? []).length;
    if (FOCUSED.test(source)) focused.push(file);
    FOCUSED.lastIndex = 0;
  }
  return { skipped, focused };
}

/**
 * Jobs declared in every workflow, and the ones `ci-green` actually waits for.
 * `ci-green` is the single branch-protection check, so the difference between
 * those two lists is the set of jobs that gate nothing; `census-compare.mjs`
 * makes that difference a failure.
 *
 * @param {string} root
 */
function workflowInventory(root) {
  const directory = path.join(root, ".github", "workflows");
  const files = fs.readdirSync(directory).filter((f) => f.endsWith(".yml"));
  const ci = parseYaml(fs.readFileSync(path.join(directory, "ci.yml"), "utf8"));
  const jobs = Object.keys(ci.jobs ?? {});
  const gating = [].concat(ci.jobs?.["ci-green"]?.needs ?? []);
  return {
    workflows: files.sort().map((file) => `.github/workflows/${file}`),
    jobs: jobs.sort(),
    gating: [...gating].sort(),
  };
}

/**
 * Floors the ratchets are currently holding, and the size of every
 * allowed-finding baseline.
 *
 * @param {string} root
 */
function baselineInventory(root) {
  const counts = {};
  const coverage = readJson(path.join(root, "coverage-ratchet.json"), {});
  for (const [pkg, metrics] of Object.entries(coverage.packages ?? {}))
    for (const [metric, value] of Object.entries(metrics))
      counts[`floor:coverage:${pkg}:${metric}`] = value;
  const mutation = readJson(path.join(root, "mutation-ratchet.json"), {});
  if (mutation.score !== undefined)
    counts["floor:mutation:score"] = mutation.score;
  const sizes = readJson(path.join(root, "size-ratchet.json"), {});
  if (sizes.maxExcessLines !== undefined)
    counts["budget:size:excess-lines"] = sizes.maxExcessLines;
  for (const [file, field] of BASELINES) {
    const baseline = readJson(path.join(root, file), {});
    if (!Array.isArray(baseline[field]))
      throw new Error(
        `${file} has no "${field}" array; the census was counting it as an allowed-finding baseline. Update BASELINES in census-collect.mjs to the field that replaced it.`,
      );
    counts[`baseline-entries:${file}:${field}`] = baseline[field].length;
  }
  const sansio = readJson(path.join(root, "sansio-ratchet.json"), {});
  counts["floor:sansio:protocol-roots"] = (sansio.protocolRoots ?? []).length;
  const waivers = readJson(path.join(root, "checks-waivers.json"), {});
  const today = new Date().toISOString().slice(0, 10);
  counts["waivers:live"] = (waivers.waivers ?? []).filter(
    (waiver) => (waiver.expires ?? "") >= today,
  ).length;
  return counts;
}

/**
 * The whole measurement.
 *
 * @param {string} root
 */
export function collect(root) {
  const manifest = readJson(path.join(root, "package.json"));
  const tests = testInventory(root);
  const suppressions = suppressionInventory(tests.files);
  const ci = workflowInventory(root);
  const runners = fs
    .readdirSync(path.join(root, "conformance"), { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isDirectory() &&
        fs.existsSync(path.join(root, "conformance", entry.name, "run.mjs")),
    )
    .map((entry) => `conformance/${entry.name}`)
    .sort();
  const scripts = Object.keys(manifest.scripts ?? {})
    .filter(
      (name) =>
        name.startsWith("test:") ||
        name.startsWith("lint:") ||
        name.endsWith(":check"),
    )
    .sort();

  const members = {
    // Tier and command are part of the member: demoting a PR gate to nightly
    // or repointing it at a different script removes this entry and adds
    // another, which reads as the disappearance it is.
    gates: gates
      .map(
        (gate) =>
          `${gate.id} tier=${gate.tier} run=${gate.command.slice(2).join(" ")}`,
      )
      .sort(),
    ciJobs: ci.jobs,
    ciGating: ci.gating,
    workflows: ci.workflows,
    conformanceRunners: runners,
    scripts,
    vitestProjects: tests.projects,
  };

  const counts = {
    ...tests.counts,
    ...baselineInventory(root),
    "skips:suppressed-tests": suppressions.skipped,
    "gates:pr": gates.filter((gate) => gate.tier === "pr").length,
    "gates:nightly": gates.filter((gate) => gate.tier === "nightly").length,
    "gates:release": gates.filter((gate) => gate.tier === "release").length,
    "ci:jobs": ci.jobs.length,
    "ci:gating-jobs": ci.gating.length,
    "conformance:runners": runners.length,
    "scripts:quality": scripts.length,
  };
  for (const key of Object.keys(counts))
    if (direction(key) === null)
      throw new Error(
        `census count "${key}" has no declared direction; add its prefix to RISING or FALLING in census-collect.mjs.`,
      );

  return {
    members,
    counts,
    focusedTests: suppressions.focused.map((file) => path.relative(root, file)),
  };
}
