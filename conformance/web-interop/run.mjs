#!/usr/bin/env node
/**
 * W-S1: WebSocket leaf peer through a gateway node to dockerized Python RNS.
 */

import { readFileSync } from "node:fs";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  NodeCryptoProvider,
  Reticulum,
  WebSocketClientInterface,
  hexToBytes,
  nodeRuntime,
  registerWebSocketServerInterface
} from "../../packages/reticulum-ts/dist/index.js";
import { interopReady, sleep, withComposeService, LEAF_ECHO_PORT } from "../scenarios/ts/harness.mjs";
import { waitForReceipt } from "../scenarios/bare/helpers.mjs";

if (!interopReady()) {
  console.log("web-interop: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const identityVectors = JSON.parse(
  readFileSync(new URL("../vectors/identity.json", import.meta.url), "utf8")
);

function loadIdentity(provider, name) {
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

function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();

  const gateway = Reticulum.create({ provider, runtime, transportEnabled: true });
  gateway.start();
  const tcpClient = await gateway.addTcpClientInterface({
    name: "python-leaf-echo",
    targetHost: "127.0.0.1",
    targetPort: LEAF_ECHO_PORT
  });
  const wsServer = await registerWebSocketServerInterface(gateway, {
    name: "ws-gateway",
    listenHost: "127.0.0.1",
    listenPort: 0
  });

  const wsPort = wsServer.address?.port;
  if (wsPort === undefined) {
    throw new Error("expected websocket gateway to be listening");
  }

  const leaf = Reticulum.create({ provider, runtime });
  leaf.start();

  const wsClient = await WebSocketClientInterface.connect(provider, runtime, {
    name: "web-leaf-ws",
    provider,
    runtime,
    url: `ws://127.0.0.1:${wsPort}`
  });
  leaf.registerInterface(wsClient);

  const alice = loadIdentity(provider, "alice");
  const bob = loadIdentity(provider, "bob");

  const aliceIn = leaf.registerDestination({
    provider,
    identity: alice,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = leaf.registerDestination({
    provider,
    identity: bob,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  await aliceIn.announce();
  await waitForPath(gateway, aliceIn.hash);
  await waitForPath(leaf, bobOut.hash);
  await aliceIn.announce();
  await sleep(500);

  const payload = new TextEncoder().encode("web-interop-ping");
  const receipt = await bobOut.send(payload, { createReceipt: true });
  await waitForReceipt(receipt);

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (received.has("web-interop-ping") && received.has("hello from python leaf echo")) {
      break;
    }

    await sleep(100);
  }

  if (!received.has("web-interop-ping")) {
    throw new Error("web-interop: outbound echo was not received");
  }

  if (!received.has("hello from python leaf echo")) {
    throw new Error("web-interop: Python greeting was not received");
  }

  await wsClient.close();
  await wsServer.close();
  await tcpClient.close();
  leaf.stop();
  gateway.stop();
});

console.log("web-interop: passed");
