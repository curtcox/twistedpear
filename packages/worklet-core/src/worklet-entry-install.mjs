import {
  capabilityScopeLabel,
  parseCapabilityDeclarations,
} from "../../app-registry/dist/index.js";
import { toCatalogEntryLike, verify256t } from "../../cas-256t/dist/index.js";
import {
  PackageResourceClient,
  fetchPackage,
} from "../../bridge-hyper/dist/worklet.js";
import { validateManifestCapabilities } from "../../miniapp-runtime/dist/worklet.js";
import { describeCapability } from "../../miniapp-runtime/dist/capabilities.js";
import { riskClassForCapabilityId } from "./capability-review.mjs";
import { confirmInstallReview } from "./install-review.mjs";

export function createInstallFromT256(deps) {
  return async function installFromT256(t256) {
    const cas = deps.ensureEntryCasStore();
    let archive = await cas.get(t256).catch(() => null);
    let fetchedFrom = "local-cas";
    let resolvedLocator = null;

    if (archive === null) {
      const locator = await deps.waitForCasLocator(t256);
      resolvedLocator = locator;
      const identity = await deps.resolveIdentity();
      if (identity === null)
        throw new Error("No host identity available for fetch");
      const node = await deps.ensureReticulum();
      const driveManager = deps.nodeFallback
        ? undefined
        : await deps.ensurePackageDriveManager();
      const resourceClient = new PackageResourceClient({
        provider: deps.provider,
        runtime: deps.runtime,
        publisherPublicKeyHex: locator.publisherPublicKey,
        servingPublicKeyHex: locator.servingPublicKey,
        appName: locator.appId,
        identity,
        reticulum: node,
      });
      await resourceClient.start();
      try {
        const result = await fetchPackage(deps.provider, {
          entry: toCatalogEntryLike(locator),
          version: locator.version,
          interfaces: deps.getReticulum()?.listInterfaces() ?? [],
          driveManager,
          resourceClient,
          ...(deps.nodeFallback ? { forcePath: "resource" } : {}),
        });
        archive = result.archiveBytes;
        fetchedFrom = result.path ?? "resource";
      } finally {
        await resourceClient.stop();
      }
      if (!verify256t(t256, archive, (data) => deps.provider.sha512(data))) {
        throw new Error("Fetched archive does not match its 256t id");
      }
      await cas.put(archive);
    }

    const { installedStore: installed } = deps.ensureCatalog();
    const { appId, verified, trusted, review } = await confirmInstallReview({
      provider: deps.provider,
      archive,
      minVersionFor: (id) => installed.latestVersion(id) ?? undefined,
      trustStore: deps.ensureTrustStore(),
      requestHostReply: deps.requestHostReply,
      capabilitiesForReview: (verifiedManifest) => {
        const declarations = parseCapabilityDeclarations(
          verifiedManifest.manifest.capabilities,
          verifiedManifest.manifest.formatVersion ?? 1,
        );
        validateManifestCapabilities(declarations);
        return declarations.map((declaration) => ({
          id: declaration.id,
          description: describeCapability(declaration.id),
          granted: false,
          optional: declaration.optional,
          scope: declaration.scope,
          scopeLabel: capabilityScopeLabel(declaration.scope),
          riskClass: riskClassForCapabilityId(declaration.id),
        }));
      },
    });

    const archivePath = `packages/${appId}/${verified.manifest.version}.tpkg`;
    await deps.runtime.store.set(archivePath, archive);
    installed.install(
      {
        appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath,
      },
      archive.length,
    );
    await deps.persistCatalogState();
    if (Array.isArray(review.grants) && review.grants.length > 0) {
      await deps
        .ensureMiniappHost()
        .setGrants(
          appId,
          verified.manifest.publisherPublicKey,
          verified.manifest.capabilities,
          review.grants,
        );
    }
    deps.pushCatalog();
    deps.log(
      deps.installLogMessage?.(
        appId,
        verified.manifest.version,
        fetchedFrom,
        trusted,
      ) ??
        `Installed ${appId} v${verified.manifest.version} from 256t via ${fetchedFrom}`,
    );
    return {
      appId,
      version: verified.manifest.version,
      trusted,
      source: fetchedFrom,
      publisherPublicKey: verified.manifest.publisherPublicKey,
      servingPublicKey: resolvedLocator?.servingPublicKey ?? null,
    };
  };
}
