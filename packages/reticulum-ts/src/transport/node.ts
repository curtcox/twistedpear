import {
  DestinationProofStrategyCode,
  PATHFINDER_EXPIRY_SECONDS,
  PATHFINDER_MAX_HOPS,
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_TIMEOUT_SECONDS,
  announceEmittedFromRandomBlob as protocolAnnounceEmittedFromRandomBlob,
  computePathExpiry,
  isPathEntryExpired,
  planClonePacketWithHops,
  planDestinationProof,
  planPathOutbound,
  planPacketFilter,
  planPathResponseAnnounceFields,
  planTransportAnnounceFields,
  relayTransportPacketBytes,
  shouldAddPathEntry,
  shouldAnswerPathRequest,
  shouldEmitPathRequest,
  stripTransportHeadersBytes,
  timebaseFromRandomBlobs as protocolTimebaseFromRandomBlobs,
  wrapTransportPacketBytes,
  type PacketHeaderFields
} from "@twistedpear/protocol";
import type { CryptoProvider } from "../crypto/provider.js";
import { Announce, type ParsedAnnounce } from "../announce.js";
import { bytesToHex, equalBytes } from "../crypto/bytes.js";
import { Destination, DestinationDirection, DestinationType, type DestinationTypeValue, type DestinationDirectionValue } from "../destination.js";
import { Identity, TRUNCATED_HASH_LENGTH } from "../identity.js";
import type { PacketInterface } from "../interfaces/interface.js";
import type { Link } from "../link.js";
import { PacketReceipt, PacketReceiptStatus } from "../packet-receipt.js";
import {
  Packet,
  PacketContext,
  PacketHeaderType,
  PacketType,
  TransportType,
  type PacketFields
} from "../packet.js";
import type { Clock, Entropy } from "../runtime/runtime.js";
import {
  buildPathRequestData,
  parsePathRequestData,
  pathRequestDestinationHash,
  pathRequestTagKey
} from "./path.js";

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

export interface LeafTransportOptions {
  readonly provider: CryptoProvider;
  readonly transportIdentity: Identity;
  readonly clock: Clock;
  readonly entropy: Entropy;
  readonly useImplicitProof?: boolean;
  readonly transportEnabled?: boolean;
}

/** Leaf-mode transport: path table, announce ingestion, and packet routing. Mirrors RNS/Transport.py subset. */
export class LeafTransport {
  protected readonly pathTable = new Map<string, PathEntry>();
  protected readonly packetHashes = new Set<string>();
  protected readonly receipts: PacketReceipt[] = [];
  protected readonly destinations: LocalDestination[] = [];
  protected readonly announceHandlers: AnnounceHandler[] = [];
  protected readonly interfaces: PacketInterface[] = [];
  private readonly interfaceTasks = new Map<PacketInterface, Promise<void>>();
  protected readonly pendingLinks: Link[] = [];
  protected readonly activeLinks: Link[] = [];
  protected readonly useImplicitProof: boolean;
  protected readonly transportEnabled: boolean;
  protected readonly pathRequestHash: Uint8Array;
  protected readonly pathRequests = new Map<string, number>();
  protected readonly discoveryPrTags = new Set<string>();
  private bytesIn = 0;
  private bytesOut = 0;

  constructor(protected readonly options: LeafTransportOptions) {
    this.useImplicitProof = options.useImplicitProof ?? true;
    this.transportEnabled = options.transportEnabled ?? false;
    this.pathRequestHash = pathRequestDestinationHash(options.provider);
  }

  get clock(): Clock {
    return this.options.clock;
  }

