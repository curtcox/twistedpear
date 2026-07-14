import { describe, expect, it } from "vitest";
import {
  PacketReceiptStatus,
  checkPacketReceiptTimeout,
  initialPacketReceiptTimeoutState,
  planOutboundReceiptOutcome,
  planPacketReceiptCallback,
  planPacketReceiptProofIngress,
  planUnregisterPacketReceipt,
  shouldFailAndDropOutboundReceipt,
  shouldInvokePacketReceiptTimeoutCallback,
  shouldKeepOutboundReceipt,
  shouldRegisterPacketReceipt,
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

  it("marks send-failure as failed without timing out", () => {
    let state = initialPacketReceiptTimeoutState();
    state = stepPacketReceiptTimeout(state, {
      kind: "receipt/arm",
      at: 10,
      timeoutSeconds: 5
    } as never).state;
    state = stepPacketReceiptTimeout(state, { kind: "receipt/failed", at: 11 } as never).state;
    expect(state.status).toBe(PacketReceiptStatus.FAILED);
    expect(state.concludedAt).toBe(11);
    expect(state.timedOut).toBe(false);

    const delivered = stepPacketReceiptTimeout(
      stepPacketReceiptTimeout(initialPacketReceiptTimeoutState(), {
        kind: "receipt/delivered",
        at: 1
      } as never).state,
      { kind: "receipt/failed", at: 2 } as never
    ).state;
    expect(delivered.status).toBe(PacketReceiptStatus.DELIVERED);
  });

  it("plans outbound receipt and receipt-proof ingress outcomes", () => {
    expect(planOutboundReceiptOutcome({ createReceipt: false, sent: true })).toBe("none");
    expect(planOutboundReceiptOutcome({ createReceipt: true, sent: true })).toBe("keep-receipt");
    expect(planOutboundReceiptOutcome({ createReceipt: true, sent: false })).toBe(
      "fail-and-drop-receipt"
    );
    expect(
      shouldFailAndDropOutboundReceipt({ failAndDrop: true, receiptPresent: true })
    ).toBe(true);
    expect(
      shouldFailAndDropOutboundReceipt({ failAndDrop: true, receiptPresent: false })
    ).toBe(false);
    expect(shouldKeepOutboundReceipt(true)).toBe(true);
    expect(shouldKeepOutboundReceipt(false)).toBe(false);
    expect(
      planPacketReceiptProofIngress({
        truncatedHashMatches: true,
        identityPresent: true,
        proofAccepted: true
      })
    ).toBe("remove-receipt");
    expect(
      planPacketReceiptProofIngress({
        truncatedHashMatches: true,
        identityPresent: true,
        proofAccepted: false
      })
    ).toBe("continue");
    expect(planUnregisterPacketReceipt(2)).toBe(2);
    expect(planUnregisterPacketReceipt(-1)).toBeNull();
    expect(shouldRegisterPacketReceipt(true)).toBe(true);
    expect(shouldRegisterPacketReceipt(false)).toBe(false);
    expect(planPacketReceiptCallback(true)).toBe("set");
    expect(planPacketReceiptCallback(false)).toBe("clear");
    expect(shouldInvokePacketReceiptTimeoutCallback(true)).toBe(true);
    expect(shouldInvokePacketReceiptTimeoutCallback(false)).toBe(false);
  });
});
