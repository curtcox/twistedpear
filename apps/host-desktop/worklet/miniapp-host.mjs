import {
  CAPABILITY_DEFINITIONS,
  CorestoreBeeBackend,
  GrantStore,
  MiniappHost,
  createSandboxBackend,
  describeCapability,
  generateConfirmationToken,
  isMiniappCapability,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/index.js";
import { createOpenRouterBackend } from "../../../packages/miniapp-runtime/dist/index.js";
import { unpackPackage } from "../../../packages/app-registry/dist/index.js";

/**
 * Worklet-side mini-app host wrapper. Keeps Phase 4 runtime wiring out of entry.mjs.
 */
export function createWorkletMiniappHost(options) {
  const kvStore = options.kvStore;
  const grantStore = new GrantStore(kvStore);
  let developerMode = false;
  let devBadge = false;
  let watchdogTimer = null;
  /** @type {{baseUrl: string, apiKey: string, model: string, allowedModels?: string[]} | null} */
  let aiConfig = options.aiConfig ?? null;
  const beeBackend = new CorestoreBeeBackend(options.beeStoragePath ?? "miniapp-bee-store");
  const beeReady = beeBackend.ready();

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
        }
      },
    beeBackend: {
      descriptor: (appId) => beeBackend.descriptor(appId),
      get: async (appId, key) => {
        await beeReady;
        return beeBackend.get(appId, key);
      },
      put: async (appId, key, value) => {
        await beeReady;
        return beeBackend.put(appId, key, value);
      },
      del: async (appId, key) => {
        await beeReady;
        return beeBackend.del(appId, key);
      },
      list: async (appId, listOptions) => {
        await beeReady;
        return beeBackend.list(appId, listOptions);
      }
    },
    presenceBackend: {
      snapshot: async () => ({
        peers: options.getPresenceSnapshot?.().autoPeers ?? 0,
        onlineInterfaces: options.getPresenceSnapshot?.().onlineInterfaces ?? 0,
        preferredInterface: options.getPresenceSnapshot?.().preferredInterface ?? null
      })
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
    callbacks: {
      onWidgetTree: () => pushRuntime(),
      onLog: (entry) => options.send({ type: "miniapp-log", appId: entry.appId, line: entry.line }),
      onLifecycle: () => {
        options.onMiniappStateChange(host.snapshot().state !== "stopped");
        pushRuntime();
      }
    }
  });

  function pushRuntime() {
    const snapshot = host.snapshot();
    options.send({
      type: "miniapp-runtime",
      runtime: {
        appId: snapshot.appId,
        version: snapshot.version,
        state: snapshot.state,
        widgetTree: snapshot.widgetTree,
        devBadge
      }
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
      await grantStore.set(appId, publisherPublicKey, declaredCapabilities, grantedCapabilities);
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
          token: generateConfirmationToken(),
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
          await grantStore.set(record.appId, record.manifest.publisherPublicKey, record.manifest.capabilities, reply.grants);
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
      await host.stop(reason);
      pushRuntime();
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
