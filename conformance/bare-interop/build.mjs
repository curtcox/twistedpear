#!/usr/bin/env node
/**
 * Bundle bare-interop entry for the Bare CLI (defers node:crypto like the harness worklet).
 */
import { spawnSync } from "node:child_process";
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const interopRoot = dirname(fileURLToPath(import.meta.url));
const entry = join(interopRoot, "entry.mjs");
const output = join(interopRoot, "bare-interop.bundle");
const nobleCrypto = join(interopRoot, "noble-crypto.mjs");
const importsPath = join(interopRoot, "imports.generated.json");

writeFileSync(
  importsPath,
  `${JSON.stringify(
    {
      "@noble/hashes/crypto": nobleCrypto,
      "@noble/ciphers/crypto": nobleCrypto,
      "@noble/curves/crypto": nobleCrypto,
      "@twistedpear/reticulum-ts": join(
        interopRoot,
        "../../packages/reticulum-ts/dist/worklet.js",
      ),
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
    join(interopRoot, "../.."),
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
    output,
    entry,
  ],
  { stdio: "inherit", cwd: interopRoot },
);

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log(`bare-interop bundle written to ${output}`);
