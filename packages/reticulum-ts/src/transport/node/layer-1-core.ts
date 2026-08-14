import {
  initialDispatchLocalLinkRequestState,
  initialIndexOfMatchingLinkIdState,
  initialLinkDataIngressTargetState,
  initialPacketFilterState,
  initialPathEntryExpiredState,
  initialPathEntryLookupState,
  matchingLinkIdIndexFromActions,
  shouldAcceptPacketFilter,
  shouldDispatchLocalLinkRequestNow,
  shouldExpirePathEntryLookup,
  shouldHitPathEntryLookup,
  shouldIngressLinkDataActive,
  shouldIngressLinkDataPending,
  shouldMissPathEntryLookup,
  shouldTreatPathEntryExpired,
  shouldUseMatchingLinkIdIndex,
  stepDispatchLocalLinkRequestWithActions,
  stepIndexOfMatchingLinkIdWithActions,
  stepLinkDataIngressTargetWithActions,
  stepPacketFilterWithActions,
  stepPathEntryExpiredWithActions,
  stepPathEntryLookupWithActions,
} from "./protocol.js";

import type { CryptoProvider } from "../../crypto/provider.js";
import { equalBytes } from "../../crypto/bytes.js";
import { Identity } from "../../identity.js";
import type { PacketInterface } from "../../interfaces/interface.js";
import type { Link } from "../../link.js";
import { PacketReceipt } from "../../packet-receipt.js";
import { Packet } from "../../packet.js";
import type { Clock, Entropy } from "../../runtime/runtime.js";
import { BandwidthLimiter, type ByteRateLimiter } from "../bandwidth.js";
import { pathRequestDestinationHash } from "../path.js";
import { hashKey } from "./shared.js";
import type {
  AnnounceHandler,
  DropObserver,
  LeafTransportOptions,
  LocalDestination,
  PathEntry,
} from "./shared.js";
import { notifyDropObservers } from "../drop-notify.js";
/** Core leaf-transport ingress and membership helpers. */
export class LeafTransportLayer1Core {
  protected readonly pathTable = new Map<string, PathEntry>();
  protected readonly packetHashes = new Set<string>();
  protected readonly receipts: PacketReceipt[] = [];
  protected readonly destinations: LocalDestination[] = [];
  protected readonly announceHandlers: AnnounceHandler[] = [];
  protected readonly dropObservers: DropObserver[] = [];
  protected readonly interfaces: PacketInterface[] = [];
  protected readonly interfaceTasks = new Map<PacketInterface, Promise<void>>();
  protected readonly pendingLinks: Link[] = [];
  protected readonly activeLinks: Link[] = [];
  protected readonly useImplicitProof: boolean;
  transportEnabled: boolean;
  protected readonly pathRequestHash: Uint8Array;
  protected readonly pathRequests = new Map<string, number>();
  protected readonly discoveryPrTags = new Set<string>();
  protected bytesIn = 0;
  protected bytesOut = 0;
  protected readonly inboundBandwidth: ByteRateLimiter | null;
  protected readonly outboundBandwidth: ByteRateLimiter | null;

  constructor(protected readonly options: LeafTransportOptions) {
    this.useImplicitProof = options.useImplicitProof ?? true;
    this.transportEnabled = options.transportEnabled ?? false;
    this.pathRequestHash = pathRequestDestinationHash(options.provider);
    this.inboundBandwidth =
      options.inboundBandwidthLimiter ??
      (options.bandwidthBytesPerSecond === undefined
        ? null
        : new BandwidthLimiter(options.clock, options.bandwidthBytesPerSecond));
    this.outboundBandwidth =
      options.outboundBandwidthLimiter ??
      (options.bandwidthBytesPerSecond === undefined
        ? null
        : new BandwidthLimiter(options.clock, options.bandwidthBytesPerSecond));
  }

  protected emitDrop(drop: Parameters<typeof notifyDropObservers>[1]): void {
    notifyDropObservers(this.dropObservers, drop);
  }

  get clock(): Clock {
    return this.options.clock;
  }

  get entropy(): Entropy {
    return this.options.entropy;
  }

  get transportIdentity(): Identity {
    return this.options.transportIdentity;
  }

  get provider(): CryptoProvider {
    return this.options.provider;
  }

