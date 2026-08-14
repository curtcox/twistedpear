import { ConfirmedPeerRouteRegistry } from "./route-registry.js";
import { PeerDiscoveryError } from "./errors.js";
import type {
  AcceptOptions,
  AdapterPreference,
  AppPeerSummary,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  EstablishedPeer,
  OfferOptions,
  PeerConnectRequest,
  PeerDiscoveryAdapter,
  PeerDiscoveryKind,
  PeerHandle,
  PeerPairingDriver,
  PeerSummary,
} from "./types.js";

export { PeerDiscoveryError } from "./errors.js";
export type { PeerDiscoveryErrorCode } from "./errors.js";
export type * from "./types.js";
export { PeerReplayCache } from "./replay-cache.js";
export class PeerDiscoveryRegistry {
  private readonly adapters = new Map<
    PeerDiscoveryKind,
    PeerDiscoveryAdapter
  >();
  register(adapter: PeerDiscoveryAdapter): void {
    if (this.adapters.has(adapter.kind))
      throw new Error(`adapter already registered: ${adapter.kind}`);
    this.adapters.set(adapter.kind, adapter);
  }
  get(kind: PeerDiscoveryKind): PeerDiscoveryAdapter | undefined {
    return this.adapters.get(kind);
  }
  diagnostics(): Promise<
    ReadonlyArray<{
      readonly kind: PeerDiscoveryKind;
      readonly availability: DiscoveryAvailability;
    }>
  > {
    return Promise.resolve(
      Promise.all(
        [...this.adapters.values()].map(async (adapter) => ({
          kind: adapter.kind,
          availability: await adapter.availability(),
        })),
      ),
    );
  }
  async select(
    mechanisms: ReadonlyArray<PeerDiscoveryKind> | "any",
    preferences: Readonly<
      Partial<Record<PeerDiscoveryKind, AdapterPreference>>
    > = {},
  ): Promise<PeerDiscoveryAdapter> {
    const candidates =
      mechanisms === "any"
        ? [...this.adapters.values()]
        : mechanisms
            .map((kind) => this.adapters.get(kind))
            .filter((x): x is PeerDiscoveryAdapter => x !== undefined);
    const ranked: Array<{ adapter: PeerDiscoveryAdapter; score: number }> = [];
    for (const adapter of candidates) {
      const availability = await adapter.availability();
      if (
        availability.state === "available" ||
        availability.state === "permission-required"
      ) {
        ranked.push({
          adapter,
          score: adapterScore(availability, preferences[adapter.kind]),
        });
      }
    }
    ranked.sort((a, b) => b.score - a.score);
    const selected = ranked[0]?.adapter;
    if (selected === undefined)
      throw new PeerDiscoveryError(
        "UNAVAILABLE",
        "No requested peer discovery mechanism is available",
      );
    return selected;
  }
}

function adapterScore(
  availability: { readonly state: string },
  preference: AdapterPreference | undefined,
): number {
  const p = preference ?? {};
  return (
    (availability.state === "available" ? 100 : 50) +
    (p.user ?? 0) +
    (p.privacy ?? 0) +
    (p.battery ?? 0)
  );
}

