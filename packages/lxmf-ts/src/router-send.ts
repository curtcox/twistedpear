import {
  initialAwaitLxmfDeliveryReceiptState,
  initialLxmfDirectSendState,
  initialLxmfOpportunisticSendState,
  initialLxmfPropagatedSendState,
  initialLxmfPropagationLinkReadyState,
  initialLxmfReceiptSendState,
  initialReuseActiveLinkState,
  lxmfReceiptSendApplyEvent,
  ReceiptPollStatus,
  shouldApplyLxmfReceiptSend,
  shouldAwaitLxmfDeliveryReceiptNow,
  shouldEstablishLxmfPropagationLink,
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
  shouldReuseActiveLinkNow,
  shouldReuseLxmfPropagationLink,
  stepAwaitLxmfDeliveryReceiptWithActions,
  stepLxmfDirectSendWithActions,
  stepLxmfOpportunisticSendWithActions,
  stepLxmfPropagatedSendWithActions,
  stepLxmfPropagationLinkReadyWithActions,
  stepLxmfReceiptSendWithActions,
  stepReuseActiveLinkWithActions,
  type LxmfSendEvent,
  type ReceiptPollStatusValue,
} from "@twistedpear/protocol";
import type {
  CryptoProvider,
  Link,
  Reticulum,
} from "@twistedpear/reticulum-ts";
import {
  bytesToHex,
  DestinationDirection,
  DestinationType,
  Identity,
  PacketContext,
} from "@twistedpear/reticulum-ts";
import { APP_NAME } from "./constants.js";
import type { LXMessage } from "./message.js";
import { awaitOutboundLink, pollDeliveryReceipt } from "./router-await.js";

export interface LxmfRouterSendHost {
  readonly reticulum: Reticulum;
  readonly provider: CryptoProvider;
  readonly directLinks: Map<string, Link>;
  outboundPropagationNode: Uint8Array | null;
  outboundPropagationLink: Link | null;
  applySendState(message: LXMessage, event: LxmfSendEvent): void;
  handleDeliveryLink(link: Link): void;
}

export async function sendOpportunisticLxmf(
  host: LxmfRouterSendHost,
  message: LXMessage,
): Promise<void> {
  const destination = message.destination;
  const stepped = stepLxmfOpportunisticSendWithActions(
    initialLxmfOpportunisticSendState(),
    {
      kind: "opportunistic-send/gate",
      destinationPresent: destination !== null,
    },
  );
  if (
    shouldRejectLxmfOpportunisticMissingDestination(stepped.actions) ||
    !shouldProceedLxmfOpportunisticSend(stepped.actions) ||
    destination === null
  ) {
    throw new Error("Opportunistic LXMF requires destination");
  }

  const outbound = host.reticulum.registerDestination({
    provider: host.provider,
    identity: destination.identity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["delivery"],
  });

  const receipt = await outbound.send(message.opportunisticPayload(), {
    createReceipt: true,
  });
  const afterSend = stepLxmfReceiptSendWithActions(
    initialLxmfReceiptSendState(),
    {
      kind: "receipt-send/map",
      mode: "opportunistic",
      phase: "after-send",
      receiptPresent: receipt !== null,
      delivered: false,
    },
  );
  const afterSendEvent = lxmfReceiptSendApplyEvent(afterSend.actions);
  if (
    shouldApplyLxmfReceiptSend(afterSend.actions) &&
    afterSendEvent !== null
  ) {
    host.applySendState(message, afterSendEvent);
  }
  const awaitReceipt = stepAwaitLxmfDeliveryReceiptWithActions(
    initialAwaitLxmfDeliveryReceiptState(),
    {
      kind: "lxmf/await-delivery-receipt-gate",
      receiptPresent: receipt !== null,
    },
  );
  if (!shouldAwaitLxmfDeliveryReceiptNow(awaitReceipt.actions)) {
    return;
  }

  const pollStatus = await pollDeliveryReceipt(host.reticulum, receipt!);
  const afterPoll = stepLxmfReceiptSendWithActions(
    initialLxmfReceiptSendState(),
    {
      kind: "receipt-send/map",
      mode: "opportunistic",
      phase: "after-poll",
      receiptPresent: true,
      delivered: pollStatus === ReceiptPollStatus.DELIVERED,
    },
  );
  const afterPollEvent = lxmfReceiptSendApplyEvent(afterPoll.actions);
  if (
    shouldApplyLxmfReceiptSend(afterPoll.actions) &&
    afterPollEvent !== null
  ) {
    host.applySendState(message, afterPollEvent);
  }
}

