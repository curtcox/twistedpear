#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync, lstatSync, symlinkSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = join(hostRoot, "../..");
const entry = join(hostRoot, "worklet/entry.mjs");
const output = join(hostRoot, "worklet/worklet.bundle");
const nobleCrypto = join(repoRoot, "conformance/bare-interop/noble-crypto.mjs");
const nodeCryptoStub = join(repoRoot, "conformance/bare-interop/node-crypto-stub.mjs");
const importsPath = join(hostRoot, "worklet/imports.generated.json");
const packagesLink = join(hostRoot, "packages");
const packagesTarget = join(repoRoot, "packages");
const nodeModulesLink = join(hostRoot, "node_modules");
const nodeModulesTarget = join(repoRoot, "node_modules");

function ensurePackagesLink() {
  if (existsSync(packagesLink)) {
    if (lstatSync(packagesLink).isSymbolicLink()) {
      return;
    }

    return;
  }

  symlinkSync(packagesTarget, packagesLink, "dir");
}

function ensureNodeModulesLink() {
  if (existsSync(nodeModulesLink)) {
    if (lstatSync(nodeModulesLink).isSymbolicLink()) {
      return;
    }

    return;
  }

  symlinkSync(nodeModulesTarget, nodeModulesLink, "dir");
}

ensurePackagesLink();
ensureNodeModulesLink();

writeFileSync(
  importsPath,
  `${JSON.stringify(
    {
      "@noble/hashes/crypto": nobleCrypto,
      "@noble/ciphers/crypto": nobleCrypto,
      "@noble/curves/crypto": nobleCrypto,
      "node:crypto": nodeCryptoStub,
      "@twistedpear/reticulum-ts": join(repoRoot, "packages/reticulum-ts/dist/worklet.js"),
      "@twistedpear/bridge-hyper": join(repoRoot, "packages/bridge-hyper/dist/worklet.js"),
      "@twistedpear/miniapp-runtime": join(repoRoot, "packages/miniapp-runtime/dist/worklet.js")
    },
    null,
    2
  )}\n`
);

const bundledBuild = spawnSync(process.execPath, [join(hostRoot, "scripts/build-bundled-catalog.mjs")], {
  cwd: hostRoot,
  stdio: "inherit"
});
if (bundledBuild.status !== 0) {
  process.exit(bundledBuild.status ?? 1);
}

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
