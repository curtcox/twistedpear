import { MiniappBroker } from "../broker.js";
import { AnnounceService, type AnnounceBackend } from "../services/announce.js";
import {
  AppIdentityService,
  type IdentityBackend,
} from "../services/identity.js";
import { NamespacedLxmfService } from "../services/lxmf.js";
import { PresenceService } from "../services/presence.js";
import {
  LinkQualityService,
  PeerRouteLinkObservatory,
} from "../services/links.js";
import { HostInfoService, defaultHostInfo } from "../services/host-info.js";
import { ResourceService } from "../services/resource.js";
import { HOST_API_VERSION } from "../host-api.js";
import { AiService } from "../services/ai.js";
import { AppsService } from "../services/apps.js";
import { WorkspaceService } from "../services/workspace.js";
import { PeerBrokerService } from "../services/peers.js";
import { RelayBrokerService } from "../services/relay.js";
import { FreenetBrokerService } from "../services/freenet.js";
import { DeviceBrokerService } from "../services/device.js";
import { InboundMediaRouter } from "../media-stream.js";
import type { GrantRecord } from "../capabilities.js";
import { AiServiceError } from "../services/ai.js";
import type {
  ActiveApp,
  AiStreamSession,
  LimitOverrides,
  MiniappHostOptions,
  MiniappHostSnapshot,
} from "./shared.js";

export abstract class MiniappHostLayer1Base {
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
        if (!entry.allowed)
          this.logActive(
            entry.appId,
            `broker denied ${entry.namespace}.${entry.method}`,
          );
      },
    });
    const identityBackend: IdentityBackend =
      options.identityBackend ??
      ({
        deriveDestinationHash: async (appId, publisherPublicKey) =>
          options.deriveDestinationHash !== undefined
            ? options.deriveDestinationHash(appId, publisherPublicKey)
            : `app:${appId}:${publisherPublicKey.slice(0, 16)}`,
        sign: async (_appId, _publisherPublicKey, payload) =>
          new TextEncoder().encode(
            `signed:${new TextDecoder().decode(payload)}`,
          ),
      } satisfies IdentityBackend);

    this.identityService = new AppIdentityService(identityBackend);
    this.lxmfService = new NamespacedLxmfService(
      options.lxmfBackend ?? options.kvBackend,
    );
    this.announceService = options.announceService ?? new AnnounceService();
    this.resourceService =
      options.resourceBackend === undefined
        ? null
        : new ResourceService(options.resourceBackend);
    this.presenceService =
      options.presenceBackend === undefined
        ? null
        : new PresenceService(options.presenceBackend);
    const linkBackend =
      options.linkObservatoryBackend ??
      (options.peerSessionManager === undefined
        ? undefined
        : new PeerRouteLinkObservatory(options.peerSessionManager, {
            now: () => this.now(),
            ...(options.localMediaReadiness === undefined
              ? {}
              : { localReadiness: options.localMediaReadiness }),
            ...(options.controlReservations === undefined
              ? {}
              : { controlReservations: options.controlReservations }),
          }));
    this.linkService =
      linkBackend === undefined
        ? null
        : new LinkQualityService(linkBackend, {
            now: () => this.now(),
            ...(options.confirmCostlyLinkProbe === undefined
              ? {}
              : { confirmCostlyProbe: options.confirmCostlyLinkProbe }),
          });
    this.hostInfoService = new HostInfoService(
      options.hostInfoBackend ?? {
        info: async () =>
          defaultHostInfo({
            hostApiVersion: HOST_API_VERSION,
            hostVersion: HOST_API_VERSION,
          }),
      },
    );
    this.aiService =
      options.aiBackend === undefined ? null : new AiService(options.aiBackend);
    this.appsService =
      options.appsBackend === undefined
        ? null
        : new AppsService(options.appsBackend, options.confirmationChannel);
    this.peerService =
      options.peerSessionManager === undefined
        ? null
        : new PeerBrokerService(options.peerSessionManager);
    this.relayService =
      options.relayService === undefined
        ? null
        : new RelayBrokerService(options.relayService, options.relayMutation);
    this.freenetService =
      options.freenetBackend === undefined
        ? null
        : new FreenetBrokerService(
            options.freenetBackend,
            options.confirmationChannel,
          );
    this.deviceService =
      options.deviceManager === undefined
        ? null
        : new DeviceBrokerService(options.deviceManager);
    this.inboundMedia =
      options.inboundMediaBackend === undefined
        ? null
        : new InboundMediaRouter(options.inboundMediaBackend, () => this.now());
    this.workspace = new WorkspaceService(
      options.kvBackend,
      options.workspaceLimits,
    );
    this.registerHandlers();
  }

  snapshot(): MiniappHostSnapshot {
    if (this.active === null) {
      return {
        appId: null,
        version: null,
        state: "stopped",
        widgetTree: null,
        logs: [],
      };
    }

    const lifecycle = this.active.lifecycle.snapshot();
    return {
      appId: lifecycle.appId,
      version: lifecycle.version,
      state: lifecycle.state,
      widgetTree: this.active.widgetTree,
      logs: [...this.active.logs],
    };
  }

  async getGrants(
    appId: string,
    publisherPublicKey: string,
  ): Promise<GrantRecord | null> {
    return this.options.grantStore.get(appId, publisherPublicKey);
  }

  async setGrants(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    requestedGrants: ReadonlyArray<string>,
  ): Promise<GrantRecord> {
    return this.options.grantStore.set(
      appId,
      publisherPublicKey,
      declared,
      requestedGrants,
      this.now(),
    );
  }

  async revokeGrant(
    appId: string,
    publisherPublicKey: string,
    capability: string,
  ): Promise<GrantRecord | null> {
    if (
      capability === "peer:connect" &&
      this.active?.manifest.name === appId &&
      this.active.manifest.publisherPublicKey === publisherPublicKey
    ) {
      await this.peerService?.closeRuntime(appId, this.active.runtimeId);
    }
    if (
      capability.startsWith("device:") &&
      this.active?.manifest.name === appId
    ) {
      this.deviceService?.closeApp(appId);
      await this.inboundMedia?.closeApp(appId);
    }
    return this.options.grantStore.revoke(
      appId,
      publisherPublicKey,
      capability as never,
      this.now(),
    );
  }

  async deleteGrants(appId: string, publisherPublicKey: string): Promise<void> {
    await this.options.grantStore.delete(appId, publisherPublicKey);
  }

  protected registerHandlers(): void {
    this.registerCoreHandlers();
    this.registerServicesHandlers();
    this.registerDeviceHandlers();
  }

  protected abstract registerCoreHandlers(): void;
  protected abstract registerServicesHandlers(): void;
  protected abstract registerDeviceHandlers(): void;

  protected aiStreamId(payload: unknown): string {
    const streamId = (payload as { streamId?: unknown } | null)?.streamId;
    if (typeof streamId !== "string" || streamId.length === 0) {
      throw new AiServiceError("AI_BAD_REQUEST", "AI stream id is required.");
    }
    return streamId;
  }

  protected kvQuotaFor(appId: string): number | undefined {
    return (
      this.limitOverrides.get(appId)?.kvQuotaBytes ?? this.options.kvQuotaBytes
    );
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
