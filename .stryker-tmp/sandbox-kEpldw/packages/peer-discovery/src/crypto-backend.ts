// @ts-nocheck
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha256.js";
import { decodePeerInvitation, encodePeerInvitation, peerInvitationSigningBytes, type PeerCandidate, type PeerInvitation } from "@twistedpear/protocol";
import type { EstablishedPeer, PeerConnectRequest, PeerDiscoveryAdapter } from "./index.js";
import type { AuthenticatedPairingContext, PairingAnswerContext, PairingOfferContext, PeerPairingSecurityBackend, UnconfirmedPeer } from "./coordinator.js";
import { PeerDiscoveryError } from "./index.js";

const SAS_WORDS = ["amber", "apple", "april", "arch", "baker", "beach", "birch", "blue", "brave", "brook", "cedar", "charm", "cloud", "coral", "crane", "dawn", "delta", "eagle", "earth", "ember", "field", "finch", "flame", "forest", "frost", "garden", "glass", "green", "harbor", "hazel", "honey", "island", "jade", "lake", "leaf", "lemon", "light", "lilac", "maple", "meadow", "moon", "north", "ocean", "olive", "orange", "pearl", "pine", "plum", "quiet", "rain", "river", "robin", "rose", "silver", "sky", "snow", "sparrow", "star", "stone", "sun", "tiger", "violet", "willow", "wind"] as const;

export interface PeerSigningIdentity {
  readonly publicKey: Uint8Array;
  sign(payload: Uint8Array): Promise<Uint8Array>;
  verify(publicKey: Uint8Array, payload: Uint8Array, signature: Uint8Array): Promise<boolean>;
}
export interface CryptoPeerRouteContext { readonly sharedSecret: Uint8Array; readonly remoteInvitation: PeerInvitation; readonly localCandidates: ReadonlyArray<PeerCandidate>; }
export interface CryptoPeerPairingOptions {
  readonly identity: PeerSigningIdentity;
  readonly displayLabel: string;
  readonly capabilities: ReadonlyArray<string>;
  readonly entropy: (length: number) => Promise<Uint8Array>;
  readonly candidates: (request: PeerConnectRequest, context: { readonly role: "offer" | "answer"; readonly sessionId: Uint8Array; readonly remoteInvitation?: PeerInvitation }) => Promise<ReadonlyArray<PeerCandidate>>;
  readonly confirm: (peer: UnconfirmedPeer, request: PeerConnectRequest) => Promise<boolean>;
  readonly establish: (context: CryptoPeerRouteContext, peer: UnconfirmedPeer, adapter: PeerDiscoveryAdapter) => Promise<EstablishedPeer>;
  readonly now?: () => number;
  readonly lifetimeMs?: number;
}
interface LocalCryptoState { readonly privateKey: Uint8Array; readonly candidates: ReadonlyArray<PeerCandidate>; }
interface AuthenticatedCryptoState extends CryptoPeerRouteContext {}

function fingerprint(publicKey: Uint8Array): string { return [...sha256(publicKey).subarray(0, 16)].map((byte) => byte.toString(16).padStart(2, "0")).join(""); }
function sas(sharedSecret: Uint8Array, sessionId: Uint8Array, service: string): ReadonlyArray<string> { const info = new TextEncoder().encode(`twistedpear-peer-sas-v1:${service}`); const bytes = hkdf(sha256, sharedSecret, sessionId, info, 3); return [...bytes].map((byte) => SAS_WORDS[byte & 63] ?? "pear"); }

