// @ts-nocheck
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";

const root = dirname(fileURLToPath(import.meta.url));
const manifest = join(root, "ordered-log-contract", "Cargo.toml");

function runCargo(args) {
  const result = spawnSync("cargo", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"]
  });
  if (result.status !== 0) process.exit(result.status ?? 1);
  return result.stdout.trim();
}

runCargo(["test", "--manifest-path", manifest]);
runCargo([
  "build",
  "--release",
  "--target",
  "wasm32-unknown-unknown",
  "--manifest-path",
  manifest
]);
const measured = JSON.parse(
  runCargo([
    "run",
    "--release",
    "--manifest-path",
    manifest,
    "--example",
    "measure"
  ])
);
if (
  measured.concurrentWriterEvidence?.commutative !== true ||
  measured.growthAndMergeCost?.length !== 6
) {
  throw new Error("S3 measurement output did not satisfy its invariants");
}

const rustVersion = spawnSync("rustc", ["--version"], {
  encoding: "utf8"
}).stdout.trim();
const wasm = readFileSync(
  join(
    root,
    "ordered-log-contract",
    "target",
    "wasm32-unknown-unknown",
    "release",
    "twistedpear_freenet_ordered_log_spike.wasm"
  )
);
const evidence = {
  ...measured,
  recordedAt: new Date().toISOString(),
  host: {
    platform: process.platform,
    architecture: process.arch,
    rustVersion
  },
  wasmArtifact: {
    bytes: wasm.length,
    sha256Hex: createHash("sha256").update(wasm).digest("hex")
  }
};
const output = join(root, "s3-measurements.json");
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
console.log(`S3 evidence written to ${output}`);
