// @ts-nocheck
import { decodePeerInvitation, framePeerAudioPayload, initialPeerAudioAssemblyState, stepPeerAudioAssembly } from "@twistedpear/protocol";
import type { AcceptOptions, DiscoveryAvailability, DiscoveryEvent, DiscoverySession, OfferOptions, PeerDiscoveryAdapter } from "./index.js";
import { PeerDiscoveryError } from "./index.js";
import { withDiscoveryBudget } from "./budget.js";

export interface AudioInboundFrame { readonly session: DiscoverySession; readonly frame: Uint8Array; }
/** Permission-gated microphone/speaker effect boundary. PCM never crosses into mini-apps. */
export interface AudioDiscoveryChannel {
  availability(): Promise<DiscoveryAvailability>;
  transmit(session: DiscoverySession, frames: ReadonlyArray<Uint8Array>, options: OfferOptions): AsyncIterable<Uint8Array>;
  receive(options: AcceptOptions): AsyncIterable<AudioInboundFrame>;
  answer(session: DiscoverySession, frames: ReadonlyArray<Uint8Array>): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}
export interface AudioDiscoveryAdapterOptions { readonly channel: AudioDiscoveryChannel; readonly createSessionId: () => string; readonly now?: () => number; readonly chunkBytes?: number; }

export class AudioPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "audio" as const;
  constructor(private readonly options: AudioDiscoveryAdapterOptions) {}
  availability(): Promise<DiscoveryAvailability> { return this.options.channel.availability(); }
  async *offer(envelope: Uint8Array, options: OfferOptions): AsyncIterable<DiscoveryEvent> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== "offer") throw new PeerDiscoveryError("INVALID_INVITATION", "Audio offer requires an offer envelope");
    const session = { id: this.options.createSessionId(), kind: this.kind } as const;
    yield { kind: "ready", session };
    let assembly = initialPeerAudioAssemblyState(this.now() + options.timeoutMs);
    for await (const frame of withDiscoveryBudget(this.options.channel.transmit(session, framePeerAudioPayload(invitation.sessionId, envelope, this.options.chunkBytes), options), options.timeoutMs, options.signal, () => this.cancel(session.id))) {
      const result = stepPeerAudioAssembly(assembly, frame, this.now()); assembly = result.state;
      yield { kind: "progress", session, completed: result.received, ...(result.total === null ? {} : { total: result.total }) };
      if (result.payload !== null) { const answer = decodePeerInvitation(result.payload, this.now()); if (answer.role !== "answer") throw new PeerDiscoveryError("INVALID_INVITATION", "Audio return payload is not an answer"); yield { kind: "invitation", session, envelope: result.payload }; }
    }
  }
  async *accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    let active: DiscoverySession | null = null; let assembly = initialPeerAudioAssemblyState(this.now() + options.timeoutMs);
    for await (const inbound of withDiscoveryBudget(this.options.channel.receive(options), options.timeoutMs, options.signal, async () => { if (active !== null) await this.cancel(active.id); })) {
      if (active !== null && active.id !== inbound.session.id) throw new PeerDiscoveryError("INVALID_INVITATION", "Mixed audio channel sessions"); active = inbound.session;
      const result = stepPeerAudioAssembly(assembly, inbound.frame, this.now()); assembly = result.state;
      yield { kind: "progress", session: inbound.session, completed: result.received, ...(result.total === null ? {} : { total: result.total }) };
      if (result.payload !== null) { const offer = decodePeerInvitation(result.payload, this.now()); if (offer.role !== "offer" || offer.service !== options.service) throw new PeerDiscoveryError("INVALID_INVITATION", "Audio invitation has the wrong role or service"); yield { kind: "invitation", session: inbound.session, envelope: result.payload }; }
    }
  }
  async answer(session: DiscoverySession, envelope: Uint8Array): Promise<void> { const invitation = decodePeerInvitation(envelope, this.now()); if (invitation.role !== "answer") throw new PeerDiscoveryError("INVALID_INVITATION", "Audio answer requires an answer envelope"); await this.options.channel.answer(session, framePeerAudioPayload(invitation.sessionId, envelope, this.options.chunkBytes)); }
  cancel(sessionId: string): Promise<void> { return this.options.channel.cancel(sessionId); }
  private now(): number { return this.options.now?.() ?? Date.now(); }
}
