import { TrustStore } from "../../app-registry/dist/index.js";
import {
  buildAppAnnounceSummary,
  CatalogStore,
  encodeAppAnnounceData,
  InstalledPackageStore,
  unpackPackage,
  verifyPackage
} from "../../app-registry/dist/index.js";
import {
  CasStore,
  casAnnounceAspects,
  casRequestAspects,
  decodeCasLocator,
  decodeCasLocatorRequest,
  encodeCasLocator,
  encodeCasLocatorRequest,
  signCasLocator,
  toCatalogEntryLike,
  verify256t,
  verifyCasLocator
} from "../../cas-256t/dist/index.js";
import {
  assessFetchBudget,
  attachPackageResourceServer,
  fetchPackage,
  PackageResourceClient
} from "../../bridge-hyper/dist/worklet.js";
import { generateConfirmationToken, validateManifestCapabilities } from "../../miniapp-runtime/dist/worklet.js";
import { HOST_API_VERSION } from "../../miniapp-runtime/dist/worklet.js";
import { bytesToHex, hexToBytes } from "../../reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../reticulum-ts/dist/identity.js";
import { DestinationProofStrategy } from "../../reticulum-ts/dist/registered-destination.js";
import { decodePeerInvitation } from "../../protocol/dist/index.js";
import { AutoInterfaceBridge } from "../../reticulum-interfaces/dist/auto-bridge.js";
import { AUTO_DEFAULT_DATA_PORT } from "../../reticulum-interfaces/dist/auto-common.js";
import { selectDiscoveryProviders } from "../../reticulum-interfaces/dist/auto-discovery.js";

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function catalogEntryView(entry) {
  return {
    appId: entry.appId,
    name: entry.name,
    version: entry.version,
    publisherPublicKey: entry.publisherPublicKey,
    packageSize: entry.packageSize,
    packageHash: entry.packageHash,
    driveKey: entry.driveKey,
    resourceAvailable: entry.resourceAvailable,
    receivedAt: entry.receivedAt
  };
}

export function peerServiceAspect(provider, service) {
  return bytesToHex(provider.sha256(new TextEncoder().encode(service)).subarray(0, 16));
}

export function createRuntimeKeyValueStore(runtime, runtimeStoreKeys) {
  return {
    async get(key) {
      const value = await runtime.store.get(key);
      return value === undefined ? null : value;
    },
    async set(key, value) {
      runtimeStoreKeys.add(key);
      await runtime.store.set(key, value);
    },
    async delete(key) {
      runtimeStoreKeys.delete(key);
      await runtime.store.delete(key);
    },
    async list(prefix = "") {
      return [...runtimeStoreKeys].filter((key) => key.startsWith(prefix));
    }
  };
}

export function createPeerSessionManagerProxy(ensurePeerSessionManager) {
  return {
    async request(appId, runtimeId, request) {
      return (await ensurePeerSessionManager()).request(appId, runtimeId, request);
    },
    async listen(appId, runtimeId, request) {
      return (await ensurePeerSessionManager()).listen(appId, runtimeId, request);
    },
    async diagnostics() {
      return (await ensurePeerSessionManager()).diagnostics();
    },
    list(appId) {
      return ensurePeerSessionManager.peek?.() ?? [];
    },
    route(appId, handle) {
      const manager = ensurePeerSessionManager.peek?.();
      return manager?.route(appId, handle);
    },
    info(appId, runtimeId, handle) {
      const manager = ensurePeerSessionManager.peek?.();
      if (manager === null || manager === undefined) throw new Error("Unknown peer handle");
      return manager.info(appId, runtimeId, handle);
    },
    async close(appId, runtimeId, handle) {
      const manager = ensurePeerSessionManager.peek?.();
      if (manager !== null && manager !== undefined) await manager.close(appId, runtimeId, handle);
    },
    async closeRuntime(appId, runtimeId) {
      const manager = ensurePeerSessionManager.peek?.();
      if (manager !== null && manager !== undefined) await manager.closeRuntime(appId, runtimeId);
    }
  };
}

