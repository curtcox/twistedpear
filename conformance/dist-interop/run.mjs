#!/usr/bin/env node
/**
 * Distribution interop smoke (Phase 3 M2/M3): catalog ingest, announce abuse,
 * transport-node announce + Resource fetch, and simulated-BLE Resource fetch.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  appDestinationName,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
} from "../../packages/app-registry/dist/index.js";
import { BleInterface } from "../../packages/reticulum-interfaces/dist/ble/interface.js";
import { SimulatedBlePipe } from "../../packages/reticulum-interfaces/dist/ble/sim.js";
import {
  PackageResourceClient,
  attachPackageResourceServer,
} from "../../packages/bridge-hyper/dist/index.js";
import {
  sendPackageResourceRequest,
  parseListResponse,
} from "../../packages/bridge-hyper/dist/resource-server.js";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  hexToBytes,
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";

function destinationParts(provider, publisherPublicKeyHex, appName) {
  const parts = appDestinationName(
    provider,
    publisherPublicKeyHex,
    appName,
  ).split(".");
  return {
    appName: parts[0] ?? "tp",
    aspects: parts.slice(1),
  };
}

const fixtureDir = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/packages",
);

async function waitFor(evaluate, timeoutMs = 10_000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }

  throw new Error("waitFor timeout");
}

function connectPeers(provider, runtime) {
  const left = Reticulum.create({ provider, runtime });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  right.start();

  const [leftPipe, rightPipe] = PipeInterface.pair(provider);
  left.registerInterface(leftPipe);
  right.registerInterface(rightPipe);

  return { left, right };
}

function connectTransportTopology(provider, runtime) {
  const left = Reticulum.create({ provider, runtime });
  const transport = Reticulum.create({
    provider,
    runtime,
    transportEnabled: true,
  });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  transport.start();
  right.start();

  const [leftPipe, transportLeftPipe] = PipeInterface.pair(provider);
  const [transportRightPipe, rightPipe] = PipeInterface.pair(provider);

  left.registerInterface(leftPipe);
  transport.registerInterface(transportLeftPipe);
  transport.registerInterface(transportRightPipe);
  right.registerInterface(rightPipe);

  return { left, transport, right };
}

async function stopNodes(...nodes) {
  for (const node of nodes) {
    await node.stop();
  }
}

function testCatalogBasics(provider, archive, unpacked, appData) {
  const catalog = new CatalogStore(provider);
  const entry = catalog.ingest({
    destinationHash: "deadbeef",
    appData,
    manifest: unpacked.manifest,
    packageHash: unpacked.packageHash,
  });

  if (entry === null) {
    throw new Error("catalog ingest failed");
  }

  const tampered = new Uint8Array(appData);
  tampered[tampered.length - 1] ^= 0xff;
  if (
    catalog.ingest({
      destinationHash: "deadbeef",
      appData: tampered,
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash,
    }) !== null
  ) {
    throw new Error("tampered announce should be rejected");
  }

  const oversized = new Uint8Array(400);
  oversized.fill(0x41);
  if (
    catalog.ingest({
      destinationHash: "oversized",
      appData: oversized,
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash,
    }) !== null
  ) {
    throw new Error("oversized announce should be rejected");
  }

  const other = new Identity(provider);
  const misSigned = buildAppAnnounceSummary(provider, other, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true,
  });
  if (
    catalog.ingest({
      destinationHash: "mis-signed",
      appData: encodeAppAnnounceData(misSigned),
      manifest: unpacked.manifest,
      packageHash: unpacked.packageHash,
    }) !== null
  ) {
    throw new Error("mis-signed announce should be rejected");
  }

  const floodCatalog = new CatalogStore(provider, {
    maxPerPublisher: 2,
    maxEntries: 10,
  });
  const publisher = Identity.fromBytes(
    provider,
    hexToBytes(metaFromFixture().publisherPrivateKey),
  );
  if (publisher === null) {
    throw new Error("invalid fixture publisher key");
  }

  let accepted = 0;
  for (let index = 0; index < 3; index += 1) {
    const appName = `flood-app-${index}`;
    const unsigned = {
      ...unpacked.manifest,
      name: appName,
    };
    const summary = buildAppAnnounceSummary(provider, publisher, {
      manifest: unsigned,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true,
    });
    const ingested = floodCatalog.ingest({
      destinationHash: `flood-${index}`,
      appData: encodeAppAnnounceData(summary),
    });
    if (ingested !== null) {
      accepted += 1;
    }
  }

  if (accepted !== 2 || floodCatalog.list().length !== 2) {
    throw new Error(
      "publisher flood should cap at maxPerPublisher without evicting unrelated entries",
    );
  }

  return catalog;
}

let fixtureMeta = null;

function metaFromFixture() {
  if (fixtureMeta === null) {
    fixtureMeta = JSON.parse(
      readFileSync(resolve(fixtureDir, "tiny.meta.json"), "utf8"),
    );
  }

  return fixtureMeta;
}

async function testCatalogPersistence(catalog, provider) {
  const store = new Map();
  const kv = {
    async get(key) {
      return store.get(key) ?? null;
    },
    async set(key, value) {
      store.set(key, value);
    },
    async delete(key) {
      store.delete(key);
    },
    async list() {
      return [...store.keys()];
    },
  };

  await catalog.save(kv);
  const reloaded = new CatalogStore(provider);
  await reloaded.load(kv);

  if (reloaded.list().length !== 1) {
    throw new Error("catalog persistence failed");
  }
}

async function testDirectResourceFetch(
  provider,
  runtime,
  archive,
  unpacked,
  publisherIdentity,
) {
  const { left, right } = connectPeers(provider, runtime);
  const publisher = right.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", "fixture", "tiny"],
  });

  attachPackageResourceServer(publisher, {
    async listVersions() {
      return [
        {
          version: unpacked.manifest.version,
          packageHash: unpacked.packageHash,
          size: archive.length,
        },
      ];
    },
    async fetchArchive() {
      return archive;
    },
  });

  await publisher.announce();

  const consumerIdentity = new Identity(provider);
  const consumerOut = left.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", "fixture", "tiny"],
  });

  let consumerLink = null;
  consumerOut.requestLink({
    linkEstablished(link) {
      consumerLink = link;
    },
  });

  const activeLink = await waitFor(() => consumerLink);
  const publisherLink = await waitFor(
    () =>
      publisher.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ??
      null,
  );
  publisherLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

  const listBytes = await sendPackageResourceRequest(activeLink, {
    type: "list",
  });
  const versions = parseListResponse(listBytes);
  if (
    versions.length !== 1 ||
    versions[0].packageHash !== unpacked.packageHash
  ) {
    throw new Error("resource list response mismatch");
  }

  const fetchedArchive = await sendPackageResourceRequest(activeLink, {
    type: "fetch",
    version: unpacked.manifest.version,
  });
  const resourceVerified = unpackPackage(provider, fetchedArchive);
  if (resourceVerified.packageHash !== unpacked.packageHash) {
    throw new Error("resource fetch hash mismatch");
  }

  activeLink.close();
  publisherLink.close();
  await stopNodes(left, right);
}

async function testTransportNodeCatalogAndResource(
  provider,
  runtime,
  archive,
  unpacked,
  publisherIdentity,
) {
  const { left, transport, right } = connectTransportTopology(
    provider,
    runtime,
  );
  const catalog = new CatalogStore(provider);

  let announcesReceived = 0;
  left.registerAnnounceHandler({
    receivedAnnounce(info) {
      announcesReceived += 1;
      if (info.appData === null) {
        return;
      }

      catalog.ingest({
        destinationHash: Buffer.from(info.destinationHash).toString("hex"),
        appData: info.appData,
      });
    },
  });

  const publisher = right.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", "fixture", "transport"],
  });

  attachPackageResourceServer(publisher, {
    async listVersions() {
      return [
        {
          version: unpacked.manifest.version,
          packageHash: unpacked.packageHash,
          size: archive.length,
        },
      ];
    },
    async fetchArchive() {
      return archive;
    },
  });

  const summary = buildAppAnnounceSummary(provider, publisherIdentity, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true,
  });

  await publisher.announce({ appData: encodeAppAnnounceData(summary) });
  await waitFor(() => (left.hasPath(publisher.hash) ? true : null), 15_000);
  const catalogEntry = await waitFor(() => catalog.list()[0] ?? null, 5_000);

  if (
    catalogEntry === null ||
    !unpacked.packageHash.startsWith(catalogEntry.packageHash)
  ) {
    throw new Error(
      `transport-node announce did not reach consumer catalog (announces=${announcesReceived}, path=${left.hasPath(publisher.hash)})`,
    );
  }

  const consumerOut = left.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", "fixture", "transport"],
  });

  let consumerLink = null;
  consumerOut.requestLink({
    linkEstablished(link) {
      consumerLink = link;
    },
  });

  const activeLink = await waitFor(() => consumerLink, 15_000);
  const publisherLink = await waitFor(
    () =>
      publisher.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ??
      null,
    15_000,
  );
  publisherLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

  const fetchedArchive = await sendPackageResourceRequest(
    activeLink,
    {
      type: "fetch",
      version: unpacked.manifest.version,
    },
    { timeoutMs: 15_000 },
  );
  const fetched = unpackPackage(provider, fetchedArchive);
  if (fetched.packageHash !== unpacked.packageHash) {
    throw new Error("transport-node resource fetch hash mismatch");
  }

  activeLink.close();
  publisherLink.close();
  await stopNodes(left, transport, right);
}

async function testSimulatedBleResourceFetch(
  provider,
  runtime,
  archive,
  unpacked,
  publisherIdentity,
) {
  const publisherPipe = new SimulatedBlePipe({
    mtu: 185,
    lossRate: 0.02,
    random: () => 0.99,
  });
  const consumerPipe = new SimulatedBlePipe({
    mtu: 185,
    lossRate: 0.02,
    random: () => 0.99,
  });
  publisherPipe.linkPeer(consumerPipe);

  const appParts = destinationParts(
    provider,
    unpacked.manifest.publisherPublicKey,
    unpacked.manifest.name,
  );

  const publisherNode = Reticulum.create({ provider, runtime });
  publisherNode.start();
  const publisherBle = await BleInterface.open(provider, {
    name: "ble-publisher",
    provider,
    pipe: publisherPipe,
    pipeMtu: 185,
  });
  publisherNode.registerInterface(publisherBle);

  const publisher = publisherNode.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: appParts.appName,
    aspects: appParts.aspects,
  });
  publisher.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

  attachPackageResourceServer(publisher, {
    async listVersions() {
      return [
        {
          version: unpacked.manifest.version,
          packageHash: unpacked.packageHash,
          size: archive.length,
        },
      ];
    },
    async fetchArchive() {
      return archive;
    },
  });

  const resourceClient = new PackageResourceClient({
    provider,
    runtime,
    publisherPublicKeyHex: unpacked.manifest.publisherPublicKey,
    appName: unpacked.manifest.name,
    identity: new Identity(provider),
  });
  await resourceClient.start();
  const consumerBle = await BleInterface.open(provider, {
    name: "ble-consumer",
    provider,
    pipe: consumerPipe,
    pipeMtu: 185,
  });
  resourceClient.node.registerInterface(consumerBle);

  const summary = buildAppAnnounceSummary(provider, publisherIdentity, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true,
  });
  await publisher.announce({ appData: encodeAppAnnounceData(summary) });

  await waitFor(
    () => (resourceClient.node.hasPath(publisher.hash) ? true : null),
    15_000,
  );

  const fetched = await resourceClient.fetchVersion(unpacked.manifest.version, {
    maxAttempts: 3,
    requestTimeoutMs: 15_000,
  });

  if (fetched.packageHash !== unpacked.packageHash) {
    throw new Error("simulated BLE resource fetch hash mismatch");
  }

  for (const link of publisher.activeLinks.slice()) {
    link.teardown();
  }

  await new Promise((resolve) => setTimeout(resolve, 300));

  await resourceClient.stop();
  await publisherBle.close();
  await consumerBle.close();
  await publisherNode.stop();
}

async function testResourceFetchRetryAfterDisconnect(
  provider,
  runtime,
  archive,
  unpacked,
  publisherIdentity,
) {
  const { left, right } = connectPeers(provider, runtime);
  const appParts = destinationParts(
    provider,
    unpacked.manifest.publisherPublicKey,
    unpacked.manifest.name,
  );

  const publisher = right.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: appParts.appName,
    aspects: appParts.aspects,
  });

  attachPackageResourceServer(publisher, {
    async listVersions() {
      return [
        {
          version: unpacked.manifest.version,
          packageHash: unpacked.packageHash,
          size: archive.length,
        },
      ];
    },
    async fetchArchive() {
      return archive;
    },
  });

  await publisher.announce();

  const consumerOut = left.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: appParts.appName,
    aspects: appParts.aspects,
  });

  let consumerLink = null;
  consumerOut.requestLink({
    linkEstablished(link) {
      consumerLink = link;
    },
  });

  const activeLink = await waitFor(() => consumerLink);
  const publisherLink = await waitFor(
    () =>
      publisher.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ??
      null,
  );
  publisherLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

  activeLink.close();
  publisherLink.close();

  let consumerLink2 = null;
  consumerOut.requestLink({
    linkEstablished(link) {
      consumerLink2 = link;
    },
  });

  const activeLink2 = await waitFor(() => consumerLink2);
  const publisherLink2 = await waitFor(
    () =>
      publisher.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ??
      null,
  );
  publisherLink2.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

  const fetchedArchive = await sendPackageResourceRequest(activeLink2, {
    type: "fetch",
    version: unpacked.manifest.version,
  });
  const verified = unpackPackage(provider, fetchedArchive);
  if (verified.packageHash !== unpacked.packageHash) {
    throw new Error("resource retry after disconnect hash mismatch");
  }

  activeLink2.close();
  publisherLink2.close();
  await stopNodes(left, right);
}

async function main() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const archivePath = resolve(fixtureDir, "tiny.tpkg");

  let archive;
  try {
    archive = new Uint8Array(readFileSync(archivePath));
  } catch {
    console.log(
      "dist-interop: skipped (run app-registry tests first to generate fixtures)",
    );
    return;
  }

  const meta = metaFromFixture();
  const unpacked = unpackPackage(provider, archive);
  const appData = hexToBytes(meta.appDataHex);
  const publisherIdentity = Identity.fromBytes(
    provider,
    hexToBytes(meta.publisherPrivateKey),
  );
  if (publisherIdentity === null) {
    throw new Error("invalid fixture publisher key");
  }

  const catalog = testCatalogBasics(provider, archive, unpacked, appData);
  await testCatalogPersistence(catalog, provider);
  await testDirectResourceFetch(
    provider,
    runtime,
    archive,
    unpacked,
    publisherIdentity,
  );
  await testTransportNodeCatalogAndResource(
    provider,
    runtime,
    archive,
    unpacked,
    publisherIdentity,
  );
  await testSimulatedBleResourceFetch(
    provider,
    runtime,
    archive,
    unpacked,
    publisherIdentity,
  );
  await testResourceFetchRetryAfterDisconnect(
    provider,
    runtime,
    archive,
    unpacked,
    publisherIdentity,
  );

  console.log(
    "dist-interop: catalog abuse, transport-node, simulated BLE, disconnect retry passed",
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
