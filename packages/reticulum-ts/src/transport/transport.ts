import {
  LOCAL_REBROADCASTS_MAX as PROTOCOL_LOCAL_REBROADCASTS_MAX,
  REVERSE_TIMEOUT_SECONDS as PROTOCOL_REVERSE_TIMEOUT_SECONDS,
  canRelayTransportPacket,
  isDiscoveryPathRequestExpired,
  isReverseEntryExpired,
  planAnnounceIngressGates,
  planLinkRelayTarget,
  rewritePacketHopsBytes,
  shouldAcceptTransportPacket,
  shouldDeferPacketHash as planShouldDeferPacketHash,
  shouldRecordLinkRelayTableEntry,
  shouldRecordReverseTableEntry
} from "@twistedpear/protocol";
import { equalBytes } from "../crypto/bytes.js";
import { DestinationDirection, DestinationType } from "../destination.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { Link } from "../link.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType
} from "../packet.js";
import {
  LeafTransport,
  type LeafTransportOptions,
  buildPathResponseAnnounce,
  buildTransportAnnounce,
  cloneWithHops,
  hashKey,
  relayTransportPacket,
  type PathEntry
} from "./node.js";
import {
  PATH_REQUEST_TIMEOUT_SECONDS,
  buildPathRequestData,
  parsePathRequestData,
  pathRequestTagKey,
  shouldAnswerPathRequest
} from "./path.js";
import { AnnounceRateLimiter } from "./rate.js";

/** Mirrors RNS/Transport.py transport-node constants. */
export const LOCAL_REBROADCASTS_MAX = PROTOCOL_LOCAL_REBROADCASTS_MAX;
export const REVERSE_TIMEOUT_SECONDS = PROTOCOL_REVERSE_TIMEOUT_SECONDS;
export { PATH_REQUEST_MIN_INTERVAL } from "./path.js";

export interface TransportNodeOptions extends LeafTransportOptions {
  readonly announceRateLimiter?: AnnounceRateLimiter;
}

interface LinkTableEntry {
  readonly timestamp: number;
  readonly nextHop: Uint8Array;
  readonly outboundInterface: PacketInterface;
  readonly remainingHops: number;
  readonly receivedInterface: PacketInterface;
  readonly takenHops: number;
  readonly destinationHash: Uint8Array;
}

interface ReverseTableEntry {
  readonly receivedInterface: PacketInterface;
  readonly outboundInterface: PacketInterface;
  readonly timestamp: number;
}

interface DiscoveryPathRequest {
  readonly timeout: number;
  readonly requestingInterface: PacketInterface;
}

/** Transport-node mode: rebroadcast, relay, and path forwarding. Mirrors RNS/Transport.py transport subset. */
export class TransportNode extends LeafTransport {
  private readonly linkTable = new Map<string, LinkTableEntry>();
  private readonly reverseTable = new Map<string, ReverseTableEntry>();
  private readonly announceRateLimiter: AnnounceRateLimiter;
  private readonly discoveryPathRequests = new Map<string, DiscoveryPathRequest>();

  constructor(options: TransportNodeOptions) {
    super({ ...options, transportEnabled: true });
    this.announceRateLimiter = options.announceRateLimiter ?? new AnnounceRateLimiter();
  }

  protected override async inbound(packet: Packet, iface: PacketInterface): Promise<void> {
    const workingPacket = cloneWithHops(this.provider, packet, packet.hops + 1);

    if (!this.shouldAcceptPacket(workingPacket)) {
      return;
    }

    const rememberHash = !this.shouldDeferPacketHash(workingPacket);
    if (rememberHash) {
      this.packetHashes.add(hashKey(workingPacket.hash()));
    }

    if (await this.relayTransportPacket(workingPacket, iface)) {
      if (!rememberHash) {
        this.packetHashes.add(hashKey(workingPacket.hash()));
      }
      return;
    }

    if (await this.relayLinkPacket(workingPacket, iface)) {
      if (!rememberHash) {
        this.packetHashes.add(hashKey(workingPacket.hash()));
      }
      return;
    }

    if (await this.relayReversePacket(workingPacket, iface)) {
      return;
    }

    if (!rememberHash) {
      this.packetHashes.add(hashKey(workingPacket.hash()));
    }

    if (workingPacket.packetType === PacketType.ANNOUNCE) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }

