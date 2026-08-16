#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../..",
);
const write = process.argv.includes("--write");

export const VISUAL_BASELINES = [
  "guide/images/02-desktop-main-window.png",
  "guide/images/06-grants.png",
  "guide/images/05-capability-review.png",
];

export function changedImages(before, after) {
  return [...before].flatMap(([file, bytes]) =>
    after.get(file)?.equals(bytes) ? [] : [file],
  );
}

function main() {
  const original = new Map(
    VISUAL_BASELINES.map((file) => [
      file,
      fs.readFileSync(path.join(ROOT, file)),
    ]),
  );
  let generated = null;
  let commandFailed = false;
  try {
    const result = spawnSync(
      process.execPath,
      ["conformance/docs/capture-reader-guide-ui.mjs"],
      {
        cwd: ROOT,
        stdio: "inherit",
        env: {
          ...process.env,
          CAPTURE_READER_GUIDE_FILES: VISUAL_BASELINES.join(","),
        },
      },
    );
    commandFailed = result.status !== 0;
    if (!commandFailed)
      generated = new Map(
        VISUAL_BASELINES.map((file) => [
          file,
          fs.readFileSync(path.join(ROOT, file)),
        ]),
      );
  } finally {
    if (!write)
      for (const [file, bytes] of original)
        fs.writeFileSync(path.join(ROOT, file), bytes);
  }

  const changed = generated === null ? [] : changedImages(original, generated);
  const ok = !commandFailed && (write || changed.length === 0);
  const artifact = path.join(ROOT, "artifacts/visual-regression.json");
  fs.mkdirSync(path.dirname(artifact), { recursive: true });
  fs.writeFileSync(
    artifact,
    `${JSON.stringify(
      { version: 1, ok, baselines: VISUAL_BASELINES, changed, write },
      null,
      2,
    )}\n`,
  );

  if (commandFailed) {
    console.error("Visual regression: capture command failed.");
    process.exit(1);
  }
  if (!write && changed.length > 0) {
    console.error("Visual regression: rendered pixels changed:");
    for (const file of changed) console.error(`  ${file}`);
    console.error("Run npm run visual:baseline and review the image changes.");
    process.exit(1);
  }
  console.log(
    write
      ? `Visual regression: wrote ${VISUAL_BASELINES.length} baseline images.`
      : `Visual regression: ${VISUAL_BASELINES.length} images match exactly.`,
  );
}

if (
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
)
  main();
