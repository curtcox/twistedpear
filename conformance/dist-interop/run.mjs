#!/usr/bin/env node
/**
 * Distribution interop smoke (Phase 3 M2/M3): catalog ingest, announce abuse,
 * and Resource fetch over PipeInterface.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  unpackPackage
} from "../../packages/app-registry/dist/index.js";
import {
  DestinationDirection,
  DestinationType,
  Identity,
  LinkResourceStrategy,
  LinkStatus,
  NodeCryptoProvider,
  PipeInterface,
  Reticulum,
  hexToBytes,
  nodeRuntime
} from "../../packages/reticulum-ts/dist/index.js";
import { attachPackageResourceServer } from "../../packages/bridge-hyper/dist/index.js";
import { sendPackageResourceRequest, parseListResponse } from "../../packages/bridge-hyper/dist/resource-server.js";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages");

async function waitFor(evaluate, timeoutMs = 5000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const value = evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await new Promise((resolveWait) => setTimeout(resolveWait, 20));
  }

  throw new Error("waitFor timeout");
}

async function connectPeers(provider, runtime) {
  const left = Reticulum.create({ provider, runtime });
  const right = Reticulum.create({ provider, runtime });
  left.start();
  right.start();

  const [leftPipe, rightPipe] = PipeInterface.pair(provider);
  left.registerInterface(leftPipe);
  right.registerInterface(rightPipe);

  return { left, right };
}

async function main() {
  const provider = new NodeCryptoProvider();
  const runtime = nodeRuntime();
  const archivePath = resolve(fixtureDir, "tiny.tpkg");

  let archive;
  try {
    archive = new Uint8Array(readFileSync(archivePath));
  } catch {
    console.log("dist-interop: skipped (run app-registry tests first to generate fixtures)");
    return;
  }

  const meta = JSON.parse(readFileSync(resolve(fixtureDir, "tiny.meta.json"), "utf8"));
  const unpacked = unpackPackage(provider, archive);
  const appData = hexToBytes(meta.appDataHex);

  const catalog = new CatalogStore(provider);
  const entry = catalog.ingest({
    destinationHash: "deadbeef",
    appData,
    manifest: unpacked.manifest,
    packageHash: unpacked.packageHash
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
      packageHash: unpacked.packageHash
    }) !== null
  ) {
    throw new Error("tampered announce should be rejected");
  }

  const reloaded = new CatalogStore(provider);
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
    }
  };

  await catalog.save(kv);
  await reloaded.load(kv);

  if (reloaded.list().length !== 1) {
    throw new Error("catalog persistence failed");
  }

  const publisherIdentity = Identity.fromBytes(provider, hexToBytes(meta.publisherPrivateKey));
  if (publisherIdentity === null) {
    throw new Error("invalid fixture publisher key");
  }

  const { left, right } = await connectPeers(provider, runtime);
  const publisher = right.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", "fixture", "tiny"]
  });

  attachPackageResourceServer(publisher, {
    async listVersions() {
      return [{ version: unpacked.manifest.version, packageHash: unpacked.packageHash, size: archive.length }];
    },
    async fetchArchive() {
      return archive;
    }
  });

  await publisher.announce();

  const consumerIdentity = new Identity(provider);
  const consumerOut = left.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", "fixture", "tiny"]
  });

  let consumerLink = null;
  consumerOut.requestLink({
    linkEstablished(link) {
      consumerLink = link;
    }
  });

  const activeLink = await waitFor(() => consumerLink);
  const publisherLink = await waitFor(
    () => publisher.activeLinks.find((link) => link.status === LinkStatus.ACTIVE) ?? null
  );
  publisherLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

  const listBytes = await sendPackageResourceRequest(activeLink, { type: "list" });
  const versions = parseListResponse(listBytes);
  if (versions.length !== 1 || versions[0].packageHash !== unpacked.packageHash) {
    throw new Error("resource list response mismatch");
  }

  const fetchedArchive = await sendPackageResourceRequest(activeLink, {
    type: "fetch",
    version: unpacked.manifest.version
  });
  const resourceVerified = unpackPackage(provider, fetchedArchive);
  if (resourceVerified.packageHash !== unpacked.packageHash) {
    throw new Error("resource fetch hash mismatch");
  }

  activeLink.close();
  publisherLink.close();
  left.stop();
  right.stop();
  console.log("dist-interop: catalog + resource fetch passed");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
