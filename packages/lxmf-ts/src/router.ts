import type { CryptoProvider, Link, Packet, PacketReceipt, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  DestinationProofStrategy,
  bytesToHex,
  equalBytes,
  Identity,
  LinkStatus,
  PacketContext,
  PacketReceiptStatus
} from "@twistedpear/reticulum-ts";
import { APP_NAME, DESTINATION_LENGTH, LXMessageMethod, LXMessageRepresentation, LXMessageState, type LXMessageMethodValue } from "./constants.js";
import { LXMessage, rememberMessage, type LXMessagePackOptions } from "./message.js";
import { msgpackUnpack } from "./msgpack.js";

export interface LXMFRouterOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
}

export type DeliveryCallback = (message: LXMessage) => void;

export class LXMFRouter {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  private deliveryDestination: RegisteredDestination | null = null;
  private deliveryCallback: DeliveryCallback | null = null;
  private readonly directLinks = new Map<string, Link>();
  private readonly seenMessages = new Set<string>();
  private outboundPropagationNode: Uint8Array | null = null;
  private outboundPropagationLink: Link | null = null;

  constructor(options: LXMFRouterOptions) {
    this.reticulum = options.reticulum;
    this.provider = options.provider;
  }

  registerDeliveryIdentity(identity: Identity): RegisteredDestination {
    if (this.deliveryDestination !== null) {
      throw new Error("Only one delivery identity is supported per LXMF router instance");
    }

    const destination = this.reticulum.registerDestination({
      provider: this.provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"]
    });

    destination.setPacketCallback((data, packet) => {
      this.handleDeliveryPacket(data, packet, LXMessageMethod.OPPORTUNISTIC);
    });
    destination.setLinkEstablishedCallback((link) => {
      this.handleDeliveryLink(link);
    });
    destination.setProofStrategy(DestinationProofStrategy.PROVE_ALL);

    destination.setAcceptLinkRequests(true);
    this.deliveryDestination = destination;
    return destination;
  }

  get deliveryIdentity(): Identity | null {
    return this.deliveryDestination?.identity ?? null;
  }

  get deliveryDestinationHash(): Uint8Array | null {
    return this.deliveryDestination?.hash ?? null;
  }

  onDelivery(callback: DeliveryCallback): void {
    this.deliveryCallback = callback;
  }

  setOutboundPropagationNode(destinationHash: Uint8Array): void {
    this.outboundPropagationNode = Uint8Array.from(destinationHash);
    if (this.outboundPropagationLink !== null) {
      this.outboundPropagationLink.teardown();
      this.outboundPropagationLink = null;
    }
  }

  get outboundPropagationNodeHash(): Uint8Array | null {
    return this.outboundPropagationNode;
  }

  watchPropagationNodes(callback?: (destinationHash: Uint8Array) => void): void {
    this.reticulum.registerAnnounceHandler({
      aspectFilter: `${APP_NAME}.propagation`,
      receivedAnnounce: (info) => {
        this.setOutboundPropagationNode(info.destinationHash);
        callback?.(info.destinationHash);
      }
    });
  }

  createOutboundDestination(recipientIdentity: Identity): Destination {
    return new Destination(this.provider, {
      identity: recipientIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"]
    });
  }

  async send(message: LXMessage): Promise<void> {
    if (message.packed === null) {
      throw new Error("LXMessage must be packed before sending");
    }

    message.state = LXMessageState.OUTBOUND;

    if (message.method === LXMessageMethod.OPPORTUNISTIC) {
      await this.sendOpportunistic(message);
      return;
    }

    if (message.method === LXMessageMethod.DIRECT) {
      await this.sendDirect(message);
      return;
    }

    if (message.method === LXMessageMethod.PROPAGATED) {
      await this.sendPropagated(message);
      return;
    }

    throw new Error(`Unsupported LXMF delivery method: ${message.method}`);
  }


