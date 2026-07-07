/**
 * Browser-side W-S1 + W1 interop: packet echo, LXMF echo, and web leaf host smoke.
 * Bundled for Playwright; reports status on window.__WEB_INTEROP__.
 */

import identityVectors from "../vectors/identity.json" with { type: "json" };
import { createWebLeafHost } from "../../packages/host-core/dist/web.js";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  PacketReceiptStatus,
  PureCryptoProvider,
  Reticulum,
  WebSocketClientInterface,
  hexToBytes,
  webRuntime
} from "../../packages/reticulum-ts/dist/web.js";
import { LXMessageMethod, LXMFRouter } from "../../packages/lxmf-ts/dist/index.js";

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(reticulum, destinationHash, timeoutMs = 30_000) {
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

async function runWebLeafHostSmoke(wsUrl) {
  const first = await createWebLeafHost({
    gatewayUrl: wsUrl,
    identity: {
      storeName: "twistedpear-web-interop-identity",
      passphrase: "web-interop-browser-passphrase"
    }
  });

  const firstStatus = first.getStatus();
  if (firstStatus.identityHash.length === 0) {
    throw new Error("web leaf host smoke: expected identity hash");
  }

  let linkOnline = false;
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (first.getStatus().linkOnline) {
      linkOnline = true;
      break;
    }

    await sleep(100);
  }

  if (!linkOnline) {
    throw new Error("web leaf host smoke: gateway link did not come online");
  }

  await first.stop();

  const second = await createWebLeafHost({
    gatewayUrl: wsUrl,
    identity: {
      storeName: "twistedpear-web-interop-identity",
      passphrase: "web-interop-browser-passphrase"
    }
  });

  if (second.getStatus().identityHash !== firstStatus.identityHash) {
    throw new Error("web leaf host smoke: identity hash changed after reload");
  }

  await second.stop();
}

async function runPacketEcho(wsUrl) {
  const provider = new PureCryptoProvider();
  const runtime = webRuntime();
  const leaf = Reticulum.create({ provider, runtime });
  leaf.start();

  const wsClient = await WebSocketClientInterface.connect(provider, runtime, {
    name: "browser-leaf-ws",
    provider,
    runtime,
    url: wsUrl
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

  await aliceIn.announce();
  await waitForPath(leaf, bobOut.hash);

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  const payload = new TextEncoder().encode("web-browser-interop-ping");
  const receipt = await bobOut.send(payload);
  if (receipt.status !== PacketReceiptStatus.DELIVERED) {
    throw new Error(`Expected delivered receipt, got ${receipt.status}`);
  }

  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (received.has("web-browser-interop-ping") && received.has("hello from python leaf echo")) {
      break;
    }

    await sleep(100);
  }

  if (!received.has("web-browser-interop-ping")) {
    throw new Error("browser packet echo: outbound echo was not received");
  }

  if (!received.has("hello from python leaf echo")) {
    throw new Error("browser packet echo: Python greeting was not received");
  }

  await wsClient.close();
  await leaf.stop();
}

async function runLxmfEcho(wsUrl) {
  const provider = new PureCryptoProvider();
  const runtime = webRuntime();
  const leaf = Reticulum.create({ provider, runtime });
  leaf.start();

  const wsClient = await WebSocketClientInterface.connect(provider, runtime, {
    name: "browser-leaf-ws-lxmf",
    provider,
    runtime,
    url: wsUrl
  });
  leaf.registerInterface(wsClient);

  const alice = loadIdentity(provider, "alice");
  const bob = loadIdentity(provider, "bob");
  const router = new LXMFRouter({ reticulum: leaf, provider });
  const aliceDelivery = router.registerDeliveryIdentity(alice);
  const bobOut = router.createOutboundDestination(bob);

  await aliceDelivery.announce();
  await waitForPath(leaf, bobOut.hash);

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("browser LXMF echo timeout")), 30_000);
    router.onDelivery((message) => {
      clearTimeout(timer);
      resolve(message.contentAsString());
    });
  });

  await router.packAndSend({
    destination: bobOut,
    source: aliceDelivery,
    title: "Web browser interop",
    content: "Hello Python LXMF from browser",
    desiredMethod: LXMessageMethod.OPPORTUNISTIC,
    deferStamp: true,
    timestamp: 1_700_000_100
  });

  const echoed = await received;
  if (echoed !== "Hello Python LXMF from browser") {
    throw new Error(`browser LXMF echo: unexpected payload: ${echoed}`);
  }

  await wsClient.close();
  await leaf.stop();
}

async function main() {
  const params = new URLSearchParams(globalThis.location.search);
  const wsUrl = params.get("ws");
  if (wsUrl === null || wsUrl === "") {
    throw new Error("Missing ?ws= query parameter");
  }

  globalThis.__WEB_INTEROP__ = {
    status: "running",
    webLeafHost: null,
    packet: null,
    lxmf: null
  };

  await runWebLeafHostSmoke(wsUrl);
  globalThis.__WEB_INTEROP__.webLeafHost = "ok";

  await runPacketEcho(wsUrl);
  globalThis.__WEB_INTEROP__.packet = "ok";

  await runLxmfEcho(wsUrl);
  globalThis.__WEB_INTEROP__.lxmf = "ok";
  globalThis.__WEB_INTEROP__.status = "done";
}

main().catch((error) => {
  globalThis.__WEB_INTEROP__ = {
    status: "error",
    webLeafHost: globalThis.__WEB_INTEROP__?.webLeafHost ?? null,
    packet: globalThis.__WEB_INTEROP__?.packet ?? null,
    lxmf: globalThis.__WEB_INTEROP__?.lxmf ?? null,
    message: error instanceof Error ? error.message : String(error)
  };
});
