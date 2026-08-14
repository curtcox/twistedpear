import js from "@eslint/js";
import globals from "globals";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";
import { concatGroupConfigs } from "./eslint.concat-groups.mjs";

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
  // Renderer bundles: third-party (jsQR, qrcode) plus peer-audio.js, which
  // scripts/build-renderer-vendor.mjs builds from peer-audio-fsk.ts. None is
  // hand-edited, and the one source that is ours is linted where it lives.
  "apps/host-desktop/src/renderer/vendor/**",
  // Concat inputs for worklet/entry.mjs and worklet/web-entry.mjs. Two of them
  // split mid-object-literal and so do not parse alone; the assembled files are
  // committed and linted, and carry the coverage for all of them.
  "apps/harness-mobile/worklet/entry-part-*.mjs",
  "apps/harness-mobile/worklet/web-entry-part-*.mjs",
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
  // Files concatenated into one script: each may use what its siblings declare.
  ...concatGroupConfigs(),
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
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          args: "all",
          argsIgnorePattern: "^_",
          caughtErrors: "all",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          ignoreRestSiblings: true,
        },
      ],
    },
  },
];
