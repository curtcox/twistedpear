import type {
  DiscoveryAvailability,
  DiscoveryEvent,
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
      this.result.reason ?? `${this.kind} is unavailable`,
    );
  }
}