  getPathEntry(destinationHash: Uint8Array): PathEntry | undefined {
    const key = hashKey(destinationHash);
    const entry = this.pathTable.get(key);
    const stepped = stepPathEntryLookupWithActions(
      initialPathEntryLookupState(),
      {
        kind: "path/entry-lookup-gate",
        entryPresent: entry !== undefined,
        expired:
          entry !== undefined &&
          shouldTreatPathEntryExpired(
            stepPathEntryExpiredWithActions(initialPathEntryExpiredState(), {
              kind: "path/entry-expired-gate",
              expires: entry.expires,
              nowSeconds: this.clock.now() / 1000,
            }).actions,
          ),
      },
    );
    if (shouldMissPathEntryLookup(stepped.actions)) {
      return undefined;
    }
    if (shouldExpirePathEntryLookup(stepped.actions)) {
      this.pathTable.delete(key);
      return undefined;
    }
    if (!shouldHitPathEntryLookup(stepped.actions)) {
      return undefined;
    }
    return entry;
  }

  async transmit(iface: PacketInterface, raw: Uint8Array): Promise<void> {
    const packet = Packet.decode(this.options.provider, raw);
    if (packet === null) {
      throw new Error("Cannot transmit invalid packet bytes");
    }

    await this.outboundBandwidth?.consume(raw.length);
    this.bytesOut += raw.length;
    await iface.send(packet);
  }

  protected handleLinkRequest(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    for (const destination of this.destinations) {
      const stepped = stepDispatchLocalLinkRequestWithActions(
        initialDispatchLocalLinkRequestState(),
        {
          kind: "transport/dispatch-local-link-request-gate",
          hashMatches: equalBytes(destination.hash, packet.destinationHash),
          typeMatches: destination.type === packet.destinationType,
          handlerPresent: destination.handleLinkRequest !== undefined,
        },
      );
      if (shouldDispatchLocalLinkRequestNow(stepped.actions)) {
        destination.handleLinkRequest!(packet, iface);
        return Promise.resolve();
      }
    }
    return Promise.resolve();
  }

  protected async handleLinkData(
    packet: Packet,
    iface: PacketInterface,
  ): Promise<void> {
    /** Adapt matching-link-id indexes via protocol actions (no ad-hoc
     * `indexOfMatchingLinkId` reads). */
    const activeIndex = this.indexOfMatchingLink(
      this.activeLinks,
      packet.destinationHash,
    );
    const pendingIndex = this.indexOfMatchingLink(
      this.pendingLinks,
      packet.destinationHash,
    );
    const stepped = stepLinkDataIngressTargetWithActions(
      initialLinkDataIngressTargetState(),
      {
        kind: "transport/link-data-ingress-gate",
        activeIndex,
        pendingIndex,
      },
    );
    if (shouldIngressLinkDataActive(stepped.actions)) {
      await this.activeLinks[activeIndex!]!.receive(packet, iface);
      return;
    }
    if (shouldIngressLinkDataPending(stepped.actions)) {
      await this.pendingLinks[pendingIndex!]!.receive(packet, iface);
      return;
    }
  }

  /** Adapt matching-link-id index via protocol actions (no ad-hoc
   * `indexOfMatchingLinkId` reads). */
  protected indexOfMatchingLink(
    links: readonly Link[],
    target: Uint8Array,
  ): number | null {
    const stepped = stepIndexOfMatchingLinkIdWithActions(
      initialIndexOfMatchingLinkIdState(),
      {
        kind: "transport/matching-link-id-index-gate",
        linkIds: links.map((link) => link.linkId),
        target,
      },
    );
    return shouldUseMatchingLinkIdIndex(stepped.actions)
      ? matchingLinkIdIndexFromActions(stepped.actions)
      : null;
  }

  protected packetFilter(packet: Packet): boolean {
    const stepped = stepPacketFilterWithActions(initialPacketFilterState(), {
      kind: "transport/packet-filter-gate",
      transportId: packet.transportId,
      localTransportHash: this.options.transportIdentity.hash,
      packetType: packet.packetType,
      destinationType: packet.destinationType,
      alreadySeenHash: this.packetHashes.has(hashKey(packet.hash())),
    });
    return shouldAcceptPacketFilter(stepped.actions);
  }
}
