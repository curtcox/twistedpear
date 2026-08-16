import { MiniappBroker } from "../broker.js";
import type { AnnounceBackend } from "../services/announce.js";
import { AppIdentityService } from "../services/identity.js";
import { NamespacedLxmfService } from "../services/lxmf.js";
import { PresenceService } from "../services/presence.js";
import { LinkQualityService } from "../services/links.js";
import { HostInfoService } from "../services/host-info.js";
import { ResourceService } from "../services/resource.js";
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
import { createHostBroker, createHostLayer1Services } from "./layer-1-init.js";

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
    this.broker = createHostBroker(options, {
      now: () => this.now(),
      logActive: (appId, line) => this.logActive(appId, line),
    });
    const services = createHostLayer1Services(options, () => this.now());
    this.identityService = services.identityService;
    this.lxmfService = services.lxmfService;
    this.announceService = services.announceService;
    this.resourceService = services.resourceService;
    this.presenceService = services.presenceService;
    this.linkService = services.linkService;
    this.hostInfoService = services.hostInfoService;
    this.aiService = services.aiService;
    this.appsService = services.appsService;
    this.peerService = services.peerService;
    this.relayService = services.relayService;
    this.freenetService = services.freenetService;
    this.deviceService = services.deviceService;
    this.inboundMedia = services.inboundMedia;
    this.workspace = services.workspace;
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

  getGrants(
    appId: string,
    publisherPublicKey: string,
  ): Promise<GrantRecord | null> {
    return Promise.resolve(
      this.options.grantStore.get(appId, publisherPublicKey),
    );
  }

  setGrants(
    appId: string,
    publisherPublicKey: string,
    declared: ReadonlyArray<string>,
    requestedGrants: ReadonlyArray<string>,
  ): Promise<GrantRecord> {
    return Promise.resolve(
      this.options.grantStore.set({
        appId,
        publisherPublicKey,
        declared,
        requestedGrants,
        now: this.now(),
      }),
    );
  }

  private async closeSurfacesForRevokedCapability(
    appId: string,
    publisherPublicKey: string,
    capability: string,
  ): Promise<void> {
    if (capability === "peer:connect") {
      await this.closePeerRuntimeIfActive(appId, publisherPublicKey);
    }
    if (capability.startsWith("device:")) {
      await this.closeDeviceSurfacesIfActive(appId);
    }
  }

  private async closePeerRuntimeIfActive(
    appId: string,
    publisherPublicKey: string,
  ): Promise<void> {
    if (
      this.active?.manifest.name !== appId ||
      this.active.manifest.publisherPublicKey !== publisherPublicKey
    ) {
      return;
    }
    await this.peerService?.closeRuntime(appId, this.active.runtimeId);
  }

  private async closeDeviceSurfacesIfActive(appId: string): Promise<void> {
    if (this.active?.manifest.name !== appId) return;
    this.deviceService?.closeApp(appId);
    await this.inboundMedia?.closeApp(appId);
  }

  async revokeGrant(
    appId: string,
    publisherPublicKey: string,
    capability: string,
  ): Promise<GrantRecord | null> {
    await this.closeSurfacesForRevokedCapability(
      appId,
      publisherPublicKey,
      capability,
    );
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
