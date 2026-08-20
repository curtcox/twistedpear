/* global setTimeout */
import {
  buildUnsignedManifest,
  capabilityScopeLabel,
  compareSemver,
  launchGrantsSatisfyDeclarations,
  packPackage,
  parseCapabilityDeclarations,
  signManifest,
} from "../../app-registry/dist/index.js";
import { capabilityUpdateDelta } from "../../app-registry/dist/update-delta.js";
import {
  presentCapabilityReview,
  riskClassForCapabilityId,
} from "./capability-review.mjs";
import {
  describeCapability,
  validateManifestCapabilities,
} from "../../miniapp-runtime/dist/capabilities.js";
import { installReviewConsentRecord } from "../../miniapp-runtime/dist/consent-record.js";
import {
  grantTtlMsForCapabilities,
  isGrantLifecycleEffective,
} from "../../miniapp-runtime/dist/grant-ttl.js";
import { HOST_API_VERSION } from "../../miniapp-runtime/dist/host-api.js";
import {
  CodecStreamEgressFactory,
  PeerRouteMediaBridge,
  PeerRouteStreamEgressFactory,
  PlaneStreamEgressFactory,
  ReservedStreamEgressFactory,
  createHostPlaneOpeners,
  createPeerRouteLinkSupply,
} from "../../miniapp-runtime/dist/media-stream.js";
import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";
import { hostRandomBytes } from "./miniapp-host-shared-core.mjs";

export function createDevSideLoadMethod({
  getDeveloperMode,
  devBadgeRef,
  host,
  pushRuntime,
}) {
  return async function devSideLoad(manifest, bundleBytes) {
    if (!getDeveloperMode()) {
      throw new Error("Developer mode is disabled");
    }

    const declared = validateManifestCapabilities(manifest.capabilities ?? []);
    devBadgeRef.current = true;
    await host.launch(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry ?? "bundle.js",
        capabilities: declared,
        publisherPublicKey: manifest.publisherPublicKey ?? "dev",
      },
      bundleBytes,
    );
    pushRuntime();
  };
}

export function createCommonPresenceBackend(options) {
  return {
    snapshot: async () => ({
      peers: options.getPresenceSnapshot?.().autoPeers ?? 0,
      onlineInterfaces: options.getPresenceSnapshot?.().onlineInterfaces ?? 0,
      preferredInterface:
        options.getPresenceSnapshot?.().preferredInterface ?? null,
    }),
  };
}

export function createCommonHostInfoBackend(options, defaultPlatform) {
  return {
    info: async () => {
      const snap = options.getHostInfoSnapshot?.() ?? {};
      return {
        platform: snap.platform ?? defaultPlatform,
        hostVersion: snap.hostVersion ?? "0.0.0",
        hostApiVersion: HOST_API_VERSION,
        roles: {
          transport: snap.roles?.transport ?? false,
          seeder: snap.roles?.seeder ?? false,
          propagation: snap.roles?.propagation ?? false,
        },
        interfaceTypes: Array.isArray(snap.interfaceTypes)
          ? snap.interfaceTypes
          : [],
        quotas: {
          kvQuotaBytes: snap.quotas?.kvQuotaBytes ?? null,
          seedStorageUsedBytes: snap.quotas?.seedStorageUsedBytes ?? null,
          seedStorageQuotaBytes: snap.quotas?.seedStorageQuotaBytes ?? null,
          memoryBytes: snap.quotas?.memoryBytes ?? null,
        },
        ...(snap.dropCensus !== undefined
          ? { dropCensus: snap.dropCensus }
          : {}),
      };
    },
  };
}

export function createCommonResourceBackend(kvStore) {
  return {
    fetch: async (_appId, request) => {
      const key = `miniapp-resource:${request.resourceId}`;
      const bytes = await kvStore.get(key);
      if (bytes === null) {
        throw new Error(`Resource not found: ${request.resourceId}`);
      }

      if (
        request.budgetBytes !== undefined &&
        bytes.length > request.budgetBytes
      ) {
        throw new Error(
          `Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`,
        );
      }

      return bytes;
    },
  };
}

export function createCommonCasBackend(casStore) {
  return {
    put: async (_appId, content) => {
      const t256 = await casStore.put(content);
      return { t256, size: content.length };
    },
    get: async (_appId, t256) => casStore.get(t256),
  };
}

