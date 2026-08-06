#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const bareRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(bareRoot, "../../..");
const nobleCrypto = join(repoRoot, "conformance/bare-interop/noble-crypto.mjs");
const bareBinary = join(repoRoot, "node_modules/bare/bin/bare");
const deferredModules = [
  "node:crypto",
  "node:net",
  "node:dgram",
  "node:fs",
  "node:path",
  "node:os",
  "node:http",
  "node:stream",
  "bare-tcp",
  "bare-dgram",
  "bare-fs",
];

let bundleDirectory = null;

function ensureBundles() {
  if (bundleDirectory !== null) {
    return bundleDirectory;
  }

  // Deferred native Bare modules resolve through the repository's node_modules.
  const tempRoot = join(repoRoot, ".tmp");
  mkdirSync(tempRoot, { recursive: true });
  bundleDirectory = mkdtempSync(join(tempRoot, "bare-runners-"));
  const importsPath = join(bundleDirectory, "imports.json");
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

  for (const name of ["tcp", "lifecycle"]) {
    const output = join(bundleDirectory, `${name}-runner.bundle`);
    const args = ["bare-pack", "--base", repoRoot];
    for (const moduleName of deferredModules) {
      args.push("--defer", moduleName);
    }
    args.push(
      "--imports",
      importsPath,
      "--out",
      output,
      join(bareRoot, `${name}-runner.mjs`),
    );

    const packed = spawnSync("npx", args, {
      cwd: repoRoot,
      encoding: "utf8",
    });
    if (packed.status !== 0) {
      throw new Error(
        `Failed to build ${name} Bare runner\n${packed.stdout ?? ""}${packed.stderr ?? ""}`,
      );
    }
  }

  return bundleDirectory;
}

function runBundle(name, args) {
  const directory = ensureBundles();
  const result = spawnSync(
    bareBinary,
    [join(directory, `${name}-runner.bundle`), ...args],
    {
      cwd: repoRoot,
      encoding: "utf8",
    },
  );
  if (result.status !== 0) {
    throw new Error(
      `${name} Bare runner failed\n${result.stdout ?? ""}${result.stderr ?? ""}`,
    );
  }

  return result.stdout ?? "";
}

export function runBareTcpSliceProcess({ label }) {
  const output = runBundle("tcp", [label]);
  process.stdout.write(output);
}

export function runBareLifecycleSliceProcess({ label, cycles }) {
  const output = runBundle("lifecycle", [label, String(cycles)]);
  process.stdout.write(output);
  const resultLine = output
    .split("\n")
    .find((line) => line.startsWith("[bare-runner-result] "));
  if (resultLine === undefined) {
    throw new Error("Lifecycle Bare runner did not emit a result");
  }

  return JSON.parse(resultLine.slice("[bare-runner-result] ".length));
}

process.once("exit", () => {
  if (bundleDirectory !== null) {
    rmSync(bundleDirectory, { recursive: true, force: true });
  }
});
