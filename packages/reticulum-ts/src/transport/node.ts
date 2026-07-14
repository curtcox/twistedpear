import {
  DestinationProofStrategyCode,
  PATHFINDER_EXPIRY_SECONDS,
  PATHFINDER_MAX_HOPS,
  PATH_REQUEST_GRACE_MS,
  PATH_REQUEST_TIMEOUT_SECONDS,
  announceEmittedFromRandomBlob as protocolAnnounceEmittedFromRandomBlob,
  appendPathRandomBlob,
  canEmitDestinationProof,
  computePathExpiry,
  isPathEntryExpired,
  parseAspectFilter,
  planClonePacketWithHops,
  planDestinationProof,
  planLinkActivateMembership,
  planLinkDataIngressTarget,
  planLinkRegisterList,
  planLinkUnregisterMembership,
  planLocalPlainDataDelivery,
  planOutboundReceiptOutcome,
  planPacketFilter,
  planPacketReceiptProofIngress,
  planPathEntryLookup,
  planPathOutbound,
  planPathRequestIngress,
  planPathResponseAnnounceFields,
  planProofIngressKind,
  planTransportAnnounceFields,
  planTransportIngressDispatch,
  planUnregisterPacketReceipt,
  planUnregisterTransportMember,
  canAnswerLocalPathRequest,
  canDispatchAnnounceHandlers,
  shouldAcceptCachedPathResponsePacket,
  shouldAcceptLinkLrProofCandidate,
  shouldAnswerPathWithEntry,
  shouldDispatchLocalLinkRequest,
  shouldFailAndDropOutboundReceipt,
  shouldIgnoreLocalAnnounce,
  shouldKeepOutboundReceipt,
  shouldMatchAnnounceAspect,
  shouldMatchLocalInboundDestination,
  shouldMatchLocalTypedDestination,
  shouldReceiveAnnouncePathResponse,
  shouldRegisterLinkMember,
  shouldRegisterPacketReceipt,
  shouldRegisterTransportMember,
  shouldRememberPathRequestTag,
  shouldTransmitOnInterface,
  shouldUsePathForOutbound,
  indexOfMatchingLinkId,
  relayTransportPacketBytes,
  shouldAddPathEntry,
  shouldAnswerPathRequest,
  shouldEmitPathRequest,
  isLocalPathRequestPacket,
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
import { PacketReceipt } from "../packet-receipt.js";
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
    if (!shouldRegisterTransportMember(this.interfaces.includes(iface))) {
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
    const index = planUnregisterTransportMember(this.interfaces.indexOf(iface));
    if (index !== null) {
      this.interfaces.splice(index, 1);
    }
    this.interfaceTasks.delete(iface);
  }

  listInterfaces(): ReadonlyArray<PacketInterface> {
    return [...this.interfaces];
  }

  registerDestination(destination: LocalDestination): void {
    if (shouldRegisterTransportMember(this.destinations.includes(destination))) {
      this.destinations.push(destination);
    }
  }

  findLocalDestination(destinationHash: Uint8Array): LocalDestination | undefined {
    return this.destinations.find((destination) => equalBytes(destination.hash, destinationHash));
  }

  registerAnnounceHandler(handler: AnnounceHandler): void {
    if (shouldRegisterTransportMember(this.announceHandlers.includes(handler))) {
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
    const plan = planPathEntryLookup({
      entryPresent: entry !== undefined,
      expired:
        entry !== undefined &&
        isPathEntryExpired({ expires: entry.expires, nowSeconds: this.clock.now() / 1000 })
    });
    if (plan === "miss") {
      return undefined;
    }
    if (plan === "expired") {
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
    if (planLinkRegisterList(link.initiator) === "pending") {
      if (shouldRegisterLinkMember(this.pendingLinks.includes(link))) {
        this.pendingLinks.push(link);
      }
      return;
    }

    if (shouldRegisterLinkMember(this.activeLinks.includes(link))) {
      this.activeLinks.push(link);
    }
  }

  activateLink(link: Link): void {
    const plan = planLinkActivateMembership({
      pendingIndex: this.pendingLinks.indexOf(link),
      alreadyActive: this.activeLinks.includes(link)
    });
    if (plan.removePendingIndex !== null) {
      this.pendingLinks.splice(plan.removePendingIndex, 1);
    }
    if (plan.appendActive) {
      this.activeLinks.push(link);
    }
  }

  unregisterLink(link: Link): void {
    const plan = planLinkUnregisterMembership({
      pendingIndex: this.pendingLinks.indexOf(link),
      activeIndex: this.activeLinks.indexOf(link)
    });
    if (plan.removePendingIndex !== null) {
      this.pendingLinks.splice(plan.removePendingIndex, 1);
    }
    if (plan.removeActiveIndex !== null) {
      this.activeLinks.splice(plan.removeActiveIndex, 1);
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
    const createReceipt = options.createReceipt === true;
    let receipt: PacketReceipt | null = null;

    if (shouldRegisterPacketReceipt(createReceipt)) {
      const nowSeconds = () => this.clock.now() / 1000;
      receipt = new PacketReceipt(packet.hash(), packet.truncatedHash(), packet.destinationHash, {
        sentAt: nowSeconds(),
        now: nowSeconds
      });
      this.receipts.push(receipt);
    }

    const sent = await this.outbound(packet, options.attachedInterface ?? null);
    const outcome = planOutboundReceiptOutcome({ createReceipt, sent });
    if (
      shouldFailAndDropOutboundReceipt({
        failAndDrop: outcome === "fail-and-drop-receipt",
        receiptPresent: receipt !== null
      })
    ) {
      receipt!.markFailed();
      const index = planUnregisterPacketReceipt(this.receipts.indexOf(receipt!));
      if (index !== null) {
        this.receipts.splice(index, 1);
      }
      return null;
    }
    if (!shouldKeepOutboundReceipt(outcome === "keep-receipt" && sent)) {
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

  protected async handleLinkRequest(packet: Packet, iface: PacketInterface): Promise<void> {
    for (const destination of this.destinations) {
      if (
        shouldDispatchLocalLinkRequest({
          hashMatches: equalBytes(destination.hash, packet.destinationHash),
          typeMatches: destination.type === packet.destinationType,
          handlerPresent: destination.handleLinkRequest !== undefined
        })
      ) {
        destination.handleLinkRequest!(packet, iface);
        return;
      }
    }
  }

  protected async handleLinkData(packet: Packet, iface: PacketInterface): Promise<void> {
    const activeIndex = indexOfMatchingLinkId({
      linkIds: this.activeLinks.map((link) => link.linkId),
      target: packet.destinationHash
    });
    const pendingIndex = indexOfMatchingLinkId({
      linkIds: this.pendingLinks.map((link) => link.linkId),
      target: packet.destinationHash
    });
    switch (planLinkDataIngressTarget({ activeIndex, pendingIndex })) {
      case "active":
        await this.activeLinks[activeIndex!]!.receive(packet, iface);
        return;
      case "pending":
        await this.pendingLinks[pendingIndex!]!.receive(packet, iface);
        return;
      case "none":
        return;
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

    const localDestination = this.destinations.find((entry) =>
      shouldMatchLocalInboundDestination({
        hashMatches: equalBytes(entry.hash, packet.destinationHash),
        directionIn: entry.direction === DestinationDirection.IN
      })
    );
    if (shouldIgnoreLocalAnnounce(localDestination !== undefined)) {
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

    const randomBlobs = appendPathRandomBlob({
      randomBlobs: existing?.randomBlobs ?? [],
      randomBlob
    });

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
    if (!canDispatchAnnounceHandlers(announcedIdentity !== null)) {
      return;
    }
    const identity = announcedIdentity!;

    for (const handler of this.announceHandlers) {
      if (
        !shouldReceiveAnnouncePathResponse({
          context: packet.context,
          receivePathResponses: handler.receivePathResponses
        })
      ) {
        continue;
      }

      if (handler.aspectFilter != null) {
        const parsedFilter = parseAspectFilter(handler.aspectFilter);
        const expected =
          parsedFilter === null
            ? null
            : Destination.hash(
                this.options.provider,
                identity,
                parsedFilter.appName,
                ...parsedFilter.aspects
              );
        if (
          !shouldMatchAnnounceAspect({
            hasFilter: true,
            filterParsed: parsedFilter !== null,
            hashMatches: expected !== null && equalBytes(packet.destinationHash, expected)
          })
        ) {
          continue;
        }
      }

      handler.receivedAnnounce({
        destinationHash: packet.destinationHash,
        announcedIdentity: identity,
        appData: parsed.appData,
        announce: parsed,
        packet
      });
    }
  }

  protected async handleData(packet: Packet, iface: PacketInterface): Promise<void> {
    if (
      isLocalPathRequestPacket({
        destinationTypePlain: packet.destinationType === DestinationType.PLAIN,
        destinationHashMatches: equalBytes(packet.destinationHash, this.pathRequestHash)
      })
    ) {
      await this.handlePathRequest(packet, iface);
      return;
    }

    const destination = this.destinations.find((entry) =>
      shouldMatchLocalTypedDestination({
        hashMatches: equalBytes(entry.hash, packet.destinationHash),
        typeMatches: entry.type === packet.destinationType
      })
    );
    const plaintext = destination === undefined ? null : destination.decrypt(packet.data);
    if (
      planLocalPlainDataDelivery({
        destinationPresent: destination !== undefined,
        plaintextPresent: plaintext !== null
      }) !== "dispatch" ||
      destination === undefined ||
      plaintext === null
    ) {
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
    const kind = planProofIngressKind(packet.context);
    if (kind === "lrproof") {
      for (const link of this.pendingLinks) {
        if (
          shouldAcceptLinkLrProofCandidate({
            linkIdMatches: equalBytes(link.linkId, packet.destinationHash),
            hopsMatch: link.hopsMatch(packet)
          })
        ) {
          await link.validateProof(packet, iface);
          return;
        }
      }
      return;
    }

    if (kind === "resource-prf") {
      const activeIndex = indexOfMatchingLinkId({
        linkIds: this.activeLinks.map((link) => link.linkId),
        target: packet.destinationHash
      });
      if (activeIndex !== null) {
        await this.activeLinks[activeIndex]!.handleResourceProof(packet);
      }
      return;
    }

    for (const receipt of [...this.receipts]) {
      const identity = equalBytes(packet.destinationHash, receipt.truncatedHash)
        ? Identity.recall(this.options.provider, receipt.targetDestinationHash)
        : null;
      const proofAccepted =
        identity !== null && receipt.validateProofPacket(packet, identity);
      if (
        planPacketReceiptProofIngress({
          truncatedHashMatches: equalBytes(packet.destinationHash, receipt.truncatedHash),
          identityPresent: identity !== null,
          proofAccepted
        }) === "remove-receipt"
      ) {
        const index = planUnregisterPacketReceipt(this.receipts.indexOf(receipt));
        if (index !== null) {
          this.receipts.splice(index, 1);
        }
      }
    }
  }

  protected async sendProof(destination: LocalDestination, packet: Packet, iface: PacketInterface): Promise<void> {
    if (!canEmitDestinationProof(destination.identity !== null)) {
      return;
    }

    const packetHash = packet.hash();
    await destination.identity!.prove(
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

    if (kind === "wrap" && shouldUsePathForOutbound(path !== undefined)) {
      const wrapped = wrapTransportPacket(packet, path!.nextHop);
      await this.transmit(path!.receivedInterface, wrapped);
      return true;
    }

    if (kind === "direct" && shouldUsePathForOutbound(path !== undefined)) {
      await this.transmit(path!.receivedInterface, packet.raw);
      return true;
    }

    let sent = false;
    for (const iface of this.interfaces) {
      if (
        !shouldTransmitOnInterface({
          outgoing: iface.outgoing,
          requireAttached: attachedInterface !== null,
          isAttached: attachedInterface !== null && iface === attachedInterface
        })
      ) {
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
    const plan = planPathRequestIngress({
      parsedOk: parsed !== null,
      hasTag: parsed?.tag !== null && parsed?.tag !== undefined,
      tagAlreadySeen: tagKey !== null && this.discoveryPrTags.has(tagKey),
      hasLocalAnswerer: localDestination?.answerPathRequest !== undefined,
      transportEnabled: this.transportEnabled,
      hasPath: path !== undefined,
      shouldAnswerPath:
        path !== undefined &&
        shouldAnswerPathRequest(path.nextHop, parsed?.requestorTransportId ?? null),
      discoveryPresent: false,
      discoveryExpired: false,
      allowDiscovery: false
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

    if (plan === "answer-path" && shouldAnswerPathWithEntry(path !== undefined)) {
      await this.sendPathResponse(path!, iface);
    }
  }

  protected async sendPathResponse(path: PathEntry, iface: PacketInterface): Promise<void> {
    await new Promise<void>((resolve) => {
      this.clock.setTimeout(() => {
        void (async () => {
          const cached = Packet.decode(this.provider, path.announceRaw);
          if (!shouldAcceptCachedPathResponsePacket(cached !== null)) {
            resolve();
            return;
          }

          const response = buildPathResponseAnnounce(this.provider, cached!, this.transportIdentity, path.hops);
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
