/* global TextEncoder */
import {
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
} from "../../../packages/app-registry/dist/index.js";
import {
  casAnnounceAspects,
  decodeCasLocatorRequest,
  encodeCasLocator,
  signCasLocator,
} from "../../../packages/cas-256t/dist/index.js";
import { attachPackageResourceServer } from "@twistedpear/bridge-hyper/resource-server";
import {
  DestinationDirection,
  DestinationProofStrategy,
  DestinationType,
  bytesToHex,
} from "../../../packages/reticulum-ts/dist/web.js";

/**
 * Phase W3: publish signed packages from the browser leaf through the WS gateway
 * (Resource path only — no Hyperdrive on web).
 */
export function createWebPublishService(options = {}) {
  /** @type {Map<string, { version: string; packageHash: string; archive: Uint8Array }>} */
  const publishedByApp = new Map();
  /** @type {Map<string, import("@twistedpear/reticulum-ts").RegisteredDestination>} */
  const appDestinations = new Map();
  const locators = new Map();
  const casDestinations = new Map();

  function appKey(publisherPublicKeyHex, appName) {
    return `${publisherPublicKeyHex}:${appName}`;
  }

  return {
    async respondToLocatorRequest(session, appData) {
      let t256;
      try {
        t256 = decodeCasLocatorRequest(appData);
      } catch {
        return false;
      }
      const locator = locators.get(t256);
      const destination = casDestinations.get(t256);
      if (
        locator === undefined ||
        destination === undefined ||
        session === null
      ) {
        return false;
      }
      await destination.announce({ appData: encodeCasLocator(locator) });
      options.log?.(`Re-announced CAS locator for ${t256.slice(0, 16)}…`);
      return true;
    },
    async publish(session, { t256, archive }) {
      if (session === null) {
        throw new Error(
          "Gateway link is offline — enable WS gateway before publishing",
        );
      }

      const provider = options.provider;
      if (provider === undefined) {
        throw new Error("Crypto provider is not configured for publish");
      }

      const { reticulum, identity } = session;
      const unpacked = unpackPackage(provider, archive);
      const manifest = unpacked.manifest;
      const key = appKey(bytesToHex(identity.getPublicKey()), manifest.name);

      publishedByApp.set(key, {
        version: manifest.version,
        packageHash: unpacked.packageHash,
        archive,
      });

      let destination = appDestinations.get(key);
      if (destination === undefined) {
        const publisherHash = bytesToHex(
          provider.sha256(identity.getPublicKey()).slice(0, 8),
        );
        const nameHash = bytesToHex(
          provider.sha256(new TextEncoder().encode(manifest.name)).slice(0, 8),
        );
        destination = reticulum.registerDestination({
          provider,
          identity,
          direction: DestinationDirection.IN,
          type: DestinationType.SINGLE,
          appName: "tp",
          aspects: ["app", publisherHash, nameHash],
        });
        destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
        attachPackageResourceServer(destination, {
          async listVersions() {
            const published = publishedByApp.get(key);
            if (published === undefined) {
              return [];
            }

            return [
              {
                version: published.version,
                packageHash: published.packageHash,
                size: published.archive.length,
              },
            ];
          },
          async fetchArchive(version) {
            const published = publishedByApp.get(key);
            if (published === undefined || published.version !== version) {
              throw new Error(`Version not found: ${version}`);
            }

            return published.archive;
          },
        });
        appDestinations.set(key, destination);
      }

      const summary = buildAppAnnounceSummary(provider, identity, {
        manifest,
        packageSize: archive.length,
        packageHash: unpacked.packageHash,
        resourceAvailable: true,
      });
      await destination.announce({ appData: encodeAppAnnounceData(summary) });

      const locator = signCasLocator(identity, {
        t256,
        appId: manifest.name,
        version: manifest.version,
        driveKey: "0".repeat(64),
        packageHash: unpacked.packageHash,
        packageSize: archive.length,
      });
      const casDestination = reticulum.registerDestination({
        provider,
        identity,
        direction: DestinationDirection.IN,
        type: DestinationType.SINGLE,
        appName: "tp",
        aspects: casAnnounceAspects(t256),
      });
      locators.set(t256, locator);
      casDestinations.set(t256, casDestination);
      await casDestination.announce({ appData: encodeCasLocator(locator) });

      options.onCasLocator?.(locator);
      options.log?.(
        `Published ${manifest.name} v${manifest.version}; 256t ${t256.slice(0, 16)}…`,
      );
      return { t256, driveKey: "0".repeat(64), version: manifest.version };
    },
  };
}
