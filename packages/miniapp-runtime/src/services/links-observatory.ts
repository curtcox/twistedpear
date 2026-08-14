import type {
  LinkQuality,
  PeerMediaReadiness,
  RouteQualityReport,
  StreamPlane,
} from "@twistedpear/protocol";
import {
  decodeLinkControl,
  encodeLinkControl,
  encodeReadinessEnvelope,
  parseMediaReadiness,
  READINESS_REQUEST_ID,
  READINESS_RESPONSE_ID,
} from "@twistedpear/protocol";
import type { PeerHandle } from "@twistedpear/peer-discovery";
import { qualityForPeerRoute as qualityForRoute } from "../route-quality.js";
import { LinkServiceError } from "./links-error.js";
import type {
  AppPeerDirectory,
  HostLinkProbeRequest,
  LinkObservatoryBackend,
  LinkWatchBatch,
  PeerLinkEvent,
  PeerLinkSummary,
  PeerRouteLinkObservatoryOptions,
} from "./links-types.js";

interface AppPeerRouteDirectory extends AppPeerDirectory {
  route(
    appId: string,
    peer: PeerHandle,
  ):
    | undefined
    | {
        readonly transport?: {
          send(payload: Uint8Array): void | Promise<void>;
          subscribe?(listener: (payload: Uint8Array) => void): () => void;
          quality?(): RouteQualityReport;
        };
      };
}

/** App-scoped adapter over authenticated peer routes. */
export class PeerRouteLinkObservatory implements LinkObservatoryBackend {
  private readonly now: () => number;
  private readonly readiness = new Map<string, PeerMediaReadiness>();
  private readonly versions = new Map<string, number>();
  private readonly snapshots = new Map<
    string,
    ReadonlyMap<string, PeerLinkSummary>
  >();
  private readonly subscriptions = new Map<string, () => void>();
  private readonly pendingProbes = new Map<
    string,
    {
      sentAt: number;
      bytes: number;
      mtu: number;
      initialQueueBytes: number;
      resolve: (quality: LinkQuality) => void;
      reject: (error: Error) => void;
      timer: ReturnType<typeof setTimeout>;
      reservation?: { release(): void };
    }
  >();
  private nextProbe = 0;

  constructor(
    private readonly directory: AppPeerDirectory,
    private readonly options: PeerRouteLinkObservatoryOptions = {},
  ) {
    this.now = options.now ?? (() => 0);
  }

  peers(appId: string): Promise<ReadonlyArray<PeerLinkSummary>> {
    this.ensureRouteSubscriptions(appId);
    const now = this.now();
    return Promise.resolve(
      this.directory.list(appId).map((entry) => {
        const readiness = this.readiness.get(
          `${appId}\u0000${entry.handle.id}`,
        );
        return {
          peer: entry.handle,
          displayLabel: entry.displayLabel,
          plane: planeForDataPlane(entry.dataPlane),
          reachability: "direct",
          quality: qualityForRoute(
            entry.dataPlane,
            this.routeDirectory()?.route(appId, entry.handle)?.transport,
          ),
          readiness:
            readiness !== undefined && readiness.expiresAt > now
              ? readiness
              : null,
          observedAt: entry.connectedAt,
          freshness:
            now - entry.connectedAt <= 30_000
              ? "live"
              : now - entry.connectedAt <= 300_000
                ? "recent"
                : "stale",
        };
      }),
    );
  }

  async watch(appId: string, cursor?: string): Promise<LinkWatchBatch> {
    const waited = await this.snapshotAfterIdle(appId, cursor);
    let current = waited.current;
    let version = waited.version;
    const events = diffLinkRoster(this.snapshots.get(appId), current);
    if (events.length > 0 || cursor === undefined) version += 1;
    this.versions.set(appId, version);
    this.snapshots.set(appId, current);
    return { cursor: String(version), events };
  }

