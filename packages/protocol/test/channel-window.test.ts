import { describe, expect, it } from "vitest";
import {
  CHANNEL_MAX_TRIES,
  ChannelWindowLimits,
  applyChannelDelivery,
  applyChannelTimeout,
  channelAllowsSend,
  channelPacketTimeoutFromActions,
  channelPacketTimeoutSeconds,
  channelRetryExhausted,
  channelTxOutstandingCountFromActions,
  channelTxTimeoutRetryAction,
  channelTxReceiptTimeoutExtensions,
  countChannelTxOutstanding,
  canArmChannelPacketReceipt,
  initialChannelAllowsSendState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelSendState,
  initialChannelTxEnvelopeOpState,
  initialChannelTxReceiptTimeoutRefreshState,
  initialChannelWindowState,
  initialCountChannelTxOutstandingState,
  isChannelOutletTransmitOk,
  planChannelPacketTimeout,
  planChannelSend,
  planChannelTxEnvelopeOp,
  planChannelTxReceiptTimeoutRefresh,
  shouldAllowChannelSend,
  shouldApplyChannelPacketReceiptTimeout,
  shouldApplyChannelTxReceiptTimeoutExtension,
  shouldDenyChannelSend,
  shouldExtendChannelTxReceiptTimeout,
  shouldExtendPacketReceiptTimeout,
  shouldGiveUpChannelTxTimeout,
  shouldMissChannelTxEnvelopeOp,
  shouldProceedChannelSend,
  shouldProcessChannelTxEnvelopeOp,
  shouldRejectChannelSendLinkNotReady,
  shouldRejectChannelSendTooBig,
  shouldReplaceChannelResentPacket,
  shouldResendChannelTimeoutPacket,
  shouldRetryChannelTxTimeout,
  shouldUseChannelPacketTimeout,
  shouldUseChannelTxOutstandingCount,
  shouldClearChannelEnvelopePacket,
  indexOfChannelTxEnvelope,
  stepChannelAllowsSendWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepChannelSendWithActions,
  stepChannelTxEnvelopeOpWithActions,
  stepChannelTxReceiptTimeoutRefreshWithActions,
  stepChannelTxTimeout,
  stepChannelTxTimeoutWithActions,
  stepChannelWindow,
  stepCountChannelTxOutstandingWithActions
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
      mediumRateRounds: 0
    });

    const normal = initialChannelWindowState(0.5);
    expect(normal.window).toBe(ChannelWindowLimits.WINDOW);
    expect(normal.windowMax).toBe(ChannelWindowLimits.WINDOW_MAX_SLOW);
  });

  it("computes packet timeouts deterministically", () => {
    const a = channelPacketTimeoutSeconds({ tries: 2, rtt: 0.2, txRingLength: 1 });
    const b = channelPacketTimeoutSeconds({ tries: 2, rtt: 0.2, txRingLength: 1 });
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
        txRingLength: 1
      }
    );
    expect(shouldUseChannelPacketTimeout(stepped.actions)).toBe(true);
    expect(channelPacketTimeoutFromActions(stepped.actions)).toBe(
      channelPacketTimeoutSeconds({ tries: 2, rtt: 0.2, txRingLength: 1 })
    );

    const empty = stepChannelPacketTimeoutSecondsWithActions(
      initialChannelPacketTimeoutSecondsState(),
      {
        kind: "noop"
      } as never
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
    expect(channelAllowsSend({ isUsable: true, outstanding: 1, window: 2 })).toBe(true);
    expect(channelAllowsSend({ isUsable: true, outstanding: 2, window: 2 })).toBe(false);
    expect(channelAllowsSend({ isUsable: false, outstanding: 0, window: 2 })).toBe(false);
    expect(channelRetryExhausted(5, 5)).toBe(true);
    expect(channelRetryExhausted(4, 5)).toBe(false);
  });

  it("emits TX outstanding only from use-count actions", () => {
    const entries = [
      { packetPresent: true, delivered: false },
      { packetPresent: true, delivered: true },
      { packetPresent: false, delivered: false }
    ];
    const stepped = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "channel/tx-outstanding-gate",
        entries
      }
    );
    expect(shouldUseChannelTxOutstandingCount(stepped.actions)).toBe(true);
    expect(channelTxOutstandingCountFromActions(stepped.actions)).toBe(
      countChannelTxOutstanding(entries)
    );
    expect(channelTxOutstandingCountFromActions(stepped.actions)).toBe(2);

    const empty = stepCountChannelTxOutstandingWithActions(
      initialCountChannelTxOutstandingState(),
      {
        kind: "noop"
      } as never
    );
    expect(shouldUseChannelTxOutstandingCount(empty.actions)).toBe(false);
    expect(channelTxOutstandingCountFromActions(empty.actions)).toBeNull();
  });

  it("emits send-allow only from allow/deny actions", () => {
    const allowed = stepChannelAllowsSendWithActions(initialChannelAllowsSendState(), {
      kind: "channel/allows-send-gate",
      isUsable: true,
      outstanding: 1,
      window: 2
    });
    expect(shouldAllowChannelSend(allowed.actions)).toBe(true);
    expect(shouldDenyChannelSend(allowed.actions)).toBe(false);

    const denied = stepChannelAllowsSendWithActions(initialChannelAllowsSendState(), {
      kind: "channel/allows-send-gate",
      isUsable: true,
      outstanding: 2,
      window: 2
    });
    expect(shouldAllowChannelSend(denied.actions)).toBe(false);
    expect(shouldDenyChannelSend(denied.actions)).toBe(true);

    const empty = stepChannelAllowsSendWithActions(initialChannelAllowsSendState(), {
      kind: "noop"
    } as never);
    expect(shouldAllowChannelSend(empty.actions)).toBe(false);
    expect(shouldDenyChannelSend(empty.actions)).toBe(false);
  });

  it("plans channel send ready / too-big / proceed", () => {
    expect(
      planChannelSend({
        ready: false,
        packedLength: null,
        mdu: 100
      })
    ).toBe("link-not-ready");
    expect(
      planChannelSend({
        ready: true,
        packedLength: null,
        mdu: 100
      })
    ).toBe("proceed");
    expect(
      planChannelSend({
        ready: true,
        packedLength: 50,
        mdu: 100
      })
    ).toBe("proceed");
    expect(
      planChannelSend({
        ready: true,
        packedLength: 200,
        mdu: 100
      })
    ).toBe("too-big");
  });

  it("emits channel send actions from WithActions step", () => {
    const notReady = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: false,
      packedLength: null,
      mdu: 100
    });
    expect(shouldRejectChannelSendLinkNotReady(notReady.actions)).toBe(true);

    const tooBig = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: true,
      packedLength: 200,
      mdu: 100
    });
    expect(shouldRejectChannelSendTooBig(tooBig.actions)).toBe(true);

    const proceed = stepChannelSendWithActions(initialChannelSendState(), {
      kind: "channel/send-gate",
      ready: true,
      packedLength: 50,
      mdu: 100
    });
    expect(proceed.actions).toEqual([{ kind: "proceed" }]);
    expect(shouldProceedChannelSend(proceed.actions)).toBe(true);
  });

  it("gates outlet transmit results", () => {
    expect(
      isChannelOutletTransmitOk({ packetPresent: true, rawLength: 10, receiptPresent: true })
    ).toBe(true);
    expect(
      isChannelOutletTransmitOk({ packetPresent: false, rawLength: 10, receiptPresent: true })
    ).toBe(false);
    expect(
      isChannelOutletTransmitOk({ packetPresent: true, rawLength: 0, receiptPresent: true })
    ).toBe(false);
    expect(
      isChannelOutletTransmitOk({ packetPresent: true, rawLength: 10, receiptPresent: false })
    ).toBe(false);
  });

  it("counts TX outstanding from packet presence and delivery", () => {
    expect(
      countChannelTxOutstanding([
        { packetPresent: false, delivered: false },
        { packetPresent: true, delivered: false },
        { packetPresent: true, delivered: true }
      ])
    ).toBe(2);
    expect(countChannelTxOutstanding([])).toBe(0);
  });

  it("extends receipt timeout only when updated is greater", () => {
    expect(
      shouldExtendPacketReceiptTimeout({ currentTimeout: null, updatedTimeout: 1 })
    ).toBe(false);
    expect(
      shouldExtendPacketReceiptTimeout({ currentTimeout: 2, updatedTimeout: 2 })
    ).toBe(false);
    expect(
      shouldExtendPacketReceiptTimeout({ currentTimeout: 2, updatedTimeout: 3 })
    ).toBe(true);
  });

  it("arms channel packet receipts when present", () => {
    expect(canArmChannelPacketReceipt(true)).toBe(true);
    expect(canArmChannelPacketReceipt(false)).toBe(false);
  });

  it("plans TX envelope ops and receipt timeout / resent gates", () => {
    expect(
      planChannelTxEnvelopeOp({ indexOk: true, envelopePresent: true })
    ).toBe("process");
    expect(
      planChannelTxEnvelopeOp({ indexOk: false, envelopePresent: true })
    ).toBe("miss");
    expect(
      planChannelTxEnvelopeOp({ indexOk: true, envelopePresent: true, opOk: false })
    ).toBe("miss");
    expect(shouldApplyChannelPacketReceiptTimeout(true)).toBe(true);
    expect(shouldApplyChannelPacketReceiptTimeout(false)).toBe(false);
    expect(shouldReplaceChannelResentPacket(true)).toBe(true);
    expect(shouldReplaceChannelResentPacket(false)).toBe(false);
    expect(shouldResendChannelTimeoutPacket(true)).toBe(true);
    expect(shouldResendChannelTimeoutPacket(false)).toBe(false);
    expect(shouldClearChannelEnvelopePacket(true)).toBe(true);
    expect(shouldClearChannelEnvelopePacket(false)).toBe(false);
  });

  it("emits miss / process actions from channel/tx-envelope-op-gate", () => {
    const process = stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), {
      kind: "channel/tx-envelope-op-gate",
      indexOk: true,
      envelopePresent: true
    });
    expect(shouldProcessChannelTxEnvelopeOp(process.actions)).toBe(true);
    expect(shouldMissChannelTxEnvelopeOp(process.actions)).toBe(false);

    const missIndex = stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), {
      kind: "channel/tx-envelope-op-gate",
      indexOk: false,
      envelopePresent: true
    });
    expect(shouldMissChannelTxEnvelopeOp(missIndex.actions)).toBe(true);

    const missOp = stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), {
      kind: "channel/tx-envelope-op-gate",
      indexOk: true,
      envelopePresent: true,
      opOk: false
    });
    expect(shouldMissChannelTxEnvelopeOp(missOp.actions)).toBe(true);
  });

  it("finds TX envelope index by packet id", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    expect(
      indexOfChannelTxEnvelope({
        packetIds: [null, a, b],
        targetId: new Uint8Array([3, 4])
      })
    ).toBe(2);
    expect(indexOfChannelTxEnvelope({ packetIds: [a], targetId: null })).toBeNull();
    expect(
      indexOfChannelTxEnvelope({ packetIds: [a], targetId: new Uint8Array([9, 9]) })
    ).toBeNull();
  });

  it("plans packet timeout ignore / retry / give-up", () => {
    expect(CHANNEL_MAX_TRIES).toBe(5);
    expect(planChannelPacketTimeout({ delivered: true, tries: 1 })).toEqual({ kind: "ignore" });
    expect(planChannelPacketTimeout({ delivered: false, tries: 2 })).toEqual({
      kind: "retry",
      nextTries: 3
    });
    expect(planChannelPacketTimeout({ delivered: false, tries: 5 })).toEqual({ kind: "give-up" });
  });

  it("steps window timeout and delivery events", () => {
    let state = initialChannelWindowState(0.5);
    state = { ...state, window: 3, windowMax: 7 };
    state = stepChannelWindow(state, { kind: "channel/timeout" }).state;
    expect(state.window).toBe(2);
    state = stepChannelWindow(state, { kind: "channel/delivered", rtt: 0.5 }).state;
    expect(state.window).toBe(3);
  });

  it("TX timeout step emits give-up / retry actions and shrinks window on retry", () => {
    let state = initialChannelWindowState(0.5);
    state = { ...state, window: 4, windowMax: 7 };

    const miss = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: false,
      envelopePresent: false,
      delivered: false,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: true
    });
    expect(miss.actions).toEqual([]);
    expect(miss.state.window).toBe(4);

    const ignore = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: true,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: true
    });
    expect(ignore.actions).toEqual([]);
    expect(ignore.state.window).toBe(4);

    const giveUp = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: CHANNEL_MAX_TRIES,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: true
    });
    expect(giveUp.actions).toEqual([{ kind: "give-up" }]);
    expect(shouldGiveUpChannelTxTimeout(giveUp.actions)).toBe(true);
    expect(giveUp.state.window).toBe(4);

    const retry = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 2,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: true
    });
    expect(retry.actions).toEqual([{ kind: "retry", nextTries: 3, resend: true }]);
    expect(shouldRetryChannelTxTimeout(retry.actions)).toBe(true);
    expect(channelTxTimeoutRetryAction(retry.actions)).toEqual({
      kind: "retry",
      nextTries: 3,
      resend: true
    });
    expect(retry.state.window).toBe(3);

    const noResend = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: false
    });
    expect(noResend.actions).toEqual([{ kind: "retry", nextTries: 2, resend: false }]);
  });

  it("StepFn wrapper omits actions while WithActions preserves them", () => {
    const state = { ...initialChannelWindowState(0.5), window: 3, windowMax: 7 };
    const withActions = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: true
    });
    const stripped = stepChannelTxTimeout(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
      packetPresent: true
    });
    expect(withActions.actions).toEqual([{ kind: "retry", nextTries: 2, resend: true }]);
    expect(stripped).toEqual({ state: withActions.state, intents: withActions.intents });
  });

  it("plans receipt timeout refresh extensions without ad-hoc extend checks", () => {
    const entries = [
      {
        receiptPresent: false,
        currentTimeout: 1,
        tries: 1,
        rtt: 0.2,
        txRingLength: 1
      },
      {
        receiptPresent: true,
        currentTimeout: 0.01,
        tries: 2,
        rtt: 0.2,
        txRingLength: 1
      },
      {
        receiptPresent: true,
        currentTimeout: 100,
        tries: 1,
        rtt: 0.2,
        txRingLength: 1
      }
    ];
    const extensions = planChannelTxReceiptTimeoutRefresh(entries);
    expect(extensions).toHaveLength(1);
    expect(extensions[0]!.index).toBe(1);
    expect(extensions[0]!.timeoutSeconds).toBeGreaterThan(0.01);
    expect(shouldApplyChannelTxReceiptTimeoutExtension(true)).toBe(true);
    expect(shouldApplyChannelTxReceiptTimeoutExtension(false)).toBe(false);

    const stepped = stepChannelTxReceiptTimeoutRefreshWithActions(
      initialChannelTxReceiptTimeoutRefreshState(),
      {
        kind: "channel/tx-receipt-timeout-refresh-gate",
        entries
      }
    );
    expect(channelTxReceiptTimeoutExtensions(stepped.actions)).toEqual(extensions);
    expect(shouldExtendChannelTxReceiptTimeout(stepped.actions)).toBe(true);
  });

  it("TX timeout double-runs identically", () => {
    const run = () => {
      let state = { ...initialChannelWindowState(0.5), window: 4, windowMax: 7 };
      const steps = [];
      steps.push(
        stepChannelTxTimeoutWithActions(state, {
          kind: "channel/tx-timeout",
          indexOk: true,
          envelopePresent: true,
          delivered: false,
          tries: 1,
          maxTries: CHANNEL_MAX_TRIES,
          packetPresent: true
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepChannelTxTimeoutWithActions(state, {
          kind: "channel/tx-timeout",
          indexOk: true,
          envelopePresent: true,
          delivered: false,
          tries: CHANNEL_MAX_TRIES,
          maxTries: CHANNEL_MAX_TRIES,
          packetPresent: true
        })
      );
      return steps.map((s) => ({
        window: s.state.window,
        actions: s.actions,
        intents: s.intents
      }));
    };
    expect(run()).toEqual(run());
  });
});
