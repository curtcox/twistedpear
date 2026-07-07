import {
  CAPABILITY_DEFINITIONS,
  GrantStore,
  describeCapability,
  isMiniappCapability,
  validateManifestCapabilities
} from "../../../packages/miniapp-runtime/dist/capabilities.js";
import { MiniappHost } from "../../../packages/miniapp-runtime/dist/host.js";
import { createWebSandboxProxyBackend } from "../../../packages/miniapp-runtime/dist/sandbox/web-proxy.js";
import { KvStorageBeeBackend } from "../../../packages/miniapp-runtime/dist/services/storage-bee-kv.js";
import { unpackPackage } from "../../../packages/app-registry/dist/index.js";

function hexToBytes(hex) {
  const normalized = hex.length % 2 === 0 ? hex : `0${hex}`;
  const bytes = new Uint8Array(normalized.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(normalized.slice(index * 2, index * 2 + 2), 16);
  }

  return bytes;
}

/**
 * Web core-worker mini-app host. Sandbox iframes are spawned on the main thread
 * via WebSandboxProxyBackend + host/web-sandbox-relay.ts (Phase W2).
 */
export function createWebWorkletMiniappHost(options) {
  const kvStore = options.kvStore;
  const grantStore = new GrantStore(kvStore);
  let developerMode = false;
  let devBadge = false;
  let watchdogTimer = null;
  const beeBackend = new KvStorageBeeBackend(kvStore);

  const sandboxController = createWebSandboxProxyBackend({
    spawn(request) {
      options.send({
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
      options.send({ type: "sandbox-post", instanceId, payload });
    },
    ping(requestId, instanceId, timeoutMs) {
      options.send({ type: "sandbox-ping", requestId, instanceId, timeoutMs });
    },
    kill(instanceId, reason) {
      options.send({ type: "sandbox-kill", instanceId, reason });
    },
    brokerResponse(requestId, response) {
      options.send({ type: "sandbox-broker-response", requestId, response });
    }
  });

  const host = new MiniappHost({
    backend: sandboxController.backend,
    grantStore,
    kvBackend: kvStore,
    beeBackend,
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

    const unpacked = unpackPackage(options.provider, archive);
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

    async launch(packageStorage, appId) {
      devBadge = false;
      const { record, bundle } = await loadBundleForApp(packageStorage, appId);
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
    }
  };
}

export { hexToBytes };
