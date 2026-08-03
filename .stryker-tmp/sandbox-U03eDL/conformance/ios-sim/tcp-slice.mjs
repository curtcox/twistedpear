#!/usr/bin/env node
// @ts-nocheck
/**
 * iOS worklet TCP slice against the host-process Python RNS leaf-echo peer (Phase 5 M0).
 */

import { createConnection } from "node:net";
import { pathToFileURL } from "node:url";
import { runBareTcpSliceProcess } from "../scenarios/bare/runner-host.mjs";
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

export async function runIosTcpSlice(options = {}) {
  const { requirePeer = false } = options;

  try {
    await waitForPeer();
  } catch (error) {
    if (requirePeer) {
      throw error;
    }

    console.log(`[ios-sim/tcp-slice] skipped: ${error instanceof Error ? error.message : String(error)}`);
    return;
  }

  runBareTcpSliceProcess({ label: "ios-sim" });
  console.log("[ios-sim/tcp-slice] announce/link echo passed on Bare runtime against Python RNS peer");
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const requirePeer = process.argv.includes("--require-peer");
  runIosTcpSlice({ requirePeer }).catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
