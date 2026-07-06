#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(hostRoot, "../..");
const entry = join(hostRoot, "worklet/entry.mjs");
const output = join(hostRoot, "worklet/worklet.bundle.mjs");
const nobleCrypto = join(repoRoot, "conformance/bare-interop/noble-crypto.mjs");
const importsPath = join(hostRoot, "worklet/imports.generated.json");

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
    "--defer",
    "node:worker_threads",
    "--imports",
    importsPath,
    "--target",
    "darwin",
    "--target",
    "linux",
    "--out",
    output,
    entry
  ],
  { stdio: "inherit", cwd: hostRoot }
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`desktop worklet bundle written to ${output}`);
