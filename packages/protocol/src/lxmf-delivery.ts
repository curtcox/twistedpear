/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 */

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

/** Whether propagation inbound targets this router's local delivery destination. */
export function canAcceptLxmfPropagationLocalDelivery(input: {
  readonly deliveryDestinationPresent: boolean;
  readonly destinationHashMatches: boolean;
}): boolean {
  return input.deliveryDestinationPresent && input.destinationHashMatches;
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
