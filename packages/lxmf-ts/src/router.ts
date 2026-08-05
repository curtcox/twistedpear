import {
  applyLxmfSendEvent,
  initialAcceptLxmfPropagationLocalDeliveryState,
  initialAwaitLxmfDeliveryReceiptState,
  initialInvokeLxmfDeliveryCallbackState,
  initialLxmfDeliverableAcceptState,
  initialLxmfDirectSendState,
  initialLxmfInboundDeliveryState,
  initialLxmfOpportunisticSendState,
  initialLxmfPropagatedSendState,
  initialLxmfPropagationLinkReadyState,
  initialLxmfPropagationLocalIngressState,
  initialLxmfReceiptSendState,
  initialLxmfSendMethodState,
  initialLxmfSendState,
  initialPackLxmfDestinationPrefixedState,
  initialRegisterLxmfDeliveryIdentityState,
  initialRememberLxmfMessageState,
  initialSplitLxmfDestinationPrefixedState,
  initialStampCostFromAppDataState,
  initialTeardownLxmfPropagationLinkState,
  initialUnpackLxmfPropagationLocalIngressState,
  lxmfDestinationPrefixedFieldsFromActions,
  lxmfInboundDeliveryRawFromActions,
  lxmfReceiptSendApplyEvent,
  lxmfSendUnsupportedMethod,
  packLxmfDestinationPrefixedRawFromActions,
  stampCostFromActions,
  shouldAcceptLxmfDeliverable,
  shouldAcceptLxmfPropagationLocalDeliveryNow,
  shouldApplyLxmfReceiptSend,
  shouldAwaitLxmfDeliveryReceiptNow,
  shouldDeliverLxmfPropagationLocalIngress,
  shouldEstablishLxmfPropagationLink,
  shouldInvokeLxmfDeliveryCallbackNow,
  shouldProceedLxmfDirectSend,
  shouldProceedLxmfOpportunisticSend,
  shouldProceedLxmfPropagatedSend,
  shouldRejectLxmfDirectMissingDestination,
  shouldRejectLxmfDirectMissingPacked,
  shouldRejectLxmfOpportunisticMissingDestination,
  shouldRejectLxmfPropagatedMissingNode,
  shouldRejectLxmfPropagatedMissingPacked,
  shouldRejectLxmfPropagatedResourceUnimplemented,
  shouldRejectLxmfPropagationMissingIdentity,
  shouldRejectLxmfPropagationMissingNode,
  shouldRejectLxmfSendUnpacked,
  shouldRejectLxmfSendUnsupported,
  shouldRejectPackLxmfDestinationPrefixed,
  shouldRejectSplitLxmfDestinationPrefixed,
  shouldRegisterLxmfDeliveryIdentityNow,
  shouldRememberLxmfMessageNow,
  shouldReuseActiveLinkNow,
  initialReuseActiveLinkState,
  stepReuseActiveLinkWithActions,
  shouldReuseLxmfPropagationLink,
  shouldSendLxmfDirect,
  shouldSendLxmfOpportunistic,
  shouldSendLxmfPropagated,
  shouldTeardownLxmfPropagationLinkNow,
  shouldUnpackLxmfPropagationLocalIngressNow,
  shouldUseLxmfInboundDelivery,
  shouldUsePackLxmfDestinationPrefixed,
  shouldUseSplitLxmfDestinationPrefixed,
  stepAcceptLxmfPropagationLocalDeliveryWithActions,
  stepAwaitLxmfDeliveryReceiptWithActions,
  stepInvokeLxmfDeliveryCallbackWithActions,
  stepLxmfDeliverableAcceptWithActions,
  stepLxmfDirectSendWithActions,
  stepLxmfInboundDeliveryWithActions,
  stepLxmfOpportunisticSendWithActions,
  stepLxmfPropagatedSendWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfPropagationLocalIngressWithActions,
  stepLxmfReceiptSendWithActions,
  stepLxmfSendMethodWithActions,
  stepPackLxmfDestinationPrefixedWithActions,
  stepRegisterLxmfDeliveryIdentityWithActions,
  stepRememberLxmfMessageWithActions,
  stepSplitLxmfDestinationPrefixedWithActions,
  stepStampCostFromAppDataWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepUnpackLxmfPropagationLocalIngressWithActions,
  ReceiptPollStatus,
  decideLxmfModeration,
  type LxmfSendEvent,
  type LxmfModerationDisposition,
  type ReceiptPollStatusValue
} from "@twistedpear/protocol";
import type { CryptoProvider, Link, Packet, RegisteredDestination, Reticulum } from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  DestinationProofStrategy,
  bytesToHex,
  equalBytes,
  Identity,
  PacketContext
} from "@twistedpear/reticulum-ts";
import { APP_NAME, LXMessageMethod, type LXMessageMethodValue } from "./constants.js";
import { LXMessage, rememberMessage, type LXMessagePackOptions } from "./message.js";
import { awaitOutboundLink, pollDeliveryReceipt } from "./router-await.js";

