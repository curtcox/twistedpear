import {
  applyLxmfSendEvent,
  initialInvokeLxmfDeliveryCallbackState,
  initialLxmfDeliverableAcceptState,
  initialLxmfInboundDeliveryState,
  initialLxmfPropagationLocalIngressState,
  initialLxmfSendMethodState,
  initialLxmfSendState,
  initialRegisterLxmfDeliveryIdentityState,
  initialRememberLxmfMessageState,
  initialStampCostFromAppDataState,
  initialTeardownLxmfPropagationLinkState,
  initialUnpackLxmfPropagationLocalIngressState,
  lxmfInboundDeliveryRawFromActions,
  lxmfSendUnsupportedMethod,
  stampCostFromActions,
  shouldAcceptLxmfDeliverable,
  shouldDeliverLxmfPropagationLocalIngress,
  shouldInvokeLxmfDeliveryCallbackNow,
  shouldRejectLxmfSendUnpacked,
  shouldRejectLxmfSendUnsupported,
  shouldRegisterLxmfDeliveryIdentityNow,
  shouldRememberLxmfMessageNow,
  shouldSendLxmfDirect,
  shouldSendLxmfOpportunistic,
  shouldSendLxmfPropagated,
  shouldTeardownLxmfPropagationLinkNow,
  shouldUnpackLxmfPropagationLocalIngressNow,
  shouldUseLxmfInboundDelivery,
  stepInvokeLxmfDeliveryCallbackWithActions,
  stepLxmfDeliverableAcceptWithActions,
  stepLxmfInboundDeliveryWithActions,
  stepLxmfSendMethodWithActions,
  stepLxmfPropagationLocalIngressWithActions,
  stepRegisterLxmfDeliveryIdentityWithActions,
  stepRememberLxmfMessageWithActions,
  stepStampCostFromAppDataWithActions,
  stepTeardownLxmfPropagationLinkWithActions,
  stepUnpackLxmfPropagationLocalIngressWithActions,
  decideLxmfModeration,
  type LxmfSendEvent,
  type LxmfModerationDisposition,
} from "@twistedpear/protocol";
import type {
  CryptoProvider,
  Link,
  Packet,
  RegisteredDestination,
  Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  Destination,
  DestinationDirection,
  DestinationType,
  DestinationProofStrategy,
  bytesToHex,
  Identity,
} from "@twistedpear/reticulum-ts";
import {
  APP_NAME,
  LXMessageMethod,
  type LXMessageMethodValue,
} from "./constants.js";
import {
  LXMessage,
  rememberMessage,
  type LXMessagePackOptions,
} from "./message.js";
import {
  decryptPropagationLocalRemainder,
  packPropagationLocalDeliveryData,
  propagationLocalHashMatches,
  splitLxmfDestinationPrefixed,
} from "./router-propagation-ingress.js";
import {
  sendDirectLxmf,
  sendOpportunisticLxmf,
  sendPropagatedLxmf,
  type LxmfRouterSendHost,
} from "./router-send.js";

export interface LXMFRouterOptions {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly inboundModeration?: (
    sourceHashHex: string,
    message: LXMessage,
  ) => LxmfModerationDisposition;
}

export interface DeliveryContext {
  readonly disposition: "allow" | "mute";
  readonly notify: boolean;
}

export type DeliveryCallback = (
  message: LXMessage,
  context: DeliveryContext,
) => void;

