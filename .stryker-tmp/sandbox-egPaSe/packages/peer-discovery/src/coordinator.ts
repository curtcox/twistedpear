// @ts-nocheck
import { decodePeerInvitation, initialPeerPairingState, stepPeerPairing, type PeerInvitation } from "@twistedpear/protocol";
import type { EstablishedPeer, PeerConnectRequest, PeerDiscoveryAdapter, PeerPairingDriver } from "./index.js";
import { PeerDiscoveryError, PeerReplayCache } from "./index.js";

export interface UnconfirmedPeer {
  readonly fingerprint: string;
  readonly displayLabel: string;
  readonly matchingWords: ReadonlyArray<string>;
  readonly dataPlane: EstablishedPeer["dataPlane"];
}
export interface PairingOfferContext { readonly envelope: Uint8Array; readonly privateState: unknown; }
export interface PairingAnswerContext { readonly envelope: Uint8Array; readonly privateState: unknown; readonly peer: UnconfirmedPeer; }
export interface AuthenticatedPairingContext { readonly privateState: unknown; readonly peer: UnconfirmedPeer; }
/** Crypto/route boundary. Implementations verify signatures, ephemeral possession, scope, SAS, and candidates. */
export interface PeerPairingSecurityBackend {
  createOffer(request: PeerConnectRequest): Promise<PairingOfferContext>;
  authenticateOffer(request: PeerConnectRequest, envelope: Uint8Array): Promise<PairingAnswerContext>;
  authenticateAnswer(request: PeerConnectRequest, offerPrivateState: unknown, envelope: Uint8Array): Promise<AuthenticatedPairingContext>;
  confirm(peer: UnconfirmedPeer, request: PeerConnectRequest): Promise<boolean>;
  establish(context: AuthenticatedPairingContext | PairingAnswerContext, adapter: PeerDiscoveryAdapter): Promise<EstablishedPeer>;
}
export interface InvitationPairingDriverOptions { readonly backend: PeerPairingSecurityBackend; readonly replayCache?: PeerReplayCache; readonly now?: () => number; }

function sessionKey(invitation: PeerInvitation): string { return [...invitation.sessionId].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function assertEnvelope(envelope: Uint8Array, request: PeerConnectRequest, role: "offer" | "answer", now: number): PeerInvitation {
  const invitation = decodePeerInvitation(envelope, now);
  if (invitation.role !== role || invitation.service !== request.service) throw new PeerDiscoveryError("INVALID_INVITATION", `Expected a ${role} for service ${request.service}`);
  return invitation;
}

export class InvitationPairingDriver implements PeerPairingDriver {
  private readonly replay: PeerReplayCache;
  constructor(private readonly options: InvitationPairingDriverOptions) { this.replay = options.replayCache ?? new PeerReplayCache(); }
  async request(adapter: PeerDiscoveryAdapter, request: PeerConnectRequest): Promise<EstablishedPeer> {
    const offer = await this.options.backend.createOffer(request);
    const offerInvitation = assertEnvelope(offer.envelope, request, "offer", this.now());
    let state = stepPeerPairing(initialPeerPairingState(), { kind: "offer", sessionId: sessionKey(offerInvitation), service: request.service, expiresAt: offerInvitation.expiresAt });
    for await (const event of adapter.offer(offer.envelope, { timeoutMs: request.timeoutMs })) {
      if (event.kind === "error") throw new PeerDiscoveryError(event.code, event.message);
      if (event.kind !== "invitation") continue;
      const answer = assertEnvelope(event.envelope, request, "answer", this.now());
      if (sessionKey(answer) !== sessionKey(offerInvitation)) throw new PeerDiscoveryError("INVALID_INVITATION", "Answer session does not match offer");
      state = stepPeerPairing(state, { kind: "answer", sessionId: sessionKey(answer) });
      if (state.phase !== "confirming") throw new PeerDiscoveryError("INVALID_INVITATION", state.error ?? "Invalid answer transition");
      const authenticated = await this.options.backend.authenticateAnswer(request, offer.privateState, event.envelope);
      if (!await this.options.backend.confirm(authenticated.peer, request)) { await adapter.cancel(event.session.id); throw new PeerDiscoveryError("CANCELLED", "Peer confirmation was declined"); }
      state = stepPeerPairing(state, { kind: "confirm", sessionId: sessionKey(answer) });
      if (state.phase !== "connected") throw new PeerDiscoveryError("INVALID_INVITATION", state.error ?? "Invalid confirmation transition");
      const established = await this.options.backend.establish(authenticated, adapter);
      if (!established.authenticated || !established.confirmed) throw new PeerDiscoveryError("POLICY_DENIED", "Security backend returned an unconfirmed route");
      return established;
    }
    throw new PeerDiscoveryError("NO_RETURN_CHANNEL", "Discovery mechanism ended without an answer");
  }
  async listen(adapter: PeerDiscoveryAdapter, request: PeerConnectRequest): Promise<EstablishedPeer> {
    for await (const event of adapter.accept({ service: request.service, timeoutMs: request.timeoutMs })) {
      if (event.kind === "error") throw new PeerDiscoveryError(event.code, event.message);
      if (event.kind !== "invitation") continue;
      const offer = assertEnvelope(event.envelope, request, "offer", this.now());
      const key = sessionKey(offer);
      if (!this.replay.acceptOnce(key, offer.expiresAt, this.now())) throw new PeerDiscoveryError("REPLAY", "Invitation session was already consumed");
      const answer = await this.options.backend.authenticateOffer(request, event.envelope);
      const answerInvitation = assertEnvelope(answer.envelope, request, "answer", this.now());
      if (sessionKey(answerInvitation) !== key) throw new PeerDiscoveryError("INVALID_INVITATION", "Answer session does not match offer");
      let state = stepPeerPairing(initialPeerPairingState(), { kind: "accept", sessionId: key, service: request.service, expiresAt: offer.expiresAt, replayed: false });
      if (!await this.options.backend.confirm(answer.peer, request)) { await adapter.cancel(event.session.id); throw new PeerDiscoveryError("CANCELLED", "Peer confirmation was declined"); }
      await adapter.answer(event.session, answer.envelope);
      state = stepPeerPairing(state, { kind: "confirm", sessionId: key });
      if (state.phase !== "connected") throw new PeerDiscoveryError("INVALID_INVITATION", state.error ?? "Invalid confirmation transition");
      const established = await this.options.backend.establish(answer, adapter);
      if (!established.authenticated || !established.confirmed) throw new PeerDiscoveryError("POLICY_DENIED", "Security backend returned an unconfirmed route");
      return established;
    }
    throw new PeerDiscoveryError("TIMEOUT", "Discovery mechanism ended without an offer");
  }
  private now(): number { return this.options.now?.() ?? Date.now(); }
}
