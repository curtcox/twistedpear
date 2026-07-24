import {
  CAPABILITY_DEFINITIONS,
  KvStorageBeeBackend,
  GrantStore,
  HOST_API_VERSION,
  MiniappHost,
  createHybridDeviceDrivers,
  createSimulatedDeviceManager,
  describeCapability,
  generateConfirmationToken,
  isMiniappCapability,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createOpenRouterBackend } from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createSandboxBackend as createBareWorkletSandboxBackend } from "../../../packages/miniapp-runtime/dist/sandbox/worklet-factory.js";
import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
  unpackPackage
} from "../../../packages/app-registry/dist/index.js";
import { CasStore } from "../../../packages/cas-256t/dist/index.js";
import { bytesToHex } from "../../../packages/reticulum-ts/dist/crypto/bytes.js";

/**
 * Worklet-side mini-app host wrapper. Keeps Phase 4 runtime wiring out of entry.mjs.
 */
export function createWorkletMiniappHost(options) {
  const kvStore = options.kvStore;
  const now = options.now ?? (() => Date.now());
  const grantStore = new GrantStore(kvStore);
  let developerMode = false;
  let devBadge = false;
  let watchdogTimer = null;
  /** @type {{baseUrl: string, apiKey: string, model: string, allowedModels?: string[]} | null} */
  let aiConfig = options.aiConfig ?? null;
  const casStore = new CasStore(kvStore, (data) => options.provider.sha512(data));
  /** @type {{host: import("../../../packages/miniapp-runtime/dist/worklet.js").MiniappHost, appId: string} | null} */
  let preview = null;
  const beeBackend = new KvStorageBeeBackend(kvStore);
  const confirmationChannel =
    options.requestUserConfirmation === undefined
      ? undefined
      : { confirm: (request) => options.requestUserConfirmation(request) };
  const confirmationEffects =
    options.requestUserConfirmation === undefined
      ? undefined
      : {
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
  const browserDeviceClasses = ["location", "camera", "microphone"];
  /** @type {import("../../../packages/miniapp-runtime/dist/worklet.js").DeviceManager} */
  const deviceManager =
    options.deviceManager ??
    createSimulatedDeviceManager({
      now,
      confirmationChannel,
      confirmationEffects,
      onChromeChange: () => {
        void pushDeviceChromeState();
      },
      drivers:
        typeof options.requestDeviceBridge === "function"
          ? createHybridDeviceDrivers(browserDeviceClasses, {
              availability: (classId) => options.requestDeviceBridge({ op: "availability", classId }),
              sense: (classId, senseOptions) =>
                options.requestDeviceBridge({ op: "sense", classId, options: senseOptions ?? {} })
            })
          : undefined
    });

  const createSandboxBackend = options.createSandboxBackend ?? createBareWorkletSandboxBackend;
  const host = new MiniappHost({
    backend: createSandboxBackend(options.sandboxBackend ?? "bare-worker"),
    grantStore,
    kvBackend: kvStore,
    confirmationChannel:
      options.requestUserConfirmation === undefined
        ? undefined
        : { confirm: (request) => options.requestUserConfirmation(request) },
    aiBackend:
      options.aiBackend ??
      {
        // Config can arrive after construction; resolve it per call. The key
        // stays in the worklet — only sanitized request/response cross the broker.
        chat: async (appId, request) => {
          if (aiConfig === null || !aiConfig.baseUrl || !aiConfig.apiKey) {
            throw new Error("AI is not configured on this host (set it in Settings)");
          }

          return createOpenRouterBackend(aiConfig).chat(appId, request);
        },
        stream: async function* (appId, request) {
          if (aiConfig === null || !aiConfig.baseUrl || !aiConfig.apiKey) {
            throw new Error("AI is not configured on this host (set it in Settings)");
          }
          yield* createOpenRouterBackend(aiConfig).stream(appId, request);
        },
        embed: async (appId, request) => {
          if (aiConfig === null || !aiConfig.baseUrl || !aiConfig.apiKey || !aiConfig.embeddingModel) {
            throw new Error("Embeddings are not configured on this host (set an embedding model in Settings)");
          }
          return createOpenRouterBackend(aiConfig).embed(appId, request);
        }
      },
    beeBackend: {
      descriptor: (appId) => beeBackend.descriptor(appId),
      get: (appId, key) => beeBackend.get(appId, key),
      put: (appId, key, value) => beeBackend.put(appId, key, value),
      del: (appId, key) => beeBackend.del(appId, key),
      list: (appId, listOptions) => beeBackend.list(appId, listOptions)
    },
    presenceBackend: {
      snapshot: async () => ({
        peers: options.getPresenceSnapshot?.().autoPeers ?? 0,
        onlineInterfaces: options.getPresenceSnapshot?.().onlineInterfaces ?? 0,
        preferredInterface: options.getPresenceSnapshot?.().preferredInterface ?? null
      })
    },
    announceService: options.announceService,
    hostInfoBackend: {
      info: async () => {
        const snap = options.getHostInfoSnapshot?.() ?? {};
        return {
          platform: snap.platform ?? "desktop",
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
    },
    resourceBackend: {
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
    },
    appsBackend: {
      package: async (appId, { projectPrefix, manifest }) => {
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
          options.provider
        );
        const signed = signManifest(options.provider, identity, unsigned);
        const packed = packPackage(options.provider, { ...signed, signature: signed.signature, files });
        const t256 = await casStore.put(packed.archiveBytes);
        return { packageHash: packed.packageHash, size: packed.archiveBytes.length, t256 };
      },
      publish: async (_appId, { t256 }) => {
        if (options.publishArchive === undefined) {
          throw new Error("Publishing is not configured on this host");
        }

        const archive = await casStore.get(t256);
        if (archive === null) {
          throw new Error("Package not found in the local store; package it first");
        }

        return options.publishArchive({ t256, archive });
      },
      install: async (_appId, { t256 }) => {
        if (options.installFromT256 === undefined) {
          throw new Error("Installing from 256t ids is not configured on this host");
        }

        return options.installFromT256(t256);
      },
      preview: async (appId, { projectPrefix, manifest, grants }) => {
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
        preview = { host: previewHost.host, appId: manifest.name };
        pushPreviewRuntime();
        return { launched: true };
      },
      stopPreview: async () => {
        await stopPreviewHost();
      }
    },
    casBackend: {
      put: async (_appId, content) => {
        const t256 = await casStore.put(content);
        return { t256, size: content.length };
      },
      get: async (_appId, t256) => casStore.get(t256)
    },
    peerSessionManager: options.peerSessionManager,
    relayService: options.relayService,
    deviceManager,
    callbacks: {
      onWidgetTree: () => pushRuntime(),
      onLog: (entry) => options.send({ type: "miniapp-log", appId: entry.appId, line: entry.line }),
      onLifecycle: () => {
        options.onMiniappStateChange(host.snapshot().state !== "stopped");
        pushRuntime();
      }
    }
  });

  async function requirePublisherIdentity() {
    if (options.getPublisherIdentity === undefined) {
      throw new Error("No publisher identity is configured on this host");
    }

    const identity = await options.getPublisherIdentity();
    if (identity === null) {
      throw new Error("No publisher identity is available; start the node first");
    }

    return identity;
  }

  async function collectWorkspaceFiles(appId, projectPrefix) {
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
  }

  function createPreviewHost() {
    const memory = new Map();
    const memoryStore = {
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
    const grantStoreForPreview = new GrantStore(memoryStore);
    const previewHost = new MiniappHost({
      backend: createSandboxBackend(options.sandboxBackend ?? "bare-worker"),
      grantStore: grantStoreForPreview,
      kvBackend: memoryStore,
      callbacks: {
        onWidgetTree: () => pushPreviewRuntime(),
        onLog: (entry) =>
          options.send({ type: "miniapp-log", appId: `preview:${entry.appId}`, line: entry.line }),
        onLifecycle: () => pushPreviewRuntime()
      }
    });
    return { host: previewHost, grantStore: grantStoreForPreview };
  }

  async function stopPreviewHost() {
    if (preview !== null) {
      const stopped = preview;
      preview = null;
      await stopped.host.stop("preview-stopped");
      options.send({ type: "miniapp-runtime", slot: "preview", runtime: null });
    }
  }

  function pushPreviewRuntime() {
    if (preview === null) {
      return;
    }

    const snapshot = preview.host.snapshot();
    options.send({
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
  }

  function pushRuntime() {
    const snapshot = host.snapshot();
    options.send({
      type: "miniapp-runtime",
      slot: "main",
      runtime: {
        appId: snapshot.appId,
        version: snapshot.version,
        state: snapshot.state,
        widgetTree: snapshot.widgetTree,
        devBadge
      }
    });
  }

  async function pushDeviceChromeState() {
    const [inventory, diagnostics] = await Promise.all([
      deviceManager.inventory(),
      deviceManager.diagnostics()
    ]);
    options.send({
      type: "device-state",
      inventory,
      diagnostics,
      sessions: deviceManager.chromeSessions(),
      indicators: deviceManager.activeIndicators(),
      disabledClasses: deviceManager.disabledClasses(),
      remoteAcquisitionEnabled: deviceManager.isRemoteAcquisitionEnabled()
    });
  }

  function pushGrants(appId, publisherPublicKey, declaredCapabilities) {
    const declared = new Set(validateManifestCapabilities(declaredCapabilities));
    options.send({
      type: "grants",
      appId,
      capabilities: CAPABILITY_DEFINITIONS.map((definition) => ({
        id: definition.id,
        description: definition.description,
        declared: declared.has(definition.id),
        granted: false
      }))
    });

    void grantStore.get(appId, publisherPublicKey).then((record) => {
      const granted = new Set(record?.granted ?? []);
      options.send({
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
  }

  async function loadBundleForApp(installedStore, runtime, appId) {
    const version = installedStore.activeVersion(appId);
    if (version === null) {
      throw new Error(`No installed version for ${appId}`);
    }

    const record = installedStore.get(appId, version);
    if (record === null) {
      throw new Error(`Installed record missing for ${appId}@${version}`);
    }

    const archive = await runtime.store.get(record.archivePath);
    if (archive === undefined) {
      throw new Error(`Archive missing at ${record.archivePath}`);
    }

    const unpacked = unpackPackage(options.provider, archive);
    const entry = record.manifest.entry;
    const bundle = unpacked.files.get(entry);
    if (bundle === undefined) {
      throw new Error(`Entry bundle missing: ${entry}`);
    }

    return { record, bundle };
  }

  return {
    isDeveloperMode() {
      return developerMode;
    },

    setDeveloperMode(enabled) {
      developerMode = enabled;
      options.onDeveloperModeChange(enabled);
    },

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
    },

    async launch(installedStore, runtime, appId, launchOptions = {}) {
      devBadge = false;
      const { record, bundle } = await loadBundleForApp(installedStore, runtime, appId);

      if (launchOptions.skipReview !== true && options.requestLaunchReview !== undefined) {
        const declared = validateManifestCapabilities(record.manifest.capabilities);
        const preGranted = new Set((await grantStore.get(record.appId, record.manifest.publisherPublicKey))?.granted ?? []);
        const reply = await options.requestLaunchReview({
          token: generateConfirmationToken((length) => options.provider.randomBytes(length)),
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

      if (watchdogTimer !== null) {
        clearInterval(watchdogTimer);
      }

      watchdogTimer = setInterval(() => {
        void host.watchdogPing();
      }, 2_000);
      pushRuntime();
    },

    async stop(reason = "stopped") {
      if (watchdogTimer !== null) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
      }

      devBadge = false;
      await stopPreviewHost();
      await host.stop(reason);
      pushRuntime();
    },

    async handlePreviewUiEvent(nodeId, event, value) {
      if (preview === null) {
        throw new Error("No preview app is running");
      }

      await preview.host.handleUiEvent(nodeId, event, value);
    },

    async stopPreview() {
      await stopPreviewHost();
    },

    setAiConfig(config) {
      aiConfig = config ?? null;
    },

    async readWorkspaceFile(documentId) {
      const snapshot = host.snapshot();
      if (snapshot.appId === null) {
        throw new Error("No mini-app is running");
      }

      return host.workspace.read(snapshot.appId, documentId);
    },

    setLimits(appId, update) {
      const limits = host.setResourceLimits(appId, update);
      options.send({ type: "limits", limits });
      return limits;
    },

    getLimits(appId) {
      const limits = host.getResourceLimits(appId);
      options.send({ type: "limits", limits });
      return limits;
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

    async devSideLoad(manifest, bundleBytes) {
      if (!developerMode) {
        throw new Error("Developer mode is disabled");
      }

      validateManifestCapabilities(manifest.capabilities ?? []);
      devBadge = true;
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
    }
  };
}