export function createDefaultLocalMediaReadiness(now) {
  return () => ({
    hostApi: HOST_API_VERSION,
    accepts: [
      {
        classId: "microphone",
        maxRung: "16k-opus",
        encodings: ["16k-opus", "8k-narrowband"],
      },
      {
        classId: "camera",
        maxRung: "thumbnails-1fps",
        encodings: ["thumbnails-1fps"],
      },
    ],
    offers: [],
    downlinkBucket: "audio",
    constrained: ["foreground-only"],
    consentPosture: "ask",
    expiresAt: now() + 60_000,
  });
}

export function createConfirmationEffects() {
  return {
    randomBytes: (length) => {
      const bytes = new Uint8Array(length);
      if (typeof globalThis.crypto?.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < length; i += 1)
          bytes[i] = (Math.random() * 256) | 0;
      }
      return bytes;
    },
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  };
}

export function createMediaPipeline(options, now, openMediaCodecDefault) {
  const peerRouteMediaBridge =
    options.peerRouteMediaBridge ??
    (typeof options.peerSessionManager?.route === "function" &&
    typeof options.peerSessionManager?.list === "function"
      ? new PeerRouteMediaBridge(options.peerSessionManager, {
          now,
          randomBytes: hostRandomBytes,
          onFrame: options.onInboundMediaFrame,
        })
      : undefined);
  const hostPlaneOpeners =
    peerRouteMediaBridge === undefined &&
    options.openCasPlane === undefined &&
    options.openPearsBulkPlane === undefined &&
    options.openWebRtcMediaPlane === undefined
      ? undefined
      : createHostPlaneOpeners({
          ...(peerRouteMediaBridge === undefined
            ? {}
            : { peerRouteFactory: peerRouteMediaBridge }),
          ...(options.openCasPlane === undefined
            ? {}
            : { cas: options.openCasPlane }),
          ...(options.openPearsBulkPlane === undefined
            ? {}
            : { pearsBulk: options.openPearsBulkPlane }),
          ...(options.openWebRtcMediaPlane === undefined
            ? {}
            : { webrtcMediaPlane: options.openWebRtcMediaPlane }),
        });
  const planeMediaEgress =
    hostPlaneOpeners === undefined
      ? undefined
      : new PlaneStreamEgressFactory(hostPlaneOpeners);
  const peerRouteMediaEgress =
    planeMediaEgress === undefined && peerRouteMediaBridge === undefined
      ? undefined
      : new CodecStreamEgressFactory(
          planeMediaEgress ?? peerRouteMediaBridge,
          options.openMediaCodec ?? openMediaCodecDefault,
        );
  const reservedMediaEgress =
    peerRouteMediaEgress === undefined ||
    options.realtimeReservations === undefined
      ? peerRouteMediaEgress
      : new ReservedStreamEgressFactory(
          peerRouteMediaEgress,
          options.realtimeReservations,
        );
  const streamEgressFactory =
    options.streamEgressFactory ??
    reservedMediaEgress ??
    (typeof options.peerSessionManager?.route === "function"
      ? new PeerRouteStreamEgressFactory(options.peerSessionManager)
      : undefined);
  const linkSupply =
    options.linkSupply ??
    (typeof options.peerSessionManager?.route === "function"
      ? createPeerRouteLinkSupply(options.peerSessionManager)
      : undefined);

  return {
    peerRouteMediaBridge,
    peerRouteMediaEgress,
    reservedMediaEgress,
    streamEgressFactory,
    linkSupply,
  };
}

export function createAppsBackendCompileAction({
  collectWorkspaceFiles,
  writeWorkspaceFile,
}) {
  return async function compileApp(appId, { projectPrefix }) {
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    if (!files.some((file) => file.path === "elm.json")) {
      return { compiled: false, reason: "not a Guida project" };
    }
    let compileGuidaWorkspace;
    try {
      ({ compileGuidaWorkspace } = await import(
        "../../guida-twistedpear/dist/index.js"
      ));
    } catch {
      return {
        compiled: false,
        reason: "Guida compiler is not available on this host",
      };
    }
    const result = await compileGuidaWorkspace(
      files.map((file) => ({ path: file.path, content: file.content })),
    );
    await writeWorkspaceFile(
      appId,
      `${projectPrefix}/bundle.js`,
      result.bundle,
    );
    return {
      compiled: true,
      bytes: result.minifiedBytes,
      compiler: result.compilerVersion,
    };
  };
}

