#!/usr/bin/env node
/**
 * Shared quiesce/reconnect lifecycle slice against the docker leaf-echo peer.
 * Simulates iOS suspend-node (close interfaces) and resume-node (reconnect + re-announce).
 */

import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { PureCryptoProvider } from "../../../packages/reticulum-ts/dist/crypto/pure.js";
import { DestinationDirection, DestinationType } from "../../../packages/reticulum-ts/dist/destination.js";
import { DestinationProofStrategy } from "../../../packages/reticulum-ts/dist/registered-destination.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import { bareRuntime } from "../../../packages/reticulum-ts/dist/runtime/bare/runtime.js";
import { Reticulum } from "../../../packages/reticulum-ts/dist/reticulum.js";
import { PacketReceiptStatus } from "../../../packages/reticulum-ts/dist/packet-receipt.js";
import {
  INTEROP_HOST,
  LEAF_ECHO_PORT,
  expectReceipt,
  loadIdentityVectors,
  repoRoot,
  sleep,
  waitForPath
} from "./helpers.mjs";

const defaultMetricsPath = join(repoRoot, "conformance/ios-sim/measured-lifecycle.json");

async function waitForPathLoss(reticulum, destinationHash, timeoutMs = 10_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!reticulum.hasPath(destinationHash)) {
      return;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to drop after quiesce");
}

export async function runBareLifecycleSlice(options = {}) {
  const {
    label = "lifecycle",
    storePath = `${repoRoot}/.lifecycle-slice-store`,
    cycles = 10,
    reconnectTimeoutMs = 10_000,
    metricsPath = process.env.IOS_LIFECYCLE_METRICS_PATH ?? null
  } = options;

  const cycleMetrics = [];

  const vectors = loadIdentityVectors();
  const aliceEntry = vectors.identities.find((entry) => entry.name === "alice");
  const bobEntry = vectors.identities.find((entry) => entry.name === "bob");
  if (aliceEntry === undefined || bobEntry === undefined) {
    throw new Error("Missing alice/bob identity vectors");
  }

  const provider = new PureCryptoProvider();
  const runtime = bareRuntime({ storePath });
  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const aliceIdentity = Identity.fromBytes(provider, hexToBytes(aliceEntry.privateKeyHex));
  const bobIdentity = Identity.fromBytes(provider, hexToBytes(bobEntry.privateKeyHex));
  if (aliceIdentity === null || bobIdentity === null) {
    throw new Error("Failed to load interop identities");
  }

  const aliceIn = reticulum.registerDestination({
    provider,
    identity: aliceIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });
  aliceIn.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  const bobOut = reticulum.registerDestination({
    provider,
    identity: bobIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "example",
    aspects: ["echo"]
  });

  let iface = await reticulum.addTcpClientInterface({
    name: `${label}-peer`,
    targetHost: INTEROP_HOST,
    targetPort: LEAF_ECHO_PORT
  });

  await aliceIn.announce();
  await waitForPath(reticulum, bobOut.hash, reconnectTimeoutMs);

  for (let cycle = 0; cycle < cycles; cycle += 1) {
    const payload = new TextEncoder().encode(`${label}-cycle-${cycle}`);
    const receipt = await bobOut.send(payload);
    expectReceipt(receipt.status, PacketReceiptStatus.DELIVERED);

    await iface.close();
    await waitForPathLoss(reticulum, bobOut.hash, reconnectTimeoutMs);

    const resumedAt = Date.now();
    iface = await reticulum.addTcpClientInterface({
      name: `${label}-peer-${cycle}`,
      targetHost: INTEROP_HOST,
      targetPort: LEAF_ECHO_PORT
    });
    await aliceIn.announce();
    await waitForPath(reticulum, bobOut.hash, reconnectTimeoutMs);

    const reconnectMs = Date.now() - resumedAt;
    cycleMetrics.push({ cycle, reconnectMs });

    if (reconnectMs > reconnectTimeoutMs) {
      throw new Error(`${label}: reconnect exceeded ${reconnectTimeoutMs}ms on cycle ${cycle}`);
    }

    const afterResume = await bobOut.send(new TextEncoder().encode(`${label}-resume-${cycle}`));
    expectReceipt(afterResume.status, PacketReceiptStatus.DELIVERED);
  }

  await iface.close();
  reticulum.stop();

  const reconnectMs = cycleMetrics.map((entry) => entry.reconnectMs);
  const summary = {
    label,
    cycles: cycleMetrics.length,
    reconnectMs,
    reconnectP50Ms: percentile(reconnectMs, 50),
    reconnectP95Ms: percentile(reconnectMs, 95),
    reconnectMaxMs: reconnectMs.length > 0 ? Math.max(...reconnectMs) : 0
  };

  const outputPath = metricsPath ?? defaultMetricsPath;
  if (outputPath) {
    writeFileSync(
      outputPath,
      `${JSON.stringify(
        {
          measuredAt: new Date().toISOString(),
          runtime: "bare-worklet-slice",
          peer: `${INTEROP_HOST}:${LEAF_ECHO_PORT}`,
          ...summary
        },
        null,
        2
      )}\n`
    );
  }

  return summary;
}

function percentile(values, p) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[index];
}
