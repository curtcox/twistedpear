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
  availability(): Promise<DiscoveryAvailability> {
    return Promise.resolve(this.result);
  }
  async *offer(): AsyncIterable<DiscoveryEvent> {
    await Promise.reject(this.error());
  }
  async *accept(): AsyncIterable<DiscoveryEvent> {
    await Promise.reject(this.error());
  }
  answer(): Promise<void> {
    return Promise.reject(this.error());
  }
  cancel(): Promise<void> {
    return Promise.resolve();
  }
  private error(): PeerDiscoveryError {
    return new PeerDiscoveryError(
      "UNAVAILABLE",
      this.result.reason ?? `${this.kind} is unavailable`,
    );
  }
}
