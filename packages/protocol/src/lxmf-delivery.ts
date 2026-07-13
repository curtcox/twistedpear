/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 */
import {
  LxmfUnverifiedReason,
  type LxmfUnverifiedReasonValue
} from "./lxmf-fields.js";

export const LxmfDeliveryMethod = {
  OPPORTUNISTIC: 0x01,
  DIRECT: 0x02,
  PROPAGATED: 0x03,
  PAPER: 0x05
} as const;

export type LxmfDeliveryMethodValue =
  (typeof LxmfDeliveryMethod)[keyof typeof LxmfDeliveryMethod];

export const LxmfDeliveryRepresentation = {
  UNKNOWN: 0x00,
  PACKET: 0x01,
  RESOURCE: 0x02
} as const;

export type LxmfDeliveryRepresentationValue =
  (typeof LxmfDeliveryRepresentation)[keyof typeof LxmfDeliveryRepresentation];

export const LXMF_DESTINATION_LENGTH = 16;
export const LXMF_SIGNATURE_LENGTH = 64;
export const LXMF_TIMESTAMP_SIZE = 8;
export const LXMF_STRUCT_OVERHEAD = 8;

/** Full LXMF structural overhead (dest×2 + signature + timestamp + struct). */
export const LXMF_OVERHEAD =
  2 * LXMF_DESTINATION_LENGTH +
  LXMF_SIGNATURE_LENGTH +
  LXMF_TIMESTAMP_SIZE +
  LXMF_STRUCT_OVERHEAD;

/** Mirrors LXMF encrypted / link packet MDUs. */
export const LXMF_ENCRYPTED_PACKET_MDU = 391;
export const LXMF_LINK_PACKET_MDU = 431;

/**
 * Max opportunistic content that fits an encrypted packet.
 * Opportunistic frames omit one destination hash from the wire envelope.
 */
export const LXMF_ENCRYPTED_PACKET_MAX_CONTENT =
  LXMF_ENCRYPTED_PACKET_MDU - LXMF_OVERHEAD + LXMF_DESTINATION_LENGTH;

/** Max direct/propagated content that fits a link packet. */
export const LXMF_LINK_PACKET_MAX_CONTENT = LXMF_LINK_PACKET_MDU - LXMF_OVERHEAD;

export function lxmfContentSizeFromPackedLength(
  packedLength: number,
  destinationLength: number = LXMF_DESTINATION_LENGTH,
  signatureLength: number = LXMF_SIGNATURE_LENGTH,
  timestampSize: number = LXMF_TIMESTAMP_SIZE,
  structOverhead: number = LXMF_STRUCT_OVERHEAD
): number {
  const payloadLength = packedLength - (2 * destinationLength + signatureLength);
  return payloadLength - timestampSize - structOverhead;
}

export type LxmfDeliveryPlan =
  | {
      readonly kind: "deliver";
      readonly method: LxmfDeliveryMethodValue;
      readonly representation: LxmfDeliveryRepresentationValue;
    }
  | {
      readonly kind: "reject-opportunistic-too-large";
      readonly contentSize: number;
      readonly maxContent: number;
    }
  | {
      readonly kind: "reject-unsupported-method";
      readonly method: number;
    };

/**
 * Plan delivery parameters.
 * For PROPAGATED, pass `propagationPackedLength` after the adapter builds the envelope.
 */
export function planLxmfDelivery(input: {
  readonly desiredMethod: number;
  readonly contentSize: number;
  readonly encryptedPacketMaxContent: number;
  readonly linkPacketMaxContent: number;
  readonly propagationPackedLength?: number;
}): LxmfDeliveryPlan {
  const desiredMethod = input.desiredMethod;

  if (desiredMethod === LxmfDeliveryMethod.OPPORTUNISTIC) {
    if (input.contentSize > input.encryptedPacketMaxContent) {
      return {
        kind: "reject-opportunistic-too-large",
        contentSize: input.contentSize,
        maxContent: input.encryptedPacketMaxContent
      };
    }
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.OPPORTUNISTIC,
      representation: LxmfDeliveryRepresentation.PACKET
    };
  }

  if (desiredMethod === LxmfDeliveryMethod.DIRECT) {
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.DIRECT,
      representation:
        input.contentSize <= input.linkPacketMaxContent
          ? LxmfDeliveryRepresentation.PACKET
          : LxmfDeliveryRepresentation.RESOURCE
    };
  }

  if (desiredMethod === LxmfDeliveryMethod.PROPAGATED) {
    if (input.propagationPackedLength === undefined) {
      throw new Error("PROPAGATED delivery planning requires propagationPackedLength");
    }
    return {
      kind: "deliver",
      method: LxmfDeliveryMethod.PROPAGATED,
      representation:
        input.propagationPackedLength > input.linkPacketMaxContent
          ? LxmfDeliveryRepresentation.RESOURCE
          : LxmfDeliveryRepresentation.PACKET
    };
  }

  return { kind: "reject-unsupported-method", method: desiredMethod };
}

