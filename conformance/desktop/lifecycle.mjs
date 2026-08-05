#!/usr/bin/env node
/**
 * Desktop worklet lifecycle: quiesce/reconnect against docker leaf-echo (Phase 6 M6 tier).
 */

import { pathToFileURL } from "node:url";
import { runBareLifecycleSliceProcess } from "../scenarios/bare/runner-host.mjs";
import { interopReady, LEAF_ECHO_PORT, waitForTcp } from "../scenarios/ts/harness.mjs";

export async function runDesktopLifecycleSlice(options = {}) {
  const cycles = Number.parseInt(process.env.DESKTOP_LIFECYCLE_CYCLES ?? "10", 10);
  const requirePeer = options.requirePeer ?? false;

  if (!interopReady()) {
    if (requirePeer) {
      throw new Error("desktop lifecycle requires INTEROP=1 and docker");
    }

    console.log("desktop-lifecycle: skipped (set INTEROP=1 with docker)");
    return;
  }

  try {
    await waitForTcp("127.0.0.1", LEAF_ECHO_PORT, 5_000);
  } catch (error) {
    if (requirePeer) {
      throw error;
    }

    console.log(`desktop-lifecycle: skipped (${error instanceof Error ? error.message : String(error)})`);
    return;
  }

  runBareLifecycleSliceProcess({ label: "desktop-host", cycles });
  console.log(`desktop-lifecycle: ${cycles} quiesce/reconnect cycles passed`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  runDesktopLifecycleSlice({ requirePeer: process.argv.includes("--require-peer") }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
