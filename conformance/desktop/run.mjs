#!/usr/bin/env node
/**
 * Phase 6 desktop smoke: host-core node boot + IPC protocol framing conformance.
 */

import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { decodeMessages, encodeMessage } from "../../packages/host-core/dist/protocol.js";
import { defaultHostConfig } from "../../packages/host-core/dist/types.js";

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function testProtocolFraming() {
  const encoded = encodeMessage({ type: "status", status: { running: true } });
  assert(encoded.endsWith("\n"), "messages are newline terminated");

  const batch = `${encodeMessage({ type: "log", line: "a" })}${encodeMessage({ type: "log", line: "b" })}partial`;
  const parsed = decodeMessages(batch);
  assert(parsed.messages.length === 2, "decodeMessages splits batch");
  assert(parsed.remainder === "partial", "decodeMessages keeps remainder");
}

async function testNodeHostBoot() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-host-"));
  try {
    const session = await createNodeHost({
      config: defaultHostConfig({
        dataDir,
        roles: { transport: false, seeder: false, propagation: false, attachRnsd: null },
        interfaces: {
          tcp: { enabled: false, mode: "client" },
          auto: { enabled: false, multicast: false, bonjour: false },
          i2p: { enabled: false },
          rnode: { enabled: false }
        }
      })
    });

    const status = session.getStatus();
    assert(status.running, "host reports running");
    assert(status.identityHash !== null, "host created identity");
    await session.stop();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
}

function testWorkletBundleBuild() {
  const result = spawnSync("node", ["scripts/build-worklet.mjs"], {
    cwd: new URL("../../apps/host-desktop", import.meta.url),
    stdio: "pipe",
    encoding: "utf8"
  });

  assert(result.status === 0, `worklet bundle build failed\n${result.stdout}\n${result.stderr}`);
}

async function main() {
  testProtocolFraming();
  await testNodeHostBoot();
  testWorkletBundleBuild();
  console.log("desktop-smoke: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
