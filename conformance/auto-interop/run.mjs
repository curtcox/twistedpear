#!/usr/bin/env node
/**
 * AutoInterface interop runner (Phase 2 M3).
 * TS AutoInterface discovers and exchanges packets with a Python RNS AutoInterface peer.
 *
 * Requires the python auto-echo peer on the same host (docker network_mode: host).
 */

import { hexToBytes } from "../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { DestinationDirection, DestinationType } from "../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../packages/reticulum-ts/dist/registered-destination.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";
import { PacketReceiptStatus } from "../../packages/reticulum-ts/dist/packet-receipt.js";
import { nodeRuntime } from "../../packages/reticulum-ts/dist/runtime/node/runtime.js";
import { Reticulum } from "../../packages/reticulum-ts/dist/reticulum.js";
import {
  AutoInterface
} from "../../packages/reticulum-interfaces/dist/auto.js";
import {
  bytesToAscii,
  expectReceipt,
  loadIdentityVectors,
  sleep,
  waitForPath
} from "../scenarios/bare/helpers.mjs";

const provider = new PureCryptoProvider();
const runtime = nodeRuntime();

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

async function waitForAutoPeer(auto, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (auto.peerInterfaces.length > 0) {
      return auto.peerInterfaces[0];
    }

    await sleep(250);
  }

  throw new Error("Timed out waiting for AutoInterface peer discovery");
}

async function runAutoEcho() {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const auto = await AutoInterface.open(provider, runtime, {
    name: "ts-auto-interop",
    provider,
    runtime,
    onPeerSpawn: (peer) => reticulum.registerInterface(peer),
    onPeerDetach: (peer) => reticulum.unregisterInterface(peer)
  });

  if (auto.peerInterfaces.length === 0 && auto.online === false) {
    throw new Error("AutoInterface found no link-local IPv6 interfaces on this host");
  }

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
  await waitForAutoPeer(auto);
  await waitForPath(reticulum, bobOut.hash, 45_000);

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  const payload = new TextEncoder().encode("auto-interop-ping");
  const receipt = await bobOut.send(payload);
  expectReceipt(receipt.status, PacketReceiptStatus.DELIVERED);

  const deadline = Date.now() + 15_000;
  while (!received.has("auto-interop-ping") && Date.now() < deadline) {
    await sleep(100);
  }

  if (!received.has("auto-interop-ping")) {
    throw new Error("AutoInterface interop echo was not received");
  }

  if (!received.has("hello from python auto echo")) {
    const greetingDeadline = Date.now() + 10_000;
    while (!received.has("hello from python auto echo") && Date.now() < greetingDeadline) {
      await sleep(100);
    }
  }

  if (!received.has("hello from python auto echo")) {
    throw new Error("AutoInterface interop greeting from Python peer was not received");
  }

  await auto.close();
  reticulum.stop();
  console.log("auto-interop: bidirectional echo passed");
}

async function main() {
  await runAutoEcho();
}

main().catch((error) => {
  console.error(error);
  throw error;
});