function assertDirectLxmfReady(message: LXMessage): {
  readonly destination: NonNullable<LXMessage["destination"]>;
  readonly packed: Uint8Array;
} {
  const destination = message.destination;
  const stepped = stepLxmfDirectSendWithActions(initialLxmfDirectSendState(), {
    kind: "direct-send/gate",
    destinationPresent: destination !== null,
    destinationIdentityPresent: destination?.identity !== null,
    packed: message.packed !== null,
  });
  if (
    shouldRejectLxmfDirectMissingDestination(stepped.actions) ||
    destination === null ||
    destination.identity === null
  ) {
    throw new Error("Direct LXMF requires destination");
  }
  if (
    shouldRejectLxmfDirectMissingPacked(stepped.actions) ||
    message.packed === null
  ) {
    throw new Error("Direct LXMF requires packed message");
  }
  if (!shouldProceedLxmfDirectSend(stepped.actions)) {
    throw new Error("Direct LXMF send rejected");
  }
  return { destination, packed: message.packed };
}

async function ensureDirectDeliveryLink(
  host: LxmfRouterSendHost,
  destination: NonNullable<LXMessage["destination"]>,
): Promise<Link> {
  const destinationKey = bytesToHex(destination.hash);
  const existing = host.directLinks.get(destinationKey) ?? null;
  const reuseDirect = stepReuseActiveLinkWithActions(
    initialReuseActiveLinkState(),
    {
      kind: "link/reuse-active-gate",
      linkPresent: existing !== null,
      status: existing?.status ?? 0,
    },
  );
  if (shouldReuseActiveLinkNow(reuseDirect.actions)) {
    return existing!;
  }

  const outbound = host.reticulum.registerDestination({
    provider: host.provider,
    identity: destination.identity!,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["delivery"],
  });

  const link = await awaitOutboundLink(host.reticulum, outbound, {
    timeoutError: "Direct LXMF link timeout",
  });

  host.directLinks.set(destinationKey, link);
  host.handleDeliveryLink(link);
  return link;
}

export async function sendDirectLxmf(
  host: LxmfRouterSendHost,
  message: LXMessage,
): Promise<void> {
  const { packed } = assertDirectLxmfReady(message);
  const link = await ensureDirectDeliveryLink(host, message.destination!);

  host.applySendState(message, { kind: "lxmf/begin-sending" });
  await link.send(packed);
  host.applySendState(message, { kind: "lxmf/mark-delivered" });
}

function assertPropagatedLxmfReady(
  host: LxmfRouterSendHost,
  message: LXMessage,
): Uint8Array {
  const packed = message.propagationPacked;
  const stepped = stepLxmfPropagatedSendWithActions(
    initialLxmfPropagatedSendState(),
    {
      kind: "propagated-send/gate",
      nodeConfigured: host.outboundPropagationNode !== null,
      hasPropagationPacked: packed !== null,
      representation: message.representation,
    },
  );
  if (shouldRejectLxmfPropagatedMissingNode(stepped.actions)) {
    throw new Error("No outbound propagation node configured");
  }
  if (
    shouldRejectLxmfPropagatedMissingPacked(stepped.actions) ||
    packed === null
  ) {
    throw new Error("PROPAGATED LXMF requires propagationPacked");
  }
  if (shouldRejectLxmfPropagatedResourceUnimplemented(stepped.actions)) {
    throw new Error("Large propagated LXMF via resource is not implemented");
  }
  if (!shouldProceedLxmfPropagatedSend(stepped.actions)) {
    throw new Error("PROPAGATED LXMF send rejected");
  }
  return packed;
}

