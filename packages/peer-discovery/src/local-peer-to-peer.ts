import type {
  DiscoveryAvailability,
  DiscoveryEvent,
  PeerDiscoveryAdapter,
} from "./types.js";
import { PeerDiscoveryError } from "./errors.js";

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
  async *offer(): AsyncIterable<DiscoveryEvent> {
    throw this.error();
  }
  async *accept(): AsyncIterable<DiscoveryEvent> {
    throw this.error();
  }
  async answer(): Promise<void> {
    throw this.error();
  }
  async cancel(): Promise<void> {}
  private error(): PeerDiscoveryError {
    return new PeerDiscoveryError(
      "UNAVAILABLE",
      "Local Peer-to-Peer API is unavailable or policy-disabled",
    );
  }
}
