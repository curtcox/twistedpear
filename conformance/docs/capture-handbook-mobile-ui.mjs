#!/usr/bin/env node
/**
 * Capture docs/images/ios-handbook-mobile.png (chapter + prev/next, phone width).
 */

import { join } from "node:path";
import { captureHandbookScreenshot, repoRoot } from "./handbook-capture-lib.mjs";

const output = join(repoRoot, "docs/images/ios-handbook-mobile.png");

await captureHandbookScreenshot({
  output,
  viewport: { width: 390, height: 844 },
  layout: { maxWidth: 390, pageBackground: "#000", rootBackground: "#fff" },
  platform: "ios",
  scene: "chapter",
  logPrefix: "handbook-capture/ios"
});

console.log(`handbook mobile UI capture written to ${output}`);
