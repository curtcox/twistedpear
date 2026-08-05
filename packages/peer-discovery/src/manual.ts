import {
  decodePeerInvitation,
  decodePeerInvitationText,
  encodePeerInvitationText,
} from "@twistedpear/protocol";
import type {
  AcceptOptions,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
} from "./index.js";
import { PeerDiscoveryError } from "./index.js";
import { withDiscoveryBudget } from "./budget.js";

export interface ManualInboundCode {
  readonly session: DiscoverySession;
  readonly code: string;
}
/** Trusted-host effect boundary for copy/paste or typed full invitation codes. */
export interface ManualDiscoveryChannel {
  offer(
    session: DiscoverySession,
    code: string,
    options: OfferOptions,
  ): AsyncIterable<string>;
  accept(options: AcceptOptions): AsyncIterable<ManualInboundCode>;
  answer(session: DiscoverySession, code: string): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}

export interface ManualDiscoveryAdapterOptions {
  readonly channel: ManualDiscoveryChannel;
  readonly createSessionId: () => string;
  readonly now?: () => number;
}

function decodeCode(code: string, now: number): Uint8Array {
  try {
    const envelope = decodePeerInvitationText(code);
    decodePeerInvitation(envelope, now);
    return envelope;
  } catch (error) {
    throw new PeerDiscoveryError(
      "INVALID_INVITATION",
      error instanceof Error ? error.message : "Invalid manual invitation",
    );
  }
}

export class ManualPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "manual" as const;
  constructor(private readonly options: ManualDiscoveryAdapterOptions) {}
  async availability(): Promise<{ readonly state: "available" }> {
    return { state: "available" };
  }
  async *offer(
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== "offer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Manual offer requires an offer envelope",
      );
    const session = {
      id: this.options.createSessionId(),
      kind: this.kind,
    } as const;
    yield { kind: "ready", session };
    for await (const code of withDiscoveryBudget(
      this.options.channel.offer(
        session,
        encodePeerInvitationText(envelope),
        options,
      ),
      options.timeoutMs,
      options.signal,
      () => this.cancel(session.id),
    )) {
      const answer = decodeCode(code, this.now());
      if (decodePeerInvitation(answer, this.now()).role !== "answer")
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Manual return code is not an answer",
        );
      yield { kind: "invitation", session, envelope: answer };
    }
  }
  async *accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    let activeSessionId: string | null = null;
    for await (const inbound of withDiscoveryBudget(
      this.options.channel.accept(options),
      options.timeoutMs,
      options.signal,
      async () => {
        if (activeSessionId !== null) await this.cancel(activeSessionId);
      },
    )) {
      activeSessionId = inbound.session.id;
      const envelope = decodeCode(inbound.code, this.now());
      const invitation = decodePeerInvitation(envelope, this.now());
      if (invitation.role !== "offer" || invitation.service !== options.service)
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Manual invitation has the wrong role or service",
        );
      yield { kind: "invitation", session: inbound.session, envelope };
    }
  }
  async answer(session: DiscoverySession, envelope: Uint8Array): Promise<void> {
    const invitation = decodePeerInvitation(envelope, this.now());
    if (invitation.role !== "answer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Manual answer requires an answer envelope",
      );
    await this.options.channel.answer(
      session,
      encodePeerInvitationText(envelope),
    );
  }
  cancel(sessionId: string): Promise<void> {
    return this.options.channel.cancel(sessionId);
  }
  private now(): number {
    return this.options.now?.() ?? Date.now();
  }
}
