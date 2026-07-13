import type { Link } from "./link.js";
import { equalBytes } from "./crypto/bytes.js";
import type { NowSeconds, PacketReceipt } from "./packet-receipt.js";
import {
  LinkRequestReceiptStatus,
  initialLinkRequestReceiptState,
  stepLinkRequestReceipt,
  type LinkRequestReceiptState,
  type LinkRequestReceiptStatusValue
} from "@twistedpear/protocol";

/** Mirrors RNS/Link.py RequestReceipt status constants. */
export const RequestReceiptStatus = LinkRequestReceiptStatus;
export type RequestReceiptStatusValue = LinkRequestReceiptStatusValue;

export interface RequestReceiptCallbacks {
  response?: (receipt: LinkRequestReceipt) => void;
  failed?: (receipt: LinkRequestReceipt) => void;
}

export interface LinkRequestReceiptOptions {
  readonly link: Link;
  readonly requestId: Uint8Array;
  readonly timeout: number;
  readonly now: NowSeconds;
  readonly packetReceipt?: PacketReceipt | null;
  readonly requestSize?: number;
  readonly callbacks?: RequestReceiptCallbacks;
}

/** Mirrors RNS/Link.py RequestReceipt for in-link request/response flows. */
export class LinkRequestReceipt {
  readonly link: Link;
  readonly requestId: Uint8Array;
  readonly hash: Uint8Array;
  readonly timeout: number;
  readonly requestSize: number | null;
  readonly callbacks: RequestReceiptCallbacks;
  readonly sentAt: number;
  private readonly now: NowSeconds;
  private receiptState: LinkRequestReceiptState = initialLinkRequestReceiptState();
  packetReceipt: PacketReceipt | null;

  get status(): RequestReceiptStatusValue {
    return this.receiptState.status;
  }

  set status(value: RequestReceiptStatusValue) {
    this.receiptState = { ...this.receiptState, status: value };
  }

  get response(): Uint8Array | null {
    return this.receiptState.response;
  }

  set response(value: Uint8Array | null) {
    this.receiptState = { ...this.receiptState, response: value };
  }

  get progress(): number {
    return this.receiptState.progress;
  }

  set progress(value: number) {
    this.receiptState = { ...this.receiptState, progress: value };
  }

  get concludedAt(): number | null {
    return this.receiptState.concludedAt;
  }

  set concludedAt(value: number | null) {
    this.receiptState = { ...this.receiptState, concludedAt: value };
  }

  startedAt: number | null;

  constructor(options: LinkRequestReceiptOptions) {
    this.link = options.link;
    this.requestId = options.requestId;
    this.hash = options.requestId;
    this.timeout = options.timeout;
    this.packetReceipt = options.packetReceipt ?? null;
    this.requestSize = options.requestSize ?? null;
    this.callbacks = options.callbacks ?? {};
    this.now = options.now;
    this.sentAt = options.now();
    this.startedAt = this.sentAt;

    if (this.packetReceipt !== null) {
      this.attachPacketReceipt(this.packetReceipt);
    }

    this.link.registerPendingRequest(this);
  }

  attachPacketReceipt(packetReceipt: PacketReceipt): void {
    this.packetReceipt = packetReceipt;
    packetReceipt.setTimeout(this.timeout);
    packetReceipt.setTimeoutCallback(() => {
      this.requestTimedOut();
    });
  }

  requestTimedOut(): void {
    const stepped = stepLinkRequestReceipt(this.receiptState, {
      kind: "request/timeout",
      at: this.now()
    });
    this.receiptState = stepped.state;
    if (stepped.actions.some((action) => action.kind === "failed")) {
      this.link.unregisterPendingRequest(this);
      this.callbacks.failed?.(this);
    }
  }

  responseReceived(response: Uint8Array | null): void {
    const stepped = stepLinkRequestReceipt(this.receiptState, {
      kind: "request/response",
      at: this.now(),
      response
    });
    this.receiptState = stepped.state;
    this.link.unregisterPendingRequest(this);
    if (stepped.actions.some((action) => action.kind === "response")) {
      this.callbacks.response?.(this);
    }
  }

  matchesRequestId(requestId: Uint8Array): boolean {
    return equalBytes(this.requestId, requestId);
  }
}
