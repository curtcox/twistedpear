#!/usr/bin/env node
/**
 * iOS lifecycle quiesce/reconnect slice (Phase 5 M2 CI tier).
 */

import { createConnection } from "node:net";
import { pathToFileURL } from "node:url";
import { runBareLifecycleSlice } from "../scenarios/bare/lifecycle-slice.mjs";
import { INTEROP_HOST, LEAF_ECHO_PORT } from "../scenarios/bare/helpers.mjs";

function waitForPeer(timeoutMs = 15_000) {
  return new Promise((resolve, reject) => {
    const socket = createConnection({ host: INTEROP_HOST, port: LEAF_ECHO_PORT });
    const timer = setTimeout(() => {
      socket.destroy();
      reject(new Error(`leaf-echo peer not reachable at ${INTEROP_HOST}:${LEAF_ECHO_PORT}`));
    }, timeoutMs);

    socket.once("connect", () => {
      clearTimeout(timer);
      socket.end();
      resolve();
    });

    socket.once("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
  });
}

export async function runIosLifecycleSlice(options = {}) {
  const {
    requirePeer = false,
    cycles = Number.parseInt(process.env.IOS_LIFECYCLE_CYCLES ?? "10", 10)
  } = options;

  try {
    await waitForPeer();
  } catch (error) {
    if (requirePeer) {
      throw error;
    }

    console.log(`[ios-sim/lifecycle] skipped: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  const summary = await runBareLifecycleSlice({ label: "ios-sim", cycles });
  console.log(
    `[ios-sim/lifecycle] ${cycles} quiesce/reconnect cycles passed against Python RNS peer ` +
      `(p50 reconnect ${summary.reconnectP50Ms}ms, p95 ${summary.reconnectP95Ms}ms, max ${summary.reconnectMaxMs}ms)`
  );
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const requirePeer = process.argv.includes("--require-peer");
  runIosLifecycleSlice({ requirePeer }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
