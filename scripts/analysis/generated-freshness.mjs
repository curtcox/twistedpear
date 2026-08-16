#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);

export const GENERATED_OUTPUTS = [
  "packages/effects/src/types.gen.ts",
  "packages/protocol/src/device-registry.gen.ts",
  "packages/miniapp-runtime/src/device-capabilities.gen.ts",
  "apps/harness-mobile/worklet/store-posture.generated.mjs",
  "apps/harness-mobile/worklet/worklet.bundle.mjs",
  "apps/host-desktop/worklet/worklet.bundle",
];

const STEPS = [
  [process.execPath, ["scripts/generate-event-types.mjs"]],
  [process.execPath, ["scripts/generate-device-registry.mjs"]],
  ["npm", ["run", "build:worklet"]],
  ["npm", ["run", "build", "--workspace=host-desktop"]],
];

function snapshot() {
  return new Map(
    GENERATED_OUTPUTS.map((relative) => [
      relative,
      fs.readFileSync(path.join(ROOT, relative)),
    ]),
  );
}

export function changedPaths(before, after) {
  return [...before].flatMap(([relative, contents]) =>
    after.get(relative)?.equals(contents) ? [] : [relative],
  );
}

function restore(original) {
  for (const [relative, contents] of original)
    fs.writeFileSync(path.join(ROOT, relative), contents);
}

function writeReport(report) {
  const output = path.join(ROOT, "artifacts/generated-freshness.json");
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(report, null, 2)}\n`);
}

function main() {
  const original = snapshot();
  let failedCommand = null;
  let generated = null;
  try {
    for (const [command, args] of STEPS) {
      const result = spawnSync(command, args, {
        cwd: ROOT,
        stdio: "inherit",
        env: { ...process.env, TWISTEDPEAR_STORE_POSTURE: "dev" },
      });
      if (result.status !== 0) {
        failedCommand = [command, ...args].join(" ");
        break;
      }
    }
    if (failedCommand === null) generated = snapshot();
  } finally {
    restore(original);
  }

  const stale = generated === null ? [] : changedPaths(original, generated);
  const ok = failedCommand === null && stale.length === 0;
  writeReport({
    version: 1,
    ok,
    failedCommand,
    checked: GENERATED_OUTPUTS,
    stale,
  });

  if (failedCommand !== null) {
    console.error(`Generated freshness: command failed: ${failedCommand}`);
    process.exit(1);
  }
  if (stale.length > 0) {
    console.error("Generated freshness: committed outputs are stale:");
    for (const relative of stale) console.error(`  ${relative}`);
    console.error("Run npm run generated:update and commit the results.");
    process.exit(1);
  }
  console.log(
    `Generated freshness: ${GENERATED_OUTPUTS.length} committed outputs match their generators.`,
  );
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
