import type { CryptoProvider, Identity, Link, Packet, PacketReceipt, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import { Destination, DestinationDirection, DestinationType, DestinationProofStrategy, LinkStatus, PacketReceiptStatus } from "@twistedpear/reticulum-ts";
import { APP_NAME, LXMessageMethod, LXMessageState, type LXMessageMethodValue } from "./constants.js";
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

    throw new Error(`Unsupported LXMF delivery method: ${message.method}`);
  }

  packAndSend(options: Omit<LXMessagePackOptions, "provider">): Promise<void> {
    const message = LXMessage.pack({ provider: this.provider, ...options });
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

    await pollDeliveryReceipt(receipt);
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
    const destinationKey = Buffer.from(destination.hash).toString("hex");
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
        const timer = setTimeout(() => reject(new Error("Direct LXMF link timeout")), 5000);
        outbound.requestLink({
          linkEstablished(establishLink) {
            clearTimeout(timer);
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
    try {
      const message = LXMessage.unpackFromBytes(lxmfData, {
        provider: this.provider,
        originalMethod: method
      });

      if (!message.signatureValidated) {
        return false;
      }

      if (message.hash !== null) {
        const key = Buffer.from(message.hash).toString("hex");
        if (this.seenMessages.has(key)) {
          return false;
        }

        rememberMessage(this.seenMessages, message);
      }

      message.method = method;
      message.state = LXMessageState.DELIVERED;
      this.deliveryCallback?.(message);
      return true;
    } catch {
      return false;
    }
  }

  trackDirectLink(destinationHash: Uint8Array, link: Link): void {
    this.directLinks.set(Buffer.from(destinationHash).toString("hex"), link);
    this.handleDeliveryLink(link);
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

async function pollDeliveryReceipt(receipt: PacketReceipt, timeoutMs = 500): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (
      receipt.status === PacketReceiptStatus.DELIVERED ||
      receipt.status === PacketReceiptStatus.FAILED
    ) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 10));
  }
}
