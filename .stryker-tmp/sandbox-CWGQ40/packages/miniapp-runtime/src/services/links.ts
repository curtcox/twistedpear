// @ts-nocheck
import type {
  LinkQuality,
  PeerMediaReadiness,
  RouteQualityReport,
  StreamPlane
} from "@twistedpear/protocol";
import {
  decodeLinkControl,
  encodeLinkControl,
  encodeReadinessEnvelope,
  parseMediaReadiness,
  READINESS_REQUEST_ID,
  READINESS_RESPONSE_ID
} from "@twistedpear/protocol";
import type { PeerHandle } from "@twistedpear/peer-discovery";
import { qualityForPeerRoute as qualityForRoute } from "../route-quality.js";

export type LinkReachability = "direct" | "mesh" | "store-and-forward" | "unreachable";
export type LinkFreshness = "live" | "recent" | "stale";

export interface PeerLinkSummary {
  readonly peer: PeerHandle;
  readonly displayLabel: string;
  readonly plane: StreamPlane;
  readonly reachability: LinkReachability;
  readonly quality: LinkQuality;
  readonly readiness: PeerMediaReadiness | null;
  readonly observedAt: number;
  readonly freshness: LinkFreshness;
}

export type PeerLinkEvent =
  | { readonly kind: "added" | "updated"; readonly peer: PeerLinkSummary }
  | { readonly kind: "removed"; readonly peer: PeerHandle };

export interface LinkWatchBatch {
  readonly cursor: string;
  readonly events: ReadonlyArray<PeerLinkEvent>;
}

export interface LinkProbeOptions {
  readonly budgetBytes?: number;
}

export interface HostLinkProbeRequest {
  readonly budgetBytes: number;
  readonly reservationClass: "control";
  readonly abortOnQueueGrowth: true;
}

export interface LinkObservatoryBackend {
  /** Returns only peers in this app's relationship/announce namespace. */
  peers(appId: string): Promise<ReadonlyArray<PeerLinkSummary>>;
  watch?(appId: string, cursor?: string): Promise<LinkWatchBatch>;
  probePolicy?(appId: string, peer: PeerHandle): Promise<"allowed" | "confirm" | "denied">;
  /** Probe implementation must honor this request on the shared host limiter. */
  probe(appId: string, peer: PeerHandle, request: HostLinkProbeRequest): Promise<LinkQuality>;
}

export interface LinkQualityServiceOptions {
  readonly now?: () => number;
  readonly confirmCostlyProbe?: (input: {
    readonly appId: string;
    readonly peer: PeerHandle;
    readonly budgetBytes: number;
  }) => Promise<boolean>;
}

export interface AppPeerDirectory {
  list(appId: string): ReadonlyArray<{
    readonly handle: PeerHandle;
    readonly displayLabel: string;
    readonly dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
    readonly connectedAt: number;
  }>;
}

export interface PeerRouteLinkObservatoryOptions {
  readonly now?: () => number;
  readonly probe?: LinkObservatoryBackend["probe"];
  readonly probePolicy?: LinkObservatoryBackend["probePolicy"];
  readonly localReadiness?: (appId: string, peer: PeerHandle) => PeerMediaReadiness | null;
  readonly controlReservations?: { reserveControl(bytesPerSecond: number): null | { consume(bytes: number): Promise<void>; release(): void } };
}

interface AppPeerRouteDirectory extends AppPeerDirectory {
  route(appId: string, peer: PeerHandle): undefined | { readonly transport?: { send(payload: Uint8Array): void | Promise<void>; subscribe?(listener: (payload: Uint8Array) => void): () => void; quality?(): RouteQualityReport } };
}

/** App-scoped adapter over authenticated peer routes. */
export class PeerRouteLinkObservatory implements LinkObservatoryBackend {
  private readonly now: () => number;
  private readonly readiness = new Map<string, PeerMediaReadiness>();
  private readonly versions = new Map<string, number>();
  private readonly snapshots = new Map<string, ReadonlyMap<string, PeerLinkSummary>>();
  private readonly subscriptions = new Map<string, () => void>();
  private readonly pendingProbes = new Map<string, { sentAt: number; bytes: number; mtu: number; initialQueueBytes: number; resolve: (quality: LinkQuality) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout>; reservation?: { release(): void } }>();
  private nextProbe = 0;

  constructor(
    private readonly directory: AppPeerDirectory,
    private readonly options: PeerRouteLinkObservatoryOptions = {}
  ) {
    this.now = options.now ?? (() => 0);
  }

