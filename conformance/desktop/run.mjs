#!/usr/bin/env node
/**
 * Phase 6 desktop smoke: host-core node boot + IPC protocol framing conformance.
 */

import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { decodeMessages, encodeMessage } from "../../packages/host-core/dist/protocol.js";
import { defaultHostConfig } from "../../packages/host-core/dist/types.js";
import { runDesktopFullLoop } from "./full-loop.mjs";
import { runDesktopHostileSmoke } from "./hostile-smoke.mjs";
import { runDesktopDevLoop } from "./dev-loop.mjs";
import { runDesktopCrashRestart } from "./crash-restart.mjs";

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

async function testStatusEndpointLocalhostOnly() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-host-status-"));
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
        },
        statusEndpoint: true
      })
    });

    const ok = await fetch("http://127.0.0.1:9473/status");
    assert(ok.ok, "localhost status endpoint responds");
    const body = await ok.json();
    assert(typeof body.identityHash === "string", "status schema includes identityHash");
    assert(typeof body.uptimeMs === "number", "status schema includes uptimeMs");
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

  const bundlePath = join(dirname(fileURLToPath(import.meta.url)), "../../apps/host-desktop/worklet/worklet.bundle");
  const bundle = readFileSync(bundlePath);
  assert(bundle.length > 1024, "worklet bundle is non-empty");
}

function testElectronSecurityPosture() {
  const hostRoot = join(dirname(fileURLToPath(import.meta.url)), "../../apps/host-desktop");
  const html = readFileSync(join(hostRoot, "src/renderer/index.html"), "utf8");
  assert(html.includes("Content-Security-Policy"), "renderer HTML includes CSP");
  assert(!html.includes("nodeIntegration"), "renderer HTML does not enable nodeIntegration");

  const preload = readFileSync(join(hostRoot, "src/preload/index.ts"), "utf8");
  assert(preload.includes("contextBridge.exposeInMainWorld"), "preload uses contextBridge");
  assert(preload.includes("FROZEN_HOST_API"), "preload documents frozen IPC surface");
}

async function testSerialportOptionalLoad() {
  const { serialportAvailable } = await import("../../packages/reticulum-interfaces/dist/serial-node.js");
  const available = await serialportAvailable();
  assert(typeof available === "boolean", "serialportAvailable returns boolean");
}

async function main() {
  testProtocolFraming();
  await testNodeHostBoot();
  await testStatusEndpointLocalhostOnly();
  await testSerialportOptionalLoad();
  testWorkletBundleBuild();
  testElectronSecurityPosture();
  await runDesktopFullLoop();
  await runDesktopHostileSmoke();
  await runDesktopDevLoop();
  await runDesktopCrashRestart();
  console.log("desktop-smoke: all checks passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
