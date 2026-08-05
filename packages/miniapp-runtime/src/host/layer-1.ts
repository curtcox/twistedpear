import { GrantStore } from "../capabilities.js";
import { MiniappBroker,type BrokerContext,type BrokerRequest,type BrokerResponse } from "../broker.js";
import type { HostConfirmationChannel } from "../confirm.js";
import { MiniappLifecycle } from "../lifecycle.js";
import { AnnounceService,type AnnounceBackend } from "../services/announce.js";
import { AppIdentityService,type IdentityBackend } from "../services/identity.js";
import { NamespacedLxmfService } from "../services/lxmf.js";
import { PresenceService,type PresenceBackend } from "../services/presence.js";
import { LinkQualityService,LinkServiceError,PeerRouteLinkObservatory,type LinkObservatoryBackend,type LinkProbeOptions,type LinkQualityServiceOptions } from "../services/links.js";
import { HostInfoService,defaultHostInfo,type HostInfo,type HostInfoBackend } from "../services/host-info.js";
import { ResourceService,type ResourceFetchBackend } from "../services/resource.js";
import { HOST_API_VERSION } from "../host-api.js";
import { AiService,AiServiceError,type AiChatBackend,type AiChatRequest,type AiChatStreamEvent,type AiEmbedRequest,type AiVectorSearchRequest } from "../services/ai.js";
import { AppsService,AppsServiceError,type AppsBackend } from "../services/apps.js";
import { WorkspaceService,type WorkspaceLimits } from "../services/workspace.js";
import type { StorageBeeBackend } from "../services/storage-bee.js";
import { NamespacedKvService,type MiniappKvStoreBackend } from "../services/storage-kv.js";
import type { GrantRecord } from "../capabilities.js";
import type { SandboxBackend } from "../sandbox/backend.js";
import type { WidgetNode,WidgetTree } from "../ui/schema.js";
import { diffWidgetTrees,type WidgetPatch } from "../ui/diff.js";
import { validateWidgetTree } from "../ui/validate.js";
import { PeerBrokerService,PeerServiceError,type PeerRequestPayload } from "../services/peers.js";
import type { PeerHandle,PeerSessionManager } from "@twistedpear/peer-discovery";
import type { PeerMediaReadiness } from "@twistedpear/protocol";
import { RelayBrokerService,RelayBrokerServiceError,type RelayService } from "../services/relay.js";
import { FreenetBrokerService,FreenetBrokerServiceError,type FreenetContractBackend } from "../services/freenet.js";
import { DeviceBrokerService,DeviceBrokerServiceError,type DeviceOpenRequest,type DeviceSessionHandle } from "../services/device.js";
import type { DeviceManager } from "../device-manager.js";
import { InboundMediaRouter,type InboundMediaBackend,type StreamSink } from "../media-stream.js";
import { findWidgetNode } from "./shared.js";
import type { ActiveApp, AiStreamSession, CasShareBackend, LaunchManifest, LimitOverrides, MiniappHostCallbacks, MiniappHostLogEntry, MiniappHostOptions, MiniappHostSnapshot, ResourceLimitUpdate, ResourceLimitsSnapshot } from "./shared.js";
export abstract class MiniappHostLayer1 {
  protected abstract now(): number;

  protected abstract delay(ms: number): Promise<void>;

protected readonly broker: MiniappBroker;

  protected readonly identityService: AppIdentityService;
  protected readonly lxmfService: NamespacedLxmfService;
  protected readonly announceService: AnnounceBackend;
  protected readonly resourceService: ResourceService | null;
  protected readonly presenceService: PresenceService | null;
  protected readonly linkService: LinkQualityService | null;
  protected readonly hostInfoService: HostInfoService;
  protected readonly aiService: AiService | null;
  protected readonly appsService: AppsService | null;
  protected readonly peerService: PeerBrokerService | null;
  protected readonly relayService: RelayBrokerService | null;
  protected readonly freenetService: FreenetBrokerService | null;
  protected readonly deviceService: DeviceBrokerService | null;
  protected readonly inboundMedia: InboundMediaRouter | null;
  readonly workspace: WorkspaceService;

  protected active: ActiveApp | null = null;
  protected readonly limitOverrides = new Map<string, LimitOverrides>();
  protected readonly aiStreams = new Map<string, AiStreamSession>();
  protected nextAiStreamId = 0;
  protected nextRuntimeId = 0;

