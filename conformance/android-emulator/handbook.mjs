#!/usr/bin/env node
/**
 * Android emulator lab: Handbook D3 slice on Bare worklet path (headless; no adb).
 */

import { pathToFileURL } from "node:url";
import { runHandbookMobileSlice } from "../handbook/mobile-slice.mjs";

export async function runAndroidHandbookSlice() {
  const result = await runHandbookMobileSlice({
    platform: "android",
    sandboxBackend: "bare-worker",
    label: "android-emulator",
  });
  console.log(
    `android-emulator/handbook: ${result.chapters} chapter(s), ${result.applets} applet(s), report ${result.reportId.slice(0, 12)}…`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runAndroidHandbookSlice().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
