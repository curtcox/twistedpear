#!/usr/bin/env node
/**
 * Bare runtime adapter smoke (Phase 2 M1).
 * Must run under the Bare CLI: `bare conformance/bare-runtime/run.mjs`
 *
 * TCP/UDP interop with docker is in conformance/bare-interop/run.mjs.
 */

import { bareRuntime } from "../../packages/reticulum-ts/dist/runtime/bare/runtime.js";

async function main() {
  const runtime = bareRuntime({ storePath: ".bare-runtime-smoke-store" });

  const key = "smoke-key";
  const value = Uint8Array.from([98, 97, 114, 101, 45, 102, 115]);
  await runtime.store.set(key, value);
  const loaded = await runtime.store.get(key);
  if (loaded === undefined || loaded.length !== value.length) {
    throw new Error("bare-fs store smoke failed");
  }

  for (let index = 0; index < value.length; index += 1) {
    if (loaded[index] !== value[index]) {
      throw new Error("bare-fs store smoke failed");
    }
  }

  await runtime.store.delete(key);
  if ((await runtime.store.get(key)) !== undefined) {
    throw new Error("bare-fs delete smoke failed");
  }

  console.log("bare-runtime: fs checks passed");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
