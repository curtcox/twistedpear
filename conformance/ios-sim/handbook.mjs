#!/usr/bin/env node
/**
 * iOS simulator harness: Handbook D3 slice on Bare worklet path.
 */

import { pathToFileURL } from "node:url";
import { runHandbookMobileSlice } from "../handbook/mobile-slice.mjs";

export async function runIosHandbookSlice() {
  const result = await runHandbookMobileSlice({
    platform: "ios",
    sandboxBackend: "bare-worker",
    label: "ios-sim",
  });
  console.log(
    `[ios-sim/handbook] ${result.chapters} chapter(s), ${result.applets} applet(s), report ${result.reportId.slice(0, 12)}…`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runIosHandbookSlice().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
