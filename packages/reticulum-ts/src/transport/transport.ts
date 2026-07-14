import {
  LOCAL_REBROADCASTS_MAX as PROTOCOL_LOCAL_REBROADCASTS_MAX,
  REVERSE_TIMEOUT_SECONDS as PROTOCOL_REVERSE_TIMEOUT_SECONDS,
  canLookupLinkRelayEntry,
  canRelayLinkPacket,
  canRelayReversePacket,
  canRelayTransportPacket,
  isDiscoveryPathRequestExpired,
  isReverseEntryExpired,
  planAnnounceIngressGates,
  planDiscoveryPathRequestFulfill,
  planLinkRelayTarget,
  shouldTransmitLinkRelay,
  planPacketHashRemember,
  planPathRequestIngress,
  planReverseRelayOutcome,
  planTransportIngressDispatch,
  rewritePacketHopsBytes,
  canAnswerLocalPathRequest,
  shouldAcceptTransportPacket,
  shouldAnswerPathWithEntry,
  shouldBeginPathDiscovery,
  shouldClearExpiredDiscoveryPathRequest,
  shouldDeferPacketHash as planShouldDeferPacketHash,
  shouldAnswerPathRequest,
  shouldFulfillDiscoveryPending,
  shouldMatchLocalInboundDestination,
  shouldRecordLinkRelayTableEntry,
  shouldRecordReverseTableEntry,
  shouldRememberPathRequestTag,
  shouldTransmitOnInterface
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
  pathRequestTagKey
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

    const rememberWhen = planPacketHashRemember(this.shouldDeferPacketHash(workingPacket));
    if (rememberWhen === "now") {
      this.packetHashes.add(hashKey(workingPacket.hash()));
    }

    if (await this.relayTransportPacket(workingPacket, iface)) {
      if (rememberWhen === "after-relay") {
        this.packetHashes.add(hashKey(workingPacket.hash()));
      }
      return;
    }

    if (await this.relayLinkPacket(workingPacket, iface)) {
      if (rememberWhen === "after-relay") {
        this.packetHashes.add(hashKey(workingPacket.hash()));
      }
      return;
    }

    if (await this.relayReversePacket(workingPacket, iface)) {
      return;
    }

    if (rememberWhen === "after-relay") {
      this.packetHashes.add(hashKey(workingPacket.hash()));
    }

    switch (
      planTransportIngressDispatch({
        packetType: workingPacket.packetType,
        destinationType: workingPacket.destinationType
      })
    ) {
      case "announce":
        await this.handleAnnounce(workingPacket, iface);
        return;
      case "link-request":
        await this.handleLinkRequest(workingPacket, iface);
        return;
      case "link-data":
        await this.handleLinkData(workingPacket, iface);
        return;
      case "plain-data":
        await this.handleData(workingPacket, iface);
        return;
      case "proof":
        await this.handleProof(workingPacket, iface);
        return;
      case "ignore":
        return;
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
    const path = parsed === null ? undefined : this.getPathEntry(parsed.destinationHash);
    const localDestination =
      parsed === null
        ? undefined
        : this.destinations.find((entry) =>
            shouldMatchLocalInboundDestination({
              hashMatches: equalBytes(entry.hash, parsed.destinationHash),
              directionIn: entry.direction === DestinationDirection.IN
            })
          );
    const tagKey =
      parsed !== null && parsed.tag !== null
        ? pathRequestTagKey(parsed.destinationHash, parsed.tag)
        : null;
    const destinationKey =
      parsed !== null ? hashKey(parsed.destinationHash) : null;
    const existingDiscovery =
      destinationKey !== null ? this.discoveryPathRequests.get(destinationKey) : undefined;
    const nowSeconds = this.clock.now() / 1000;
    const discoveryExpired =
      existingDiscovery !== undefined &&
      isDiscoveryPathRequestExpired({ timeoutAt: existingDiscovery.timeout, nowSeconds });

    const plan = planPathRequestIngress({
      parsedOk: parsed !== null,
      hasTag: parsed?.tag !== null && parsed?.tag !== undefined,
      tagAlreadySeen: tagKey !== null && this.discoveryPrTags.has(tagKey),
      hasLocalAnswerer: localDestination?.answerPathRequest !== undefined,
      transportEnabled: true,
      hasPath: path !== undefined,
      shouldAnswerPath:
        path !== undefined &&
        shouldAnswerPathRequest(path.nextHop, parsed?.requestorTransportId ?? null),
      discoveryPresent: existingDiscovery !== undefined,
      discoveryExpired,
      allowDiscovery: true
    });

    if (plan === "ignore-unparsed" || plan === "ignore-seen-tag") {
      return;
    }

    if (shouldRememberPathRequestTag(tagKey !== null)) {
      this.discoveryPrTags.add(tagKey!);
    }

    if (plan === "answer-local") {
      if (!canAnswerLocalPathRequest(localDestination?.answerPathRequest !== undefined)) {
        return;
      }
      await localDestination!.answerPathRequest!(iface);
      return;
    }

    if (plan === "answer-path") {
      if (!shouldAnswerPathWithEntry(path !== undefined)) {
        return;
      }
      await this.sendPathResponse(path!, iface);
      return;
    }

    if (plan === "ignore" || plan === "ignore-in-flight-discovery") {
      return;
    }

    // start-discovery
    if (
      !shouldBeginPathDiscovery({
        parsedOk: parsed !== null,
        tagPresent: parsed !== null && parsed.tag !== null,
        destinationKeyPresent: destinationKey !== null
      })
    ) {
      return;
    }

    const discoveryKey = destinationKey!;
    const discoveryParsed = parsed!;
    if (shouldClearExpiredDiscoveryPathRequest(discoveryExpired)) {
      this.discoveryPathRequests.delete(discoveryKey);
    }

    this.discoveryPathRequests.set(discoveryKey, {
      timeout: nowSeconds + PATH_REQUEST_TIMEOUT_SECONDS,
      requestingInterface: iface
    });

    for (const outbound of this.interfaces) {
      if (
        !shouldTransmitOnInterface({
          outgoing: outbound.outgoing,
          isExcludedInterface: outbound === iface
        })
      ) {
        continue;
      }

      this.forwardPathRequest(discoveryParsed.destinationHash, discoveryParsed.tag!, outbound);
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
    if (!canRelayLinkPacket(packet.packetType)) {
      return false;
    }

    const entry = this.linkTable.get(hashKey(packet.destinationHash));
    if (!canLookupLinkRelayEntry(entry !== undefined)) {
      return false;
    }

    const target = planLinkRelayTarget({
      sameInterface: entry!.outboundInterface === entry!.receivedInterface,
      ifaceIsOutbound: iface === entry!.outboundInterface,
      ifaceIsReceived: iface === entry!.receivedInterface,
      packetHops: packet.hops,
      remainingHops: entry!.remainingHops,
      takenHops: entry!.takenHops
    });
    const outboundInterface =
      target === "outbound"
        ? entry!.outboundInterface
        : target === "received"
          ? entry!.receivedInterface
          : null;

    if (!shouldTransmitLinkRelay(outboundInterface !== null)) {
      return false;
    }

    const relayed = rewritePacketHopsBytes(packet.raw, packet.hops);
    await this.transmit(outboundInterface!, relayed);
    return true;
  }

  private async relayReversePacket(packet: Packet, iface: PacketInterface): Promise<boolean> {
    const key = hashKey(packet.destinationHash);
    const entry = this.reverseTable.get(key);
    const nowSeconds = this.clock.now() / 1000;
    const entryExpired =
      entry !== undefined && isReverseEntryExpired({ timestamp: entry.timestamp, nowSeconds });
    const canRelay = canRelayReversePacket({
      isProof: packet.packetType === PacketType.PROOF,
      hasEntry: entry !== undefined,
      entryExpired
    });
    const outcome = planReverseRelayOutcome({
      canRelay,
      entryExpired,
      ifaceIsOutbound: entry !== undefined && iface === entry.outboundInterface
    });

    if (outcome === "delete-expired") {
      this.reverseTable.delete(key);
      return false;
    }
    if (outcome !== "relay" || entry === undefined) {
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
      if (
        !shouldTransmitOnInterface({
          outgoing: outbound.outgoing,
          isExcludedInterface: outbound === iface
        })
      ) {
        continue;
      }

      this.packetHashes.add(hashKey(rebroadcast.hash()));
      await this.transmit(outbound, rebroadcast.raw);
    }
  }

  private async fulfillDiscoveryPathRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    const destinationKey = hashKey(packet.destinationHash);
    const pending = this.discoveryPathRequests.get(destinationKey);
    const nowSeconds = this.clock.now() / 1000;
    const fulfill = planDiscoveryPathRequestFulfill({
      hasPending: pending !== undefined,
      expired:
        pending !== undefined &&
        isDiscoveryPathRequestExpired({ timeoutAt: pending.timeout, nowSeconds })
    });

    if (fulfill === "ignore") {
      return;
    }

    this.discoveryPathRequests.delete(destinationKey);
    if (
      !shouldFulfillDiscoveryPending({
        fulfillOk: fulfill === "fulfill",
        pendingPresent: pending !== undefined
      })
    ) {
      return;
    }

    const response = buildPathResponseAnnounce(this.provider, packet, this.transportIdentity, packet.hops);
    await this.transmit(pending!.requestingInterface, response.raw);
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
