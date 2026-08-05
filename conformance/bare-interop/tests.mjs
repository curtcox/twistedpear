/**
 * Bare interop test logic — loaded after crypto-shim via dynamic import.
 */

import identityVectors from "../vectors/identity.json" with { type: "json" };
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  LinkStatus,
  PacketReceiptStatus,
  PureCryptoProvider,
  Reticulum,
  bareRuntime,
  hexToBytes
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod } from "../../packages/lxmf-ts/dist/constants.js";
import { LXMFRouter } from "../../packages/lxmf-ts/dist/router.js";

const INTEROP_HOST = globalThis.process?.env?.INTEROP_HOST ?? "127.0.0.1";
const LEAF_ECHO_PORT = Number.parseInt(globalThis.process?.env?.LEAF_ECHO_PORT ?? "4242", 10);
const LXMF_ECHO_PORT = Number.parseInt(globalThis.process?.env?.LXMF_ECHO_PORT ?? "4243", 10);
const LINK_ECHO_PORT = Number.parseInt(globalThis.process?.env?.LINK_ECHO_PORT ?? "4244", 10);

const provider = new PureCryptoProvider();
const runtime = bareRuntime({ storePath: ".bare-interop-store" });

function loadIdentity(name) {
  const entry = identityVectors.identities.find((candidate) => candidate.name === name);
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(provider, hexToBytes(entry.privateKeyHex));
  if (identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }

  return identity;
}

async function sleep(ms) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(reticulum, destinationHash, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
}

async function waitForInterfaceOnline(iface, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (iface.online) {
      return;
    }

    await sleep(100);
  }

  throw new Error(`Timed out waiting for interface ${iface.name} to connect`);
}

async function waitForReceipt(receipt, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (receipt.status === PacketReceiptStatus.DELIVERED) {
      return;
    }
    if (
      receipt.status === PacketReceiptStatus.FAILED ||
      receipt.status === PacketReceiptStatus.CULLED
    ) {
      throw new Error(`Receipt concluded with status ${receipt.status}`);
    }

    await sleep(50);
  }

  throw new Error(`Timed out waiting for delivered receipt; last status ${receipt.status}`);
}

function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

async function runLeafEcho() {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const iface = await reticulum.addTcpClientInterface({
    name: "python-leaf-echo-bare",
    targetHost: INTEROP_HOST,
    targetPort: LEAF_ECHO_PORT
  });
  await waitForInterfaceOnline(iface);

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
  const receipt = await bobOut.send(payload, { createReceipt: true });
  await waitForReceipt(receipt);

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

  const iface = await reticulum.addTcpClientInterface({
    name: "python-link-echo-bare",
    targetHost: INTEROP_HOST,
    targetPort: LINK_ECHO_PORT
  });
  await waitForInterfaceOnline(iface);

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

async function runLxmfEcho() {
  const alice = loadIdentity("alice");
  const bob = loadIdentity("bob");

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const iface = await reticulum.addTcpClientInterface({
    name: "python-lxmf-echo-bare",
    targetHost: INTEROP_HOST,
    targetPort: LXMF_ECHO_PORT
  });
  await waitForInterfaceOnline(iface);

  const router = new LXMFRouter({ reticulum, provider });
  const aliceDelivery = router.registerDeliveryIdentity(alice);
  const bobOut = router.createOutboundDestination(bob);

  await aliceDelivery.announce();
  await waitForPath(reticulum, bobOut.hash, 30_000);

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("LXMF echo timeout")), 30_000);
    router.onDelivery((message) => {
      clearTimeout(timer);
      resolve(message.contentAsString());
    });
  });

  await router.packAndSend({
    destination: bobOut,
    source: aliceDelivery,
    title: "Bare interop",
    content: "Hello Python LXMF from Bare",
    desiredMethod: LXMessageMethod.OPPORTUNISTIC,
    deferStamp: true,
    timestamp: Date.now() / 1_000
  });

  const echoed = await received;
  if (echoed !== "Hello Python LXMF from Bare") {
    throw new Error(`Unexpected LXMF echo payload: ${echoed}`);
  }

  reticulum.stop();
  console.log("bare-interop: LXMF echo passed on Bare runtime");
}

async function runUdpLoopback() {
  const leftIdentity = loadIdentity("alice");
  const rightIdentity = loadIdentity("bob");

  const left = Reticulum.create({ provider, runtime });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  right.start();

  const rightBind = await runtime.udp.bind("127.0.0.1", 0);
  const leftBind = await runtime.udp.bind("127.0.0.1", 0);
  const rightPort = rightBind.address.port;
  const leftPort = leftBind.address.port;
  await rightBind.close();
  await leftBind.close();

  const rightUdp = await right.addUdpInterface({
    name: "bare-interop-right-udp",
    listenHost: "127.0.0.1",
    listenPort: rightPort,
    forwardHost: "127.0.0.1",
    forwardPort: leftPort
  });

  const leftUdp = await left.addUdpInterface({
    name: "bare-interop-left-udp",
    listenHost: "127.0.0.1",
    listenPort: leftPort,
    forwardHost: "127.0.0.1",
    forwardPort: rightPort
  });

  const rightIn = right.registerDestination({
    provider,
    identity: rightIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "udp",
    aspects: ["bare-interop"]
  });
  rightIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  await rightIn.announce();
  await sleep(100);
  if (!left.hasPath(rightIn.hash)) {
    throw new Error("Bare UDP loopback did not learn path from announce");
  }

  const leftOut = left.registerDestination({
    provider,
    identity: rightIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "udp",
    aspects: ["bare-interop"]
  });

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Bare UDP loopback timeout")), 5_000);
    rightIn.setPacketCallback((data) => {
      clearTimeout(timer);
      resolve(bytesToAscii(data));
    });
  });

  const receipt = await leftOut.send(new TextEncoder().encode("bare-udp-ping"), { createReceipt: true });
  await waitForReceipt(receipt);
  const echoed = await received;
  if (echoed !== "bare-udp-ping") {
    throw new Error(`Unexpected Bare UDP payload: ${echoed}`);
  }

  await leftUdp.close();
  await rightUdp.close();
  left.stop();
  right.stop();
  console.log("bare-interop: UDP loopback passed on Bare runtime");
}

export async function runBareInterop() {
  await runLeafEcho();
  await runLinkEcho();
  await runLxmfEcho();
  await runUdpLoopback();
}
