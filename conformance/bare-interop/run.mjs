#!/usr/bin/env node
/**
 * Desktop Bare interop runner (Phase 2 M1).
 * Runs the TCP leaf-echo interop scenario using the Bare runtime adapter.
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  PacketReceiptStatus,
  PureCryptoProvider,
  Reticulum,
  bareRuntime,
  hexToBytes
} from "../../packages/reticulum-ts/dist/index.js";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const provider = new PureCryptoProvider();
const runtime = bareRuntime({ storePath: join(repoRoot, ".bare-interop-store") });

const LEAF_ECHO_PORT = Number.parseInt(process.env.LEAF_ECHO_PORT ?? "4242", 10);
const INTEROP_HOST = process.env.INTEROP_HOST ?? "127.0.0.1";

const identityVectors = JSON.parse(
  readFileSync(join(repoRoot, "conformance/vectors/identity.json"), "utf8")
) as {
  identities: ReadonlyArray<{ name: string; privateKeyHex: string }>;
};

function loadIdentity(name: string): Identity {
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

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForPath(reticulum: Reticulum, destinationHash: Uint8Array, timeoutMs = 15_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
}

async function main() {
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

  const received = new Map<string, Uint8Array>();
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

  console.log("bare-interop: leaf echo passed on Bare runtime");
}

function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

function expectReceipt(actual: number, expected: number): void {
  if (actual !== expected) {
    throw new Error(`Expected receipt status ${expected}, got ${actual}`);
  }
}

main().catch((error) => {
  console.error(error);
  throw error;
});