export class CryptoPeerPairingBackend implements PeerPairingSecurityBackend {
  constructor(private readonly options: CryptoPeerPairingOptions) {}
  async createOffer(request: PeerConnectRequest): Promise<PairingOfferContext> {
    const [sessionId, privateKey] = await Promise.all([this.entropy(16), this.entropy(32)]); const candidates = await this.options.candidates(request, { role: "offer", sessionId });
    const envelope = await this.signedEnvelope(request, "offer", sessionId, x25519.getPublicKey(privateKey), candidates);
    return { envelope, privateState: { privateKey, candidates } satisfies LocalCryptoState };
  }
  async authenticateOffer(request: PeerConnectRequest, envelope: Uint8Array): Promise<PairingAnswerContext> {
    const remote = await this.verified(envelope, request, "offer");
    const privateKey = await this.entropy(32); const candidates = await this.options.candidates(request, { role: "answer", sessionId: remote.sessionId, remoteInvitation: remote });
    const sharedSecret = x25519.getSharedSecret(privateKey, remote.peerEphemeralKey);
    const answer = await this.signedEnvelope(request, "answer", remote.sessionId, x25519.getPublicKey(privateKey), candidates);
    const peer = this.peer(remote, sharedSecret, candidates);
    return { envelope: answer, privateState: { sharedSecret, remoteInvitation: remote, localCandidates: candidates } satisfies AuthenticatedCryptoState, peer };
  }
  async authenticateAnswer(request: PeerConnectRequest, offerPrivateState: unknown, envelope: Uint8Array): Promise<AuthenticatedPairingContext> {
    const local = offerPrivateState as LocalCryptoState;
    if (!(local?.privateKey instanceof Uint8Array)) throw new PeerDiscoveryError("INVALID_INVITATION", "Missing local ephemeral state");
    const remote = await this.verified(envelope, request, "answer");
    const sharedSecret = x25519.getSharedSecret(local.privateKey, remote.peerEphemeralKey);
    return { privateState: { sharedSecret, remoteInvitation: remote, localCandidates: local.candidates } satisfies AuthenticatedCryptoState, peer: this.peer(remote, sharedSecret, local.candidates) };
  }
  confirm(peer: UnconfirmedPeer, request: PeerConnectRequest): Promise<boolean> { return this.options.confirm(peer, request); }
  establish(context: AuthenticatedPairingContext | PairingAnswerContext, adapter: PeerDiscoveryAdapter): Promise<EstablishedPeer> { return this.options.establish(context.privateState as AuthenticatedCryptoState, context.peer, adapter); }
  private async signedEnvelope(request: PeerConnectRequest, role: "offer" | "answer", sessionId: Uint8Array, publicKey: Uint8Array, candidates: ReadonlyArray<PeerCandidate>): Promise<Uint8Array> {
    const now = this.now();
    const unsigned: PeerInvitation = { version: 1, sessionId, service: request.service, role, peerEphemeralKey: publicKey, identityProof: this.options.identity.publicKey, candidates, display: this.options.displayLabel, issuedAt: now, expiresAt: now + Math.min(this.options.lifetimeMs ?? 120_000, 300_000), capabilities: this.options.capabilities, signature: new Uint8Array(64) };
    const signature = await this.options.identity.sign(peerInvitationSigningBytes(unsigned));
    return encodePeerInvitation({ ...unsigned, signature });
  }
  private async verified(envelope: Uint8Array, request: PeerConnectRequest, role: "offer" | "answer"): Promise<PeerInvitation> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== role || invitation.service !== request.service || invitation.identityProof === undefined) throw new PeerDiscoveryError("INVALID_INVITATION", "Invitation identity, role, or service is invalid");
    const valid = await this.options.identity.verify(invitation.identityProof, peerInvitationSigningBytes(invitation), invitation.signature);
    if (!valid) throw new PeerDiscoveryError("INVALID_INVITATION", "Invitation signature is invalid");
    return invitation;
  }
  private peer(remote: PeerInvitation, sharedSecret: Uint8Array, localCandidates: ReadonlyArray<PeerCandidate>): UnconfirmedPeer { const identity = remote.identityProof; if (identity === undefined) throw new PeerDiscoveryError("INVALID_INVITATION", "Invitation identity is missing"); const localKinds = new Set(localCandidates.map((candidate) => candidate.kind)); const selected = remote.candidates.find((candidate) => localKinds.has(candidate.kind)); if (selected === undefined) throw new PeerDiscoveryError("NO_RETURN_CHANNEL", "Peers have no authenticated data plane in common"); return { fingerprint: fingerprint(identity), displayLabel: remote.display, matchingWords: sas(sharedSecret, remote.sessionId, remote.service), dataPlane: selected.kind }; }
  private async entropy(length: number): Promise<Uint8Array> { const bytes = await this.options.entropy(length); if (bytes.length !== length) throw new Error(`Entropy provider returned ${bytes.length}, expected ${length}`); return bytes; }
  private now(): number { return this.options.now?.() ?? Date.now(); }
}
