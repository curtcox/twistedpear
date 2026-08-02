import {
  buildUnsignedManifest,
  packPackage,
  signManifest
} from "../../app-registry/dist/index.js";
import {
  CAPABILITY_DEFINITIONS,
  GrantStore,
  describeCapability,
  isMiniappCapability,
  validateManifestCapabilities
} from "../../miniapp-runtime/dist/capabilities.js";
import { generateConfirmationToken } from "../../miniapp-runtime/dist/confirm.js";
import { HOST_API_VERSION } from "../../miniapp-runtime/dist/host-api.js";
import { MiniappHost } from "../../miniapp-runtime/dist/host.js";
import {
  CodecStreamEgressFactory,
  PeerRouteMediaBridge,
  PeerRouteStreamEgressFactory,
  PlaneStreamEgressFactory,
  ReservedStreamEgressFactory,
  createHostPlaneOpeners,
  createPeerRouteLinkSupply
} from "../../miniapp-runtime/dist/media-stream.js";
import { SessionInviteService } from "../../miniapp-runtime/dist/session-invite.js";
import { bytesToHex } from "../../reticulum-ts/dist/crypto/bytes.js";

/** Host-side entropy for media session ids; the bridge itself stays Sans-IO. */
export function hostRandomBytes(length) {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1) bytes[index] = (Math.random() * 256) | 0;
  }
  return bytes;
}

export function createInMemoryKvStore() {
  const memory = new Map();
  return {
    async get(key) {
      return memory.get(key) ?? null;
    },
    async set(key, value) {
      memory.set(key, value);
    },
    async delete(key) {
      memory.delete(key);
    },
    async list(prefix) {
      return [...memory.keys()].filter((key) => key.startsWith(prefix));
    }
  };
}

export function createPushGrants(send, grantStore) {
  return function pushGrants(appId, publisherPublicKey, declaredCapabilities) {
    const declared = new Set(validateManifestCapabilities(declaredCapabilities));
    optionsSendGrantsSkeleton(send, appId, declared);

    void grantStore.get(appId, publisherPublicKey).then((record) => {
      const granted = new Set(record?.granted ?? []);
      send({
        type: "grants",
        appId,
        capabilities: CAPABILITY_DEFINITIONS.map((definition) => ({
          id: definition.id,
          description: describeCapability(definition.id),
          declared: declared.has(definition.id),
          granted: granted.has(definition.id)
        }))
      });
    });
  };
}

function optionsSendGrantsSkeleton(send, appId, declared) {
  send({
    type: "grants",
    appId,
    capabilities: CAPABILITY_DEFINITIONS.map((definition) => ({
      id: definition.id,
      description: definition.description,
      declared: declared.has(definition.id),
      granted: false
    }))
  });
}

export function createPushDeviceChromeState(send, deviceManager) {
  return async function pushDeviceChromeState() {
    const [inventory, diagnostics] = await Promise.all([
      deviceManager.inventory(),
      deviceManager.diagnostics()
    ]);
    send({
      type: "device-state",
      inventory,
      diagnostics,
      sessions: deviceManager.chromeSessions(),
      indicators: deviceManager.activeIndicators(),
      disabledClasses: deviceManager.disabledClasses(),
      remoteAcquisitionEnabled: deviceManager.isRemoteAcquisitionEnabled(),
      // Host chrome shows every live share, including when no mini-app is foreground.
      shareOffers: deviceManager.listLiveShareOffers()
    });
  };
}

export function createSessionInviteHooks(options, now) {
  /**
   * G9: the invitation is delivered and shown by the host. No mini-app code
   * runs until trusted chrome accepts and the app is brought to the
   * foreground, so this is not a background-execution loophole.
   */
  const sessionInvites = new SessionInviteService(
    {
      async notify(invite) {
        options.send({ type: "session-invite", invite });
        pushSessionInvites();
      },
      async launchForeground(appId) {
        if (typeof options.launchInstalledApp !== "function") {
          throw new Error("This host cannot bring a mini-app to the foreground.");
        }
        await options.launchInstalledApp(appId);
      }
    },
    now
  );

  function pushSessionInvites() {
    options.send({ type: "session-invites", invites: sessionInvites.list() });
  }

  return { sessionInvites, pushSessionInvites };
}

