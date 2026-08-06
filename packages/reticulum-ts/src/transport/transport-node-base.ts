import {
  initialTouchPathEntryState,
  shouldTouchPathEntryNow,
  stepTouchPathEntryWithActions,
} from "./protocol.js";

import { DestinationType } from "../destination.js";
import type { PacketInterface } from "../interfaces/interface.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
} from "../packet.js";
import { LeafTransport, hashKey, type PathEntry } from "./node.js";
import { buildPathRequestData } from "./path.js";
import { AnnounceRateLimiter } from "./rate.js";
import type {
  DiscoveryPathRequest,
  LinkTableEntry,
  ReverseTableEntry,
  TransportNodeOptions,
} from "./transport-types.js";

/** Shared transport-node tables and path-request forwarding helpers. */
export class TransportNodeBase extends LeafTransport {
  protected readonly linkTable = new Map<string, LinkTableEntry>();
  protected readonly reverseTable = new Map<string, ReverseTableEntry>();
  protected readonly announceRateLimiter: AnnounceRateLimiter;
  protected readonly discoveryPathRequests = new Map<
    string,
    DiscoveryPathRequest
  >();

  constructor(options: TransportNodeOptions) {
    super(options);
    this.announceRateLimiter =
      options.announceRateLimiter ?? new AnnounceRateLimiter();
  }

  protected forwardPathRequest(
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

  protected touchPathEntry(destinationHash: Uint8Array): void {
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
