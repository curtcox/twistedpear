#!/usr/bin/env node
/**
 * Publish v2 of the emulator fixture after v1 is installed (E4 OTA prep).
 */

import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
} from "../../packages/app-registry/dist/index.js";
import {
  DestinationDirection,
  DestinationType,
  NodeCryptoProvider,
  Reticulum,
  bytesToHex,
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";
import { attachPackageResourceServer } from "../../packages/bridge-hyper/dist/index.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import { runUpdate } from "../../packages/cli/dist/commands/index.js";

const labDir = dirname(fileURLToPath(import.meta.url));
const meta = JSON.parse(
  readFileSync(join(labDir, "fixture-meta.json"), "utf8"),
);
const LEAF_HOST = process.env.LEAF_ECHO_HOST ?? "127.0.0.1";
const LEAF_PORT = Number.parseInt(process.env.LEAF_ECHO_PORT ?? "4242", 10);
const IDENTITY_PASSPHRASE = "conformance identity passphrase";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function main() {
  const updateCode = await runUpdate({
    cwd: meta.publisherDir,
    identityPassphrase: IDENTITY_PASSPHRASE,
    args: [meta.fixtureApp, "--version", "1.0.1"],
  });
  if (updateCode !== 0) {
    throw new Error("tp update failed");
  }

  const provider = new NodeCryptoProvider();
  const publishMeta = JSON.parse(
    readFileSync(join(meta.publisherDir, ".tp/publish.json"), "utf8"),
  );
  const archive = new Uint8Array(
    readFileSync(join(meta.publisherDir, ".tp/last.tpkg")),
  );
  const unpacked = unpackPackage(provider, archive);
  const publisherIdentity = decryptIdentityBackup(
    provider,
    new Uint8Array(readFileSync(join(meta.publisherDir, ".tp/identity"))),
    IDENTITY_PASSPHRASE,
  );

  const summary = buildAppAnnounceSummary(provider, publisherIdentity, {
    manifest: unpacked.manifest,
    packageSize: archive.length,
    packageHash: unpacked.packageHash,
    resourceAvailable: true,
  });

  const publisherHash = bytesToHex(
    provider.sha256(publisherIdentity.getPublicKey()).slice(0, 8),
  );
  const nameHash = bytesToHex(
    provider
      .sha256(new TextEncoder().encode(unpacked.manifest.name))
      .slice(0, 8),
  );

  const reticulum = Reticulum.create({ provider, runtime: nodeRuntime() });
  reticulum.start();
  await reticulum.addTcpClientInterface({
    name: "leaf-echo-update",
    targetHost: LEAF_HOST,
    targetPort: LEAF_PORT,
    reconnectWaitMs: 1_000,
  });

  const publisherDestination = reticulum.registerDestination({
    provider,
    identity: publisherIdentity,
    direction: DestinationDirection.IN,
    type: DestinationType.SINGLE,
    appName: "tp",
    aspects: ["app", publisherHash, nameHash],
  });

  attachPackageResourceServer(publisherDestination, {
    async listVersions() {
      return [
        {
          version: publishMeta.version,
          packageHash: unpacked.packageHash,
          size: archive.length,
        },
      ];
    },
    async fetchArchive() {
      return archive;
    },
  });

  for (let index = 0; index < 6; index += 1) {
    await publisherDestination.announce();
    await sleep(1_000);
  }

  reticulum.stop();
  console.log(
    `android-emulator/publish-update: announced v${publishMeta.version}`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
