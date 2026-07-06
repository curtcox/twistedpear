import { GrantStore } from "./capabilities.js";
import { MiniappBroker, type BrokerContext, type BrokerRequest, type BrokerResponse } from "./broker.js";
import { MiniappLifecycle } from "./lifecycle.js";
import { AnnounceService } from "./services/announce.js";
import { AppIdentityService, type IdentityBackend } from "./services/identity.js";
import { NamespacedLxmfService } from "./services/lxmf.js";
import { PresenceService, type PresenceBackend } from "./services/presence.js";
import { ResourceService, type ResourceFetchBackend } from "./services/resource.js";
import type { StorageBeeBackend } from "./services/storage-bee.js";
import { NamespacedKvService, type MiniappKvStoreBackend } from "./services/storage-kv.js";
import type { GrantRecord } from "./capabilities.js";
import type { SandboxBackend } from "./sandbox/backend.js";
import type { WidgetTree } from "./ui/schema.js";
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
  readonly onWidgetTree?: (tree: WidgetTree) => void;
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
  readonly callbacks?: MiniappHostCallbacks;
  readonly deriveDestinationHash?: (appId: string, publisherPublicKey: string) => Promise<string>;
  readonly kvQuotaBytes?: number;
}

interface ActiveApp {
  readonly manifest: LaunchManifest;
  readonly grants: GrantRecord;
  readonly lifecycle: MiniappLifecycle;
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

  private active: ActiveApp | null = null;

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

  async launch(manifest: LaunchManifest, bundle: Uint8Array): Promise<MiniappHostSnapshot> {
    if (this.active !== null) {
      await this.stop("superseded");
    }

    const grants = await this.options.grantStore.get(manifest.name, manifest.publisherPublicKey);
    const grantedCapabilities = grants?.granted ?? [];

    const lifecycle = new MiniappLifecycle(this.options.backend, {
      appId: manifest.name,
      version: manifest.version,
      entryPath: manifest.entry,
      bundle,
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
    }

    this.options.callbacks?.onLifecycle?.(snapshot);
    return this.snapshot();
  }

  async handleUiEvent(nodeId: string, event: string, value?: unknown): Promise<void> {
    if (this.active === null) {
      throw new Error("No mini-app is running");
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
      if (this.active !== null) {
        this.active.widgetTree = tree;
      }

      this.options.callbacks?.onWidgetTree?.(tree);
      return { accepted: true };
    });

    this.broker.register("ui", "subscribe", null, async () => ({ subscribed: true }));

    this.broker.register("identity", "destinationHash", "identity", async (_request, context) =>
      this.identityService.destinationHash(context.appId, context.publisherPublicKey)
    );

    this.broker.register("identity", "sign", "identity", async (request, context) => {
      const payload = (request.payload as { payload: Uint8Array }).payload;
      return this.identityService.sign(context.appId, context.publisherPublicKey, payload);
    });

    this.broker.register("storage.kv", "get", "storage:kv", async (request, context) => {
      const key = (request.payload as { key: string }).key;
      const service = new NamespacedKvService(this.options.kvBackend, context.appId, this.options.kvQuotaBytes);
      return service.get(key);
    });

    this.broker.register("storage.kv", "set", "storage:kv", async (request, context) => {
      const { key, value } = request.payload as { key: string; value: Uint8Array };
      const service = new NamespacedKvService(this.options.kvBackend, context.appId, this.options.kvQuotaBytes);
      await service.set(key, value);
      return { ok: true };
    });

    this.broker.register("storage.kv", "delete", "storage:kv", async (request, context) => {
      const key = (request.payload as { key: string }).key;
      const service = new NamespacedKvService(this.options.kvBackend, context.appId, this.options.kvQuotaBytes);
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
      const appData = (request.payload as { appData?: Uint8Array } | undefined)?.appData;
      await this.announceService.publish(context.appId, appData);
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
