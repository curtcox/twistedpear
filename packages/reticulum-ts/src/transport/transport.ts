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
import { rewritePacketHopsBytes } from "@twistedpear/protocol";

/** Mirrors RNS/Transport.py transport-node constants. */
export const LOCAL_REBROADCASTS_MAX = 2;
export const REVERSE_TIMEOUT_SECONDS = 8 * 60;
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
    if (
      packet.context !== PacketContext.PATH_RESPONSE &&
      this.announceRateLimiter.isBlocked(destinationKey, now)
    ) {
      return;
    }

    if (packet.context !== PacketContext.PATH_RESPONSE) {
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

    const path = this.pathTable.get(hashKey(parsed.destinationHash));
    if (path !== undefined) {
      if (!shouldAnswerPathRequest(path.nextHop, parsed.requestorTransportId)) {
        return;
      }

      await this.sendPathResponse(path, iface);
      return;
    }

    if (this.discoveryPathRequests.has(hashKey(parsed.destinationHash))) {
      return;
    }

    this.discoveryPathRequests.set(hashKey(parsed.destinationHash), {
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
    if (this.packetFilter(packet)) {
      return true;
    }

    if (
      packet.packetType === PacketType.ANNOUNCE &&
      packet.transportType === TransportType.TRANSPORT &&
      packet.transportId !== null &&
      !equalBytes(packet.transportId, this.transportIdentity.hash)
    ) {
      return !this.packetHashes.has(hashKey(packet.hash()));
    }

    return false;
  }

  private shouldDeferPacketHash(packet: Packet): boolean {
    if (packet.packetType === PacketType.PROOF && packet.context === PacketContext.LRPROOF) {
      return true;
    }

    const linkId = hashKey(packet.destinationHash);
    return this.linkTable.has(linkId);
  }

  private async relayTransportPacket(packet: Packet, iface: PacketInterface): Promise<boolean> {
    if (
      packet.transportId === null ||
      packet.packetType === PacketType.ANNOUNCE ||
      !equalBytes(packet.transportId, this.transportIdentity.hash)
    ) {
      return false;
    }

    const path = this.getPathEntry(packet.destinationHash);
    if (path === undefined) {
      return false;
    }

    const relayed = relayTransportPacket(packet, path.hops, path.nextHop);
    const outboundInterface = path.receivedInterface;

    if (packet.packetType === PacketType.LINKREQUEST) {
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
    } else if (packet.packetType !== PacketType.PROOF || packet.context !== PacketContext.LRPROOF) {
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

    let outboundInterface: PacketInterface | null = null;
    if (entry.outboundInterface === entry.receivedInterface) {
      if (packet.hops === entry.remainingHops || packet.hops === entry.takenHops) {
        outboundInterface = entry.outboundInterface;
      }
    } else if (iface === entry.outboundInterface && packet.hops === entry.remainingHops) {
      outboundInterface = entry.receivedInterface;
    } else if (iface === entry.receivedInterface && packet.hops === entry.takenHops) {
      outboundInterface = entry.outboundInterface;
    }

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

    const entry = this.reverseTable.get(hashKey(packet.destinationHash));
    if (entry === undefined) {
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
    if (packet.context === PacketContext.PATH_RESPONSE) {
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
