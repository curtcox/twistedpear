#!/usr/bin/env node
/**
 * rnsd attach mode: local transport off, app-layer roles over attached TCP leaf.
 */

import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { resolveHostConfig } from "../../packages/host-core/dist/config.js";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  PacketReceiptStatus,
  hexToBytes
} from "../../packages/reticulum-ts/dist/index.js";
import { interopReady, sleep, withComposeService, LEAF_ECHO_PORT } from "../scenarios/ts/harness.mjs";

if (!interopReady()) {
  console.log("rnsd-mode: skipped (set INTEROP=1 with docker)");
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

const dataDir = mkdtempSync(join(tmpdir(), "tp-rnsd-"));

try {
  await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
    const session = await createNodeHost({
      config: resolveHostConfig({
        dataDir,
        overrides: {
          roles: {
            transport: false,
            seeder: false,
            propagation: false,
            attachRnsd: { host: "127.0.0.1", port: LEAF_ECHO_PORT }
          },
          interfaces: {
            tcp: { enabled: true, mode: "client", targetHost: "127.0.0.1", targetPort: LEAF_ECHO_PORT },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        }
      })
    });

    const status = session.getStatus();
    if (status.transportEnabled) {
      throw new Error("attached host must not route locally");
    }

    if (status.attachRnsd === null) {
      throw new Error("expected rnsd attach config");
    }

    const provider = session.reticulum.provider;
    const alice = loadIdentity(provider, "alice");
    const bob = loadIdentity(provider, "bob");

    const aliceIn = session.reticulum.registerDestination({
      provider,
      identity: alice,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["echo"]
    });
    aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    const bobOut = session.reticulum.registerDestination({
      provider,
      identity: bob,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["echo"]
    });

    await aliceIn.announce();
    await waitForPath(session.reticulum, bobOut.hash);

    const received = new Map();
    aliceIn.setPacketCallback((data) => {
      received.set(bytesToAscii(data), data);
    });

    const payload = new TextEncoder().encode("rnsd-mode-ping");
    const receipt = await bobOut.send(payload);
    if (receipt.status !== PacketReceiptStatus.DELIVERED) {
      throw new Error(`Expected delivered receipt, got ${receipt.status}`);
    }

    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      if (received.has("rnsd-mode-ping") && received.has("hello from python leaf echo")) {
        break;
      }

      await sleep(100);
    }

    if (!received.has("rnsd-mode-ping")) {
      throw new Error("rnsd-mode: outbound echo was not received");
    }

    if (!received.has("hello from python leaf echo")) {
      throw new Error("rnsd-mode: Python greeting was not received");
    }

    await session.stop();
  });
} finally {
  rmSync(dataDir, { recursive: true, force: true });
}

console.log("rnsd-mode: passed");
