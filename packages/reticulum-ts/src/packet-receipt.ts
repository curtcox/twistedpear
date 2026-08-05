import {
  PACKET_EXPLICIT_PROOF_SIZE,
  PACKET_SIGNATURE_SIZE,
  PacketReceiptStatus,
  RECEIPT_TIMEOUT_TIMER_ID,
  packetProofFieldsFromActions,
  initialAcceptPacketReceiptProofState,
  initialPacketProofHashMatchState,
  initialPacketReceiptCallbackState,
  initialPacketReceiptProofAcceptState,
  initialPacketTypeProofState,
  initialSplitPacketProofState,
  shouldAcceptPacketReceiptProofActions,
  shouldAcceptPacketReceiptProofNow,
  shouldClearPacketReceiptCallback,
  shouldInvokePacketReceiptAction,
  shouldMatchPacketProofHash,
  shouldRejectSplitPacketProof,
  shouldTreatPacketTypeProof,
  shouldUseSplitPacketProof,
  stepAcceptPacketReceiptProofWithActions,
  stepPacketProofHashMatchWithActions,
  stepPacketReceiptCallbackWithActions,
  stepPacketReceiptProofAcceptWithActions,
  stepPacketReceiptTimeoutWithActions,
  stepPacketTypeProofWithActions,
  stepSplitPacketProofWithActions,
  type PacketReceiptStatusValue,
  type PacketReceiptTimeoutAction,
  type PacketReceiptTimeoutState
} from "@twistedpear/protocol";
import type { Intent } from "@twistedpear/effects";
import type { Identity } from "./identity.js";
import { Packet } from "./packet.js";
import type { Clock, Timer } from "./runtime/runtime.js";

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
  /** When provided, timeout arms schedule real timers from protocol intents. */
  readonly clock?: Clock;
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
  private readonly clock: Clock | null;

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
    this.clock = options.clock ?? null;
  }

  validateProof(proof: Uint8Array, identity: Identity): boolean {
    const stepped = stepSplitPacketProofWithActions(initialSplitPacketProofState(), {
      kind: "packet-proof/split-gate",
      proof
    });
    const split =
      shouldRejectSplitPacketProof(stepped.actions) ||
      !shouldUseSplitPacketProof(stepped.actions)
        ? null
        : packetProofFieldsFromActions(stepped.actions);
    const hashMatches =
      split !== null &&
      shouldMatchPacketProofHash(
        stepPacketProofHashMatchWithActions(initialPacketProofHashMatchState(), {
          kind: "packet-proof/hash-match-gate",
          proof: split,
          packetHash: this.hash
        }).actions
      );
    const signatureValid =
      split !== null && hashMatches && identity.validate(split.signature, this.hash);
    const acceptStepped = stepPacketReceiptProofAcceptWithActions(
      initialPacketReceiptProofAcceptState(),
      {
        kind: "receipt/proof-accept-gate",
        splitOk: split !== null,
        hashMatches,
        signatureValid
      }
    );
    const commitStepped = stepAcceptPacketReceiptProofWithActions(
      initialAcceptPacketReceiptProofState(),
      {
        kind: "receipt/accept-proof-gate",
        planAccept: shouldAcceptPacketReceiptProofActions(acceptStepped.actions),
        splitPresent: split !== null
      }
    );
    if (!shouldAcceptPacketReceiptProofNow(commitStepped.actions)) {
      return false;
    }

    this.applyReceiptStep(
      stepPacketReceiptTimeoutWithActions(this.receiptState, {
        kind: "receipt/delivered",
        at: this.now()
      })
    );
    this.proved = true;
    return true;
  }

  validateProofPacket(proofPacket: Packet, identity: Identity): boolean {
    /** Adapt packet-type proof via protocol actions (no ad-hoc
     * `isPacketTypeProof` reads). */
    const typeStepped = stepPacketTypeProofWithActions(initialPacketTypeProofState(), {
      kind: "packet-proof/packet-type-gate",
      packetType: proofPacket.packetType
    });
    if (!shouldTreatPacketTypeProof(typeStepped.actions)) {
      return false;
    }

    return this.validateProof(proofPacket.data, identity);
  }

  getStatus(): PacketReceiptStatusValue {
    return this.status;
  }

  setTimeout(seconds: number): void {
    this.timeout = seconds;
    this.applyReceiptStep(
      stepPacketReceiptTimeoutWithActions(this.receiptState, {
        kind: "receipt/arm",
        at: this.now(),
        timeoutSeconds: seconds
      })
    );
  }

  setTimeoutCallback(callback: ((receipt: PacketReceipt) => void) | null): void {
    const stepped = stepPacketReceiptCallbackWithActions(initialPacketReceiptCallbackState(), {
      kind: "receipt/callback-gate",
      callbackPresent: callback !== null
    });
    if (shouldClearPacketReceiptCallback(stepped.actions)) {
      delete this.callbacks.timeout;
      return;
    }

    this.callbacks.timeout = callback!;
  }

  setDeliveryCallback(callback: ((receipt: PacketReceipt) => void) | null): void {
    const stepped = stepPacketReceiptCallbackWithActions(initialPacketReceiptCallbackState(), {
      kind: "receipt/callback-gate",
      callbackPresent: callback !== null
    });
    if (shouldClearPacketReceiptCallback(stepped.actions)) {
      delete this.callbacks.delivery;
      return;
    }

    this.callbacks.delivery = callback!;
  }

  checkTimeout(nowSeconds = this.now()): boolean {
    const stepped = stepPacketReceiptTimeoutWithActions(this.receiptState, {
      kind: "receipt/check",
      at: nowSeconds
    });
    this.applyReceiptStep(stepped);
    return shouldInvokePacketReceiptAction(stepped.actions, "timeout");
  }

  /** Mark the receipt failed (e.g. outbound send could not transmit). */
  markFailed(atSeconds = this.now()): void {
    this.applyReceiptStep(
      stepPacketReceiptTimeoutWithActions(this.receiptState, {
        kind: "receipt/failed",
        at: atSeconds
      })
    );
  }

  cancelTimeoutTimer(): void {
    this.timeoutTimer?.cancel();
    this.timeoutTimer = null;
  }

  private applyReceiptStep(result: {
    readonly state: PacketReceiptTimeoutState;
    readonly intents: readonly Intent[];
    readonly actions: readonly PacketReceiptTimeoutAction[];
  }): void {
    this.receiptState = result.state;
    for (const intent of result.intents) {
      if (intent.kind === "timer/cancel" && intent.timer.id === RECEIPT_TIMEOUT_TIMER_ID) {
        this.cancelTimeoutTimer();
      }
      if (intent.kind === "timer/set" && intent.timer.id === RECEIPT_TIMEOUT_TIMER_ID) {
        this.scheduleTimeout(intent.timer.delayMs);
      }
    }
    this.applyReceiptActions(result.actions);
  }

  private applyReceiptActions(actions: readonly PacketReceiptTimeoutAction[]): void {
    for (const action of actions) {
      if (action.kind === "timeout") {
        this.callbacks.timeout?.(this);
      } else if (action.kind === "delivered") {
        this.callbacks.delivery?.(this);
      }
    }
  }

  private scheduleTimeout(delayMs: number): void {
    this.cancelTimeoutTimer();
    if (this.clock === null) {
      return;
    }

    this.timeoutTimer = this.clock.setTimeout(() => {
      this.timeoutTimer = null;
      const stepped = stepPacketReceiptTimeoutWithActions(this.receiptState, {
        kind: "timer/fired",
        id: RECEIPT_TIMEOUT_TIMER_ID,
        at: this.clock!.now()
      });
      this.applyReceiptStep(stepped);
    }, delayMs);
  }
}