export function createPublisherIdentityLoader(options, unavailableMessage) {
  return async function requirePublisherIdentity() {
    if (options.getPublisherIdentity === undefined) {
      throw new Error("No publisher identity is configured on this host");
    }

    const identity = await options.getPublisherIdentity();
    if (identity === null) {
      throw new Error(unavailableMessage);
    }

    return identity;
  };
}

export function createWorkspaceFileCollector(host) {
  return async function collectWorkspaceFiles(appId, projectPrefix) {
    const infos = await host.workspace.list(appId, `${projectPrefix}/`);
    const files = [];
    for (const info of infos) {
      const content = await host.workspace.read(appId, info.path);
      files.push({
        path: info.path.slice(projectPrefix.length + 1),
        content: new TextEncoder().encode(content)
      });
    }

    return files.sort((left, right) => left.path.localeCompare(right.path));
  };
}

export function createPreviewRuntimePusher(send, previewRef) {
  return function pushPreviewRuntime() {
    if (previewRef.current === null) {
      return;
    }

    const snapshot = previewRef.current.host.snapshot();
    send({
      type: "miniapp-runtime",
      slot: "preview",
      runtime: {
        appId: snapshot.appId,
        version: snapshot.version,
        state: snapshot.state,
        widgetTree: snapshot.widgetTree,
        devBadge: true
      }
    });
  };
}

export function createMainRuntimePusher(send, host, devBadgeRef, { slot } = {}) {
  return function pushRuntime() {
    const snapshot = host.snapshot();
    send({
      type: "miniapp-runtime",
      ...(slot === undefined ? {} : { slot }),
      runtime: {
        appId: snapshot.appId,
        version: snapshot.version,
        state: snapshot.state,
        widgetTree: snapshot.widgetTree,
        devBadge: devBadgeRef.current
      }
    });
  };
}

export function createPreviewHostStopper(send, previewRef) {
  return async function stopPreviewHost() {
    if (previewRef.current !== null) {
      const stopped = previewRef.current;
      previewRef.current = null;
      await stopped.host.stop("preview-stopped");
      send({ type: "miniapp-runtime", slot: "preview", runtime: null });
    }
  };
}

export function createPreviewHostFactory({ createBackend, send, pushPreviewRuntime }) {
  return function createPreviewHost() {
    const memoryStore = createInMemoryKvStore();
    const grantStoreForPreview = new GrantStore(memoryStore);
    const previewHost = new MiniappHost({
      backend: createBackend(),
      grantStore: grantStoreForPreview,
      kvBackend: memoryStore,
      callbacks: {
        onWidgetTree: () => pushPreviewRuntime(),
        onLog: (entry) =>
          send({ type: "miniapp-log", appId: `preview:${entry.appId}`, line: entry.line }),
        onLifecycle: () => pushPreviewRuntime()
      }
    });
    return { host: previewHost, grantStore: grantStoreForPreview };
  };
}

export function createGrantApiMethods({ grantStore, now, pushGrants }) {
  return {
    async getGrants(appId, publisherPublicKey, declaredCapabilities) {
      pushGrants(appId, publisherPublicKey, declaredCapabilities);
    },

    async setGrants(appId, publisherPublicKey, declaredCapabilities, grantedCapabilities) {
      await grantStore.set(appId, publisherPublicKey, declaredCapabilities, grantedCapabilities, now());
      pushGrants(appId, publisherPublicKey, declaredCapabilities);
    },

    async revokeGrant(appId, publisherPublicKey, capability, declaredCapabilities) {
      if (!isMiniappCapability(capability)) {
        throw new Error(`Unknown capability: ${capability}`);
      }

      await grantStore.revoke(appId, publisherPublicKey, capability);
      pushGrants(appId, publisherPublicKey, declaredCapabilities);
    },

    async deleteGrants(appId, publisherPublicKey) {
      await grantStore.delete(appId, publisherPublicKey);
    }
  };
}

