// @ts-nocheck
import js from "@eslint/js";
import tsParser from "@typescript-eslint/parser";
import tsPlugin from "@typescript-eslint/eslint-plugin";

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
  "conformance/web-hyperdrive/web-hyper-fetch.js"
];

export default [
  { ignores },
  {
    ...js.configs.recommended,
    files: ["**/*.{js,mjs,cjs}"],
    rules: Object.fromEntries(
      Object.entries(js.configs.recommended.rules).map(([name, level]) => [name, level === "error" ? "warn" : level])
    )
  },
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaVersion: 2022, sourceType: "module" }
    },
    plugins: { "@typescript-eslint": tsPlugin },
    rules: {
      "no-undef": "off",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": "warn"
    }
  }
];
