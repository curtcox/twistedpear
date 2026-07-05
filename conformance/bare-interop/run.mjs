#!/usr/bin/env node
/**
 * Desktop Bare interop runner (Phase 2 M1).
 * Runs leaf-echo and link-echo scenarios using the Bare runtime adapter.
 */

import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  LinkStatus,
  PureCryptoProvider,
  Reticulum,
  bareRuntime,
  hexToBytes
} from "../../packages/reticulum-ts/dist/index.js";
import {
  INTEROP_HOST,
  LEAF_ECHO_PORT,
  LINK_ECHO_PORT,
  PacketReceiptStatus,
  bytesToAscii,
  expectReceipt,
  loadIdentityVectors,
  repoRoot,
  sleep,
  waitForPath
} from "../scenarios/bare/helpers.mjs";

const provider = new PureCryptoProvider();
const runtime = bareRuntime({ storePath: `${repoRoot}/.bare-interop-store` });

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

async function runLeafEcho() {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  await reticulum.addTcpClientInterface({
    name: "python-leaf-echo-bare",
    targetHost: INTEROP_HOST,
    targetPort: LEAF_ECHO_PORT
  });

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
  await waitForPath(reticulum, bobOut.hash);

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  const payload = Uint8Array.from([98, 97, 114, 101, 45, 105, 110, 116, 101, 114, 111, 112, 45, 112, 105, 110, 103]);
  const receipt = await bobOut.send(payload);
  expectReceipt(receipt.status, PacketReceiptStatus.DELIVERED);

  const deadline = Date.now() + 10_000;
  while (!received.has("bare-interop-ping") && Date.now() < deadline) {
    await sleep(100);
  }

  if (!received.has("bare-interop-ping")) {
    throw new Error("Bare interop echo was not received");
  }

  reticulum.stop();
  console.log("bare-interop: leaf echo passed on Bare runtime");
}

async function runLinkEcho() {
  const bob = loadIdentity("bob");

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  await reticulum.addTcpClientInterface({
    name: "python-link-echo-bare",
    targetHost: INTEROP_HOST,
    targetPort: LINK_ECHO_PORT
  });

  const bobOut = reticulum.registerDestination({
    provider,
    identity: bob,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["link"]
  });

  await waitForPath(reticulum, bobOut.hash);

  const link = bobOut.requestLink();
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline && link.status !== LinkStatus.ACTIVE) {
    await sleep(100);
  }

  if (link.status !== LinkStatus.ACTIVE) {
    throw new Error("Bare interop link did not become active");
  }

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("link echo timeout")), 10_000);
    link.callbacks.packet = (data) => {
      clearTimeout(timer);
      resolve(bytesToAscii(data));
    };
  });

  await link.send(new TextEncoder().encode("link ping"));
  const echoed = await received;
  if (echoed !== "link ping") {
    throw new Error(`Unexpected link echo payload: ${echoed}`);
  }

  reticulum.stop();
  console.log("bare-interop: link echo passed on Bare runtime");
}

async function main() {
  await runLeafEcho();
  await runLinkEcho();
}

main().catch((error) => {
  console.error(error);
  throw error;
});
