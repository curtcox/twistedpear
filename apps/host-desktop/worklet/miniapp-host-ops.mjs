/**
 * Desktop host mini-app runtime wiring: the worklet mini-app host, its transport
 * announce service, bundled-catalog seeding, and the Hyperdrive package manager.
 */
import {
  bytesToHex,
  hexToBytes,
} from "../../../packages/reticulum-ts/dist/crypto/bytes.js";
import { Identity } from "../../../packages/reticulum-ts/dist/identity.js";
import {
  DestinationDirection,
  DestinationType,
} from "../../../packages/reticulum-ts/dist/destination.js";
import {
  buildAppAnnounceSummary,
  encodeAppAnnounceData,
  unpackPackage,
  verifyPackage,
} from "../../../packages/app-registry/dist/index.js";
import {
  HOST_API_VERSION,
  createWorkletFlagRelayService,
  generateConfirmationToken,
} from "../../../packages/miniapp-runtime/dist/worklet.js";
import { createDelegatedWebRtcMediaPlaneOpener } from "../../../packages/miniapp-runtime/dist/media-stream.js";
import { BridgeForwarder } from "../../../packages/host-core/dist/bridge-forwarder.js";
import {
  createMiniappAnnounceService,
  createWorkletMiniappHost,
} from "../../../packages/worklet-core/src/index.mjs";

