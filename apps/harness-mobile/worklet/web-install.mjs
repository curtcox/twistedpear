import { TrustStore, unpackPackage, verifyPackage } from "../../../packages/app-registry/dist/index.js";
import {
  T256_ID_LENGTH,
  decode256t,
  decodeCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../../../packages/cas-256t/dist/index.js";
import { describeCapability, validateManifestCapabilities } from "../../../packages/miniapp-runtime/dist/capabilities.js";
import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/confirm.js";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/dist/host-api.js";

/**
 * Phase W3: install from 256t (inline or Resource fetch) + publisher trust store.
 */
export function createWebInstallService(options) {
  const casLocators = new Map();
  const trustStore = new TrustStore(options.kvStore);

  function ingestCasLocatorAppData(appDataHex) {
    if (appDataHex === null || appDataHex.length === 0) {
      return;
    }

    try {
      const appData = hexToBytes(appDataHex);
      const locator = decodeCasLocator(appData);
      if (verifyCasLocator(options.provider, locator)) {
        casLocators.set(locator.t256, locator);
        options.log?.(`CAS locator: ${locator.appId} v${locator.version}`);
      }
    } catch {
      // Not a TPCL payload.
    }
  }

  function waitForCasLocator(t256, timeoutMs = 30_000) {
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let lastRequestedAt = startedAt;
      const poll = () => {
        const locator = casLocators.get(t256);
        if (locator !== undefined) {
          resolve(locator);
          return;
        }

        if (Date.now() - startedAt > timeoutMs) {
          reject(new Error("No locator announce received for that 256t id"));
          return;
        }

        if (Date.now() - lastRequestedAt >= 5_000) {
          lastRequestedAt = Date.now();
          void options.requestCasLocator?.(t256).catch((error) => {
            options.log?.(`CAS locator re-request failed: ${error instanceof Error ? error.message : String(error)}`);
          });
        }

        setTimeout(poll, 500);
      };
      poll();
    });
  }

  async function resolveArchiveBytes(t256, sendProgress) {
    let decoded;
    try {
      decoded = decode256t(t256.trim());
    } catch (error) {
      throw new Error(error instanceof Error ? error.message : "Invalid 256t id");
    }

    if (decoded.inline !== null) {
      return { archive: Uint8Array.from(decoded.inline), fetchPath: "inline" };
    }

    if (options.getHostSession === undefined) {
      throw new Error("Gateway link required to fetch package archive");
    }

    const hostSession = options.getHostSession();
    if (hostSession === null) {
      throw new Error("Gateway link is offline — enable WS gateway before installing");
    }

    if (!casLocators.has(t256)) {
      await options.requestCasLocator?.(t256);
    }
    const locator = await waitForCasLocator(t256);

    if (options.tryHyperdriveFetch !== undefined) {
      try {
        sendProgress?.({
          phase: "starting",
          bytesReceived: 0,
          totalBytes: locator.packageSize,
          path: "hyperdrive",
          verified: false
        });

        const hyperArchive = await options.tryHyperdriveFetch(locator);
        if (hyperArchive !== null) {
          if (!verify256t(t256, hyperArchive, (data) => options.provider.sha512(data))) {
            throw new Error("Hyperdrive archive does not match its 256t id");
          }

          sendProgress?.({
            phase: "complete",
            bytesReceived: hyperArchive.length,
            totalBytes: hyperArchive.length,
            path: "hyperdrive",
            verified: true
          });
          return { archive: hyperArchive, fetchPath: "hyperdrive" };
        }
      } catch (error) {
        options.log?.(
          `Hyperdrive fetch failed: ${error instanceof Error ? error.message : String(error)}`
        );
        sendProgress?.({
          phase: "failed",
          bytesReceived: 0,
          totalBytes: locator.packageSize,
          path: "hyperdrive",
          verified: false
        });
      }
    }

    sendProgress?.({
      phase: "starting",
      bytesReceived: 0,
      totalBytes: 0,
      path: "resource",
      verified: false
    });

    const result = await hostSession.fetchPlane.fetchPackage(options.provider, {
      entry: toCatalogEntryLike(locator),
      version: locator.version,
      onProgress: (progress) => {
        sendProgress?.({
          phase: progress.phase,
          bytesReceived: progress.bytesReceived,
          totalBytes: progress.totalBytes,
          path: progress.path,
          verified: false
        });
      }
    });

    const archive = result.archiveBytes;
    if (!verify256t(t256, archive, (data) => options.provider.sha512(data))) {
      throw new Error("Fetched archive does not match its 256t id");
    }

    return { archive, fetchPath: result.path ?? "resource" };
  }

  async function installFromT256(t256) {
    const normalized = t256.trim();
    if (normalized.length !== T256_ID_LENGTH) {
      throw new Error(`256t id must be ${T256_ID_LENGTH} characters`);
    }

    const storage = await options.ensurePackageStorage();
    let appId = "unknown";

    const sendProgress = (progress) => {
      options.send?.({
        type: "install-progress",
        progress: { appId, ...progress }
      });
    };

    try {
      const { archive, fetchPath } = await resolveArchiveBytes(normalized, sendProgress);
      appId = unpackPackage(options.provider, archive).manifest.name;
      sendProgress({
        phase: "verifying",
        bytesReceived: archive.length,
        totalBytes: archive.length,
        path: fetchPath === "inline" ? "resource" : fetchPath,
        verified: false
      });

      const minVersion = storage.activeVersion(appId) ?? undefined;
      const verified = verifyPackage(options.provider, archive, {
        hostApiVersion: HOST_API_VERSION,
        ...(minVersion === undefined ? {} : { minVersion })
      });
      const declared = validateManifestCapabilities(verified.manifest.capabilities);
      const trusted = await trustStore.isTrusted(verified.manifest.publisherPublicKey);
      const trustedEntry = trusted
        ? (await trustStore.list()).find(
            (entry) => entry.publisherPublicKey === verified.manifest.publisherPublicKey
          )
        : undefined;

      if (options.requestHostReply === undefined) {
        throw new Error("Install review requires host UI");
      }

      const review = await options.requestHostReply({
        type: "install-review",
        token: generateConfirmationToken((length) => options.provider.randomBytes(length)),
        appId,
        version: verified.manifest.version,
        publisherPublicKey: verified.manifest.publisherPublicKey,
        trusted,
        trustedLabel: trustedEntry?.label ?? null,
        capabilities: declared.map((id) => ({
          id,
          description: describeCapability(id),
          granted: false
        }))
      });

      if (review === null || review.accept !== true) {
        throw new Error("Install cancelled at capability review");
      }

      const installed = await storage.installArchive(archive);
      sendProgress({
        phase: "complete",
        bytesReceived: archive.length,
        totalBytes: archive.length,
        path: fetchPath === "inline" ? "resource" : fetchPath,
        verified: true
      });

      if (Array.isArray(review.grants) && review.grants.length > 0) {
        const host = options.miniappHost?.();
        if (host !== undefined) {
          await host.setGrants(
            appId,
            verified.manifest.publisherPublicKey,
            verified.manifest.capabilities,
            review.grants
          );
        }
      }

      options.pushInstalled?.();
      options.log?.(`Installed ${installed.appId} v${installed.version} from 256t via ${fetchPath} (trusted: ${trusted})`);
      return { appId: installed.appId, version: installed.version, trusted, fetchPath };
    } catch (error) {
      sendProgress({
        phase: "failed",
        bytesReceived: 0,
        totalBytes: 0,
        path: null,
        verified: false
      });
      throw error;
    }
  }

  return {
    trustStore,
    ingestCasLocatorAppData,
    installFromT256,
    async pushTrustList() {
      options.send?.({ type: "trust", entries: await trustStore.list() });
    }
  };
}

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}
