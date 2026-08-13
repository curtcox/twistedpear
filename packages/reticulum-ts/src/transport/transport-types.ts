import type { CryptoProvider } from "../crypto/provider.js";
import type { Identity } from "../identity.js";
import type { PacketInterface } from "../interfaces/interface.js";
import type { Clock, Entropy } from "../runtime/runtime.js";
import type { ByteRateLimiter } from "./bandwidth.js";
import type { AnnounceRateLimiter } from "./rate.js";

export interface LeafTransportOptions {
  readonly provider: CryptoProvider;
  readonly transportIdentity: Identity;
  readonly clock: Clock;
  readonly entropy: Entropy;
  readonly useImplicitProof?: boolean;
  readonly transportEnabled?: boolean;
  /** Hard aggregate byte rate applied independently to ingress and egress. */
  readonly bandwidthBytesPerSecond?: number;
  readonly inboundBandwidthLimiter?: ByteRateLimiter;
  readonly outboundBandwidthLimiter?: ByteRateLimiter;
}

export interface TransportNodeOptions extends LeafTransportOptions {
  readonly announceRateLimiter?: AnnounceRateLimiter;
}

export interface LinkTableEntry {
  readonly timestamp: number;
  readonly nextHop: Uint8Array;
  readonly outboundInterface: PacketInterface;
  readonly remainingHops: number;
  readonly receivedInterface: PacketInterface;
  readonly takenHops: number;
  readonly destinationHash: Uint8Array;
}

export interface ReverseTableEntry {
  readonly receivedInterface: PacketInterface;
  readonly outboundInterface: PacketInterface;
  readonly timestamp: number;
}

export interface DiscoveryPathRequest {
  readonly timeout: number;
  readonly requestingInterface: PacketInterface;
}
