#!/usr/bin/env node
/**
 * Propagation server interop: in-process sync + host-core propagation role over TCP.
 */

import { readFileSync } from "node:fs";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createNodeHost } from "../../packages/host-core/dist/node-host.js";
import { resolveHostConfig } from "../../packages/host-core/dist/config.js";
import { NodeCryptoProvider, Reticulum, nodeRuntime, Identity, hexToBytes } from "../../packages/reticulum-ts/dist/index.js";
import {
  LXMFRouter,
  LXMessageMethod,
  PropagationClient,
  PropagationServer,
  createPropagationDestination
} from "../../packages/lxmf-ts/dist/index.js";
import { interopReady, sleep, withComposeService, LXMF_ECHO_PORT } from "../scenarios/ts/harness.mjs";

if (!interopReady()) {
  console.log("propagation-interop: skipped (set INTEROP=1 with docker)");
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

async function runInProcessPropagationSync() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();

  const reticulum = Reticulum.create({ provider, runtime });
  reticulum.start();

  const identity = new Identity(provider);
  const server = new PropagationServer(provider);
  const destination = createPropagationDestination(provider, reticulum, identity);
  server.registerHandlers(destination);
  await destination.announce();

  const router = new LXMFRouter({ reticulum, provider });
  router.registerDeliveryIdentity(identity);

  const client = new PropagationClient({ router, provider });
  client.setPropagationNode(destination.hash);
  const result = await client.syncMessages(10);
  if (result.state !== "complete" && result.state !== "idle") {
    throw new Error(`propagation sync failed: ${result.state}`);
  }

  await reticulum.stop();
  console.log("propagation-interop: in-process sync passed");
}

async function runHostCorePropagationBoot() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-prop-host-"));
  try {
    const session = await createNodeHost({
      config: resolveHostConfig({
        dataDir,
        overrides: {
          roles: { transport: false, seeder: false, propagation: true, attachRnsd: null },
          interfaces: {
            tcp: { enabled: false, mode: "client" },
            auto: { enabled: false, multicast: false, bonjour: false },
            i2p: { enabled: false },
            rnode: { enabled: false }
          }
        }
      })
    });

    const status = session.getStatus();
    if (!status.propagationEnabled) {
      throw new Error("host-core propagation role not enabled");
    }

    await session.stop();
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log("propagation-interop: host-core propagation boot passed");
}

async function runLxmfOpportunisticOverTcp() {
  await withComposeService("lxmf-echo", LXMF_ECHO_PORT, async () => {
    const provider = new NodeCryptoProvider();
    const runtime = nodeRuntime();
    const alice = loadIdentity(provider, "alice");
    const bob = loadIdentity(provider, "bob");

    const reticulum = Reticulum.create({ provider, runtime });
    reticulum.start();

    await reticulum.addTcpClientInterface({
      name: "python-lxmf-echo",
      targetHost: "127.0.0.1",
      targetPort: LXMF_ECHO_PORT
    });

    const router = new LXMFRouter({ reticulum, provider });
    const aliceDelivery = router.registerDeliveryIdentity(alice);
    const bobOut = router.createOutboundDestination(bob);

    await aliceDelivery.announce();
    await waitForPath(reticulum, bobOut.hash);

    const received = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("LXMF echo timeout")), 15_000);
      router.onDelivery((message) => {
        clearTimeout(timer);
        resolve(message.contentAsString());
      });
    });

    await router.packAndSend({
      destination: bobOut,
      source: aliceDelivery,
      title: "PropagationInterop",
      content: "Hello Python LXMF",
      desiredMethod: LXMessageMethod.OPPORTUNISTIC,
      deferStamp: true,
      timestamp: 1_700_000_100
    });

    const content = await received;
    if (content !== "Hello Python LXMF") {
      throw new Error(`unexpected LXMF echo content: ${content}`);
    }

    await reticulum.stop();
  });

  console.log("propagation-interop: LXMF opportunistic over TCP passed");
}

await runInProcessPropagationSync();
await runHostCorePropagationBoot();
await runLxmfOpportunisticOverTcp();
console.log("propagation-interop: passed");