/** @param {{ getManager: () => import("../../peer-discovery/dist/index.js").PeerSessionManager | null, ensurePeerSessionManager: () => Promise<import("../../peer-discovery/dist/index.js").PeerSessionManager> }} deps */
export function createPeerSessionManagerProxyFromState(deps) {
  return {
    async request(appId, runtimeId, request) {
      return (await deps.ensurePeerSessionManager()).request(appId, runtimeId, request);
    },
    async listen(appId, runtimeId, request) {
      return (await deps.ensurePeerSessionManager()).listen(appId, runtimeId, request);
    },
    async diagnostics() {
      return (await deps.ensurePeerSessionManager()).diagnostics();
    },
    list(appId) {
      return deps.getManager()?.list(appId) ?? [];
    },
    route(appId, handle) {
      return deps.getManager()?.route(appId, handle);
    },
    info(appId, runtimeId, handle) {
      const manager = deps.getManager();
      if (manager === null) throw new Error("Unknown peer handle");
      return manager.info(appId, runtimeId, handle);
    },
    async close(appId, runtimeId, handle) {
      const manager = deps.getManager();
      if (manager !== null) await manager.close(appId, runtimeId, handle);
    },
    async closeRuntime(appId, runtimeId) {
      const manager = deps.getManager();
      if (manager !== null) await manager.closeRuntime(appId, runtimeId);
    }
  };
}

export function createCasLocatorOps(deps) {
  let entryCasStore = null;

  function ensureEntryCasStore() {
    if (entryCasStore === null) {
      entryCasStore = new CasStore(deps.runtimeKeyValueStore(), (data) => deps.provider.sha512(data));
    }
    return entryCasStore;
  }

  function ingestCasLocator(appData) {
    try {
      const locator = decodeCasLocator(appData);
      if (verifyCasLocator(deps.provider, locator)) {
        deps.casLocators.set(locator.t256, locator);
        deps.log(`CAS locator: ${locator.appId} v${locator.version}`);
      }
    } catch {
      // Not a TPCL locator payload.
    }
  }

  async function announceCasLocatorRequest(t256) {
    const node = await deps.ensureReticulum();
    const identity = await deps.resolveIdentity();
    if (identity === null) throw new Error("No host identity available for locator request");
    let destination = deps.casRequestDestinations.get(t256);
    if (destination === undefined) {
      destination = node.registerDestination({
        provider: deps.provider,
        identity,
        direction: deps.DestinationDirection.IN,
        type: deps.DestinationType.SINGLE,
        appName: "tp",
        aspects: casRequestAspects(t256)
      });
      deps.casRequestDestinations.set(t256, destination);
    }
    await destination.announce({ appData: encodeCasLocatorRequest(t256) });
    deps.log(`Requested CAS locator for ${t256.slice(0, 16)}…`);
  }

  async function respondToCasLocatorRequest(appData) {
    let t256;
    try {
      t256 = decodeCasLocatorRequest(appData);
    } catch {
      return;
    }
    const locator = deps.casLocators.get(t256);
    const reticulum = deps.getReticulum();
    if (locator === undefined || reticulum === null) return;
    const identity = await deps.resolveIdentity();
    if (identity === null) return;
    let destination = deps.casResponseDestinations.get(t256);
    if (destination === undefined) {
      destination = reticulum.registerDestination({
        provider: deps.provider,
        identity,
        direction: deps.DestinationDirection.IN,
        type: deps.DestinationType.SINGLE,
        appName: "tp",
        aspects: casAnnounceAspects(t256)
      });
      deps.casResponseDestinations.set(t256, destination);
    }
    await destination.announce({ appData: encodeCasLocator(locator) });
    deps.logReannounce?.(t256);
  }

  async function waitForCasLocator(t256, timeoutMs = 30_000) {
    if (!deps.casLocators.has(t256)) await announceCasLocatorRequest(t256);
    return new Promise((resolve, reject) => {
      const startedAt = Date.now();
      let lastRequestedAt = startedAt;
      const poll = () => {
        const locator = deps.casLocators.get(t256);
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
          void announceCasLocatorRequest(t256).catch((error) => {
            deps.log?.(`CAS locator re-request failed: ${error instanceof Error ? error.message : String(error)}`);
          });
        }
        setTimeout(poll, 500);
      };
      poll();
    });
  }

  return {
    ensureEntryCasStore,
    ingestCasLocator,
    announceCasLocatorRequest,
    respondToCasLocatorRequest,
    waitForCasLocator
  };
}

