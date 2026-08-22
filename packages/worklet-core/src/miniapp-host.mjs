/* global TextEncoder, setTimeout, WebAssembly */
import {
  KvStorageBeeBackend,
  MiniappHost,
  MiniappLifecycle,
  createHybridDeviceDrivers,
  createSimulatedDeviceManager,
  generateConfirmationToken,
} from "../../miniapp-runtime/dist/worklet.js";
import { createOpenRouterBackend } from "../../miniapp-runtime/dist/worklet.js";
import { createSandboxBackend as createBareWorkletSandboxBackend } from "../../miniapp-runtime/dist/sandbox/worklet-factory.js";
import { unpackPackage } from "../../app-registry/dist/index.js";
import { createAppScopedIdentityBackend } from "../../host-core/dist/app-scoped-identity.js";
import { CasStore } from "../../cas-256t/dist/index.js";
import { GrantStore } from "../../miniapp-runtime/dist/capabilities.js";
import {
  createAppsBackendCompileAction,
  createAppsBackendDiagnosticsAction,
  createAppsBackendFormatAction,
  createAppsBackendPackageAction,
  createAppsBackendPreviewAction,
  createAppsBackendPublishAction,
  createCommonCasBackend,
  createCommonHostInfoBackend,
  createCommonPresenceBackend,
  createCommonResourceBackend,
  createConfirmationEffects,
  createDefaultLocalMediaReadiness,
  createDevSideLoadMethod,
  createDeviceChromeApiMethods,
  createGrantApiMethods,
  createInstallationIdentityLoader,
  createMainRuntimePusher,
  createMediaPipeline,
  createPreviewHostFactory,
  createPreviewHostStopper,
  createPreviewRuntimePusher,
  createPublisherIdentityLoader,
  createPushDeviceChromeState,
  createPushGrants,
  createSessionInviteApiMethods,
  createSessionInviteHooks,
  createUiLifecycleMethods,
  createWatchdogHelpers,
  createWorkspaceFileCollector,
  launchWithCapabilityReview,
  launchWithoutReview,
  previousDeclaredCapabilities,
} from "./miniapp-host-shared.mjs";
import { webAssemblyInstantiateAvailable } from "./webassembly-available.mjs";

const BENCHMARK_ITERATIONS = 5;
const BENCHMARK_WATCHDOG_MS = 250;

const helloBenchmarkBundle = new TextEncoder()
  .encode(`import { ui } from "@twistedpear/miniapp-sdk";

await ui.render({
  root: {
    id: "root",
    type: "view",
    children: [{ id: "title", type: "text", props: { value: "Bench" } }]
  }
});
`);

const wasmNopModule = Uint8Array.from([
  0, 97, 115, 109, 1, 0, 0, 0, 1, 4, 1, 96, 0, 0, 3, 2, 1, 0, 7, 7, 1, 3, 114,
  117, 110, 0, 0, 10, 4, 1, 2, 0, 11,
]);

const busyLoopBenchmarkBundle = new TextEncoder().encode(`
while (true) {}
`);

function benchmarkNowMs() {
  return Date.now();
}

function benchmarkLifecycleClock(watchdogMs) {
  return {
    now: () => Date.now(),
    delay: (ms) => new Promise((resolveDelay) => setTimeout(resolveDelay, ms)),
    ...(watchdogMs === undefined ? {} : { watchdogMs }),
  };
}

function benchmarkAverage(values) {
  return Number(
    (values.reduce((sum, value) => sum + value, 0) / values.length).toFixed(1),
  );
}

async function benchmarkSleep(ms) {
  await new Promise((resolveSleep) => setTimeout(resolveSleep, ms));
}

async function measureWasmOnBareIsolate() {
  if (!webAssemblyInstantiateAvailable()) {
    return false;
  }
  try {
    const { instance } = await WebAssembly.instantiate(wasmNopModule);
    const run = instance.exports.run;
    if (typeof run !== "function") {
      return false;
    }
    run();
    return true;
  } catch {
    return false;
  }
}