interface HandleEntry {
  readonly appId: string;
  readonly runtimeId: string;
  readonly peer: EstablishedPeer;
  closed: boolean;
}
export class PeerSessionManager {
  private readonly handles = new Map<string, HandleEntry>();
  private nextHandle = 0;
  constructor(
    private readonly registry: PeerDiscoveryRegistry,
    private readonly driver: PeerPairingDriver,
    private readonly maxHandlesPerRuntime = 8,
    readonly routes = new ConfirmedPeerRouteRegistry(),
  ) {}
  request(
    appId: string,
    runtimeId: string,
    request: PeerConnectRequest,
  ): Promise<PeerHandle> {
    return this.open("request", appId, runtimeId, request);
  }
  listen(
    appId: string,
    runtimeId: string,
    request: PeerConnectRequest,
  ): Promise<PeerHandle> {
    return this.open("listen", appId, runtimeId, request);
  }
  diagnostics(): Promise<
    ReadonlyArray<{
      readonly kind: PeerDiscoveryKind;
      readonly availability: DiscoveryAvailability;
    }>
  > {
    return this.registry.diagnostics();
  }
  /** App-scoped authenticated routes. Never exposes another app's handles. */
  list(appId: string): ReadonlyArray<AppPeerSummary> {
    const routes = new Map(
      this.routes.list().map((route) => [route.ownerId, route]),
    );
    return [...this.handles.entries()]
      .filter(([, entry]) => entry.appId === appId && !entry.closed)
      .map(([id, entry]) => ({
        handle: { id },
        fingerprint: entry.peer.fingerprint,
        displayLabel: entry.peer.displayLabel,
        state: "connected",
        rendezvous: entry.peer.rendezvous,
        dataPlane: entry.peer.dataPlane,
        connectedAt: routes.get(id)?.connectedAt ?? 0,
      }));
  }
  /** Host-only route resolution after app ownership has been checked. */
  route(
    appId: string,
    handle: PeerHandle,
  ): import("./route-registry.js").ConfirmedPeerRoute | undefined {
    const entry = this.handles.get(handle.id);
    if (entry === undefined || entry.appId !== appId || entry.closed)
      return undefined;
    return this.routes.list().find((route) => route.ownerId === handle.id);
  }
  private async open(
    mode: "request" | "listen",
    appId: string,
    runtimeId: string,
    request: PeerConnectRequest,
  ): Promise<PeerHandle> {
    const count = [...this.handles.values()].filter(
      (x) => x.appId === appId && x.runtimeId === runtimeId && !x.closed,
    ).length;
    if (count >= this.maxHandlesPerRuntime)
      throw new PeerDiscoveryError(
        "QUOTA_EXCEEDED",
        "Peer handle quota exceeded",
      );
    const adapter = await this.registry.select(request.mechanisms);
    const peer = await this.driver[mode](adapter, request);
    if (peer.authenticated !== true || peer.confirmed !== true)
      throw new PeerDiscoveryError(
        "POLICY_DENIED",
        "Pairing driver returned an unconfirmed peer",
      );
    const id = `peer-${runtimeId}-${this.nextHandle++}`;
    this.handles.set(id, { appId, runtimeId, peer, closed: false });
    this.routes.attach(id, request.service, peer);
    return { id };
  }
  info(appId: string, runtimeId: string, handle: PeerHandle): PeerSummary {
    const entry = this.owned(appId, runtimeId, handle);
    return {
      fingerprint: entry.peer.fingerprint,
      displayLabel: entry.peer.displayLabel,
      state: entry.closed ? "closed" : "connected",
      rendezvous: entry.peer.rendezvous,
      dataPlane: entry.peer.dataPlane,
    };
  }
  async close(
    appId: string,
    runtimeId: string,
    handle: PeerHandle,
  ): Promise<void> {
    const entry = this.owned(appId, runtimeId, handle);
    if (!entry.closed) {
      entry.closed = true;
      this.routes.detach(handle.id);
      await entry.peer.close?.();
    }
  }
  async closeRuntime(appId: string, runtimeId: string): Promise<void> {
    for (const [id, entry] of this.handles)
      if (entry.appId === appId && entry.runtimeId === runtimeId)
        await this.close(appId, runtimeId, { id });
  }
  private owned(
    appId: string,
    runtimeId: string,
    handle: PeerHandle,
  ): HandleEntry {
    const entry = this.handles.get(handle.id);
    if (
      entry === undefined ||
      entry.appId !== appId ||
      entry.runtimeId !== runtimeId
    )
      throw new PeerDiscoveryError("POLICY_DENIED", "Unknown peer handle");
    return entry;
  }
}

