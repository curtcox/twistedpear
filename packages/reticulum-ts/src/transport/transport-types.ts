import type { PacketInterface } from "../interfaces/interface.js";
import type { LeafTransportOptions } from "./node.js";
import type { AnnounceRateLimiter } from "./rate.js";

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
