import { equalBytes } from "./crypto/bytes.js";
import type { Identity } from "./identity.js";
import { Packet, PacketType } from "./packet.js";

/** Mirrors RNS/Packet.py PacketReceipt constants. */
export const PacketReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
} as const;

export type PacketReceiptStatusValue = (typeof PacketReceiptStatus)[keyof typeof PacketReceiptStatus];

export const EXPLICIT_PROOF_LENGTH = 32 + 64;
export const IMPLICIT_PROOF_LENGTH = 64;

export interface PacketReceiptCallbacks {
  delivery?: (receipt: PacketReceipt) => void;
}

export class PacketReceipt {
  readonly hash: Uint8Array;
  readonly truncatedHash: Uint8Array;
  readonly targetDestinationHash: Uint8Array;
  sent = true;
  sentAt: number;
  proved = false;
  status: PacketReceiptStatusValue = PacketReceiptStatus.SENT;
  concludedAt: number | null = null;
  proofPacket: Packet | null = null;
  readonly callbacks: PacketReceiptCallbacks = {};

  constructor(
    readonly packetHash: Uint8Array,
    truncatedHash: Uint8Array,
    targetDestinationHash: Uint8Array,
    sentAt = Date.now() / 1000
  ) {
    this.hash = packetHash;
    this.truncatedHash = truncatedHash;
    this.targetDestinationHash = targetDestinationHash;
    this.sentAt = sentAt;
  }

  validateProof(proof: Uint8Array, identity: Identity): boolean {
    if (proof.length === EXPLICIT_PROOF_LENGTH) {
      const proofHash = proof.subarray(0, 32);
      const signature = proof.subarray(32);
      if (!equalBytes(proofHash, this.hash)) {
        return false;
      }

      if (!identity.validate(signature, this.hash)) {
        return false;
      }

      this.status = PacketReceiptStatus.DELIVERED;
      this.proved = true;
      this.concludedAt = Date.now() / 1000;
      this.callbacks.delivery?.(this);
      return true;
    }

    if (proof.length === IMPLICIT_PROOF_LENGTH) {
      if (!identity.validate(proof, this.hash)) {
        return false;
      }

      this.status = PacketReceiptStatus.DELIVERED;
      this.proved = true;
      this.concludedAt = Date.now() / 1000;
      this.callbacks.delivery?.(this);
      return true;
    }

    return false;
  }

  validateProofPacket(proofPacket: Packet, identity: Identity): boolean {
    if (proofPacket.packetType !== PacketType.PROOF) {
      return false;
    }

    return this.validateProof(proofPacket.data, identity);
  }
}
