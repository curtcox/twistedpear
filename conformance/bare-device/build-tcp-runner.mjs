#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const deviceRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(deviceRoot, "../..");
const importsPath = join(deviceRoot, "imports.generated.json");
const nobleCrypto = join(repoRoot, "conformance/bare-interop/noble-crypto.mjs");

writeFileSync(
  importsPath,
  `${JSON.stringify(
    {
      "@noble/hashes/crypto": nobleCrypto,
      "@noble/ciphers/crypto": nobleCrypto,
      "@noble/curves/crypto": nobleCrypto,
    },
    null,
    2,
  )}\n`,
);

const result = spawnSync(
  "npx",
  [
    "bare-pack",
    "--base",
    repoRoot,
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
    "node:http",
    "--defer",
    "node:stream",
    "--defer",
    "bare-tcp",
    "--defer",
    "bare-dgram",
    "--defer",
    "bare-fs",
    "--imports",
    importsPath,
    "--out",
    join(deviceRoot, "tcp-runner.bundle"),
    join(deviceRoot, "tcp-runner.mjs"),
  ],
  { stdio: "inherit", cwd: deviceRoot },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log("bare-device TCP runner bundle written");
