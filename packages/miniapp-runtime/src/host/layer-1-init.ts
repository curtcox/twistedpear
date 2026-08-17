import { MiniappBroker } from "../broker.js";
import { HOST_API_VERSION } from "../host-api.js";
import { InboundMediaRouter } from "../media-stream.js";
import {
  AiService,
  AnnounceService,
  AppChannelService,
  AppIdentityService,
  AppsService,
  DeviceBrokerService,
  FreenetBrokerService,
  HostInfoService,
  LinkQualityService,
  NamespacedLxmfService,
  PeerBrokerService,
  PeerRouteLinkObservatory,
  PresenceService,
  RelayBrokerService,
  ResourceService,
  WorkspaceService,
  defaultHostInfo,
  type AnnounceBackend,
  type IdentityBackend,
  type LinkObservatoryBackend,
} from "../services/index.js";
import { resolveChannelPeer } from "./running-apps.js";
import type { ActiveApp, MiniappHostOptions } from "./shared.js";

export interface HostClock {
  now(): number;
  logActive(appId: string, line: string): void;
}

export function createHostBroker(
  options: MiniappHostOptions,
  host: HostClock,
): MiniappBroker {
  return new MiniappBroker({
    now: () => host.now(),
    enforceCapabilities: options.enforceBrokerCapabilities ?? true,
    audit: (entry) => {
      options.brokerAudit?.(entry);
      // A refused capability and a backend that threw are different faults
      // and must not read the same in the log.
      if (entry.outcome === "denied")
        host.logActive(
          entry.appId,
          `broker denied ${entry.namespace}.${entry.method}`,
        );
      else if (entry.outcome === "failed")
        host.logActive(
          entry.appId,
          `broker call ${entry.namespace}.${entry.method} failed: ${entry.error?.message ?? "unknown error"}`,
        );
    },
  });
}

function createIdentityBackend(options: MiniappHostOptions): IdentityBackend {
  if (options.identityBackend !== undefined) {
    return options.identityBackend;
  }
  return {
    deriveDestinationHash: (appId, publisherPublicKey) =>
      Promise.resolve(
        options.deriveDestinationHash !== undefined
          ? options.deriveDestinationHash(appId, publisherPublicKey)
          : `app:${appId}:${publisherPublicKey.slice(0, 16)}`,
      ),
    sign: (_appId, _publisherPublicKey, payload) =>
      Promise.resolve(
        new TextEncoder().encode(`signed:${new TextDecoder().decode(payload)}`),
      ),
  };
}

function createLinkBackend(
  options: MiniappHostOptions,
  now: () => number,
): LinkObservatoryBackend | undefined {
  if (options.linkObservatoryBackend !== undefined) {
    return options.linkObservatoryBackend;
  }
  if (options.peerSessionManager === undefined) {
    return undefined;
  }
  return new PeerRouteLinkObservatory(options.peerSessionManager, {
    now,
    ...(options.localMediaReadiness === undefined
      ? {}
      : { localReadiness: options.localMediaReadiness }),
    ...(options.controlReservations === undefined
      ? {}
      : { controlReservations: options.controlReservations }),
  });
}

function createLinkService(
  options: MiniappHostOptions,
  now: () => number,
): LinkQualityService | null {
  const linkBackend = createLinkBackend(options, now);
  if (linkBackend === undefined) {
    return null;
  }
  return new LinkQualityService(linkBackend, {
    now,
    ...(options.confirmCostlyLinkProbe === undefined
      ? {}
      : { confirmCostlyProbe: options.confirmCostlyLinkProbe }),
  });
}

function createResourceService(
  options: MiniappHostOptions,
): ResourceService | null {
  return options.resourceBackend === undefined
    ? null
    : new ResourceService(options.resourceBackend);
}

function createPresenceService(
  options: MiniappHostOptions,
): PresenceService | null {
  return options.presenceBackend === undefined
    ? null
    : new PresenceService(options.presenceBackend);
}