  constructor(protected readonly options: MiniappHostOptions) {
    this.broker = new MiniappBroker({
      now: () => this.now(),
      enforceCapabilities: options.enforceBrokerCapabilities ?? true,
      audit: (entry) => {
        options.brokerAudit?.(entry);
        if (!entry.allowed) this.logActive(entry.appId, `broker denied ${entry.namespace}.${entry.method}`);
      }
    });
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
    const linkBackend = options.linkObservatoryBackend ?? (options.peerSessionManager === undefined
      ? undefined
      : new PeerRouteLinkObservatory(options.peerSessionManager, { now: () => this.now(), ...(options.localMediaReadiness === undefined ? {} : { localReadiness: options.localMediaReadiness }), ...(options.controlReservations === undefined ? {} : { controlReservations: options.controlReservations }) }));
    this.linkService = linkBackend === undefined
      ? null
      : new LinkQualityService(linkBackend, {
          now: () => this.now(),
          ...(options.confirmCostlyLinkProbe === undefined
            ? {}
            : { confirmCostlyProbe: options.confirmCostlyLinkProbe })
        });
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
    this.peerService = options.peerSessionManager === undefined ? null : new PeerBrokerService(options.peerSessionManager);
    this.relayService = options.relayService === undefined
      ? null
      : new RelayBrokerService(options.relayService, options.relayMutation);
    this.freenetService =
      options.freenetBackend === undefined
        ? null
        : new FreenetBrokerService(options.freenetBackend, options.confirmationChannel);
    this.deviceService = options.deviceManager === undefined ? null : new DeviceBrokerService(options.deviceManager);
    this.inboundMedia = options.inboundMediaBackend === undefined
      ? null
      : new InboundMediaRouter(options.inboundMediaBackend, () => this.now());
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
    return this.options.grantStore.set(appId, publisherPublicKey, declared, requestedGrants, this.now());
  }

  async revokeGrant(appId: string, publisherPublicKey: string, capability: string): Promise<GrantRecord | null> {
    if (capability === "peer:connect" && this.active?.manifest.name === appId && this.active.manifest.publisherPublicKey === publisherPublicKey) {
      await this.peerService?.closeRuntime(appId, this.active.runtimeId);
    }
    if (capability.startsWith("device:") && this.active?.manifest.name === appId) {
      this.deviceService?.closeApp(appId);
      await this.inboundMedia?.closeApp(appId);
    }
    return this.options.grantStore.revoke(appId, publisherPublicKey, capability as never, this.now());
  }

  async deleteGrants(appId: string, publisherPublicKey: string): Promise<void> {
    await this.options.grantStore.delete(appId, publisherPublicKey);
  }

