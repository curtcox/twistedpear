import {
  CAPABILITY_DEFINITIONS,
  KvStorageBeeBackend,
  GrantStore,
  HOST_API_VERSION,
  MiniappHost,
  MiniappLifecycle,
  createSimulatedDeviceManager,
  describeCapability,
  isMiniappCapability,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createSandboxBackend as createBareWorkletSandboxBackend } from "../../../packages/miniapp-runtime/dist/sandbox/worklet-factory.js";
import { unpackPackage } from "../../../packages/app-registry/dist/index.js";

const BENCHMARK_ITERATIONS = 5;
const BENCHMARK_WATCHDOG_MS = 250;

const helloBenchmarkBundle = new TextEncoder().encode(`import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "title", type: "text", props: { value: "Bench" } }]
  }
});
`);

const busyLoopBenchmarkBundle = new TextEncoder().encode("while (true) {}");

function benchmarkNowMs() {
  return performance.now();
}

function benchmarkAverage(values) {
  return Number((values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1));
}

async function benchmarkSleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function measureSpawnKill(backend, bundle, iterations) {
  const spawnLatencies = [];
  const killLatencies = [];

  for (let index = 0; index < iterations; index += 1) {
    const lifecycle = new MiniappLifecycle(backend, {
      appId: "bench",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle,
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true, result: "ok" })
      }
    });

    const spawnStarted = benchmarkNowMs();
    await lifecycle.launch();
    spawnLatencies.push(benchmarkNowMs() - spawnStarted);

    const killStarted = benchmarkNowMs();
    await lifecycle.stop("bench");
    killLatencies.push(benchmarkNowMs() - killStarted);
  }

  return {
    spawnMs: benchmarkAverage(spawnLatencies),
    killMs: benchmarkAverage(killLatencies)
  };
}

async function measureBusyLoopKill(backend) {
  const lifecycle = new MiniappLifecycle(
    backend,
    {
      appId: "busy-loop",
      version: "1.0.0",
      entryPath: "bundle.js",
      bundle: busyLoopBenchmarkBundle,
      brokerEndpoint: {
        request: async (request) => ({ id: request.id, ok: true })
      }
    },
    { watchdogMs: BENCHMARK_WATCHDOG_MS }
  );

  const started = benchmarkNowMs();
  await lifecycle.launch();

  let killed = false;
  for (let attempt = 0; attempt < 30; attempt += 1) {
    await benchmarkSleep(50);
    const snapshot = await lifecycle.watchdogPing();
    if (snapshot.state === "crashed") {
      killed = true;
      break;
    }
  }

  await lifecycle.stop("cleanup");
  return {
    busyLoopKilled: killed,
    busyLoopKillMs: killed ? Math.round(benchmarkNowMs() - started) : null
  };
}

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
  /** @type {{ host: import("../../../packages/miniapp-runtime/dist/worklet.js").MiniappHost, appId: string } | null} */
  let preview = null;
  const beeBackend = new KvStorageBeeBackend(kvStore);

  const createSandboxBackend = options.createSandboxBackend ?? createBareWorkletSandboxBackend;
  const confirmationChannel =
    options.requestUserConfirmation === undefined
      ? undefined
      : { confirm: (request) => options.requestUserConfirmation(request) };
  /** @type {import("../../../packages/miniapp-runtime/dist/worklet.js").DeviceManager} */
  const deviceManager =
    options.deviceManager ??
    createSimulatedDeviceManager({
      now,
      confirmationChannel,
      confirmationEffects:
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
            },
      onChromeChange: () => {
        void pushDeviceChromeState();
      }
    });
  const host = new MiniappHost({
    backend: createSandboxBackend(options.sandboxBackend ?? "bare-worker"),
    grantStore,
    kvBackend: kvStore,
    confirmationChannel,
    peerSessionManager: options.peerSessionManager,
    relayService: options.relayService,
    deviceManager,
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
    hostInfoBackend: {
      info: async () => {
        const snap = options.getHostInfoSnapshot?.() ?? {};
        return {
          platform: snap.platform ?? "android",
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
      package: async () => {
        throw new Error("Packaging is not configured on this mobile host");
      },
      publish: async () => {
        throw new Error("Publishing is not configured on this mobile host");
      },
      install: async () => {
        throw new Error("Installing from 256t ids is not configured on this mobile host");
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
    callbacks: {
      onWidgetTree: () => pushRuntime(),
      onLog: (entry) => options.send({ type: "miniapp-log", appId: entry.appId, line: entry.line }),
      onLifecycle: () => {
        options.onMiniappStateChange(host.snapshot().state !== "stopped");
        pushRuntime();
      }
    }
  });

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

    async launch(installedStore, runtime, appId) {
      devBadge = false;
      const { record, bundle } = await loadBundleForApp(installedStore, runtime, appId);
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

    async stop() {
      if (watchdogTimer !== null) {
        clearInterval(watchdogTimer);
        watchdogTimer = null;
      }

      devBadge = false;
      await stopPreviewHost();
      await host.stop();
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

    async readWorkspaceFile(documentId) {
      const snapshot = host.snapshot();
      if (snapshot.appId === null) {
        throw new Error("No mini-app is running");
      }
      return host.workspace.read(snapshot.appId, documentId);
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
    },

    async benchmark() {
      const backend = createSandboxBackend(options.sandboxBackend ?? "bare-worker");
      const spawnKill = await measureSpawnKill(backend, helloBenchmarkBundle, BENCHMARK_ITERATIONS);
      const busyLoop = await measureBusyLoopKill(backend);

      if (!busyLoop.busyLoopKilled) {
        throw new Error("busy-loop app was not killed by watchdog");
      }

      return {
        backend: backend.name,
        runtime: "bare",
        iterations: BENCHMARK_ITERATIONS,
        spawnMs: spawnKill.spawnMs,
        killMs: spawnKill.killMs,
        busyLoopKillMs: busyLoop.busyLoopKillMs,
        busyLoopKilled: busyLoop.busyLoopKilled
      };
    }
  };
}
