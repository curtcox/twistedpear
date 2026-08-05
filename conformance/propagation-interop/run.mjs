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
import { NodeCryptoProvider, Reticulum, nodeRuntime, Identity, hexToBytes, PipeInterface } from "../../packages/reticulum-ts/dist/index.js";
import {
  LXMessage,
  LXMessageMethod,
  LXMFRouter,
  PropagationClient,
  PropagationServer,
  DEFAULT_PROPAGATION_QUOTAS,
  PropagationTransferState,
  createPropagationDestination,
  msgpackUnpackPropagationEnvelope
} from "../../packages/lxmf-ts/dist/index.js";
import {
  interopReady,
  sleep,
  withComposeService,
  LXMF_ECHO_PORT,
  PROPAGATION_LXMD_PORT,
  PROPAGATION_TS_PORT,
  composeRun,
  waitForLogLine
} from "../scenarios/ts/harness.mjs";

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

async function waitForPath(reticulum, destinationHash, timeoutMs = 15_000, onTick = null) {
  const deadline = Date.now() + timeoutMs;
  let lastRequest = 0;
  while (Date.now() < deadline) {
    if (reticulum.hasPath(destinationHash)) {
      return;
    }

    const now = Date.now();
    if (now - lastRequest >= 1_000) {
      // Peer may have announced before this client connected; solicit actively.
      reticulum.requestPath(destinationHash);
      if (onTick !== null) {
        await onTick();
      }
      lastRequest = now;
    }

    await sleep(100);
  }

  throw new Error("Timed out waiting for path to peer");
}

async function runInProcessPropagationSync() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();

  const nodeReticulum = Reticulum.create({ provider, runtime });
  const clientReticulum = Reticulum.create({ provider, runtime });
  nodeReticulum.start();
  clientReticulum.start();

  const [nodePipe, clientPipe] = PipeInterface.pair(provider);
  nodeReticulum.registerInterface(nodePipe);
  clientReticulum.registerInterface(clientPipe);

  const nodeIdentity = new Identity(provider);
  const server = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
        now: () => Date.now(),
        schedule: (ms, callback) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
      });
  const destination = createPropagationDestination(provider, nodeReticulum, nodeIdentity);
  server.registerHandlers(destination);
  const nodeDelivery = new LXMFRouter({ reticulum: nodeReticulum, provider }).registerDeliveryIdentity(nodeIdentity);
  await nodeDelivery.announce();
  await destination.announce();

  const router = new LXMFRouter({ reticulum: clientReticulum, provider });
  router.registerDeliveryIdentity(new Identity(provider));

  await sleep(50);

  const client = new PropagationClient({ router, provider });
  client.setPropagationNode(destination.hash);
  const result = await client.syncMessages(10);
  if (result.state !== PropagationTransferState.COMPLETE && result.state !== PropagationTransferState.IDLE) {
    throw new Error(`propagation sync failed: ${result.state}`);
  }

  await clientReticulum.stop();
  await nodeReticulum.stop();
  console.log("propagation-interop: in-process sync passed");
}

async function runHostCorePropagationBoot() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-prop-host-"));
  try {
    const session = await createNodeHost({
        identityPassphrase: "conformance identity passphrase",
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
    // Re-announce while discovering the peer so a mid-handshake TCP reset does
    // not leave the Python echo without a return path to alice.
    await waitForPath(reticulum, bobOut.hash, 15_000, () => aliceDelivery.announce());
    await aliceDelivery.announce();
    await sleep(300);

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
      timestamp: Date.now() / 1_000
    });

    const content = await received;
    if (content !== "Hello Python LXMF") {
      throw new Error(`unexpected LXMF echo content: ${content}`);
    }

    await reticulum.stop();
  });

  console.log("propagation-interop: LXMF opportunistic over TCP passed");
}

async function runTsPropagationServerPythonClientSync() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const alice = loadIdentity(provider, "alice");
  const bob = loadIdentity(provider, "bob");

  const reticulum = Reticulum.create({ provider, runtime, transportEnabled: true });
  reticulum.start();

  await reticulum.addTcpServerInterface({
    name: "propagation-ts-server",
    listenHost: "0.0.0.0",
    listenPort: PROPAGATION_TS_PORT
  });

  const router = new LXMFRouter({ reticulum, provider });
  const nodeDelivery = router.registerDeliveryIdentity(bob);
  const nodePropagation = createPropagationDestination(provider, reticulum, bob);
  const server = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
        now: () => Date.now(),
        schedule: (ms, callback) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
      });
  server.registerHandlers(nodePropagation);

  await nodeDelivery.announce();
  await nodePropagation.announce();
  await sleep(500);

  const aliceOut = router.createOutboundDestination(alice);
  const packed = LXMessage.pack({
    provider,
    destination: aliceOut,
    source: nodeDelivery,
    title: "Offline",
    content: "TS propagation server seed",
    desiredMethod: LXMessageMethod.PROPAGATED,
    deferStamp: true,
    timestamp: Date.now() / 1_000
  });
  const [queuedMessage] = msgpackUnpackPropagationEnvelope(packed.propagationPacked);
  if (queuedMessage === undefined) {
    throw new Error("Missing propagation payload for TS server seed");
  }

  server.storePropagationData(queuedMessage);

  const propagationHash = Buffer.from(nodePropagation.hash).toString("hex");
  // Keep announcing while the short-lived Python client comes online and
  // requests a path; a single announce is easy to miss on cold TCP attach.
  const announceWhileSync = setInterval(() => {
    // The Python client may disconnect between ticks; don't let a closed
    // TCP child interface abort the sync attempt.
    void Promise.resolve(nodePropagation.announce()).catch(() => {});
    void Promise.resolve(nodeDelivery.announce()).catch(() => {});
  }, 1_000);
  try {
    const syncOutput = await composeRun(
      "propagation-tools",
      [
        "propagation_sync.py",
        "--target-host",
        "host.docker.internal",
        "--target-port",
        String(PROPAGATION_TS_PORT),
        "--propagation-hash",
        propagationHash,
        "--recipient",
        "alice"
      ],
      {}
    );

    if (!syncOutput.includes("SYNC_OK TS propagation server seed")) {
      throw new Error(`Python propagation sync failed: ${syncOutput}`);
    }
  } finally {
    clearInterval(announceWhileSync);
  }

  await reticulum.stop();
  console.log("propagation-interop: TS server → Python client sync passed");
}