export interface MemoryPeerIdentity {
  readonly fingerprint: string;
  readonly displayLabel: string;
  readonly dataPlane?: EstablishedPeer["dataPlane"];
}
interface MemoryWaiter {
  readonly mode: "request" | "listen";
  readonly adapter: PeerDiscoveryAdapter;
  readonly request: PeerConnectRequest;
  readonly identity: MemoryPeerIdentity;
  readonly confirm: (
    peer: MemoryPeerIdentity,
    request: PeerConnectRequest,
  ) => Promise<boolean>;
  readonly resolve: (peer: EstablishedPeer) => void;
  readonly reject: (error: Error) => void;
  readonly timer: ReturnType<typeof setTimeout>;
}
/** Test/reference rendezvous effect. It grants no authority until both host confirmation callbacks approve. */
export class MemoryPeerDiscoveryHub {
  private readonly waiting = new Map<string, MemoryWaiter[]>();
  pair(
    mode: "request" | "listen",
    adapter: PeerDiscoveryAdapter,
    request: PeerConnectRequest,
    identity: MemoryPeerIdentity,
    confirm: MemoryWaiter["confirm"],
  ): Promise<EstablishedPeer> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.remove(request.service, waiter);
        reject(new PeerDiscoveryError("TIMEOUT", "Peer pairing timed out"));
      }, request.timeoutMs);
      const waiter: MemoryWaiter = {
        mode,
        adapter,
        request,
        identity,
        confirm,
        resolve,
        reject,
        timer,
      };
      const candidates = this.waiting.get(request.service) ?? [];
      const otherIndex = candidates.findIndex(
        (entry) => entry.mode !== mode && entry.adapter.kind === adapter.kind,
      );
      const other =
        otherIndex < 0 ? undefined : candidates.splice(otherIndex, 1)[0];
      if (other === undefined) {
        candidates.push(waiter);
        this.waiting.set(request.service, candidates);
        return;
      }
      clearTimeout(other.timer);
      clearTimeout(timer);
      if (candidates.length === 0) this.waiting.delete(request.service);
      void this.confirmPair(other, waiter);
    });
  }
  private remove(service: string, waiter: MemoryWaiter): void {
    const entries = this.waiting.get(service);
    if (entries === undefined) return;
    const index = entries.indexOf(waiter);
    if (index >= 0) entries.splice(index, 1);
    if (entries.length === 0) this.waiting.delete(service);
  }
  private async confirmPair(
    left: MemoryWaiter,
    right: MemoryWaiter,
  ): Promise<void> {
    try {
      const [leftConfirmed, rightConfirmed] = await Promise.all([
        left.confirm(right.identity, left.request),
        right.confirm(left.identity, right.request),
      ]);
      if (!leftConfirmed || !rightConfirmed)
        throw new PeerDiscoveryError(
          "CANCELLED",
          "Peer confirmation was declined",
        );
      left.resolve({
        authenticated: true,
        confirmed: true,
        fingerprint: right.identity.fingerprint,
        displayLabel: right.identity.displayLabel,
        rendezvous: left.adapter.kind,
        dataPlane: right.identity.dataPlane ?? "reticulum",
      });
      right.resolve({
        authenticated: true,
        confirmed: true,
        fingerprint: left.identity.fingerprint,
        displayLabel: left.identity.displayLabel,
        rendezvous: right.adapter.kind,
        dataPlane: left.identity.dataPlane ?? "reticulum",
      });
    } catch (error) {
      const failure =
        error instanceof Error ? error : new Error("Peer confirmation failed");
      left.reject(failure);
      right.reject(failure);
    }
  }
}
export class MemoryPairingDriver implements PeerPairingDriver {
  constructor(
    private readonly hub: MemoryPeerDiscoveryHub,
    private readonly identity: MemoryPeerIdentity,
    private readonly confirm: (
      peer: MemoryPeerIdentity,
      request: PeerConnectRequest,
    ) => Promise<boolean>,
  ) {}
  request(
    adapter: PeerDiscoveryAdapter,
    request: PeerConnectRequest,
  ): Promise<EstablishedPeer> {
    return this.hub.pair(
      "request",
      adapter,
      request,
      this.identity,
      this.confirm,
    );
  }
  listen(
    adapter: PeerDiscoveryAdapter,
    request: PeerConnectRequest,
  ): Promise<EstablishedPeer> {
    return this.hub.pair(
      "listen",
      adapter,
      request,
      this.identity,
      this.confirm,
    );
  }
}
export class MemoryPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind: PeerDiscoveryKind = "manual";
  availability(): Promise<DiscoveryAvailability> {
    return Promise.resolve({ state: "available" });
  }
  async *offer(
    _envelope: Uint8Array,
    _options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    await Promise.resolve();
  }
  async *accept(_options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    await Promise.resolve();
  }
  answer(_session: DiscoverySession, _envelope: Uint8Array): Promise<void> {
    return Promise.resolve();
  }
  cancel(_sessionId: string): Promise<void> {
    return Promise.resolve();
  }
}
export { ManualPeerDiscoveryAdapter } from "./manual.js";
export type {
  ManualDiscoveryAdapterOptions,
  ManualDiscoveryChannel,
  ManualInboundCode,
} from "./manual.js";
export {
  encodePeerQrCodes,
  MAX_STATIC_PEER_QR_TEXT_LENGTH,
  PEER_QR_CHUNK_PAYLOAD_BYTES,
  QrPeerDiscoveryAdapter,
} from "./qr.js";
export type {
  QrDiscoveryAdapterOptions,
  QrDiscoveryChannel,
  QrInboundCode,
} from "./qr.js";
export { withDiscoveryBudget } from "./budget.js";
export { InvitationPairingDriver } from "./coordinator.js";
export type {
  AuthenticatedPairingContext,
  InvitationPairingDriverOptions,
  PairingAnswerContext,
  PairingOfferContext,
  PeerPairingSecurityBackend,
  UnconfirmedPeer,
} from "./coordinator.js";
export { CryptoPeerPairingBackend } from "./crypto-backend.js";
export type {
  CryptoPeerPairingOptions,
  CryptoPeerRouteContext,
  PeerSigningIdentity,
} from "./crypto-backend.js";
export {
  decodeNtfyRendezvousSecret,
  decryptNtfyRendezvousMessage,
  encodeNtfyRendezvousSecret,
  encryptNtfyRendezvousMessage,
  NtfyPeerDiscoveryAdapter,
  NtfyRendezvousClient,
} from "./ntfy.js";
export type {
  NtfyClientConfig,
  NtfyDiscoveryAdapterOptions,
  NtfyRendezvousEffect,
  NtfyRendezvousMessage,
  NtfyRendezvousSecret,
  NtfySecretChannel,
} from "./ntfy.js";
export { AudioPeerDiscoveryAdapter } from "./audio.js";
export type {
  AudioDiscoveryAdapterOptions,
  AudioDiscoveryChannel,
  AudioInboundFrame,
} from "./audio.js";
export {
  BluetoothPeerDiscoveryAdapter,
  createUnsupportedWebBluetoothChannel,
} from "./bluetooth.js";
export type {
  BluetoothDiscoveryAdapterOptions,
  BluetoothDiscoveryChannel,
  BluetoothInboundInvitation,
} from "./bluetooth.js";
export { LocalPeerToPeerDiscoveryAdapter } from "./local-peer-to-peer.js";
export {
  decodePeerQrRgba,
  MAX_PORTABLE_QR_DIMENSION,
  PortableQrDecodeError,
} from "./portable-qr.js";
export { WebRtcRouteController } from "./webrtc-route.js";
export type {
  WebRtcMediaRoute,
  WebRtcRoute,
  WebRtcRouteControllerOptions,
} from "./webrtc-route.js";
export { ReticulumPeerDiscoveryAdapter } from "./reticulum.js";
export type {
  ReticulumDiscoveryAdapterOptions,
  ReticulumDiscoveryChannel,
  ReticulumInboundInvitation,
} from "./reticulum.js";
export { meterHostPeerRoute } from "./route-quality.js";
export type { MeteredHostPeerRouteOptions } from "./route-quality.js";
export { ConfirmedPeerRouteRegistry } from "./route-registry.js";
export type {
  ConfirmedPeerRoute,
  ConfirmedPeerRouteListener,
  HostPeerRoute,
} from "./route-registry.js";
export { UnavailablePeerDiscoveryAdapter } from "./unavailable.js";