  private async snapshotAfterIdle(
    appId: string,
    cursor?: string,
  ): Promise<{
    current: ReadonlyMap<string, PeerLinkSummary>;
    version: number;
  }> {
    let current = await this.snapshot(appId);
    const version = this.versions.get(appId) ?? 0;
    if (
      cursor === String(version) &&
      sameRoster(this.snapshots.get(appId), current)
    ) {
      // Broker watch is long-polled. A bounded idle wait prevents a sandbox's
      // AsyncIterable loop from becoming a CPU-burning request loop.
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      current = await this.snapshot(appId);
    }
    return { current, version };
  }

  probePolicy(
    appId: string,
    peer: PeerHandle,
  ): Promise<"allowed" | "confirm" | "denied"> {
    const entry = this.directory
      .list(appId)
      .find((candidate) => candidate.handle.id === peer.id);
    if (entry === undefined) return Promise.resolve("denied");
    if (this.options.probePolicy !== undefined)
      return this.options.probePolicy(appId, peer);
    if (this.options.probe !== undefined) return Promise.resolve("allowed");
    const route = this.routeDirectory()?.route(appId, peer);
    if (route?.transport === undefined) return Promise.resolve("denied");
    return Promise.resolve(
      entry.dataPlane === "reticulum" || entry.dataPlane === "bluetooth"
        ? "confirm"
        : "allowed",
    );
  }

  probe(
    appId: string,
    peer: PeerHandle,
    request: HostLinkProbeRequest,
  ): Promise<LinkQuality> {
    if (this.options.probe !== undefined)
      return this.options.probe(appId, peer, request);
    return this.probeActiveRoute(appId, peer, request);
  }

  private probeActiveRoute(
    appId: string,
    peer: PeerHandle,
    request: HostLinkProbeRequest,
  ): Promise<LinkQuality> {
    const directory = this.routeDirectory();
    const route = directory?.route(appId, peer);
    if (directory === null || route?.transport === undefined)
      throw new LinkServiceError(
        "LINK_UNCONFIGURED",
        "Active link probing is not configured for this route.",
      );
    const transport = route.transport;
    const directoryEntry = directory
      .list(appId)
      .find((entry) => entry.handle.id === peer.id);
    if (directoryEntry === undefined)
      throw new LinkServiceError(
        "LINK_UNCONFIGURED",
        "Active link probing is not configured for this peer.",
      );
    this.ensureRouteSubscriptions(appId);
    const id = `probe-${this.nextProbe++}`;
    const sentAt = this.now();
    const envelopeOverhead = 8 + id.length;
    const body = new Uint8Array(
      Math.max(0, request.budgetBytes - envelopeOverhead),
    );
    return this.startActiveProbe({
      appId,
      peer,
      request,
      id,
      sentAt,
      body,
      transport,
      dataPlane: directoryEntry.dataPlane,
    });
  }

  private startActiveProbe(input: {
    appId: string;
    peer: PeerHandle;
    request: HostLinkProbeRequest;
    id: string;
    sentAt: number;
    body: Uint8Array;
    transport: NonNullable<
      NonNullable<ReturnType<AppPeerRouteDirectory["route"]>>["transport"]
    >;
    dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
  }): Promise<LinkQuality> {
    const { appId, peer, request, id, sentAt, body, transport, dataPlane } =
      input;
    return new Promise((resolve, reject) => {
      const reservation =
        this.options.controlReservations?.reserveControl(
          Math.max(1, Math.ceil(request.budgetBytes / 5)),
        ) ?? undefined;
      if (
        this.options.controlReservations !== undefined &&
        reservation === undefined
      ) {
        reject(
          new LinkServiceError(
            "LINK_UNCONFIGURED",
            "Control bandwidth reservation is unavailable.",
          ),
        );
        return;
      }
      const key = `${appId}\u0000${peer.id}\u0000${id}`;
      const timer = setTimeout(() => {
        const pending = this.pendingProbes.get(key);
        this.pendingProbes.delete(key);
        pending?.reservation?.release();
        reject(
          new LinkServiceError(
            "LINK_UNCONFIGURED",
            "Active link probe timed out.",
          ),
        );
      }, 5_000);
      const initialQueueBytes = transport.quality?.().queueDepthBytes ?? 0;
      this.pendingProbes.set(key, {
        sentAt,
        bytes: request.budgetBytes,
        mtu: qualityForRoute(dataPlane, transport).mtu,
        initialQueueBytes,
        resolve,
        reject,
        timer,
        ...(reservation === undefined ? {} : { reservation }),
      });
      void (async () => {
        await reservation?.consume(request.budgetBytes);
        if ((transport.quality?.().queueDepthBytes ?? 0) > initialQueueBytes)
          throw new LinkServiceError(
            "LINK_PROBE_DENIED",
            "Active link probe aborted on queue growth.",
          );
        await transport.send(encodeLinkEnvelope(2, id, body));
      })().catch((error) => {
        clearTimeout(timer);
        this.pendingProbes.delete(key);
        reservation?.release();
        reject(error instanceof Error ? error : new Error(String(error)));
      });
    });
  }

