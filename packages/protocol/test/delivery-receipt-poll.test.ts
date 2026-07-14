import { describe, expect, it } from "vitest";
import {
  DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS,
  DELIVERY_RECEIPT_POLL_INTERVAL_MS,
  DELIVERY_RECEIPT_POLL_TIMER_ID,
  ReceiptPollStatus,
  initialDeliveryReceiptPollState,
  stepDeliveryReceiptPollWithActions
} from "../src/delivery-receipt-poll.js";

describe("protocol delivery receipt poll", () => {
  it("arms with an immediate probe action", () => {
    const result = stepDeliveryReceiptPollWithActions(initialDeliveryReceiptPollState(), {
      kind: "poll/arm",
      at: 1_000,
      timeoutMs: DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS
    });
    expect(result.state.armed).toBe(true);
    expect(result.state.deadlineMs).toBe(1_500);
    expect(result.intents).toEqual([]);
    expect(result.actions).toEqual([{ kind: "probe" }]);
  });

  it("concludes when receipt is delivered and cancels the poll timer", () => {
    let state = initialDeliveryReceiptPollState();
    state = stepDeliveryReceiptPollWithActions(state, {
      kind: "poll/arm",
      at: 0,
      timeoutMs: 500
    }).state;
    const result = stepDeliveryReceiptPollWithActions(state, {
      kind: "poll/receipt-status",
      status: ReceiptPollStatus.DELIVERED,
      at: 0
    });
    expect(result.state.concluded).toBe(true);
    expect(result.intents).toEqual([
      { kind: "timer/cancel", timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID } }
    ]);
  });

  it("keeps polling until deadline then concludes", () => {
    let state = initialDeliveryReceiptPollState();
    let step = stepDeliveryReceiptPollWithActions(state, {
      kind: "poll/arm",
      at: 0,
      timeoutMs: 30
    });
    expect(step.actions).toEqual([{ kind: "probe" }]);
    state = step.state;

    step = stepDeliveryReceiptPollWithActions(state, {
      kind: "poll/receipt-status",
      status: ReceiptPollStatus.SENT,
      at: 0
    });
    expect(step.state.concluded).toBe(false);
    expect(step.intents).toEqual([
      {
        kind: "timer/set",
        timer: { id: DELIVERY_RECEIPT_POLL_TIMER_ID, delayMs: DELIVERY_RECEIPT_POLL_INTERVAL_MS }
      }
    ]);
    state = step.state;

    step = stepDeliveryReceiptPollWithActions(state, {
      kind: "timer/fired",
      id: DELIVERY_RECEIPT_POLL_TIMER_ID,
      at: 10
    });
    expect(step.state.concluded).toBe(false);
    expect(step.actions).toEqual([{ kind: "probe" }]);
    state = step.state;

    step = stepDeliveryReceiptPollWithActions(state, {
      kind: "poll/receipt-status",
      status: ReceiptPollStatus.SENT,
      at: 10
    });
    expect(step.state.concluded).toBe(false);
    expect(step.intents[0]?.kind).toBe("timer/set");
    state = step.state;

    step = stepDeliveryReceiptPollWithActions(state, {
      kind: "timer/fired",
      id: DELIVERY_RECEIPT_POLL_TIMER_ID,
      at: 30
    });
    expect(step.actions).toEqual([{ kind: "probe" }]);
    state = step.state;

    step = stepDeliveryReceiptPollWithActions(state, {
      kind: "poll/receipt-status",
      status: ReceiptPollStatus.SENT,
      at: 30
    });
    expect(step.state.concluded).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialDeliveryReceiptPollState();
      const steps = [];
      steps.push(
        stepDeliveryReceiptPollWithActions(state, {
          kind: "poll/arm",
          at: 100,
          timeoutMs: 50
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepDeliveryReceiptPollWithActions(state, {
          kind: "poll/receipt-status",
          status: ReceiptPollStatus.FAILED,
          at: 100
        })
      );
      return steps.map((s) => ({
        concluded: s.state.concluded,
        intents: s.intents,
        actions: s.actions
      }));
    };
    expect(run()).toEqual(run());
  });
});