  async peers(appId: string): Promise<ReadonlyArray<PeerLinkSummary>> {
    this.ensureRouteSubscriptions(appId);
    const now = this.now();
    return this.directory.list(appId).map((entry) => {
      const readiness = this.readiness.get(`${appId}\u0000${entry.handle.id}`);
      return {
        peer: entry.handle,
        displayLabel: entry.displayLabel,
        plane: planeForDataPlane(entry.dataPlane),
        reachability: "direct",
        quality: qualityForRoute(entry.dataPlane, this.routeDirectory()?.route(appId, entry.handle)?.transport),
        readiness: readiness !== undefined && readiness.expiresAt > now ? readiness : null,
        observedAt: entry.connectedAt,
        freshness: now - entry.connectedAt <= 30_000 ? "live" : now - entry.connectedAt <= 300_000 ? "recent" : "stale"
      };
    });
  }

  async watch(appId: string, cursor?: string): Promise<LinkWatchBatch> {
    let current = await this.snapshot(appId);
    let version = this.versions.get(appId) ?? 0;
    if (cursor === String(version) && sameRoster(this.snapshots.get(appId), current)) {
      // Broker watch is long-polled. A bounded idle wait prevents a sandbox's
      // AsyncIterable loop from becoming a CPU-burning request loop.
      await new Promise((resolve) => setTimeout(resolve, 1_000));
      current = await this.snapshot(appId);
    }
    const previous = this.snapshots.get(appId);
    const events: PeerLinkEvent[] = [];
    for (const [id, peer] of current) {
      const before = previous?.get(id);
      if (before === undefined) events.push({ kind: "added", peer });
      else if (JSON.stringify(before) !== JSON.stringify(peer)) events.push({ kind: "updated", peer });
    }
    for (const [id, peer] of previous ?? []) {
      if (!current.has(id)) events.push({ kind: "removed", peer: peer.peer });
    }
    if (events.length > 0 || cursor === undefined) version += 1;
    this.versions.set(appId, version);
    this.snapshots.set(appId, current);
    return { cursor: String(version), events };
  }

  probePolicy(appId: string, peer: PeerHandle): Promise<"allowed" | "confirm" | "denied"> {
    const entry = this.directory.list(appId).find((candidate) => candidate.handle.id === peer.id);
    if (entry === undefined) return Promise.resolve("denied");
    if (this.options.probePolicy !== undefined) return this.options.probePolicy(appId, peer);
    if (this.options.probe !== undefined) return Promise.resolve("allowed");
    const route = this.routeDirectory()?.route(appId, peer);
    if (route?.transport === undefined) return Promise.resolve("denied");
    return Promise.resolve(entry.dataPlane === "reticulum" || entry.dataPlane === "bluetooth" ? "confirm" : "allowed");
  }

  probe(appId: string, peer: PeerHandle, request: HostLinkProbeRequest): Promise<LinkQuality> {
    if (this.options.probe !== undefined) return this.options.probe(appId, peer, request);
    const directory = this.routeDirectory(); const route = directory?.route(appId, peer);
    if (directory === null || route?.transport === undefined) throw new LinkServiceError("LINK_UNCONFIGURED", "Active link probing is not configured for this route.");
    const transport = route.transport;
    const directoryEntry = directory.list(appId).find((entry) => entry.handle.id === peer.id);
    if (directoryEntry === undefined) throw new LinkServiceError("LINK_UNCONFIGURED", "Active link probing is not configured for this peer.");
    this.ensureRouteSubscriptions(appId); const id = `probe-${this.nextProbe++}`; const sentAt = this.now(); const envelopeOverhead = 8 + id.length; const body = new Uint8Array(Math.max(0, request.budgetBytes - envelopeOverhead));
    return new Promise((resolve, reject) => {
      const reservation = this.options.controlReservations?.reserveControl(Math.max(1, Math.ceil(request.budgetBytes / 5))) ?? undefined;
      if (this.options.controlReservations !== undefined && reservation === undefined) { reject(new LinkServiceError("LINK_UNCONFIGURED", "Control bandwidth reservation is unavailable.")); return; }
      const key = `${appId}\u0000${peer.id}\u0000${id}`; const timer = setTimeout(() => { const pending = this.pendingProbes.get(key); this.pendingProbes.delete(key); pending?.reservation?.release(); reject(new LinkServiceError("LINK_UNCONFIGURED", "Active link probe timed out.")); }, 5_000);
      const initialQueueBytes = transport.quality?.().queueDepthBytes ?? 0;
      this.pendingProbes.set(key, { sentAt, bytes: request.budgetBytes, mtu: qualityForRoute(directoryEntry.dataPlane, transport).mtu, initialQueueBytes, resolve, reject, timer, ...(reservation === undefined ? {} : { reservation }) });
      void (async () => { await reservation?.consume(request.budgetBytes); if ((transport.quality?.().queueDepthBytes ?? 0) > initialQueueBytes) throw new LinkServiceError("LINK_PROBE_DENIED", "Active link probe aborted on queue growth."); await transport.send(encodeLinkEnvelope(2, id, body)); })().catch((error) => { clearTimeout(timer); this.pendingProbes.delete(key); reservation?.release(); reject(error instanceof Error ? error : new Error(String(error))); });
    });
  }

