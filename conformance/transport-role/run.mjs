#!/usr/bin/env node
/**
 * Desktop host as transport node: leaf-echo TCP slice + two-leaf hub topology.
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
  hexToBytes,
} from "../../packages/reticulum-ts/dist/index.js";
import {
  interopReady,
  sleep,
  withComposeService,
  withTransportHubLeaves,
  waitForReadyLine,
  LEAF_ECHO_PORT,
  TRANSPORT_HUB_PORT,
} from "../scenarios/ts/harness.mjs";
import { waitForReceipt } from "../scenarios/bare/helpers.mjs";

if (!interopReady()) {
  console.log("transport-role: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const identityVectors = JSON.parse(
  readFileSync(new URL("../vectors/identity.json", import.meta.url), "utf8"),
);

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

async function waitForPeerInterfaces(reticulum, minimum, timeoutMs = 30_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const online = reticulum
      .listInterfaces()
      .filter((iface) => iface.online).length;
    if (online >= minimum) {
      return online;
    }

    await sleep(250);
  }

  throw new Error(
    `Timed out waiting for ${minimum} online transport interface(s)`,
  );
}

function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

async function runEchoSlice(
  session,
  pingLabel,
  greetingText,
  receiveTimeoutMs = 15_000,
) {
  const provider = session.reticulum.provider;
  const alice = loadIdentity(provider, "alice");
  const bob = loadIdentity(provider, "bob");

  const aliceIn = session.reticulum.registerDestination({
    provider,
    identity: alice,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"],
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = session.reticulum.registerDestination({
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
  await waitForPath(session.reticulum, bobOut.hash);
  await aliceIn.announce();
  await sleep(500);

  const receipt = await bobOut.send(new TextEncoder().encode(pingLabel), {
    createReceipt: true,
  });
  await waitForReceipt(receipt);

  const deadline = Date.now() + receiveTimeoutMs;
  while (Date.now() < deadline) {
    if (received.has(pingLabel) && received.has(greetingText)) {
      return;
    }

    await sleep(100);
  }

  if (!received.has(pingLabel)) {
    throw new Error(
      `transport-role: outbound echo was not received (${pingLabel})`,
    );
  }

  if (!received.has(greetingText)) {
    throw new Error(
      `transport-role: greeting was not received (${greetingText})`,
    );
  }
}

async function runLeafEchoSlice() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-transport-leaf-"));
  try {
    await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
      const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
        config: resolveHostConfig({
          dataDir,
          overrides: {
            interfaces: {
              tcp: {
                enabled: true,
                mode: "client",
                targetHost: "127.0.0.1",
                targetPort: LEAF_ECHO_PORT,
              },
              auto: { enabled: false, multicast: false, bonjour: false },
              i2p: { enabled: false },
              rnode: { enabled: false },
            },
            roles: {
              transport: true,
              seeder: false,
              propagation: false,
              attachRnsd: null,
            },
            relay: { mode: "transport-node" },
          },
        }),
      });

      if (!session.getStatus().transportEnabled) {
        throw new Error("transport role not enabled");
      }

      await runEchoSlice(
        session,
        "transport-role-ping",
        "hello from python leaf echo",
      );
      await session.stop();
    });
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log("transport-role: leaf-echo slice passed");
}

async function runTransportHubSlice() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-transport-hub-"));
  let session;
  try {
    session = await createNodeHost({
      identityPassphrase: "conformance identity passphrase",
      config: resolveHostConfig({
        dataDir,
        overrides: {
          interfaces: {
            tcp: {
              enabled: true,
              mode: "server",
              listenPort: TRANSPORT_HUB_PORT,
            },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false },
          },
          roles: {
            transport: true,
            seeder: false,
            propagation: false,
            attachRnsd: null,
          },
          relay: { mode: "transport-node" },
        },
      }),
    });

    if (!session.getStatus().transportEnabled) {
      throw new Error("transport hub role not enabled");
    }

    await withTransportHubLeaves(async () => {
      await waitForReadyLine("transport-leaf-bob", 45_000);
      await waitForReadyLine("transport-leaf-alice", 45_000);
      await waitForPeerInterfaces(session.reticulum, 2, 45_000);

      await runEchoSlice(
        session,
        "transport-hub-ping",
        "hello from python transport leaf",
        45_000,
      );

      const online = session.reticulum
        .listInterfaces()
        .filter((iface) => iface.online).length;
      if (online < 2) {
        throw new Error(
          `transport hub expected two leaf interfaces, saw ${online}`,
        );
      }
    });
  } finally {
    await session?.stop();
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log("transport-role: two-leaf hub topology passed");
}

await runLeafEchoSlice();
await runTransportHubSlice();
console.log("transport-role: passed");