async function measureSpawnKill(backend, bundle, iterations) {
  const spawnLatencies = [];
  const killLatencies = [];

  for (let index = 0; index < iterations; index += 1) {
    const lifecycle = new MiniappLifecycle(
      backend,
      {
        appId: "bench",
        version: "1.0.0",
        entryPath: "bundle.js",
        bundle,
        brokerEndpoint: {
          request: async (request) => ({
            id: request.id,
            ok: true,
            result: "ok",
          }),
        },
      },
      benchmarkLifecycleClock(),
    );

    const spawnStarted = benchmarkNowMs();
    await lifecycle.launch();
    spawnLatencies.push(benchmarkNowMs() - spawnStarted);

    const killStarted = benchmarkNowMs();
    await lifecycle.stop("bench");
    killLatencies.push(benchmarkNowMs() - killStarted);
  }

  return {
    spawnMs: benchmarkAverage(spawnLatencies),
    killMs: benchmarkAverage(killLatencies),
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
        request: async (request) => ({ id: request.id, ok: true }),
      },
    },
    benchmarkLifecycleClock(BENCHMARK_WATCHDOG_MS),
  );

  const started = benchmarkNowMs();
  await lifecycle.launch();

  let killed = false;
  let appError = null;
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await benchmarkSleep(50);
    const appErrorNow = lifecycle.lastError();
    if (typeof appErrorNow === "string" && appErrorNow.length > 0) {
      appError = appErrorNow;
      break;
    }
    const snapshot = await lifecycle.watchdogPing();
    const afterPingError = lifecycle.lastError();
    if (typeof afterPingError === "string" && afterPingError.length > 0) {
      appError = afterPingError;
      break;
    }
    if (snapshot.state === "crashed") {
      killed = true;
      break;
    }
  }

  await lifecycle.stop("cleanup");
  if (appError !== null) {
    throw new Error(`sandbox worker: ${appError}`);
  }
  return {
    busyLoopKilled: killed,
    busyLoopKillMs: killed ? Math.round(benchmarkNowMs() - started) : null,
  };
}

/**
 * Worklet-side mini-app host wrapper. Keeps Phase 4 runtime wiring out of entry.mjs.
 *
 * Host deltas are options: `browserDeviceClasses`, `defaultPlatform`, `enableBenchmark`,
 * sandbox backend injection, AI/CAS/apps backends, and confirmation/device bridges.
 */
