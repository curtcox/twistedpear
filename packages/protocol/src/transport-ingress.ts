/**
 * Pure transport ingress accept / filter / packet-hash deferral / relay decisions.
 * Hash tables and interface identity stay at the adapter edge as boolean inputs.
 */
import {
  PACKET_DEST_TYPE_SINGLE,
  PACKET_TYPE_ANNOUNCE,
  PACKET_TYPE_LINKREQUEST,
  PACKET_TYPE_PROOF
} from "./packet-header.js";
import { PacketContextCode } from "./packet-context.js";
import { equalByteArrays } from "./path-table.js";
import { TRANSPORT_TRANSPORT } from "./transport-framing.js";

/** Mirrors RNS/Transport.py local rebroadcast limit. */
export const LOCAL_REBROADCASTS_MAX = 2;
/** Mirrors RNS/Transport.py reverse-table entry lifetime. */
export const REVERSE_TIMEOUT_SECONDS = 8 * 60;

/**
 * Plan leaf packet-filter accept (foreign transport-id + seen-hash rules).
 * Hash-set membership is supplied as `alreadySeenHash`.
 */
export function planPacketFilter(input: {
  readonly transportId: Uint8Array | null;
  readonly localTransportHash: Uint8Array;
  readonly packetType: number;
  readonly destinationType: number;
  readonly alreadySeenHash: boolean;
}): boolean {
  if (input.transportId !== null && input.packetType !== PACKET_TYPE_ANNOUNCE) {
    if (!equalByteArrays(input.transportId, input.localTransportHash)) {
      return false;
    }
  }

  if (!input.alreadySeenHash) {
    return true;
  }

  return input.packetType === PACKET_TYPE_ANNOUNCE && input.destinationType === PACKET_DEST_TYPE_SINGLE;
}

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

/**
 * Whether this node should relay a transport-wrapped packet (local transport-id,
 * non-announce, known path).
 */
export function canRelayTransportPacket(input: {
  readonly transportIdPresent: boolean;
  readonly isAnnounce: boolean;
  readonly transportIdMatchesLocal: boolean;
  readonly hasPath: boolean;
}): boolean {
  return (
    input.transportIdPresent &&
    !input.isAnnounce &&
    input.transportIdMatchesLocal &&
    input.hasPath
  );
}

/** Whether a relayed packet should create/update a link-relay table entry. */
export function shouldRecordLinkRelayTableEntry(packetType: number): boolean {
  return packetType === PACKET_TYPE_LINKREQUEST;
}

/**
 * Whether a relayed packet should create/update a reverse-table entry
 * (everything except LRPROOF proofs).
 */
export function shouldRecordReverseTableEntry(input: {
  readonly packetType: number;
  readonly context: number;
}): boolean {
  return !(
    input.packetType === PACKET_TYPE_PROOF &&
    input.context === PacketContextCode.LRPROOF
  );
}

/** Whether inbound DATA is a local path-request (PLAIN + path-request hash). */
export function isLocalPathRequestPacket(input: {
  readonly destinationTypePlain: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.destinationTypePlain && input.destinationHashMatches;
}
