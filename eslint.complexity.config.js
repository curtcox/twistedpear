import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
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
      "**/*.generated.js",
      "**/*.generated.mjs",
      "packages/guida-twistedpear/seed/**",
      // Concat inputs for worklet/entry.mjs; two split mid-object-literal and
      // do not parse alone. Ignored in eslint.analysis.config.js for the same
      // reason — the assembled files are what get checked.
      "apps/harness-mobile/worklet/entry-part-*.mjs",
      "apps/harness-mobile/worklet/web-entry-part-*.mjs",
    ],
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tsPlugin },
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
