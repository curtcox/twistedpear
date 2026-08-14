import { describe, expect, it } from "vitest";
import {
  ChannelWindowLimits,
  applyChannelDelivery,
  applyChannelTimeout,
  channelAllowsSend,
  channelPacketTimeoutFromActions,
  channelPacketTimeoutSeconds,
  channelRetryExhausted,
  channelTxOutstandingCountFromActions,
  countChannelTxOutstanding,
  canArmChannelPacketReceipt,
  initialArmChannelPacketReceiptState,
  initialChannelAllowsSendState,
  initialChannelOutletTransmitState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelSendPlanState,
  initialChannelSendState,
  initialChannelWindowState,
  initialCountChannelTxOutstandingState,
  initialExtendPacketReceiptTimeoutState,
  isChannelOutletTransmitOk,
  planChannelSend,
  channelSendPlanFromActions,
  shouldAcceptChannelOutletTransmit,
  shouldAllowChannelSend,
  shouldArmChannelPacketReceiptNow,
  shouldDenyChannelSend,
  shouldExtendPacketReceiptTimeout,
  shouldExtendPacketReceiptTimeoutNow,
  shouldProceedChannelSend,
  shouldProceedChannelSendPlan,
  shouldRejectChannelOutletTransmit,
  shouldRejectChannelSendLinkNotReady,
  shouldRejectChannelSendPlanLinkNotReady,
  shouldRejectChannelSendPlanTooBig,
  shouldRejectChannelSendTooBig,
  shouldSkipArmChannelPacketReceipt,
  shouldSkipExtendPacketReceiptTimeout,
  shouldUseChannelPacketTimeout,
  shouldUseChannelTxOutstandingCount,
  stepArmChannelPacketReceiptWithActions,
  stepChannelAllowsSendWithActions,
  stepChannelOutletTransmitWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepChannelSendPlanWithActions,
  stepChannelSendWithActions,
  stepCountChannelTxOutstandingWithActions,
  stepExtendPacketReceiptTimeoutWithActions,
} from "../src/channel-window.js";

