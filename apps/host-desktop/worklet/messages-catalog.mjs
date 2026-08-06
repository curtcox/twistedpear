/**
 * Desktop host message handlers for the app catalog: installs, package
 * lifecycle, 256t fetches, and the publisher trust list.
 */
import { hexToBytes } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import {
  decodePublisherIdentity256t,
  encodePublisherIdentity256t,
  verifyPackage,
} from "../../../packages/app-registry/dist/index.js";
import {
  PackageResourceClient,
  assessFetchBudget,
  fetchPackage,
} from "../../../packages/bridge-hyper/dist/worklet.js";
import {
  HOST_API_VERSION,
  validateManifestCapabilities,
} from "../../../packages/miniapp-runtime/dist/worklet.js";

export function createCatalogMessageHandlers(deps) {
  const { state, provider, runtime, send, log, refuseStoreAction } = deps;
  const ensureCatalog = (...args) => deps.ensureCatalog(...args);
  const persistCatalogState = (...args) => deps.persistCatalogState(...args);
  const pushCatalog = (...args) => deps.pushCatalog(...args);
  const ensureTrustStore = (...args) => deps.ensureTrustStore(...args);
  const pushTrustList = (...args) => deps.pushTrustList(...args);
  const ensurePackageDriveManager = (...args) =>
    deps.ensurePackageDriveManager(...args);
  const resolveIdentity = (...args) => deps.resolveIdentity(...args);
  const installFromT256 = (...args) => deps.installFromT256(...args);

  const handleListCatalog = async (message) => {
    pushCatalog();
    return;
  };

  const handleInstallApp = async (message) => {
    if (refuseStoreAction("Catalog install")) {
      send({
        type: "install-progress",
        progress: {
          appId: message.appId,
          phase: "failed",
          bytesReceived: 0,
          totalBytes: 0,
          path: null,
          verified: false,
        },
      });
      return;
    }

    const { catalogStore: catalog, installedStore: installed } =
      ensureCatalog();
    const entry = catalog.get(message.appId);
    if (entry === null) {
      log(`Install failed: unknown app ${message.appId}`);
      return;
    }

    const interfaces = state.reticulum?.listInterfaces() ?? [];
    const budget = assessFetchBudget(entry, interfaces);
    if (!budget.allowed) {
      log(`Install blocked: ${budget.blockedReason}`);
      return;
    }

    if (budget.warning !== null) {
      log(budget.warning);
    }

    send({
      type: "install-progress",
      progress: {
        appId: entry.appId,
        phase: "starting",
        bytesReceived: 0,
        totalBytes: entry.packageSize,
        path: message.forcePath ?? null,
        verified: false,
      },
    });

    const installVerifiedPackage = async (archive, path) => {
      send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "verifying",
          bytesReceived: archive.length,
          totalBytes: archive.length,
          path,
          verified: false,
        },
      });

      const verified = verifyPackage(provider, archive, {
        hostApiVersion: HOST_API_VERSION,
        minVersion: installed.latestVersion(entry.appId) ?? undefined,
      });
      validateManifestCapabilities(verified.manifest.capabilities);
      const archivePath = `packages/${entry.appId}/${verified.manifest.version}.tpkg`;
      await runtime.store.set(archivePath, archive);
      installed.install(
        {
          appId: entry.appId,
          version: verified.manifest.version,
          packageHash: verified.packageHash,
          installedAt: Date.now(),
          manifest: verified.manifest,
          archivePath,
        },
        archive.length,
      );
      await persistCatalogState();
      send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "complete",
          bytesReceived: archive.length,
          totalBytes: archive.length,
          path,
          verified: true,
        },
      });
      pushCatalog();
      log(
        `Installed ${entry.name} v${verified.manifest.version} via ${path} (verified)`,
      );
    };

    try {
      if (message.archiveHex) {
        await installVerifiedPackage(
          hexToBytes(message.archiveHex),
          message.forcePath ?? "resource",
        );
        return;
      }

      const identity = await resolveIdentity();
      if (identity === null) {
        throw new Error("No harness identity available for fetch");
      }

      const driveManager = await ensurePackageDriveManager();
      let resourceClient = null;
      const publisherPublicKeyHex =
        entry.manifest?.publisherPublicKey ??
        (entry.publisherPublicKey.length === 128
          ? entry.publisherPublicKey
          : null);
      if (publisherPublicKeyHex !== null) {
        resourceClient = new PackageResourceClient({
          provider,
          runtime,
          publisherPublicKeyHex,
          appName: entry.name,
          identity,
        });
        await resourceClient.start();
      }

      const result = await fetchPackage(provider, {
        entry,
        version: entry.version,
        interfaces,
        driveManager,
        resourceClient: resourceClient ?? undefined,
        forcePath: message.forcePath,
        onProgress(progress) {
          send({
            type: "install-progress",
            progress: {
              appId: entry.appId,
              phase:
                progress.phase === "verifying"
                  ? "verifying"
                  : progress.phase === "complete"
                    ? "complete"
                    : "downloading",
              bytesReceived: progress.bytesReceived,
              totalBytes: progress.totalBytes,
              path: progress.path,
              verified: progress.phase === "complete",
            },
          });
        },
      });

      if (resourceClient !== null) {
        await resourceClient.stop();
      }

      await installVerifiedPackage(result.archiveBytes, result.path);
    } catch (error) {
      send({
        type: "install-progress",
        progress: {
          appId: entry.appId,
          phase: "failed",
          bytesReceived: 0,
          totalBytes: entry.packageSize,
          path: message.forcePath ?? null,
          verified: false,
        },
      });
      log(
        `Install failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return;
  };

  const handleDeletePackage = async (message) => {
    const { installedStore: installed } = ensureCatalog();
    installed.remove(message.appId, message.version, 0);
    void persistCatalogState();
    pushCatalog();
    return;
  };

  const handleRollbackPackage = async (message) => {
    const { installedStore: installed } = ensureCatalog();
    const rolledBack = installed.rollback(message.appId);
    if (rolledBack === null) {
      log(`Rollback failed: no previous version for ${message.appId}`);
      return;
    }

    void persistCatalogState();
    pushCatalog();
    log(`Rolled back ${message.appId} to v${rolledBack}`);
    return;
  };

  const handleInstallFrom256t = async (message) => {
    if (refuseStoreAction("Install from 256t")) {
      return;
    }

    try {
      const result = await installFromT256(message.t256.trim());
      send({ type: "install-256t-result", ok: true, ...result });
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      send({ type: "install-256t-result", ok: false, error: detail });
      log(`Install from 256t failed: ${detail}`);
    }
    return;
  };

  const handleTrustList = async (message) => {
    await pushTrustList();
    return;
  };

  const handleTrustAdd = async (message) => {
    try {
      const publisherPublicKey = decodePublisherIdentity256t(
        message.identityString,
      );
      await ensureTrustStore().add({
        publisherPublicKey,
        label: message.label ?? "Unnamed publisher",
        addedAt: Date.now(),
        source: message.source ?? "paste",
      });
      log(
        `Trusted publisher ${message.label ?? publisherPublicKey.slice(0, 16)}`,
      );
    } catch (error) {
      log(
        `Trust add failed: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    await pushTrustList();
    return;
  };

  const handleTrustRemove = async (message) => {
    await ensureTrustStore().remove(message.publisherPublicKey);
    log("Removed trusted publisher");
    await pushTrustList();
    return;
  };

  const handleTrustShow = async (message) => {
    const identity = await resolveIdentity();
    if (identity === null) {
      send({ type: "trust-identity", identity256t: null });
      return;
    }

    send({
      type: "trust-identity",
      identity256t: encodePublisherIdentity256t(identity.getPublicKey()),
    });
    return;
  };

  return {
    handlers: {
      "list-catalog": handleListCatalog,
      "list-installed": handleListCatalog,
      "install-app": handleInstallApp,
      "delete-package": handleDeletePackage,
      "rollback-package": handleRollbackPackage,
      "install-from-256t": handleInstallFrom256t,
      "trust-list": handleTrustList,
      "trust-add": handleTrustAdd,
      "trust-remove": handleTrustRemove,
      "trust-show": handleTrustShow,
    },
  };
}
