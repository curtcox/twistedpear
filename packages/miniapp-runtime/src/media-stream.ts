import type { MediaCodecConfiguration, MediaCodecDriver } from "@twistedpear/effects";
import {
  decodeDeviceStreamFrame,
  encodeDeviceStreamFrame,
  type AdmissionDecision,
  type LinkQuality,
  type LinkSupply,
  type RouteQualityReport,
  type StreamDemand,
  type StreamPlane
} from "@twistedpear/protocol";
import type { PeerHandle } from "@twistedpear/peer-discovery";
import { qualityForPeerRoute as routeQuality } from "./route-quality.js";

export interface StreamEgressSendResult { readonly queuedBytes: number; readonly droppedOldest: number; }
export interface StreamEgress {
  readonly plane: StreamPlane;
  send(frame: Uint8Array): Promise<StreamEgressSendResult>;
  quality(): LinkQuality;
  close(): Promise<void>;
}
export interface StreamEgressFactory {
  create(input: { readonly appId: string; readonly peer: string; readonly demand: StreamDemand; readonly admission: AdmissionDecision }): Promise<StreamEgress>;
}

export interface AppPeerMediaRouteDirectory {
  route(appId: string, handle: PeerHandle): undefined | {
    readonly dataPlane: "reticulum" | "webrtc" | "gateway" | "bluetooth";
    readonly transport?: {
      send(payload: Uint8Array): void | Promise<void>;
      subscribe?(listener: (payload: Uint8Array) => void): () => void;
      quality?(): RouteQualityReport;
    };
  };
}

export interface PeerRouteMediaDirectory extends AppPeerMediaRouteDirectory {
  list(appId: string): ReadonlyArray<{ readonly handle: PeerHandle; readonly displayLabel: string }>;
}

export interface PeerRouteMediaBridgeOptions {
  readonly now?: () => number;
  readonly randomBytes?: (length: number) => Uint8Array;
  readonly onFrame?: (appId: string, stream: InboundStream, frame: Uint8Array, offer: StreamOffer) => void | Promise<void>;
}

/** Concrete egress over an already authenticated host-owned peer route. */
export class PeerRouteStreamEgressFactory implements StreamEgressFactory {
  constructor(private readonly routes: AppPeerMediaRouteDirectory) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const route = this.routes.route(input.appId, { id: input.peer });
    if (route?.transport === undefined) throw new Error("The authenticated peer route has no media transport.");
    const plane = route.dataPlane === "webrtc" ? "webrtc" : route.dataPlane === "gateway" ? "pears-bulk" : "reticulum";
    if (plane !== input.admission.plane) throw new Error(`The admitted ${input.admission.plane} plane is not bound to this peer route.`);
    return {
      plane,
      async send(frame) {
        await route.transport?.send(frame);
        return { queuedBytes: 0, droppedOldest: 0 };
      },
      quality: () => routeQuality(route.dataPlane, route.transport),
      close: async () => {}
    };
  }
}

export function createPeerRouteLinkSupply(routes: AppPeerMediaRouteDirectory) {
  return async (appId: string, peer: string): Promise<ReadonlyArray<LinkSupply>> => {
    const route = routes.route(appId, { id: peer });
    if (route === undefined) return [];
    const quality = routeQuality(route.dataPlane, route.transport);
    return [{
      plane: route.dataPlane === "webrtc" ? "webrtc" : route.dataPlane === "gateway" ? "pears-bulk" : "reticulum",
      effectiveBps: quality.goodputBps,
      measuredGoodputBps: quality.goodputBps,
      headroomBps: quality.goodputBps
    }];
  };
}

const MEDIA_MAGIC = new Uint8Array([0x54, 0x50, 0x4d, 0x31]); // TPM1
type MediaEnvelope = { readonly type: 1 | 2 | 3; readonly id: string; readonly payload: Uint8Array };

/** Bounded offer/frame transport shared by authenticated Reticulum/WebRTC routes. */
export class PeerRouteMediaBridge implements StreamEgressFactory, InboundMediaBackend {
  private nextId = 0;
  private version = 0;
  private readonly now: () => number;
  private readonly offers = new Map<string, { appId: string; offer: StreamOffer; route: NonNullable<ReturnType<PeerRouteMediaDirectory["route"]>> }>();
  private readonly streams = new Map<string, { appId: string; stream: InboundStream; offer: StreamOffer }>();
  private readonly subscriptions = new Map<string, () => void>();
  private readonly chunks = new Map<string, Array<Uint8Array | null>>();

