#!/usr/bin/env node
/**
 * Distribution interop smoke (Phase 3 M2/M3): catalog ingest + package verify.
 */

import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { CatalogStore, unpackPackage, decodeAppAnnounceData, encodeAppAnnounceData } from "../../packages/app-registry/dist/index.js";
import { Identity, NodeCryptoProvider, hexToBytes } from "../../packages/reticulum-ts/dist/index.js";

const fixtureDir = resolve(dirname(fileURLToPath(import.meta.url)), "../fixtures/packages");

async function main() {
  const provider = new NodeCryptoProvider();
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

  console.log("dist-interop: catalog ingest + persistence passed");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
