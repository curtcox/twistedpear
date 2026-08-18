import { MiniappBroker } from "../broker.js";
import type { GrantRecord } from "../capabilities.js";
import { grantTtlMsForCapabilities } from "../grant-ttl.js";
import type { ConfirmationRequest } from "../confirm.js";
import {
  ConsentTranscript,
  consentRecordFromConfirmation,
  type ConsentRecord,
} from "../consent-record.js";
import { AiServiceError } from "../services/ai.js";
import type {
  ActiveApp,
  AiStreamSession,
  LimitOverrides,
  MiniappHostOptions,
  MiniappHostSnapshot,
} from "./shared.js";
import {
  createHostBroker,
  createHostLayer1Services,
  type HostLayer1Services,
} from "./layer-1-init.js";
import {
  ForegroundRequiredError,
  appInstanceKey,
  emptyHostSnapshot,
  findAppById,
  snapshotFromApp,
} from "./running-apps.js";
import {
  assertEgressAllowed,
  EgressBudgetLedger,
  EgressDeniedError,
} from "../egress-enforcement.js";
import {
  initialEgressOfferStore,
  stepEgressOfferStore,
  type EgressOffer,
  type EgressOfferConstraints,
  type EgressTargetKind,
} from "@twistedpear/protocol";

export abstract class MiniappHostLayer1Base {
  protected abstract now(): number;

  protected abstract delay(ms: number): Promise<void>;

  protected readonly broker: MiniappBroker;

  protected readonly identityService: HostLayer1Services["identityService"];
  protected readonly lxmfService: HostLayer1Services["lxmfService"];
  protected readonly announceService: HostLayer1Services["announceService"];
  protected readonly resourceService: HostLayer1Services["resourceService"];
  protected readonly presenceService: HostLayer1Services["presenceService"];
  protected readonly linkService: HostLayer1Services["linkService"];
  protected readonly hostInfoService: HostLayer1Services["hostInfoService"];
  protected readonly aiService: HostLayer1Services["aiService"];
  protected readonly appsService: HostLayer1Services["appsService"];
  protected readonly peerService: HostLayer1Services["peerService"];
  protected readonly relayService: HostLayer1Services["relayService"];
  protected readonly freenetService: HostLayer1Services["freenetService"];
  protected readonly deviceService: HostLayer1Services["deviceService"];
  protected readonly inboundMedia: HostLayer1Services["inboundMedia"];
  protected readonly channelService: HostLayer1Services["channelService"];
  readonly workspace: HostLayer1Services["workspace"];

  protected readonly apps = new Map<string, ActiveApp>();
  protected foregroundKey: string | null = null;
  protected readonly limitOverrides = new Map<string, LimitOverrides>();
  protected readonly aiStreams = new Map<string, AiStreamSession>();
  protected nextAiStreamId = 0;
  protected nextRuntimeId = 0;
  private egressOffers = initialEgressOfferStore();
  private nextEgressOfferId = 0;
  private readonly egressBudgets = new EgressBudgetLedger();
  readonly consentTranscript: ConsentTranscript;

  constructor(protected readonly options: MiniappHostOptions) {
    this.consentTranscript =
      options.consentTranscript ?? new ConsentTranscript();
    const wrapped = this.withForegroundConfirmations(options);
    this.broker = createHostBroker(options, {
      now: () => this.now(),
      logActive: (appId, line) => this.logActive(appId, line),
    });
    const services = createHostLayer1Services(
      wrapped,
      () => this.now(),
      () => this.apps,
    );
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
    this.channelService = services.channelService;
    this.workspace = services.workspace;
    this.registerHandlers();
  }

  snapshot(): MiniappHostSnapshot {
    const foreground = this.foregroundApp();
    return foreground === null
      ? emptyHostSnapshot()
      : snapshotFromApp(foreground);
  }

  running(): ReadonlyArray<MiniappHostSnapshot> {
    return [...this.apps.values()].map(snapshotFromApp);
  }

  protected instanceKey(appId: string, publisherPublicKey: string): string {
    return appInstanceKey(appId, publisherPublicKey);
  }

  protected foregroundApp(): ActiveApp | null {
    if (this.foregroundKey === null) return null;
    return this.apps.get(this.foregroundKey) ?? null;
  }

