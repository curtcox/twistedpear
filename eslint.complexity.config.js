import tsParser from "@typescript-eslint/parser";
import thresholds from "./complexity-rules.json" with { type: "json" };

const rulesFor = (limits) => ({
  complexity: ["warn", limits.complexity],
  "max-depth": ["warn", limits.maxDepth],
  "max-params": ["warn", limits.maxParams],
  "max-lines-per-function": [
    "warn",
    {
      max: limits.maxLinesPerFunction,
      skipBlankLines: true,
      skipComments: true,
    },
  ],
  "max-nested-callbacks": ["warn", limits.maxNestedCallbacks],
});

export default [
  {
    ignores: [
      "**/dist/**",
      "**/node_modules/**",
      "site/**",
      "archive/**",
      "**/*.gen.ts",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    rules: rulesFor(thresholds.source),
  },
  {
    files: [
      "**/*.test.{ts,tsx}",
      "**/test/**/*.{ts,tsx}",
      "conformance/**/*.{ts,tsx}",
    ],
    rules: rulesFor(thresholds.test),
  },
];
