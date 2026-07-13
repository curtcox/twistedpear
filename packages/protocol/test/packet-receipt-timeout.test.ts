import { describe, expect, it } from "vitest";
import {
  PacketReceiptStatus,
  checkPacketReceiptTimeout,
  initialPacketReceiptTimeoutState,
  stepPacketReceiptTimeout
} from "../src/packet-receipt-timeout.js";

describe("protocol packet receipt timeout", () => {
  it("times out after the deadline", () => {
    expect(
      checkPacketReceiptTimeout({
        status: PacketReceiptStatus.SENT,
        timeoutAt: 105,
        nowSeconds: 104
      }).timedOut
    ).toBe(false);

    const timed = checkPacketReceiptTimeout({
      status: PacketReceiptStatus.SENT,
      timeoutAt: 105,
      nowSeconds: 105
    });
    expect(timed.timedOut).toBe(true);
    expect(timed.status).toBe(PacketReceiptStatus.FAILED);
    expect(timed.concludedAt).toBe(105);
  });

  it("does not time out delivered receipts", () => {
    expect(
      checkPacketReceiptTimeout({
        status: PacketReceiptStatus.DELIVERED,
        timeoutAt: 1,
        nowSeconds: 100
      }).timedOut
    ).toBe(false);
  });

  it("step machine arms and concludes", () => {
    let state = initialPacketReceiptTimeoutState();
    state = stepPacketReceiptTimeout(state, {
      kind: "receipt/arm",
      at: 1000,
      timeoutSeconds: 5
    } as never).state;
    expect(state.timeoutAt).toBe(1005);

    state = stepPacketReceiptTimeout(state, { kind: "receipt/check", at: 1005 } as never).state;
    expect(state.timedOut).toBe(true);
    expect(state.status).toBe(PacketReceiptStatus.FAILED);
  });
});
