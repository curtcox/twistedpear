import { dropFromIngressIgnore } from "./drop-notify.js";
import {
  LOCAL_REBROADCASTS_MAX as PROTOCOL_LOCAL_REBROADCASTS_MAX,
  REVERSE_TIMEOUT_SECONDS as PROTOCOL_REVERSE_TIMEOUT_SECONDS,
  initialAnnounceIngressGatesState,
  initialBeginPathDiscoveryState,
  initialDiscoveryPathRequestExpiredState,
  initialDiscoveryPathRequestFulfillState,
  initialLinkRelayTargetState,
  initialLookupLinkRelayEntryState,
  initialPacketHashRememberState,
  initialPathRequestIngressState,
  initialRecordLinkRelayTableEntryState,
  initialRecordReverseTableEntryState,
  initialRelayLinkPacketAllowState,
  initialRelayReverseOnInterfaceState,
  initialRelayReversePacketAllowState,
  initialRelayTransportPacketAllowState,
  initialReverseEntryExpiredState,
  initialReverseRelayOutcomeState,
  initialTransmitLinkRelayState,
  initialTransmitReverseRelayState,
  initialTransportIngressDispatchState,
  shouldAllowRelayLinkPacket,
  shouldAllowRelayReversePacket,
  shouldAllowRelayTransportPacket,
  observeDropFromAnnounceRateLimitActions,
  shouldHitLookupLinkRelayEntry,
  shouldIgnoreLinkRelayTarget,
  shouldRebroadcastAnnounce,
  shouldRecordAnnounceRate,
  shouldRecordLinkRelayTableEntryNow,
  shouldRecordReverseTableEntryNow,
  shouldRelayLinkOutbound,
  shouldRelayLinkReceived,
  shouldTransmitLinkRelayNow,
  shouldAcceptTransportPacketNow,
  shouldAnswerPathRequestLocal,
  shouldAnswerPathRequestPath,
  shouldBeginPathDiscoveryNow,
  shouldDeleteExpiredReverseEntryActions,
  shouldDeferPacketHashActions,
  shouldDispatchTransportAnnounce,
  shouldDispatchTransportLinkData,
  shouldDispatchTransportLinkRequest,
  shouldDispatchTransportPlainData,
  shouldDispatchTransportProof,
  shouldFulfillDiscoveryPathRequest,
  shouldIgnoreDiscoveryPathFulfillActions,
  shouldIgnorePathRequestInFlightDiscovery,
  shouldIgnorePathRequestIngress,
  shouldIgnorePathRequestSeenTag,
  shouldIgnorePathRequestUnparsed,
  shouldIgnoreTransportIngressDispatch,
  shouldMatchLocalInboundDestinationNow,
  initialAcceptTransportPacketState,
  initialAnswerLocalPathRequestState,
  initialAnswerPathRequestState,
  initialAnswerPathWithEntryState,
  initialClearExpiredDiscoveryPathRequestState,
  initialFulfillDiscoveryPendingState,
  initialMatchLocalInboundDestinationState,
  initialPacketHashDeferState,
  initialRememberPathRequestTagState,
  initialTouchPathEntryState,
  stepAcceptTransportPacketWithActions,
  stepPacketHashDeferWithActions,
  shouldRelayReversePacketActions,
  shouldRememberPacketHashAfterRelayActions,
  shouldRememberPacketHashNowActions,
  shouldAnswerLocalPathRequestNow,
  shouldAnswerPathRequestNow,
  shouldAnswerPathWithEntryNow,
  shouldClearExpiredDiscoveryPathRequestNow,
  shouldFulfillDiscoveryPendingNow,
  shouldRememberPathRequestTagNow,
  shouldTouchPathEntryNow,
  shouldMatchRelayReverseOnInterface,
  shouldStartPathRequestDiscovery,
  shouldTransmitReverseRelayNow,
  shouldTreatDiscoveryPathRequestExpired,
  shouldTreatReverseEntryExpired,
  stepAnnounceIngressGatesWithActions,
  stepAnswerLocalPathRequestWithActions,
  stepAnswerPathRequestWithActions,
  stepAnswerPathWithEntryWithActions,
  stepBeginPathDiscoveryWithActions,
  stepClearExpiredDiscoveryPathRequestWithActions,
  stepDiscoveryPathRequestExpiredWithActions,
  stepFulfillDiscoveryPendingWithActions,
  stepLinkRelayTargetWithActions,
  stepLookupLinkRelayEntryWithActions,
  stepMatchLocalInboundDestinationWithActions,
  stepPacketHashRememberWithActions,
  stepRecordLinkRelayTableEntryWithActions,
  stepRecordReverseTableEntryWithActions,
  stepRelayLinkPacketAllowWithActions,
  stepRelayReverseOnInterfaceWithActions,
  stepRelayReversePacketAllowWithActions,
  stepRelayTransportPacketAllowWithActions,
  stepRememberPathRequestTagWithActions,
  stepReverseEntryExpiredWithActions,
  stepReverseRelayOutcomeWithActions,
  stepTouchPathEntryWithActions,
  stepTransmitLinkRelayWithActions,
  stepTransmitOnInterfaceWithActions,
  stepTransmitReverseRelayWithActions,
  stepTransportIngressDispatchWithActions,
  shouldTransmitOnInterfaceNow,
  initialTransmitOnInterfaceState,
  stepDiscoveryPathRequestFulfillWithActions,
  stepPathRequestIngressWithActions,
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
  TransportType,
} from "../packet.js";
import {
  LeafTransport,
  type LeafTransportOptions,
  buildPathResponseAnnounce,
  buildTransportAnnounce,
  cloneWithHops,
  hashKey,
  relayTransportPacket,
  rewritePacketHops,
  type PathEntry,
} from "./node.js";
import {
  PATH_REQUEST_TIMEOUT_SECONDS,
  buildPathRequestData,
  parsePathRequestData,
  pathRequestTagKey,
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
  private readonly discoveryPathRequests = new Map<
    string,
    DiscoveryPathRequest
  >();

  constructor(options: TransportNodeOptions) {
    super(options);
    this.announceRateLimiter =
      options.announceRateLimiter ?? new AnnounceRateLimiter();
  }

  protected override async inbound(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    if (!this.transportEnabled) {
      await super.inbound(packet, iface);
      return;
    }
    const workingPacket = cloneWithHops(this.provider, packet, packet.hops + 1);

    if (!this.shouldAcceptPacket(workingPacket)) {
      return;
    }

    const rememberStepped = stepPacketHashRememberWithActions(
      initialPacketHashRememberState(),
      {
        kind: "transport/packet-hash-remember-gate",
        deferred: this.shouldDeferPacketHash(workingPacket),
      },
    );
    if (shouldRememberPacketHashNowActions(rememberStepped.actions)) {
      this.packetHashes.add(hashKey(workingPacket.hash()));
    }

    if (await this.relayTransportPacket(workingPacket, iface)) {
      if (shouldRememberPacketHashAfterRelayActions(rememberStepped.actions)) {
        this.packetHashes.add(hashKey(workingPacket.hash()));
      }
      return;
    }

    if (await this.relayLinkPacket(workingPacket, iface)) {
      if (shouldRememberPacketHashAfterRelayActions(rememberStepped.actions)) {
        this.packetHashes.add(hashKey(workingPacket.hash()));
      }
      return;
    }

    if (await this.relayReversePacket(workingPacket, iface)) {
      return;
    }

    if (shouldRememberPacketHashAfterRelayActions(rememberStepped.actions)) {
      this.packetHashes.add(hashKey(workingPacket.hash()));
    }

    const dispatchStepped = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: workingPacket.packetType,
        destinationType: workingPacket.destinationType,
      },
    );
    if (shouldDispatchTransportAnnounce(dispatchStepped.actions)) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkRequest(dispatchStepped.actions)) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkData(dispatchStepped.actions)) {
      await this.handleLinkData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportPlainData(dispatchStepped.actions)) {
      await this.handleData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportProof(dispatchStepped.actions)) {
      await this.handleProof(workingPacket, iface);
      return;
    }
    if (shouldIgnoreTransportIngressDispatch(dispatchStepped.actions)) {
      this.emitDrop(dropFromIngressIgnore(dispatchStepped.actions, iface.name));
      return;
    }
  }

  protected override async handleAnnounce(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    if (!this.transportEnabled) {
      await super.handleAnnounce(packet, iface);
      return;
    }
    const destinationKey = hashKey(packet.destinationHash);
    const now = this.clock.now() / 1000;
    const gates = stepAnnounceIngressGatesWithActions(
      initialAnnounceIngressGatesState(),
      {
        kind: "announce/ingress-gates",
        context: packet.context,
      },
    );
    const blocked = this.announceRateLimiter.stepBlocked(destinationKey, now);
    const rateDrop = observeDropFromAnnounceRateLimitActions(
      gates.actions,
      blocked.actions,
      {
        destinationKey,
        ifaceId: iface.name,
      },
    );
    if (rateDrop !== null) {
      this.emitDrop(rateDrop);
      return;
    }

    if (shouldRecordAnnounceRate(gates.actions)) {
      this.announceRateLimiter.record(destinationKey, now);
    }

    await super.handleAnnounce(packet, iface);
    await this.fulfillDiscoveryPathRequest(packet, iface);
    await this.rebroadcastAnnounce(packet, iface);
  }

  protected override async handlePathRequest(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    if (!this.transportEnabled) {
      await super.handlePathRequest(packet, iface);
      return;
    }
    const parsed = parsePathRequestData(packet.data);
    const path =
      parsed === null ? undefined : this.getPathEntry(parsed.destinationHash);
    const localDestination =
      parsed === null
        ? undefined
        : this.destinations.find((entry) =>
            shouldMatchLocalInboundDestinationNow(
              stepMatchLocalInboundDestinationWithActions(
                initialMatchLocalInboundDestinationState(),
                {
                  kind: "transport/match-local-inbound-destination-gate",
                  hashMatches: equalBytes(entry.hash, parsed.destinationHash),
                  directionIn: entry.direction === DestinationDirection.IN,
                },
              ).actions,
            ),
          );
    const tagKey =
      parsed !== null && parsed.tag !== null
        ? pathRequestTagKey(parsed.destinationHash, parsed.tag)
        : null;
    const destinationKey =
      parsed !== null ? hashKey(parsed.destinationHash) : null;
    const existingDiscovery =
      destinationKey !== null
        ? this.discoveryPathRequests.get(destinationKey)
        : undefined;
    const nowSeconds = this.clock.now() / 1000;
    const discoveryExpired =
      existingDiscovery !== undefined &&
      shouldTreatDiscoveryPathRequestExpired(
        stepDiscoveryPathRequestExpiredWithActions(
          initialDiscoveryPathRequestExpiredState(),
          {
            kind: "path-request/discovery-expired-gate",
            timeoutAt: existingDiscovery.timeout,
            nowSeconds,
          },
        ).actions,
      );

    const stepped = stepPathRequestIngressWithActions(
      initialPathRequestIngressState(),
      {
        kind: "path-request/ingress-gate",
        parsedOk: parsed !== null,
        hasTag: parsed?.tag !== null && parsed?.tag !== undefined,
        tagAlreadySeen: tagKey !== null && this.discoveryPrTags.has(tagKey),
        hasLocalAnswerer: localDestination?.answerPathRequest !== undefined,
        transportEnabled: this.transportEnabled,
        hasPath: path !== undefined,
        shouldAnswerPath:
          path !== undefined &&
          shouldAnswerPathRequestNow(
            stepAnswerPathRequestWithActions(initialAnswerPathRequestState(), {
              kind: "path-request/answer-path-gate",
              nextHop: path.nextHop,
              requestorTransportId: parsed?.requestorTransportId ?? null,
            }).actions,
          ),
        discoveryPresent: existingDiscovery !== undefined,
        discoveryExpired,
        allowDiscovery: true,
      },
    );

    if (
      shouldIgnorePathRequestUnparsed(stepped.actions) ||
      shouldIgnorePathRequestSeenTag(stepped.actions)
    ) {
      return;
    }

    if (
      shouldRememberPathRequestTagNow(
        stepRememberPathRequestTagWithActions(
          initialRememberPathRequestTagState(),
          {
            kind: "path-request/remember-tag-gate",
            tagKeyPresent: tagKey !== null,
          },
        ).actions,
      )
    ) {
      this.discoveryPrTags.add(tagKey!);
    }

    if (shouldAnswerPathRequestLocal(stepped.actions)) {
      if (
        !shouldAnswerLocalPathRequestNow(
          stepAnswerLocalPathRequestWithActions(
            initialAnswerLocalPathRequestState(),
            {
              kind: "path-request/answer-local-handler-gate",
              handlerPresent: localDestination?.answerPathRequest !== undefined,
            },
          ).actions,
        )
      ) {
        return;
      }
      await localDestination!.answerPathRequest!(iface);
      return;
    }

    if (shouldAnswerPathRequestPath(stepped.actions)) {
      if (
        !shouldAnswerPathWithEntryNow(
          stepAnswerPathWithEntryWithActions(
            initialAnswerPathWithEntryState(),
            {
              kind: "path-request/answer-path-entry-gate",
              pathPresent: path !== undefined,
            },
          ).actions,
        )
      ) {
        return;
      }
      await this.sendPathResponse(path!, iface);
      return;
    }

    if (
      shouldIgnorePathRequestIngress(stepped.actions) ||
      shouldIgnorePathRequestInFlightDiscovery(stepped.actions)
    ) {
      return;
    }

    if (!shouldStartPathRequestDiscovery(stepped.actions)) {
      return;
    }

    // start-discovery
    if (
      !shouldBeginPathDiscoveryNow(
        stepBeginPathDiscoveryWithActions(initialBeginPathDiscoveryState(), {
          kind: "path-request/begin-discovery-gate",
          parsedOk: parsed !== null,
          tagPresent: parsed !== null && parsed.tag !== null,
          destinationKeyPresent: destinationKey !== null,
        }).actions,
      )
    ) {
      return;
    }

    const discoveryKey = destinationKey!;
    const discoveryParsed = parsed!;
    if (
      shouldClearExpiredDiscoveryPathRequestNow(
        stepClearExpiredDiscoveryPathRequestWithActions(
          initialClearExpiredDiscoveryPathRequestState(),
          {
            kind: "path-request/clear-expired-discovery-gate",
            discoveryExpired,
          },
        ).actions,
      )
    ) {
      this.discoveryPathRequests.delete(discoveryKey);
    }

    this.discoveryPathRequests.set(discoveryKey, {
      timeout: nowSeconds + PATH_REQUEST_TIMEOUT_SECONDS,
      requestingInterface: iface,
    });

    for (const outbound of this.interfaces) {
      if (
        !shouldTransmitOnInterfaceNow(
          stepTransmitOnInterfaceWithActions(
            initialTransmitOnInterfaceState(),
            {
              kind: "transport/transmit-on-interface-gate",
              outgoing: outbound.outgoing,
              isExcludedInterface: outbound === iface,
            },
          ).actions,
        )
      ) {
        continue;
      }

      this.forwardPathRequest(
        discoveryParsed.destinationHash,
        discoveryParsed.tag!,
        outbound,
      );
    }
  }

  private shouldAcceptPacket(packet: Packet): boolean {
    return shouldAcceptTransportPacketNow(
      stepAcceptTransportPacketWithActions(
        initialAcceptTransportPacketState(),
        {
          kind: "transport/accept-packet-gate",
          filterPassed: this.packetFilter(packet),
          packetType: packet.packetType,
          transportType: packet.transportType,
          hasForeignTransportId:
            packet.transportId !== null &&
            !equalBytes(packet.transportId, this.transportIdentity.hash),
          alreadySeenHash: this.packetHashes.has(hashKey(packet.hash())),
        },
      ).actions,
    );
  }

  private shouldDeferPacketHash(packet: Packet): boolean {
    const stepped = stepPacketHashDeferWithActions(
      initialPacketHashDeferState(),
      {
        kind: "transport/packet-hash-defer-gate",
        packetType: packet.packetType,
        context: packet.context,
        destinationInLinkTable: this.linkTable.has(
          hashKey(packet.destinationHash),
        ),
      },
    );
    return shouldDeferPacketHashActions(stepped.actions);
  }

  private async relayTransportPacket(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<boolean> {
    const path = this.getPathEntry(packet.destinationHash);
    if (
      path === undefined ||
      !shouldAllowRelayTransportPacket(
        stepRelayTransportPacketAllowWithActions(
          initialRelayTransportPacketAllowState(),
          {
            kind: "transport/relay-transport-packet-allow-gate",
            transportIdPresent: packet.transportId !== null,
            isAnnounce: packet.packetType === PacketType.ANNOUNCE,
            transportIdMatchesLocal:
              packet.transportId !== null &&
              equalBytes(packet.transportId, this.transportIdentity.hash),
            hasPath: true,
          },
        ).actions,
      )
    ) {
      return false;
    }

    const relayed = relayTransportPacket(packet, path.hops, path.nextHop);
    const outboundInterface = path.receivedInterface;

    if (
      shouldRecordLinkRelayTableEntryNow(
        stepRecordLinkRelayTableEntryWithActions(
          initialRecordLinkRelayTableEntryState(),
          {
            kind: "transport/record-link-relay-table-entry-gate",
            packetType: packet.packetType,
          },
        ).actions,
      )
    ) {
      const linkId = Link.linkIdFromLrPacket(this.provider, packet);
      this.linkTable.set(hashKey(linkId), {
        timestamp: this.clock.now() / 1000,
        nextHop: path.nextHop,
        outboundInterface,
        remainingHops: path.hops,
        receivedInterface: iface,
        takenHops: packet.hops,
        destinationHash: packet.destinationHash,
      });
    } else if (
      shouldRecordReverseTableEntryNow(
        stepRecordReverseTableEntryWithActions(
          initialRecordReverseTableEntryState(),
          {
            kind: "transport/record-reverse-table-entry-gate",
            packetType: packet.packetType,
            context: packet.context,
          },
        ).actions,
      )
    ) {
      this.reverseTable.set(hashKey(packet.truncatedHash()), {
        receivedInterface: iface,
        outboundInterface,
        timestamp: this.clock.now() / 1000,
      });
    }

    await this.transmit(outboundInterface, relayed);
    this.touchPathEntry(packet.destinationHash);
    return true;
  }

  private async relayLinkPacket(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<boolean> {
    if (
      !shouldAllowRelayLinkPacket(
        stepRelayLinkPacketAllowWithActions(
          initialRelayLinkPacketAllowState(),
          {
            kind: "transport/relay-link-packet-allow-gate",
            packetType: packet.packetType,
          },
        ).actions,
      )
    ) {
      return false;
    }

    const entry = this.linkTable.get(hashKey(packet.destinationHash));
    if (
      !shouldHitLookupLinkRelayEntry(
        stepLookupLinkRelayEntryWithActions(
          initialLookupLinkRelayEntryState(),
          {
            kind: "transport/lookup-link-relay-entry-gate",
            entryPresent: entry !== undefined,
          },
        ).actions,
      )
    ) {
      return false;
    }

    const relayStepped = stepLinkRelayTargetWithActions(
      initialLinkRelayTargetState(),
      {
        kind: "transport/link-relay-gate",
        sameInterface: entry!.outboundInterface === entry!.receivedInterface,
        ifaceIsOutbound: iface === entry!.outboundInterface,
        ifaceIsReceived: iface === entry!.receivedInterface,
        packetHops: packet.hops,
        remainingHops: entry!.remainingHops,
        takenHops: entry!.takenHops,
      },
    );
    if (shouldIgnoreLinkRelayTarget(relayStepped.actions)) {
      return false;
    }
    const outboundInterface = shouldRelayLinkOutbound(relayStepped.actions)
      ? entry!.outboundInterface
      : shouldRelayLinkReceived(relayStepped.actions)
        ? entry!.receivedInterface
        : null;

    if (
      !shouldTransmitLinkRelayNow(
        stepTransmitLinkRelayWithActions(initialTransmitLinkRelayState(), {
          kind: "transport/transmit-link-relay-gate",
          outboundPresent: outboundInterface !== null,
        }).actions,
      )
    ) {
      return false;
    }

    const relayed = rewritePacketHops(packet.raw, packet.hops);
    await this.transmit(outboundInterface!, relayed);
    return true;
  }

  private async relayReversePacket(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<boolean> {
    const key = hashKey(packet.destinationHash);
    const entry = this.reverseTable.get(key);
    const nowSeconds = this.clock.now() / 1000;
    const entryExpired =
      entry !== undefined &&
      shouldTreatReverseEntryExpired(
        stepReverseEntryExpiredWithActions(initialReverseEntryExpiredState(), {
          kind: "transport/reverse-entry-expired-gate",
          timestamp: entry.timestamp,
          nowSeconds,
        }).actions,
      );
    const canRelay = shouldAllowRelayReversePacket(
      stepRelayReversePacketAllowWithActions(
        initialRelayReversePacketAllowState(),
        {
          kind: "transport/relay-reverse-packet-allow-gate",
          isProof: packet.packetType === PacketType.PROOF,
          hasEntry: entry !== undefined,
          entryExpired,
        },
      ).actions,
    );
    const stepped = stepReverseRelayOutcomeWithActions(
      initialReverseRelayOutcomeState(),
      {
        kind: "transport/reverse-relay-gate",
        canRelay,
        entryExpired,
        ifaceIsOutbound: shouldMatchRelayReverseOnInterface(
          stepRelayReverseOnInterfaceWithActions(
            initialRelayReverseOnInterfaceState(),
            {
              kind: "transport/relay-reverse-on-interface-gate",
              ifaceIsOutbound:
                entry !== undefined && iface === entry.outboundInterface,
            },
          ).actions,
        ),
      },
    );

    if (shouldDeleteExpiredReverseEntryActions(stepped.actions)) {
      this.reverseTable.delete(key);
      return false;
    }
    if (
      !shouldTransmitReverseRelayNow(
        stepTransmitReverseRelayWithActions(
          initialTransmitReverseRelayState(),
          {
            kind: "transport/transmit-reverse-relay-gate",
            relayOk: shouldRelayReversePacketActions(stepped.actions),
            entryPresent: entry !== undefined,
          },
        ).actions,
      )
    ) {
      return false;
    }

    const relayed = rewritePacketHops(packet.raw, packet.hops);
    await this.transmit(entry!.receivedInterface, relayed);
    return true;
  }

  private async rebroadcastAnnounce(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const gates = stepAnnounceIngressGatesWithActions(
      initialAnnounceIngressGatesState(),
      {
        kind: "announce/ingress-gates",
        context: packet.context,
      },
    );
    if (!shouldRebroadcastAnnounce(gates.actions)) {
      return;
    }

    const rebroadcast = buildTransportAnnounce(
      this.provider,
      packet,
      this.transportIdentity,
      packet.hops,
    );
    for (const outbound of this.interfaces) {
      if (
        !shouldTransmitOnInterfaceNow(
          stepTransmitOnInterfaceWithActions(
            initialTransmitOnInterfaceState(),
            {
              kind: "transport/transmit-on-interface-gate",
              outgoing: outbound.outgoing,
              isExcludedInterface: outbound === iface,
            },
          ).actions,
        )
      ) {
        continue;
      }

      try {
        await this.transmit(outbound, rebroadcast.raw);
        this.packetHashes.add(hashKey(rebroadcast.hash()));
      } catch {
        // A transient failure on one interface must not stop announce fan-out.
      }
    }
  }

  private async fulfillDiscoveryPathRequest(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const destinationKey = hashKey(packet.destinationHash);
    const pending = this.discoveryPathRequests.get(destinationKey);
    const nowSeconds = this.clock.now() / 1000;
    const stepped = stepDiscoveryPathRequestFulfillWithActions(
      initialDiscoveryPathRequestFulfillState(),
      {
        kind: "path-request/discovery-fulfill-gate",
        hasPending: pending !== undefined,
        expired:
          pending !== undefined &&
          shouldTreatDiscoveryPathRequestExpired(
            stepDiscoveryPathRequestExpiredWithActions(
              initialDiscoveryPathRequestExpiredState(),
              {
                kind: "path-request/discovery-expired-gate",
                timeoutAt: pending.timeout,
                nowSeconds,
              },
            ).actions,
          ),
      },
    );

    if (shouldIgnoreDiscoveryPathFulfillActions(stepped.actions)) {
      return;
    }

    this.discoveryPathRequests.delete(destinationKey);
    if (
      !shouldFulfillDiscoveryPendingNow(
        stepFulfillDiscoveryPendingWithActions(
          initialFulfillDiscoveryPendingState(),
          {
            kind: "path-request/fulfill-pending-gate",
            fulfillOk: shouldFulfillDiscoveryPathRequest(stepped.actions),
            pendingPresent: pending !== undefined,
          },
        ).actions,
      )
    ) {
      return;
    }

    const response = buildPathResponseAnnounce(
      this.provider,
      packet,
      this.transportIdentity,
      packet.hops,
    );
    await this.transmit(pending!.requestingInterface, response.raw);
  }

  private forwardPathRequest(
    destinationHash: Uint8Array,
    tag: Uint8Array,
    iface: PacketInterface,
  ): void {
    const requestData = buildPathRequestData(
      destinationHash,
      this.transportIdentity.hash,
      tag,
    );
    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.PLAIN,
      packetType: PacketType.DATA,
      destinationHash: this.pathRequestHash,
      context: PacketContext.NONE,
      data: requestData,
    });

    void this.transmit(iface, packet.raw);
  }

  private touchPathEntry(destinationHash: Uint8Array): void {
    const key = hashKey(destinationHash);
    const existing = this.pathTable.get(key);
    if (
      !shouldTouchPathEntryNow(
        stepTouchPathEntryWithActions(initialTouchPathEntryState(), {
          kind: "path/touch-entry-gate",
          pathPresent: existing !== undefined,
        }).actions,
      )
    ) {
      return;
    }

    const updated: PathEntry = {
      ...existing!,
      timestamp: this.clock.now() / 1000,
    };
    this.pathTable.set(key, updated);
  }
}
