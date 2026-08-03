#!/usr/bin/env node
// @ts-nocheck
/**
 * Capture docs/images/handbook-web-handbook.png (TOC search UI, desktop width).
 */

import { join } from "node:path";
import { captureHandbookScreenshot, repoRoot } from "./handbook-capture-lib.mjs";

const output = join(repoRoot, "docs/images/handbook-web-handbook.png");

await captureHandbookScreenshot({
  output,
  viewport: { width: 960, height: 900 },
  layout: { maxWidth: 960 },
  platform: "web",
  scene: "search",
  logPrefix: "handbook-capture/web"
});

console.log(`handbook web UI capture written to ${output}`);
