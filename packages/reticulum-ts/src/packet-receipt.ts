import {
  checkPacketReceiptTimeout,
  PACKET_EXPLICIT_PROOF_SIZE,
  PACKET_SIGNATURE_SIZE,
  packetProofHashMatches,
  splitPacketProof
} from "@twistedpear/protocol";
import type { Identity } from "./identity.js";
import { Packet, PacketType } from "./packet.js";
import type { Timer } from "./runtime/runtime.js";

/** Mirrors RNS/Packet.py PacketReceipt constants. */
export const PacketReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  CULLED: 0xff
} as const;

export type PacketReceiptStatusValue = (typeof PacketReceiptStatus)[keyof typeof PacketReceiptStatus];

export const EXPLICIT_PROOF_LENGTH = PACKET_EXPLICIT_PROOF_SIZE;
export const IMPLICIT_PROOF_LENGTH = PACKET_SIGNATURE_SIZE;

/** Injected clock in seconds — protocol code never reads wall time directly. */
export type NowSeconds = () => number;

export interface PacketReceiptCallbacks {
  delivery?: (receipt: PacketReceipt) => void;
  timeout?: (receipt: PacketReceipt) => void;
}

export interface PacketReceiptOptions {
  readonly sentAt: number;
  readonly now: NowSeconds;
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
  timeout: number | null = null;
  readonly callbacks: PacketReceiptCallbacks = {};
  private timeoutTimer: Timer | null = null;
  private timeoutAt: number | null = null;
  private readonly now: NowSeconds;

  constructor(
    readonly packetHash: Uint8Array,
    truncatedHash: Uint8Array,
    targetDestinationHash: Uint8Array,
    options: PacketReceiptOptions
  ) {
    this.hash = packetHash;
    this.truncatedHash = truncatedHash;
    this.targetDestinationHash = targetDestinationHash;
    this.sentAt = options.sentAt;
    this.now = options.now;
  }

  validateProof(proof: Uint8Array, identity: Identity): boolean {
    const split = splitPacketProof(proof);
    if (split === null || !packetProofHashMatches(split, this.hash)) {
      return false;
    }

    if (!identity.validate(split.signature, this.hash)) {
      return false;
    }

    this.status = PacketReceiptStatus.DELIVERED;
    this.proved = true;
    this.concludedAt = this.now();
    this.callbacks.delivery?.(this);
    return true;
  }

  validateProofPacket(proofPacket: Packet, identity: Identity): boolean {
    if (proofPacket.packetType !== PacketType.PROOF) {
      return false;
    }

    return this.validateProof(proofPacket.data, identity);
  }

  getStatus(): PacketReceiptStatusValue {
    return this.status;
  }

  setTimeout(seconds: number): void {
    this.timeout = seconds;
    this.timeoutAt = this.now() + seconds;
  }

  setTimeoutCallback(callback: ((receipt: PacketReceipt) => void) | null): void {
    if (callback === null) {
      delete this.callbacks.timeout;
      return;
    }

    this.callbacks.timeout = callback;
  }

  setDeliveryCallback(callback: ((receipt: PacketReceipt) => void) | null): void {
    if (callback === null) {
      delete this.callbacks.delivery;
      return;
    }

    this.callbacks.delivery = callback;
  }

  checkTimeout(nowSeconds = this.now()): boolean {
    const result = checkPacketReceiptTimeout({
      status: this.status,
      timeoutAt: this.timeoutAt,
      nowSeconds
    });
    if (!result.timedOut) {
      return false;
    }

    this.status = PacketReceiptStatus.FAILED;
    this.concludedAt = result.concludedAt;
    this.callbacks.timeout?.(this);
    return true;
  }

  cancelTimeoutTimer(): void {
    this.timeoutTimer?.cancel();
    this.timeoutTimer = null;
  }
}