  constructor(private readonly routes: PeerRouteMediaDirectory, private readonly options: PeerRouteMediaBridgeOptions = {}) {
    this.now = options.now ?? (() => 0);
  }

  async create(input: { readonly appId: string; readonly peer: string; readonly demand: StreamDemand; readonly admission: AdmissionDecision }): Promise<StreamEgress> {
    const route = this.routes.route(input.appId, { id: input.peer });
    if (route?.transport === undefined) throw new Error("The authenticated peer route has no media transport.");
    const plane = route.dataPlane === "webrtc" ? "webrtc" : route.dataPlane === "gateway" ? "pears-bulk" : "reticulum";
    if (plane !== input.admission.plane) throw new Error(`The admitted ${input.admission.plane} plane is not bound to this peer route.`);
    const random = this.options.randomBytes?.(4) ?? defaultMediaRandom(4, this.nextId);
    const id = `media-${this.now().toString(36)}-${this.nextId++}-${Array.from(random, (value) => value.toString(16).padStart(2, "0")).join("")}`;
    const expiresAt = this.now() + 60_000;
    const offer = new TextEncoder().encode(JSON.stringify({ classId: input.demand.classId, tierId: input.demand.tierId, encoding: input.demand.encoding ?? input.admission.rung, plane, expiresAt }));
    await route.transport.send(encodeMediaEnvelope({ type: 1, id, payload: offer }));
    let closed = false;
    let frameId = 0;
    return {
      plane,
      send: async (frame) => { if (closed) throw new Error("Media route is closed."); const chunkBytes = 60 * 1024; const count = Math.ceil(frame.length / chunkBytes); if (count < 1 || count > 32) throw new Error("Media frame exceeds route chunk bounds."); const currentFrame = frameId++; for (let index = 0; index < count; index += 1) { const body = frame.subarray(index * chunkBytes, Math.min(frame.length, (index + 1) * chunkBytes)); const chunk = new Uint8Array(8 + body.length); const view = new DataView(chunk.buffer); view.setUint32(0, currentFrame, false); view.setUint16(4, index, false); view.setUint16(6, count, false); chunk.set(body, 8); await route.transport?.send(encodeMediaEnvelope({ type: 2, id, payload: chunk })); } return { queuedBytes: 0, droppedOldest: 0 }; },
      quality: () => routeQuality(route.dataPlane, route.transport),
      close: async () => { if (closed) return; closed = true; await route.transport?.send(encodeMediaEnvelope({ type: 3, id, payload: new Uint8Array() })); }
    };
  }

  async pollOffers(appId: string): Promise<StreamOfferBatch> {
    this.ensureSubscriptions(appId);
    const now = this.now();
    return { cursor: String(this.version), offers: [...this.offers.values()].filter((entry) => entry.appId === appId && entry.offer.expiresAt > now).map((entry) => entry.offer) };
  }

  async accept(appId: string, offer: StreamOffer, sink: StreamSink): Promise<InboundStream> {
    const entry = this.offers.get(offer.id);
    if (entry === undefined || entry.appId !== appId) throw new Error("Unknown peer-route media offer.");
    const stream = { handle: `inbound-${offer.id}`, offerId: offer.id, sink };
    this.offers.delete(offer.id); this.streams.set(offer.id, { appId, stream, offer }); this.version += 1;
    return stream;
  }

  async decline(appId: string, offer: StreamOffer): Promise<void> {
    const entry = this.offers.get(offer.id); if (entry?.appId !== appId) return;
    this.offers.delete(offer.id); this.version += 1;
    await entry.route.transport?.send(encodeMediaEnvelope({ type: 3, id: offer.id, payload: new Uint8Array() }));
  }

  async close(appId: string, stream: InboundStream): Promise<void> {
    const entry = this.streams.get(stream.offerId); if (entry?.appId === appId) this.streams.delete(stream.offerId);
  }

  private ensureSubscriptions(appId: string): void {
    for (const peer of this.routes.list(appId)) {
      const key = `${appId}\u0000${peer.handle.id}`; if (this.subscriptions.has(key)) continue;
      const route = this.routes.route(appId, peer.handle); if (route?.transport?.subscribe === undefined) continue;
      this.subscriptions.set(key, route.transport.subscribe((payload) => { void this.receive(appId, peer, route, payload); }));
    }
  }

