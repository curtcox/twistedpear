#!/usr/bin/env node
/**
 * Phase 6 demo: host-core transport TCP slice, propagation server boot, and
 * localhost status endpoint with bandwidth counters.
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
  LEAF_ECHO_PORT,
} from "../scenarios/ts/harness.mjs";
import { waitForReceipt } from "../scenarios/bare/helpers.mjs";

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

function bytesToAscii(bytes) {
  return Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
}

async function runTransportSlice(session) {
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
    received.set(bytesToAscii(data), data);
  });

  const receipt = await bobOut.send(
    new TextEncoder().encode("phase6-demo-ping"),
    { createReceipt: true },
  );
  await waitForReceipt(receipt);

  const deadline = Date.now() + 10_000;
  while (Date.now() < deadline) {
    if (
      received.has("phase6-demo-ping") &&
      received.has("hello from python leaf echo")
    ) {
      return;
    }

    await sleep(100);
  }

  throw new Error("phase6 demo: TCP slice did not complete");
}

async function assertStatusEndpoint(expected) {
  const response = await fetch("http://127.0.0.1:9473/status");
  if (!response.ok) {
    throw new Error(`status endpoint returned ${response.status}`);
  }

  const json = await response.json();
  for (const [key, value] of Object.entries(expected)) {
    if (json[key] !== value) {
      throw new Error(
        `status endpoint expected ${key}=${String(value)}, got ${String(json[key])}`,
      );
    }
  }

  if (
    typeof json.bandwidthBytesIn !== "number" ||
    typeof json.bandwidthBytesOut !== "number"
  ) {
    throw new Error("status endpoint missing bandwidth counters");
  }

  return json;
}

async function runFullRolesBoot(dataDir, options = {}) {
  const session = await createNodeHost({
    identityPassphrase: "conformance identity passphrase",
    config: resolveHostConfig({
      dataDir,
      overrides: {
        roles: {
          transport: options.transport ?? true,
          seeder: options.seeder ?? true,
          propagation: options.propagation ?? true,
          attachRnsd: null,
        },
        interfaces: options.interfaces ?? {
          tcp: { enabled: false, mode: "client" },
          auto: { enabled: false, multicast: false, bonjour: false },
          i2p: { enabled: false },
          rnode: { enabled: false },
        },
        statusEndpoint: true,
      },
    }),
  });

  const status = session.getStatus();
  console.log(
    `phase6 demo: host up identity=${status.identityHash} transport=${status.transportEnabled} seeder=${status.seederEnabled} propagation=${status.propagationEnabled}`,
  );

  await assertStatusEndpoint({
    seederEnabled: options.seeder ?? true,
    propagationEnabled: options.propagation ?? true,
  });

  return session;
}

async function runHeadlessBoot() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-phase6-"));
  try {
    const session = await runFullRolesBoot(dataDir);
    await session.stop();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
}

if (interopReady()) {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-phase6-interop-"));
  try {
    await withComposeService("leaf-echo", LEAF_ECHO_PORT, async () => {
      const session = await runFullRolesBoot(dataDir, {
        transport: true,
        seeder: false,
        propagation: false,
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
      });

      await runTransportSlice(session);
      const status = session.getStatus();
      if (status.bandwidthBytesIn === 0 && status.bandwidthBytesOut === 0) {
        throw new Error(
          "phase6 demo: expected non-zero bandwidth counters after TCP slice",
        );
      }

      console.log(
        `phase6 demo: transport TCP slice passed (in=${status.bandwidthBytesIn} out=${status.bandwidthBytesOut})`,
      );
      await session.stop();

      const propagationDir = mkdtempSync(join(tmpdir(), "tp-phase6-prop-"));
      try {
        const propagationSession = await runFullRolesBoot(propagationDir, {
          transport: false,
          seeder: false,
          propagation: true,
        });
        const propagationStatus = propagationSession.getStatus();
        if (!propagationStatus.propagationEnabled) {
          throw new Error("phase6 demo: propagation role not enabled");
        }

        console.log("phase6 demo: propagation server boot passed");
        await propagationSession.stop();
      } finally {
        rmSync(propagationDir, { recursive: true, force: true });
      }
    });
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }
} else {
  console.log(
    "phase6 demo: INTEROP docker unavailable — running headless boot only",
  );
  await runHeadlessBoot();
}

console.log("demo:phase6 complete");
