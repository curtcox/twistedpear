/**
 * Pure transport ingress accept / packet-hash deferral decisions.
 * Hash tables and packetFilter callbacks stay at the adapter edge.
 */
import {
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_PROOF
} from "./packet-header.js";
import { PacketContextCode } from "./packet-context.js";
import { TRANSPORT_TRANSPORT } from "./transport-framing.js";

/** Mirrors RNS/Transport.py local rebroadcast limit. */
export const LOCAL_REBROADCASTS_MAX = 2;
/** Mirrors RNS/Transport.py reverse-table entry lifetime. */
export const REVERSE_TIMEOUT_SECONDS = 8 * 60;

export function shouldAcceptTransportPacket(input: {
  readonly filterPassed: boolean;
  readonly packetType: number;
  readonly transportType: number;
  readonly hasForeignTransportId: boolean;
  readonly alreadySeenHash: boolean;
}): boolean {
  if (input.filterPassed) {
    return true;
  }

  if (
    input.packetType === PACKET_TYPE_ANNOUNCE &&
    input.transportType === TRANSPORT_TRANSPORT &&
    input.hasForeignTransportId
  ) {
    return !input.alreadySeenHash;
  }

  return false;
}

export function shouldDeferPacketHash(input: {
  readonly packetType: number;
  readonly context: number;
  readonly destinationInLinkTable: boolean;
}): boolean {
  if (
    input.packetType === PACKET_TYPE_PROOF &&
    input.context === PacketContextCode.LRPROOF
  ) {
    return true;
  }
  return input.destinationInLinkTable;
}

/** Which link-table interface should carry a relayed link packet, if any. */
export type LinkRelayTarget = "outbound" | "received";

/**
 * Plan link-packet relay direction from link-table hops / interface identity.
 * Transmit stays at the adapter edge.
 */
export function planLinkRelayTarget(input: {
  readonly sameInterface: boolean;
  readonly ifaceIsOutbound: boolean;
  readonly ifaceIsReceived: boolean;
  readonly packetHops: number;
  readonly remainingHops: number;
  readonly takenHops: number;
}): LinkRelayTarget | null {
  if (input.sameInterface) {
    if (input.packetHops === input.remainingHops || input.packetHops === input.takenHops) {
      return "outbound";
    }
    return null;
  }
  if (input.ifaceIsOutbound && input.packetHops === input.remainingHops) {
    return "received";
  }
  if (input.ifaceIsReceived && input.packetHops === input.takenHops) {
    return "outbound";
  }
  return null;
}

/** True when a reverse-table entry is past its lifetime. */
export function isReverseEntryExpired(input: {
  readonly timestamp: number;
  readonly nowSeconds: number;
  readonly timeoutSeconds?: number;
}): boolean {
  const timeoutSeconds = input.timeoutSeconds ?? REVERSE_TIMEOUT_SECONDS;
  return input.nowSeconds > input.timestamp + timeoutSeconds;
}