  recordReadiness(appId: string, peer: PeerHandle, readiness: PeerMediaReadiness | null): void {
    const key = `${appId}\u0000${peer.id}`;
    if (readiness === null || readiness.consentPosture === "closed" || readiness.expiresAt <= this.now()) {
      this.readiness.delete(key);
    } else {
      this.readiness.set(key, readiness);
    }
    this.versions.set(appId, (this.versions.get(appId) ?? 0) + 1);
  }

  private async snapshot(appId: string): Promise<ReadonlyMap<string, PeerLinkSummary>> {
    return new Map((await this.peers(appId)).map((peer) => [peer.peer.id, peer]));
  }

  private routeDirectory(): AppPeerRouteDirectory | null {
    return typeof (this.directory as Partial<AppPeerRouteDirectory>).route === "function" ? this.directory as AppPeerRouteDirectory : null;
  }

  private ensureRouteSubscriptions(appId: string): void {
    const directory = this.routeDirectory(); if (directory === null) return;
    for (const peer of directory.list(appId)) {
      const key = `${appId}\u0000${peer.handle.id}`; if (this.subscriptions.has(key)) continue;
      const route = directory.route(appId, peer.handle); if (route?.transport?.subscribe === undefined) continue;
      this.subscriptions.set(key, route.transport.subscribe((payload) => { void this.receiveRouteMessage(appId, peer.handle, route.transport!, payload); }));
      const local = this.options.localReadiness?.(appId, peer.handle) ?? null;
      if (local !== null && local.consentPosture !== "closed") void Promise.resolve(route.transport.send(encodeReadinessEnvelope(READINESS_REQUEST_ID, local))).catch(() => {});
    }
  }

  private async receiveRouteMessage(appId: string, peer: PeerHandle, transport: { send(payload: Uint8Array): void | Promise<void>; quality?(): { readonly queueDepthBytes?: number } }, payload: Uint8Array): Promise<void> {
    const envelope = decodeLinkControl(payload); if (envelope === null) return;
    if (envelope.type === 1) {
      const value = parseMediaReadiness(envelope.payload);
      this.recordReadiness(appId, peer, value === null || value.consentPosture === "closed" || value.expiresAt <= this.now() ? null : value);
      if (envelope.id === READINESS_REQUEST_ID) { const local = this.options.localReadiness?.(appId, peer) ?? null; if (local !== null && local.consentPosture !== "closed") await transport.send(encodeReadinessEnvelope(READINESS_RESPONSE_ID, local)); }
      return;
    }
    if (envelope.type === 2) { const initialQueueBytes = transport.quality?.().queueDepthBytes ?? 0; const reservation = this.options.controlReservations?.reserveControl(Math.max(1, Math.ceil(payload.byteLength / 5))) ?? undefined; if (this.options.controlReservations !== undefined && reservation === undefined) return; try { await reservation?.consume(payload.byteLength); if ((transport.quality?.().queueDepthBytes ?? 0) > initialQueueBytes) return; await transport.send(encodeLinkEnvelope(3, envelope.id, envelope.payload)); } finally { reservation?.release(); } return; }
    const key = `${appId}\u0000${peer.id}\u0000${envelope.id}`; const pending = this.pendingProbes.get(key); if (pending === undefined) return; this.pendingProbes.delete(key); clearTimeout(pending.timer); pending.reservation?.release(); if ((transport.quality?.().queueDepthBytes ?? 0) > pending.initialQueueBytes) { pending.reject(new LinkServiceError("LINK_PROBE_DENIED", "Active link probe aborted on queue growth.")); return; } const rttMs = Math.max(1, this.now() - pending.sentAt); pending.resolve({ goodputBps: Math.round((pending.bytes * 2 * 8 * 1_000) / rttMs), rttMs, jitterMs: 0, lossRatio: 0, mtu: pending.mtu, source: "probed", samples: 1, confidence: "medium" });
  }
}