  private async receive(appId: string, peer: { readonly handle: PeerHandle; readonly displayLabel: string }, route: NonNullable<ReturnType<PeerRouteMediaDirectory["route"]>>, payload: Uint8Array): Promise<void> {
    const envelope = decodeMediaEnvelope(payload); if (envelope === null) return;
    if (envelope.type === 1) {
      try {
        const value = JSON.parse(new TextDecoder().decode(envelope.payload)) as Record<string, unknown>;
        if (!["camera", "microphone", "screen-capture"].includes(String(value.classId)) || typeof value.tierId !== "string" || typeof value.encoding !== "string" || typeof value.expiresAt !== "number" || value.expiresAt <= this.now()) return;
        const plane = value.plane; if (!["webrtc", "pears-bulk", "reticulum", "lxmf", "cas"].includes(String(plane))) return;
        this.offers.set(envelope.id, { appId, route, offer: { id: envelope.id, peer: peer.handle, displayLabel: peer.displayLabel, classId: value.classId as StreamOffer["classId"], tierId: value.tierId, encoding: value.encoding, plane: plane as StreamPlane, expiresAt: value.expiresAt } }); this.version += 1;
      } catch { return; }
      return;
    }
    if (envelope.type === 3) { this.offers.delete(envelope.id); this.streams.delete(envelope.id); for (const key of this.chunks.keys()) if (key.startsWith(`${appId}\u0000${envelope.id}\u0000`)) this.chunks.delete(key); this.version += 1; return; }
    if (envelope.payload.length < 8) return; const view = new DataView(envelope.payload.buffer, envelope.payload.byteOffset, envelope.payload.byteLength); const frameId = view.getUint32(0, false); const index = view.getUint16(4, false); const count = view.getUint16(6, false); if (count < 1 || count > 32 || index >= count) return;
    const chunkKey = `${appId}\u0000${envelope.id}\u0000${frameId}`; const chunks = this.chunks.get(chunkKey) ?? Array<Uint8Array | null>(count).fill(null); if (chunks.length !== count) { this.chunks.delete(chunkKey); return; } chunks[index] = envelope.payload.slice(8); this.chunks.set(chunkKey, chunks); if (chunks.some((chunk) => chunk === null)) return; this.chunks.delete(chunkKey); const length = chunks.reduce((sum, chunk) => sum + chunk!.length, 0); if (length > 1_048_612) return; const frame = new Uint8Array(length); let offset = 0; for (const chunk of chunks) { frame.set(chunk!, offset); offset += chunk!.length; }
    try { decodeDeviceStreamFrame(frame); } catch { return; }
    const active = this.streams.get(envelope.id); if (active?.appId === appId) await this.options.onFrame?.(appId, active.stream, frame, active.offer);
  }
}

/**
 * Deterministic id salt. Entropy is an effect: a host that wants unguessable
 * media ids injects `randomBytes`. Reading `globalThis.crypto` here would put
 * an environment read inside a Sans-IO root.
 */
function defaultMediaRandom(length: number, seed: number): Uint8Array { const bytes = new Uint8Array(length); for (let index = 0; index < length; index += 1) bytes[index] = (seed * 31 + index * 17 + 3) & 0xff; return bytes; }

function encodeMediaEnvelope(envelope: MediaEnvelope): Uint8Array {
  const id = new TextEncoder().encode(envelope.id); if (id.length > 128 || envelope.payload.length > 0xffff) throw new Error("Peer media envelope exceeds bounds.");
  const output = new Uint8Array(8 + id.length + envelope.payload.length); output.set(MEDIA_MAGIC); output[4] = envelope.type; output[5] = id.length; output[6] = (envelope.payload.length >>> 8) & 0xff; output[7] = envelope.payload.length & 0xff; output.set(id, 8); output.set(envelope.payload, 8 + id.length); return output;
}

function decodeMediaEnvelope(bytes: Uint8Array): MediaEnvelope | null {
  if (bytes.length < 8 || !MEDIA_MAGIC.every((value, index) => bytes[index] === value)) return null;
  const type = bytes[4]; const idLength = bytes[5] ?? 0; const payloadLength = ((bytes[6] ?? 0) << 8) | (bytes[7] ?? 0);
  if ((type !== 1 && type !== 2 && type !== 3) || idLength < 1 || idLength > 128 || bytes.length !== 8 + idLength + payloadLength) return null;
  const id = new TextDecoder().decode(bytes.subarray(8, 8 + idLength)); if (!/^media-[A-Za-z0-9_-]+$/.test(id)) return null;
  return { type, id, payload: bytes.slice(8 + idLength) };
}

export interface RealtimeBandwidthReservation {
  consume(bytes: number): Promise<void>;
  release(): void;
}

