#!/usr/bin/env node
/**
 * AutoInterface interop runner (Phase 2 M3).
 * TS AutoInterface discovers and exchanges packets with a Python RNS AutoInterface peer.
 *
 * Requires the python auto-interop peer on the same host (docker network_mode: host).
 */

import { hexToBytes } from "../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../packages/reticulum-ts/dist/crypto/pure.js";
import { DestinationDirection, DestinationType } from "../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../packages/reticulum-ts/dist/registered-destination.js";
import { Identity } from "../../packages/reticulum-ts/dist/identity.js";
import { LinkStatus } from "../../packages/reticulum-ts/dist/link.js";
import { nodeRuntime } from "../../packages/reticulum-ts/dist/runtime/node/runtime.js";
import { Reticulum } from "../../packages/reticulum-ts/dist/reticulum.js";
import { AutoInterface } from "../../packages/reticulum-interfaces/dist/auto.js";
import { LXMessageMethod } from "../../packages/lxmf-ts/dist/constants.js";
import { LXMFRouter } from "../../packages/lxmf-ts/dist/router.js";
import {
  bytesToAscii,
  loadIdentityVectors,
  sleep,
  waitForReceipt,
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

async function waitForAutoPeer(auto, timeoutMs = 45_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (auto.peerInterfaces.length > 0) {
      return auto.peerInterfaces[0];
    }

    await sleep(250);
  }

  throw new Error("Timed out waiting for AutoInterface peer discovery");
}

async function withAutoInterface(callback) {
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
    await auto.close();
    reticulum.stop();
    throw new Error("AutoInterface found no link-local IPv6 interfaces on this host");
  }

  try {
    await callback({ reticulum, auto });
  } finally {
    await auto.close();
    reticulum.stop();
  }
}

async function runAutoEcho() {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  await withAutoInterface(async ({ reticulum, auto }) => {
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
    const receipt = await bobOut.send(payload, { createReceipt: true });
    await waitForReceipt(receipt);

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
  });

  console.log("auto-interop: bidirectional echo passed");
}

async function runAutoLinkEcho() {
  const bob = loadIdentity("bob");

  await withAutoInterface(async ({ reticulum, auto }) => {
    const bobOut = reticulum.registerDestination({
      provider,
      identity: bob,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["link"]
    });

    await waitForAutoPeer(auto);
    await waitForPath(reticulum, bobOut.hash, 45_000);

    const link = bobOut.requestLink();
    const deadline = Date.now() + 20_000;
    while (Date.now() < deadline && link.status !== LinkStatus.ACTIVE) {
      await sleep(100);
    }

    if (link.status !== LinkStatus.ACTIVE) {
      throw new Error("AutoInterface interop link did not become active");
    }

    const received = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("AutoInterface link echo timeout")), 15_000);
      link.callbacks.packet = (data) => {
        clearTimeout(timer);
        resolve(bytesToAscii(data));
      };
    });

    await link.send(new TextEncoder().encode("auto link ping"));
    const echoed = await received;
    if (echoed !== "auto link ping") {
      throw new Error(`Unexpected AutoInterface link echo payload: ${echoed}`);
    }
  });

  console.log("auto-interop: link echo passed");
}

async function runAutoLxmfEcho() {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  await withAutoInterface(async ({ reticulum, auto }) => {
    const router = new LXMFRouter({ reticulum, provider });
    const aliceDelivery = router.registerDeliveryIdentity(alice);
    const bobOut = router.createOutboundDestination(bob);

    await aliceDelivery.announce();
    await waitForAutoPeer(auto);
    await waitForPath(reticulum, bobOut.hash, 45_000);

    const received = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("AutoInterface LXMF echo timeout")), 45_000);
      router.onDelivery((message) => {
        clearTimeout(timer);
        resolve(message.contentAsString());
      });
    });

    await router.packAndSend({
      destination: bobOut,
      source: aliceDelivery,
      title: "Auto interop",
      content: "Hello Python LXMF over AutoInterface",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: Date.now() / 1_000
    });

    const echoed = await received;
    if (echoed !== "Hello Python LXMF over AutoInterface") {
      throw new Error(`Unexpected AutoInterface LXMF echo payload: ${echoed}`);
    }
  });

  console.log("auto-interop: LXMF echo passed");
}

async function runAutoPeerExpiry() {
  let detached = 0;

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const auto = await AutoInterface.open(provider, runtime, {
    name: "ts-auto-expiry",
    provider,
    runtime,
    peeringTimeoutMs: 200,
    onPeerSpawn: (peer) => reticulum.registerInterface(peer),
    onPeerDetach: () => {
      detached += 1;
    }
  });

  if (auto.peerInterfaces.length === 0 && auto.online === false) {
    await auto.close();
    reticulum.stop();
    console.log("auto-interop: peer expiry skipped (no link-local IPv6 interfaces)");
    return;
  }

  const adopted = /** @type {{ adopted: ReadonlyArray<{ name: string }> }} */ (auto).adopted;
  const ifname = adopted[0]?.name;
  if (ifname === undefined) {
    await auto.close();
    reticulum.stop();
    throw new Error("AutoInterface peer expiry test found no adopted interface");
  }

  const addPeer = /** @type {{ addPeer: (address: string, name: string) => void }} */ (auto).addPeer.bind(auto);
  addPeer("fe80::dead:beef", ifname);
  if (auto.peerInterfaces.length !== 1) {
    await auto.close();
    reticulum.stop();
    throw new Error("AutoInterface peer expiry test failed to spawn synthetic peer");
  }

  await sleep(4_500);

  if (auto.peerInterfaces.length !== 0) {
    await auto.close();
    reticulum.stop();
    throw new Error("AutoInterface peer expiry test did not remove stale peer");
  }

  if (detached !== 1) {
    await auto.close();
    reticulum.stop();
    throw new Error(`AutoInterface peer expiry test expected one detach, got ${detached}`);
  }

  await auto.close();
  reticulum.stop();
  console.log("auto-interop: peer expiry passed");
}

async function main() {
  await runAutoEcho();
  await runAutoLinkEcho();
  await runAutoLxmfEcho();
  await runAutoPeerExpiry();
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`::error::auto-interop: ${message.split("\n")[0]}`);
  console.error(error);
  process.exitCode = 1;
});
