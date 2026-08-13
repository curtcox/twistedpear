import type {
  AcceptOptions,
  DiscoveryAvailability,
  DiscoveryEvent,
  DiscoverySession,
  OfferOptions,
  PeerDiscoveryAdapter,
  PeerDiscoveryKind,
} from "./types.js";
import { PeerDiscoveryError } from "./errors.js";

/** Diagnostic placeholder for a known mechanism whose host effect is unavailable. */
export class UnavailablePeerDiscoveryAdapter implements PeerDiscoveryAdapter {
  constructor(
    readonly kind: PeerDiscoveryKind,
    private readonly result: DiscoveryAvailability,
  ) {
    if (result.state === "available" || result.state === "permission-required")
      throw new Error(
        "Unavailable adapter requires a non-selectable availability state",
      );
  }
  async availability(): Promise<DiscoveryAvailability> {
    return this.result;
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
      this.result.reason ?? `${this.kind} is unavailable`,
    );
  }
}