export interface RealtimeBandwidthReservationProvider {
  reserveRealtime(bytesPerSecond: number): RealtimeBandwidthReservation | null;
}

/** Adds an admission-time, release-on-close realtime reservation to any plane factory. */
export class ReservedStreamEgressFactory implements StreamEgressFactory {
  constructor(
    private readonly downstream: StreamEgressFactory,
    private readonly reservations: RealtimeBandwidthReservationProvider
  ) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const reservation = this.reservations.reserveRealtime(Math.ceil(input.admission.admittedDemandBps / 8));
    if (reservation === null) throw new Error("Realtime bandwidth reservation is unavailable.");
    let egress: StreamEgress;
    try {
      egress = await this.downstream.create(input);
    } catch (error) {
      reservation.release();
      throw error;
    }
    let closed = false;
    return {
      plane: egress.plane,
      quality: () => egress.quality(),
      send: async (frame) => {
        await reservation.consume(frame.byteLength);
        return egress.send(frame);
      },
      close: async () => {
        if (closed) return;
        closed = true;
        try {
          await egress.close();
        } finally {
          reservation.release();
        }
      }
    };
  }
}

export type MediaCodecDriverOpener = (configuration: MediaCodecConfiguration) => Promise<MediaCodecDriver>;

/** Encodes timed raw TPD2 media before it reaches a network-plane egress. */
export class CodecStreamEgressFactory implements StreamEgressFactory {
  constructor(
    private readonly downstream: StreamEgressFactory,
    private readonly openCodec: MediaCodecDriverOpener
  ) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const configuration = codecConfiguration(input.demand, input.admission);
    const egress = await this.downstream.create(input);
    if (configuration === null) {
      if (requiresCodec(input.demand)) {
        await egress.close();
        throw new Error("Raw realtime media requires an explicitly negotiated host codec.");
      }
      return egress;
    }
    let codec: MediaCodecDriver;
    try {
      codec = await this.openCodec(configuration);
      if (!codec.supports(configuration)) throw new Error("Host codec does not support the admitted configuration.");
    } catch (error) {
      await egress.close();
      throw error;
    }
    let closed = false;
    return {
      plane: egress.plane,
      quality: () => egress.quality(),
      send: async (bytes) => {
        const frame = decodeDeviceStreamFrame(bytes);
        if (frame.version !== 2) throw new Error("Realtime codec input requires TPD2 timing.");
        const encoded = await codec.encode(configuration, {
          captureAtUs: frame.captureAtUs,
          bytes: frame.payload
        });
        return egress.send(encodeDeviceStreamFrame({
          ...frame,
          payload: encoded.bytes
        }));
      },
      close: async () => {
        if (closed) return;
        closed = true;
        await Promise.allSettled([codec.close(), egress.close()]);
      }
    };
  }
}

function codecConfiguration(
  demand: StreamDemand,
  admission: AdmissionDecision
): MediaCodecConfiguration | null {
  const named = admission.rung;
  const codec = demand.codec ?? (named.includes("opus") || named.includes("narrowband")
    ? "opus"
    : named.includes("pcm")
      ? "pcm"
      : named.includes("jpeg") || named.includes("thumbnail") || named === "cas-snapshot"
        ? "jpeg"
        : (["vp8", "vp9", "h264"].includes(named) ? named as "vp8" | "vp9" | "h264" : null));
  if (codec === null) return null;
  const sampleKind = demand.classId === "microphone" || demand.classId === "speaker" ? "audio" : "video";
  return {
    codec,
    sampleKind,
    bitrateBps: admission.admittedDemandBps,
    ...(sampleKind === "audio" ? { sampleRate: named.includes("48k") ? 48_000 : named.includes("8k") ? 8_000 : 16_000, channels: 1 } : {}),
    ...(sampleKind === "audio" ? { voiceDuplex: true } : {})
  };
}

function requiresCodec(demand: StreamDemand): boolean {
  return (
    ((demand.classId === "microphone" || demand.classId === "speaker") && demand.tierId === "pcm") ||
    ((demand.classId === "camera" || demand.classId === "screen-capture") && demand.tierId === "frames")
  );
}

/** Plane-specific host transport. Mini-apps never receive this object or its credentials. */
export interface PlaneMediaTransport {
  send(frame: Uint8Array): Promise<StreamEgressSendResult>;
  quality(): LinkQuality;
  close(): Promise<void>;
}