  recordReadiness(
    appId: string,
    peer: PeerHandle,
    readiness: PeerMediaReadiness | null,
  ): void {
    const key = `${appId}\u0000${peer.id}`;
    if (
      readiness === null ||
      readiness.consentPosture === "closed" ||
      readiness.expiresAt <= this.now()
    ) {
      this.readiness.delete(key);
    } else {
      this.readiness.set(key, readiness);
    }
    this.versions.set(appId, (this.versions.get(appId) ?? 0) + 1);
  }

  private async snapshot(
    appId: string,
  ): Promise<ReadonlyMap<string, PeerLinkSummary>> {
    return new Map(
      (await this.peers(appId)).map((peer) => [peer.peer.id, peer]),
    );
  }

  private routeDirectory(): AppPeerRouteDirectory | null {
    return typeof (this.directory as Partial<AppPeerRouteDirectory>).route ===
      "function"
      ? (this.directory as AppPeerRouteDirectory)
      : null;
  }

  private subscribePeerRoute(
    appId: string,
    peer: { readonly handle: PeerHandle },
    directory: AppPeerRouteDirectory,
  ): void {
    const key = `${appId}\u0000${peer.handle.id}`;
    if (this.subscriptions.has(key)) return;
    const route = directory.route(appId, peer.handle);
    if (route?.transport?.subscribe === undefined) return;
    this.subscriptions.set(
      key,
      route.transport.subscribe((payload) => {
        void this.receiveRouteMessage(
          appId,
          peer.handle,
          route.transport!,
          payload,
        );
      }),
    );
    const local = this.options.localReadiness?.(appId, peer.handle) ?? null;
    if (local !== null && local.consentPosture !== "closed")
      void Promise.resolve(
        route.transport.send(
          encodeReadinessEnvelope(READINESS_REQUEST_ID, local),
        ),
      ).catch(() => {});
  }

  private ensureRouteSubscriptions(appId: string): void {
    const directory = this.routeDirectory();
    if (directory === null) return;
    for (const peer of directory.list(appId)) {
      this.subscribePeerRoute(appId, peer, directory);
    }
  }

  private async receiveRouteMessage(
    appId: string,
    peer: PeerHandle,
    transport: {
      send(payload: Uint8Array): void | Promise<void>;
      quality?(): { readonly queueDepthBytes?: number };
    },
    payload: Uint8Array,
  ): Promise<void> {
    const envelope = decodeLinkControl(payload);
    if (envelope === null) return;
    if (envelope.type === 1) {
      await this.handleReadinessControl(appId, peer, transport, envelope);
      return;
    }
    if (envelope.type === 2) {
      await this.echoProbeControl(transport, envelope, payload.byteLength);
      return;
    }
    this.completePendingProbe(appId, peer, transport, envelope);
  }

  private async handleReadinessControl(
    appId: string,
    peer: PeerHandle,
    transport: { send(payload: Uint8Array): void | Promise<void> },
    envelope: { id: string; payload: Uint8Array },
  ): Promise<void> {
    const value = parseMediaReadiness(envelope.payload);
    this.recordReadiness(
      appId,
      peer,
      value === null ||
        value.consentPosture === "closed" ||
        value.expiresAt <= this.now()
        ? null
        : value,
    );
    if (envelope.id !== READINESS_REQUEST_ID) return;
    const local = this.options.localReadiness?.(appId, peer) ?? null;
    if (local !== null && local.consentPosture !== "closed")
      await transport.send(
        encodeReadinessEnvelope(READINESS_RESPONSE_ID, local),
      );
  }

