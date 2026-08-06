import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

// Files that execute in a browser page: the Electron renderer, the web worklet
// entry, and the conformance web entries together with the Playwright drivers
// that inline page callbacks alongside their Node code.
const browserGlobs = [
  "apps/host-desktop/src/renderer/**/*.{js,mjs,cjs}",
  "apps/harness-mobile/worklet/web-entry.mjs",
  "conformance/**/*.{js,mjs,cjs}",
];

// Bare runtime globals; the Bare worklet host injects both.
const bareGlobs = [
  "apps/harness-mobile/worklet/**/*.mjs",
  "packages/worklet-core/src/**/*.mjs",
  "conformance/**/*.mjs",
];

// Worklet sources run under Bare rather than Node, and declare the ambient
// names they rely on with file-local `/* global */` directives. Handing them
// Node's globals as well would make those directives redeclarations.
const workletGlobs = [
  "apps/harness-mobile/worklet/**/*.mjs",
  "packages/worklet-core/src/**/*.mjs",
];

const ignores = [
  "**/node_modules/**",
  "**/dist/**",
  "site/**",
  "archive/**",
  "**/*.gen.ts",
  "**/*.generated.mjs",
  "**/bundle.js",
  "**/*.bundle.js",
  "**/*.bundle.mjs",
  "**/*.bundle",
  "conformance/web-hyperdrive/web-hyper-fetch.js",
  // Generated native build artifacts and bundles
  "apps/harness-mobile/android/**",
  "apps/harness-mobile/ios/**",
  "apps/harness-mobile/public/**",
  "packages/reticulum-ts/docs/api/**",
  "conformance/docs/.tmp-handbook-capture/**",
  "conformance/**/fixtures.mjs",
  "conformance/**/publisher-data.mjs",
  "conformance/**/web-core.worker.js",
  "conformance/**/web-hyper-fetch.js",
  "conformance/web-storage/fixture.mjs",
  "apps/handbook/generated/**",
  "apps/handbook/seeds/**",
];

export default [
  { ignores },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    rules: Object.fromEntries(
      Object.entries(js.configs.recommended.rules).map(([name, level]) => [
        name,
        level === "error" ? "warn" : level,
      ]),
    ),
  },
  {
    files: ["**/*.{js,mjs,cjs}"],
    ignores: workletGlobs,
    languageOptions: { globals: { ...globals.es2021, ...globals.node } },
  },
  {
    files: browserGlobs,
    languageOptions: { globals: globals.browser },
  },
  {
    files: bareGlobs,
    languageOptions: { globals: { Bare: "readonly", BareKit: "readonly" } },
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" },
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn",
    },
  },
];
