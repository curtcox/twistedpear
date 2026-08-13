import { decodePeerInvitation } from "@twistedpear/protocol";
import type {
  AcceptOptions,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
} from "./types.js";
import { PeerDiscoveryError } from "./errors.js";
import { withDiscoveryBudget } from "./budget.js";

export interface BluetoothInboundInvitation {
  readonly session: DiscoverySession;
  readonly envelope: Uint8Array;
}
/** Native foreground BLE central/peripheral effect boundary. The host bridge owns GATT and permissions. */
export interface BluetoothDiscoveryChannel {
  availability(): Promise<DiscoveryAvailability>;
  advertise(
    session: DiscoverySession,
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<Uint8Array>;
  scan(options: AcceptOptions): AsyncIterable<BluetoothInboundInvitation>;
  answer(session: DiscoverySession, envelope: Uint8Array): Promise<void>;
  cancel(sessionId: string): Promise<void>;
}
export interface BluetoothDiscoveryAdapterOptions {
  readonly channel: BluetoothDiscoveryChannel;
  readonly createSessionId: () => string;
  readonly now?: () => number;
}

export class BluetoothPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "bluetooth" as const;
  constructor(private readonly options: BluetoothDiscoveryAdapterOptions) {}
  availability(): Promise<DiscoveryAvailability> {
    return this.options.channel.availability();
  }
  async *offer(
    envelope: Uint8Array,
    options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    const offer = decodePeerInvitation(envelope, this.now());
    if (offer.role !== "offer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Bluetooth offer requires an offer envelope",
      );
    const session = {
      id: this.options.createSessionId(),
      kind: this.kind,
    } as const;
    yield { kind: "ready", session };
    for await (const response of withDiscoveryBudget(
      this.options.channel.advertise(session, envelope, options),
      options.timeoutMs,
      options.signal,
      () => this.cancel(session.id),
    )) {
      const answer = decodePeerInvitation(response, this.now());
      if (answer.role !== "answer")
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Bluetooth response is not an answer",
        );
      yield { kind: "invitation", session, envelope: response };
    }
  }
  async *accept(options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    let active: DiscoverySession | null = null;
    for await (const inbound of withDiscoveryBudget(
      this.options.channel.scan(options),
      options.timeoutMs,
      options.signal,
      async () => {
        if (active !== null) await this.cancel(active.id);
      },
    )) {
      active = inbound.session;
      const offer = decodePeerInvitation(inbound.envelope, this.now());
      if (offer.role !== "offer" || offer.service !== options.service)
        throw new PeerDiscoveryError(
          "INVALID_INVITATION",
          "Bluetooth invitation has the wrong role or service",
        );
      yield {
        kind: "invitation",
        session: inbound.session,
        envelope: inbound.envelope,
      };
    }
  }
  async answer(session: DiscoverySession, envelope: Uint8Array): Promise<void> {
    if (decodePeerInvitation(envelope, this.now()).role !== "answer")
      throw new PeerDiscoveryError(
        "INVALID_INVITATION",
        "Bluetooth answer requires an answer envelope",
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

export function createUnsupportedWebBluetoothChannel(): BluetoothDiscoveryChannel {
  const unavailable = () => {
    throw new PeerDiscoveryError(
      "UNAVAILABLE",
      "Ordinary web pages cannot advertise as a portable BLE peripheral; use QR or manual exchange",
    );
  };
  return {
    async availability() {
      return {
        state: "unsupported",
        reason:
          "Web Bluetooth does not provide portable browser-to-browser peripheral advertising",
      };
    },
    async *advertise() {
      unavailable();
    },
    async *scan() {
      unavailable();
    },
    async answer() {
      unavailable();
    },
    async cancel() {},
  };
}
