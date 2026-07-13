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
