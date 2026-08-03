/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
// @ts-nocheck

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
    "/apps/**",
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
  concurrency: 2,
  timeoutMS: 10000,
  thresholds: { high: 80, low: 60, break: null }
};
