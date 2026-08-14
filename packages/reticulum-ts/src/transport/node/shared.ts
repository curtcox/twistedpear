import {
  protocolAnnounceEmittedFromRandomBlob,
  clonePacketWithHopsFieldsFromActions,
  DestinationProofStrategyCode,
  initialClonePacketWithHopsState,
  initialPathResponseAnnounceFieldsState,
  initialRelayTransportPacketState,
  initialRewritePacketHopsState,
  initialStripTransportHeadersState,
  initialTransportAnnounceFieldsState,
  initialWrapTransportPacketState,
  PATHFINDER_EXPIRY_SECONDS,
  PATHFINDER_MAX_HOPS,
  pathResponseAnnounceFieldsFromActions,
  relayTransportPacketRawFromActions,
  rewritePacketHopsRawFromActions,
  shouldUseClonePacketWithHops,
  shouldUsePathResponseAnnounceFields,
  shouldUseRelayTransportPacket,
  shouldUseRewritePacketHops,
  shouldUseStripTransportHeaders,
  shouldUseTransportAnnounceFields,
  shouldUseWrapTransportPacket,
  stepClonePacketWithHopsWithActions,
  stepPathResponseAnnounceFieldsWithActions,
  stepRelayTransportPacketWithActions,
  stepRewritePacketHopsWithActions,
  stepStripTransportHeadersWithActions,
  stepTransportAnnounceFieldsWithActions,
  stepWrapTransportPacketWithActions,
  stripTransportHeadersRawFromActions,
  protocolTimebaseFromRandomBlobs,
  transportAnnounceFieldsFromActions,
  type PacketHeaderFields,
  wrapTransportPacketRawFromActions,
} from "./protocol.js";

export type { DropObserver } from "../drop-notify.js";
import type { CryptoProvider } from "../../crypto/provider.js";
import { type ParsedAnnounce } from "../../announce.js";
import { bytesToHex } from "../../crypto/bytes.js";
import {
  type DestinationTypeValue,
  type DestinationDirectionValue,
} from "../../destination.js";
import { Identity, TRUNCATED_HASH_LENGTH } from "../../identity.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import { Packet, type PacketFields } from "../../packet.js";
export type { LeafTransportOptions } from "../transport-types.js";
export { PATHFINDER_EXPIRY_SECONDS, PATHFINDER_MAX_HOPS };
export const TRUNCATED_HASH_BYTES = TRUNCATED_HASH_LENGTH / 8;

export interface PathEntry {
  readonly timestamp: number;
  readonly nextHop: Uint8Array;
  readonly hops: number;
  readonly expires: number;
  readonly randomBlobs: ReadonlyArray<Uint8Array>;
  readonly receivedInterface: PacketInterface;
  readonly packetHash: Uint8Array;
  readonly announceRaw: Uint8Array;
}

export interface ReceivedAnnounceInfo {
  readonly destinationHash: Uint8Array;
  readonly announcedIdentity: Identity;
  readonly appData: Uint8Array | null;
  readonly announce: ParsedAnnounce;
  readonly packet: Packet;
}

export interface AnnounceHandler {
  readonly aspectFilter?: string | null;
  readonly receivePathResponses?: boolean;
  receivedAnnounce(info: ReceivedAnnounceInfo): void;
}

export const DestinationProofStrategy = DestinationProofStrategyCode;

export type DestinationProofStrategyValue =
  (typeof DestinationProofStrategy)[keyof typeof DestinationProofStrategy];

export interface LocalDestination {
  readonly hash: Uint8Array;
  readonly type: DestinationTypeValue;
  readonly direction: DestinationDirectionValue;
  readonly identity: Identity | null;
  readonly proofStrategy: DestinationProofStrategyValue;
  decrypt(ciphertext: Uint8Array): Uint8Array | null;
  dispatchPacket(data: Uint8Array, packet: Packet): void;
  shouldProve(packet: Packet): boolean;
  handleLinkRequest?(packet: Packet, iface: PacketInterface): void;
  answerPathRequest?(iface: PacketInterface): Promise<void>;
}

