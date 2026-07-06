#!/usr/bin/env node
/**
 * Build the harness-mobile Bare worklet bundle for react-native-bare-kit.
 * Requires `npm run build` at the repo root first.
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const harnessRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(harnessRoot, "../..");
const entry = join(harnessRoot, "worklet/entry.mjs");
const output = join(harnessRoot, "worklet/worklet.bundle.mjs");
const nobleCrypto = join(repoRoot, "conformance/bare-interop/noble-crypto.mjs");
const importsPath = join(harnessRoot, "worklet/imports.generated.json");

writeFileSync(
  importsPath,
  `${JSON.stringify(
    {
      "@noble/hashes/crypto": nobleCrypto,
      "@noble/ciphers/crypto": nobleCrypto,
      "@noble/curves/crypto": nobleCrypto
    },
    null,
    2
  )}\n`
);

const result = spawnSync(
  "npx",
  [
    "bare-pack",
    "--linked",
    "--defer",
    "node:crypto",
    "--defer",
    "node:net",
    "--defer",
    "node:dgram",
    "--defer",
    "node:fs",
    "--defer",
    "node:path",
    "--defer",
    "node:os",
    "--imports",
    importsPath,
    "--target",
    "android",
    "--target",
    "ios",
    "--out",
    output,
    entry
  ],
  { stdio: "inherit", cwd: harnessRoot }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`worklet bundle written to ${output}`);