describe("protocol channel window", () => {
  it("initializes a constrained window for slow RTT", () => {
    const slow = initialChannelWindowState(ChannelWindowLimits.RTT_SLOW + 0.1);
    expect(slow).toEqual({
      window: 1,
      windowMax: 1,
      windowMin: 1,
      windowFlexibility: 1,
      fastRateRounds: 0,
      mediumRateRounds: 0,
    });

    const normal = initialChannelWindowState(0.5);
    expect(normal.window).toBe(ChannelWindowLimits.WINDOW);
    expect(normal.windowMax).toBe(ChannelWindowLimits.WINDOW_MAX_SLOW);
  });

  it("computes packet timeouts deterministically", () => {
    const a = channelPacketTimeoutSeconds({
      tries: 2,
      rtt: 0.2,
      txRingLength: 1,
    });
    const b = channelPacketTimeoutSeconds({
      tries: 2,
      rtt: 0.2,
      txRingLength: 1,
    });
    expect(a).toBe(b);
    expect(a).toBeGreaterThan(0);
  });

  it("emits packet timeout only from use-timeout actions", () => {
    const stepped = stepChannelPacketTimeoutSecondsWithActions(
      initialChannelPacketTimeoutSecondsState(),
      {
        kind: "channel/packet-timeout-gate",
        tries: 2,
        rtt: 0.2,
        txRingLength: 1,
      },
    );
    expect(shouldUseChannelPacketTimeout(stepped.actions)).toBe(true);
    expect(channelPacketTimeoutFromActions(stepped.actions)).toBe(
      channelPacketTimeoutSeconds({ tries: 2, rtt: 0.2, txRingLength: 1 }),
    );

    const empty = stepChannelPacketTimeoutSecondsWithActions(
      initialChannelPacketTimeoutSecondsState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseChannelPacketTimeout(empty.actions)).toBe(false);
    expect(channelPacketTimeoutFromActions(empty.actions)).toBeNull();
  });

  it("shrinks on timeout and grows on delivery", () => {
    let state = initialChannelWindowState(0.5);
    state = { ...state, window: 3, windowMax: 7 };
    state = applyChannelTimeout(state);
    expect(state.window).toBe(2);
    // windowMax shrinks only while > windowMin + flexibility (2 + 4)
    expect(state.windowMax).toBe(6);

    state = applyChannelDelivery(state, 0.5);
    expect(state.window).toBe(3);
  });

  it("promotes to medium window after enough medium-RTT deliveries", () => {
    let state = initialChannelWindowState(0.5);
    for (let i = 0; i < ChannelWindowLimits.FAST_RATE_THRESHOLD; i += 1) {
      state = applyChannelDelivery(state, 0.5);
    }
    expect(state.windowMax).toBe(ChannelWindowLimits.WINDOW_MAX_MEDIUM);
    expect(state.windowMin).toBe(ChannelWindowLimits.WINDOW_MIN_LIMIT_MEDIUM);
  });

  it("gates send readiness", () => {
    expect(
      channelAllowsSend({ isUsable: true, outstanding: 1, window: 2 }),
    ).toBe(true);
    expect(
      channelAllowsSend({ isUsable: true, outstanding: 2, window: 2 }),
    ).toBe(false);
    expect(
      channelAllowsSend({ isUsable: false, outstanding: 0, window: 2 }),
    ).toBe(false);
    expect(channelRetryExhausted(5, 5)).toBe(true);
    expect(channelRetryExhausted(4, 5)).toBe(false);
  });

  it("emits TX outstanding only from use-count actions", () => {
    const entries = [
      { packetPresent: true, delivered: false },
      { packetPresent: true, delivered: true },
      { packetPresent: false, delivered: false },
    ];
    const stepped = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "channel/tx-outstanding-gate",
        entries,
      },
    );
    expect(shouldUseChannelTxOutstandingCount(stepped.actions)).toBe(true);
    expect(channelTxOutstandingCountFromActions(stepped.actions)).toBe(
      countChannelTxOutstanding(entries),
    );
    expect(channelTxOutstandingCountFromActions(stepped.actions)).toBe(2);

    const empty = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseChannelTxOutstandingCount(empty.actions)).toBe(false);
    expect(channelTxOutstandingCountFromActions(empty.actions)).toBeNull();
  });

  it("emits send-allow only from allow/deny actions", () => {
    const allowed = stepChannelAllowsSendWithActions(
      initialChannelAllowsSendState(),
      {
        kind: "channel/allows-send-gate",
        isUsable: true,
        outstanding: 1,
        window: 2,
      },
    );
    expect(shouldAllowChannelSend(allowed.actions)).toBe(true);
    expect(shouldDenyChannelSend(allowed.actions)).toBe(false);

    const denied = stepChannelAllowsSendWithActions(
      initialChannelAllowsSendState(),
      {
        kind: "channel/allows-send-gate",
        isUsable: true,
        outstanding: 2,
        window: 2,
      },
    );
    expect(shouldAllowChannelSend(denied.actions)).toBe(false);
    expect(shouldDenyChannelSend(denied.actions)).toBe(true);

    const empty = stepChannelAllowsSendWithActions(
      initialChannelAllowsSendState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldAllowChannelSend(empty.actions)).toBe(false);
    expect(shouldDenyChannelSend(empty.actions)).toBe(false);
  });
});

