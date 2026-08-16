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
 * floor without paying for the survey. An unscoped direct Stryker run mutates
 * all of them; the nightly gate shards that same list and merges the reports.
 */
export const MUTATION_TARGETS = {
  protocol: ["packages/protocol/src/**/*.ts"],
  effects: ["packages/effects/src/**/*.ts"],
  "reticulum-ts": ["packages/reticulum-ts/src/**/*.ts"],
  "lxmf-ts": ["packages/lxmf-ts/src/**/*.ts"],
  "cas-256t": ["packages/cas-256t/src/**/*.ts"],
  "host-core": ["packages/host-core/src/**/*.ts"],
  "app-registry": ["packages/app-registry/src/**/*.ts"],
  "bridge-freenet": [
    "packages/bridge-freenet/src/core/**/*.ts",
    "packages/bridge-freenet/src/client/**/*.ts",
    "packages/bridge-freenet/src/server/**/*.ts",
  ],
  // These packages are substantially larger or contain hardware adapters.
  // Mutate their authority, authentication, replay, policy, and wire-framing
  // seams first: they are deterministic, security-sensitive, and have focused
  // unit suites. Expanding the whole packages would add roughly 14 000 mutants
  // and made Stryker's instrumented dry run abort before tests could start.
  "miniapp-runtime": [
    "packages/miniapp-runtime/src/broker.ts",
    "packages/miniapp-runtime/src/capabilities.ts",
    "packages/miniapp-runtime/src/security-policies.ts",
    "packages/miniapp-runtime/src/sandbox/{broker-dispatch,json-wire,prepare-bundle}.ts",
  ],
  "reticulum-interfaces": [
    "packages/reticulum-interfaces/src/policy.ts",
    "packages/reticulum-interfaces/src/auto-discovery.ts",
    "packages/reticulum-interfaces/src/{ble/spec-framing,optical/framing}.ts",
  ],
  "peer-discovery": [
    "packages/peer-discovery/src/{budget,coordinator,crypto-backend,replay-cache}.ts",
  ],
};

export const MUTATED_PACKAGES = Object.keys(MUTATION_TARGETS);

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
    ...selected.flatMap((name) => MUTATION_TARGETS[name]),
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
  // Ask Vitest for tests related to the instrumented sources. Running every
  // project for each package loaded the entire 850-file suite into a worker
  // and can abort during Stryker's dry run before a mutant is exercised.
  vitest: {
    configFile: "vitest.mutation.config.ts",
    related: true,
  },
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  coverageAnalysis: "perTest",
  // Static mutants repeatedly reload the mutation workspace and accounted
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
