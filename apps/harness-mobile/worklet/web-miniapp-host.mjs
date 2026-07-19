import {
  buildUnsignedManifest,
  packPackage,
  signManifest,
  unpackPackage
} from "../../../packages/app-registry/dist/index.js";
import { CasStore } from "../../../packages/cas-256t/dist/index.js";
import {
  CAPABILITY_DEFINITIONS,
  GrantStore,
  describeCapability,
  isMiniappCapability,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/capabilities.js";
import { generateConfirmationToken } from "../../../packages/miniapp-runtime/dist/confirm.js";
import { HOST_API_VERSION } from "../../../packages/miniapp-runtime/dist/host-api.js";
import { MiniappHost } from "../../../packages/miniapp-runtime/dist/host.js";
import { createWebSandboxProxyBackend } from "../../../packages/miniapp-runtime/dist/sandbox/web-proxy.js";
import { encodeJsonWireValue } from "../../../packages/miniapp-runtime/dist/sandbox/json-wire.js";
import { KvStorageBeeBackend } from "../../../packages/miniapp-runtime/dist/services/storage-bee-kv.js";
import { bytesToHex } from "../../../packages/reticulum-ts/dist/web.js";

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
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
        bundleHex: request.bundleHex
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
        response: encodeJsonWireValue(response)
      });
    }
  });
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
  let devBadge = false;
  let watchdogTimer = null;
  const beeBackend = new KvStorageBeeBackend(kvStore);
  const casStore = new CasStore(kvStore, (data) => provider.sha512(data));
  /** @type {{ host: import("../../../packages/miniapp-runtime/dist/host.js").MiniappHost } | null} */
  let preview = null;

  const sandboxController = createProxySandboxController(options.send);

  const host = new MiniappHost({
    backend: sandboxController.backend,
    grantStore,
    kvBackend: kvStore,
    beeBackend,
    confirmationChannel:
      options.requestHostReply === undefined
        ? undefined
        : {
            confirm: async (request) => {
              const reply = await options.requestHostReply({
                type: "confirm-request",
                token: request.token,
                kind: request.kind,
                appId: request.appId,
                publisherPublicKey: request.publisherPublicKey,
                summary: request.summary
              });
              return { approved: reply?.approved === true, detail: reply?.detail };
            }
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
          platform: snap.platform ?? "web",
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
          provider
        );
        const signed = signManifest(provider, identity, unsigned);
        const packed = packPackage(provider, { ...signed, signature: signed.signature, files });
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
        // Prefer an archive already in local CAS (just packaged on this host).
        const localArchive = await casStore.get(t256);
        if (localArchive !== null) {
          const unpacked = unpackPackage(provider, localArchive);
          return {
            appId: unpacked.manifest.name,
            version: unpacked.manifest.version,
            trusted: true
          };
        }

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
        preview = previewHost;
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
    aiBackend:
      options.aiBackend ??
      {
        chat: async () => {
          throw new Error("AI is not configured on this host (set it in Settings)");
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

  async function requirePublisherIdentity() {
    if (options.getPublisherIdentity === undefined) {
      throw new Error("No publisher identity is configured on this host");
    }

    const identity = await options.getPublisherIdentity();
    if (identity === null) {
      throw new Error("No publisher identity is available; create an identity first");
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
    // Share the main sandbox proxy so spawn/broker replies from the page
    // (handleSandboxHostMessage → sandboxController) reach preview launches.
    const previewHost = new MiniappHost({
      backend: sandboxController.backend,
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

  async function loadBundleForApp(packageStorage, appId) {
    const version = packageStorage.activeVersion(appId);
    if (version === null) {
      throw new Error(`No installed version for ${appId}`);
    }

    const record = packageStorage.listInstalled().find((entry) => entry.appId === appId && entry.version === version);
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

    async readWorkspaceFile(documentId) {
      const snapshot = host.snapshot();
      if (snapshot.appId === null) {
        throw new Error("No mini-app is running");
      }

      return host.workspace.read(snapshot.appId, documentId);
    },

    async launch(packageStorage, appId, launchOptions = {}) {
      devBadge = false;
      const { record, bundle } = await loadBundleForApp(packageStorage, appId);

      if (launchOptions.skipReview !== true && options.requestHostReply !== undefined) {
        const declared = validateManifestCapabilities(record.manifest.capabilities);
        const preGranted = new Set(
          (await grantStore.get(record.appId, record.manifest.publisherPublicKey))?.granted ?? []
        );
        const reply = await options.requestHostReply({
          type: "launch-review",
          token: generateConfirmationToken((length) => provider.randomBytes(length)),
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
      if (preview === null) {
        throw new Error("No preview app is running");
      }

      await preview.host.handleUiEvent(nodeId, event, value);
    },

    async stopPreview() {
      await stopPreviewHost();
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

export { hexToBytes };
