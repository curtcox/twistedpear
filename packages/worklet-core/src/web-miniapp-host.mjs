import { unpackPackage } from "../../app-registry/dist/index.js";
import { CasStore } from "../../cas-256t/dist/index.js";
import { GrantStore } from "../../miniapp-runtime/dist/capabilities.js";
import { generateConfirmationToken } from "../../miniapp-runtime/dist/confirm.js";
import { MiniappHost } from "../../miniapp-runtime/dist/host.js";
import { createWebSandboxProxyBackend } from "../../miniapp-runtime/dist/sandbox/web-proxy.js";
import { encodeJsonWireValue } from "../../miniapp-runtime/dist/sandbox/json-wire.js";
import { KvStorageBeeBackend } from "../../miniapp-runtime/dist/services/storage-bee-kv.js";
import {
  createHybridDeviceDrivers,
  createSimulatedDeviceManager,
} from "../../miniapp-runtime/dist/device-manager.js";
import { WebCodecsMediaCodecDriver } from "../../effects/dist/media-codec.js";
import {
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
} from "./miniapp-host-shared.mjs";

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(
      normalized.slice(index * 2, index * 2 + 2),
      16,
    );
  }

  return bytes;
}

function createProxySandboxController(send) {
  return createWebSandboxProxyBackend({
    spawn(request) {
      send({
        type: "sandbox-spawn",
        requestId: request.requestId,
        instanceId: request.instanceId,
        appId: request.appId,
        version: request.version,
        entryPath: request.entryPath,
        bundleHex: request.bundleHex,
      });
    },
    postMessage(instanceId, payload) {
      send({ type: "sandbox-post", instanceId, payload });
    },
    ping(requestId, instanceId, timeoutMs) {
      send({ type: "sandbox-ping", requestId, instanceId, timeoutMs });
    },
    kill(instanceId, reason) {
      send({ type: "sandbox-kill", instanceId, reason });
    },
    brokerResponse(requestId, response) {
      send({
        type: "sandbox-broker-response",
        requestId,
        response: encodeJsonWireValue(response),
      });
    },
  });
}

function createHostReplyConfirmationChannel(requestHostReply) {
  return {
    confirm: async (request) => {
      const reply = await requestHostReply({
        type: "confirm-request",
        token: request.token,
        kind: request.kind,
        appId: request.appId,
        publisherPublicKey: request.publisherPublicKey,
        summary: request.summary,
      });
      return { approved: reply?.approved === true, detail: reply?.detail };
    },
  };
}

function createHostReplyDeviceDrivers(requestHostReply) {
  const randomToken = () =>
    generateConfirmationToken((length) => {
      const bytes = new Uint8Array(length);
      if (typeof globalThis.crypto?.getRandomValues === "function") {
        globalThis.crypto.getRandomValues(bytes);
      } else {
        for (let i = 0; i < length; i += 1)
          bytes[i] = (Math.random() * 256) | 0;
      }
      return bytes;
    });

  return createHybridDeviceDrivers(
    ["location", "camera", "microphone", "battery", "tts", "haptics"],
    {
      availability: async (classId) => {
        const token = randomToken();
        const reply = await requestHostReply(
          { type: "device-bridge-request", token, op: "availability", classId },
          5_000,
        );
        return reply?.result ?? "unsupported";
      },
      sense: async (classId, senseOptions) => {
        const token = randomToken();
        const reply = await requestHostReply(
          {
            type: "device-bridge-request",
            token,
            op: "sense",
            classId,
            options: senseOptions ?? {},
          },
          30_000,
        );
        if (reply === null) throw new Error("Device bridge request timed out");
        if (reply.error) throw new Error(String(reply.error));
        return reply.result;
      },
      actuate: async (classId, command) => {
        const token = randomToken();
        const reply = await requestHostReply(
          {
            type: "device-bridge-request",
            token,
            op: "actuate",
            classId,
            command,
          },
          30_000,
        );
        if (reply === null) throw new Error("Device bridge request timed out");
        if (reply.error) throw new Error(String(reply.error));
      },
    },
  );
}

/**
 * Web core-worker mini-app host. Sandbox iframes are spawned on the main thread
 * via WebSandboxProxyBackend + host/web-sandbox-relay.ts (Phase W2/W3).
 */