  private async echoProbeControl(
    transport: {
      send(payload: Uint8Array): void | Promise<void>;
      quality?(): { readonly queueDepthBytes?: number };
    },
    envelope: { id: string; payload: Uint8Array },
    byteLength: number,
  ): Promise<void> {
    const initialQueueBytes = transport.quality?.().queueDepthBytes ?? 0;
    const reservation = this.reserveProbeEcho(byteLength);
    if (reservation === "unavailable") return;
    try {
      await reservation?.consume(byteLength);
      if ((transport.quality?.().queueDepthBytes ?? 0) > initialQueueBytes)
        return;
      await transport.send(
        encodeLinkEnvelope(3, envelope.id, envelope.payload),
      );
    } finally {
      reservation?.release();
    }
  }

  private reserveProbeEcho(
    byteLength: number,
  ):
    | { consume(bytes: number): Promise<void>; release(): void }
    | undefined
    | "unavailable" {
    const reservation =
      this.options.controlReservations?.reserveControl(
        Math.max(1, Math.ceil(byteLength / 5)),
      ) ?? undefined;
    if (
      this.options.controlReservations !== undefined &&
      reservation === undefined
    ) {
      return "unavailable";
    }
    return reservation;
  }

  private completePendingProbe(
    appId: string,
    peer: PeerHandle,
    transport: { quality?(): { readonly queueDepthBytes?: number } },
    envelope: { id: string },
  ): void {
    const key = `${appId}\u0000${peer.id}\u0000${envelope.id}`;
    const pending = this.pendingProbes.get(key);
    if (pending === undefined) return;
    this.pendingProbes.delete(key);
    clearTimeout(pending.timer);
    pending.reservation?.release();
    if (
      (transport.quality?.().queueDepthBytes ?? 0) > pending.initialQueueBytes
    ) {
      pending.reject(
        new LinkServiceError(
          "LINK_PROBE_DENIED",
          "Active link probe aborted on queue growth.",
        ),
      );
      return;
    }
    const rttMs = Math.max(1, this.now() - pending.sentAt);
    pending.resolve({
      goodputBps: Math.round((pending.bytes * 2 * 8 * 1_000) / rttMs),
      rttMs,
      jitterMs: 0,
      lossRatio: 0,
      mtu: pending.mtu,
      source: "probed",
      samples: 1,
      confidence: "medium",
    });
  }
}

function encodeLinkEnvelope(
  type: 1 | 2 | 3,
  id: string,
  payload: Uint8Array,
): Uint8Array {
  return encodeLinkControl({ type, id, payload });
}

function sameRoster(
  left: ReadonlyMap<string, PeerLinkSummary> | undefined,
  right: ReadonlyMap<string, PeerLinkSummary>,
): boolean {
  if (left === undefined || left.size !== right.size) return false;
  for (const [id, peer] of right) {
    if (JSON.stringify(left.get(id)) !== JSON.stringify(peer)) return false;
  }
  return true;
}

function diffLinkRoster(
  previous: ReadonlyMap<string, PeerLinkSummary> | undefined,
  current: ReadonlyMap<string, PeerLinkSummary>,
): PeerLinkEvent[] {
  const events: PeerLinkEvent[] = [];
  for (const [id, peer] of current) {
    const before = previous?.get(id);
    if (before === undefined) events.push({ kind: "added", peer });
    else if (JSON.stringify(before) !== JSON.stringify(peer))
      events.push({ kind: "updated", peer });
  }
  for (const [id, peer] of previous ?? []) {
    if (!current.has(id)) events.push({ kind: "removed", peer: peer.peer });
  }
  return events;
}

function planeForDataPlane(
  dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth",
): StreamPlane {
  if (dataPlane === "webrtc") return "webrtc";
  if (dataPlane === "gateway") return "pears-bulk";
  return "reticulum";
}
