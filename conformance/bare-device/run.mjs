#!/usr/bin/env node
/**
 * Bare device/emulator worklet smoke (Phase 2 M0).
 *
 * CI tier:
 * 1. Verifies the harness worklet bundle builds.
 * 2. Runs the same Reticulum TCP slice headlessly under the Bare CLI against docker.
 *
 * Emulator instrumentation (background soak, process death) is deferred to M2.
 */

import { spawnSync } from "node:child_process";
import { access } from "node:fs/promises";
import { hexToBytes } from "../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { DestinationDirection, DestinationType } from "../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../packages/reticulum-ts/dist/registered-destination.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";
import { bareRuntime } from "../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { Reticulum } from "../../packages/reticulum-ts/dist/reticulum.js";
import {
  INTEROP_HOST,
  LEAF_ECHO_PORT,
  PacketReceiptStatus,
  bytesToAscii,
  expectReceipt,
  loadIdentityVectors,
  repoRoot,
  sleep,
  waitForPath
} from "../scenarios/bare/helpers.mjs";

async function buildWorkletBundle() {
  const result = spawnSync("npm", ["run", "build:worklet"], {
    cwd: `${repoRoot}/apps/harness-mobile`,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Failed to build harness worklet bundle");
  }

  const bundlePath = `${repoRoot}/apps/harness-mobile/worklet/worklet.bundle.mjs`;
  await access(bundlePath);
  const bundle = await import(bundlePath);
  if (typeof bundle.default !== "string" || bundle.default.length < 32) {
    throw new Error("Harness worklet bundle is empty or invalid");
  }

  console.log("bare-device: worklet bundle built");
}

async function runTcpSlice() {
  const vectors = loadIdentityVectors();
  const aliceEntry = vectors.identities.find((entry) => entry.name === "alice");
  const bobEntry = vectors.identities.find((entry) => entry.name === "bob");
  if (aliceEntry === undefined || bobEntry === undefined) {
    throw new Error("Missing alice/bob identity vectors");
  }

  const provider = new PureCryptoProvider();
  const runtime = bareRuntime({ storePath: `${repoRoot}/.bare-device-store` });
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const iface = await reticulum.addTcpClientInterface({
    name: "docker-peer-bare-device",
    targetHost: INTEROP_HOST,
    targetPort: LEAF_ECHO_PORT
  });

  const aliceIdentity = Identity.fromBytes(provider, hexToBytes(aliceEntry.privateKeyHex));
  const bobIdentity = Identity.fromBytes(provider, hexToBytes(bobEntry.privateKeyHex));
  if (aliceIdentity === null || bobIdentity === null) {
    throw new Error("Failed to load interop identities");
  }

  const aliceIn = reticulum.registerDestination({
    provider,
    identity: aliceIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = reticulum.registerDestination({
    provider,
    identity: bobIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });

  await aliceIn.announce();
  await waitForPath(reticulum, bobOut.hash);

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  const payload = new TextEncoder().encode("bare-device-ping");
  const receipt = await bobOut.send(payload);
  expectReceipt(receipt.status, PacketReceiptStatus.DELIVERED);

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (received.has("bare-device-ping") && received.has("hello from python leaf echo")) {
      break;
    }

    await sleep(100);
  }

  if (!received.has("bare-device-ping")) {
    throw new Error("Bare device TCP slice echo was not received");
  }

  if (!received.has("hello from python leaf echo")) {
    throw new Error("Bare device TCP slice did not receive Python greeting (reverse direction)");
  }

  await iface.close();
  reticulum.stop();
  console.log("bare-device: TCP slice passed on Bare runtime");
}

async function main() {
  await buildWorkletBundle();
  await runTcpSlice();
  console.log("bare-device: all checks passed");
}

main().catch((error) => {
  console.error(error);
  throw error;
});