export function createTrustStoreOps(deps) {
  let trustStore = null;

  function ensureTrustStore() {
    if (trustStore === null) {
      trustStore = new TrustStore(deps.runtimeKeyValueStore());
    }
    return trustStore;
  }

  async function pushTrustList() {
    deps.send({ type: "trust", entries: await ensureTrustStore().list() });
  }

  return { ensureTrustStore, pushTrustList };
}

export function createCatalogOps(deps) {
  let catalogStore = null;
  let installedStore = null;

  function ensureCatalog() {
    if (catalogStore === null) {
      catalogStore = new CatalogStore(deps.provider);
    }
    if (installedStore === null) {
      installedStore = new InstalledPackageStore(deps.packageQuotaBytes);
    }
    return { catalogStore, installedStore };
  }

  async function persistCatalogState() {
    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    const kv = deps.runtimeKeyValueStore();
    await catalog.save(kv);
    await installed.save(kv);
  }

  async function loadCatalogState() {
    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    const kv = deps.runtimeKeyValueStore();
    await catalog.load(kv);
    await installed.load(kv);
  }

  function pushCatalog() {
    const { catalogStore: catalog, installedStore: installed } = ensureCatalog();
    deps.status.catalogEntries = catalog.list().length;
    deps.status.installedPackages = installed.list().length;
    deps.status.storageUsedBytes = installed.usedBytes;
    deps.pushStatus();
    deps.send({ type: "catalog", entries: catalog.list().map(catalogEntryView) });
    deps.send({
      type: "installed",
      packages: [...new Set(installed.list().map((record) => record.appId))].map((appId) => {
        const active = installed.activeVersion(appId);
        const record = active === null ? null : installed.get(appId, active);
        const previous = installed.previousVersion(appId);
        return {
          appId,
          version: record?.version ?? active ?? "",
          activeVersion: active ?? "",
          packageHash: record?.packageHash ?? "",
          installedAt: record?.installedAt ?? 0,
          rollbackAvailable: previous !== null && active !== null && active !== previous,
          capabilities: record?.manifest.capabilities ?? [],
          publisherPublicKey: record?.manifest.publisherPublicKey ?? ""
        };
      })
    });
  }

  return {
    ensureCatalog,
    persistCatalogState,
    loadCatalogState,
    pushCatalog
  };
}