export interface LXMFRouterOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly inboundModeration?: (sourceHashHex: string, message: LXMessage) => LxmfModerationDisposition;
}

export interface DeliveryContext {
  readonly disposition: "allow" | "mute";
  readonly notify: boolean;
}

export type DeliveryCallback = (message: LXMessage, context: DeliveryContext) => void;

export class LXMFRouter {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  private deliveryDestination: RegisteredDestination | null = null;
  private deliveryCallback: DeliveryCallback | null = null;
  private readonly directLinks = new Map<string, Link>();
  private readonly seenMessages = new Set<string>();
  private outboundPropagationNode: Uint8Array | null = null;
  private outboundPropagationLink: Link | null = null;
  private inboundModeration: (sourceHashHex: string, message: LXMessage) => LxmfModerationDisposition;

  constructor(options: LXMFRouterOptions) {
    this.reticulum = options.reticulum;
    this.provider = options.provider;
    this.inboundModeration = options.inboundModeration ?? (() => "allow");
  }

  registerDeliveryIdentity(identity: Identity): RegisteredDestination {
    if (
      !shouldRegisterLxmfDeliveryIdentityNow(
        stepRegisterLxmfDeliveryIdentityWithActions(
          initialRegisterLxmfDeliveryIdentityState(),
          {
            kind: "lxmf/register-delivery-identity-gate",
            deliveryDestinationPresent: this.deliveryDestination !== null
          }
        ).actions
      )
    ) {
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

  setInboundModeration(policy: (sourceHashHex: string, message: LXMessage) => LxmfModerationDisposition): void {
    this.inboundModeration = policy;
  }

  setOutboundPropagationNode(destinationHash: Uint8Array): void {
    this.outboundPropagationNode = Uint8Array.from(destinationHash);
    if (
      shouldTeardownLxmfPropagationLinkNow(
        stepTeardownLxmfPropagationLinkWithActions(
          initialTeardownLxmfPropagationLinkState(),
          {
            kind: "lxmf/teardown-propagation-link-gate",
            linkPresent: this.outboundPropagationLink !== null
          }
        ).actions
      )
    ) {
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
    const stepped = stepLxmfSendMethodWithActions(initialLxmfSendMethodState(), {
      kind: "send/dispatch",
      packed: message.packed !== null,
      method: message.method
    });
    await this.applyLxmfSendMethodActions(message, stepped.actions);
  }

  private async applyLxmfSendMethodActions(
    message: LXMessage,
    actions: ReturnType<typeof stepLxmfSendMethodWithActions>["actions"]
  ): Promise<void> {
    if (shouldRejectLxmfSendUnpacked(actions)) {
      throw new Error("LXMessage must be packed before sending");
    }

    this.applySendState(message, { kind: "lxmf/enqueue" });

    if (shouldSendLxmfOpportunistic(actions)) {
      await this.sendOpportunistic(message);
      return;
    }
    if (shouldSendLxmfDirect(actions)) {
      await this.sendDirect(message);
      return;
    }
    if (shouldSendLxmfPropagated(actions)) {
      await this.sendPropagated(message);
      return;
    }
    if (shouldRejectLxmfSendUnsupported(actions)) {
      const method = lxmfSendUnsupportedMethod(actions) ?? message.method;
      throw new Error(`Unsupported LXMF delivery method: ${method}`);
    }
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
    const stepped = stepLxmfOpportunisticSendWithActions(initialLxmfOpportunisticSendState(), {
      kind: "opportunistic-send/gate",
      destinationPresent: destination !== null
    });
    if (
      shouldRejectLxmfOpportunisticMissingDestination(stepped.actions) ||
      !shouldProceedLxmfOpportunisticSend(stepped.actions) ||
      destination === null
    ) {
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
    const afterSend = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "opportunistic",
      phase: "after-send",
      receiptPresent: receipt !== null,
      delivered: false
    });
    const afterSendEvent = lxmfReceiptSendApplyEvent(afterSend.actions);
    if (shouldApplyLxmfReceiptSend(afterSend.actions) && afterSendEvent !== null) {
      this.applySendState(message, afterSendEvent);
    }
    const awaitReceipt = stepAwaitLxmfDeliveryReceiptWithActions(
      initialAwaitLxmfDeliveryReceiptState(),
      {
        kind: "lxmf/await-delivery-receipt-gate",
        receiptPresent: receipt !== null
      }
    );
    if (!shouldAwaitLxmfDeliveryReceiptNow(awaitReceipt.actions)) {
      return;
    }

    const pollStatus = await pollDeliveryReceipt(this.reticulum, receipt!);
    const afterPoll = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "opportunistic",
      phase: "after-poll",
      receiptPresent: true,
      delivered: pollStatus === ReceiptPollStatus.DELIVERED
    });
    const afterPollEvent = lxmfReceiptSendApplyEvent(afterPoll.actions);
    if (shouldApplyLxmfReceiptSend(afterPoll.actions) && afterPollEvent !== null) {
      this.applySendState(message, afterPollEvent);
    }
  }

