import type { Link } from "./link.js";
import { equalBytes } from "./crypto/bytes.js";
import type { PacketReceipt } from "./packet-receipt.js";
import { PacketReceiptStatus } from "./packet-receipt.js";

/** Mirrors RNS/Link.py RequestReceipt status constants. */
export const RequestReceiptStatus = {
  FAILED: 0x00,
  SENT: 0x01,
  DELIVERED: 0x02,
  RECEIVING: 0x03,
  READY: 0x04
} as const;

export type RequestReceiptStatusValue = (typeof RequestReceiptStatus)[keyof typeof RequestReceiptStatus];

export interface RequestReceiptCallbacks {
  response?: (receipt: LinkRequestReceipt) => void;
  failed?: (receipt: LinkRequestReceipt) => void;
}

export interface LinkRequestReceiptOptions {
  readonly link: Link;
  readonly requestId: Uint8Array;
  readonly timeout: number;
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

  packetReceipt: PacketReceipt | null;

  status: RequestReceiptStatusValue = RequestReceiptStatus.SENT;
  response: Uint8Array | null = null;
  progress = 0;
  concludedAt: number | null = null;
  startedAt: number | null = null;

  constructor(options: LinkRequestReceiptOptions) {
    this.link = options.link;
    this.requestId = options.requestId;
    this.hash = options.requestId;
    this.timeout = options.timeout;
    this.packetReceipt = options.packetReceipt ?? null;
    this.requestSize = options.requestSize ?? null;
    this.callbacks = options.callbacks ?? {};
    this.sentAt = Date.now() / 1000;
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
    if (this.status === RequestReceiptStatus.SENT || this.status === RequestReceiptStatus.DELIVERED) {
      this.status = RequestReceiptStatus.FAILED;
      this.concludedAt = Date.now() / 1000;
      this.link.unregisterPendingRequest(this);
      this.callbacks.failed?.(this);
    }
  }

  responseReceived(response: Uint8Array | null): void {
    this.response = response;
    this.status = RequestReceiptStatus.READY;
    this.progress = 1;
    this.concludedAt = Date.now() / 1000;
    this.link.unregisterPendingRequest(this);
    this.callbacks.response?.(this);
  }

  matchesRequestId(requestId: Uint8Array): boolean {
    return equalBytes(this.requestId, requestId);
  }
}