export function createAutomaticReticulumDiscovery(deps) {
  function receiveAutomaticAnswer(data) {
    try {
      const invitation = decodePeerInvitation(data, Date.now());
      if (invitation.role !== "answer") return;
      const key = bytesToHex(invitation.sessionId);
      const waiter = deps.automaticAnswerWaiters.get(key);
      if (waiter === undefined) return;
      deps.automaticAnswerWaiters.delete(key);
      deps.automaticOfferKeys.delete(waiter.adapterSessionId);
      waiter.resolve(data);
    } catch {
      // Ignore unauthenticated or malformed link payloads.
    }
  }

  async function ensurePeerLinkDestination(identity, service) {
    const node = await deps.ensureReticulum();
    const aspect = peerServiceAspect(deps.provider, service);
    let destination = deps.peerLinkDestinations.get(aspect);
    if (destination === undefined) {
      destination = node.registerDestination({
        provider: deps.provider,
        identity,
        direction: deps.DestinationDirection.IN,
        type: deps.DestinationType.SINGLE,
        appName: "tp",
        aspects: ["peer", aspect]
      });
      destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);
      destination.setLinkEstablishedCallback((link) => {
        const existing = link.callbacks.packet;
        link.callbacks.packet = (data, packet) => {
          receiveAutomaticAnswer(data);
          existing?.(data, packet);
        };
      });
      deps.peerLinkDestinations.set(aspect, destination);
    }
    return destination;
  }

  async function ensureAutomaticDiscoveryListener(service, identity) {
    const node = await deps.ensureReticulum();
    const aspect = peerServiceAspect(deps.provider, service);
    if (deps.automaticDiscoveryHandlers.has(aspect)) return aspect;
    node.registerAnnounceHandler({
      aspectFilter: `tp.peer-discovery.${aspect}`,
      receivedAnnounce(info) {
        if (info.appData === null || bytesToHex(info.announcedIdentity.hash) === bytesToHex(identity.hash)) return;
        try {
          const offer = decodePeerInvitation(info.appData, Date.now());
          if (offer.role !== "offer" || offer.service !== service) return;
          const session = { id: `auto:${bytesToHex(offer.sessionId)}`, kind: "reticulum" };
          const inbound = { session, envelope: info.appData };
          deps.automaticInboundRoutes.set(session.id, offer);
          const waiters = deps.automaticInboundWaiters.get(aspect) ?? [];
          const waiter = waiters.shift();
          if (waiter !== undefined) waiter(inbound);
          else {
            const bucket = deps.automaticInboundBuckets.get(aspect) ?? [];
            bucket.push(inbound);
            deps.automaticInboundBuckets.set(aspect, bucket.slice(-32));
          }
          deps.automaticInboundWaiters.set(aspect, waiters);
        } catch {
          // Hostile announce data is discarded before pairing.
        }
      }
    });
    deps.automaticDiscoveryHandlers.add(aspect);
    return aspect;
  }

  function automaticReticulumChannel(identity) {
    return {
      async availability() {
        return deps.getReticulum() !== null && deps.status.onlineInterfaces > 0
          ? { state: "available", reason: "Reticulum announce and Link signaling are online" }
          : { state: "offline", reason: "No online Reticulum interface is available for automatic discovery" };
      },
      async *offer(session, envelope) {
        const node = await deps.ensureReticulum();
        const invitation = decodePeerInvitation(envelope, Date.now());
        const key = bytesToHex(invitation.sessionId);
        deps.automaticOfferKeys.set(session.id, key);
        const answer = new Promise((resolve, reject) =>
          deps.automaticAnswerWaiters.set(key, { resolve, reject, adapterSessionId: session.id })
        );
        const aspect = peerServiceAspect(deps.provider, invitation.service);
        let destination = deps.automaticDiscoveryDestinations.get(aspect);
        if (destination === undefined) {
          destination = node.registerDestination({
            provider: deps.provider,
            identity,
            direction: deps.DestinationDirection.IN,
            type: deps.DestinationType.SINGLE,
            appName: "tp",
            aspects: ["peer-discovery", aspect]
          });
          deps.automaticDiscoveryDestinations.set(aspect, destination);
        }
        await destination.announce({ appData: envelope });
        yield await answer;
      },
      async *listen(options) {
        const aspect = await ensureAutomaticDiscoveryListener(options.service, identity);
        const bucket = deps.automaticInboundBuckets.get(aspect) ?? [];
        const immediate = bucket.shift();
        deps.automaticInboundBuckets.set(aspect, bucket);
        if (immediate !== undefined) {
          yield immediate;
          return;
        }
        yield await new Promise((resolve) => {
          const waiters = deps.automaticInboundWaiters.get(aspect) ?? [];
          waiters.push(resolve);
          deps.automaticInboundWaiters.set(aspect, waiters);
        });
      },
      async answer(session, envelope) {
        const offer = deps.automaticInboundRoutes.get(session.id);
        deps.automaticInboundRoutes.delete(session.id);
        const candidate = offer?.candidates.find((entry) => entry.kind === "reticulum");
        const remoteIdentity =
          offer?.identityProof === undefined ? null : Identity.fromPublicKey(deps.provider, offer.identityProof);
        if (offer === undefined || candidate === undefined || remoteIdentity === null) {
          throw new Error("Automatic Reticulum offer has no authenticated return destination");
        }
        const node = await deps.ensureReticulum();
        const outbound = node.registerDestination({
          provider: deps.provider,
          identity: remoteIdentity,
          direction: deps.DestinationDirection.OUT,
          type: deps.DestinationType.SINGLE,
          appName: "tp",
          aspects: ["peer", peerServiceAspect(deps.provider, offer.service)]
        });
        if (bytesToHex(outbound.hash) !== bytesToHex(candidate.value)) {
          throw new Error("Automatic Reticulum return destination does not match the signed offer");
        }
        if (!node.hasPath(outbound.hash)) {
          node.requestPath(outbound.hash);
          if (!(await node.awaitPath(outbound.hash, 15))) {
            throw new Error("No Reticulum path for automatic discovery answer");
          }
        }
        const link = await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error("Automatic Reticulum answer link timed out")), 30_000);
          outbound.requestLink({
            linkEstablished(established) {
              clearTimeout(timer);
              resolve(established);
            },
            linkClosed() {
              clearTimeout(timer);
              reject(new Error("Automatic Reticulum answer link closed"));
            }
          });
        });
        await link.send(envelope);
        setTimeout(() => {
          void link.teardown();
        }, 1_000);
      },
      async cancel(sessionId) {
        deps.automaticInboundRoutes.delete(sessionId);
        const key = deps.automaticOfferKeys.get(sessionId);
        if (key !== undefined) {
          deps.automaticOfferKeys.delete(sessionId);
          const waiter = deps.automaticAnswerWaiters.get(key);
          deps.automaticAnswerWaiters.delete(key);
          waiter?.reject(new Error("Automatic Reticulum discovery cancelled"));
        }
      }
    };
  }

  return {
    receiveAutomaticAnswer,
    ensurePeerLinkDestination,
    ensureAutomaticDiscoveryListener,
    automaticReticulumChannel
  };
}