function encodeLinkEnvelope(type: 1 | 2 | 3, id: string, payload: Uint8Array): Uint8Array {
  return encodeLinkControl({ type, id, payload });
}

function sameRoster(
  left: ReadonlyMap<string, PeerLinkSummary> | undefined,
  right: ReadonlyMap<string, PeerLinkSummary>
): boolean {
  if (left === undefined || left.size !== right.size) return false;
  for (const [id, peer] of right) {
    if (JSON.stringify(left.get(id)) !== JSON.stringify(peer)) return false;
  }
  return true;
}

function planeForDataPlane(dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth"): StreamPlane {
  if (dataPlane === "webrtc") return "webrtc";
  if (dataPlane === "gateway") return "pears-bulk";
  return "reticulum";
}

export class LinkServiceError extends Error {
  constructor(
    readonly code: "LINK_BAD_REQUEST" | "LINK_PROBE_RATE_LIMITED" | "LINK_PROBE_DENIED" | "LINK_UNCONFIGURED",
    message: string
  ) {
    super(message);
    this.name = "LinkServiceError";
  }
}

export const DEFAULT_LINK_PROBE_BUDGET_BYTES = 8 * 1024;
export const LINK_PROBE_INTERVAL_MS = 60_000;

export class LinkQualityService {
  private readonly lastProbeAt = new Map<string, number>();
  private readonly now: () => number;

  constructor(
    private readonly backend: LinkObservatoryBackend,
    private readonly options: LinkQualityServiceOptions = {}
  ) {
    this.now = options.now ?? (() => 0);
  }

  peers(appId: string): Promise<ReadonlyArray<PeerLinkSummary>> {
    return this.backend.peers(appId);
  }

  async watch(appId: string, cursor?: string): Promise<LinkWatchBatch> {
    if (this.backend.watch === undefined) {
      throw new LinkServiceError("LINK_UNCONFIGURED", "Live link watching is not configured on this host.");
    }
    return this.backend.watch(appId, cursor);
  }

  async probe(appId: string, peer: PeerHandle, options: LinkProbeOptions = {}): Promise<LinkQuality> {
    if (typeof peer?.id !== "string" || peer.id.length < 1 || peer.id.length > 256) {
      throw new LinkServiceError("LINK_BAD_REQUEST", "A valid opaque peer handle is required.");
    }
    const budgetBytes = options.budgetBytes ?? DEFAULT_LINK_PROBE_BUDGET_BYTES;
    if (!Number.isInteger(budgetBytes) || budgetBytes < 256 || budgetBytes > DEFAULT_LINK_PROBE_BUDGET_BYTES) {
      throw new LinkServiceError(
        "LINK_BAD_REQUEST",
        `Probe budget must be 256-${DEFAULT_LINK_PROBE_BUDGET_BYTES} bytes.`
      );
    }

    const key = `${appId}\u0000${peer.id}`;
    const at = this.now();
    const previous = this.lastProbeAt.get(key);
    if (previous !== undefined && at - previous < LINK_PROBE_INTERVAL_MS) {
      throw new LinkServiceError("LINK_PROBE_RATE_LIMITED", "Only one probe per peer per 60 seconds is permitted.");
    }

    const policy = await this.backend.probePolicy?.(appId, peer) ?? "allowed";
    if (policy === "denied") {
      throw new LinkServiceError("LINK_PROBE_DENIED", "The host denied probing on this link.");
    }
    if (policy === "confirm") {
      const accepted = await this.options.confirmCostlyProbe?.({ appId, peer, budgetBytes }) ?? false;
      if (!accepted) {
        throw new LinkServiceError("LINK_PROBE_DENIED", "The user did not approve probing this costly link.");
      }
    }

    // Reserve the rate slot before the effect so repeated failures cannot be used
    // as an unbounded traffic-generation primitive.
    this.lastProbeAt.set(key, at);
    return this.backend.probe(appId, peer, {
      budgetBytes,
      reservationClass: "control",
      abortOnQueueGrowth: true
    });
  }
}
