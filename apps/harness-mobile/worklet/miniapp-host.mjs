import {
  CAPABILITY_DEFINITIONS,
  KvStorageBeeBackend,
  GrantStore,
  HOST_API_VERSION,
  MiniappHost,
  MiniappLifecycle,
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
  const grantStore = new GrantStore(kvStore);
  let developerMode = false;
  let devBadge = false;
  let watchdogTimer = null;
  const beeBackend = new KvStorageBeeBackend(kvStore);

  const createSandboxBackend = options.createSandboxBackend ?? createBareWorkletSandboxBackend;
  const host = new MiniappHost({
    backend: createSandboxBackend(options.sandboxBackend ?? "bare-worker"),
    grantStore,
    kvBackend: kvStore,
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
      await host.stop();
      pushRuntime();
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