    if (workingPacket.packetType === PacketType.LINKREQUEST) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }

    if (workingPacket.packetType === PacketType.DATA) {
      if (workingPacket.destinationType === DestinationType.LINK) {
        await this.handleLinkData(workingPacket, iface);
        return;
      }

      await this.handleData(workingPacket, iface);
      return;
    }

    if (workingPacket.packetType === PacketType.PROOF) {
      await this.handleProof(workingPacket, iface);
    }
  }

  protected override async handleAnnounce(packet: Packet, iface: PacketInterface): Promise<void> {
    const destinationKey = hashKey(packet.destinationHash);
    const now = this.clock.now() / 1000;
    const gates = planAnnounceIngressGates(packet.context);
    if (gates.applyRateLimit && this.announceRateLimiter.isBlocked(destinationKey, now)) {
      return;
    }

    if (gates.recordRate) {
      this.announceRateLimiter.record(destinationKey, now);
    }

    await super.handleAnnounce(packet, iface);
    await this.fulfillDiscoveryPathRequest(packet, iface);
    await this.rebroadcastAnnounce(packet, iface);
  }

  protected override async handlePathRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    const parsed = parsePathRequestData(packet.data);
    if (parsed === null || parsed.tag === null) {
      return;
    }

    const tagKey = pathRequestTagKey(parsed.destinationHash, parsed.tag);
    if (this.discoveryPrTags.has(tagKey)) {
      return;
    }

    this.discoveryPrTags.add(tagKey);

    const localDestination = this.destinations.find(
      (entry) =>
        equalBytes(entry.hash, parsed.destinationHash) && entry.direction === DestinationDirection.IN
    );
    if (localDestination?.answerPathRequest !== undefined) {
      await localDestination.answerPathRequest(iface);
      return;
    }

    const path = this.getPathEntry(parsed.destinationHash);
    if (path !== undefined) {
      if (!shouldAnswerPathRequest(path.nextHop, parsed.requestorTransportId)) {
        return;
      }

      await this.sendPathResponse(path, iface);
      return;
    }

    const destinationKey = hashKey(parsed.destinationHash);
    const existingDiscovery = this.discoveryPathRequests.get(destinationKey);
    if (existingDiscovery !== undefined) {
      const nowSeconds = this.clock.now() / 1000;
      if (!isDiscoveryPathRequestExpired({ timeoutAt: existingDiscovery.timeout, nowSeconds })) {
        return;
      }
      this.discoveryPathRequests.delete(destinationKey);
    }

    this.discoveryPathRequests.set(destinationKey, {
      timeout: this.clock.now() / 1000 + PATH_REQUEST_TIMEOUT_SECONDS,
      requestingInterface: iface
    });

    for (const outbound of this.interfaces) {
      if (!outbound.outgoing || outbound === iface) {
        continue;
      }

      this.forwardPathRequest(parsed.destinationHash, parsed.tag, outbound);
    }
  }

  private shouldAcceptPacket(packet: Packet): boolean {
    return shouldAcceptTransportPacket({
      filterPassed: this.packetFilter(packet),
      packetType: packet.packetType,
      transportType: packet.transportType,
      hasForeignTransportId:
        packet.transportId !== null &&
        !equalBytes(packet.transportId, this.transportIdentity.hash),
      alreadySeenHash: this.packetHashes.has(hashKey(packet.hash()))
    });
  }

  private shouldDeferPacketHash(packet: Packet): boolean {
    return planShouldDeferPacketHash({
      packetType: packet.packetType,
      context: packet.context,
      destinationInLinkTable: this.linkTable.has(hashKey(packet.destinationHash))
    });
  }

  private async relayTransportPacket(packet: Packet, iface: PacketInterface): Promise<boolean> {
    const path = this.getPathEntry(packet.destinationHash);
    if (
      path === undefined ||
      !canRelayTransportPacket({
        transportIdPresent: packet.transportId !== null,
        isAnnounce: packet.packetType === PacketType.ANNOUNCE,
        transportIdMatchesLocal:
          packet.transportId !== null &&
          equalBytes(packet.transportId, this.transportIdentity.hash),
        hasPath: true
      })
    ) {
      return false;
    }

    const relayed = relayTransportPacket(packet, path.hops, path.nextHop);
    const outboundInterface = path.receivedInterface;

    if (shouldRecordLinkRelayTableEntry(packet.packetType)) {
      const linkId = Link.linkIdFromLrPacket(this.provider, packet);
      this.linkTable.set(hashKey(linkId), {
        timestamp: this.clock.now() / 1000,
        nextHop: path.nextHop,
        outboundInterface,
        remainingHops: path.hops,
        receivedInterface: iface,
        takenHops: packet.hops,
        destinationHash: packet.destinationHash
      });
    } else if (
      shouldRecordReverseTableEntry({
        packetType: packet.packetType,
        context: packet.context
      })
    ) {
      this.reverseTable.set(hashKey(packet.truncatedHash()), {
        receivedInterface: iface,
        outboundInterface,
        timestamp: this.clock.now() / 1000
      });
    }

    await this.transmit(outboundInterface, relayed);
    this.touchPathEntry(packet.destinationHash);
    return true;
  }

  private async relayLinkPacket(packet: Packet, iface: PacketInterface): Promise<boolean> {
    if (packet.packetType === PacketType.ANNOUNCE || packet.packetType === PacketType.LINKREQUEST) {
      return false;
    }

    const entry = this.linkTable.get(hashKey(packet.destinationHash));
    if (entry === undefined) {
      return false;
    }

    const target = planLinkRelayTarget({
      sameInterface: entry.outboundInterface === entry.receivedInterface,
      ifaceIsOutbound: iface === entry.outboundInterface,
      ifaceIsReceived: iface === entry.receivedInterface,
      packetHops: packet.hops,
      remainingHops: entry.remainingHops,
      takenHops: entry.takenHops
    });
    const outboundInterface =
      target === "outbound"
        ? entry.outboundInterface
        : target === "received"
          ? entry.receivedInterface
          : null;

    if (outboundInterface === null) {
      return false;
    }

    const relayed = rewritePacketHopsBytes(packet.raw, packet.hops);
    await this.transmit(outboundInterface, relayed);
    return true;
  }

  private async relayReversePacket(packet: Packet, iface: PacketInterface): Promise<boolean> {
    if (packet.packetType !== PacketType.PROOF) {
      return false;
    }

    const key = hashKey(packet.destinationHash);
    const entry = this.reverseTable.get(key);
    if (entry === undefined) {
      return false;
    }

    const nowSeconds = this.clock.now() / 1000;
    if (isReverseEntryExpired({ timestamp: entry.timestamp, nowSeconds })) {
      this.reverseTable.delete(key);
      return false;
    }

    if (iface !== entry.outboundInterface) {
      return false;
    }

    const relayed = rewritePacketHopsBytes(packet.raw, packet.hops);
    await this.transmit(entry.receivedInterface, relayed);
    return true;
  }

  private async rebroadcastAnnounce(packet: Packet, iface: PacketInterface): Promise<void> {
    if (!planAnnounceIngressGates(packet.context).rebroadcast) {
      return;
    }

    const rebroadcast = buildTransportAnnounce(this.provider, packet, this.transportIdentity, packet.hops);
    for (const outbound of this.interfaces) {
      if (!outbound.outgoing || outbound === iface) {
        continue;
      }

      this.packetHashes.add(hashKey(rebroadcast.hash()));
      await this.transmit(outbound, rebroadcast.raw);
    }
  }

  private async fulfillDiscoveryPathRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    const destinationKey = hashKey(packet.destinationHash);
    const pending = this.discoveryPathRequests.get(destinationKey);
    if (pending === undefined) {
      return;
    }

    const nowSeconds = this.clock.now() / 1000;
    if (isDiscoveryPathRequestExpired({ timeoutAt: pending.timeout, nowSeconds })) {
      this.discoveryPathRequests.delete(destinationKey);
      return;
    }

    this.discoveryPathRequests.delete(destinationKey);
    const response = buildPathResponseAnnounce(this.provider, packet, this.transportIdentity, packet.hops);
    await this.transmit(pending.requestingInterface, response.raw);
  }

  private forwardPathRequest(
    destinationHash: Uint8Array,
    tag: Uint8Array,
    iface: PacketInterface
  ): void {
    const requestData = buildPathRequestData(destinationHash, this.transportIdentity.hash, tag);
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.PLAIN,
      packetType: PacketType.DATA,
      destinationHash: this.pathRequestHash,
      context: PacketContext.NONE,
      data: requestData
    });

    void this.transmit(iface, packet.raw);
  }

  private touchPathEntry(destinationHash: Uint8Array): void {
    const key = hashKey(destinationHash);
    const existing = this.pathTable.get(key);
    if (existing === undefined) {
      return;
    }

    const updated: PathEntry = {
      ...existing,
      timestamp: this.clock.now() / 1000
    };
    this.pathTable.set(key, updated);
  }
}
