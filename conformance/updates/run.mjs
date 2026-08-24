#!/usr/bin/env node
/**
 * Update/rollback smoke (Phase 3 M8): OTA v1→v2, rollback, downgrade/key-swap rejection,
 * minHostApi gate, and concurrent seeder serving of both versions.
 */

import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CatalogStore,
  InstalledPackageStore,
  PackageError,
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  verifyPackage,
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
  nodeRuntime,
} from "../../packages/reticulum-ts/dist/index.js";
import { attachPackageResourceServer } from "../../packages/bridge-hyper/dist/index.js";
import {
  parseListResponse,
  sendPackageResourceRequest,
} from "../../packages/bridge-hyper/dist/resource-server.js";
import { decryptIdentityBackup } from "../../packages/host-core/dist/index.js";
import {
  runInit,
  runPublish,
  runUpdate,
} from "../../packages/cli/dist/commands/index.js";
import {
  listSeederArchives,
  loadSeederState,
  readSeederArchive,
} from "../../packages/cli/dist/seed/register.js";
import { stageExampleApp } from "../tools/stage-fixture-app.mjs";

const fixtureAppSource = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../fixtures/packages/example-app",
);
const IDENTITY_PASSPHRASE = "conformance identity passphrase";

async function sleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function waitFor(evaluate, timeoutMs = 10_000) {
  const started = Date.now();
  for (;;) {
    if (Date.now() - started >= timeoutMs) {
      throw new Error("waitFor timeout");
    }
    const value = await evaluate();
    if (value !== null && value !== undefined) {
      return value;
    }

    await sleep(50);
  }
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

function assertPackageError(fn, code) {
  try {
    fn();
    throw new Error(`expected ${code}`);
  } catch (error) {
    if (!(error instanceof PackageError) || error.code !== code) {
      throw error;
    }
  }
}

async function main() {
  const cwd = mkdtempSync(join(tmpdir(), "tp-updates-"));

  try {
    const seederStateDir = join(cwd, ".tp/seeder");
    writeFileSync(
      join(cwd, "tp.config.json"),
      `${JSON.stringify({ seederAddress: seederStateDir }, null, 2)}\n`,
    );

    const fixtureApp = stageExampleApp(cwd, fixtureAppSource);
    const initCode = await runInit({
      cwd,
      identityPassphrase: IDENTITY_PASSPHRASE,
      args: [],
    });
    if (initCode !== 0) {
      throw new Error("tp init failed");
    }

    const publishCode = await runPublish({ cwd, args: [fixtureApp] });
    if (publishCode !== 0) {
      throw new Error("tp publish v1 failed");
    }

    const provider = new NodeCryptoProvider();
    const v1Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v1 = unpackPackage(provider, v1Archive);
    const identity = decryptIdentityBackup(
      provider,
      new Uint8Array(readFileSync(join(cwd, ".tp/identity"))),
      IDENTITY_PASSPHRASE,
    );

    const catalog = new CatalogStore(provider);
    const v1Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v1.manifest,
      packageSize: v1Archive.length,
      packageHash: v1.packageHash,
      resourceAvailable: true,
    });
    const v1Entry = catalog.ingest({
      destinationHash: "updates-v1",
      appData: encodeAppAnnounceData(v1Summary),
      manifest: v1.manifest,
      packageHash: v1.packageHash,
    });
    if (v1Entry === null) {
      throw new Error("catalog did not accept v1 announce");
    }

    const installed = new InstalledPackageStore(64 * 1024 * 1024);
    installed.install(
      {
        appId: v1Entry.appId,
        version: v1.manifest.version,
        packageHash: v1.packageHash,
        installedAt: Date.now(),
        manifest: v1.manifest,
        archivePath: "v1.tpkg",
      },
      v1Archive.length,
    );

    const updateCode = await runUpdate({
      cwd,
      args: [fixtureApp, "--version", "2.0.0"],
    });
    if (updateCode !== 0) {
      throw new Error("tp update failed");
    }

    const v2Archive = new Uint8Array(readFileSync(join(cwd, ".tp/last.tpkg")));
    const v2 = unpackPackage(provider, v2Archive);
    if (v2.manifest.version !== "2.0.0") {
      throw new Error("expected v2 manifest");
    }

    const v2Summary = buildAppAnnounceSummary(provider, identity, {
      manifest: v2.manifest,
      packageSize: v2Archive.length,
      packageHash: v2.packageHash,
      resourceAvailable: true,
    });
    const entry = catalog.ingest({
      destinationHash: "updates",
      appData: encodeAppAnnounceData(v2Summary),
      manifest: v2.manifest,
      packageHash: v2.packageHash,
    });
    if (entry === null || entry.version !== "2.0.0") {
      throw new Error("catalog did not accept v2 announce");
    }

    verifyPackage(provider, v2Archive, {
      hostApiVersion: "0.1.0",
      minVersion: v1.manifest.version,
    });

    installed.install(
      {
        appId: entry.appId,
        version: v2.manifest.version,
        packageHash: v2.packageHash,
        installedAt: Date.now() + 1,
        manifest: v2.manifest,
        archivePath: "v2.tpkg",
      },
      v2Archive.length,
    );

    const rolled = installed.rollback(entry.appId);
    if (rolled !== v1.manifest.version) {
      throw new Error(`rollback expected v1, got ${rolled}`);
    }

    assertPackageError(
      () =>
        verifyPackage(provider, v1Archive, {
          minVersion: v2.manifest.version,
        }),
      "DOWNGRADE",
    );

    const other = new Identity(provider);
    assertPackageError(
      () =>
        verifyPackage(provider, v1Archive, {
          expectedPublisherKey: other.getPublicKey(),
        }),
      "WRONG_KEY",
    );

    assertPackageError(
      () =>
        verifyPackage(provider, v1Archive, {
          hostApiVersion: "0.0.1",
        }),
      "MIN_HOST_API",
    );

    const state = loadSeederState(seederStateDir);
    if (listSeederArchives(state).length < 2) {
      throw new Error(
        `seeder state expected 2 archives, got ${listSeederArchives(state).length}`,
      );
    }

    const { left, right } = await connectPeers(provider, nodeRuntime());
    const seederDestination = right.registerDestination({
      provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["seeder", "updates"],
    });

    attachPackageResourceServer(seederDestination, {
      async listVersions() {
        return listSeederArchives(loadSeederState(seederStateDir)).map(
          (archive) => ({
            version: archive.version,
            packageHash: archive.packageHash,
            size: archive.size,
          }),
        );
      },
      async fetchArchive(version) {
        return readSeederArchive(
          seederStateDir,
          loadSeederState(seederStateDir),
          version,
        );
      },
    });

    const consumerOut = left.registerDestination({
      provider,
      identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["seeder", "updates"],
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
        seederDestination.activeLinks.find(
          (link) => link.status === LinkStatus.ACTIVE,
        ) ?? null,
    );
    publisherLink.setResourceStrategy(LinkResourceStrategy.ACCEPT_ALL);

    const listBytes = await sendPackageResourceRequest(activeLink, {
      type: "list",
    });
    const versions = parseListResponse(listBytes);
    if (versions.length < 1) {
      throw new Error("seeder resource list empty");
    }

    const fetchedV1 = await sendPackageResourceRequest(activeLink, {
      type: "fetch",
      version: v1.manifest.version,
    });
    const fetchedV2 = await sendPackageResourceRequest(activeLink, {
      type: "fetch",
      version: v2.manifest.version,
    });

    const verifiedV1 = unpackPackage(provider, fetchedV1);
    const verifiedV2 = unpackPackage(provider, fetchedV2);
    if (
      verifiedV1.packageHash !== v1.packageHash ||
      verifiedV2.packageHash !== v2.packageHash
    ) {
      throw new Error("concurrent seeder fetch hash mismatch");
    }

    activeLink.close();
    publisherLink.close();
    left.stop();
    right.stop();

    console.log(
      "updates: OTA, rollback, rejection matrix, concurrent seeder passed",
    );
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
