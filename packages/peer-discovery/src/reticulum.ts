import { decodePeerInvitation } from "@twistedpear/protocol";
import { withDiscoveryBudget } from "./budget.js";
import type {
  AcceptOptions,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
} from "./types.js";
import { PeerDiscoveryError } from "./errors.js";

export interface ReticulumInboundInvitation {
  readonly session: DiscoverySession;
  readonly envelope: Uint8Array;
}

/** Host-owned announce/link effect. Raw Reticulum destinations and links never cross the broker. */
export interface ReticulumDiscoveryChannel {
  availability(): Promise<DiscoveryAvailability>;
  offer(
    session: DiscoverySession,
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<Uint8Array>;
  listen(options: AcceptOptions): AsyncIterable<ReticulumInboundInvitation>;
  answer(session: DiscoverySession, envelope: Uint8Array): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}

export interface ReticulumDiscoveryAdapterOptions {
  readonly channel: ReticulumDiscoveryChannel;
  readonly createSessionId: () => string;
  readonly now?: () => number;
}

export class ReticulumPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "reticulum" as const;
  constructor(private readonly options: ReticulumDiscoveryAdapterOptions) {}
  availability(): Promise<DiscoveryAvailability> {
    return this.options.channel.availability();
  }

  async *offer(
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== "offer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Automatic Reticulum discovery requires an offer envelope",
      );
    const session = {
      id: this.options.createSessionId(),
      kind: this.kind,
    } as const;
    yield { kind: "ready", session };
    for await (const answerEnvelope of withDiscoveryBudget(
      this.options.channel.offer(session, envelope, options),
      options.timeoutMs,
      options.signal,
      () => this.cancel(session.id),
    )) {
      const answer = decodePeerInvitation(answerEnvelope, this.now());
      if (
        answer.role !== "answer" ||
        answer.service !== invitation.service ||
        !same(answer.sessionId, invitation.sessionId)
      ) {
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Automatic Reticulum answer does not match the offer",
        );
      }
      yield { kind: "invitation", session, envelope: answerEnvelope };
      return;
    }
  }

  async *accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    for await (const inbound of withDiscoveryBudget(
      this.options.channel.listen(options),
      options.timeoutMs,
      options.signal,
      async () => {},
    )) {
      const offer = decodePeerInvitation(inbound.envelope, this.now());
      if (offer.role !== "offer" || offer.service !== options.service)
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Automatic Reticulum invitation has the wrong role or service",
        );
      if (inbound.session.kind !== this.kind)
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Automatic Reticulum channel returned the wrong session kind",
        );
      yield {
        kind: "invitation",
        session: inbound.session,
        envelope: inbound.envelope,
      };
      return;
    }
  }

  async answer(session: DiscoverySession, envelope: Uint8Array): Promise<void> {
    if (
      session.kind !== this.kind ||
      decodePeerInvitation(envelope, this.now()).role !== "answer"
    )
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Automatic Reticulum answer is invalid",
      );
    await this.options.channel.answer(session, envelope);
  }
  cancel(sessionId: string): Promise<void> {
    return this.options.channel.cancel(sessionId);
  }
  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}

function same(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1)
    difference |= (left[index] ?? 0) ^ (right[index] ?? 0);
  return difference === 0;
}
