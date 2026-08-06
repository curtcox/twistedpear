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
  bytesToHex,
  hexToBytes,
  webRuntime,
} from "../../packages/reticulum-ts/dist/web.js";
import {
  LXMessageMethod,
  LXMFRouter,
} from "../../packages/lxmf-ts/dist/index.js";

function loadIdentity(provider, name) {
  const entry = identityVectors.identities.find(
    (candidate) => candidate.name === name,
  );
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(
    provider,
    hexToBytes(entry.privateKeyHex),
  );
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

  throw new Error(
    `Timed out waiting for delivered receipt; last status ${receipt.status}`,
  );
}

function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

async function runWebLeafHostSmoke(wsUrl) {
  const first = await createWebLeafHost({
    gatewayUrl: wsUrl,
    identity: {
      storeName: "twistedpear-web-interop-identity",
      passphrase: "web-interop-browser-passphrase",
    },
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
      passphrase: "web-interop-browser-passphrase",
    },
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
    url: wsUrl,
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
    aspects: ["echo"],
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = leaf.registerDestination({
    provider,
    identity: bob,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"],
  });

  const received = new Map();
  aliceIn.setPacketCallback((data) => {
    received.set(bytesToAscii(data), data);
  });

  await aliceIn.announce();
  if (typeof globalThis.__WAIT_FOR_GATEWAY_PATH__ !== "function") {
    throw new Error(
      "browser packet echo: gateway path verifier is unavailable",
    );
  }
  await globalThis.__WAIT_FOR_GATEWAY_PATH__(bytesToHex(aliceIn.hash));
  await waitForPath(leaf, bobOut.hash);
  // Match the LXMF slice: the leaf can learn the Python route before the
  // gateway has retained the browser return path needed for the echo.
  await aliceIn.announce();

  // Wait for Python's unsolicited greeting before sending — that proves the
  // browser return path is live. Re-announce while waiting because the first
  // transported announce can race interface startup in a cold CI container.
  const greetingDeadline = Date.now() + 20_000;
  while (
    !received.has("hello from python leaf echo") &&
    Date.now() < greetingDeadline
  ) {
    await aliceIn.announce();
    await sleep(1_000);
  }
  if (!received.has("hello from python leaf echo")) {
    throw new Error(
      "browser packet echo: Python greeting was not received before ping",
    );
  }

  await aliceIn.announce();
  await sleep(500);

  const payload = new TextEncoder().encode("web-browser-interop-ping");
  for (
    let attempt = 0;
    attempt < 3 && !received.has("web-browser-interop-ping");
    attempt += 1
  ) {
    const receipt = await bobOut.send(payload, { createReceipt: true });
    await waitForReceipt(receipt);
    const attemptDeadline = Date.now() + 10_000;
    while (
      !received.has("web-browser-interop-ping") &&
      Date.now() < attemptDeadline
    ) {
      await sleep(100);
    }
  }

  if (!received.has("web-browser-interop-ping")) {
    throw new Error("browser packet echo: outbound echo was not received");
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
    url: wsUrl,
  });
  leaf.registerInterface(wsClient);

  const alice = loadIdentity(provider, "alice");
  const bob = loadIdentity(provider, "bob");
  const router = new LXMFRouter({ reticulum: leaf, provider });
  const aliceDelivery = router.registerDeliveryIdentity(alice);
  const bobOut = router.createOutboundDestination(bob);

  await aliceDelivery.announce();
  if (typeof globalThis.__WAIT_FOR_GATEWAY_PATH__ !== "function") {
    throw new Error("browser LXMF echo: gateway path verifier is unavailable");
  }
  await globalThis.__WAIT_FOR_GATEWAY_PATH__(bytesToHex(aliceDelivery.hash));
  await waitForPath(leaf, bobOut.hash);
  // The leaf can learn the Python route before the gateway has retained the
  // browser delivery route needed for the echo response. Re-announce after
  // route convergence and allow the Python peer's interface worker to commit
  // the transported return path before the first opportunistic delivery.
  await aliceDelivery.announce();
  await sleep(5_000);
  await aliceDelivery.announce();
  await sleep(2_000);

  let echoed = null;
  router.onDelivery((message) => {
    echoed = message.contentAsString();
  });

  for (let attempt = 0; attempt < 3 && echoed === null; attempt += 1) {
    globalThis.__WEB_INTEROP__.lxmf = `sending-${attempt + 1}`;
    await aliceDelivery.announce();
    await sleep(1_000);
    await router.packAndSend({
      destination: bobOut,
      source: aliceDelivery,
      title: "Web browser interop",
      content: "Hello Python LXMF from browser",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: Date.now() / 1_000,
    });
    globalThis.__WEB_INTEROP__.lxmf = `awaiting-echo-${attempt + 1}`;
    const attemptDeadline = Date.now() + 15_000;
    while (echoed === null && Date.now() < attemptDeadline) {
      await sleep(100);
    }
  }
  if (echoed === null) {
    throw new Error("browser LXMF echo timeout");
  }
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
    lxmf: null,
  };

  await runLxmfEcho(wsUrl);
  globalThis.__WEB_INTEROP__.lxmf = "ok";

  await runWebLeafHostSmoke(wsUrl);
  globalThis.__WEB_INTEROP__.webLeafHost = "ok";

  await runPacketEcho(wsUrl);
  globalThis.__WEB_INTEROP__.packet = "ok";
  globalThis.__WEB_INTEROP__.status = "done";
}

main().catch((error) => {
  globalThis.__WEB_INTEROP__ = {
    status: "error",
    webLeafHost: globalThis.__WEB_INTEROP__?.webLeafHost ?? null,
    packet: globalThis.__WEB_INTEROP__?.packet ?? null,
    lxmf: globalThis.__WEB_INTEROP__?.lxmf ?? null,
    message: error instanceof Error ? error.message : String(error),
  };
});
