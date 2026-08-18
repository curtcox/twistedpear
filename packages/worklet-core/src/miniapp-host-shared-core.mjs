/* global TextEncoder, clearInterval, setInterval, setTimeout */
import {
  CAPABILITY_DEFINITIONS,
  GrantStore,
  describeCapability,
  isMiniappCapability,
  validateManifestCapabilities,
} from "../../miniapp-runtime/dist/capabilities.js";
import {
  grantTtlMsForCapabilities,
  isGrantLifecycleEffective,
} from "../../miniapp-runtime/dist/grant-ttl.js";
import { MiniappHost } from "../../miniapp-runtime/dist/host.js";
import { SessionInviteService } from "../../miniapp-runtime/dist/session-invite.js";

/** Host-side entropy for media session ids; the bridge itself stays Sans-IO. */
export function hostRandomBytes(length) {
  const bytes = new Uint8Array(length);
  if (typeof globalThis.crypto?.getRandomValues === "function") {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < length; index += 1)
      bytes[index] = (Math.random() * 256) | 0;
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
    },
  };
}

export function createPushGrants(send, grantStore) {
  return function pushGrants(appId, publisherPublicKey, declaredCapabilities) {
    const declared = new Set(
      validateManifestCapabilities(declaredCapabilities),
    );
    optionsSendGrantsSkeleton(send, appId, declared);

    void Promise.all([
      grantStore.get(appId, publisherPublicKey),
      grantStore.authority(appId, publisherPublicKey),
    ]).then(([record, lifecycles]) => {
      const now = Date.now();
      const granted = new Set(record?.granted ?? []);
      send({
        type: "grants",
        appId,
        capabilities: CAPABILITY_DEFINITIONS.map((definition) => {
          const lifecycle = lifecycles[definition.id];
          const effective =
            granted.has(definition.id) &&
            isGrantLifecycleEffective(lifecycle, now);
          return {
            id: definition.id,
            description: describeCapability(definition.id),
            declared: declared.has(definition.id),
            granted: effective,
            expiresAt:
              effective && lifecycle?.expiresAt != null
                ? lifecycle.expiresAt
                : null,
          };
        }),
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
      granted: false,
    })),
  });
}

export function createPushDeviceChromeState(send, deviceManager) {
  return async function pushDeviceChromeState() {
    const [inventory, diagnostics] = await Promise.all([
      deviceManager.inventory(),
      deviceManager.diagnostics(),
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
      shareOffers: deviceManager.listLiveShareOffers(),
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
          throw new Error(
            "This host cannot bring a mini-app to the foreground.",
          );
        }
        await options.launchInstalledApp(appId);
      },
    },
    now,
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

/**
 * Resolves the identity of *this installation* — the machine — as opposed to
 * the account/publisher identity that signs packages.
 *
 * An unlinked host runs a single key in every role, so this falls back to
 * `getPublisherIdentity`. The indirection exists so that when linked mode lands
 * there is one place to point at the derived installation identity instead, and
 * app-scoped identities stop being derivable from the account key. Returns null
 * rather than throwing when the node has not started or the vault is locked.
 */
export function createInstallationIdentityLoader(options) {
  return async function getInstallationIdentity() {
    if (options.getInstallationIdentity !== undefined) {
      return await options.getInstallationIdentity();
    }

    if (options.getPublisherIdentity === undefined) return null;
    return await options.getPublisherIdentity();
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
        content: new TextEncoder().encode(content),
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
        devBadge: true,
      },
    });
  };
}

export function createMainRuntimePusher(
  send,
  host,
  devBadgeRef,
  { slot } = {},
) {
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
        devBadge: devBadgeRef.current,
        running: host.running().map((item) => ({
          appId: item.appId,
          publisherPublicKey: item.publisherPublicKey,
          version: item.version,
          state: item.state,
        })),
      },
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

export function createPreviewHostFactory({
  createBackend,
  send,
  pushPreviewRuntime,
}) {
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
          send({
            type: "miniapp-log",
            appId: `preview:${entry.appId}`,
            line: entry.line,
          }),
        onLifecycle: () => pushPreviewRuntime(),
      },
    });
    return { host: previewHost, grantStore: grantStoreForPreview };
  };
}

export function createGrantApiMethods({ grantStore, now, pushGrants }) {
  return {
    async getGrants(appId, publisherPublicKey, declaredCapabilities) {
      pushGrants(appId, publisherPublicKey, declaredCapabilities);
    },

    async setGrants(
      appId,
      publisherPublicKey,
      declaredCapabilities,
      grantedCapabilities,
    ) {
      await grantStore.set({
        appId,
        publisherPublicKey,
        declared: declaredCapabilities,
        requestedGrants: grantedCapabilities,
        now: now(),
        ttlMs: grantTtlMsForCapabilities(grantedCapabilities),
      });
      pushGrants(appId, publisherPublicKey, declaredCapabilities);
    },

    async revokeGrant(
      appId,
      publisherPublicKey,
      capability,
      declaredCapabilities,
    ) {
      if (!isMiniappCapability(capability)) {
        throw new Error(`Unknown capability: ${capability}`);
      }

      await grantStore.revoke(appId, publisherPublicKey, capability);
      pushGrants(appId, publisherPublicKey, declaredCapabilities);
    },

    async deleteGrants(appId, publisherPublicKey) {
      await grantStore.delete(appId, publisherPublicKey);
    },
  };
}

export function createDeviceChromeApiMethods({
  deviceManager,
  pushDeviceChromeState,
}) {
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
      const ttlMs =
        typeof options.ttlMs === "number" ? options.ttlMs : 15 * 60_000;
      const offer = deviceManager.grantShareOffer({
        appId: typeof options.appId === "string" ? options.appId : "line-check",
        targetKind: "peer",
        targetId:
          typeof options.targetId === "string" ? options.targetId : "peer-ana",
        displayLabel:
          typeof options.displayLabel === "string"
            ? options.displayLabel
            : "Ana",
        classId: options.classId === "camera" ? "camera" : "microphone",
        tierId: typeof options.tierId === "string" ? options.tierId : "pcm",
        maxRung:
          typeof options.maxRung === "string" ? options.maxRung : "16k-opus",
        ttlMs,
      });
      await pushDeviceChromeState();
      setTimeout(
        () => {
          void pushDeviceChromeState();
        },
        Math.max(50, ttlMs + 50),
      );
      return offer;
    },
  };
}

export function createSessionInviteApiMethods({
  sessionInvites,
  pushSessionInvites,
}) {
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
    },
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
    },

    switchForeground(appId, publisherPublicKey) {
      host.switchForeground(appId, publisherPublicKey);
      pushRuntime();
    },
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