export function createRegisterAnnounceHandler(deps) {
  return function registerAnnounceHandler() {
    const reticulum = deps.getReticulum();
    if (reticulum === null) return;

    reticulum.registerAnnounceHandler({
      receivedAnnounce(info) {
        deps.status.announcesSeen += 1;
        deps.pushStatus();
        deps.send({
          type: "announce",
          entry: {
            destinationHash: bytesToHex(info.destinationHash),
            hops: info.packet.hops,
            receivedAt: Date.now(),
            appDataHex: info.appData === null ? null : bytesToHex(info.appData)
          }
        });

        if (info.appData !== null) {
          deps.ingestCasLocator(info.appData);
          void deps.respondToCasLocatorRequest(info.appData).catch((error) => {
            deps.log(`CAS locator response failed: ${error instanceof Error ? error.message : String(error)}`);
          });
          const { catalogStore: catalog } = deps.ensureCatalog();
          const ingested = catalog.ingest({
            destinationHash: bytesToHex(info.destinationHash),
            appData: info.appData
          });
          if (ingested !== null) {
            deps.log(`Catalog: ${ingested.name} v${ingested.version}`);
            void deps.persistCatalogState();
            deps.pushCatalog();
          }
        }
      }
    });
  };
}

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
      if (identity === null) throw new Error("No host identity available for fetch");
      const node = await deps.ensureReticulum();
      const driveManager = deps.nodeFallback ? undefined : await deps.ensurePackageDriveManager();
      const resourceClient = new PackageResourceClient({
        provider: deps.provider,
        runtime: deps.runtime,
        publisherPublicKeyHex: locator.publisherPublicKey,
        servingPublicKeyHex: locator.servingPublicKey,
        appName: locator.appId,
        identity,
        reticulum: node
      });
      await resourceClient.start();
      try {
        const result = await fetchPackage(deps.provider, {
          entry: toCatalogEntryLike(locator),
          version: locator.version,
          interfaces: deps.getReticulum()?.listInterfaces() ?? [],
          driveManager,
          resourceClient,
          ...(deps.nodeFallback ? { forcePath: "resource" } : {})
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
    const appId = unpackPackage(deps.provider, archive).manifest.name;
    const verified = verifyPackage(deps.provider, archive, {
      hostApiVersion: HOST_API_VERSION,
      minVersion: installed.latestVersion(appId) ?? undefined
    });
    const declared = validateManifestCapabilities(verified.manifest.capabilities);
    const trusted = await deps.ensureTrustStore().isTrusted(verified.manifest.publisherPublicKey);
    const trustedEntry = trusted
      ? (await deps.ensureTrustStore().list()).find(
          (entry) => entry.publisherPublicKey === verified.manifest.publisherPublicKey
        )
      : undefined;
    const review = await deps.requestHostReply({
      type: "install-review",
      token: generateConfirmationToken((length) => deps.provider.randomBytes(length)),
      appId,
      version: verified.manifest.version,
      publisherPublicKey: verified.manifest.publisherPublicKey,
      trusted,
      trustedLabel: trustedEntry?.label ?? null,
      capabilities: declared.map((id) => ({ id, description: id, granted: false }))
    });
    if (review === null || review.accept !== true) {
      throw new Error("Install cancelled at capability review");
    }

    const archivePath = `packages/${appId}/${verified.manifest.version}.tpkg`;
    await deps.runtime.store.set(archivePath, archive);
    installed.install(
      {
        appId,
        version: verified.manifest.version,
        packageHash: verified.packageHash,
        installedAt: Date.now(),
        manifest: verified.manifest,
        archivePath
      },
      archive.length
    );
    await deps.persistCatalogState();
    if (Array.isArray(review.grants) && review.grants.length > 0) {
      await deps.ensureMiniappHost().setGrants(
        appId,
        verified.manifest.publisherPublicKey,
        verified.manifest.capabilities,
        review.grants
      );
    }
    deps.pushCatalog();
    deps.log(
      deps.installLogMessage?.(appId, verified.manifest.version, fetchedFrom, trusted) ??
        `Installed ${appId} v${verified.manifest.version} from 256t via ${fetchedFrom}`
    );
    return {
      appId,
      version: verified.manifest.version,
      trusted,
      source: fetchedFrom,
      publisherPublicKey: verified.manifest.publisherPublicKey,
      servingPublicKey: resolvedLocator?.servingPublicKey ?? null
    };
  };
}

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
      direction: deps.DestinationDirection.IN,
      type: deps.DestinationType.SINGLE,
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
      direction: deps.DestinationDirection.IN,
      type: deps.DestinationType.SINGLE,
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

export function createWorkletPropagationPersistence(deps) {
  async function loadPropagationCache() {
    const raw = await deps.runtime.store.get(deps.propagationStoreKey);
    if (raw === undefined) {
      deps.setPropagationStoreCache({ entries: [] });
      return;
    }
    try {
      deps.setPropagationStoreCache(JSON.parse(new TextDecoder().decode(raw)));
    } catch {
      deps.setPropagationStoreCache({ entries: [] });
    }
  }

  function createPersistence() {
    return {
      load() {
        return (deps.getPropagationStoreCache()?.entries ?? []).map((entry) => ({
          transientId: hexToBytes(entry.transientIdHex),
          lxmfData: hexToBytes(entry.lxmfDataHex),
          storedAt: entry.storedAt
        }));
      },
      save(entries) {
        const cache = {
          entries: entries.map((entry) => ({
            transientIdHex: bytesToHex(entry.transientId),
            lxmfDataHex: bytesToHex(entry.lxmfData),
            storedAt: entry.storedAt
          }))
        };
        deps.setPropagationStoreCache(cache);
        void deps.runtime.store.set(
          deps.propagationStoreKey,
          new TextEncoder().encode(JSON.stringify(cache))
        );
      }
    };
  }

  return { loadPropagationCache, createPersistence };
}

export function createAutoInterfaceOps(deps) {
  async function startAutoInterface() {
    const node = await deps.ensureReticulum();
    if (deps.getAutoIface() !== null) {
      deps.status.autoPeers = deps.getAutoIface().peerInterfaces.length;
      deps.pushStatus();
      return;
    }

    deps.log("Starting AutoInterface (native multicast bridge via IPC)");
    deps.setMulticastBridge(deps.createIpcMulticastBridge());
    const discovery = selectDiscoveryProviders({
      multicastAvailable: true,
      multicastEntitled: deps.getMulticastEntitled(),
      bonjourAvailable: deps.getBonjourDiscoveryEnabled(),
      allowConcurrent: deps.getMulticastEntitled()
    });

    if (discovery.active.includes("bonjour")) {
      deps.setBonjourBridge(deps.createIpcBonjourBridge());
      await deps.getBonjourBridge().start();
      deps.log("Bonjour discovery provider enabled");
    }

    const autoIface = await AutoInterfaceBridge.open(deps.provider, {
      name: "harness-auto",
      provider: deps.provider,
      runtime: deps.runtime,
      bridge: deps.getMulticastBridge(),
      onAdvertiseInterface: async (iface) => {
        if (deps.getBonjourBridge() !== null) {
          await deps.getBonjourBridge().advertise(iface.name, iface.linkLocalAddress, AUTO_DEFAULT_DATA_PORT);
        }
      },
      onPeerSpawn: (peer) => {
        node.registerInterface(peer);
        deps.status.autoPeers = deps.getAutoIface()?.peerInterfaces.length ?? 0;
        deps.pushStatus();
        deps.log(`AutoInterface peer online: ${peer.peerAddress}`);
      },
      onPeerDetach: (peer) => {
        node.unregisterInterface(peer);
        deps.status.autoPeers = deps.getAutoIface()?.peerInterfaces.length ?? 0;
        deps.pushStatus();
        deps.log(`AutoInterface peer detached: ${peer.peerAddress}`);
      }
    });
    deps.setAutoIface(autoIface);

    deps.status.autoPeers = autoIface.peerInterfaces.length;
    if (autoIface.online) {
      deps.log(`AutoInterface online (${deps.status.autoPeers} peer(s))`);
    } else {
      deps.log("AutoInterface started; waiting for link-local interfaces from host");
    }
    deps.pushStatus();
  }

  async function stopAutoInterface() {
    const autoIface = deps.getAutoIface();
    if (autoIface !== null) {
      await autoIface.close();
      deps.setAutoIface(null);
    }
    const multicastBridge = deps.getMulticastBridge();
    if (multicastBridge !== null) {
      await multicastBridge.stop();
      deps.setMulticastBridge(null);
    }
    const bonjourBridge = deps.getBonjourBridge();
    if (bonjourBridge !== null) {
      await bonjourBridge.stop();
      deps.setBonjourBridge(null);
    }
    deps.status.autoPeers = 0;
  }

  return { startAutoInterface, stopAutoInterface };
}

export function createEnsureDevChannel(deps) {
  let devChannel = null;
  return function ensureDevChannel() {
    if (devChannel === null) {
      devChannel = deps.createDevChannelClient({
        isDeveloperMode: () => deps.ensureMiniappHost().isDeveloperMode(),
        onConnected: (address) => {
          deps.send({ type: "dev-channel", state: "connected", detail: address });
          deps.log(`Dev channel connected to ${address}`);
        },
        onDisconnected: () => {
          deps.send({ type: "dev-channel", state: "disconnected" });
          deps.log("Dev channel disconnected");
        },
        onBundleLoaded: (name) => {
          deps.send({ type: "dev-channel", state: "loaded", detail: name });
          deps.log(`Dev side-loaded ${name}`);
        },
        onError: (message) => {
          deps.send({ type: "dev-channel", state: "error", detail: message });
          deps.log(`Dev channel error: ${message}`);
        },
        onBundle: async (manifest, bundleBytes) => {
          await deps.ensureMiniappHost().devSideLoad(manifest, bundleBytes);
        }
      });
    }
    return devChannel;
  };
}

export function createQuiesceInterfaces(deps) {
  return async function quiesceInterfaces() {
    deps.log("Quiescing interfaces for iOS background transition");
    await deps.stopTcpInterface();
    await deps.stopAutoInterface();
    await deps.stopBleInterface();
    await deps.stopRnodeInterface();
    await deps.stopFreenetInterface();
    deps.pushStatus();
  };
}

export async function joinCommunityNetwork(deps) {
  deps.status.tcpEnabled = true;
  deps.pushStatus();
  deps.log(deps.communityNetwork.privacyNotice);
  for (const endpoint of deps.communityNetwork.endpoints) {
    await deps.stopTcpInterface();
    deps.setPendingTarget({ targetHost: endpoint.host, targetPort: endpoint.port });
    deps.log(`Trying ${endpoint.label}`);
    if (await deps.startTcpInterface(endpoint.host, endpoint.port)) {
      deps.log(`Joined ${deps.communityNetwork.label} through ${endpoint.label}`);
      return;
    }
  }
  deps.log("Community bootstrap unavailable; try again later or configure your own TCP peer");
}