export function createAppsBackendPackageAction({
  requirePublisherIdentity,
  collectWorkspaceFiles,
  provider,
  casStore,
}) {
  return async function packageApp(appId, { projectPrefix, manifest }) {
    const identity = await requirePublisherIdentity();
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    if (!files.some((file) => file.path === manifest.entry)) {
      throw new Error(
        `Entry file "${manifest.entry}" not found under ${projectPrefix}/`,
      );
    }

    const unsigned = buildUnsignedManifest(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities,
        icon: null,
        minHostApi: manifest.minHostApi ?? "0.2.0",
        driveKey: "0".repeat(64),
        publisherPublicKey: bytesToHex(identity.getPublicKey()),
        files,
      },
      provider,
    );
    const signed = signManifest(provider, identity, unsigned);
    const packed = packPackage(provider, {
      ...signed,
      signature: signed.signature,
      files,
    });
    const t256 = await casStore.put(packed.archiveBytes);
    return {
      packageHash: packed.packageHash,
      size: packed.archiveBytes.length,
      t256,
    };
  };
}

export function createAppsBackendPublishAction(options, casStore) {
  return async function publishApp(_appId, { t256 }) {
    if (options.publishArchive === undefined) {
      throw new Error("Publishing is not configured on this host");
    }

    const archive = await casStore.get(t256);
    if (archive === null) {
      throw new Error("Package not found in the local store; package it first");
    }

    return options.publishArchive({ t256, archive });
  };
}

export function createAppsBackendPreviewAction({
  collectWorkspaceFiles,
  stopPreviewHost,
  createPreviewHost,
  previewRef,
  pushPreviewRuntime,
  now,
}) {
  return async function previewApp(appId, { projectPrefix, manifest, grants }) {
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    const entryFile = files.find((file) => file.path === manifest.entry);
    if (entryFile === undefined) {
      throw new Error(
        `Entry file "${manifest.entry}" not found under ${projectPrefix}/`,
      );
    }

    await stopPreviewHost();
    const previewHost = createPreviewHost();
    const publisherKey = `dev-preview:${appId}`;
    await previewHost.grantStore.set({
      appId: manifest.name,
      publisherPublicKey: publisherKey,
      declared: manifest.capabilities,
      requestedGrants: grants,
      now: now(),
      ttlMs: grantTtlMsForCapabilities(grants),
    });
    await previewHost.host.launch(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities,
        publisherPublicKey: publisherKey,
      },
      entryFile.content,
    );
    previewRef.current = previewHost;
    pushPreviewRuntime();
    return { launched: true };
  };
}

function bringToForegroundIfRunning(host, record) {
  const match = host
    .running()
    .find(
      (item) =>
        item.appId === record.appId &&
        item.publisherPublicKey === record.manifest.publisherPublicKey,
    );
  if (match === undefined) return false;
  host.switchForeground(record.appId, record.manifest.publisherPublicKey);
  return true;
}

export function previousDeclaredCapabilities(installedStore, record) {
  if (typeof installedStore.previousVersion === "function") {
    const previousVersion = installedStore.previousVersion(record.appId);
    if (previousVersion === null) return [];
    return (
      installedStore.get(record.appId, previousVersion)?.manifest
        .capabilities ?? []
    );
  }
  const installed =
    typeof installedStore.listInstalled === "function"
      ? installedStore.listInstalled()
      : [];
  const older = installed
    .filter(
      (entry) =>
        entry.appId === record.appId && entry.version !== record.version,
    )
    .sort((left, right) => compareSemver(left.version, right.version));
  return older.at(-1)?.manifest.capabilities ?? [];
}