export function createWebWorkletMiniappHost(options) {
  const kvStore = options.kvStore;
  const provider = options.provider;
  const now = options.now ?? (() => Date.now());
  const grantStore = new GrantStore(kvStore);
  let developerMode = false;
  const devBadgeRef = { current: false };
  const beeBackend = new KvStorageBeeBackend(kvStore);
  const casStore = new CasStore(kvStore, (data) => provider.sha512(data));
  const previewRef = { current: null };
  const sandboxController = createProxySandboxController(options.send);
  const { sessionInvites, pushSessionInvites } = createSessionInviteHooks(
    options,
    now,
  );
  const pushGrants = createPushGrants(options.send, grantStore);
  const confirmationChannel =
    options.requestHostReply === undefined
      ? undefined
      : createHostReplyConfirmationChannel(options.requestHostReply);
  const { peerRouteMediaBridge, streamEgressFactory, linkSupply } =
    createMediaPipeline(
      options,
      now,
      async () => new WebCodecsMediaCodecDriver(),
    );

  /** @type {import("../../miniapp-runtime/dist/host.js").MiniappHost} */
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

  /** @type {import("../../miniapp-runtime/dist/device-manager.js").DeviceManager} */
  const deviceManager =
    options.deviceManager ??
    createSimulatedDeviceManager({
      now,
      confirmationChannel,
      confirmationEffects:
        options.requestHostReply === undefined
          ? undefined
          : createConfirmationEffects(),
      onChromeChange: () => {
        void pushDeviceChromeState();
      },
      requestShareOffer: options.requestShareOffer,
      confirmShareOfferRevoke: options.confirmShareOfferRevoke,
      shareOfferTargetsPeer: options.shareOfferTargetsPeer,
      linkSupply,
      streamEgressFactory,
      drivers:
        options.requestHostReply === undefined
          ? undefined
          : createHostReplyDeviceDrivers(options.requestHostReply),
    });

  pushDeviceChromeState = createPushDeviceChromeState(
    options.send,
    deviceManager,
  );

  host = new MiniappHost({
    backend: sandboxController.backend,
    grantStore,
    kvBackend: kvStore,
    peerSessionManager: options.peerSessionManager,
    localMediaReadiness:
      options.localMediaReadiness ?? createDefaultLocalMediaReadiness(now),
    confirmCostlyLinkProbe: options.confirmCostlyLinkProbe,
    controlReservations: options.controlReservations,
    inboundMediaBackend: options.inboundMediaBackend ?? peerRouteMediaBridge,
    relayService: options.relayService,
    relayMutation: options.relayMutation,
    deviceManager,
    beeBackend,
    confirmationChannel,
    presenceBackend: createCommonPresenceBackend(options),
    hostInfoBackend: createCommonHostInfoBackend(options, "web"),
    resourceBackend: createCommonResourceBackend(kvStore),
    appsBackend: {
      package: (...args) =>
        createAppsBackendPackageAction({
          requirePublisherIdentity,
          collectWorkspaceFiles,
          provider,
          casStore,
        })(...args),
      publish: createAppsBackendPublishAction(options, casStore),
      install: async (_appId, { t256 }) => {
        const localArchive = await casStore.get(t256);
        if (localArchive !== null) {
          const unpacked = unpackPackage(provider, localArchive);
          return {
            appId: unpacked.manifest.name,
            version: unpacked.manifest.version,
            trusted: true,
          };
        }

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
    aiBackend: options.aiBackend ?? {
      chat: async () => {
        throw new Error(
          "AI is not configured on this host (set it in Settings)",
        );
      },
    },
    callbacks: {
      onWidgetTree: () => pushRuntime(),
      onLog: (entry) =>
        options.send({
          type: "miniapp-log",
          appId: entry.appId,
          line: entry.line,
        }),
      onLifecycle: () => {
        options.onMiniappStateChange(host.snapshot().state !== "stopped");
        pushRuntime();
      },
    },
  });

  requirePublisherIdentity = createPublisherIdentityLoader(
    options,
    "No publisher identity is available; create an identity first",
  );
  collectWorkspaceFiles = createWorkspaceFileCollector(host);
  pushPreviewRuntime = createPreviewRuntimePusher(options.send, previewRef);
  pushRuntime = createMainRuntimePusher(options.send, host, devBadgeRef);
  stopPreviewHost = createPreviewHostStopper(options.send, previewRef);
  createPreviewHost = createPreviewHostFactory({
    createBackend: () => sandboxController.backend,
    send: options.send,
    pushPreviewRuntime,
  });
  const { startWatchdog, clearWatchdog } = createWatchdogHelpers(host);

  async function loadBundleForApp(packageStorage, appId) {
    const version = packageStorage.activeVersion(appId);
    if (version === null) {
      throw new Error(`No installed version for ${appId}`);
    }

    const record = packageStorage
      .listInstalled()
      .find((entry) => entry.appId === appId && entry.version === version);
    if (record === undefined) {
      throw new Error(`Installed record missing for ${appId}@${version}`);
    }

    const archive = await packageStorage.readArchive(appId, version);
    if (archive === null) {
      throw new Error(`Archive missing for ${appId}@${version}`);
    }

    const unpacked = unpackPackage(provider, archive);
    const entry = record.manifest.entry;
    const bundle = unpacked.files.get(entry);
    if (bundle === undefined) {
      throw new Error(`Entry bundle missing: ${entry}`);
    }

    return { record, bundle };
  }

  return {
    sandboxController,
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

    async launch(packageStorage, appId, launchOptions = {}) {
      const { record, bundle } = await loadBundleForApp(packageStorage, appId);
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
        options.requestHostReply !== undefined
      ) {
        await launchWithCapabilityReview({
          ...launchDeps,
          requestReview: async (review) =>
            options.requestHostReply({
              type: "launch-review",
              token: generateConfirmationToken((length) =>
                provider.randomBytes(length),
              ),
              ...review,
            }),
        });
        return;
      }

      await launchWithoutReview(launchDeps);
    },

    async stop() {
      clearWatchdog();
      devBadgeRef.current = false;
      await stopPreviewHost();
      await host.stop();
      pushRuntime();
    },

    async stopPreview() {
      await stopPreviewHost();
    },

    devSideLoad: createDevSideLoadMethod({
      getDeveloperMode: () => developerMode,
      devBadgeRef,
      host,
      pushRuntime,
    }),
  };
}

export { hexToBytes };
