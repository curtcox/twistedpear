import {
  DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS,
  applyLxmfSendEvent,
  canAcceptLxmfPropagationLocalDelivery,
  canRegisterLxmfDeliveryIdentity,
  initialDeliveryReceiptPollState,
  initialLxmfSendState,
  lxmfInboundDeliveryBytes,
  packLxmfDestinationPrefixed,
  planLxmfDeliverableAccept,
  planLxmfDirectSend,
  planLxmfOpportunisticSend,
  planLxmfPropagatedSend,
  planLxmfPropagationLinkReady,
  planLxmfPropagationLocalIngress,
  planLxmfReceiptSendOutcome,
  planLxmfSendMethod,
  shouldAwaitLxmfDeliveryReceipt,
  shouldInvokeLxmfDeliveryCallback,
  shouldRememberLxmfMessage,
  shouldReuseActiveLink,
  shouldTeardownLxmfPropagationLink,
  splitLxmfDestinationPrefixed,
  stepDeliveryReceiptPoll,
  type LxmfSendEvent,
  type ReceiptPollStatusValue
} from "@twistedpear/protocol";
import type { CryptoProvider, Link, Packet, PacketReceipt, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  DestinationProofStrategy,
  bytesToHex,
  equalBytes,
  Identity,
  PacketContext,
  PacketReceiptStatus
} from "@twistedpear/reticulum-ts";
import { APP_NAME, LXMessageMethod, type LXMessageMethodValue } from "./constants.js";
import { LXMessage, rememberMessage, type LXMessagePackOptions } from "./message.js";

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
    if (!canRegisterLxmfDeliveryIdentity(this.deliveryDestination !== null)) {
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
    if (shouldTeardownLxmfPropagationLink(this.outboundPropagationLink !== null)) {
      this.outboundPropagationLink!.teardown();
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
    const plan = planLxmfSendMethod({
      packed: message.packed !== null,
      method: message.method
    });
    if (plan === "reject-unpacked") {
      throw new Error("LXMessage must be packed before sending");
    }

    this.applySendState(message, { kind: "lxmf/enqueue" });

    if (plan === "opportunistic") {
      await this.sendOpportunistic(message);
      return;
    }

    if (plan === "direct") {
      await this.sendDirect(message);
      return;
    }

    if (plan === "propagated") {
      await this.sendPropagated(message);
      return;
    }

    throw new Error(`Unsupported LXMF delivery method: ${message.method}`);
  }

  private applySendState(message: LXMessage, event: LxmfSendEvent): void {
    const next = applyLxmfSendEvent(
      initialLxmfSendState(message.state, message.progress),
      event
    );
    message.state = next.state;
    message.progress = next.progress;
  }


  private nowSeconds(): number {
    return this.reticulum.runtime.clock.now() / 1000;
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.reticulum.runtime.clock.setTimeout(() => resolve(), ms);
    });
  }

  private async pollDeliveryReceipt(
    receipt: PacketReceipt,
    timeoutMs = DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS
  ): Promise<void> {
    let state = stepDeliveryReceiptPoll(initialDeliveryReceiptPollState(), {
      kind: "poll/arm",
      at: this.reticulum.runtime.clock.now(),
      timeoutMs
    } as never).state;

    while (!state.concluded) {
      state = stepDeliveryReceiptPoll(state, {
        kind: "poll/receipt-status",
        status: receipt.status as ReceiptPollStatusValue
      } as never).state;
      if (state.concluded) {
        return;
      }

      const tick = stepDeliveryReceiptPoll(state, {
        kind: "timer/fired",
        id: "delivery-poll",
        at: this.reticulum.runtime.clock.now()
      });
      state = tick.state;
      if (state.concluded) {
        return;
      }

      for (const intent of tick.intents) {
        if (intent.kind === "timer/set" && intent.timer.id === "delivery-poll") {
          await this.delay(intent.timer.delayMs);
        }
      }
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
    const plan = planLxmfOpportunisticSend({
      destinationPresent: destination !== null
    });
    if (plan === "missing-destination" || destination === null) {
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
    const afterSend = planLxmfReceiptSendOutcome({
      mode: "opportunistic",
      phase: "after-send",
      receiptPresent: receipt !== null,
      delivered: false
    });
    if (afterSend !== null) {
      this.applySendState(message, afterSend);
    }
    if (!shouldAwaitLxmfDeliveryReceipt(receipt !== null)) {
      return;
    }

    await this.pollDeliveryReceipt(receipt!);
    const afterPoll = planLxmfReceiptSendOutcome({
      mode: "opportunistic",
      phase: "after-poll",
      receiptPresent: true,
      delivered: receipt!.status === PacketReceiptStatus.DELIVERED
    });
    if (afterPoll !== null) {
      this.applySendState(message, afterPoll);
    }
  }

  private async sendDirect(message: LXMessage): Promise<void> {
    const destination = message.destination;
    const plan = planLxmfDirectSend({
      destinationPresent: destination !== null,
      destinationIdentityPresent: destination?.identity !== null,
      packed: message.packed !== null
    });
    if (plan === "missing-destination" || destination === null || destination.identity === null) {
      throw new Error("Direct LXMF requires destination");
    }
    if (plan === "missing-packed" || message.packed === null) {
      throw new Error("Direct LXMF requires packed message");
    }

    const recipientIdentity = destination.identity;
    const destinationKey = bytesToHex(destination.hash);
    let link = this.directLinks.get(destinationKey) ?? null;
    if (
      !shouldReuseActiveLink({
        linkPresent: link !== null,
        status: link?.status ?? 0
      })
    ) {
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

    this.applySendState(message, { kind: "lxmf/begin-sending" });
    await link!.send(message.packed);
    this.applySendState(message, { kind: "lxmf/mark-delivered" });
  }

  private async sendPropagated(message: LXMessage): Promise<void> {
    const packed = message.propagationPacked;
    const plan = planLxmfPropagatedSend({
      nodeConfigured: this.outboundPropagationNode !== null,
      hasPropagationPacked: packed !== null,
      representation: message.representation
    });
    if (plan === "missing-node") {
      throw new Error("No outbound propagation node configured");
    }
    if (plan === "missing-packed" || packed === null) {
      throw new Error("PROPAGATED LXMF requires propagationPacked");
    }
    if (plan === "resource-unimplemented") {
      throw new Error("Large propagated LXMF via resource is not implemented");
    }

    const link = await this.ensureOutboundPropagationLink();
    this.applySendState(message, { kind: "lxmf/begin-sending" });

    const result = await link.sendContext(PacketContext.NONE, packed, {
      createReceipt: true
    });

    const afterSend = planLxmfReceiptSendOutcome({
      mode: "propagated",
      phase: "after-send",
      receiptPresent: result.receipt !== null,
      delivered: false
    });
    if (afterSend !== null) {
      this.applySendState(message, afterSend);
    }

    if (shouldAwaitLxmfDeliveryReceipt(result.receipt !== null)) {
      await this.pollDeliveryReceipt(result.receipt!);
    }
    const afterPoll = planLxmfReceiptSendOutcome({
      mode: "propagated",
      phase: "after-poll",
      receiptPresent: result.receipt !== null,
      delivered: result.receipt?.status === PacketReceiptStatus.DELIVERED
    });
    if (afterPoll !== null) {
      this.applySendState(message, afterPoll);
    }
  }

  private async ensureOutboundPropagationLink(): Promise<Link> {
    const canReuse = shouldReuseActiveLink({
      linkPresent: this.outboundPropagationLink !== null,
      status: this.outboundPropagationLink?.status ?? 0
    });
    const nodeConfigured = this.outboundPropagationNode !== null;
    const nodeIdentity =
      this.outboundPropagationNode === null
        ? null
        : this.reticulum.resolveDestinationIdentity(this.outboundPropagationNode);
    const ready = planLxmfPropagationLinkReady({
      canReuseLink: canReuse,
      nodeConfigured,
      nodeIdentityPresent: nodeIdentity !== null
    });
    if (ready === "reuse") {
      return this.outboundPropagationLink!;
    }
    if (ready === "missing-node") {
      throw new Error("No outbound propagation node configured");
    }
    if (ready === "missing-identity" || nodeIdentity === null) {
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
    const lxmfData = lxmfInboundDeliveryBytes(method, packet.destinationHash, data);
    return this.deliver(lxmfData, method);
  }

  handleDeliveryLink(link: Link): void {
    link.callbacks.packet = (data) => {
      this.deliver(data, LXMessageMethod.DIRECT);
    };
  }

  deliver(lxmfData: Uint8Array, method: LXMessageMethodValue = LXMessageMethod.DIRECT): boolean {
    const message = this.unpackDeliverable(lxmfData, method);
    if (!shouldInvokeLxmfDeliveryCallback(message !== null)) {
      return false;
    }

    this.deliveryCallback?.(message!);
    return true;
  }

  /** Mirrors LXMF/LXMRouter.lxmf_propagation local-delivery branch. */
  handlePropagationData(lxmfData: Uint8Array): LXMessage | null {
    const prefixed = splitLxmfDestinationPrefixed(lxmfData);
    const deliveryDestination = this.deliveryDestination;
    const destinationHashMatches =
      deliveryDestination !== null &&
      prefixed !== null &&
      equalBytes(deliveryDestination.hash, prefixed.destinationHash);
    const decrypted =
      prefixed !== null &&
      canAcceptLxmfPropagationLocalDelivery({
        deliveryDestinationPresent: deliveryDestination !== null,
        destinationHashMatches
      }) &&
      deliveryDestination !== null
        ? deliveryDestination.decrypt(prefixed.remainder)
        : null;

    if (
      planLxmfPropagationLocalIngress({
        prefixedPresent: prefixed !== null,
        deliveryDestinationPresent: deliveryDestination !== null,
        destinationHashMatches,
        decryptedPresent: decrypted !== null
      }) !== "deliver" ||
      prefixed === null ||
      decrypted === null
    ) {
      return null;
    }

    const deliveryData = packLxmfDestinationPrefixed(prefixed.destinationHash, decrypted);
    const message = this.unpackDeliverable(deliveryData, LXMessageMethod.PROPAGATED);
    if (shouldInvokeLxmfDeliveryCallback(message !== null)) {
      this.deliveryCallback?.(message!);
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

      if (
        planLxmfDeliverableAccept({
          signatureValidated: message.signatureValidated,
          hasHash: message.hash !== null,
          alreadySeen:
            message.hash !== null && this.seenMessages.has(bytesToHex(message.hash))
        }) !== "accept"
      ) {
        return null;
      }

      if (shouldRememberLxmfMessage(message.hash !== null)) {
        rememberMessage(this.seenMessages, message);
      }

      message.method = method;
      this.applySendState(message, { kind: "lxmf/mark-delivered" });
      return message;
    } catch {
      return null;
    }
  }
}

export { stampCostFromAppData } from "@twistedpear/protocol";

