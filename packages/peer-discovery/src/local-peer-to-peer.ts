import type {
  AcceptOptions,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
} from "./index.js";
import { PeerDiscoveryError } from "./index.js";

/** Feature-detected placeholder until LP2PRequest/LP2PReceiver ships in a production browser. */
export class LocalPeerToPeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  readonly kind = "local-peer-to-peer" as const;
  constructor(
    private readonly supported = () =>
      typeof (globalThis as { LP2PRequest?: unknown }).LP2PRequest ===
        "function" &&
      typeof (globalThis as { LP2PReceiver?: unknown }).LP2PReceiver ===
        "function",
  ) {}
  async availability(): Promise<DiscoveryAvailability> {
    return this.supported()
      ? {
          state: "policy-disabled",
          reason: "Local Peer-to-Peer support is experimental and disabled",
        }
      : {
          state: "unsupported",
          reason: "This browser does not implement LP2PRequest/LP2PReceiver",
        };
  }
  async *offer(
    _envelope: Uint8Array,
    _options: OfferOptions,
  ): AsyncIterable<DiscoveryEvent> {
    throw this.error();
  }
  async *accept(_options: AcceptOptions): AsyncIterable<DiscoveryEvent> {
    throw this.error();
  }
  async answer(
    _session: DiscoverySession,
    _envelope: Uint8Array,
  ): Promise<void> {
    throw this.error();
  }
  async cancel(_sessionId: string): Promise<void> {}
  private error(): PeerDiscoveryError {
    return new PeerDiscoveryError(
      "UNAVAILABLE",
      "Local Peer-to-Peer API is unavailable or policy-disabled",
    );
  }
}
