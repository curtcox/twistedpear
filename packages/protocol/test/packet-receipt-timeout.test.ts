import { describe, expect, it } from "vitest";
import {
  PacketReceiptStatus,
  RECEIPT_TIMEOUT_TIMER_ID,
  checkPacketReceiptTimeout,
  initialPacketReceiptTimeoutState,
  planOutboundReceiptOutcome,
  planPacketReceiptCallback,
  planPacketReceiptProofIngress,
  planUnregisterPacketReceipt,
  shouldArmPacketReceiptTimeoutTimer,
  shouldFailAndDropOutboundReceipt,
  shouldInvokePacketReceiptTimeoutCallback,
  shouldKeepOutboundReceipt,
  shouldRegisterPacketReceipt,
  shouldUnregisterPacketReceipt,
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

  it("step machine arms with timer intents and concludes", () => {
    const armed = stepPacketReceiptTimeout(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 1000,
      timeoutSeconds: 5
    } as never);
    expect(armed.state.timeoutAt).toBe(1005);
    expect(shouldArmPacketReceiptTimeoutTimer(5)).toBe(true);
    expect(armed.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } },
      {
        kind: "timer/set",
        timer: { id: RECEIPT_TIMEOUT_TIMER_ID, delayMs: 5_000 }
      }
    ]);

    const checked = stepPacketReceiptTimeout(armed.state, {
      kind: "receipt/check",
      at: 1005
    } as never);
    expect(checked.state.timedOut).toBe(true);
    expect(checked.state.status).toBe(PacketReceiptStatus.FAILED);
    expect(checked.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ]);
  });

  it("cancels the timer on deliver/fail and concludes on timer/fired", () => {
    let state = stepPacketReceiptTimeout(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 10,
      timeoutSeconds: 5
    } as never).state;

    const failed = stepPacketReceiptTimeout(state, {
      kind: "receipt/failed",
      at: 11
    } as never);
    expect(failed.state.status).toBe(PacketReceiptStatus.FAILED);
    expect(failed.state.concludedAt).toBe(11);
    expect(failed.state.timedOut).toBe(false);
    expect(failed.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ]);

    const delivered = stepPacketReceiptTimeout(initialPacketReceiptTimeoutState(), {
      kind: "receipt/delivered",
      at: 1
    } as never);
    expect(delivered.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ]);
    expect(
      stepPacketReceiptTimeout(delivered.state, { kind: "receipt/failed", at: 2 } as never).state
        .status
    ).toBe(PacketReceiptStatus.DELIVERED);

    state = stepPacketReceiptTimeout(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 1,
      timeoutSeconds: 2
    } as never).state;
    const fired = stepPacketReceiptTimeout(state, {
      kind: "timer/fired",
      id: RECEIPT_TIMEOUT_TIMER_ID,
      at: 3_000
    });
    expect(fired.state.timedOut).toBe(true);
    expect(fired.state.status).toBe(PacketReceiptStatus.FAILED);
    expect(fired.intents).toEqual([]);
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
    expect(shouldUnregisterPacketReceipt(true)).toBe(true);
    expect(shouldUnregisterPacketReceipt(false)).toBe(false);
    expect(shouldRegisterPacketReceipt(true)).toBe(true);
    expect(shouldRegisterPacketReceipt(false)).toBe(false);
    expect(planPacketReceiptCallback(true)).toBe("set");
    expect(planPacketReceiptCallback(false)).toBe("clear");
    expect(shouldInvokePacketReceiptTimeoutCallback(true)).toBe(true);
    expect(shouldInvokePacketReceiptTimeoutCallback(false)).toBe(false);
    expect(shouldArmPacketReceiptTimeoutTimer(0)).toBe(false);
  });

  it("double-runs identically", () => {
    const run = () => {
      const steps = [];
      let state = initialPacketReceiptTimeoutState();
      steps.push(
        stepPacketReceiptTimeout(state, {
          kind: "receipt/arm",
          at: 100,
          timeoutSeconds: 1
        } as never)
      );
      state = steps[0]!.state;
      steps.push(
        stepPacketReceiptTimeout(state, {
          kind: "timer/fired",
          id: RECEIPT_TIMEOUT_TIMER_ID,
          at: 1_100
        })
      );
      return steps.map((step) => ({
        status: step.state.status,
        timedOut: step.state.timedOut,
        concludedAt: step.state.concludedAt,
        intents: step.intents
      }));
    };
    expect(run()).toEqual(run());
  });
});
