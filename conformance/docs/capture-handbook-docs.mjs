#!/usr/bin/env node
/**
 * Regenerate all Handbook documentation screenshots.
 */

import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const docsRoot = dirname(fileURLToPath(import.meta.url));

function run(script) {
  const result = spawnSync(process.execPath, [join(docsRoot, script)], {
    cwd: join(docsRoot, "../.."),
    stdio: "inherit",
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

run("capture-handbook-web-ui.mjs");
run("capture-handbook-mobile-ui.mjs");
console.log("handbook docs captures complete");
