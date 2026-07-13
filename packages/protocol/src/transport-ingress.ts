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