export function createWorkletMiniappHost(options) {
  const kvStore = options.kvStore;
  const now = options.now ?? (() => Date.now());
  const grantStore = new GrantStore(kvStore);
  let developerMode = false;
  const devBadgeRef = { current: false };
  /** @type {{baseUrl: string, apiKey: string, model: string, allowedModels?: string[]} | null} */
  let aiConfig = options.aiConfig ?? null;
  const casStore = new CasStore(kvStore, (data) =>
    options.provider.sha512(data),
  );
  const previewRef = { current: null };
  const beeBackend = new KvStorageBeeBackend(kvStore);
  const browserDeviceClasses = options.browserDeviceClasses ?? [
    "location",
    "camera",
    "microphone",
    "battery",
    "tts",
    "haptics",
  ];
  const defaultPlatform = options.defaultPlatform ?? "desktop";
  const { sessionInvites, pushSessionInvites } = createSessionInviteHooks(
    options,
    now,
  );
  const pushGrants = createPushGrants(options.send, grantStore);
  const { peerRouteMediaBridge, streamEgressFactory, linkSupply } =
    createMediaPipeline(options, now, async () => {
      throw new Error("A platform media codec is not configured on this host.");
    });
  const confirmationChannel =
    options.requestUserConfirmation === undefined
      ? undefined
      : { confirm: (request) => options.requestUserConfirmation(request) };
  const confirmationEffects =
    options.requestUserConfirmation === undefined
      ? undefined
      : createConfirmationEffects();

  /** @type {import("../../miniapp-runtime/dist/worklet.js").MiniappHost} */
  let host;
  /** @type {ReturnType<typeof createPushDeviceChromeState>} */
  let pushDeviceChromeState;
  /** @type {ReturnType<typeof createMainRuntimePusher>} */
  let pushRuntime;
  /** @type {ReturnType<typeof createPreviewRuntimePusher>} */
  let pushPreviewRuntime;
  /** @type {ReturnType<typeof createPreviewHostStopper>} */
  let stopPreviewHost;
  /** @type {ReturnType<typeof createPreviewHostFactory>} */
  let createPreviewHost;
  /** @type {ReturnType<typeof createPublisherIdentityLoader>} */
  let requirePublisherIdentity;
  /** @type {ReturnType<typeof createWorkspaceFileCollector>} */
  let collectWorkspaceFiles;
  let writeWorkspaceFile;
  let streamDevLine = options.streamDevLine;

  /** @type {import("../../miniapp-runtime/dist/worklet.js").DeviceManager} */
  const deviceManager =
    options.deviceManager ??
    createSimulatedDeviceManager({
      now,
      confirmationChannel,
      confirmationEffects,
      onChromeChange: () => {
        void pushDeviceChromeState();
      },
      requestShareOffer: options.requestShareOffer,
      confirmShareOfferRevoke: options.confirmShareOfferRevoke,
      shareOfferTargetsPeer: options.shareOfferTargetsPeer,
      linkSupply,
      streamEgressFactory,
      drivers:
        typeof options.requestDeviceBridge === "function"
          ? createHybridDeviceDrivers(browserDeviceClasses, {
              availability: (classId) =>
                options.requestDeviceBridge({ op: "availability", classId }),
              sense: (classId, senseOptions) =>
                options.requestDeviceBridge({
                  op: "sense",
                  classId,
                  options: senseOptions ?? {},
                }),
              actuate: (classId, command) =>
                options.requestDeviceBridge({
                  op: "actuate",
                  classId,
                  command,
                }),
            })
          : undefined,
    });

  const createSandboxBackend =
    options.createSandboxBackend ?? createBareWorkletSandboxBackend;
  pushDeviceChromeState = createPushDeviceChromeState(
    options.send,
    deviceManager,
  );

  host = new MiniappHost({
    backend: createSandboxBackend(options.sandboxBackend ?? "bare-worker"),
    grantStore,
    kvBackend: kvStore,
    confirmationChannel,
    maxMessageBytes: 2 * 1024 * 1024,
    identityBackend:
      options.identityBackend ??
      createAppScopedIdentityBackend({
        provider: options.provider,
        getInstallationIdentity: createInstallationIdentityLoader(options),
      }),
    aiBackend: options.aiBackend ?? {
      chat: async (appId, request) => {
        if (aiConfig === null || !aiConfig.baseUrl || !aiConfig.apiKey) {
          throw new Error(
            "AI is not configured on this host (set it in Settings)",
          );
        }

        return createOpenRouterBackend(aiConfig).chat(appId, request);
      },
      stream: async function* (appId, request) {
        if (aiConfig === null || !aiConfig.baseUrl || !aiConfig.apiKey) {
          throw new Error(
            "AI is not configured on this host (set it in Settings)",
          );
        }
        yield* createOpenRouterBackend(aiConfig).stream(appId, request);
      },
      embed: async (appId, request) => {
        if (
          aiConfig === null ||
          !aiConfig.baseUrl ||
          !aiConfig.apiKey ||
          !aiConfig.embeddingModel
        ) {
          throw new Error(
            "Embeddings are not configured on this host (set an embedding model in Settings)",
          );
        }
        return createOpenRouterBackend(aiConfig).embed(appId, request);
      },
    },
    beeBackend: {
      descriptor: (appId) => beeBackend.descriptor(appId),
      get: (appId, key) => beeBackend.get(appId, key),
      put: (appId, key, value) => beeBackend.put(appId, key, value),
      del: (appId, key) => beeBackend.del(appId, key),
      list: (appId, listOptions) => beeBackend.list(appId, listOptions),
    },
    presenceBackend: createCommonPresenceBackend(options),
    announceService: options.announceService,
    hostInfoBackend: createCommonHostInfoBackend(options, defaultPlatform),
    resourceBackend: createCommonResourceBackend(kvStore),
    appsBackend: {
      compile: (...args) =>
        createAppsBackendCompileAction({
          collectWorkspaceFiles,
          writeWorkspaceFile,
        })(...args),
      format: (...args) => createAppsBackendFormatAction()(...args),
      diagnostics: (...args) =>
        createAppsBackendDiagnosticsAction({ collectWorkspaceFiles })(...args),
      package: (...args) =>
        createAppsBackendPackageAction({
          requirePublisherIdentity,
          collectWorkspaceFiles,
          provider: options.provider,
          casStore,
        })(...args),
      publish: createAppsBackendPublishAction(options, casStore),
      install: async (_appId, { t256 }) => {
        if (options.installFromT256 === undefined) {
          throw new Error(
            "Installing from 256t ids is not configured on this host",
          );
        }

        return options.installFromT256(t256);
      },
      preview: (...args) =>
        createAppsBackendPreviewAction({
          collectWorkspaceFiles,
          stopPreviewHost,
          createPreviewHost,
          previewRef,
          pushPreviewRuntime,
          now,
        })(...args),
      stopPreview: async () => {
        await stopPreviewHost();
      },
    },
    casBackend: createCommonCasBackend(casStore),
    peerSessionManager: options.peerSessionManager,
    localMediaReadiness:
      options.localMediaReadiness ?? createDefaultLocalMediaReadiness(now),
    confirmCostlyLinkProbe: options.confirmCostlyLinkProbe,
    controlReservations: options.controlReservations,
    inboundMediaBackend: options.inboundMediaBackend ?? peerRouteMediaBridge,
    relayService: options.relayService,
    relayMutation: options.relayMutation,
    ...(options.freenetBackend === undefined
      ? {}
      : { freenetBackend: options.freenetBackend }),
    deviceManager,
    callbacks: {
      onWidgetTree: () => pushRuntime(),
      onLog: (entry) =>
        options.send({
          type: "miniapp-log",
          appId: entry.appId,
          line: entry.line,
        }),
      onAppError: (report) => {
        streamDevLine?.({
          type: "app-error",
          appId: report.appId,
          phase: report.phase,
          message: report.message,
          event: report.event,
          nodeId: report.nodeId,
        });
        pushRuntime?.();
      },
      onDiagnostics: (entry) => {
        streamDevLine?.({
          type: "app-log",
          appId: entry.appId,
          level: entry.level,
          message: entry.message,
        });
        pushRuntime?.();
      },
      onLifecycle: () => {
        options.onMiniappStateChange(host.running().length > 0);
        pushRuntime();
      },
    },
  });

  requirePublisherIdentity = createPublisherIdentityLoader(
    options,
    "No publisher identity is available; start the node first",
  );
  collectWorkspaceFiles = createWorkspaceFileCollector(host);
  writeWorkspaceFile = (appId, path, content) =>
    host.workspace.write(appId, path, content);
  pushPreviewRuntime = createPreviewRuntimePusher(options.send, previewRef);
  pushRuntime = createMainRuntimePusher(options.send, host, devBadgeRef, {
    slot: "main",
  });
  stopPreviewHost = createPreviewHostStopper(options.send, previewRef);
  createPreviewHost = createPreviewHostFactory({
    createBackend: () =>
      createSandboxBackend(options.sandboxBackend ?? "bare-worker"),
    send: options.send,
    pushPreviewRuntime,
  });
  const { startWatchdog, clearWatchdog } = createWatchdogHelpers(host);

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
    ...createUiLifecycleMethods({ host, pushRuntime, previewRef }),
    ...createGrantApiMethods({ grantStore, now, pushGrants }),
    ...createDeviceChromeApiMethods({ deviceManager, pushDeviceChromeState }),
    ...createSessionInviteApiMethods({ sessionInvites, pushSessionInvites }),

    isDeveloperMode() {
      return developerMode;
    },

    setDeveloperMode(enabled) {
      developerMode = enabled;
      options.onDeveloperModeChange(enabled);
    },

    setDevLineSink(next) {
      streamDevLine = next;
    },

    async launch(installedStore, runtime, appId, launchOptions = {}) {
      const { record, bundle } = await loadBundleForApp(
        installedStore,
        runtime,
        appId,
      );
      const launchDeps = {
        record,
        grantStore,
        now,
        pushGrants,
        host,
        bundle,
        startWatchdog,
        pushRuntime,
        devBadgeRef,
      };

      if (
        launchOptions.skipReview !== true &&
        options.requestLaunchReview !== undefined
      ) {
        await launchWithCapabilityReview({
          ...launchDeps,
          previousDeclared: previousDeclaredCapabilities(
            installedStore,
            record,
          ),
          requestReview: async (review) =>
            options.requestLaunchReview({
              token: generateConfirmationToken((length) =>
                options.provider.randomBytes(length),
              ),
              ...review,
            }),
        });
        return;
      }

      await launchWithoutReview(launchDeps);
    },

    async stop(reason = "stopped") {
      await host.stop(reason);
      if (host.running().length === 0) {
        clearWatchdog();
        devBadgeRef.current = false;
        await stopPreviewHost();
      }
      pushRuntime();
    },

    async stopPreview() {
      await stopPreviewHost();
    },

    setAiConfig(config) {
      aiConfig = config ?? null;
    },

    ...(options.enableBenchmark === true
      ? {
          async benchmark() {
            const backend = createSandboxBackend(
              options.sandboxBackend ?? "bare-worker",
            );
            const spawnKill = await measureSpawnKill(
              backend,
              helloBenchmarkBundle,
              BENCHMARK_ITERATIONS,
            );
            const busyLoop = await measureBusyLoopKill(backend);
            const wasmExecuted = await measureWasmOnBareIsolate();

            if (!busyLoop.busyLoopKilled) {
              throw new Error(
                "busy-loop sandbox worker was not killed by watchdog",
              );
            }

            return {
              backend: backend.name,
              runtime: "bare",
              wasmExecuted,
              iterations: BENCHMARK_ITERATIONS,
              spawnMs: spawnKill.spawnMs,
              killMs: spawnKill.killMs,
              busyLoopKillMs: busyLoop.busyLoopKillMs,
              busyLoopKilled: busyLoop.busyLoopKilled,
            };
          },
        }
      : {}),

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

    setNotifyEnabled(appId, enabled) {
      host.setNotifyEnabled(appId, enabled);
      pushRuntime();
    },

    tapNotification(id) {
      return host.tapNotification(id);
    },

    devSideLoad: createDevSideLoadMethod({
      getDeveloperMode: () => developerMode,
      devBadgeRef,
      host,
      pushRuntime,
    }),
  };
}