  get entropy(): Entropy {
    return this.options.entropy;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.clock.setTimeout(() => resolve(), ms);
    });
  }

  get transportIdentity(): Identity {
    return this.options.transportIdentity;
  }

  get provider(): CryptoProvider {
    return this.options.provider;
  }

  registerInterface(iface: PacketInterface): void {
    if (this.interfaces.includes(iface)) {
      return;
    }

    this.interfaces.push(iface);
    this.interfaceTasks.set(
      iface,
      (async () => {
        try {
          for await (const packet of iface.packets) {
            this.bytesIn += packet.raw.length;
            await this.inbound(packet, iface);
          }
        } catch {
          // Interface consumer exited; detach quietly.
        }
      })()
    );
  }

  unregisterInterface(iface: PacketInterface): void {
    const index = this.interfaces.indexOf(iface);
    if (index >= 0) {
      this.interfaces.splice(index, 1);
    }
    this.interfaceTasks.delete(iface);
  }

  listInterfaces(): ReadonlyArray<PacketInterface> {
    return [...this.interfaces];
  }

  registerDestination(destination: LocalDestination): void {
    if (!this.destinations.includes(destination)) {
      this.destinations.push(destination);
    }
  }

  findLocalDestination(destinationHash: Uint8Array): LocalDestination | undefined {
    return this.destinations.find((destination) => equalBytes(destination.hash, destinationHash));
  }

  registerAnnounceHandler(handler: AnnounceHandler): void {
    if (!this.announceHandlers.includes(handler)) {
      this.announceHandlers.push(handler);
    }
  }

  hasPath(destinationHash: Uint8Array): boolean {
    return this.getPathEntry(destinationHash) !== undefined;
  }

  hopsTo(destinationHash: Uint8Array): number | null {
    return this.getPathEntry(destinationHash)?.hops ?? null;
  }

  nextHopInterfaceMtu(destinationHash: Uint8Array): number | null {
    return this.getPathEntry(destinationHash)?.receivedInterface.mtu ?? null;
  }

  getPathEntry(destinationHash: Uint8Array): PathEntry | undefined {
    const key = hashKey(destinationHash);
    const entry = this.pathTable.get(key);
    if (entry === undefined) {
      return undefined;
    }
    if (isPathEntryExpired({ expires: entry.expires, nowSeconds: this.clock.now() / 1000 })) {
      this.pathTable.delete(key);
      return undefined;
    }
    return entry;
  }

  get pathTableCount(): number {
    return this.pathTable.size;
  }

  get activeLinkCount(): number {
    return this.activeLinks.length;
  }

  get bandwidthBytesIn(): number {
    return this.bytesIn;
  }

  get bandwidthBytesOut(): number {
    return this.bytesOut;
  }

  requestPath(destinationHash: Uint8Array, onInterface: PacketInterface | null = null): void {
    const key = hashKey(destinationHash);
    const now = this.clock.now() / 1000;
    const lastRequest = this.pathRequests.get(key) ?? 0;
    if (!shouldEmitPathRequest({ lastRequestAt: lastRequest, nowSeconds: now })) {
      return;
    }

    const tag = Identity.getRandomHash(this.provider, this.entropy).subarray(0, TRUNCATED_HASH_BYTES);
    const requestData = buildPathRequestData(
      destinationHash,
      this.transportEnabled ? this.transportIdentity.hash : null,
      tag
    );

    const packet = Packet.fromFields(this.provider, {
      headerType: PacketHeaderType.HEADER_1,
      transportType: TransportType.BROADCAST,
      destinationType: DestinationType.PLAIN,
      packetType: PacketType.DATA,
      destinationHash: this.pathRequestHash,
      context: PacketContext.NONE,
      data: requestData
    });

    void this.sendPacket(packet, { attachedInterface: onInterface });
    this.pathRequests.set(key, now);
  }

  async awaitPath(
    destinationHash: Uint8Array,
    timeoutSeconds = PATH_REQUEST_TIMEOUT_SECONDS
  ): Promise<boolean> {
    if (this.hasPath(destinationHash)) {
      return true;
    }

    this.requestPath(destinationHash);
    const deadline = this.clock.now() + timeoutSeconds * 1000;
    while (this.clock.now() < deadline) {
      if (this.hasPath(destinationHash)) {
        return true;
      }

      await this.delay(50);
    }

    return this.hasPath(destinationHash);
  }

  registerLink(link: Link): void {
    if (link.initiator) {
      if (!this.pendingLinks.includes(link)) {
        this.pendingLinks.push(link);
      }
      return;
    }

    if (!this.activeLinks.includes(link)) {
      this.activeLinks.push(link);
    }
  }

  activateLink(link: Link): void {
    const index = this.pendingLinks.indexOf(link);
    if (index >= 0) {
      this.pendingLinks.splice(index, 1);
    }

    if (!this.activeLinks.includes(link)) {
      this.activeLinks.push(link);
    }
  }

  unregisterLink(link: Link): void {
    const pendingIndex = this.pendingLinks.indexOf(link);
    if (pendingIndex >= 0) {
      this.pendingLinks.splice(pendingIndex, 1);
    }

    const activeIndex = this.activeLinks.indexOf(link);
    if (activeIndex >= 0) {
      this.activeLinks.splice(activeIndex, 1);
    }
  }

  async transmit(iface: PacketInterface, raw: Uint8Array): Promise<void> {
    this.bytesOut += raw.length;
    const packet = Packet.decode(this.options.provider, raw);
    if (packet === null) {
      throw new Error("Cannot transmit invalid packet bytes");
    }

    await iface.send(packet);
  }

  async sendPacket(
    packet: Packet,
    options: { createReceipt?: boolean; attachedInterface?: PacketInterface | null } = {}
  ): Promise<PacketReceipt | null> {
    let receipt: PacketReceipt | null = null;

    if (options.createReceipt === true) {
      const nowSeconds = () => this.clock.now() / 1000;
      receipt = new PacketReceipt(packet.hash(), packet.truncatedHash(), packet.destinationHash, {
        sentAt: nowSeconds(),
        now: nowSeconds
      });
      this.receipts.push(receipt);
    }

    const sent = await this.outbound(packet, options.attachedInterface ?? null);
    if (!sent) {
      if (receipt !== null) {
        receipt.status = PacketReceiptStatus.FAILED;
        const index = this.receipts.indexOf(receipt);
        if (index >= 0) {
          this.receipts.splice(index, 1);
        }
      }
      return null;
    }

    return receipt;
  }

  protected async inbound(packet: Packet, iface: PacketInterface): Promise<void> {
    const workingPacket = cloneWithHops(this.options.provider, packet, packet.hops + 1);

    if (!this.packetFilter(workingPacket)) {
      return;
    }

    this.packetHashes.add(hashKey(workingPacket.hash()));

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

  protected async handleLinkRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    for (const destination of this.destinations) {
      if (
        equalBytes(destination.hash, packet.destinationHash) &&
        destination.type === packet.destinationType &&
        destination.handleLinkRequest !== undefined
      ) {
        destination.handleLinkRequest(packet, iface);
        return;
      }
    }
  }

  protected async handleLinkData(packet: Packet, iface: PacketInterface): Promise<void> {
    for (const link of this.activeLinks) {
      if (equalBytes(link.linkId, packet.destinationHash)) {
        await link.receive(packet, iface);
        return;
      }
    }

    for (const link of this.pendingLinks) {
      if (equalBytes(link.linkId, packet.destinationHash)) {
        await link.receive(packet, iface);
        return;
      }
    }
  }

  protected async handleAnnounce(packet: Packet, iface: PacketInterface): Promise<void> {
    if (!Announce.validate(this.options.provider, packet)) {
      return;
    }

    const parsed = Announce.parse(packet);
    if (parsed === null) {
      return;
    }

    const localDestination = this.destinations.find(
      (entry) =>
        equalBytes(entry.hash, packet.destinationHash) && entry.direction === DestinationDirection.IN
    );
    if (localDestination !== undefined) {
      return;
    }

    const receivedFrom = packet.transportId ?? packet.destinationHash;
    const randomBlob = parsed.randomHash;
    const existing = this.pathTable.get(hashKey(packet.destinationHash));
    const now = this.clock.now() / 1000;
    const shouldAdd = shouldAddPathEntry({
      hops: packet.hops,
      randomBlob,
      nowSeconds: now,
      existing:
        existing === undefined
          ? null
          : {
              hops: existing.hops,
              expires: existing.expires,
              randomBlobs: existing.randomBlobs
            }
    });

    if (!shouldAdd) {
      return;
    }

    const randomBlobs = [...(existing?.randomBlobs ?? [])];
    if (!randomBlobs.some((blob) => equalBytes(blob, randomBlob))) {
      randomBlobs.push(randomBlob);
    }

    const entry: PathEntry = {
      timestamp: now,
      nextHop: Uint8Array.from(receivedFrom),
      hops: packet.hops,
      expires: computePathExpiry(now),
      randomBlobs,
      receivedInterface: iface,
      packetHash: packet.hash(),
      announceRaw: Uint8Array.from(packet.raw)
    };
    this.pathTable.set(hashKey(packet.destinationHash), entry);

    Identity.rememberDestination(
      packet.destinationHash,
      receivedFrom,
      parsed.publicKey,
      parsed.appData,
      now
    );

    const announcedIdentity = Identity.recall(this.options.provider, packet.destinationHash);
    if (announcedIdentity === null) {
      return;
    }

    for (const handler of this.announceHandlers) {
      if (packet.context === PacketContext.PATH_RESPONSE && handler.receivePathResponses !== true) {
        continue;
      }

      if (handler.aspectFilter != null) {
        const parts = handler.aspectFilter.split(".").filter((part) => part.length > 0);
        const appName = parts[0];
        const aspects = parts.slice(1);
        if (appName === undefined) {
          continue;
        }

        const expected = Destination.hash(this.options.provider, announcedIdentity, appName, ...aspects);
        if (!equalBytes(packet.destinationHash, expected)) {
          continue;
        }
      }

      handler.receivedAnnounce({
        destinationHash: packet.destinationHash,
        announcedIdentity,
        appData: parsed.appData,
        announce: parsed,
        packet
      });
    }
  }

  protected async handleData(packet: Packet, iface: PacketInterface): Promise<void> {
    if (
      packet.destinationType === DestinationType.PLAIN &&
      equalBytes(packet.destinationHash, this.pathRequestHash)
    ) {
      await this.handlePathRequest(packet, iface);
      return;
    }

    const destination = this.destinations.find(
      (entry) => equalBytes(entry.hash, packet.destinationHash) && entry.type === packet.destinationType
    );
    if (destination === undefined) {
      return;
    }

    const plaintext = destination.decrypt(packet.data);
    if (plaintext === null) {
      return;
    }

    destination.dispatchPacket(plaintext, packet);

    if (
      planDestinationProof({
        strategy: destination.proofStrategy,
        appWantsProof: destination.shouldProve(packet)
      })
    ) {
      await this.sendProof(destination, packet, iface);
    }
  }

  protected async handleProof(packet: Packet, iface: PacketInterface): Promise<void> {
    if (packet.context === PacketContext.LRPROOF) {
      for (const link of this.pendingLinks) {
        if (equalBytes(link.linkId, packet.destinationHash) && link.hopsMatch(packet)) {
          await link.validateProof(packet, iface);
          return;
        }
      }
      return;
    }

    if (packet.context === PacketContext.RESOURCE_PRF) {
      for (const link of this.activeLinks) {
        if (equalBytes(link.linkId, packet.destinationHash)) {
          await link.handleResourceProof(packet);
          return;
        }
      }
      return;
    }

    for (const receipt of [...this.receipts]) {
      if (!equalBytes(packet.destinationHash, receipt.truncatedHash)) {
        continue;
      }

      const identity = Identity.recall(this.options.provider, receipt.targetDestinationHash);
      if (identity === null) {
        continue;
      }

      if (receipt.validateProofPacket(packet, identity)) {
        const index = this.receipts.indexOf(receipt);
        if (index >= 0) {
          this.receipts.splice(index, 1);
        }
      }
    }
  }

  protected async sendProof(destination: LocalDestination, packet: Packet, iface: PacketInterface): Promise<void> {
    if (destination.identity === null) {
      return;
    }

    const packetHash = packet.hash();
    await destination.identity.prove(
      packetHash,
      packet.proofDestinationHash(),
      async (proofDestinationHash: Uint8Array, proofData: Uint8Array) => {
        const proofPacket = Packet.fromFields(this.options.provider, {
          headerType: PacketHeaderType.HEADER_1,
          transportType: TransportType.BROADCAST,
          destinationType: DestinationType.SINGLE,
          packetType: PacketType.PROOF,
          destinationHash: proofDestinationHash,
          data: proofData
        });
        await this.outbound(proofPacket, iface);
      },
      this.useImplicitProof
    );
  }

  protected async outbound(packet: Packet, attachedInterface: PacketInterface | null): Promise<boolean> {
    const path = this.getPathEntry(packet.destinationHash);
    const kind = planPathOutbound({
      packetType: packet.packetType,
      destinationType: packet.destinationType,
      headerType: packet.headerType,
      hasPath: path !== undefined,
      pathHops: path?.hops ?? 0
    });

    if (kind === "wrap" && path !== undefined) {
      const wrapped = wrapTransportPacket(packet, path.nextHop);
      await this.transmit(path.receivedInterface, wrapped);
      return true;
    }

    if (kind === "direct" && path !== undefined) {
      await this.transmit(path.receivedInterface, packet.raw);
      return true;
    }

    let sent = false;
    for (const iface of this.interfaces) {
      if (!iface.outgoing) {
        continue;
      }

      if (attachedInterface !== null && iface !== attachedInterface) {
        continue;
      }

      this.packetHashes.add(hashKey(packet.hash()));
      await this.transmit(iface, packet.raw);
      sent = true;
    }

    return sent;
  }

  protected async handlePathRequest(packet: Packet, iface: PacketInterface): Promise<void> {
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

    if (!this.transportEnabled) {
      return;
    }

    const path = this.getPathEntry(parsed.destinationHash);
    if (path === undefined) {
      return;
    }

    if (!shouldAnswerPathRequest(path.nextHop, parsed.requestorTransportId)) {
      return;
    }

    await this.sendPathResponse(path, iface);
  }

  protected async sendPathResponse(path: PathEntry, iface: PacketInterface): Promise<void> {
    await new Promise<void>((resolve) => {
      this.clock.setTimeout(() => {
        void (async () => {
          const cached = Packet.decode(this.provider, path.announceRaw);
          if (cached === null) {
            resolve();
            return;
          }

          const response = buildPathResponseAnnounce(this.provider, cached, this.transportIdentity, path.hops);
          await this.outbound(response, iface);
          resolve();
        })();
      }, PATH_REQUEST_GRACE_MS);
    });
  }

  protected packetFilter(packet: Packet): boolean {
    return planPacketFilter({
      transportId: packet.transportId,
      localTransportHash: this.options.transportIdentity.hash,
      packetType: packet.packetType,
      destinationType: packet.destinationType,
      alreadySeenHash: this.packetHashes.has(hashKey(packet.hash()))
    });
  }
}