export type PlaneMediaTransportOpener = (input: {
  readonly appId: string;
  readonly peer: string;
  readonly demand: StreamDemand;
  readonly admission: AdmissionDecision;
}) => Promise<PlaneMediaTransport>;

/**
 * Binds admission decisions to host-owned WebRTC, Pears, Reticulum, LXMF, or
 * CAS openers. Missing planes fail closed instead of silently falling back.
 */
export class PlaneStreamEgressFactory implements StreamEgressFactory {
  constructor(private readonly openers: Partial<Record<StreamPlane, PlaneMediaTransportOpener>>) {}

  async create(input: {
    readonly appId: string;
    readonly peer: string;
    readonly demand: StreamDemand;
    readonly admission: AdmissionDecision;
  }): Promise<StreamEgress> {
    const plane = input.admission.plane;
    const opener = this.openers[plane];
    if (opener === undefined) throw new Error(`No host media transport is configured for ${plane}.`);
    const transport = await opener(input);
    return {
      plane,
      send: (frame) => transport.send(frame),
      quality: () => transport.quality(),
      close: () => transport.close()
    };
  }
}
export interface StreamOffer {
  readonly id: string;
  readonly peer: PeerHandle;
  readonly displayLabel: string;
  readonly classId: "camera" | "microphone" | "screen-capture";
  readonly tierId: string;
  readonly encoding: string;
  readonly plane: StreamPlane;
  readonly expiresAt: number;
}
export type StreamSink = { readonly kind: "remote-video"; readonly widgetId: string } | { readonly kind: "speaker" };
export interface InboundStream { readonly handle: string; readonly offerId: string; readonly sink: StreamSink; }
export interface StreamOfferBatch { readonly cursor: string; readonly offers: ReadonlyArray<StreamOffer>; }
export interface InboundMediaBackend {
  pollOffers(appId: string, cursor?: string): Promise<StreamOfferBatch>;
  accept(appId: string, offer: StreamOffer, sink: StreamSink): Promise<InboundStream>;
  decline(appId: string, offer: StreamOffer, reason?: string): Promise<void>;
  close(appId: string, stream: InboundStream): Promise<void>;
}

export class InboundMediaRouter {
  private readonly offers = new Map<string, { appId: string; offer: StreamOffer }>();
  private readonly streams = new Map<string, { appId: string; stream: InboundStream }>();
  constructor(private readonly backend: InboundMediaBackend, private readonly now: () => number = () => 0) {}
  async pollOffers(appId: string, cursor?: string): Promise<StreamOfferBatch> {
    const batch = await this.backend.pollOffers(appId, cursor);
    const offers = batch.offers.filter((offer) => offer.expiresAt > this.now());
    for (const offer of offers) this.offers.set(offer.id, { appId, offer });
    return { cursor: batch.cursor, offers };
  }
  async accept(appId: string, offerId: string, sink: StreamSink): Promise<InboundStream> {
    const entry = this.owned(appId, offerId);
    if (entry.offer.expiresAt <= this.now()) throw new Error("Stream offer expired");
    if (entry.offer.classId === "microphone" && sink.kind !== "speaker") {
      throw new Error("Microphone streams require a speaker sink");
    }
    if (entry.offer.classId !== "microphone" && sink.kind !== "remote-video") {
      throw new Error("Video streams require a remote-video sink");
    }
    if (sink.kind === "remote-video" && sink.widgetId.length < 1) throw new Error("Remote-video widget id is required");
    const stream = await this.backend.accept(appId, entry.offer, sink);
    this.offers.delete(offerId);
    this.streams.set(stream.handle, { appId, stream });
    return stream;
  }
  async decline(appId: string, offerId: string, reason?: string): Promise<void> {
    const entry = this.owned(appId, offerId);
    await this.backend.decline(appId, entry.offer, reason?.slice(0, 160));
    this.offers.delete(offerId);
  }
  async closeApp(appId: string): Promise<void> {
    const closes: Array<Promise<void>> = [];
    for (const [handle, entry] of this.streams) {
      if (entry.appId !== appId) continue;
      this.streams.delete(handle);
      closes.push(this.backend.close(appId, entry.stream));
    }
    for (const [offerId, entry] of this.offers) {
      if (entry.appId === appId) this.offers.delete(offerId);
    }
    await Promise.allSettled(closes);
  }
  private owned(appId: string, offerId: string): { appId: string; offer: StreamOffer } {
    const entry = this.offers.get(offerId);
    if (entry === undefined || entry.appId !== appId) throw new Error("Unknown stream offer");
    return entry;
  }
}