export type LxMessagePackGate = "ok" | "bad-destination" | "bad-source";

/** Whether LXMessage.pack may proceed given destination/source direction and identity. */
export function planLxMessagePack(input: {
  readonly destinationDirectionOut: boolean;
  readonly sourceDirectionIn: boolean;
  readonly sourceIdentityPresent: boolean;
}): LxMessagePackGate {
  if (!input.destinationDirectionOut) {
    return "bad-destination";
  }
  if (!input.sourceDirectionIn || !input.sourceIdentityPresent) {
    return "bad-source";
  }
  return "ok";
}

export type LxmfPackTimestampPlan = "use-timestamp" | "use-now" | "reject";

/** How LXMessage.pack should obtain its timestamp (explicit / injected now / reject). */
export function planLxmfPackTimestamp(input: {
  readonly hasTimestamp: boolean;
  readonly hasNow: boolean;
}): LxmfPackTimestampPlan {
  if (input.hasTimestamp) {
    return "use-timestamp";
  }
  if (input.hasNow) {
    return "use-now";
  }
  return "reject";
}

/** Whether packing should include a stamp field (omit when deferStamp is true). */
export function shouldIncludeLxmfStamp(deferStamp: boolean | undefined): boolean {
  return deferStamp !== true;
}

export type LxmfDeliverableAcceptPlan = "accept" | "reject-unsigned" | "reject-seen";

/** Whether an unpacked LXMF deliverable should be accepted (sig + seen-hash). */
export function planLxmfDeliverableAccept(input: {
  readonly signatureValidated: boolean;
  readonly hasHash: boolean;
  readonly alreadySeen: boolean;
}): LxmfDeliverableAcceptPlan {
  if (!input.signatureValidated) {
    return "reject-unsigned";
  }
  if (input.hasHash && input.alreadySeen) {
    return "reject-seen";
  }
  return "accept";
}

/** Whether an accepted LXMF deliverable hash should be remembered in the seen set. */
export function shouldRememberLxmfMessage(hasHash: boolean): boolean {
  return hasHash;
}

/** Whether a router may register its (only) delivery identity. */
export function canRegisterLxmfDeliveryIdentity(
  deliveryDestinationPresent: boolean
): boolean {
  return !deliveryDestinationPresent;
}

/**
 * Whether changing the outbound/propagation node hash should tear down an
 * existing propagation link before the adapter clears it.
 */
export function shouldTeardownLxmfPropagationLink(linkPresent: boolean): boolean {
  return linkPresent;
}

