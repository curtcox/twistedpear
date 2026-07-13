/**
 * Pure transport announce / path-response / hop-clone field planning.
 * Packet construction and identity hashing stay at the adapter edge.
 */
import {
  PACKET_CONTEXT_PATH_RESPONSE,
  PACKET_CONTEXT_NONE
} from "./packet-context.js";
import {
  PACKET_HEADER_2,
  PACKET_TYPE_ANNOUNCE,
  type PacketHeaderFields
} from "./packet-header.js";
import { TRANSPORT_TRANSPORT } from "./transport-framing.js";

export { PACKET_CONTEXT_NONE, PACKET_CONTEXT_PATH_RESPONSE };

export interface TransportAnnounceSource {
  readonly contextFlag: number;
  readonly destinationType: number;
  readonly destinationHash: Uint8Array;
  readonly context: number;
  readonly data: Uint8Array;
}

/** Clone packet header fields with a new hop count. */
export function planClonePacketWithHops(
  source: PacketHeaderFields,
  hops: number
): PacketHeaderFields {
  return {
    headerType: source.headerType,
    contextFlag: source.contextFlag,
    transportType: source.transportType,
    destinationType: source.destinationType,
    packetType: source.packetType,
    hops,
    transportId: source.transportId,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data
  };
}

/** HEADER_2 transport-wrapped announce rebroadcast fields. */
export function planTransportAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  return {
    headerType: PACKET_HEADER_2,
    contextFlag: input.source.contextFlag,
    transportType: TRANSPORT_TRANSPORT,
    destinationType: input.source.destinationType,
    packetType: PACKET_TYPE_ANNOUNCE,
    hops: input.hops,
    transportId: input.transportId,
    destinationHash: input.source.destinationHash,
    context: input.source.context,
    data: input.source.data
  };
}

/** HEADER_2 transport path-response announce fields. */
export function planPathResponseAnnounceFields(input: {
  readonly source: TransportAnnounceSource;
  readonly transportId: Uint8Array;
  readonly hops: number;
}): PacketHeaderFields {
  return {
    ...planTransportAnnounceFields(input),
    context: PACKET_CONTEXT_PATH_RESPONSE
  };
}

/**
 * Whether an announce handler should receive this packet given PATH_RESPONSE opt-in.
 * Non-path-response announces always pass; path responses require `receivePathResponses === true`.
 */
export function shouldReceiveAnnouncePathResponse(input: {
  readonly context: number;
  readonly receivePathResponses?: boolean;
}): boolean {
  if (input.context !== PACKET_CONTEXT_PATH_RESPONSE) {
    return true;
  }
  return input.receivePathResponses === true;
}
