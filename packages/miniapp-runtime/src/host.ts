import { GrantStore } from "./capabilities.js";
import { MiniappBroker, type BrokerContext, type BrokerRequest, type BrokerResponse } from "./broker.js";
import type { HostConfirmationChannel } from "./confirm.js";
import { MiniappLifecycle } from "./lifecycle.js";
import { AnnounceService } from "./services/announce.js";
import { AppIdentityService, type IdentityBackend } from "./services/identity.js";
import { NamespacedLxmfService } from "./services/lxmf.js";
import { PresenceService, type PresenceBackend } from "./services/presence.js";
import {
  HostInfoService,
  defaultHostInfo,
  type HostInfo,
  type HostInfoBackend
} from "./services/host-info.js";
import { ResourceService, type ResourceFetchBackend } from "./services/resource.js";
import { HOST_API_VERSION } from "./host-api.js";
import { AiService, AiServiceError, type AiChatBackend, type AiChatRequest } from "./services/ai.js";
import { AppsService, AppsServiceError, type AppsBackend } from "./services/apps.js";
import { WorkspaceService, type WorkspaceLimits } from "./services/workspace.js";
import type { StorageBeeBackend } from "./services/storage-bee.js";
import { NamespacedKvService, type MiniappKvStoreBackend } from "./services/storage-kv.js";
import type { GrantRecord } from "./capabilities.js";
import type { SandboxBackend } from "./sandbox/backend.js";
import type { WidgetNode, WidgetTree } from "./ui/schema.js";
import { diffWidgetTrees, type WidgetPatch } from "./ui/diff.js";
import { validateWidgetTree } from "./ui/validate.js";

export interface LaunchManifest {
  readonly name: string;
  readonly version: string;
  readonly entry: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly publisherPublicKey: string;
}

export interface MiniappHostLogEntry {
  readonly appId: string;
  readonly line: string;
  readonly at: number;
}

export interface MiniappHostSnapshot {
  readonly appId: string | null;
  readonly version: string | null;
  readonly state: string;
  readonly widgetTree: WidgetTree | null;
  readonly logs: ReadonlyArray<MiniappHostLogEntry>;
}

export interface MiniappHostCallbacks {
  readonly onWidgetTree?: (tree: WidgetTree, patches: ReadonlyArray<WidgetPatch>) => void;
  readonly onEvent?: (event: { readonly nodeId: string; readonly event: string; readonly value?: unknown }) => void;
  readonly onLog?: (entry: MiniappHostLogEntry) => void;
  readonly onLifecycle?: (snapshot: ReturnType<MiniappLifecycle["snapshot"]>) => void;
}

export interface MiniappHostOptions {
  readonly backend: SandboxBackend;
  readonly grantStore: GrantStore;
  readonly kvBackend: MiniappKvStoreBackend;
  readonly beeBackend?: StorageBeeBackend;
  readonly identityBackend?: IdentityBackend;
  readonly lxmfBackend?: MiniappKvStoreBackend;
  readonly announceService?: AnnounceService;
  readonly resourceBackend?: ResourceFetchBackend;
  readonly presenceBackend?: PresenceBackend;
  readonly hostInfoBackend?: HostInfoBackend;
  readonly callbacks?: MiniappHostCallbacks;
  readonly deriveDestinationHash?: (appId: string, publisherPublicKey: string) => Promise<string>;
  readonly kvQuotaBytes?: number;
  readonly confirmationChannel?: HostConfirmationChannel;
  readonly aiBackend?: AiChatBackend;
  readonly workspaceLimits?: Partial<WorkspaceLimits>;
  readonly appsBackend?: AppsBackend;
  readonly casBackend?: CasShareBackend;
}

export interface CasShareBackend {
  put(appId: string, content: Uint8Array): Promise<{ t256: string; size: number }>;
  get(appId: string, t256: string): Promise<Uint8Array | null>;
}

