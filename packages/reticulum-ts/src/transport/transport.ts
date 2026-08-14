import {
  initialAcceptTransportPacketState,
  initialAnnounceIngressGatesState,
  initialLinkRelayTargetState,
  initialLookupLinkRelayEntryState,
  initialPacketHashDeferState,
  initialPacketHashRememberState,
  initialRecordLinkRelayTableEntryState,
  initialRecordReverseTableEntryState,
  initialRelayLinkPacketAllowState,
  initialRelayReverseOnInterfaceState,
  initialRelayReversePacketAllowState,
  initialRelayTransportPacketAllowState,
  initialReverseEntryExpiredState,
  initialReverseRelayOutcomeState,
  initialTransmitLinkRelayState,
  initialTransmitOnInterfaceState,
  initialTransmitReverseRelayState,
  initialTransportIngressDispatchState,
  PROTOCOL_LOCAL_REBROADCASTS_MAX,
  observeDropFromAnnounceRateLimitActions,
  PROTOCOL_REVERSE_TIMEOUT_SECONDS,
  shouldAcceptTransportPacketNow,
  shouldAllowRelayLinkPacket,
  shouldAllowRelayReversePacket,
  shouldAllowRelayTransportPacket,
  shouldDeferPacketHashActions,
  shouldDeleteExpiredReverseEntryActions,
  shouldDispatchTransportAnnounce,
  shouldDispatchTransportLinkData,
  shouldDispatchTransportLinkRequest,
  shouldDispatchTransportPlainData,
  shouldDispatchTransportProof,
  shouldHitLookupLinkRelayEntry,
  shouldIgnoreLinkRelayTarget,
  shouldIgnoreTransportIngressDispatch,
  shouldMatchRelayReverseOnInterface,
  shouldRebroadcastAnnounce,
  shouldRecordAnnounceRate,
  shouldRecordLinkRelayTableEntryNow,
  shouldRecordReverseTableEntryNow,
  shouldRelayLinkOutbound,
  shouldRelayLinkReceived,
  shouldRelayReversePacketActions,
  shouldRememberPacketHashAfterRelayActions,
  shouldRememberPacketHashNowActions,
  shouldTransmitLinkRelayNow,
  shouldTransmitOnInterfaceNow,
  shouldTransmitReverseRelayNow,
  shouldTreatReverseEntryExpired,
  stepAcceptTransportPacketWithActions,
  stepAnnounceIngressGatesWithActions,
  stepLinkRelayTargetWithActions,
  stepLookupLinkRelayEntryWithActions,
  stepPacketHashDeferWithActions,
  stepPacketHashRememberWithActions,
  stepRecordLinkRelayTableEntryWithActions,
  stepRecordReverseTableEntryWithActions,
  stepRelayLinkPacketAllowWithActions,
  stepRelayReverseOnInterfaceWithActions,
  stepRelayReversePacketAllowWithActions,
  stepRelayTransportPacketAllowWithActions,
  stepReverseEntryExpiredWithActions,
  stepReverseRelayOutcomeWithActions,
  stepTransmitLinkRelayWithActions,
  stepTransmitOnInterfaceWithActions,
  stepTransmitReverseRelayWithActions,
  stepTransportIngressDispatchWithActions,
} from "./protocol.js";

import { equalBytes } from "../crypto/bytes.js";
import type { PacketInterface } from "../interfaces/interface.js";
import { Link } from "../link.js";
import { Packet, PacketType } from "../packet.js";
import {
  buildTransportAnnounce,
  cloneWithHops,
  hashKey,
  relayTransportPacket,
  rewritePacketHops,
} from "./node.js";
import { dropFromIngressIgnore } from "./drop-notify.js";
import { TransportNodePath } from "./transport-node-path.js";

/** Mirrors RNS/Transport.py transport-node constants. */
export const LOCAL_REBROADCASTS_MAX = PROTOCOL_LOCAL_REBROADCASTS_MAX;
export const REVERSE_TIMEOUT_SECONDS = PROTOCOL_REVERSE_TIMEOUT_SECONDS;
export { PATH_REQUEST_MIN_INTERVAL } from "./path.js";
export type {
  DiscoveryPathRequest,
  LinkTableEntry,
  ReverseTableEntry,
  TransportNodeOptions,
} from "./transport-types.js";

import type {
  DiscoveryPathRequest,
  LinkTableEntry,
  ReverseTableEntry,
  TransportNodeOptions,
} from "./transport-types.js";

/** Transport-node mode: rebroadcast, relay, and path forwarding. Mirrors RNS/Transport.py transport subset. */
export class TransportNode extends TransportNodePath {
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
    this.rememberPacketHashIf(
      shouldRememberPacketHashNowActions(rememberStepped.actions),
      workingPacket,
    );

    if (
      await this.tryRelayInbound(workingPacket, iface, rememberStepped.actions)
    ) {
      return;
    }

    await this.dispatchTransportIngress(workingPacket, iface);
  }

  private rememberPacketHashIf(shouldRemember: boolean, packet: Packet): void {
    if (shouldRemember) {
      this.packetHashes.add(hashKey(packet.hash()));
    }
  }

  private async tryRelayInbound(
    workingPacket: Packet,
    iface: PacketInterface,
    rememberActions: ReturnType<
      typeof stepPacketHashRememberWithActions
    >["actions"],
  ): Promise<boolean> {
    if (await this.relayTransportPacket(workingPacket, iface)) {
      this.rememberPacketHashIf(
        shouldRememberPacketHashAfterRelayActions(rememberActions),
        workingPacket,
      );
      return true;
    }
    if (await this.relayLinkPacket(workingPacket, iface)) {
      this.rememberPacketHashIf(
        shouldRememberPacketHashAfterRelayActions(rememberActions),
        workingPacket,
      );
      return true;
    }
    if (await this.relayReversePacket(workingPacket, iface)) {
      return true;
    }
    this.rememberPacketHashIf(
      shouldRememberPacketHashAfterRelayActions(rememberActions),
      workingPacket,
    );
    return false;
  }

  private async dispatchTransportIngress(
    workingPacket: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    const dispatchStepped = stepTransportIngressDispatchWithActions(
      initialTransportIngressDispatchState(),
      {
        kind: "transport/ingress-dispatch-gate",
        packetType: workingPacket.packetType,
        destinationType: workingPacket.destinationType,
      },
    );
    const actions = dispatchStepped.actions;
    if (shouldDispatchTransportAnnounce(actions)) {
      await this.handleAnnounce(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkRequest(actions)) {
      await this.handleLinkRequest(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportLinkData(actions)) {
      await this.handleLinkData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportPlainData(actions)) {
      await this.handleData(workingPacket, iface);
      return;
    }
    if (shouldDispatchTransportProof(actions)) {
      await this.handleProof(workingPacket, iface);
      return;
    }
    if (shouldIgnoreTransportIngressDispatch(actions)) {
      this.emitDrop(dropFromIngressIgnore(actions, iface.name));
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
}