export function hashKey(bytes: Uint8Array): string {
  return bytesToHex(bytes);
}

export function cloneWithHops(provider: CryptoProvider, packet: Packet, hops: number): Packet {
  return Packet.fromFields(
    provider,
    planClonePacketWithHops(packetHeaderFields(packet), hops) as PacketFields
  );
}

export function announceEmittedFromRandomBlob(randomBlob: Uint8Array): number {
  return protocolAnnounceEmittedFromRandomBlob(randomBlob);
}

export function timebaseFromRandomBlobs(randomBlobs: ReadonlyArray<Uint8Array>): number {
  return protocolTimebaseFromRandomBlobs(randomBlobs);
}

export function wrapTransportPacket(packet: Packet, nextHop: Uint8Array): Uint8Array {
  return wrapTransportPacketBytes({
    packedFlags: packet.packedFlags(),
    hops: packet.hops,
    raw: packet.raw,
    nextHop
  });
}

export function stripTransportHeaders(raw: Uint8Array): Uint8Array {
  return stripTransportHeadersBytes(raw);
}

export function relayTransportPacket(
  packet: Packet,
  remainingHops: number,
  nextHop: Uint8Array
): Uint8Array {
  return relayTransportPacketBytes({
    raw: packet.raw,
    hops: packet.hops,
    remainingHops,
    nextHop
  });
}

export function buildTransportAnnounce(
  provider: CryptoProvider,
  source: Packet,
  transportIdentity: Identity,
  hops: number
): Packet {
  return Packet.fromFields(
    provider,
    planTransportAnnounceFields({
      source: {
        contextFlag: source.contextFlag,
        destinationType: source.destinationType,
        destinationHash: source.destinationHash,
        context: source.context,
        data: source.data
      },
      transportId: transportIdentity.hash,
      hops
    }) as PacketFields
  );
}

export function buildPathResponseAnnounce(
  provider: CryptoProvider,
  source: Packet,
  transportIdentity: Identity,
  hops: number
): Packet {
  return Packet.fromFields(
    provider,
    planPathResponseAnnounceFields({
      source: {
        contextFlag: source.contextFlag,
        destinationType: source.destinationType,
        destinationHash: source.destinationHash,
        context: source.context,
        data: source.data
      },
      transportId: transportIdentity.hash,
      hops
    }) as PacketFields
  );
}

function packetHeaderFields(packet: Packet): PacketHeaderFields {
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
    data: packet.data
  };
}
