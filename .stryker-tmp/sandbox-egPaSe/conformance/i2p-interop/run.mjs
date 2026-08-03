#!/usr/bin/env node
// @ts-nocheck
/**
 * I2P interop runner (Phase 2 M7).
 * TS I2PInterface discovers and exchanges packets with a Python RNS I2P peer
 * through an external i2pd SAM bridge.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { hexToBytes } from "../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { DestinationDirection, DestinationType } from "../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../packages/reticulum-ts/dist/registered-destination.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";
import { LinkStatus } from "../../packages/reticulum-ts/dist/link.js";
import { nodeRuntime } from "../../packages/reticulum-ts/dist/runtime/node/runtime.js";
import { Reticulum } from "../../packages/reticulum-ts/dist/reticulum.js";
import { I2PInterface } from "../../packages/reticulum-interfaces/dist/i2p.js";
import { LXMessageMethod } from "../../packages/lxmf-ts/dist/constants.js";
import { LXMFRouter } from "../../packages/lxmf-ts/dist/router.js";
import {
  bytesToAscii,
  loadIdentityVectors,
  repoRoot,
  sleep,
  waitForReceipt,
  waitForPath
} from "../scenarios/bare/helpers.mjs";

const provider = new PureCryptoProvider();
const runtime = nodeRuntime();

const I2P_SAM_HOST = process.env.I2P_SAM_HOST ?? "127.0.0.1";
const I2P_SAM_PORT = Number.parseInt(process.env.I2P_SAM_PORT ?? "7656", 10);
const I2P_READY_TIMEOUT_MS = Number.parseInt(process.env.I2P_READY_TIMEOUT_MS ?? "180000", 10);
const I2P_PATH_TIMEOUT_MS = Number.parseInt(process.env.I2P_PATH_TIMEOUT_MS ?? "120000", 10);
const I2P_STATE_FILE = join(repoRoot, "conformance/scenarios/state/i2p-b32.txt");

function loadIdentity(name) {
  const vectors = loadIdentityVectors();
  const entry = vectors.identities.find((candidate) => candidate.name === name);
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(provider, hexToBytes(entry.privateKeyHex));
  if (identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }

  return identity;
}

async function waitForPeerDestination(timeoutMs = I2P_READY_TIMEOUT_MS) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const destination = readFileSync(I2P_STATE_FILE, "utf8").trim();
      if (destination.length > 0) {
        return destination.endsWith(".b32.i2p") ? destination : `${destination}.b32.i2p`;
      }
    } catch {
      // Python peer has not written its b32 address yet.
    }

    await sleep(1_000);
  }

  throw new Error(`Timed out waiting for Python I2P peer b32 at ${I2P_STATE_FILE}`);
}

async function withI2pInterface(peerDestination, callback) {
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const iface = await I2PInterface.connect(provider, {
    name: "ts-i2p-interop",
    provider,
    runtime,
    samHost: I2P_SAM_HOST,
    samPort: I2P_SAM_PORT,
    peerDestination
  });
  reticulum.registerInterface(iface);

  const deadline = Date.now() + I2P_READY_TIMEOUT_MS;
  while (Date.now() < deadline && !iface.online) {
    await sleep(500);
  }

  if (!iface.online) {
    await iface.close();
    reticulum.stop();
    throw new Error(
      `I2P interface did not become online${iface.connectionError === null ? "" : `: ${iface.connectionError.message}`}`
    );
  }

  try {
    await callback({ reticulum, iface });
  } finally {
    await iface.close();
    reticulum.stop();
  }
}

async function runI2pEcho(reticulum) {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  const aliceIn = reticulum.registerDestination({
    provider,
    identity: alice,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = reticulum.registerDestination({
    provider,
    identity: bob,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });

  await aliceIn.announce();
  await waitForPath(reticulum, bobOut.hash, I2P_PATH_TIMEOUT_MS);

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  const payload = new TextEncoder().encode("i2p-interop-ping");
  const receipt = await bobOut.send(payload, { createReceipt: true });
  await waitForReceipt(receipt);

  const deadline = Date.now() + 30_000;
  while (!received.has("i2p-interop-ping") && Date.now() < deadline) {
    await sleep(100);
  }

  if (!received.has("i2p-interop-ping")) {
    throw new Error("I2P interop echo was not received");
  }

  if (!received.has("hello from python i2p echo")) {
    const greetingDeadline = Date.now() + 15_000;
    while (!received.has("hello from python i2p echo") && Date.now() < greetingDeadline) {
      await sleep(100);
    }
  }

  if (!received.has("hello from python i2p echo")) {
    throw new Error("I2P interop greeting from Python peer was not received");
  }

  console.log("i2p-interop: bidirectional echo passed");
}

async function runI2pLinkEcho(reticulum) {
  const bob = loadIdentity("bob");

  const bobOut = reticulum.registerDestination({
    provider,
    identity: bob,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["link"]
  });

  await waitForPath(reticulum, bobOut.hash, I2P_PATH_TIMEOUT_MS);

  const link = bobOut.requestLink();
  const deadline = Date.now() + 45_000;
  while (Date.now() < deadline && link.status !== LinkStatus.ACTIVE) {
    await sleep(100);
  }

  if (link.status !== LinkStatus.ACTIVE) {
    throw new Error("I2P interop link did not become active");
  }

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("I2P link echo timeout")), 30_000);
    link.callbacks.packet = (data) => {
      clearTimeout(timer);
      resolve(bytesToAscii(data));
    };
  });

  await link.send(new TextEncoder().encode("i2p link ping"));
  const echoed = await received;
  if (echoed !== "i2p link ping") {
    throw new Error(`Unexpected I2P link echo payload: ${echoed}`);
  }
  await link.teardown();

  console.log("i2p-interop: link echo passed");
}

async function runI2pLxmfEcho(reticulum) {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  const router = new LXMFRouter({ reticulum, provider });
  const aliceDelivery = router.registerDeliveryIdentity(alice);
  const bobOut = router.createOutboundDestination(bob);

  await aliceDelivery.announce();
  await waitForPath(reticulum, bobOut.hash, I2P_PATH_TIMEOUT_MS);

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("I2P LXMF echo timeout")), 60_000);
    router.onDelivery((message) => {
      clearTimeout(timer);
      resolve(message.contentAsString());
    });
  });

  await router.packAndSend({
    destination: bobOut,
    source: aliceDelivery,
    title: "I2P interop",
    content: "Hello Python LXMF over I2P",
    desiredMethod: LXMessageMethod.OPPORTUNISTIC,
    deferStamp: true,
    timestamp: Date.now() / 1_000
  });

  const echoed = await received;
  if (echoed !== "Hello Python LXMF over I2P") {
    throw new Error(`Unexpected I2P LXMF echo payload: ${echoed}`);
  }

  console.log("i2p-interop: LXMF echo passed");
}

async function runI2pAbsentSam() {
  const absentPort = Number.parseInt(process.env.I2P_ABSENT_SAM_PORT ?? "17656", 10);
  const iface = await I2PInterface.connect(provider, {
    name: "ts-i2p-absent",
    provider,
    runtime,
    samHost: I2P_SAM_HOST,
    samPort: absentPort,
    peerDestination: "dummy.b32.i2p",
    reconnectWaitMs: 100
  });

  await sleep(500);

  if (iface.online) {
    await iface.close();
    throw new Error("Expected I2P interface to stay offline without SAM bridge");
  }

  await iface.close();
  console.log("i2p-interop: absent SAM handled cleanly");
}

async function main() {
  await runI2pAbsentSam();

  const peerDestination = await waitForPeerDestination();
  console.log(`i2p-interop: connecting to ${peerDestination}`);

  await withI2pInterface(peerDestination, async ({ reticulum }) => {
    await runI2pEcho(reticulum);
    await runI2pLinkEcho(reticulum);
    await runI2pLxmfEcho(reticulum);
  });
}

main().catch((error) => {
  console.error(error);
  throw error;
});
