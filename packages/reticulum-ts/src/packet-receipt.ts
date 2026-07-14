import {
  PACKET_EXPLICIT_PROOF_SIZE,
  PACKET_SIGNATURE_SIZE,
  PacketReceiptStatus,
  isPacketTypeProof,
  packetProofHashMatches,
  planPacketReceiptCallback,
  planPacketReceiptProofAccept,
  shouldInvokePacketReceiptTimeoutCallback,
  splitPacketProof,
  stepPacketReceiptTimeout,
  type PacketReceiptStatusValue,
  type PacketReceiptTimeoutState
} from "@twistedpear/protocol";
import type { Identity } from "./identity.js";
import { Packet } from "./packet.js";
import type { Timer } from "./runtime/runtime.js";

/** Mirrors RNS/Packet.py PacketReceipt constants. */
export { PacketReceiptStatus, type PacketReceiptStatusValue };

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
  proofPacket: Packet | null = null;
  timeout: number | null = null;
  readonly callbacks: PacketReceiptCallbacks = {};
  private timeoutTimer: Timer | null = null;
  private receiptState: PacketReceiptTimeoutState = {
    status: PacketReceiptStatus.SENT,
    timeoutAt: null,
    concludedAt: null,
    timedOut: false
  };
  private readonly now: NowSeconds;

  get status(): PacketReceiptStatusValue {
    return this.receiptState.status;
  }

  set status(value: PacketReceiptStatusValue) {
    this.receiptState = { ...this.receiptState, status: value };
  }

  get concludedAt(): number | null {
    return this.receiptState.concludedAt;
  }

  set concludedAt(value: number | null) {
    this.receiptState = { ...this.receiptState, concludedAt: value };
  }

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
    const hashMatches = split !== null && packetProofHashMatches(split, this.hash);
    const signatureValid =
      split !== null && hashMatches && identity.validate(split.signature, this.hash);
    if (
      planPacketReceiptProofAccept({
        splitOk: split !== null,
        hashMatches,
        signatureValid
      }) !== "accept" ||
      split === null
    ) {
      return false;
    }

    this.receiptState = stepPacketReceiptTimeout(this.receiptState, {
      kind: "receipt/delivered",
      at: this.now()
    }).state;
    this.proved = true;
    this.callbacks.delivery?.(this);
    return true;
  }

  validateProofPacket(proofPacket: Packet, identity: Identity): boolean {
    if (!isPacketTypeProof(proofPacket.packetType)) {
      return false;
    }

    return this.validateProof(proofPacket.data, identity);
  }

  getStatus(): PacketReceiptStatusValue {
    return this.status;
  }

  setTimeout(seconds: number): void {
    this.timeout = seconds;
    this.receiptState = stepPacketReceiptTimeout(this.receiptState, {
      kind: "receipt/arm",
      at: this.now(),
      timeoutSeconds: seconds
    }).state;
  }

  setTimeoutCallback(callback: ((receipt: PacketReceipt) => void) | null): void {
    if (planPacketReceiptCallback(callback !== null) === "clear") {
      delete this.callbacks.timeout;
      return;
    }

    this.callbacks.timeout = callback!;
  }

  setDeliveryCallback(callback: ((receipt: PacketReceipt) => void) | null): void {
    if (planPacketReceiptCallback(callback !== null) === "clear") {
      delete this.callbacks.delivery;
      return;
    }

    this.callbacks.delivery = callback!;
  }

  checkTimeout(nowSeconds = this.now()): boolean {
    const stepped = stepPacketReceiptTimeout(this.receiptState, {
      kind: "receipt/check",
      at: nowSeconds
    });
    this.receiptState = stepped.state;
    if (!shouldInvokePacketReceiptTimeoutCallback(stepped.state.timedOut)) {
      return false;
    }

    this.callbacks.timeout?.(this);
    return true;
  }

  /** Mark the receipt failed (e.g. outbound send could not transmit). */
  markFailed(atSeconds = this.now()): void {
    this.receiptState = stepPacketReceiptTimeout(this.receiptState, {
      kind: "receipt/failed",
      at: atSeconds
    }).state;
  }

  cancelTimeoutTimer(): void {
    this.timeoutTimer?.cancel();
    this.timeoutTimer = null;
  }
}
