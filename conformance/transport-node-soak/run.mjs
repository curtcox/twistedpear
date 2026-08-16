#!/usr/bin/env node
/**
 * Transport-node soak (Phase 1 M8): mixed TS transport hub + docker leaf peers with
 * periodic data exchange. Set TRANSPORT_SOAK_DURATION_MS (default 60 s; plan 72 h on server).
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
  hexToBytes,
} from "../../packages/reticulum-ts/dist/index.js";
import {
  interopReady,
  sleep,
  withTransportHubLeaves,
  waitForReadyLine,
  TRANSPORT_HUB_PORT,
} from "../scenarios/ts/harness.mjs";
import { soakProgress } from "../soak-progress.mjs";
import { soakResources } from "../soak-resources.mjs";

if (!interopReady()) {
  console.log("transport-node-soak: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const DURATION_MS = Number.parseInt(
  process.env.TRANSPORT_SOAK_DURATION_MS ?? "60000",
  10,
);
const CYCLE_MS = Number.parseInt(
  process.env.TRANSPORT_SOAK_CYCLE_MS ?? "5000",
  10,
);

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

async function main() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-transport-soak-"));

  try {
    await withTransportHubLeaves(async () => {
      const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
        config: resolveHostConfig({
          dataDir,
          overrides: {
            roles: {
              transport: true,
              seeder: false,
              propagation: false,
              attachRnsd: null,
            },
            relay: { mode: "transport-node" },
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
          },
        }),
      });

      if (!session.getStatus().transportEnabled) {
        throw new Error("transport role not enabled");
      }

      await waitForReadyLine("transport-leaf-bob", 45_000);
      await waitForPeerInterfaces(session.reticulum, 2, 45_000);

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

      await aliceIn.announce();
      await waitForPath(session.reticulum, bobOut.hash);

      const received = new Map();
      aliceIn.setPacketCallback((data) => {
        received.set(new TextDecoder().decode(data), data);
      });

      const started = Date.now();
      let cycles = 0;

      const progress = soakProgress({ total: DURATION_MS });
      while (Date.now() - started < DURATION_MS) {
        progress.report(Date.now() - started);
        const label = `transport-soak-${cycles}`;
        const receipt = await bobOut.send(new TextEncoder().encode(label), {
          createReceipt: true,
        });

        const deadline = Date.now() + 10_000;
        while (Date.now() < deadline) {
          if (received.has(label)) {
            break;
          }

          await sleep(50);
        }

        if (!received.has(label)) {
          throw new Error(`transport soak cycle ${cycles}: no echo from bob`);
        }

        if (
          receipt !== null &&
          receipt.status !== PacketReceiptStatus.DELIVERED
        ) {
          throw new Error(
            `transport soak cycle ${cycles}: proof not delivered (${receipt.status})`,
          );
        }

        cycles += 1;
        await sleep(CYCLE_MS);
      }

      await session.stop();
      console.log(
        `transport-node-soak: ${cycles} routed exchanges over ${DURATION_MS}ms`,
      );
    });
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
}

// Sampling starts at module load so the warm-up window covers process
// startup rather than beginning partway through it.
const resources = soakResources({ id: "transport-node-soak" });

main()
  .then(() => {
    // The resource verdict is part of the soak's result, not a note
    // beside it: a run that finished its cycles while leaking has not
    // passed.
    process.exit(resources.finish().status === "fail" ? 1 : 0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