export function hashKey(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

export function cloneWithHops(
  provider: CryptoProvider,
  packet: Packet,
  hops: number,
): Packet {
  const stepped = stepClonePacketWithHopsWithActions(
    initialClonePacketWithHopsState(),
    {
      kind: "transport/clone-packet-with-hops-gate",
      source: packetHeaderFields(packet),
      hops,
    },
  );
  const fields = shouldUseClonePacketWithHops(stepped.actions)
    ? clonePacketWithHopsFieldsFromActions(stepped.actions)
    : null;
  if (fields === null) {
    throw new Error("cloneWithHops: missing use-fields action");
  }
  return Packet.fromFields(provider, fields as PacketFields);
}

export function announceEmittedFromRandomBlob(randomBlob: Uint8Array): number {
  return protocolAnnounceEmittedFromRandomBlob(randomBlob);
}

export function timebaseFromRandomBlobs(
  randomBlobs: ReadonlyArray<Uint8Array>,
): number {
  return protocolTimebaseFromRandomBlobs(randomBlobs);
}

export function wrapTransportPacket(
  packet: Packet,
  nextHop: Uint8Array,
): Uint8Array {
  const stepped = stepWrapTransportPacketWithActions(
    initialWrapTransportPacketState(),
    {
      kind: "transport/wrap-packet-gate",
      packedFlags: packet.packedFlags(),
      hops: packet.hops,
      raw: packet.raw,
      nextHop,
    },
  );
  const raw = shouldUseWrapTransportPacket(stepped.actions)
    ? wrapTransportPacketRawFromActions(stepped.actions)
    : null;
  if (raw === null) {
    throw new Error("wrapTransportPacket: missing use-raw action");
  }
  return raw;
}

export function stripTransportHeaders(raw: Uint8Array): Uint8Array {
  const stepped = stepStripTransportHeadersWithActions(
    initialStripTransportHeadersState(),
    {
      kind: "transport/strip-headers-gate",
      raw,
    },
  );
  const stripped = shouldUseStripTransportHeaders(stepped.actions)
    ? stripTransportHeadersRawFromActions(stepped.actions)
    : null;
  if (stripped === null) {
    throw new Error("stripTransportHeaders: missing use-raw action");
  }
  return stripped;
}

export function relayTransportPacket(
  packet: Packet,
  remainingHops: number,
  nextHop: Uint8Array,
): Uint8Array {
  const stepped = stepRelayTransportPacketWithActions(
    initialRelayTransportPacketState(),
    {
      kind: "transport/relay-packet-bytes-gate",
      raw: packet.raw,
      hops: packet.hops,
      remainingHops,
      nextHop,
    },
  );
  const raw = shouldUseRelayTransportPacket(stepped.actions)
    ? relayTransportPacketRawFromActions(stepped.actions)
    : null;
  if (raw === null) {
    throw new Error("relayTransportPacket: missing use-raw action");
  }
  return raw;
}

export function rewritePacketHops(raw: Uint8Array, hops: number): Uint8Array {
  const stepped = stepRewritePacketHopsWithActions(
    initialRewritePacketHopsState(),
    {
      kind: "transport/rewrite-packet-hops-gate",
      raw,
      hops,
    },
  );
  const rewritten = shouldUseRewritePacketHops(stepped.actions)
    ? rewritePacketHopsRawFromActions(stepped.actions)
    : null;
  if (rewritten === null) {
    throw new Error("rewritePacketHops: missing use-raw action");
  }
  return rewritten;
}

export function buildTransportAnnounce(
  provider: CryptoProvider,
  source: Packet,
  transportIdentity: Identity,
  hops: number,
): Packet {
  const announceSource = {
    contextFlag: source.contextFlag,
    destinationType: source.destinationType,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data,
  };
  const stepped = stepTransportAnnounceFieldsWithActions(
    initialTransportAnnounceFieldsState(),
    {
      kind: "transport/announce-fields-gate",
      source: announceSource,
      transportId: transportIdentity.hash,
      hops,
    },
  );
  const fields = shouldUseTransportAnnounceFields(stepped.actions)
    ? transportAnnounceFieldsFromActions(stepped.actions)
    : null;
  if (fields === null) {
    throw new Error("buildTransportAnnounce: missing use-fields action");
  }
  return Packet.fromFields(provider, fields as PacketFields);
}

export function buildPathResponseAnnounce(
  provider: CryptoProvider,
  source: Packet,
  transportIdentity: Identity,
  hops: number,
): Packet {
  const announceSource = {
    contextFlag: source.contextFlag,
    destinationType: source.destinationType,
    destinationHash: source.destinationHash,
    context: source.context,
    data: source.data,
  };
  const stepped = stepPathResponseAnnounceFieldsWithActions(
    initialPathResponseAnnounceFieldsState(),
    {
      kind: "transport/path-response-announce-fields-gate",
      source: announceSource,
      transportId: transportIdentity.hash,
      hops,
    },
  );
  const fields = shouldUsePathResponseAnnounceFields(stepped.actions)
    ? pathResponseAnnounceFieldsFromActions(stepped.actions)
    : null;
  if (fields === null) {
    throw new Error("buildPathResponseAnnounce: missing use-fields action");
  }
  return Packet.fromFields(provider, fields as PacketFields);
}

export function packetHeaderFields(packet: Packet): PacketHeaderFields {
  return {
    headerType: packet.headerType,
    contextFlag: packet.contextFlag,
    transportType: packet.transportType,
    destinationType: packet.destinationType,
    packetType: packet.packetType,
    hops: packet.hops,
    transportId: packet.transportId,
    destinationHash: packet.destinationHash,
    context: packet.context,
    data: packet.data,
  };
}