export function createDeviceChromeApiMethods({ deviceManager, pushDeviceChromeState }) {
  return {
    async pushDeviceState() {
      await pushDeviceChromeState();
    },

    async setDeviceClassDisabled(classId, disabled) {
      deviceManager.setClassDisabled(classId, disabled === true);
      await pushDeviceChromeState();
    },

    async setRemoteAcquisitionEnabled(enabled) {
      deviceManager.setRemoteAcquisitionEnabled(enabled === true);
      await pushDeviceChromeState();
    },

    async forceCloseDeviceSession(handle) {
      await deviceManager.forceClose(handle);
      await pushDeviceChromeState();
    },

    async revokeShareOffer(appId, id) {
      const revoked = deviceManager.revokeShareOfferFromChrome(appId, id);
      await pushDeviceChromeState();
      return revoked;
    },

    /** Harness/Maestro only: seed a short-TTL share offer so stop-sharing chrome is visible. */
    async seedShareOfferForTest(options = {}) {
      const ttlMs = typeof options.ttlMs === "number" ? options.ttlMs : 15 * 60_000;
      const offer = deviceManager.grantShareOffer({
        appId: typeof options.appId === "string" ? options.appId : "line-check",
        targetKind: "peer",
        targetId: typeof options.targetId === "string" ? options.targetId : "peer-ana",
        displayLabel: typeof options.displayLabel === "string" ? options.displayLabel : "Ana",
        classId: options.classId === "camera" ? "camera" : "microphone",
        tierId: typeof options.tierId === "string" ? options.tierId : "pcm",
        maxRung: typeof options.maxRung === "string" ? options.maxRung : "16k-opus",
        ttlMs
      });
      await pushDeviceChromeState();
      setTimeout(() => {
        void pushDeviceChromeState();
      }, Math.max(50, ttlMs + 50));
      return offer;
    }
  };
}

export function createSessionInviteApiMethods({ sessionInvites, pushSessionInvites }) {
  return {
    async receiveSessionInvite(invite) {
      await sessionInvites.receive(invite);
    },

    async acceptSessionInvite(id) {
      await sessionInvites.accept(id);
      pushSessionInvites();
    },

    declineSessionInvite(id) {
      sessionInvites.decline(id);
      pushSessionInvites();
    },

    listSessionInvites() {
      return sessionInvites.list();
    },

    pushSessionInviteState() {
      pushSessionInvites();
    }
  };
}

export function createUiLifecycleMethods({ host, pushRuntime, previewRef }) {
  return {
    snapshot() {
      return host.snapshot();
    },

    previewSnapshot() {
      return previewRef.current?.host.snapshot() ?? null;
    },

    async readWorkspaceFile(documentId) {
      const snapshot = host.snapshot();
      if (snapshot.appId === null) {
        throw new Error("No mini-app is running");
      }

      return host.workspace.read(snapshot.appId, documentId);
    },

    async suspend(reason = "host-suspended") {
      await host.suspend(reason);
      pushRuntime();
    },

    async resume() {
      await host.resume();
      pushRuntime();
    },

    async handleUiEvent(nodeId, event, value) {
      await host.handleUiEvent(nodeId, event, value);
    },

    async handlePreviewUiEvent(nodeId, event, value) {
      if (previewRef.current === null) {
        throw new Error("No preview app is running");
      }

      await previewRef.current.host.handleUiEvent(nodeId, event, value);
    }
  };
}

export function createWatchdogHelpers(host) {
  let watchdogTimer = null;

  function startWatchdog() {
    if (watchdogTimer !== null) {
      clearInterval(watchdogTimer);
    }

    watchdogTimer = setInterval(() => {
      void host.watchdogPing();
    }, 2_000);
  }

  function clearWatchdog() {
    if (watchdogTimer !== null) {
      clearInterval(watchdogTimer);
      watchdogTimer = null;
    }
  }

  return { startWatchdog, clearWatchdog };
}

