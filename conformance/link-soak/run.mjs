#!/usr/bin/env node
/**
 * Link keepalive soak (Phase 1 M4): maintain an active TS ⇄ Python link with periodic
 * encrypted payloads. Set LINK_SOAK_DURATION_MS for duration (default 60 s; nightly 1 h).
 */

import { readFileSync } from "node:fs";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  LinkStatus,
  NodeCryptoProvider,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "../../packages/reticulum-ts/dist/index.js";
import {
  interopReady,
  sleep,
  withComposeService,
  LINK_ECHO_PORT,
  waitForReadyLine
} from "../scenarios/ts/harness.mjs";

if (!interopReady()) {
  console.log("link-soak: skipped (set INTEROP=1 with docker)");
  process.exit(0);
}

const DURATION_MS = Number.parseInt(process.env.LINK_SOAK_DURATION_MS ?? "60000", 10);
const PING_INTERVAL_MS = Number.parseInt(process.env.LINK_SOAK_PING_MS ?? "5000", 10);

const identityVectors = JSON.parse(
  readFileSync(new URL("../vectors/identity.json", import.meta.url), "utf8")
);

function loadIdentity(provider, name) {
  const entry = identityVectors.identities.find((candidate) => candidate.name === name);
  if (entry === undefined) {
    throw new Error(`Missing identity vector: ${name}`);
  }

  const identity = Identity.fromBytes(provider, hexToBytes(entry.privateKeyHex));
  if (identity === undefined || identity === null) {
    throw new Error(`Could not load identity vector: ${name}`);
  }

  return identity;
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

async function main() {
  await withComposeService("link-echo", LINK_ECHO_PORT, async () => {
    await waitForReadyLine("link-echo", 45_000);

    const provider = new NodeCryptoProvider();
    const runtime = nodeRuntime();
    const bob = loadIdentity(provider, "bob");

    const reticulum = Reticulum.create({ provider, runtime });
    reticulum.start();

    await reticulum.addTcpClientInterface({
      name: "python-link-soak",
      targetHost: "127.0.0.1",
      targetPort: LINK_ECHO_PORT,
      reconnectWaitMs: 500
    });

    const bobOut = reticulum.registerDestination({
      provider,
      identity: bob,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "example",
      aspects: ["link"]
    });

    await waitForPath(reticulum, bobOut.hash);

    const link = bobOut.requestLink();
    const linkDeadline = Date.now() + 15_000;
    while (Date.now() < linkDeadline && link.status !== LinkStatus.ACTIVE) {
      await sleep(100);
    }

    if (link.status !== LinkStatus.ACTIVE) {
      throw new Error(`link did not become active: ${link.status}`);
    }

    const started = Date.now();
    let pings = 0;
    let spuriousTeardowns = 0;

    while (Date.now() - started < DURATION_MS) {
      if (link.status === LinkStatus.CLOSED) {
        spuriousTeardowns += 1;
        throw new Error(`link closed unexpectedly after ${pings} pings`);
      }

      const echo = new Promise<string>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("link echo timeout")), 10_000);
        link.callbacks.packet = (data) => {
          clearTimeout(timer);
          resolve(new TextDecoder().decode(data));
        };
      });

      const label = `soak-${pings}`;
      await link.send(new TextEncoder().encode(label));
      const content = await echo;
      if (content !== label) {
        throw new Error(`unexpected echo: ${content}`);
      }

      pings += 1;
      await sleep(PING_INTERVAL_MS);
    }

    if (spuriousTeardowns > 0) {
      throw new Error(`spurious link teardowns: ${spuriousTeardowns}`);
    }

    console.log(
      `link-soak: ${pings} keepalive pings over ${DURATION_MS}ms, zero spurious teardowns`
    );
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
