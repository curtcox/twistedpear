#!/usr/bin/env node
/**
 * Distinct-node local Freenet scenarios (simulator-first workstream B3).
 *
 * Primary regression: cross-node notify via the existing 3-node topology
 * (`FREENET_FORCE_CROSS_NODE=1`). Use `--smoke` / `FREENET_ALLOW_INCOMPLETE=1`
 * for diagnosis; never overwrite gate artifacts from an incomplete run.
 *
 * F2 HDLC and F3 propagation across two Freenet WebSocket endpoints reuse the
 * state-reconciling packet-log backend; live multi-host announce/LXMF remains
 * an optional confirmation once a Freenet binary is available.
 */

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { assert, runMain, section, step } from "../lib/index.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const smoke = process.argv.includes("--smoke");
const binary =
  process.env.FREENET_BINARY ??
  (existsSync("/Applications/Freenet.app/Contents/MacOS/freenet-bin")
    ? "/Applications/Freenet.app/Contents/MacOS/freenet-bin"
    : "freenet");

await runMain(async () => {
  section("distinct-node Freenet");

  step("cross-node local S2 (publisher ≠ subscriber Freenet node)");
  const result = spawnSync(
    "node",
    [
      join(root, "conformance/freenet-spike/run-local-s2.mjs"),
      ...(smoke ? ["--smoke"] : [])
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        FREENET_BINARY: binary,
        FREENET_FORCE_CROSS_NODE: "1",
        ...(smoke ? { FREENET_ALLOW_INCOMPLETE: "1" } : {})
      }
    }
  );
  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);
  assert(
    result.status === 0,
    `cross-node local S2 failed with status ${result.status}`
  );

  console.log(
    "[freenet-distinct-nodes] cross-node notify scenario completed" +
      (smoke ? " (smoke; not gate evidence)" : "")
  );
});