export async function launchWithCapabilityReview({
  record,
  grantStore,
  now,
  pushGrants,
  host,
  bundle,
  startWatchdog,
  pushRuntime,
  devBadgeRef,
  requestReview,
  previousDeclared = [],
}) {
  devBadgeRef.current = false;
  const declarations = parseCapabilityDeclarations(
    record.manifest.capabilities,
    record.manifest.formatVersion ?? 1,
  );
  const declared = validateManifestCapabilities(declarations);
  const at = now();
  const lifecycles = await grantStore.authority(
    record.appId,
    record.manifest.publisherPublicKey,
  );
  const preGranted = new Set(
    (
      await grantStore.get(record.appId, record.manifest.publisherPublicKey)
    )?.granted.filter((id) => isGrantLifecycleEffective(lifecycles[id], at)) ??
      [],
  );
  const delta = capabilityUpdateDelta(
    previousDeclared,
    declared,
    riskClassForCapabilityId,
  );
  const addedIds = new Set(delta.added.map((entry) => entry.id));
  const presented = presentCapabilityReview(
    declarations.map((declaration) => ({
      id: declaration.id,
      description: describeCapability(declaration.id),
      riskClass: riskClassForCapabilityId(declaration.id),
      isNewSinceLastApproval: addedIds.has(declaration.id),
      granted: preGranted.has(declaration.id) && !addedIds.has(declaration.id),
      expiresAt:
        preGranted.has(declaration.id) && !addedIds.has(declaration.id)
          ? (lifecycles[declaration.id]?.expiresAt ?? null)
          : null,
      optional: declaration.optional,
      scope: declaration.scope,
      scopeLabel: capabilityScopeLabel(declaration.scope),
    })),
  );
  const reply = await requestReview({
    appId: record.appId,
    publisherPublicKey: record.manifest.publisherPublicKey,
    version: record.manifest.version,
    added: delta.added,
    riskTier: presented.riskTier,
    capabilities: presented.capabilities,
  });
  if (reply === null || reply.accept !== true) {
    throw new Error("Launch cancelled at capability review");
  }

  host.recordConsent?.(
    installReviewConsentRecord({
      at,
      token: `review:${record.appId}:${record.manifest.version}`,
      appId: record.appId,
      publisherPublicKey: record.manifest.publisherPublicKey,
      packageId: record.packageHash ?? null,
      capabilities: declared,
      added: addedIds,
    }),
  );

  if (Array.isArray(reply.grants)) {
    await grantStore.set({
      appId: record.appId,
      publisherPublicKey: record.manifest.publisherPublicKey,
      declared: record.manifest.capabilities,
      requestedGrants: reply.grants,
      now: at,
      ttlMs: grantTtlMsForCapabilities(reply.grants),
    });
    pushGrants(
      record.appId,
      record.manifest.publisherPublicKey,
      record.manifest.capabilities,
    );
  }

  const grants = await grantStore.get(
    record.appId,
    record.manifest.publisherPublicKey,
  );
  if (!launchGrantsSatisfyDeclarations(declarations, grants?.granted ?? [])) {
    throw new Error("Grant every required capability before launch");
  }

  if (bringToForegroundIfRunning(host, record)) {
    startWatchdog();
    pushRuntime();
    return;
  }

  await host.launch(
    {
      name: record.appId,
      version: record.manifest.version,
      entry: record.manifest.entry,
      capabilities: declared,
      publisherPublicKey: record.manifest.publisherPublicKey,
    },
    bundle,
  );

  startWatchdog();
  pushRuntime();
}

export async function launchWithoutReview({
  record,
  grantStore,
  host,
  bundle,
  startWatchdog,
  pushRuntime,
  devBadgeRef,
}) {
  devBadgeRef.current = false;
  const declarations = parseCapabilityDeclarations(
    record.manifest.capabilities,
    record.manifest.formatVersion ?? 1,
  );
  const declared = validateManifestCapabilities(declarations);
  const grants = await grantStore.get(
    record.appId,
    record.manifest.publisherPublicKey,
  );
  if (!launchGrantsSatisfyDeclarations(declarations, grants?.granted ?? [])) {
    throw new Error("Grant every required capability before launch");
  }

  if (bringToForegroundIfRunning(host, record)) {
    startWatchdog();
    pushRuntime();
    return;
  }

  await host.launch(
    {
      name: record.appId,
      version: record.manifest.version,
      entry: record.manifest.entry,
      capabilities: declared,
      publisherPublicKey: record.manifest.publisherPublicKey,
    },
    bundle,
  );

  startWatchdog();
  pushRuntime();
}