export function createMiniappHostOps(deps) {
  const {
    state,
    provider,
    runtime,
    status,
    send,
    log,
    pushStatus,
    hostDataPath,
    bundledCatalogModule,
    NodeWorkerSandboxBackend,
    freenetBackendProxy,
    peerSessionManagerProxy,
    requestRendererReply,
    inboundBandwidthLimiter,
    outboundBandwidthLimiter,
    webRtcSessionByFingerprint,
  } = deps;
  const applyInterfaceConfig = (...args) => deps.applyInterfaceConfig(...args);
  const runtimeKeyValueStore = (...args) => deps.runtimeKeyValueStore(...args);
  const ensureReticulum = (...args) => deps.ensureReticulum(...args);
  const resolveIdentity = (...args) => deps.resolveIdentity(...args);
  const ensureCatalog = (...args) => deps.ensureCatalog(...args);
  const persistCatalogState = (...args) => deps.persistCatalogState(...args);
  const pushCatalog = (...args) => deps.pushCatalog(...args);
  const ensureTrustStore = (...args) => deps.ensureTrustStore(...args);
  const pushTrustList = (...args) => deps.pushTrustList(...args);
  const ensureEntryCasStore = (...args) => deps.ensureEntryCasStore(...args);
  const publishArchiveFromWorklet = (...args) =>
    deps.publishArchiveFromWorklet(...args);
  const publishArchiveAsIdentity = (...args) =>
    deps.publishArchiveAsIdentity(...args);
  const installFromT256 = (...args) => deps.installFromT256(...args);
  const relayConfigStore = runtimeKeyValueStore();
  const relayConfigStoreKey = "relay-config-v1";
  let relayConfigLoaded = false;

  async function persistRelayConfig() {
    await relayConfigStore.set(
      relayConfigStoreKey,
      new TextEncoder().encode(
        JSON.stringify({
          mode: status.relayMode,
          directions: status.relayDirections,
          policy: state.relayPolicy,
          enabled: {
            tcp: status.tcpEnabled,
            auto: status.autoEnabled,
            bluetooth: status.bleEnabled,
            rnode: status.rnodeEnabled,
          },
        }),
      ),
    );
  }

  async function loadRelayConfig() {
    if (relayConfigLoaded) return;
    relayConfigLoaded = true;
    const stored = await relayConfigStore.get(relayConfigStoreKey);
    if (stored === null) return;
    try {
      const saved = JSON.parse(new TextDecoder().decode(stored));
      ensureMiniappHost();
      const relay = state.relayService;
      if (relay === null) throw new Error("Relay service is unavailable");
      if (saved.enabled && typeof saved.enabled === "object") {
        for (const kind of ["tcp", "auto", "bluetooth", "rnode"]) {
          if (saved.enabled[kind] === true) await relay.enable(kind);
          else if (saved.enabled[kind] === false) await relay.disable(kind);
        }
      }
      if (["off", "bridge", "transport-node"].includes(saved.mode))
        await relay.setMode(saved.mode);
      if (saved.directions && typeof saved.directions === "object") {
        for (const [kind, direction] of Object.entries(saved.directions)) {
          if (["tx", "rx", "both"].includes(direction))
            await relay.setDirection(kind, direction);
        }
      }
      if (saved.policy && typeof saved.policy === "object")
        await relay.setPolicy(saved.policy);
    } catch (error) {
      log(
        `Ignored invalid persisted relay config: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  const transportAnnounceService = createMiniappAnnounceService({
    provider,
    bytesToHex,
    DestinationDirection,
    DestinationType,
    getNode: () => ensureReticulum(),
    getIdentity: () => resolveIdentity(),
    requireIdentity: true,
    copyAppData: false,
  });

  function ensureMiniappHost() {
    if (state.miniappHost === null) {
      const relayService = createWorkletFlagRelayService({
        initialMode: status.transportEnabled ? "transport-node" : "off",
        getFlags: () => ({
          tcpEnabled: status.tcpEnabled,
          autoEnabled: status.autoEnabled,
          bleEnabled: status.bleEnabled,
          rnodeEnabled: status.rnodeEnabled,
          tcpOnline: state.tcpIface?.online === true,
          autoOnline: state.autoIface?.online === true || status.autoPeers > 0,
          bleOnline: status.bleConnected === true,
          rnodeOnline: status.rnodeConnected === true,
        }),
        setFlags(patch) {
          if (patch.tcpEnabled !== undefined)
            status.tcpEnabled = patch.tcpEnabled;
          if (patch.autoEnabled !== undefined)
            status.autoEnabled = patch.autoEnabled;
          if (patch.bleEnabled !== undefined)
            status.bleEnabled = patch.bleEnabled;
          if (patch.rnodeEnabled !== undefined)
            status.rnodeEnabled = patch.rnodeEnabled;
        },
        async applyInterfaceConfig() {
          await applyInterfaceConfig();
          state.relayBridge?.refresh();
          await persistRelayConfig();
        },
        setTcpTarget(host, port) {
          state.pendingTarget = { targetHost: host, targetPort: port };
        },
        setRnodeOptions(options) {
          if (typeof options.deviceId === "string")
            state.pendingRnodeDeviceId = options.deviceId;
          if (typeof options.portPath === "string")
            state.pendingRnodePortPath = options.portPath;
          if (typeof options.baudRate === "number")
            state.pendingRnodeBaudRate = options.baudRate;
        },
        async setMode(mode) {
          const node = await ensureReticulum();
          state.relayBridge?.stop();
          state.relayBridge = null;
          node.setTransportEnabled(mode === "transport-node");
          status.transportEnabled = mode === "transport-node";
          status.relayMode = mode;
          if (mode === "bridge") {
            state.relayBridge = new BridgeForwarder({
              provider,
              getInterfaces: () => node.listInterfaces(),
              getPolicy: () => state.relayPolicy,
            });
            state.relayBridge.start();
          }
          pushStatus();
          await persistRelayConfig();
        },
        async setDirection(kind, direction) {
          const iface =
            kind === "tcp"
              ? state.tcpIface
              : kind === "auto"
                ? state.autoIface
                : kind === "bluetooth"
                  ? state.bleIface
                  : kind === "rnode"
                    ? state.rnodeIface
                    : null;
          if (iface !== null) {
            iface.incoming = direction !== "tx";
            iface.outgoing = direction !== "rx";
          }
          status.relayDirections = {
            ...status.relayDirections,
            [kind]: direction,
          };
          state.relayBridge?.refresh();
          pushStatus();
          await persistRelayConfig();
        },
        async setPolicy(policy) {
          state.relayPolicy = policy;
          await persistRelayConfig();
        },
      });
      state.relayService = relayService;
      state.miniappHost = createWorkletMiniappHost({
        provider,
        kvStore: runtimeKeyValueStore(),
        beeStoragePath: hostDataPath("miniapp-bee-store"),
        ...(NodeWorkerSandboxBackend === null
          ? {}
          : {
              createSandboxBackend: () => new NodeWorkerSandboxBackend(),
              sandboxBackend: "node-worker",
            }),
        getPresenceSnapshot: () => ({
          ...status,
          autoPeers:
            status.autoPeers +
            (state.peerSessionManager?.routes.list().length ?? 0),
        }),
        relayMutation: (notice) =>
          send({ type: "relay-attribution", ...notice }),
        getHostInfoSnapshot: () => {
          const interfaceTypes = [];
          if (status.tcpEnabled) interfaceTypes.push("tcp");
          if (status.autoEnabled) interfaceTypes.push("auto");
          if (status.bleEnabled) interfaceTypes.push("ble");
          if (status.rnodeEnabled) interfaceTypes.push("rnode");
          if (
            (status.freenetEnabled && status.freenetConfigured) ||
            status.freenetInterfaceEnabled
          ) {
            interfaceTypes.push("freenet");
          }
          return {
            platform: "desktop",
            hostVersion: HOST_API_VERSION,
            roles: {
              transport: status.transportEnabled === true,
              seeder: true,
              propagation: status.propagationEnabled === true,
            },
            interfaceTypes,
            quotas: {
              kvQuotaBytes: null,
              seedStorageUsedBytes: status.storageUsedBytes ?? null,
              seedStorageQuotaBytes: null,
              memoryBytes: null,
            },
            dropCensus: status.dropCensus ?? { byReason: {}, byPeer: {} },
          };
        },
        send,
        async launchInstalledApp(appId) {
          const { installedStore: installed } = ensureCatalog();
          await ensureMiniappHost().launch(installed, runtime, appId);
        },
        peerSessionManager: peerSessionManagerProxy,
        realtimeReservations: {
          reserveRealtime: (bytesPerSecond) =>
            outboundBandwidthLimiter.reserve("realtime", bytesPerSecond),
        },
        controlReservations: {
          reserveControl: (bytesPerSecond) =>
            outboundBandwidthLimiter.reserve("control", bytesPerSecond),
        },
        onInboundMediaFrame(appId, stream, frame, offer) {
          send({
            type: "inbound-media-frame",
            appId,
            handle: stream.handle,
            sink: stream.sink,
            encoding: offer.encoding,
            dataHex: bytesToHex(frame),
          });
        },
        async openMediaCodec(configuration) {
          const transact = async (op, sample) => {
            const token = generateConfirmationToken((length) =>
              provider.randomBytes(length),
            );
            const reply = await requestRendererReply(
              {
                type: "media-codec-request",
                token,
                op,
                configuration,
                captureAtUs: sample.captureAtUs,
                dataHex: bytesToHex(sample.bytes),
              },
              15_000,
            );
            if (
              reply?.error !== undefined ||
              typeof reply?.dataHex !== "string"
            )
              throw new Error(
                reply?.error ?? "Desktop media codec request timed out.",
              );
            return {
              captureAtUs: sample.captureAtUs,
              bytes: hexToBytes(reply.dataHex),
              ...(op === "encode" ? { codec: configuration.codec } : {}),
            };
          };
          return {
            implementation: "webcodecs",
            supports(candidate) {
              return (
                candidate.sampleKind === "audio" &&
                (candidate.codec === "opus" || candidate.codec === "pcm")
              );
            },
            encode(_candidate, sample) {
              return transact("encode", sample);
            },
            decode(_candidate, sample) {
              return transact("decode", sample);
            },
            async close() {},
          };
        },
        openCasPlane: {
          put: (frame) => ensureEntryCasStore().put(frame),
        },
        openPearsBulkPlane: {
          async append({ appId, peer, frame, sequence }) {
            const driveManager = await ensurePackageDriveManager();
            if (driveManager.activeDrive === null) {
              await driveManager.createDrive();
            }
            const drive = driveManager.activeDrive;
            if (drive === null)
              throw new Error(
                "Hyperdrive is not initialized for pears-bulk media.",
              );
            const safePeer = peer.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 64);
            const path = `/media-streams/${appId}/${safePeer}/${String(sequence).padStart(8, "0")}.tpd2`;
            await drive.put(path, frame);
            return { path };
          },
        },
        openWebRtcMediaPlane: createDelegatedWebRtcMediaPlaneOpener(
          (state.attachWebRtcMediaTrack = async ({ appId, peer, demand }) => {
            const confirmed = peerSessionManagerProxy.route(appId, {
              id: peer,
            });
            if (confirmed?.dataPlane !== "webrtc") {
              throw new Error(
                "No authenticated WebRTC route for media tracks.",
              );
            }
            const sessionId = webRtcSessionByFingerprint.get(
              confirmed.fingerprint,
            );
            if (sessionId === undefined) {
              throw new Error(
                "WebRTC session is missing for media track attach.",
              );
            }
            const token = generateConfirmationToken((length) =>
              provider.randomBytes(length),
            );
            const reply = await requestRendererReply(
              {
                type: "peer-webrtc-media-attach",
                token,
                sessionId,
                classId: demand.classId,
                tierId: demand.tierId,
              },
              30_000,
            );
            if (reply?.attached !== true) {
              throw new Error(
                typeof reply?.error === "string"
                  ? reply.error
                  : "WebRTC media track attach failed.",
              );
            }
            return {
              sessionId,
              bytesSent:
                typeof reply.bytesSent === "number" ? reply.bytesSent : 0,
              voiceProcessing: reply.voiceProcessing ?? null,
              quality: () => ({
                goodputBps: 2_000_000,
                rttMs: 50,
                jitterMs: 10,
                lossRatio: 0,
                mtu: 1_200,
                source: "declared",
                samples: 1,
                confidence: "low",
              }),
              close: async () => {
                const detachToken = generateConfirmationToken((length) =>
                  provider.randomBytes(length),
                );
                await requestRendererReply(
                  {
                    type: "peer-webrtc-media-detach",
                    token: detachToken,
                    sessionId,
                    classId: demand.classId,
                  },
                  10_000,
                );
              },
            };
          }),
        ),
        async requestShareOffer({ appId, purpose }) {
          const peer = peerSessionManagerProxy.list(appId)[0];
          if (peer === undefined) return null;
          const token = generateConfirmationToken((length) =>
            provider.randomBytes(length),
          );
          const reply = await requestRendererReply({
            type: "confirm-request",
            token,
            kind: "device-share-offer",
            appId,
            publisherPublicKey: "host-authenticated-peer",
            summary: {
              purpose,
              peer: peer.displayLabel,
              class: "microphone",
              tier: "pcm",
              quality: "16k-opus",
              duration: "15 minutes",
            },
          });
          return reply?.approved === true
            ? {
                targetKind: "peer",
                targetId: peer.handle.id,
                displayLabel: peer.displayLabel,
                classId: "microphone",
                tierId: "pcm",
                maxRung: "16k-opus",
                ttlMs: 15 * 60_000,
              }
            : null;
        },
        async confirmShareOfferRevoke(offer) {
          const token = generateConfirmationToken((length) =>
            provider.randomBytes(length),
          );
          const reply = await requestRendererReply({
            type: "confirm-request",
            token,
            kind: "device-share-revoke",
            appId: offer.appId,
            publisherPublicKey: "host-authenticated-peer",
            summary: { peer: offer.displayLabel, class: offer.classId },
          });
          return reply?.approved === true;
        },
        async confirmCostlyLinkProbe({ appId, peer, budgetBytes }) {
          const token = generateConfirmationToken((length) =>
            provider.randomBytes(length),
          );
          const reply = await requestRendererReply({
            type: "confirm-request",
            token,
            kind: "link-probe",
            appId,
            publisherPublicKey: "host-authenticated-peer",
            summary: { peer: peer.displayLabel, budgetBytes },
          });
          return reply?.approved === true;
        },
        relayService,
        freenetBackend: freenetBackendProxy,
        announceService: transportAnnounceService,
        getPublisherIdentity: () => resolveIdentity(),
        publishArchive: publishArchiveFromWorklet,
        installFromT256,
        async requestUserConfirmation(request) {
          const reply = await requestRendererReply({
            type: "confirm-request",
            token: request.token,
            kind: request.kind,
            appId: request.appId,
            publisherPublicKey: request.publisherPublicKey,
            summary: request.summary,
          });
          return { approved: reply?.approved === true, detail: reply?.detail };
        },
        async requestDeviceBridge(request) {
          const token = generateConfirmationToken((length) =>
            provider.randomBytes(length),
          );
          const reply = await requestRendererReply(
            {
              type: "device-bridge-request",
              token,
              op: request.op,
              classId: request.classId,
              options: request.options ?? {},
            },
            30_000,
          );
          if (reply === null) {
            throw new Error("Device bridge request timed out");
          }
          if (reply.error) {
            throw new Error(String(reply.error));
          }
          return reply.result;
        },
        async requestLaunchReview(review) {
          return requestRendererReply({
            type: "launch-review",
            token: review.token,
            appId: review.appId,
            publisherPublicKey: review.publisherPublicKey,
            version: review.version,
            capabilities: review.capabilities,
            riskTier: review.riskTier,
          });
        },
        onDeveloperModeChange(enabled) {
          status.developerMode = enabled;
          pushStatus();
        },
        onMiniappStateChange(running) {
          status.miniappRunning = running;
          pushStatus();
        },
      });
    }

    return state.miniappHost;
  }

  const BUNDLED_SEEDED_KEY = "bundled-catalog:v1-seeded";

  async function seedBundledCatalogIfNeeded() {
    if (bundledCatalogModule === null) {
      return;
    }

    const kv = runtimeKeyValueStore();
    if ((await kv.get(BUNDLED_SEEDED_KEY)) !== null) {
      return;
    }

    const { catalogStore: catalog, installedStore: installed } =
      ensureCatalog();
    if (catalog.list().length > 0 || installed.list().length > 0) {
      return;
    }

    const platformIdentity = Identity.fromBytes(
      provider,
      hexToBytes(
        bundledCatalogModule.TWISTEDPEAR_PLATFORM_PUBLISHER.privateKeyHex,
      ),
    );
    if (platformIdentity === null) {
      log("Bundled catalog: invalid platform publisher identity");
      return;
    }

    const publisher = bundledCatalogModule.TWISTEDPEAR_PLATFORM_PUBLISHER;
    const alreadyTrusted = await ensureTrustStore().isTrusted(
      publisher.publisherPublicKey,
    );
    if (!alreadyTrusted) {
      await ensureTrustStore().add({
        publisherPublicKey: publisher.publisherPublicKey,
        label: publisher.label,
        addedAt: Date.now(),
      });
    }

    const cas = ensureEntryCasStore();
    for (const bundled of bundledCatalogModule.BUNDLED_APPS) {
      const archive = hexToBytes(bundled.archiveHex);
      await cas.put(archive);
      const unpacked = unpackPackage(provider, archive);
      const verified = verifyPackage(provider, archive, {
        hostApiVersion: HOST_API_VERSION,
      });
      const summary = buildAppAnnounceSummary(provider, platformIdentity, {
        manifest: verified.manifest,
        packageSize: archive.length,
        packageHash: unpacked.packageHash,
        resourceAvailable: true,
      });
      catalog.ingest({
        destinationHash: `bundled:${bundled.appId}`,
        appData: encodeAppAnnounceData(summary),
        manifest: verified.manifest,
        packageHash: unpacked.packageHash,
      });
      const archivePath = `packages/${bundled.appId}/${verified.manifest.version}.tpkg`;
      await runtime.store.set(archivePath, archive);
      installed.install(
        {
          appId: bundled.appId,
          version: verified.manifest.version,
          packageHash: verified.packageHash,
          installedAt: Date.now(),
          manifest: verified.manifest,
          archivePath,
        },
        archive.length,
      );
      log(
        `Bundled seed: installed ${bundled.appId} v${verified.manifest.version}`,
      );
    }

    await kv.set(BUNDLED_SEEDED_KEY, new TextEncoder().encode("1"));
    await persistCatalogState();
    pushCatalog();
    await pushTrustList();

    try {
      await ensureReticulum();
      for (const bundled of bundledCatalogModule.BUNDLED_APPS) {
        const archive = hexToBytes(bundled.archiveHex);
        await publishArchiveAsIdentity(platformIdentity, {
          t256: bundled.t256,
          archive,
        });
      }
      log("Bundled catalog: platform announces published");
    } catch (error) {
      log(
        `Bundled catalog: local seed ok; announce deferred (${error instanceof Error ? error.message : String(error)})`,
      );
    }
  }

  async function ensurePackageDriveManager() {
    if (state.packageDriveManager === null) {
      const { createSwarm, DriveManager } =
        await import("../../../packages/bridge-hyper/dist/worklet-hyper.js");
      state.packageSwarm = createSwarm({
        inboundBandwidthLimiter,
        outboundBandwidthLimiter,
      });
      state.packageDriveManager = new DriveManager({
        storagePath: hostDataPath("hyper-storage"),
        swarm: state.packageSwarm,
      });
      await state.packageDriveManager.ready();
    }

    return state.packageDriveManager;
  }

  return {
    transportAnnounceService,
    ensureMiniappHost,
    loadRelayConfig,
    persistRelayConfig,
    seedBundledCatalogIfNeeded,
    ensurePackageDriveManager,
  };
}