describe("protocol channel window (continued)", () => {
  it("plans channel send ready / too-big / proceed", () => {
    expect(
      planChannelSend({
        ready: false,
        packedLength: null,
        mdu: 100,
      }),
    ).toBe("link-not-ready");
    expect(
      planChannelSend({
        ready: true,
        packedLength: null,
        mdu: 100,
      }),
    ).toBe("proceed");
    expect(
      planChannelSend({
        ready: true,
        packedLength: 50,
        mdu: 100,
      }),
    ).toBe("proceed");
    expect(
      planChannelSend({
        ready: true,
        packedLength: 200,
        mdu: 100,
      }),
    ).toBe("too-big");
  });

  it("emits channel send actions from WithActions step", () => {
    const notReady = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: false,
      packedLength: null,
      mdu: 100,
    });
    expect(shouldRejectChannelSendLinkNotReady(notReady.actions)).toBe(true);

    const tooBig = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: true,
      packedLength: 200,
      mdu: 100,
    });
    expect(shouldRejectChannelSendTooBig(tooBig.actions)).toBe(true);

    const proceed = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: true,
      packedLength: 50,
      mdu: 100,
    });
    expect(proceed.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedChannelSend(proceed.actions)).toBe(true);
  });

  it("emits channel send-plan actions from PlanWithActions", () => {
    const notReady = stepChannelSendPlanWithActions(
      initialChannelSendPlanState(),
      {
        kind: "channel/send-plan-gate",
        ready: false,
        packedLength: null,
        mdu: 100,
      },
    );
    expect(shouldRejectChannelSendPlanLinkNotReady(notReady.actions)).toBe(
      true,
    );
    expect(channelSendPlanFromActions(notReady.actions)).toBe("link-not-ready");

    const tooBig = stepChannelSendPlanWithActions(
      initialChannelSendPlanState(),
      {
        kind: "channel/send-plan-gate",
        ready: true,
        packedLength: 200,
        mdu: 100,
      },
    );
    expect(shouldRejectChannelSendPlanTooBig(tooBig.actions)).toBe(true);
    expect(channelSendPlanFromActions(tooBig.actions)).toBe("too-big");

    const proceed = stepChannelSendPlanWithActions(
      initialChannelSendPlanState(),
      {
        kind: "channel/send-plan-gate",
        ready: true,
        packedLength: 50,
        mdu: 100,
      },
    );
    expect(shouldProceedChannelSendPlan(proceed.actions)).toBe(true);
    expect(channelSendPlanFromActions(proceed.actions)).toBe("proceed");
  });

  it("gates outlet transmit results", () => {
    expect(
      isChannelOutletTransmitOk({
        packetPresent: true,
        rawLength: 10,
        receiptPresent: true,
      }),
    ).toBe(true);
    expect(
      isChannelOutletTransmitOk({
        packetPresent: false,
        rawLength: 10,
        receiptPresent: true,
      }),
    ).toBe(false);
    expect(
      isChannelOutletTransmitOk({
        packetPresent: true,
        rawLength: 0,
        receiptPresent: true,
      }),
    ).toBe(false);
    expect(
      isChannelOutletTransmitOk({
        packetPresent: true,
        rawLength: 10,
        receiptPresent: false,
      }),
    ).toBe(false);
  });

  it("emits outlet-transmit only from ok/reject actions", () => {
    const ok = stepChannelOutletTransmitWithActions(
      initialChannelOutletTransmitState(),
      {
        kind: "channel/outlet-transmit-gate",
        packetPresent: true,
        rawLength: 10,
        receiptPresent: true,
      },
    );
    expect(shouldAcceptChannelOutletTransmit(ok.actions)).toBe(true);
    expect(shouldRejectChannelOutletTransmit(ok.actions)).toBe(false);

    const reject = stepChannelOutletTransmitWithActions(
      initialChannelOutletTransmitState(),
      {
        kind: "channel/outlet-transmit-gate",
        packetPresent: true,
        rawLength: 0,
        receiptPresent: true,
      },
    );
    expect(shouldAcceptChannelOutletTransmit(reject.actions)).toBe(false);
    expect(shouldRejectChannelOutletTransmit(reject.actions)).toBe(true);

    const empty = stepChannelOutletTransmitWithActions(
      initialChannelOutletTransmitState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldAcceptChannelOutletTransmit(empty.actions)).toBe(false);
    expect(shouldRejectChannelOutletTransmit(empty.actions)).toBe(false);
  });
});