export function createDevSideLoadMethod({ getDeveloperMode, devBadgeRef, host, pushRuntime }) {
  return async function devSideLoad(manifest, bundleBytes) {
    if (!getDeveloperMode()) {
      throw new Error("Developer mode is disabled");
    }

    validateManifestCapabilities(manifest.capabilities ?? []);
    devBadgeRef.current = true;
    await host.launch(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry ?? "bundle.js",
        capabilities: manifest.capabilities ?? [],
        publisherPublicKey: manifest.publisherPublicKey ?? "dev"
      },
      bundleBytes
    );
    pushRuntime();
  };
}

export function createCommonPresenceBackend(options) {
  return {
    snapshot: async () => ({
      peers: options.getPresenceSnapshot?.().autoPeers ?? 0,
      onlineInterfaces: options.getPresenceSnapshot?.().onlineInterfaces ?? 0,
      preferredInterface: options.getPresenceSnapshot?.().preferredInterface ?? null
    })
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
          propagation: snap.roles?.propagation ?? false
        },
        interfaceTypes: Array.isArray(snap.interfaceTypes) ? snap.interfaceTypes : [],
        quotas: {
          kvQuotaBytes: snap.quotas?.kvQuotaBytes ?? null,
          seedStorageUsedBytes: snap.quotas?.seedStorageUsedBytes ?? null,
          seedStorageQuotaBytes: snap.quotas?.seedStorageQuotaBytes ?? null,
          memoryBytes: snap.quotas?.memoryBytes ?? null
        }
      };
    }
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

      if (request.budgetBytes !== undefined && bytes.length > request.budgetBytes) {
        throw new Error(`Resource exceeds budget (${bytes.length} > ${request.budgetBytes})`);
      }

      return bytes;
    }
  };
}

export function createCommonCasBackend(casStore) {
  return {
    put: async (_appId, content) => {
      const t256 = await casStore.put(content);
      return { t256, size: content.length };
    },
    get: async (_appId, t256) => casStore.get(t256)
  };
}

export function createDefaultLocalMediaReadiness(now) {
  return () => ({
    hostApi: HOST_API_VERSION,
    accepts: [
      { classId: "microphone", maxRung: "16k-opus", encodings: ["16k-opus", "8k-narrowband"] },
      { classId: "camera", maxRung: "thumbnails-1fps", encodings: ["thumbnails-1fps"] }
    ],
    offers: [],
    downlinkBucket: "audio",
    constrained: ["foreground-only"],
    consentPosture: "ask",
    expiresAt: now() + 60_000
  });
}

export function createConfirmationEffects() {
  return {
    randomBytes: (length) => {
      const bytes = new Uint8Array(length);
      if (typeof globalThis.crypto?.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < length; i += 1) bytes[i] = (Math.random() * 256) | 0;
      }
      return bytes;
    },
    delay: (ms) => new Promise((resolve) => setTimeout(resolve, ms))
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
          onFrame: options.onInboundMediaFrame
        })
      : undefined);
  const hostPlaneOpeners =
    peerRouteMediaBridge === undefined &&
    options.openCasPlane === undefined &&
    options.openPearsBulkPlane === undefined &&
    options.openWebRtcMediaPlane === undefined
      ? undefined
      : createHostPlaneOpeners({
          ...(peerRouteMediaBridge === undefined ? {} : { peerRouteFactory: peerRouteMediaBridge }),
          ...(options.openCasPlane === undefined ? {} : { cas: options.openCasPlane }),
          ...(options.openPearsBulkPlane === undefined
            ? {}
            : { pearsBulk: options.openPearsBulkPlane }),
          ...(options.openWebRtcMediaPlane === undefined
            ? {}
            : { webrtcMediaPlane: options.openWebRtcMediaPlane })
        });
  const planeMediaEgress =
    hostPlaneOpeners === undefined ? undefined : new PlaneStreamEgressFactory(hostPlaneOpeners);
  const peerRouteMediaEgress =
    planeMediaEgress === undefined && peerRouteMediaBridge === undefined
      ? undefined
      : new CodecStreamEgressFactory(
          planeMediaEgress ?? peerRouteMediaBridge,
          options.openMediaCodec ?? openMediaCodecDefault
        );
  const reservedMediaEgress =
    peerRouteMediaEgress === undefined || options.realtimeReservations === undefined
      ? peerRouteMediaEgress
      : new ReservedStreamEgressFactory(peerRouteMediaEgress, options.realtimeReservations);
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
    linkSupply
  };
}