  protected registerHandlers(): void {
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
      const namespace = (request.payload as { namespace?: string } | undefined)?.namespace;
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

    this.broker.register("workspace", "patch", "workspace", async (request, context) => {
      const { path, baseLength, edits } = request.payload as {
        path: string;
        baseLength: number;
        edits: ReadonlyArray<{ start: number; end: number; text: string }>;
      };
      return this.workspace.patch(context.appId, path, baseLength, edits);
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

    this.broker.register("ai", "chatStreamStart", "ai:chat", (request, context) => {
      if (this.aiService === null) {
        throw new AiServiceError("AI_UNCONFIGURED", "AI is not configured on this host");
      }
      const streamId = `ai-stream-${this.nextAiStreamId++}`;
      this.aiStreams.set(streamId, {
        appId: context.appId,
        iterator: this.aiService.stream(context.appId, request.payload as AiChatRequest)
      });
      return { streamId };
    });

    this.broker.register("ai", "chatStreamNext", "ai:chat", async (request, context) => {
      const streamId = this.aiStreamId(request.payload);
      const session = this.aiStreams.get(streamId);
      if (session === undefined || session.appId !== context.appId) {
        throw new AiServiceError("AI_BAD_REQUEST", "Unknown AI stream session.");
      }
      try {
        const result = await session.iterator.next();
        if (result.done === true) this.aiStreams.delete(streamId);
        return result;
      } catch (error) {
        this.aiStreams.delete(streamId);
        throw error;
      }
    });

    this.broker.register("ai", "chatStreamCancel", "ai:chat", async (request, context) => {
      const streamId = this.aiStreamId(request.payload);
      const session = this.aiStreams.get(streamId);
      if (session === undefined || session.appId !== context.appId) return { cancelled: false };
      this.aiStreams.delete(streamId);
      await session.iterator.return?.();
      return { cancelled: true };
    });

    this.broker.register("ai", "embed", "ai:embed", async (request, context) => {
      if (this.aiService === null) {
        throw new AiServiceError("AI_UNCONFIGURED", "AI is not configured on this host");
      }
      return this.aiService.embed(context.appId, request.payload as AiEmbedRequest);
    });

    this.broker.register("ai", "search", "ai:embed", async (request, context) => {
      if (this.aiService === null) {
        throw new AiServiceError("AI_UNCONFIGURED", "AI is not configured on this host");
      }
      return this.aiService.search(context.appId, request.payload as AiVectorSearchRequest);
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

    const peers = () => {
      if (this.peerService === null) throw new PeerServiceError("PEERS_UNCONFIGURED", "Peer discovery is not configured on this host");
      return this.peerService;
    };
    const runtimeId = (appId: string) => this.active?.manifest.name === appId ? this.active.runtimeId : `external:${appId}`;
    this.broker.register("peers", "request", "peer:connect", async (request, context) =>
      peers().request(context.appId, runtimeId(context.appId), request.payload as PeerRequestPayload));
    this.broker.register("peers", "listen", "peer:connect", async (request, context) =>
      peers().listen(context.appId, runtimeId(context.appId), request.payload as PeerRequestPayload));
    this.broker.register("peers", "diagnostics", "peer:connect", async () => peers().diagnostics());
    this.broker.register("peers", "info", "peer:connect", (request, context) =>
      peers().info(context.appId, runtimeId(context.appId), (request.payload as { handle: PeerHandle }).handle));
    this.broker.register("peers", "close", "peer:connect", async (request, context) => {
      await peers().close(context.appId, runtimeId(context.appId), (request.payload as { handle: PeerHandle }).handle);
      return { closed: true };
    });

    const links = () => {
      if (this.linkService === null) {
        throw new LinkServiceError("LINK_UNCONFIGURED", "Link observation is not configured on this host");
      }
      return this.linkService;
    };
    this.broker.register("links", "peers", "link:observe", async (_request, context) =>
      links().peers(context.appId));
    this.broker.register("links", "watch", "link:observe", async (request, context) =>
      links().watch(context.appId, (request.payload as { cursor?: string } | undefined)?.cursor));
    this.broker.register("links", "probe", "link:probe", async (request, context) => {
      const payload = request.payload as {
        peer: PeerHandle;
        options?: LinkProbeOptions;
      };
      return links().probe(context.appId, payload.peer, payload.options);
    });

    const relay = () => {
      if (this.relayService === null) throw new RelayBrokerServiceError("RELAY_UNCONFIGURED", "Relay/interface management is not configured on this host");
      return this.relayService;
    };
    this.broker.register("relay", "setMode", "relay:configure", async (request, context) =>
      relay().setMode(context.appId, request.payload as { mode: "off" | "bridge" | "transport-node" }));
    this.broker.register("relay", "enable", "relay:configure", async (request, context) =>
      relay().enable(context.appId, request.payload as { kind: import("../services/relay.js").RelayInterfaceKind; options?: Record<string, unknown> }));
    this.broker.register("relay", "disable", "relay:configure", async (request, context) =>
      relay().disable(context.appId, request.payload as { kind: import("../services/relay.js").RelayInterfaceKind }));
    this.broker.register("relay", "setDirection", "relay:configure", async (request, context) =>
      relay().setDirection(context.appId, request.payload as { kind: import("../services/relay.js").RelayInterfaceKind; direction: import("../services/relay.js").InterfaceDirection }));
    this.broker.register("relay", "configure", "relay:configure", async (request, context) =>
      relay().configure(context.appId, request.payload as { kind: import("../services/relay.js").RelayInterfaceKind; patch: Record<string, unknown> }));
    this.broker.register("relay", "setPolicy", "relay:configure", async (request, context) =>
      relay().setPolicy(context.appId, request.payload as { policy: import("../services/relay.js").RelayPolicyMatrix }));
    this.broker.register("relay", "list", "relay:read", async (_request, context) => relay().list(context.appId));
    this.broker.register("relay", "status", "relay:read", async (_request, context) => relay().status(context.appId));
    this.broker.register("relay", "diagnostics", "relay:read", async (_request, context) => relay().diagnostics(context.appId));

    const freenet = () => {
      if (this.freenetService === null) {
        throw new FreenetBrokerServiceError(
          "FREENET_UNCONFIGURED",
          "Freenet contract access is not configured on this host"
        );
      }
      return this.freenetService;
    };
    this.broker.register("freenet", "get", "freenet:contract", async (request) =>
      freenet().get(request.payload as { keyHex: unknown })
    );
    this.broker.register("freenet", "put", "freenet:contract", async (request, context) =>
      freenet().put(context, request.payload as {
        wasmHex: unknown;
        parametersHex: unknown;
        stateHex: unknown;
      })
    );
    this.broker.register("freenet", "update", "freenet:contract", async (request, context) =>
      freenet().update(context, request.payload as {
        keyHex: unknown;
        codeHashHex: unknown;
        stateHex: unknown;
      })
    );

    const device = () => {
      if (this.deviceService === null) {
        throw new DeviceBrokerServiceError("DEVICE_UNCONFIGURED", "Device I/O is not configured on this host");
      }
      return this.deviceService;
    };
    // inventory/diagnostics: no capability. open/close/read: capability checked inside DeviceManager.
    this.broker.register("device", "inventory", null, async (_request, context) => device().inventory(context.appId));
    this.broker.register("device", "diagnostics", null, async (_request, context) => device().diagnostics(context.appId));
    this.broker.register("device", "open", null, async (request, context) =>
      device().open(
        context.appId,
        context.publisherPublicKey,
        context.declaredCapabilities,
        context.grantedCapabilities,
        request.payload as DeviceOpenRequest
      ));
    this.broker.register("device", "close", null, async (request, context) =>
      device().close(context.appId, request.payload as { handle: DeviceSessionHandle }));
    this.broker.register("device", "read", null, async (request, context) =>
      device().read(context.appId, request.payload as { handle: DeviceSessionHandle }));
    this.broker.register("device", "write", null, async (request, context) => {
      await device().write(
        context.appId,
        context.publisherPublicKey,
        request.payload as {
          handle: DeviceSessionHandle;
          command: import("@twistedpear/protocol").DeviceCommand;
        }
      );
      return { written: true };
    });
    this.broker.register("device", "stream", null, async (request, context) =>
      device().stream(
        context.appId,
        context.declaredCapabilities,
        context.grantedCapabilities,
        request.payload as {
          handle: DeviceSessionHandle;
          peer: string;
          constraints?: import("../device-manager.js").DeviceStreamConstraints;
        }
      ));
    this.broker.register("device", "closeStream", null, async (request, context) =>
      device().closeStream(context.appId, request.payload as { handle: string }));
    this.broker.register("device", "streams", "device:stream", async (_request, context) =>
      device().streams(context.appId));
    this.broker.register("device", "shareOffers", "device:share-policy:read", async (_request, context) =>
      device().shareOffers(context.appId));
    this.broker.register("device", "requestShareOffer", "device:stream", async (request, context) =>
      device().requestShareOffer(context.appId, request.payload as { purpose: string }));
    this.broker.register("device", "revokeShareOffer", "device:stream", async (request, context) =>
      device().revokeShareOffer(context.appId, request.payload as { id: string }));
    const inbound = () => {
      if (this.inboundMedia === null) throw new DeviceBrokerServiceError("DEVICE_UNCONFIGURED", "Inbound media is not configured");
      return this.inboundMedia;
    };
    this.broker.register("device", "incoming", "device:stream", async (request, context) =>
      inbound().pollOffers(context.appId, (request.payload as { cursor?: string } | undefined)?.cursor));
    this.broker.register("device", "accept", "device:stream", async (request, context) => {
      const payload = request.payload as { offerId: string; sink: StreamSink };
      return inbound().accept(context.appId, payload.offerId, payload.sink);
    });
    this.broker.register("device", "decline", "device:stream", async (request, context) => {
      const payload = request.payload as { offerId: string; reason?: string };
      await inbound().decline(context.appId, payload.offerId, payload.reason);
      return { declined: true };
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
      const devices =
        info.devices ??
        (this.deviceService === null
          ? undefined
          : (await this.deviceService.inventory(context.appId)).map((entry) => ({
              class: entry.class,
              availability: entry.availability,
              tiers: entry.tiers
            })));
      return {
        ...info,
        hostApiVersion: info.hostApiVersion || HOST_API_VERSION,
        grantedCapabilities: [...context.grantedCapabilities],
        ...(devices !== undefined ? { devices } : {})
      };
    });
  }

  protected aiStreamId(payload: unknown): string {
    const streamId = (payload as { streamId?: unknown } | null)?.streamId;
    if (typeof streamId !== "string" || streamId.length === 0) {
      throw new AiServiceError("AI_BAD_REQUEST", "AI stream id is required.");
    }
    return streamId;
  }

  protected kvQuotaFor(appId: string): number | undefined {
    return this.limitOverrides.get(appId)?.kvQuotaBytes ?? this.options.kvQuotaBytes;
  }

  protected logActive(appId: string, line: string): void {
    const entry = { appId, line, at: this.now() };
    if (this.active !== null && this.active.manifest.name === appId) {
      this.active.logs.push(entry);
      if (this.active.logs.length > 200) {
        this.active.logs.shift();
      }
    }

    this.options.callbacks?.onLog?.(entry);
  }

}