export interface ResourceLimitUpdate {
  readonly maxMessagesPerSecond?: number | null;
  readonly kvQuotaBytes?: number | null;
  readonly memoryBytes?: number | null;
}

export interface ResourceLimitsSnapshot {
  readonly appId: string;
  readonly maxMessagesPerSecond: number;
  readonly kvQuotaBytes: number | null;
  readonly memoryBytes: number | null;
  readonly memoryPendingRestart: boolean;
}

interface LimitOverrides {
  kvQuotaBytes?: number;
  memoryBytes?: number;
}

interface ActiveApp {
  readonly manifest: LaunchManifest;
  readonly grants: GrantRecord;
  readonly lifecycle: MiniappLifecycle;
  readonly launchedMemoryBytes: number | null;
  widgetTree: WidgetTree | null;
  readonly logs: MiniappHostLogEntry[];
}

export class MiniappHost {
  private readonly broker = new MiniappBroker({
    audit: (entry) => {
      if (!entry.allowed) {
        this.logActive(entry.appId, `broker denied ${entry.namespace}.${entry.method}`);
      }
    }
  });

  private readonly identityService: AppIdentityService;
  private readonly lxmfService: NamespacedLxmfService;
  private readonly announceService: AnnounceService;
  private readonly resourceService: ResourceService | null;
  private readonly presenceService: PresenceService | null;
  private readonly hostInfoService: HostInfoService;
  private readonly aiService: AiService | null;
  private readonly appsService: AppsService | null;
  readonly workspace: WorkspaceService;

  private active: ActiveApp | null = null;
  private readonly limitOverrides = new Map<string, LimitOverrides>();

  constructor(private readonly options: MiniappHostOptions) {
    const identityBackend: IdentityBackend =
      options.identityBackend ??
      ({
        deriveDestinationHash: async (appId, publisherPublicKey) =>
          options.deriveDestinationHash !== undefined
            ? options.deriveDestinationHash(appId, publisherPublicKey)
            : `app:${appId}:${publisherPublicKey.slice(0, 16)}`,
        sign: async (_appId, _publisherPublicKey, payload) =>
          new TextEncoder().encode(`signed:${new TextDecoder().decode(payload)}`)
      } satisfies IdentityBackend);

    this.identityService = new AppIdentityService(identityBackend);
    this.lxmfService = new NamespacedLxmfService(options.lxmfBackend ?? options.kvBackend);
    this.announceService = options.announceService ?? new AnnounceService();
    this.resourceService = options.resourceBackend === undefined ? null : new ResourceService(options.resourceBackend);
    this.presenceService =
      options.presenceBackend === undefined ? null : new PresenceService(options.presenceBackend);
    this.hostInfoService = new HostInfoService(
      options.hostInfoBackend ?? {
        info: async () =>
          defaultHostInfo({
            hostApiVersion: HOST_API_VERSION,
            hostVersion: HOST_API_VERSION
          })
      }
    );
    this.aiService = options.aiBackend === undefined ? null : new AiService(options.aiBackend);
    this.appsService =
      options.appsBackend === undefined ? null : new AppsService(options.appsBackend, options.confirmationChannel);
    this.workspace = new WorkspaceService(options.kvBackend, options.workspaceLimits);
    this.registerHandlers();
  }

  snapshot(): MiniappHostSnapshot {
    if (this.active === null) {
      return { appId: null, version: null, state: "stopped", widgetTree: null, logs: [] };
    }

    const lifecycle = this.active.lifecycle.snapshot();
    return {
      appId: lifecycle.appId,
      version: lifecycle.version,
      state: lifecycle.state,
      widgetTree: this.active.widgetTree,
      logs: [...this.active.logs]
    };
  }

  async getGrants(appId: string, publisherPublicKey: string): Promise<GrantRecord | null> {
    return this.options.grantStore.get(appId, publisherPublicKey);
  }

  async setGrants(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    requestedGrants: ReadonlyArray<string>
  ): Promise<GrantRecord> {
    return this.options.grantStore.set(appId, publisherPublicKey, declared, requestedGrants);
  }