export class LXMFRouter {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  private deliveryDestination: RegisteredDestination | null = null;
  private deliveryCallback: DeliveryCallback | null = null;
  private readonly directLinks = new Map<string, Link>();
  private readonly seenMessages = new Set<string>();
  private outboundPropagationNode: Uint8Array | null = null;
  private outboundPropagationLink: Link | null = null;
  private inboundModeration: (
    sourceHashHex: string,
    message: LXMessage,
  ) => LxmfModerationDisposition;

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
            deliveryDestinationPresent: this.deliveryDestination !== null,
          },
        ).actions,
      )
    ) {
      throw new Error(
        "Only one delivery identity is supported per LXMF router instance",
      );
    }

    const destination = this.reticulum.registerDestination({
      provider: this.provider,
      identity,
      direction: DestinationDirection.IN,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"],
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

  setInboundModeration(
    policy: (
      sourceHashHex: string,
      message: LXMessage,
    ) => LxmfModerationDisposition,
  ): void {
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
            linkPresent: this.outboundPropagationLink !== null,
          },
        ).actions,
      )
    ) {
      // Best-effort: the link is being discarded either way, and a teardown
      // packet that fails to send must not reject into an unhandled rejection.
      this.outboundPropagationLink!.teardown().catch(() => {});
      this.outboundPropagationLink = null;
    }
  }

  get outboundPropagationNodeHash(): Uint8Array | null {
    return this.outboundPropagationNode;
  }

  watchPropagationNodes(
    callback?: (destinationHash: Uint8Array) => void,
  ): void {
    this.reticulum.registerAnnounceHandler({
      aspectFilter: `${APP_NAME}.propagation`,
      receivedAnnounce: (info) => {
        this.setOutboundPropagationNode(info.destinationHash);
        callback?.(info.destinationHash);
      },
    });
  }

  createOutboundDestination(recipientIdentity: Identity): Destination {
    return new Destination(this.provider, {
      identity: recipientIdentity,
      direction: DestinationDirection.OUT,
      type: DestinationType.SINGLE,
      appName: APP_NAME,
      aspects: ["delivery"],
    });
  }

  async send(message: LXMessage): Promise<void> {
    const stepped = stepLxmfSendMethodWithActions(
      initialLxmfSendMethodState(),
      {
        kind: "send/dispatch",
        packed: message.packed !== null,
        method: message.method,
      },
    );
    await this.applyLxmfSendMethodActions(message, stepped.actions);
  }

  private async applyLxmfSendMethodActions(
    message: LXMessage,
    actions: ReturnType<typeof stepLxmfSendMethodWithActions>["actions"],
  ): Promise<void> {
    if (shouldRejectLxmfSendUnpacked(actions)) {
      throw new Error("LXMessage must be packed before sending");
    }

    this.applySendState(message, { kind: "lxmf/enqueue" });

    if (shouldSendLxmfOpportunistic(actions)) {
      await sendOpportunisticLxmf(this.lxmfSendHost(), message);
      return;
    }
    if (shouldSendLxmfDirect(actions)) {
      await sendDirectLxmf(this.lxmfSendHost(), message);
      return;
    }
    if (shouldSendLxmfPropagated(actions)) {
      await sendPropagatedLxmf(this.lxmfSendHost(), message);
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
      event,
    );
    message.state = next.state;
    message.progress = next.progress;
  }

  private lxmfSendHost(): LxmfRouterSendHost {
    const router = this;
    return {
      reticulum: router.reticulum,
      provider: router.provider,
      directLinks: router.directLinks,
      get outboundPropagationNode() {
        return router.outboundPropagationNode;
      },
      set outboundPropagationNode(value) {
        router.outboundPropagationNode = value;
      },
      get outboundPropagationLink() {
        return router.outboundPropagationLink;
      },
      set outboundPropagationLink(value) {
        router.outboundPropagationLink = value;
      },
      applySendState: (message, event) => router.applySendState(message, event),
      handleDeliveryLink: (link) => router.handleDeliveryLink(link),
    };
  }

  private nowSeconds(): number {
    return this.reticulum.runtime.clock.now() / 1000;
  }

  packAndSend(options: Omit<LXMessagePackOptions, "provider">): Promise<void> {
    const message = LXMessage.pack({
      provider: this.provider,
      now: () => this.nowSeconds(),
      ...options,
    });
    return this.send(message);
  }

  handleDeliveryPacket(
    data: Uint8Array,
    packet: Packet,
    method: LXMessageMethodValue,
  ): boolean {
    const rebuildStepped = stepLxmfInboundDeliveryWithActions(
      initialLxmfInboundDeliveryState(),
      {
        kind: "lxmf-inbound-delivery/rebuild-gate",
        method,
        destinationHash: packet.destinationHash,
        packetData: data,
      },
    );
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

  deliver(
    lxmfData: Uint8Array,
    method: LXMessageMethodValue = LXMessageMethod.DIRECT,
  ): boolean {
    const message = this.unpackDeliverable(lxmfData, method);
    return this.deliveryNotifyOutcome(message) === "notified";
  }

  /** Mirrors LXMF/LXMRouter.lxmf_propagation local-delivery branch. */
  handlePropagationData(lxmfData: Uint8Array): LXMessage | null {
    const prefixed = splitLxmfDestinationPrefixed(lxmfData);
    const deliveryDestination = this.deliveryDestination;
    const destinationHashMatches = propagationLocalHashMatches(
      deliveryDestination,
      prefixed,
    );
    const decrypted = decryptPropagationLocalRemainder(
      deliveryDestination,
      prefixed,
      destinationHashMatches,
    );

    const ingress = stepLxmfPropagationLocalIngressWithActions(
      initialLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/gate",
        prefixedPresent: prefixed !== null,
        deliveryDestinationPresent: deliveryDestination !== null,
        destinationHashMatches,
        decryptedPresent: decrypted !== null,
      },
    );

    const unpackIngress = stepUnpackLxmfPropagationLocalIngressWithActions(
      initialUnpackLxmfPropagationLocalIngressState(),
      {
        kind: "propagation-local-ingress/unpack-gate",
        deliver: shouldDeliverLxmfPropagationLocalIngress(ingress.actions),
        prefixedPresent: prefixed !== null,
        decryptedPresent: decrypted !== null,
      },
    );
    if (!shouldUnpackLxmfPropagationLocalIngressNow(unpackIngress.actions)) {
      return null;
    }

    const deliveryData = packPropagationLocalDeliveryData(
      prefixed!.destinationHash,
      decrypted!,
    );
    if (deliveryData === null) {
      return null;
    }
    const message = this.unpackDeliverable(
      deliveryData,
      LXMessageMethod.PROPAGATED,
    );
    return this.notifyPropagationDelivery(message);
  }

  private notifyPropagationDelivery(message: LXMessage | null): LXMessage | null {
    if (this.deliveryNotifyOutcome(message) === "blocked") {
      return null;
    }
    return message;
  }

  private deliveryNotifyOutcome(
    message: LXMessage | null,
  ): "skip" | "blocked" | "notified" {
    const invoke = stepInvokeLxmfDeliveryCallbackWithActions(
      initialInvokeLxmfDeliveryCallbackState(),
      {
        kind: "lxmf/invoke-delivery-callback-gate",
        messagePresent: message !== null,
      },
    );
    if (!shouldInvokeLxmfDeliveryCallbackNow(invoke.actions)) {
      return "skip";
    }

    const context = this.moderate(message!);
    if (context === null) return "blocked";
    this.deliveryCallback?.(message!, context);
    return "notified";
  }

  trackDirectLink(destinationHash: Uint8Array, link: Link): void {
    this.directLinks.set(bytesToHex(destinationHash), link);
    this.handleDeliveryLink(link);
  }

  private moderate(message: LXMessage): DeliveryContext | null {
    const sourceHashHex = bytesToHex(message.sourceHash);
    const disposition = this.inboundModeration(sourceHashHex, message);
    const decision = decideLxmfModeration(
      {
        blocked: disposition === "block" ? new Set([sourceHashHex]) : new Set(),
        muted: disposition === "mute" ? new Set([sourceHashHex]) : new Set(),
      },
      sourceHashHex,
    );
    return decision.deliver
      ? {
          disposition: decision.disposition as "allow" | "mute",
          notify: decision.notify,
        }
      : null;
  }

  private unpackDeliverable(
    lxmfData: Uint8Array,
    method: LXMessageMethodValue,
  ): LXMessage | null {
    try {
      const message = LXMessage.unpackFromBytes(lxmfData, {
        provider: this.provider,
        originalMethod: method,
      });

      const accept = stepLxmfDeliverableAcceptWithActions(
        initialLxmfDeliverableAcceptState(),
        {
          kind: "deliverable/accept-gate",
          signatureValidated: message.signatureValidated,
          hasHash: message.hash !== null,
          alreadySeen:
            message.hash !== null &&
            this.seenMessages.has(bytesToHex(message.hash)),
        },
      );
      if (!shouldAcceptLxmfDeliverable(accept.actions)) {
        return null;
      }

      if (
        shouldRememberLxmfMessageNow(
          stepRememberLxmfMessageWithActions(
            initialRememberLxmfMessageState(),
            {
              kind: "lxmf/remember-message-gate",
              hasHash: message.hash !== null,
            },
          ).actions,
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
export function stampCostFromAppData(
  appData: Uint8Array | null,
): number | null {
  const stepped = stepStampCostFromAppDataWithActions(
    initialStampCostFromAppDataState(),
    {
      kind: "lxmf/stamp-cost-gate",
      appData,
    },
  );
  return stampCostFromActions(stepped.actions);
}
