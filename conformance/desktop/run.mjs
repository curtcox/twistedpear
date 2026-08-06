#!/usr/bin/env node
/**
 * Phase 6 desktop smoke: host-core node boot + IPC protocol framing conformance.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import {
  decodeMessages,
  encodeMessage,
} from "../../packages/host-core/dist/protocol.js";
import { defaultHostConfig } from "../../packages/host-core/dist/types.js";
import { assert, runMain, spawnChecked, withTempDir } from "../lib/index.mjs";
import { runDesktopFullLoop } from "./full-loop.mjs";
import { runDesktopHostileSmoke } from "./hostile-smoke.mjs";
import { runDesktopDevLoop } from "./dev-loop.mjs";
import { runDesktopCrashRestart } from "./crash-restart.mjs";

function testProtocolFraming() {
  const encoded = encodeMessage({ type: "status", status: { running: true } });
  assert(encoded.endsWith("\n"), "messages are newline terminated");

  const batch = `${encodeMessage({ type: "log", line: "a" })}${encodeMessage({ type: "log", line: "b" })}partial`;
  const parsed = decodeMessages(batch);
  assert(parsed.messages.length === 2, "decodeMessages splits batch");
  assert(parsed.remainder === "partial", "decodeMessages keeps remainder");
}

async function testNodeHostBoot() {
  const temp = withTempDir("tp-host-");
  try {
    const session = await createNodeHost({
      identityPassphrase: "conformance identity passphrase",
      config: defaultHostConfig({
        dataDir: temp.path,
        roles: {
          transport: false,
          seeder: false,
          propagation: false,
          attachRnsd: null,
        },
        interfaces: {
          tcp: { enabled: false, mode: "client" },
          auto: { enabled: false, multicast: false, bonjour: false },
          i2p: { enabled: false },
          rnode: { enabled: false },
        },
      }),
    });

    const status = session.getStatus();
    assert(status.running, "host reports running");
    assert(status.identityHash !== null, "host created identity");
    await session.stop();
  } finally {
    temp.dispose();
  }
}

async function testStatusEndpointLocalhostOnly() {
  const temp = withTempDir("tp-host-status-");
  try {
    const session = await createNodeHost({
      identityPassphrase: "conformance identity passphrase",
      config: defaultHostConfig({
        dataDir: temp.path,
        roles: {
          transport: false,
          seeder: false,
          propagation: false,
          attachRnsd: null,
        },
        interfaces: {
          tcp: { enabled: false, mode: "client" },
          auto: { enabled: false, multicast: false, bonjour: false },
          i2p: { enabled: false },
          rnode: { enabled: false },
        },
        statusEndpoint: true,
      }),
    });

    const ok = await fetch("http://127.0.0.1:9473/status");
    assert(ok.ok, "localhost status endpoint responds");
    const body = await ok.json();
    assert(
      typeof body.identityHash === "string",
      "status schema includes identityHash",
    );
    assert(
      typeof body.uptimeMs === "number",
      "status schema includes uptimeMs",
    );
    assert(
      typeof body.pathTableCount === "number",
      "status schema includes pathTableCount",
    );
    assert(
      typeof body.activeLinkCount === "number",
      "status schema includes activeLinkCount",
    );
    assert(
      typeof body.bandwidthBytesIn === "number",
      "status schema includes bandwidthBytesIn",
    );
    assert(
      typeof body.bandwidthBytesOut === "number",
      "status schema includes bandwidthBytesOut",
    );
    await session.stop();
  } finally {
    temp.dispose();
  }
}

function testWorkletBundleBuild() {
  spawnChecked("node", ["scripts/build-worklet.mjs"], {
    cwd: fileURLToPath(new URL("../../apps/host-desktop", import.meta.url)),
  });

  const bundlePath = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../apps/host-desktop/worklet/worklet.bundle",
  );
  const bundle = readFileSync(bundlePath);
  assert(bundle.length > 1024, "worklet bundle is non-empty");
}

function testElectronSecurityPosture() {
  const hostRoot = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../apps/host-desktop",
  );
  const html = readFileSync(join(hostRoot, "src/renderer/index.html"), "utf8");
  assert(
    html.includes("Content-Security-Policy"),
    "renderer HTML includes CSP",
  );
  assert(
    !html.includes("nodeIntegration"),
    "renderer HTML does not enable nodeIntegration",
  );

  const preload = readFileSync(join(hostRoot, "src/preload/index.cts"), "utf8");
  assert(
    preload.includes("contextBridge.exposeInMainWorld"),
    "preload uses contextBridge",
  );
  assert(
    preload.includes("FROZEN_HOST_API"),
    "preload documents frozen IPC surface",
  );
}

async function testSerialportOptionalLoad() {
  const { serialportAvailable } =
    await import("../../packages/reticulum-interfaces/dist/serial-node.js");
  const available = await serialportAvailable();
  assert(typeof available === "boolean", "serialportAvailable returns boolean");
}

await runMain(async () => {
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
});
