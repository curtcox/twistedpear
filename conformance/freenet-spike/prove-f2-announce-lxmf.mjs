#!/usr/bin/env node
/**
 * F2 announce + LXMF over FreenetInterface (simulator-first workstream B3).
 *
 * Opens two TwistedPear Reticulum/LXMF stacks on opposite packet-log sides,
 * optionally attached to distinct Freenet WebSocket endpoints, then exchanges
 * announces and one opportunistic LXMF message.
 *
 * Requires FREENET_NODE_URL or FREENET_LEFT_NODE_URL / FREENET_RIGHT_NODE_URL.
 */

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes } from "node:crypto";
import {
  Identity,
  NodeCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "@twistedpear/reticulum-ts";
import { LXMessageMethod, LXMFRouter } from "@twistedpear/lxmf-ts";
import { FreenetInterface } from "@twistedpear/reticulum-interfaces";
import { FreenetContractPacketLogBackend } from "../../packages/bridge-freenet/dist/index.js";

const root = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(root, "../..");
const sharedUrl = process.env.FREENET_NODE_URL;
const leftUrl =
  process.env.FREENET_LEFT_NODE_URL ??
  process.env.FREENET_PUBLISHER_NODE_URL ??
  sharedUrl;
const rightUrl =
  process.env.FREENET_RIGHT_NODE_URL ??
  process.env.FREENET_SUBSCRIBER_NODE_URL ??
  sharedUrl;
const label = process.env.FREENET_F2_ANNOUNCE_LABEL ?? process.env.FREENET_F2_LABEL ?? "local-isolated";
const leftToken =
  process.env.FREENET_LEFT_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN;
const rightToken =
  process.env.FREENET_RIGHT_NODE_TOKEN ?? process.env.FREENET_NODE_TOKEN;
const pathTimeoutMs = Number(process.env.FREENET_F2_PATH_TIMEOUT_MS ?? 60_000);
const lxmfTimeoutMs = Number(process.env.FREENET_F2_LXMF_TIMEOUT_MS ?? 60_000);

if (leftUrl === undefined || rightUrl === undefined) {
  throw new Error(
    "FREENET_NODE_URL (or FREENET_LEFT_NODE_URL / FREENET_RIGHT_NODE_URL) is required for the F2 announce+LXMF proof"
  );
}

const identityVectors = JSON.parse(
  readFileSync(join(repoRoot, "conformance/vectors/identity.json"), "utf8")
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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(reticulum, destinationHash, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }
    await sleep(100);
  }
  throw new Error("Timed out waiting for path to peer over FreenetInterface");
}

const wasm = Uint8Array.from(
  readFileSync(
    join(
      repoRoot,
      "packages/bridge-freenet/contract/packet-log/packet-log-contract.wasm"
    )
  )
);
const rendezvous = randomBytes(32);
const provider = new NodeCryptoProvider();
const runtime = nodeRuntime();

const leftBackend = new FreenetContractPacketLogBackend({
  clientOptions: { url: leftUrl, authToken: leftToken },
  wasm,
  rendezvous,
  localDirection: 0,
  retentionPerDirection: 64,
  updateOptions: { fallbackCodeField: wasm }
});
const rightBackend = new FreenetContractPacketLogBackend({
  clientOptions: { url: rightUrl, authToken: rightToken },
  wasm,
  rendezvous,
  localDirection: 1,
  retentionPerDirection: 64,
  updateOptions: { fallbackCodeField: wasm }
});

const leftReticulum = Reticulum.create({ provider, runtime });
const rightReticulum = Reticulum.create({ provider, runtime });
leftReticulum.start();
rightReticulum.start();

const leftIface = await FreenetInterface.open(provider, {
  name: "f2-announce-left",
  provider,
  backend: leftBackend
});
const rightIface = await FreenetInterface.open(provider, {
  name: "f2-announce-right",
  provider,
  backend: rightBackend
});
leftReticulum.registerInterface(leftIface);
rightReticulum.registerInterface(rightIface);

const alice = loadIdentity(provider, "alice");
const bob = loadIdentity(provider, "bob");
const leftRouter = new LXMFRouter({ reticulum: leftReticulum, provider });
const rightRouter = new LXMFRouter({ reticulum: rightReticulum, provider });
const aliceDelivery = leftRouter.registerDeliveryIdentity(alice);
const bobDelivery = rightRouter.registerDeliveryIdentity(bob);
const bobOut = leftRouter.createOutboundDestination(bob);

const distinct = leftUrl !== rightUrl;
const content = `tp-f2-announce-lxmf:${label}:${Date.now()}`;
console.log(
  `F2 announce+LXMF: Alice → Bob over Freenet packet-log` +
    (distinct ? " (distinct nodes)" : " (same node)")
);

try {
  await aliceDelivery.announce();
  await bobDelivery.announce();
  await waitForPath(leftReticulum, bobOut.hash, pathTimeoutMs);

  const received = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("LXMF delivery timeout over FreenetInterface")),
      lxmfTimeoutMs
    );
    rightRouter.onDelivery((message) => {
      clearTimeout(timer);
      resolve(message.contentAsString());
    });
  });

  await leftRouter.packAndSend({
    destination: bobOut,
    source: aliceDelivery,
    title: "Freenet F2",
    content,
    desiredMethod: LXMessageMethod.OPPORTUNISTIC,
    deferStamp: true,
    timestamp: 1_700_000_400
  });

  const got = await received;
  if (got !== content) {
    throw new Error(`F2 announce+LXMF payload mismatch: ${got}`);
  }
} finally {
  await leftIface.close().catch(() => {});
  await rightIface.close().catch(() => {});
  leftReticulum.stop();
  rightReticulum.stop();
}

const artifact = {
  schemaVersion: 1,
  audited: new Date().toISOString().slice(0, 10),
  label,
  leftNodeUrl: leftUrl,
  rightNodeUrl: rightUrl,
  distinctNodes: distinct,
  rendezvousHex: rendezvous.toString("hex"),
  result: "pass",
  notes: distinct
    ? "Distinct Freenet WebSocket endpoints, opposite localDirection; announce + opportunistic LXMF."
    : "Same Freenet node, opposite localDirection; announce + opportunistic LXMF."
};

const outDir = join(repoRoot, ".tmp");
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, `f2-announce-lxmf-proof-${label}.json`);
writeFileSync(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.log(`F2 announce+LXMF proof passed; wrote ${outPath}`);