describe("protocol channel window (continued)", () => {
  it("counts TX outstanding from packet presence and delivery", () => {
    expect(
      countChannelTxOutstanding([
        { packetPresent: false, delivered: false },
        { packetPresent: true, delivered: false },
        { packetPresent: true, delivered: true },
      ]),
    ).toBe(2);
    expect(countChannelTxOutstanding([])).toBe(0);
  });

  it("extends receipt timeout only when updated is greater", () => {
    expect(
      shouldExtendPacketReceiptTimeout({
        currentTimeout: null,
        updatedTimeout: 1,
      }),
    ).toBe(false);
    expect(
      shouldExtendPacketReceiptTimeout({
        currentTimeout: 2,
        updatedTimeout: 2,
      }),
    ).toBe(false);
    expect(
      shouldExtendPacketReceiptTimeout({
        currentTimeout: 2,
        updatedTimeout: 3,
      }),
    ).toBe(true);

    const skipNull = stepExtendPacketReceiptTimeoutWithActions(
      initialExtendPacketReceiptTimeoutState(),
      {
        kind: "channel/extend-packet-receipt-timeout-gate",
        currentTimeout: null,
        updatedTimeout: 1,
      },
    );
    expect(shouldExtendPacketReceiptTimeoutNow(skipNull.actions)).toBe(false);
    expect(shouldSkipExtendPacketReceiptTimeout(skipNull.actions)).toBe(true);

    const skipEqual = stepExtendPacketReceiptTimeoutWithActions(
      initialExtendPacketReceiptTimeoutState(),
      {
        kind: "channel/extend-packet-receipt-timeout-gate",
        currentTimeout: 2,
        updatedTimeout: 2,
      },
    );
    expect(shouldExtendPacketReceiptTimeoutNow(skipEqual.actions)).toBe(false);
    expect(shouldSkipExtendPacketReceiptTimeout(skipEqual.actions)).toBe(true);

    const extend = stepExtendPacketReceiptTimeoutWithActions(
      initialExtendPacketReceiptTimeoutState(),
      {
        kind: "channel/extend-packet-receipt-timeout-gate",
        currentTimeout: 2,
        updatedTimeout: 3,
      },
    );
    expect(shouldExtendPacketReceiptTimeoutNow(extend.actions)).toBe(true);
    expect(shouldSkipExtendPacketReceiptTimeout(extend.actions)).toBe(false);

    const empty = stepExtendPacketReceiptTimeoutWithActions(
      initialExtendPacketReceiptTimeoutState(),
      { kind: "noop" } as never,
    );
    expect(shouldExtendPacketReceiptTimeoutNow(empty.actions)).toBe(false);
    expect(shouldSkipExtendPacketReceiptTimeout(empty.actions)).toBe(false);
  });

  it("arms channel packet receipts when present", () => {
    expect(canArmChannelPacketReceipt(true)).toBe(true);
    expect(canArmChannelPacketReceipt(false)).toBe(false);

    const arm = stepArmChannelPacketReceiptWithActions(
      initialArmChannelPacketReceiptState(),
      {
        kind: "channel/arm-packet-receipt-gate",
        receiptPresent: true,
      },
    );
    expect(shouldArmChannelPacketReceiptNow(arm.actions)).toBe(true);
    expect(shouldSkipArmChannelPacketReceipt(arm.actions)).toBe(false);

    const skip = stepArmChannelPacketReceiptWithActions(
      initialArmChannelPacketReceiptState(),
      {
        kind: "channel/arm-packet-receipt-gate",
        receiptPresent: false,
      },
    );
    expect(shouldArmChannelPacketReceiptNow(skip.actions)).toBe(false);
    expect(shouldSkipArmChannelPacketReceipt(skip.actions)).toBe(true);
  });
});
