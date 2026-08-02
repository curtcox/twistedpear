/** @type {import('@stryker-mutator/api/core').PartialStrykerOptions} */
export default {
  mutate: [
    "packages/protocol/src/**/*.ts",
    "packages/effects/src/**/*.ts",
    "!packages/**/*.gen.ts",
    "!packages/**/index.ts"
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
