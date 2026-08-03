// @ts-nocheck
import { buildAppAnnounceSummary, encodeAppAnnounceData, unpackPackage } from "../../app-registry/dist/index.js";
import { attachPackageResourceServer } from "../../bridge-hyper/dist/worklet.js";
/* global TextEncoder */
import { casAnnounceAspects, encodeCasLocator, signCasLocator } from "../../cas-256t/dist/index.js";
import { DestinationDirection, DestinationType } from "../../reticulum-ts/dist/destination.js";
import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";

export function createPublishArchiveOps(deps) {
  async function publishArchiveAsIdentity(identity, { t256, archive }) {
    const unpacked = unpackPackage(deps.provider, archive);
    let keyHex = unpacked.manifest.driveKey;
    let driveManager = null;
    if (deps.nodeFallback) {
      if (keyHex === "0".repeat(64)) {
        keyHex = bytesToHex(deps.provider.sha256(archive));
      }
    } else {
      driveManager = await deps.ensurePackageDriveManager();
      if (keyHex === "0".repeat(64)) {
        const created = await driveManager.createDrive();
        keyHex = created.keyHex;
      } else {
        await driveManager.openDrive(keyHex);
      }
    }

    const published =
      driveManager === null
        ? { version: unpacked.manifest.version }
        : await driveManager.publishVersion(unpacked.manifest.version, archive, unpacked.packageHash);
    const node = await deps.ensureReticulum();
    const publisherHash = bytesToHex(deps.provider.sha256(identity.getPublicKey()).slice(0, 8));
    const nameHash = bytesToHex(
      deps.provider.sha256(new TextEncoder().encode(unpacked.manifest.name)).slice(0, 8)
    );
    const appDestination = node.registerDestination({
      provider: deps.provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: ["app", publisherHash, nameHash]
    });
    attachPackageResourceServer(appDestination, {
      async listVersions() {
        return driveManager === null ? [published.version] : driveManager.listVersions();
      },
      async fetchArchive(version) {
        if (driveManager === null) {
          if (version !== published.version) throw new Error(`Version not found: ${version}`);
          return archive;
        }
        return driveManager.fetchVersion(version);
      }
    });
    const summary = buildAppAnnounceSummary(deps.provider, identity, {
      manifest: unpacked.manifest,
      packageSize: archive.length,
      packageHash: unpacked.packageHash,
      resourceAvailable: true
    });
    await appDestination.announce({ appData: encodeAppAnnounceData(summary) });

    const locator = signCasLocator(identity, {
      t256,
      appId: unpacked.manifest.name,
      version: unpacked.manifest.version,
      driveKey: keyHex,
      packageHash: unpacked.packageHash,
      packageSize: archive.length
    });
    const casDestination = node.registerDestination({
      provider: deps.provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: "tp",
      aspects: casAnnounceAspects(t256)
    });
    deps.casResponseDestinations.set(t256, casDestination);
    deps.casLocators.set(t256, locator);
    await casDestination.announce({ appData: encodeCasLocator(locator) });
    deps.log(`Published ${unpacked.manifest.name} v${published.version}; 256t ${t256.slice(0, 16)}…`);
    return { t256, driveKey: keyHex, version: published.version };
  }

  async function publishArchiveFromWorklet({ t256, archive }) {
    const identity = await deps.resolveIdentity();
    if (identity === null) throw new Error("No publisher identity available");
    return publishArchiveAsIdentity(identity, { t256, archive });
  }

  return { publishArchiveAsIdentity, publishArchiveFromWorklet };
}
