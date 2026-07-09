#!/usr/bin/env node
/**
 * Desktop soak slice (Phase 6 M7 nightly tier): repeated mini-app launch/stop under churn.
 * Full 72 h soak is device-gated; this script validates the nightly CI hook.
 */

import { pathToFileURL } from "node:url";
import { runDesktopFullLoop } from "../desktop/full-loop.mjs";
import { runDesktopHostileSmoke } from "../desktop/hostile-smoke.mjs";

const cycles = Number.parseInt(process.env.DESKTOP_SOAK_CYCLES ?? "3", 10);

export async function runDesktopSoakSlice() {
  for (let cycle = 0; cycle < cycles; cycle += 1) {
    await runDesktopFullLoop();
    await runDesktopHostileSmoke();
    console.log(`desktop-soak: cycle ${cycle + 1}/${cycles} passed`);
  }

  console.log(`desktop-soak: ${cycles} churn cycles passed`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesktopSoakSlice().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