  async revokeGrant(appId: string, publisherPublicKey: string, capability: string): Promise<GrantRecord | null> {
    return this.options.grantStore.revoke(appId, publisherPublicKey, capability as never);
  }

  async deleteGrants(appId: string, publisherPublicKey: string): Promise<void> {
    await this.options.grantStore.delete(appId, publisherPublicKey);
  }

  setResourceLimits(appId: string, update: ResourceLimitUpdate): ResourceLimitsSnapshot {
    if (update.maxMessagesPerSecond !== undefined) {
      this.broker.setRateLimit(appId, update.maxMessagesPerSecond);
    }

    const overrides = this.limitOverrides.get(appId) ?? {};
    if (update.kvQuotaBytes !== undefined) {
      if (update.kvQuotaBytes === null) {
        delete overrides.kvQuotaBytes;
      } else if (!Number.isFinite(update.kvQuotaBytes) || update.kvQuotaBytes < 0) {
        throw new RangeError(`Invalid kv quota: ${update.kvQuotaBytes}`);
      } else {
        overrides.kvQuotaBytes = Math.floor(update.kvQuotaBytes);
      }
    }

    if (update.memoryBytes !== undefined) {
      if (update.memoryBytes === null) {
        delete overrides.memoryBytes;
      } else if (!Number.isFinite(update.memoryBytes) || update.memoryBytes < 1) {
        throw new RangeError(`Invalid memory limit: ${update.memoryBytes}`);
      } else {
        overrides.memoryBytes = Math.floor(update.memoryBytes);
      }
    }

    if (Object.keys(overrides).length === 0) {
      this.limitOverrides.delete(appId);
    } else {
      this.limitOverrides.set(appId, overrides);
    }

    this.logActive(appId, "resource limits updated");
    return this.getResourceLimits(appId);
  }

  getResourceLimits(appId: string): ResourceLimitsSnapshot {
    const overrides = this.limitOverrides.get(appId) ?? {};
    const memoryBytes = overrides.memoryBytes ?? null;
    const running = this.active !== null && this.active.manifest.name === appId;
    return {
      appId,
      maxMessagesPerSecond: this.broker.getRateLimit(appId),
      kvQuotaBytes: overrides.kvQuotaBytes ?? this.options.kvQuotaBytes ?? null,
      memoryBytes,
      memoryPendingRestart: running && memoryBytes !== null && memoryBytes !== this.active?.launchedMemoryBytes
    };
  }

  async launch(manifest: LaunchManifest, bundle: Uint8Array): Promise<MiniappHostSnapshot> {
    if (this.active !== null) {
      await this.stop("superseded");
    }

    const grants = await this.options.grantStore.get(manifest.name, manifest.publisherPublicKey);
    const grantedCapabilities = grants?.granted ?? [];
    const memoryBytes = this.limitOverrides.get(manifest.name)?.memoryBytes ?? null;

    const lifecycle = new MiniappLifecycle(this.options.backend, {
      appId: manifest.name,
      version: manifest.version,
      entryPath: manifest.entry,
      bundle,
      ...(memoryBytes !== null ? { limits: { memoryBytes } } : {}),
      brokerEndpoint: {
        request: (request: BrokerRequest) => this.dispatch(request, manifest, grantedCapabilities)
      }
    });

    this.active = {
      manifest,
      grants: grants ?? {
        appId: manifest.name,
        publisherPublicKey: manifest.publisherPublicKey,
        granted: [],
        updatedAt: 0
      },
      lifecycle,
      launchedMemoryBytes: memoryBytes,
      widgetTree: null,
      logs: []
    };

    const launched = await lifecycle.launch();
    this.logActive(manifest.name, `launched v${manifest.version}`);
    this.options.callbacks?.onLifecycle?.(launched);
    return this.snapshot();
  }