async function runLxmdServerTsClientSync() {
  await withComposeService("propagation-lxmd", PROPAGATION_LXMD_PORT, async () => {
    const match = await waitForLogLine("propagation-lxmd", /READY ([0-9a-f]+)/i);
    const propagationHash = match[1];

    await composeRun(
      "propagation-tools",
      [
        "propagation_publish.py",
        "--target-host",
        "host.docker.internal",
        "--target-port",
        String(PROPAGATION_LXMD_PORT),
        "--propagation-hash",
        propagationHash,
        "--content",
        "Hello from lxmd publisher"
      ],
      {}
    );
    await sleep(1500);

    const provider = new NodeCryptoProvider();
    const runtime = nodeRuntime();
    const alice = loadIdentity(provider, "alice");

    const reticulum = Reticulum.create({ provider, runtime });
    reticulum.start();

    await reticulum.addTcpClientInterface({
      name: "python-lxmd",
      targetHost: "127.0.0.1",
      targetPort: PROPAGATION_LXMD_PORT
    });

    const router = new LXMFRouter({ reticulum, provider });
    const aliceDelivery = router.registerDeliveryIdentity(alice);
    await aliceDelivery.announce();
    await waitForPath(reticulum, hexToBytes(propagationHash));

    const received = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("lxmd sync delivery timeout")), 20_000);
      router.onDelivery((message) => {
        clearTimeout(timer);
        resolve(message.contentAsString());
      });
    });

    const client = new PropagationClient({ router, provider });
    client.setPropagationNode(hexToBytes(propagationHash));
    const result = await client.syncMessages();
    if (result.state !== PropagationTransferState.COMPLETE && result.state !== PropagationTransferState.IDLE) {
      throw new Error(`lxmd client sync failed: ${result.state}`);
    }

    const content = await received;
    if (content !== "Hello from lxmd publisher") {
      throw new Error(`unexpected lxmd sync content: ${content}`);
    }

    await reticulum.stop();
  });

  console.log("propagation-interop: lxmd server → TS client sync passed");
}

async function runPropagationStoreRestart() {
  const dataDir = mkdtempSync(join(tmpdir(), "tp-prop-restart-"));
  try {
    const { createFilePropagationPersistence } = await import("../../packages/host-core/dist/propagation-persistence.js");
    const { PropagationServer, DEFAULT_PROPAGATION_QUOTAS } = await import("../../packages/lxmf-ts/dist/index.js");
    const { NodeCryptoProvider } = await import("../../packages/reticulum-ts/dist/index.js");
    const storePath = join(dataDir, "store.json");
    const provider = new NodeCryptoProvider();
    const persistence = createFilePropagationPersistence(storePath);
    const first = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
        now: () => Date.now(),
        schedule: (ms, callback) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
        persistence
      });
    const payload = new Uint8Array(32);
    payload[0] = 99;
    first.storePropagationData(payload);
    await sleep(400);

    const restarted = new PropagationServer(provider, DEFAULT_PROPAGATION_QUOTAS, {
        now: () => Date.now(),
        schedule: (ms, callback) => {
          const handle = setTimeout(callback, ms);
          return { cancel: () => clearTimeout(handle) };
        },
        persistence
      });
    if (restarted.stats.messageCount !== 1) {
      throw new Error(`propagation store restart expected 1 message, got ${restarted.stats.messageCount}`);
    }
  } finally {
    rmSync(dataDir, { recursive: true, force: true });
  }

  console.log("propagation-interop: store survives restart");
}

try {
  await runInProcessPropagationSync();
  await runHostCorePropagationBoot();
  await runPropagationStoreRestart();
  await runLxmfOpportunisticOverTcp();
  await runTsPropagationServerPythonClientSync();
  await runLxmdServerTsClientSync();
  console.log("propagation-interop: passed");
  process.exit(0);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`::error::propagation-interop failed: ${message.split("\n")[0]}`);
  console.error(error);
  process.exit(1);
}