export async function sendPropagatedLxmf(
  host: LxmfRouterSendHost,
  message: LXMessage,
): Promise<void> {
  const packed = assertPropagatedLxmfReady(host, message);

  const link = await ensureOutboundPropagationLink(host);
  host.applySendState(message, { kind: "lxmf/begin-sending" });

  const result = await link.sendContext(PacketContext.NONE, packed, {
    createReceipt: true,
  });

  const afterSend = stepLxmfReceiptSendWithActions(
    initialLxmfReceiptSendState(),
    {
      kind: "receipt-send/map",
      mode: "propagated",
      phase: "after-send",
      receiptPresent: result.receipt !== null,
      delivered: false,
    },
  );
  const afterSendEvent = lxmfReceiptSendApplyEvent(afterSend.actions);
  if (
    shouldApplyLxmfReceiptSend(afterSend.actions) &&
    afterSendEvent !== null
  ) {
    host.applySendState(message, afterSendEvent);
  }

  const awaitReceipt = stepAwaitLxmfDeliveryReceiptWithActions(
    initialAwaitLxmfDeliveryReceiptState(),
    {
      kind: "lxmf/await-delivery-receipt-gate",
      receiptPresent: result.receipt !== null,
    },
  );
  let pollStatus: ReceiptPollStatusValue | null = null;
  if (shouldAwaitLxmfDeliveryReceiptNow(awaitReceipt.actions)) {
    pollStatus = await pollDeliveryReceipt(host.reticulum, result.receipt!);
  }
  const afterPoll = stepLxmfReceiptSendWithActions(
    initialLxmfReceiptSendState(),
    {
      kind: "receipt-send/map",
      mode: "propagated",
      phase: "after-poll",
      receiptPresent: result.receipt !== null,
      delivered: pollStatus === ReceiptPollStatus.DELIVERED,
    },
  );
  const afterPollEvent = lxmfReceiptSendApplyEvent(afterPoll.actions);
  if (
    shouldApplyLxmfReceiptSend(afterPoll.actions) &&
    afterPollEvent !== null
  ) {
    host.applySendState(message, afterPollEvent);
  }
}

async function ensureOutboundPropagationLink(
  host: LxmfRouterSendHost,
): Promise<Link> {
  const reuseStepped = stepReuseActiveLinkWithActions(
    initialReuseActiveLinkState(),
    {
      kind: "link/reuse-active-gate",
      linkPresent: host.outboundPropagationLink !== null,
      status: host.outboundPropagationLink?.status ?? 0,
    },
  );
  const canReuse = shouldReuseActiveLinkNow(reuseStepped.actions);
  const nodeConfigured = host.outboundPropagationNode !== null;
  const nodeIdentity =
    host.outboundPropagationNode === null
      ? null
      : host.reticulum.resolveDestinationIdentity(host.outboundPropagationNode);
  const stepped = stepLxmfPropagationLinkReadyWithActions(
    initialLxmfPropagationLinkReadyState(),
    {
      kind: "propagation-link/gate",
      canReuseLink: canReuse,
      nodeConfigured,
      nodeIdentityPresent: nodeIdentity !== null,
    },
  );
  if (shouldReuseLxmfPropagationLink(stepped.actions)) {
    return host.outboundPropagationLink!;
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

  const outbound = host.reticulum.registerDestination({
    provider: host.provider,
    identity: nodeIdentity as Identity,
    direction: DestinationDirection.OUT,
    type: DestinationType.SINGLE,
    appName: APP_NAME,
    aspects: ["propagation"],
  });

  const link = await awaitOutboundLink(host.reticulum, outbound, {
    timeoutError: "Propagation link timeout",
  });

  host.outboundPropagationLink = link;
  return link;
}