  async suspend(reason = "host-suspended"): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const snapshot = await this.active.lifecycle.suspend(reason);
    this.options.callbacks?.onLifecycle?.(snapshot);
    return this.snapshot();
  }

  async resume(): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const snapshot = await this.active.lifecycle.resume();
    this.options.callbacks?.onLifecycle?.(snapshot);
    return this.snapshot();
  }

  async stop(reason = "stopped"): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const appId = this.active.manifest.name;
    const snapshot = await this.active.lifecycle.stop(reason);
    this.logActive(appId, `stopped (${reason})`);
    this.options.callbacks?.onLifecycle?.(snapshot);
    this.active = null;
    return this.snapshot();
  }

  async watchdogPing(): Promise<MiniappHostSnapshot> {
    if (this.active === null) {
      return this.snapshot();
    }

    const snapshot = await this.active.lifecycle.watchdogPing();
    if (snapshot.state === "crashed") {
      this.logActive(snapshot.appId, `crashed (${snapshot.reason ?? "watchdog"})`);
      this.active = null;
      this.options.callbacks?.onLifecycle?.(snapshot);
    }

    return this.snapshot();
  }

  async handleUiEvent(nodeId: string, event: string, value?: unknown): Promise<void> {
    if (this.active === null) {
      throw new Error("No mini-app is running");
    }

    const tree = this.active.widgetTree;
    if (tree === null || findWidgetNode(tree.root, nodeId) === null) {
      throw new Error(`Unknown widget node: ${nodeId}`);
    }

    this.options.callbacks?.onEvent?.({ nodeId, event, value });
    await this.dispatch(
      {
        id: `ui-event-${Date.now()}`,
        namespace: "ui",
        method: "event",
        payload: { nodeId, event, value }
      },
      this.active.manifest,
      this.active.grants.granted
    );
  }

  async dispatchRaw(request: BrokerRequest, manifest: LaunchManifest, granted: ReadonlyArray<string>): Promise<BrokerResponse> {
    return this.dispatch(request, manifest, granted);
  }

  private async dispatch(
    request: BrokerRequest,
    manifest: LaunchManifest,
    granted: ReadonlyArray<string>
  ): Promise<BrokerResponse> {
    const freshGrants = await this.options.grantStore.get(manifest.name, manifest.publisherPublicKey);
    const context: BrokerContext = {
      appId: manifest.name,
      publisherPublicKey: manifest.publisherPublicKey,
      declaredCapabilities: manifest.capabilities,
      grantedCapabilities: freshGrants?.granted ?? granted
    };

    return this.broker.dispatch(request, context);
  }

  private registerHandlers(): void {
    this.broker.register("ui", "render", null, async (request) => {
      const tree = (request.payload as { tree: WidgetTree }).tree;
      validateWidgetTree(tree);
      let patches: ReadonlyArray<WidgetPatch> = [];
      if (this.active !== null) {
        patches = diffWidgetTrees(this.active.widgetTree, tree);
        this.active.widgetTree = tree;
        if (patches.length > 0) {
          this.logActive(this.active.manifest.name, `ui ${patches.length} patch(es)`);
        }
      }

      this.options.callbacks?.onWidgetTree?.(tree, patches);
      return { accepted: true, patchCount: patches.length };
    });

    this.broker.register("ui", "subscribe", null, async () => ({ subscribed: true }));

    this.broker.register("ui", "event", null, async (request) => {
      if (this.active === null) {
        throw new Error("No mini-app is running");
      }

      const payload = request.payload as { nodeId: string; event: string; value?: unknown };
      const tree = this.active.widgetTree;
      if (tree === null || findWidgetNode(tree.root, payload.nodeId) === null) {
        throw new Error(`Unknown widget node: ${payload.nodeId}`);
      }

      await this.active.lifecycle.deliverUiEvent(payload);
      return { delivered: true };
    });

    this.broker.register("identity", "destinationHash", "identity", async (_request, context) =>
      this.identityService.destinationHash(context.appId, context.publisherPublicKey)
    );

    this.broker.register("identity", "sign", "identity", async (request, context) => {
      const payload = (request.payload as { payload: Uint8Array }).payload;
      return this.identityService.sign(context.appId, context.publisherPublicKey, payload);
    });

    this.broker.register("storage.kv", "get", "storage:kv", async (request, context) => {
      const key = (request.payload as { key: string }).key;
      const service = new NamespacedKvService(this.options.kvBackend, context.appId, this.kvQuotaFor(context.appId));
      return service.get(key);
    });

    this.broker.register("storage.kv", "set", "storage:kv", async (request, context) => {
      const { key, value } = request.payload as { key: string; value: Uint8Array };
      const service = new NamespacedKvService(this.options.kvBackend, context.appId, this.kvQuotaFor(context.appId));
      await service.set(key, value);
      return { ok: true };
    });

    this.broker.register("storage.kv", "delete", "storage:kv", async (request, context) => {
      const key = (request.payload as { key: string }).key;
      const service = new NamespacedKvService(this.options.kvBackend, context.appId, this.kvQuotaFor(context.appId));
      await service.delete(key);
      return { ok: true };
    });

    const beeBackend = this.options.beeBackend;
    if (beeBackend !== undefined) {
      this.broker.register("storage.bee", "open", "storage:hyperbee", async (_request, context) =>
        beeBackend.descriptor(context.appId)
      );

      this.broker.register("storage.bee", "get", "storage:hyperbee", async (request, context) => {
        const key = (request.payload as { key: string }).key;
        return beeBackend.get(context.appId, key);
      });

      this.broker.register("storage.bee", "put", "storage:hyperbee", async (request, context) => {
        const { key, value } = request.payload as { key: string; value: Uint8Array };
        await beeBackend.put(context.appId, key, value);
        return { ok: true };
      });

      this.broker.register("storage.bee", "del", "storage:hyperbee", async (request, context) => {
        const key = (request.payload as { key: string }).key;
        await beeBackend.del(context.appId, key);
        return { ok: true };
      });

      this.broker.register("storage.bee", "list", "storage:hyperbee", async (request, context) => {
        const options = (request.payload as { gte?: string; lt?: string; limit?: number }) ?? {};
        return beeBackend.list(context.appId, options);
      });
    } else {
      this.broker.register("storage.bee", "open", "storage:hyperbee", async () => {
        throw new Error("Hyperbee storage is not configured on this host");
      });
    }

    this.broker.register("lxmf", "send", "lxmf:send", async (request, context) =>
      this.lxmfService.send(context.appId, request.payload as never)
    );
    this.broker.register("lxmf", "receive", "lxmf:receive", async (_request, context) =>
      this.lxmfService.receive(context.appId)
    );
    this.broker.register("announce", "publish", "announce:publish", async (request, context) => {
      const payload = request.payload as { appData?: Uint8Array; namespace?: string } | undefined;
      await this.announceService.publish(context.appId, payload?.appData, payload?.namespace);
      return { published: true };
    });
    this.broker.register("announce", "subscribe", "announce:subscribe", async (request, context) => {
      const namespace = (request.payload as { namespace: string }).namespace;
      return this.announceService.subscribe(context.appId, namespace);
    });
    this.broker.register("resource", "fetch", "resource:fetch", async (request, context) => {
      if (this.resourceService === null) {
        throw new Error("Resource fetch is not configured on this host");
      }

      return this.resourceService.fetch(context.appId, request.payload as never);
    });
    this.broker.register("workspace", "list", "workspace", async (request, context) => {
      const prefix = (request.payload as { prefix?: string } | undefined)?.prefix ?? "";
      return this.workspace.list(context.appId, prefix);
    });

    this.broker.register("workspace", "read", "workspace", async (request, context) => {
      const path = (request.payload as { path: string }).path;
      return { path, content: await this.workspace.read(context.appId, path) };
    });

    this.broker.register("workspace", "write", "workspace", async (request, context) => {
      const { path, content } = request.payload as { path: string; content: string };
      if (typeof content !== "string") {
        throw new Error("Workspace content must be a string");
      }

      return this.workspace.write(context.appId, path, content);
    });

    this.broker.register("workspace", "delete", "workspace", async (request, context) => {
      const path = (request.payload as { path: string }).path;
      await this.workspace.delete(context.appId, path);
      return { ok: true };
    });

    this.broker.register("ai", "chat", "ai:chat", async (request, context) => {
      if (this.aiService === null) {
        throw new AiServiceError("AI_UNCONFIGURED", "AI is not configured on this host");
      }

      return this.aiService.chat(context.appId, request.payload as AiChatRequest);
    });

    const appsService = () => {
      if (this.appsService === null) {
        throw new AppsServiceError("APPS_UNCONFIGURED", "App packaging is not configured on this host");
      }

      return this.appsService;
    };

    this.broker.register("apps", "package", "apps:package", async (request, context) =>
      appsService().package(context, request.payload as { projectPrefix: string; manifest: unknown })
    );

    this.broker.register("apps", "publish", "apps:publish", async (request, context) =>
      appsService().publish(context, request.payload as { t256: unknown })
    );

    this.broker.register("apps", "install", "apps:install", async (request, context) =>
      appsService().install(context, request.payload as { t256: unknown })
    );

    this.broker.register("apps", "preview", "apps:preview", async (request, context) =>
      appsService().preview(context, request.payload as { projectPrefix: string; manifest: unknown; grants: unknown })
    );

    this.broker.register("apps", "stopPreview", "apps:preview", async (_request, context) => {
      await appsService().stopPreview(context);
      return { ok: true };
    });

    this.broker.register("share.cas", "put", "share:cas", async (request, context) => {
      const casBackend = this.options.casBackend;
      if (casBackend === undefined) {
        throw new Error("Content-addressed sharing is not configured on this host");
      }

      const content = (request.payload as { content: string }).content;
      if (typeof content !== "string") {
        throw new Error("share.cas content must be a string");
      }

      return casBackend.put(context.appId, new TextEncoder().encode(content));
    });

    this.broker.register("share.cas", "get", "share:cas", async (request, context) => {
      const casBackend = this.options.casBackend;
      if (casBackend === undefined) {
        throw new Error("Content-addressed sharing is not configured on this host");
      }

      const t256 = (request.payload as { t256: string }).t256;
      const bytes = await casBackend.get(context.appId, t256);
      return { content: bytes === null ? null : new TextDecoder().decode(bytes) };
    });

    this.broker.register("presence", "snapshot", "presence", async () => {
      if (this.presenceService === null) {
        return {
          peers: 0,
          onlineInterfaces: 0,
          preferredInterface: null
        };
      }

      return this.presenceService.snapshot();
    });

    this.broker.register("host", "info", "presence", async (_request, context): Promise<HostInfo> => {
      const info = await this.hostInfoService.info();
      return {
        ...info,
        hostApiVersion: info.hostApiVersion || HOST_API_VERSION,
        grantedCapabilities: [...context.grantedCapabilities]
      };
    });
  }

  private kvQuotaFor(appId: string): number | undefined {
    return this.limitOverrides.get(appId)?.kvQuotaBytes ?? this.options.kvQuotaBytes;
  }

  private logActive(appId: string, line: string): void {
    const entry = { appId, line, at: Date.now() };
    if (this.active !== null && this.active.manifest.name === appId) {
      this.active.logs.push(entry);
      if (this.active.logs.length > 200) {
        this.active.logs.shift();
      }
    }

    this.options.callbacks?.onLog?.(entry);
  }
}

function findWidgetNode(root: WidgetNode, nodeId: string): WidgetNode | null {
  if (root.id === nodeId) {
    return root;
  }

  for (const child of root.children ?? []) {
    const found = findWidgetNode(child, nodeId);
    if (found !== null) {
      return found;
    }
  }

  return null;
}