function createHostInfoService(options: MiniappHostOptions): HostInfoService {
  return new HostInfoService(
    options.hostInfoBackend ?? {
      info: () =>
        Promise.resolve(
          defaultHostInfo({
            hostApiVersion: HOST_API_VERSION,
            hostVersion: HOST_API_VERSION,
          }),
        ),
    },
  );
}

function createAiService(options: MiniappHostOptions): AiService | null {
  return options.aiBackend === undefined
    ? null
    : new AiService(options.aiBackend);
}

function createAppsService(options: MiniappHostOptions): AppsService | null {
  return options.appsBackend === undefined
    ? null
    : new AppsService(options.appsBackend, options.confirmationChannel);
}

function createPeerService(
  options: MiniappHostOptions,
): PeerBrokerService | null {
  return options.peerSessionManager === undefined
    ? null
    : new PeerBrokerService(options.peerSessionManager);
}

function createRelayService(
  options: MiniappHostOptions,
): RelayBrokerService | null {
  return options.relayService === undefined
    ? null
    : new RelayBrokerService(options.relayService, options.relayMutation);
}

function createFreenetService(
  options: MiniappHostOptions,
): FreenetBrokerService | null {
  return options.freenetBackend === undefined
    ? null
    : new FreenetBrokerService(
        options.freenetBackend,
        options.confirmationChannel,
      );
}

function createDeviceService(
  options: MiniappHostOptions,
): DeviceBrokerService | null {
  return options.deviceManager === undefined
    ? null
    : new DeviceBrokerService(options.deviceManager);
}

function createInboundMedia(
  options: MiniappHostOptions,
  now: () => number,
): InboundMediaRouter | null {
  return options.inboundMediaBackend === undefined
    ? null
    : new InboundMediaRouter(options.inboundMediaBackend, now);
}

export interface HostLayer1Services {
  readonly identityService: AppIdentityService;
  readonly lxmfService: NamespacedLxmfService;
  readonly announceService: AnnounceBackend;
  readonly resourceService: ResourceService | null;
  readonly presenceService: PresenceService | null;
  readonly linkService: LinkQualityService | null;
  readonly hostInfoService: HostInfoService;
  readonly aiService: AiService | null;
  readonly appsService: AppsService | null;
  readonly peerService: PeerBrokerService | null;
  readonly relayService: RelayBrokerService | null;
  readonly freenetService: FreenetBrokerService | null;
  readonly deviceService: DeviceBrokerService | null;
  readonly inboundMedia: InboundMediaRouter | null;
  readonly channelService: AppChannelService;
  readonly workspace: WorkspaceService;
}

export function createHostLayer1Services(
  options: MiniappHostOptions,
  now: () => number,
  apps: () => ReadonlyMap<string, ActiveApp>,
): HostLayer1Services {
  return {
    identityService: new AppIdentityService(createIdentityBackend(options)),
    lxmfService: new NamespacedLxmfService(
      options.lxmfBackend ?? options.kvBackend,
    ),
    announceService: options.announceService ?? new AnnounceService(),
    resourceService: createResourceService(options),
    presenceService: createPresenceService(options),
    linkService: createLinkService(options, now),
    hostInfoService: createHostInfoService(options),
    aiService: createAiService(options),
    appsService: createAppsService(options),
    peerService: createPeerService(options),
    relayService: createRelayService(options),
    freenetService: createFreenetService(options),
    deviceService: createDeviceService(options),
    inboundMedia: createInboundMedia(options, now),
    channelService: new AppChannelService(
      {
        resolvePeer: (appId, publisherPublicKey) =>
          resolveChannelPeer(apps(), appId, publisherPublicKey),
        now,
      },
      options.confirmationChannel,
    ),
    workspace: new WorkspaceService(options.kvBackend, options.workspaceLimits),
  };
}