export function createAppsBackendPackageAction({
  requirePublisherIdentity,
  collectWorkspaceFiles,
  provider,
  casStore
}) {
  return async function packageApp(appId, { projectPrefix, manifest }) {
    const identity = await requirePublisherIdentity();
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    if (!files.some((file) => file.path === manifest.entry)) {
      throw new Error(`Entry file "${manifest.entry}" not found under ${projectPrefix}/`);
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
        files
      },
      provider
    );
    const signed = signManifest(provider, identity, unsigned);
    const packed = packPackage(provider, { ...signed, signature: signed.signature, files });
    const t256 = await casStore.put(packed.archiveBytes);
    return { packageHash: packed.packageHash, size: packed.archiveBytes.length, t256 };
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
  now
}) {
  return async function previewApp(appId, { projectPrefix, manifest, grants }) {
    const files = await collectWorkspaceFiles(appId, projectPrefix);
    const entryFile = files.find((file) => file.path === manifest.entry);
    if (entryFile === undefined) {
      throw new Error(`Entry file "${manifest.entry}" not found under ${projectPrefix}/`);
    }

    await stopPreviewHost();
    const previewHost = createPreviewHost();
    const publisherKey = `dev-preview:${appId}`;
    await previewHost.grantStore.set(manifest.name, publisherKey, manifest.capabilities, grants, now());
    await previewHost.host.launch(
      {
        name: manifest.name,
        version: manifest.version,
        entry: manifest.entry,
        capabilities: manifest.capabilities,
        publisherPublicKey: publisherKey
      },
      entryFile.content
    );
    previewRef.current = previewHost;
    pushPreviewRuntime();
    return { launched: true };
  };
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
  requestReview
}) {
  devBadgeRef.current = false;
  const declared = validateManifestCapabilities(record.manifest.capabilities);
  const preGranted = new Set(
    (await grantStore.get(record.appId, record.manifest.publisherPublicKey))?.granted ?? []
  );
  const reply = await requestReview({
    appId: record.appId,
    publisherPublicKey: record.manifest.publisherPublicKey,
    version: record.manifest.version,
    capabilities: declared.map((id) => ({
      id,
      description: describeCapability(id),
      granted: preGranted.has(id)
    }))
  });
  if (reply === null || reply.accept !== true) {
    throw new Error("Launch cancelled at capability review");
  }

  if (Array.isArray(reply.grants)) {
    await grantStore.set(
      record.appId,
      record.manifest.publisherPublicKey,
      record.manifest.capabilities,
      reply.grants,
      now()
    );
    pushGrants(record.appId, record.manifest.publisherPublicKey, record.manifest.capabilities);
  }

  const grants = await grantStore.get(record.appId, record.manifest.publisherPublicKey);
  if (grants === null || grants.granted.length === 0) {
    throw new Error("Grant at least one declared capability before launch");
  }

  await host.launch(
    {
      name: record.appId,
      version: record.manifest.version,
      entry: record.manifest.entry,
      capabilities: record.manifest.capabilities,
      publisherPublicKey: record.manifest.publisherPublicKey
    },
    bundle
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
  devBadgeRef
}) {
  devBadgeRef.current = false;
  const grants = await grantStore.get(record.appId, record.manifest.publisherPublicKey);
  if (grants === null || grants.granted.length === 0) {
    throw new Error("Grant at least one declared capability before launch");
  }

  await host.launch(
    {
      name: record.appId,
      version: record.manifest.version,
      entry: record.manifest.entry,
      capabilities: record.manifest.capabilities,
      publisherPublicKey: record.manifest.publisherPublicKey
    },
    bundle
  );

  startWatchdog();
  pushRuntime();
}
