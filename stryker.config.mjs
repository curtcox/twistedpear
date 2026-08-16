/**
 * Packages whose tests are held to a mutation score.
 *
 * Coverage says a line executed; only mutation says an assertion would have
 * noticed it change. Until 2026-08-15 this list was `protocol` and `effects`
 * alone, which left the wire-compatible stacks and the host orchestration —
 * where a silently wrong byte is the whole failure mode — measured by coverage
 * percentage only.
 *
 * `packages/protocol` carries roughly 25 000 of the mutants on its own, so
 * scoping matters: `MUTATION_PACKAGES` narrows a run to a comma-separated
 * subset (`MUTATION_PACKAGES=cas-256t,lxmf-ts`) for iterating on one package's
 * floor without paying for the survey. An unscoped run mutates all of them,
 * which is what the nightly gate does.
 */
export const MUTATED_PACKAGES = [
  "protocol",
  "effects",
  "reticulum-ts",
  "lxmf-ts",
  "cas-256t",
  "host-core",
];

const requested = process.env.MUTATION_PACKAGES?.trim();
const selected = requested
  ? requested
      .split(",")
      .map((name) => name.trim())
      .filter(Boolean)
  : MUTATED_PACKAGES;

for (const name of selected) {
  if (!MUTATED_PACKAGES.includes(name)) {
    throw new Error(
      `MUTATION_PACKAGES names "${name}", which is not in MUTATED_PACKAGES. Add it there first so it gets a recorded floor.`,
    );
  }
}

/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    ...selected.map((name) => `packages/${name}/src/**/*.ts`),
    // Generated sources have no author to fix a surviving mutant, and a barrel
    // is re-exports: mutating it measures the module system, not the tests.
    "!packages/**/*.gen.ts",
    "!packages/**/index.ts",
  ],
  // SwiftPM leaves platform-specific symlinks below ignored `.build` trees, and
  // CocoaPods leaves dangling header symlinks below `ios/Pods`. Exclude both
  // each directory entry and its contents so mutation sandboxes stay
  // independent of local mobile build outputs.
  ignorePatterns: [
    "/apps/host-desktop/packages",
    "/archive/**",
    "/authors/**",
    "/cookbook/**",
    "/docs/**",
    "/guide/**",
    "/site/**",
    "**/.build",
    "**/.build/**",
    "**/ios/Pods",
    "**/ios/Pods/**",
  ],
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  coverageAnalysis: "perTest",
  // Static mutants reload the full 850-test mutation workspace and accounted
  // for 83% of the measured survey runtime, exceeding the three-hour CI limit.
  ignoreStatic: true,
  // Keep disposable sandboxes under the repository's standard ignored output
  // root so they cannot be mistaken for source artifacts.
  tempDirName: ".tmp/stryker",
  // GitHub-hosted Linux runners provide four cores; use them so the complete
  // survey remains practical both nightly and during Pages publication.
  concurrency: 4,
  timeoutMS: 10000,
  thresholds: { high: 80, low: 60, break: null },
};
