/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    "packages/protocol/src/**/*.ts",
    "packages/effects/src/**/*.ts",
    "!packages/**/*.gen.ts",
    "!packages/**/index.ts"
  ],
  // SwiftPM leaves platform-specific symlinks below ignored `.build` trees.
  // Exclude both each directory entry and its contents so mutation sandboxes
  // stay independent of local mobile build outputs.
  ignorePatterns: [
    "/apps/host-desktop/packages",
    "/archive/**",
    "/authors/**",
    "/cookbook/**",
    "/docs/**",
    "/guide/**",
    "/site/**",
    "**/.build",
    "**/.build/**"
  ],
  testRunner: "vitest",
  vitest: { configFile: "vitest.config.ts" },
  reporters: ["clear-text", "progress", "json"],
  jsonReporter: { fileName: "reports/mutation/mutation.json" },
  coverageAnalysis: "perTest",
  // Static mutants reload the full 850-test mutation workspace and accounted
  // for 83% of the measured survey runtime, exceeding the three-hour CI limit.
  ignoreStatic: true,
  // GitHub-hosted Linux runners provide four cores; use them so the complete
  // survey remains practical both nightly and during Pages publication.
  concurrency: 4,
  timeoutMS: 10000,
  thresholds: { high: 80, low: 60, break: null }
};
