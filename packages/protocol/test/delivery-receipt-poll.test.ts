import { describe, expect, it } from "vitest";
import {
  DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS,
  DELIVERY_RECEIPT_POLL_INTERVAL_MS,
  ReceiptPollStatus,
  initialDeliveryReceiptPollState,
  stepDeliveryReceiptPoll
} from "../src/delivery-receipt-poll.js";

describe("protocol delivery receipt poll", () => {
  it("arms without scheduling until the first poll tick", () => {
    const result = stepDeliveryReceiptPoll(initialDeliveryReceiptPollState(), {
      kind: "poll/arm",
      at: 1_000,
      timeoutMs: DELIVERY_RECEIPT_POLL_DEFAULT_TIMEOUT_MS
    } as never);
    expect(result.state.armed).toBe(true);
    expect(result.state.deadlineMs).toBe(1_500);
    expect(result.intents).toEqual([]);
  });

  it("concludes when receipt is delivered", () => {
    let state = initialDeliveryReceiptPollState();
    state = stepDeliveryReceiptPoll(state, {
      kind: "poll/arm",
      at: 0,
      timeoutMs: 500
    } as never).state;
    const result = stepDeliveryReceiptPoll(state, {
      kind: "poll/receipt-status",
      status: ReceiptPollStatus.DELIVERED
    } as never);
    expect(result.state.concluded).toBe(true);
    expect(result.intents).toEqual([]);
  });

  it("keeps polling until deadline then concludes", () => {
    let state = initialDeliveryReceiptPollState();
    let intents = stepDeliveryReceiptPoll(state, {
      kind: "poll/arm",
      at: 0,
      timeoutMs: 30
    } as never);
    state = intents.state;

    intents = stepDeliveryReceiptPoll(state, {
      kind: "timer/fired",
      id: "delivery-poll",
      at: 10
    });
    expect(intents.state.concluded).toBe(false);
    expect(intents.intents[0]?.kind).toBe("timer/set");

    intents = stepDeliveryReceiptPoll(intents.state, {
      kind: "timer/fired",
      id: "delivery-poll",
      at: 30
    });
    expect(intents.state.concluded).toBe(true);
  });

  it("double-runs identically", () => {
    const run = () => {
      let state = initialDeliveryReceiptPollState();
      const steps = [];
      steps.push(stepDeliveryReceiptPoll(state, { kind: "poll/arm", at: 100, timeoutMs: 50 } as never));
      state = steps[0]!.state;
      steps.push(
        stepDeliveryReceiptPoll(state, {
          kind: "poll/receipt-status",
          status: ReceiptPollStatus.FAILED
        } as never)
      );
      return steps.map((step) => ({ concluded: step.state.concluded, intents: step.intents }));
    };
    expect(run()).toEqual(run());
  });
});