/** Whether propagation inbound targets this router's local delivery destination. */
export function canAcceptLxmfPropagationLocalDelivery(input: {
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.deliveryDestinationPresent && input.destinationHashMatches;
}

export type LxmfPropagationLocalIngressPlan =
  | "reject-prefix"
  | "reject-destination"
  | "reject-decrypt"
  | "deliver";

/**
 * Whether propagation local-delivery ingress may unpack+callback.
 * Decrypt stays at the adapter edge (supply decryptedPresent).
 */
export function planLxmfPropagationLocalIngress(input: {
  readonly prefixedPresent: boolean;
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
  readonly decryptedPresent: boolean;
}): LxmfPropagationLocalIngressPlan {
  if (!input.prefixedPresent) {
    return "reject-prefix";
  }
  if (
    !canAcceptLxmfPropagationLocalDelivery({
      deliveryDestinationPresent: input.deliveryDestinationPresent,
      destinationHashMatches: input.destinationHashMatches
    })
  ) {
    return "reject-destination";
  }
  if (!input.decryptedPresent) {
    return "reject-decrypt";
  }
  return "deliver";
}

export type LxmfPropagationLinkReadyPlan =
  | "reuse"
  | "missing-node"
  | "missing-identity"
  | "establish";

/** Whether outbound propagation may reuse a link, establish, or must abort. */
export function planLxmfPropagationLinkReady(input: {
  readonly canReuseLink: boolean;
  readonly nodeConfigured: boolean;
  readonly nodeIdentityPresent: boolean;
}): LxmfPropagationLinkReadyPlan {
  if (input.canReuseLink) {
    return "reuse";
  }
  if (!input.nodeConfigured) {
    return "missing-node";
  }
  if (!input.nodeIdentityPresent) {
    return "missing-identity";
  }
  return "establish";
}

export type LxmfPropagatedSendPlan = "ok" | "missing-packed" | "resource-unimplemented";

/** Whether PROPAGATED send may proceed (packed envelope + PACKET representation). */
export function planLxmfPropagatedSend(input: {
  readonly hasPropagationPacked: boolean;
  readonly representation: number;
}): LxmfPropagatedSendPlan {
  if (!input.hasPropagationPacked) {
    return "missing-packed";
  }
  if (input.representation !== LxmfDeliveryRepresentation.PACKET) {
    return "resource-unimplemented";
  }
  return "ok";
}

/** LXMFRouter.send method dispatch after packed-envelope check. */
export type LxmfSendMethodPlan =
  | "opportunistic"
  | "direct"
  | "propagated"
  | "reject-unpacked"
  | "reject-unsupported";

export function planLxmfSendMethod(input: {
  readonly packed: boolean;
  readonly method: number;
}): LxmfSendMethodPlan {
  if (!input.packed) {
    return "reject-unpacked";
  }
  if (input.method === LxmfDeliveryMethod.OPPORTUNISTIC) {
    return "opportunistic";
  }
  if (input.method === LxmfDeliveryMethod.DIRECT) {
    return "direct";
  }
  if (input.method === LxmfDeliveryMethod.PROPAGATED) {
    return "propagated";
  }
  return "reject-unsupported";
}

export type LxmfDirectSendPlan = "ok" | "missing-destination" | "missing-packed";

/** Whether DIRECT send may proceed (destination identity + packed envelope). */
export function planLxmfDirectSend(input: {
  readonly destinationPresent: boolean;
  readonly destinationIdentityPresent: boolean;
  readonly packed: boolean;
}): LxmfDirectSendPlan {
  if (!input.destinationPresent || !input.destinationIdentityPresent) {
    return "missing-destination";
  }
  if (!input.packed) {
    return "missing-packed";
  }
  return "ok";
}

export type LxmfOpportunisticSendPlan = "ok" | "missing-destination";

/** Whether OPPORTUNISTIC send may proceed (destination present). */
export function planLxmfOpportunisticSend(input: {
  readonly destinationPresent: boolean;
}): LxmfOpportunisticSendPlan {
  if (!input.destinationPresent) {
    return "missing-destination";
  }
  return "ok";
}

export type LxMessageInstancePackGate =
  | "ok"
  | "already-packed"
  | "missing-endpoints"
  | "missing-timestamp";

/** Whether an LXMessage instance may pack (already-packed / endpoints / timestamp). */
export function planLxMessageInstancePack(input: {
  readonly alreadyPacked: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxMessageInstancePackGate {
  if (input.alreadyPacked) {
    return "already-packed";
  }
  if (
    !input.destinationPresent ||
    !input.sourcePresent ||
    !input.sourceIdentityPresent
  ) {
    return "missing-endpoints";
  }
  if (!input.timestampPresent) {
    return "missing-timestamp";
  }
  return "ok";
}

export type LxmfSignatureOutcome = {
  readonly signatureValidated: boolean;
  readonly unverifiedReason: LxmfUnverifiedReasonValue | null;
};

/** Signature status / unverified reason after edge crypto validation. */
export function planLxmfSignatureOutcome(input: {
  readonly sourceIdentityPresent: boolean;
  readonly signatureValid: boolean;
}): LxmfSignatureOutcome {
  if (input.sourceIdentityPresent) {
    return {
      signatureValidated: input.signatureValid,
      unverifiedReason: input.signatureValid
        ? null
        : LxmfUnverifiedReason.SIGNATURE_INVALID
    };
  }
  return {
    signatureValidated: false,
    unverifiedReason: LxmfUnverifiedReason.SOURCE_UNKNOWN
  };
}

export type LxmfPropagatedPackPrepPlan =
  | "skip"
  | "ok"
  | "missing-identity"
  | "missing-timestamp";

/**
 * Whether PROPAGATED pack prep (encrypt + envelope) may run during selectDeliveryParameters.
 * Returns `skip` when not packed or not PROPAGATED.
 */
export function planLxmfPropagatedPackPrep(input: {
  readonly packedPresent: boolean;
  readonly desiredMethod: number;
  readonly destinationIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxmfPropagatedPackPrepPlan {
  if (!input.packedPresent || input.desiredMethod !== LxmfDeliveryMethod.PROPAGATED) {
    return "skip";
  }
  if (!input.destinationIdentityPresent) {
    return "missing-identity";
  }
  if (!input.timestampPresent) {
    return "missing-timestamp";
  }
  return "ok";
}