  protected appByIdentity(
    appId: string,
    publisherPublicKey: string,
  ): ActiveApp | undefined {
    return this.apps.get(this.instanceKey(appId, publisherPublicKey));
  }

  protected appById(appId: string): ActiveApp | undefined {
    return findAppById(this.apps, appId);
  }

  protected assertForeground(appId: string, publisherPublicKey: string): void {
    const key = this.instanceKey(appId, publisherPublicKey);
    if (!this.apps.has(key)) return;
    if (this.foregroundKey !== key) {
      throw new ForegroundRequiredError();
    }
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
        ttlMs: grantTtlMsForCapabilities(requestedGrants),
      }),
    );
  }

  grantEgressOffer(input: {
    readonly appId: string;
    readonly capability: string;
    readonly targetKind: EgressTargetKind;
    readonly targetId: string;
    readonly displayLabel?: string;
    readonly ttlMs: number;
    readonly constraints?: EgressOfferConstraints;
  }): EgressOffer {
    const grantedAt = this.now();
    const id = `egress-${++this.nextEgressOfferId}`;
    this.egressOffers = stepEgressOfferStore(this.egressOffers, {
      kind: "egress/grant",
      offer: {
        id,
        appId: input.appId,
        capability: input.capability,
        targetKind: input.targetKind,
        targetId: input.targetId,
        displayLabel: input.displayLabel ?? input.targetId,
        constraints: input.constraints ?? {},
        grantedAt,
      },
      ttlMs: input.ttlMs,
    });
    const stored = this.egressOffers.get(id);
    if (stored === undefined) {
      throw new EgressDeniedError("Failed to store egress offer");
    }
    return stored;
  }

  protected assertEgressAllowed(
    appId: string,
    capability: string,
    targetKind: EgressTargetKind,
    targetId: string,
    bytes = 0,
  ): EgressOffer {
    return assertEgressAllowed({
      offers: this.egressOffers,
      appId,
      capability,
      targetKind,
      targetId,
      at: this.now(),
      bytes,
      ledger: this.egressBudgets,
    });
  }

  private async closeSurfacesForRevokedCapability(
    appId: string,
    publisherPublicKey: string,
    capability: string,
  ): Promise<void> {
    if (capability === "peer:connect") {
      await this.closePeerRuntimeIfActive(appId, publisherPublicKey);
    }
    if (capability === "apps:channel") {
      this.channelService.dropApp({ appId, publisherPublicKey });
    }
    if (capability.startsWith("device:")) {
      await this.closeDeviceSurfacesIfActive(appId);
    }
  }

  private async closePeerRuntimeIfActive(
    appId: string,
    publisherPublicKey: string,
  ): Promise<void> {
    const app = this.appByIdentity(appId, publisherPublicKey);
    if (app === undefined) return;
    await this.peerService?.closeRuntime(appId, app.runtimeId);
  }

  private async closeDeviceSurfacesIfActive(appId: string): Promise<void> {
    if (this.appById(appId) === undefined) return;
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
    this.channelService.dropApp({ appId, publisherPublicKey });
    await this.options.grantStore.delete(appId, publisherPublicKey, this.now());
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

  recordConsent(record: ConsentRecord): void {
    this.consentTranscript.append(record);
  }

  protected logActive(appId: string, line: string): void {
    const entry = { appId, line, at: this.now() };
    const app = this.appById(appId);
    if (app !== undefined) {
      app.logs.push(entry);
      if (app.logs.length > 200) {
        app.logs.shift();
      }
    }

    this.options.callbacks?.onLog?.(entry);
  }

  private withForegroundConfirmations(
    options: MiniappHostOptions,
  ): MiniappHostOptions {
    const channel = options.confirmationChannel;
    if (channel === undefined) return options;
    return {
      ...options,
      confirmationChannel: {
        confirm: async (request: ConfirmationRequest) => {
          this.assertForeground(request.appId, request.publisherPublicKey);
          const result = await channel.confirm(request);
          if (result.approved) {
            this.recordConsent(
              consentRecordFromConfirmation(request, this.now()),
            );
          }
          return result;
        },
      },
    };
  }
}