  private async sendDirect(message: LXMessage): Promise<void> {
    const destination = message.destination;
    const stepped = stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
      kind: "direct-send/gate",
      destinationPresent: destination !== null,
      destinationIdentityPresent: destination?.identity !== null,
      packed: message.packed !== null
    });
    if (
      shouldRejectLxmfDirectMissingDestination(stepped.actions) ||
      destination === null ||
      destination.identity === null
    ) {
      throw new Error("Direct LXMF requires destination");
    }
    if (shouldRejectLxmfDirectMissingPacked(stepped.actions) || message.packed === null) {
      throw new Error("Direct LXMF requires packed message");
    }
    if (!shouldProceedLxmfDirectSend(stepped.actions)) {
      throw new Error("Direct LXMF send rejected");
    }

    const recipientIdentity = destination.identity;
    const destinationKey = bytesToHex(destination.hash);
    let link = this.directLinks.get(destinationKey) ?? null;
    const reuseDirect = stepReuseActiveLinkWithActions(initialReuseActiveLinkState(), {
      kind: "link/reuse-active-gate",
      linkPresent: link !== null,
      status: link?.status ?? 0
    });
    if (!shouldReuseActiveLinkNow(reuseDirect.actions)) {
      const outbound = this.reticulum.registerDestination({
        provider: this.provider,
        identity: recipientIdentity,
        direction: DestinationDirection.OUT,
        type: DestinationType.SINGLE,
        appName: APP_NAME,
        aspects: ["delivery"]
      });

      link = await awaitOutboundLink(this.reticulum, outbound, {
        timeoutError: "Direct LXMF link timeout"
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
    const stepped = stepLxmfPropagatedSendWithActions(initialLxmfPropagatedSendState(), {
      kind: "propagated-send/gate",
      nodeConfigured: this.outboundPropagationNode !== null,
      hasPropagationPacked: packed !== null,
      representation: message.representation
    });
    if (shouldRejectLxmfPropagatedMissingNode(stepped.actions)) {
      throw new Error("No outbound propagation node configured");
    }
    if (shouldRejectLxmfPropagatedMissingPacked(stepped.actions) || packed === null) {
      throw new Error("PROPAGATED LXMF requires propagationPacked");
    }
    if (shouldRejectLxmfPropagatedResourceUnimplemented(stepped.actions)) {
      throw new Error("Large propagated LXMF via resource is not implemented");
    }
    if (!shouldProceedLxmfPropagatedSend(stepped.actions)) {
      throw new Error("PROPAGATED LXMF send rejected");
    }

    const link = await this.ensureOutboundPropagationLink();
    this.applySendState(message, { kind: "lxmf/begin-sending" });

    const result = await link.sendContext(PacketContext.NONE, packed, {
      createReceipt: true
    });

    const afterSend = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "propagated",
      phase: "after-send",
      receiptPresent: result.receipt !== null,
      delivered: false
    });
    const afterSendEvent = lxmfReceiptSendApplyEvent(afterSend.actions);
    if (shouldApplyLxmfReceiptSend(afterSend.actions) && afterSendEvent !== null) {
      this.applySendState(message, afterSendEvent);
    }

    const awaitReceipt = stepAwaitLxmfDeliveryReceiptWithActions(
      initialAwaitLxmfDeliveryReceiptState(),
      {
        kind: "lxmf/await-delivery-receipt-gate",
        receiptPresent: result.receipt !== null
      }
    );
    let pollStatus: ReceiptPollStatusValue | null = null;
    if (shouldAwaitLxmfDeliveryReceiptNow(awaitReceipt.actions)) {
      pollStatus = await pollDeliveryReceipt(this.reticulum, result.receipt!);
    }
    const afterPoll = stepLxmfReceiptSendWithActions(initialLxmfReceiptSendState(), {
      kind: "receipt-send/map",
      mode: "propagated",
      phase: "after-poll",
      receiptPresent: result.receipt !== null,
      delivered: pollStatus === ReceiptPollStatus.DELIVERED
    });
    const afterPollEvent = lxmfReceiptSendApplyEvent(afterPoll.actions);
    if (shouldApplyLxmfReceiptSend(afterPoll.actions) && afterPollEvent !== null) {
      this.applySendState(message, afterPollEvent);
    }
  }

  private async ensureOutboundPropagationLink(): Promise<Link> {
    const reuseStepped = stepReuseActiveLinkWithActions(initialReuseActiveLinkState(), {
      kind: "link/reuse-active-gate",
      linkPresent: this.outboundPropagationLink !== null,
      status: this.outboundPropagationLink?.status ?? 0
    });
    const canReuse = shouldReuseActiveLinkNow(reuseStepped.actions);
    const nodeConfigured = this.outboundPropagationNode !== null;
    const nodeIdentity =
      this.outboundPropagationNode === null
        ? null
        : this.reticulum.resolveDestinationIdentity(this.outboundPropagationNode);
    const stepped = stepLxmfPropagationLinkReadyWithActions(
      initialLxmfPropagationLinkReadyState(),
      {
        kind: "propagation-link/gate",
        canReuseLink: canReuse,
        nodeConfigured,
        nodeIdentityPresent: nodeIdentity !== null
      }
    );
    if (shouldReuseLxmfPropagationLink(stepped.actions)) {
      return this.outboundPropagationLink!;
    }
    if (shouldRejectLxmfPropagationMissingNode(stepped.actions)) {
      throw new Error("No outbound propagation node configured");
    }
    if (
      shouldRejectLxmfPropagationMissingIdentity(stepped.actions) ||
      nodeIdentity === null
    ) {
      throw new Error("Propagation node identity is unknown");
    }
    if (!shouldEstablishLxmfPropagationLink(stepped.actions)) {
      throw new Error("Propagation link establish rejected");
    }

    const outbound = this.reticulum.registerDestination({
      provider: this.provider,
      identity: nodeIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["propagation"]
    });

    const link = await awaitOutboundLink(this.reticulum, outbound, {
      timeoutError: "Propagation link timeout"
    });

    this.outboundPropagationLink = link;
    return link;
  }

  handleDeliveryPacket(data: Uint8Array, packet: Packet, method: LXMessageMethodValue): boolean {
    const rebuildStepped = stepLxmfInboundDeliveryWithActions(initialLxmfInboundDeliveryState(), {
      kind: "lxmf-inbound-delivery/rebuild-gate",
      method,
      destinationHash: packet.destinationHash,
      packetData: data
    });
    const lxmfData = shouldUseLxmfInboundDelivery(rebuildStepped.actions)
      ? lxmfInboundDeliveryRawFromActions(rebuildStepped.actions)
      : null;
    if (lxmfData === null) {
      return false;
    }
    return this.deliver(lxmfData, method);
  }

  handleDeliveryLink(link: Link): void {
    link.callbacks.packet = (data) => {
      this.deliver(data, LXMessageMethod.DIRECT);
    };
  }

  deliver(lxmfData: Uint8Array, method: LXMessageMethodValue = LXMessageMethod.DIRECT): boolean {
    const message = this.unpackDeliverable(lxmfData, method);
    const invoke = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      {
        kind: "lxmf/invoke-delivery-callback-gate",
        messagePresent: message !== null
      }
    );
    if (!shouldInvokeLxmfDeliveryCallbackNow(invoke.actions)) {
      return false;
    }

    const context = this.moderate(message!);
    if (context === null) return false;
    this.deliveryCallback?.(message!, context);
    return true;
  }

  /** Mirrors LXMF/LXMRouter.lxmf_propagation local-delivery branch. */
  handlePropagationData(lxmfData: Uint8Array): LXMessage | null {
    const splitStepped = stepSplitLxmfDestinationPrefixedWithActions(
      initialSplitLxmfDestinationPrefixedState(),
      {
        kind: "lxmf-destination-prefixed/split-gate",
        bytes: lxmfData
      }
    );
    const prefixed =
      shouldRejectSplitLxmfDestinationPrefixed(splitStepped.actions) ||
      !shouldUseSplitLxmfDestinationPrefixed(splitStepped.actions)
        ? null
        : lxmfDestinationPrefixedFieldsFromActions(splitStepped.actions);
    const deliveryDestination = this.deliveryDestination;
    const destinationHashMatches =
      deliveryDestination !== null &&
      prefixed !== null &&
      equalBytes(deliveryDestination.hash, prefixed.destinationHash);
    const localDelivery = stepAcceptLxmfPropagationLocalDeliveryWithActions(
      initialAcceptLxmfPropagationLocalDeliveryState(),
      {
        kind: "propagation-local-delivery/accept-gate",
        deliveryDestinationPresent: deliveryDestination !== null,
        destinationHashMatches
      }
    );
    const decrypted =
      prefixed !== null &&
      shouldAcceptLxmfPropagationLocalDeliveryNow(localDelivery.actions) &&
      deliveryDestination !== null
        ? deliveryDestination.decrypt(prefixed.remainder)
        : null;

    const ingress = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: prefixed !== null,
        deliveryDestinationPresent: deliveryDestination !== null,
        destinationHashMatches,
        decryptedPresent: decrypted !== null
      }
    );

    const unpackIngress = stepUnpackLxmfPropagationLocalIngressWithActions(
      initialUnpackLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/unpack-gate",
        deliver: shouldDeliverLxmfPropagationLocalIngress(ingress.actions),
        prefixedPresent: prefixed !== null,
        decryptedPresent: decrypted !== null
      }
    );
    if (!shouldUnpackLxmfPropagationLocalIngressNow(unpackIngress.actions)) {
      return null;
    }

    const packStepped = stepPackLxmfDestinationPrefixedWithActions(
      initialPackLxmfDestinationPrefixedState(),
      {
        kind: "lxmf-destination-prefixed/pack-gate",
        destinationHash: prefixed!.destinationHash,
        remainder: decrypted!
      }
    );
    if (
      shouldRejectPackLxmfDestinationPrefixed(packStepped.actions) ||
      !shouldUsePackLxmfDestinationPrefixed(packStepped.actions)
    ) {
      return null;
    }
    const deliveryData = packLxmfDestinationPrefixedRawFromActions(packStepped.actions);
    if (deliveryData === null) {
      return null;
    }
    const message = this.unpackDeliverable(deliveryData, LXMessageMethod.PROPAGATED);
    const invoke = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      {
        kind: "lxmf/invoke-delivery-callback-gate",
        messagePresent: message !== null
      }
    );
    if (shouldInvokeLxmfDeliveryCallbackNow(invoke.actions)) {
      const context = this.moderate(message!);
      if (context === null) return null;
      this.deliveryCallback?.(message!, context);
    }

    return message;
  }

  trackDirectLink(destinationHash: Uint8Array, link: Link): void {
    this.directLinks.set(bytesToHex(destinationHash), link);
    this.handleDeliveryLink(link);
  }

  private moderate(message: LXMessage): DeliveryContext | null {
    const sourceHashHex = bytesToHex(message.sourceHash);
    const disposition = this.inboundModeration(sourceHashHex, message);
    const decision = decideLxmfModeration({
      blocked: disposition === "block" ? new Set([sourceHashHex]) : new Set(),
      muted: disposition === "mute" ? new Set([sourceHashHex]) : new Set()
    }, sourceHashHex);
    return decision.deliver
      ? { disposition: decision.disposition as "allow" | "mute", notify: decision.notify }
      : null;
  }

  private unpackDeliverable(lxmfData: Uint8Array, method: LXMessageMethodValue): LXMessage | null {
    try {
      const message = LXMessage.unpackFromBytes(lxmfData, {
        provider: this.provider,
        originalMethod: method
      });

      const accept = stepLxmfDeliverableAcceptWithActions(initialLxmfDeliverableAcceptState(), {
        kind: "deliverable/accept-gate",
        signatureValidated: message.signatureValidated,
        hasHash: message.hash !== null,
        alreadySeen:
          message.hash !== null && this.seenMessages.has(bytesToHex(message.hash))
      });
      if (!shouldAcceptLxmfDeliverable(accept.actions)) {
        return null;
      }

      if (
        shouldRememberLxmfMessageNow(
          stepRememberLxmfMessageWithActions(initialRememberLxmfMessageState(), {
            kind: "lxmf/remember-message-gate",
            hasHash: message.hash !== null
          }).actions
        )
      ) {
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

/** Adapt stamp-cost extraction via protocol actions (no ad-hoc reads). */
export function stampCostFromAppData(appData: Uint8Array | null): number | null {
  const stepped = stepStampCostFromAppDataWithActions(initialStampCostFromAppDataState(), {
    kind: "lxmf/stamp-cost-gate",
    appData
  });
  return stampCostFromActions(stepped.actions);
}