  private nowSeconds(): number {
    return this.reticulum.runtime.clock.now() / 1000;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.reticulum.runtime.clock.setTimeout(() => resolve(), ms);
    });
  }

  private async pollDeliveryReceipt(receipt: PacketReceipt, timeoutMs = 500): Promise<void> {
    const deadline = this.reticulum.runtime.clock.now() + timeoutMs;
    while (this.reticulum.runtime.clock.now() < deadline) {
      if (
        receipt.status === PacketReceiptStatus.DELIVERED ||
        receipt.status === PacketReceiptStatus.FAILED
      ) {
        return;
      }

      await this.delay(10);
    }
  }

  packAndSend(options: Omit<LXMessagePackOptions, "provider">): Promise<void> {
    const message = LXMessage.pack({
      provider: this.provider,
      now: () => this.nowSeconds(),
      ...options
    });
    return this.send(message);
  }

  private async sendOpportunistic(message: LXMessage): Promise<void> {
    const destination = message.destination;
    if (destination === null) {
      throw new Error("Opportunistic LXMF requires destination");
    }

    const outbound = this.reticulum.registerDestination({
      provider: this.provider,
      identity: destination.identity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"]
    });

    const receipt = await outbound.send(message.opportunisticPayload(), { createReceipt: true });
    if (receipt === null) {
      message.state = LXMessageState.FAILED;
      return;
    }

    message.state = LXMessageState.SENT;
    message.progress = 0.5;

    await this.pollDeliveryReceipt(receipt);
    if (receipt.status === PacketReceiptStatus.DELIVERED) {
      message.state = LXMessageState.DELIVERED;
      message.progress = 1;
    }
  }

  private async sendDirect(message: LXMessage): Promise<void> {
    const destination = message.destination;
    if (destination === null || destination.identity === null) {
      throw new Error("Direct LXMF requires destination");
    }

    if (message.packed === null) {
      throw new Error("Direct LXMF requires packed message");
    }

    const recipientIdentity = destination.identity;
    const destinationKey = bytesToHex(destination.hash);
    let link = this.directLinks.get(destinationKey) ?? null;
    if (link === null || link.status !== LinkStatus.ACTIVE) {
      const outbound = this.reticulum.registerDestination({
        provider: this.provider,
        identity: recipientIdentity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: APP_NAME,
        aspects: ["delivery"]
      });

      link = await new Promise<Link>((resolve, reject) => {
        const timer = this.reticulum.runtime.clock.setTimeout(
          () => reject(new Error("Direct LXMF link timeout")),
          5000
        );
        outbound.requestLink({
          linkEstablished(establishLink) {
            timer.cancel();
            resolve(establishLink);
          }
        });
      });

      this.directLinks.set(destinationKey, link);
      this.handleDeliveryLink(link);
    }

    message.state = LXMessageState.SENDING;
    await link.send(message.packed);
    message.state = LXMessageState.DELIVERED;
    message.progress = 1;
  }

  private async sendPropagated(message: LXMessage): Promise<void> {
    if (this.outboundPropagationNode === null) {
      throw new Error("No outbound propagation node configured");
    }

    if (message.propagationPacked === null) {
      throw new Error("PROPAGATED LXMF requires propagationPacked");
    }

    if (message.representation !== LXMessageRepresentation.PACKET) {
      throw new Error("Large propagated LXMF via resource is not implemented");
    }

    const link = await this.ensureOutboundPropagationLink();
    message.state = LXMessageState.SENDING;

    const result = await link.sendContext(PacketContext.NONE, message.propagationPacked, {
      createReceipt: true
    });

    message.progress = 0.5;
    if (result.receipt !== null) {
      await this.pollDeliveryReceipt(result.receipt);
      if (result.receipt.status === PacketReceiptStatus.DELIVERED) {
        message.state = LXMessageState.SENT;
        message.progress = 1;
        return;
      }
    }

    message.state = LXMessageState.FAILED;
  }

  private async ensureOutboundPropagationLink(): Promise<Link> {
    if (this.outboundPropagationLink !== null && this.outboundPropagationLink.status === LinkStatus.ACTIVE) {
      return this.outboundPropagationLink;
    }

    if (this.outboundPropagationNode === null) {
      throw new Error("No outbound propagation node configured");
    }

    const nodeIdentity = this.reticulum.resolveDestinationIdentity(this.outboundPropagationNode);
    if (nodeIdentity === null) {
      throw new Error("Propagation node identity is unknown");
    }

    const outbound = this.reticulum.registerDestination({
      provider: this.provider,
      identity: nodeIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["propagation"]
    });

    const link = await new Promise<Link>((resolve, reject) => {
      const timer = this.reticulum.runtime.clock.setTimeout(
        () => reject(new Error("Propagation link timeout")),
        5000
      );
      outbound.requestLink({
        linkEstablished(establishLink) {
          timer.cancel();
          resolve(establishLink);
        }
      });
    });

    this.outboundPropagationLink = link;
    return link;
  }

  handleDeliveryPacket(data: Uint8Array, packet: Packet, method: LXMessageMethodValue): boolean {
    const lxmfData =
      method === LXMessageMethod.OPPORTUNISTIC
        ? concatBytes(packet.destinationHash, data)
        : data;

    return this.deliver(lxmfData, method);
  }

  handleDeliveryLink(link: Link): void {
    link.callbacks.packet = (data) => {
      this.deliver(data, LXMessageMethod.DIRECT);
    };
  }

  deliver(lxmfData: Uint8Array, method: LXMessageMethodValue = LXMessageMethod.DIRECT): boolean {
    const message = this.unpackDeliverable(lxmfData, method);
    if (message === null) {
      return false;
    }

    this.deliveryCallback?.(message);
    return true;
  }

  /** Mirrors LXMF/LXMRouter.lxmf_propagation local-delivery branch. */
  handlePropagationData(lxmfData: Uint8Array): LXMessage | null {
    if (lxmfData.length < DESTINATION_LENGTH) {
      return null;
    }

    const destinationHash = lxmfData.subarray(0, DESTINATION_LENGTH);
    const deliveryDestination = this.deliveryDestination;
    if (deliveryDestination === null || !equalBytes(deliveryDestination.hash, destinationHash)) {
      return null;
    }

    const decrypted = deliveryDestination.decrypt(lxmfData.subarray(DESTINATION_LENGTH));
    if (decrypted === null) {
      return null;
    }

    const deliveryData = concatBytes(destinationHash, decrypted);
    const message = this.unpackDeliverable(deliveryData, LXMessageMethod.PROPAGATED);
    if (message !== null) {
      this.deliveryCallback?.(message);
    }

    return message;
  }

  trackDirectLink(destinationHash: Uint8Array, link: Link): void {
    this.directLinks.set(bytesToHex(destinationHash), link);
    this.handleDeliveryLink(link);
  }

  private unpackDeliverable(lxmfData: Uint8Array, method: LXMessageMethodValue): LXMessage | null {
    try {
      const message = LXMessage.unpackFromBytes(lxmfData, {
        provider: this.provider,
        originalMethod: method
      });

      if (!message.signatureValidated) {
        return null;
      }

      if (message.hash !== null) {
        const key = bytesToHex(message.hash);
        if (this.seenMessages.has(key)) {
          return null;
        }

        rememberMessage(this.seenMessages, message);
      }

      message.method = method;
      message.state = LXMessageState.DELIVERED;
      return message;
    } catch {
      return null;
    }
  }
}

export function stampCostFromAppData(appData: Uint8Array | null): number | null {
  if (appData === null || appData.length === 0) {
    return null;
  }

  const tag = appData[0];
  if (tag === undefined || ((tag < 0x90 || tag > 0x9f) && tag !== 0xdc)) {
    return null;
  }

  try {
    const value = msgpackUnpack(appData);
    if (value.type !== "array" || value.array === undefined || value.array.length < 2) {
      return null;
    }

    const cost = value.array[1];
    return cost?.type === "int" ? cost.int ?? null : null;
  } catch {
    return null;
  }
}

function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    output.set(part, offset);
    offset += part.length;
  }

  return output;
}

