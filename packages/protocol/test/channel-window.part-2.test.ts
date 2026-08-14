import { describe, expect, it } from "vitest";
import {
  CHANNEL_MAX_TRIES,
  ChannelWindowLimits,
  applyChannelDelivery,
  applyChannelTimeout,
  channelAllowsSend,
  channelPacketTimeoutFromActions,
  channelPacketTimeoutPlanFromActions,
  channelPacketTimeoutRetryFromActions,
  channelPacketTimeoutSeconds,
  channelRetryExhausted,
  channelTxEnvelopeIndexFromActions,
  channelTxOutstandingCountFromActions,
  channelTxTimeoutRetryAction,
  channelTxReceiptTimeoutExtensions,
  channelTxReceiptTimeoutRefreshPlanExtensions,
  countChannelTxOutstanding,
  canArmChannelPacketReceipt,
  initialApplyChannelPacketReceiptTimeoutState,
  initialApplyChannelTxReceiptTimeoutExtensionState,
  initialArmChannelPacketReceiptState,
  initialChannelAllowsSendState,
  initialChannelOutletTransmitState,
  initialChannelPacketTimeoutPlanState,
  initialChannelPacketTimeoutSecondsState,
  initialChannelPacketTimeoutState,
  initialChannelSendPlanState,
  initialChannelSendState,
  initialChannelTxEnvelopeOpPlanState,
  initialChannelTxEnvelopeOpState,
  initialChannelTxReceiptTimeoutRefreshPlanState,
  initialChannelTxReceiptTimeoutRefreshState,
  initialChannelWindowState,
  initialClearChannelEnvelopePacketState,
  initialCountChannelTxOutstandingState,
  initialExtendPacketReceiptTimeoutState,
  initialIndexOfChannelTxEnvelopeState,
  initialReplaceChannelResentPacketState,
  isChannelOutletTransmitOk,
  planChannelPacketTimeout,
  planChannelSend,
  planChannelTxEnvelopeOp,
  planChannelTxReceiptTimeoutRefresh,
  channelSendPlanFromActions,
  channelTxEnvelopeOpPlanFromActions,
  shouldAcceptChannelOutletTransmit,
  shouldAllowChannelSend,
  shouldApplyChannelPacketReceiptTimeout,
  shouldApplyChannelPacketReceiptTimeoutNow,
  shouldApplyChannelTxReceiptTimeoutExtension,
  shouldApplyChannelTxReceiptTimeoutExtensionNow,
  shouldArmChannelPacketReceiptNow,
  shouldDenyChannelSend,
  shouldExtendChannelTxReceiptTimeout,
  shouldExtendChannelTxReceiptTimeoutRefreshPlan,
  shouldExtendPacketReceiptTimeout,
  shouldExtendPacketReceiptTimeoutNow,
  shouldGiveUpChannelPacketTimeout,
  shouldGiveUpChannelPacketTimeoutPlan,
  shouldGiveUpChannelTxTimeout,
  shouldIgnoreChannelPacketTimeout,
  shouldIgnoreChannelPacketTimeoutPlan,
  shouldMissChannelTxEnvelopeIndex,
  shouldMissChannelTxEnvelopeOp,
  shouldMissChannelTxEnvelopeOpPlan,
  shouldProceedChannelSend,
  shouldProceedChannelSendPlan,
  shouldProcessChannelTxEnvelopeOp,
  shouldProcessChannelTxEnvelopeOpPlan,
  shouldRejectChannelOutletTransmit,
  shouldRejectChannelSendLinkNotReady,
  shouldRejectChannelSendPlanLinkNotReady,
  shouldRejectChannelSendPlanTooBig,
  shouldRejectChannelSendTooBig,
  shouldReplaceChannelResentPacket,
  shouldReplaceChannelResentPacketNow,
  shouldResendChannelTimeoutPacket,
  shouldResendChannelTimeoutPacketNow,
  shouldRetryChannelPacketTimeout,
  shouldRetryChannelPacketTimeoutPlan,
  shouldRetryChannelTxTimeout,
  shouldSkipApplyChannelPacketReceiptTimeout,
  shouldSkipApplyChannelTxReceiptTimeoutExtension,
  shouldSkipArmChannelPacketReceipt,
  shouldSkipClearChannelEnvelopePacket,
  shouldSkipExtendPacketReceiptTimeout,
  shouldSkipReplaceChannelResentPacket,
  shouldSkipResendChannelTimeoutPacket,
  shouldUseChannelPacketTimeout,
  shouldUseChannelTxEnvelopeIndex,
  shouldUseChannelTxOutstandingCount,
  shouldClearChannelEnvelopePacket,
  shouldClearChannelEnvelopePacketNow,
  indexOfChannelTxEnvelope,
  initialResendChannelTimeoutPacketState,
  stepApplyChannelPacketReceiptTimeoutWithActions,
  stepApplyChannelTxReceiptTimeoutExtensionWithActions,
  stepArmChannelPacketReceiptWithActions,
  stepChannelAllowsSendWithActions,
  stepChannelOutletTransmitWithActions,
  stepChannelPacketTimeoutSecondsWithActions,
  stepChannelPacketTimeoutPlanWithActions,
  stepChannelPacketTimeoutWithActions,
  stepChannelSendPlanWithActions,
  stepChannelSendWithActions,
  stepChannelTxEnvelopeOpPlanWithActions,
  stepChannelTxEnvelopeOpWithActions,
  stepChannelTxReceiptTimeoutRefreshPlanWithActions,
  stepChannelTxReceiptTimeoutRefreshWithActions,
  stepChannelTxTimeout,
  stepChannelTxTimeoutWithActions,
  stepChannelWindow,
  stepClearChannelEnvelopePacketWithActions,
  stepCountChannelTxOutstandingWithActions,
  stepExtendPacketReceiptTimeoutWithActions,
  stepIndexOfChannelTxEnvelopeWithActions,
  stepReplaceChannelResentPacketWithActions,
  stepResendChannelTimeoutPacketWithActions,
} from "../src/channel-window.js";
describe("protocol channel window actions", () => {
  it("plans TX envelope ops and receipt timeout / resent gates", () => {
    expect(
      planChannelTxEnvelopeOp({ indexOk: true, envelopePresent: true }),
    ).toBe("process");
    expect(
      planChannelTxEnvelopeOp({ indexOk: false, envelopePresent: true }),
    ).toBe("miss");
    expect(
      planChannelTxEnvelopeOp({
        indexOk: true,
        envelopePresent: true,
        opOk: false,
      }),
    ).toBe("miss");
    expect(shouldApplyChannelPacketReceiptTimeout(true)).toBe(true);
    expect(shouldApplyChannelPacketReceiptTimeout(false)).toBe(false);
    expect(shouldReplaceChannelResentPacket(true)).toBe(true);
    expect(shouldReplaceChannelResentPacket(false)).toBe(false);
    expect(shouldResendChannelTimeoutPacket(true)).toBe(true);
    expect(shouldResendChannelTimeoutPacket(false)).toBe(false);
    expect(shouldClearChannelEnvelopePacket(true)).toBe(true);
    expect(shouldClearChannelEnvelopePacket(false)).toBe(false);

    const applyTimeout = stepApplyChannelPacketReceiptTimeoutWithActions(
      initialApplyChannelPacketReceiptTimeoutState(),
      {
        kind: "channel/apply-packet-receipt-timeout-gate",
        timeoutPresent: true,
      },
    );
    expect(
      shouldApplyChannelPacketReceiptTimeoutNow(applyTimeout.actions),
    ).toBe(true);
    expect(
      shouldSkipApplyChannelPacketReceiptTimeout(applyTimeout.actions),
    ).toBe(false);

    const skipTimeout = stepApplyChannelPacketReceiptTimeoutWithActions(
      initialApplyChannelPacketReceiptTimeoutState(),
      {
        kind: "channel/apply-packet-receipt-timeout-gate",
        timeoutPresent: false,
      },
    );
    expect(shouldApplyChannelPacketReceiptTimeoutNow(skipTimeout.actions)).toBe(
      false,
    );
    expect(
      shouldSkipApplyChannelPacketReceiptTimeout(skipTimeout.actions),
    ).toBe(true);

    const replace = stepReplaceChannelResentPacketWithActions(
      initialReplaceChannelResentPacketState(),
      { kind: "channel/replace-resent-packet-gate", resentPresent: true },
    );
    expect(shouldReplaceChannelResentPacketNow(replace.actions)).toBe(true);
    expect(shouldSkipReplaceChannelResentPacket(replace.actions)).toBe(false);

    const skipReplace = stepReplaceChannelResentPacketWithActions(
      initialReplaceChannelResentPacketState(),
      { kind: "channel/replace-resent-packet-gate", resentPresent: false },
    );
    expect(shouldReplaceChannelResentPacketNow(skipReplace.actions)).toBe(
      false,
    );
    expect(shouldSkipReplaceChannelResentPacket(skipReplace.actions)).toBe(
      true,
    );

    const resend = stepResendChannelTimeoutPacketWithActions(
      initialResendChannelTimeoutPacketState(),
      { kind: "channel/resend-timeout-packet-gate", packetPresent: true },
    );
    expect(shouldResendChannelTimeoutPacketNow(resend.actions)).toBe(true);
    expect(shouldSkipResendChannelTimeoutPacket(resend.actions)).toBe(false);

    const skipResend = stepResendChannelTimeoutPacketWithActions(
      initialResendChannelTimeoutPacketState(),
      { kind: "channel/resend-timeout-packet-gate", packetPresent: false },
    );
    expect(shouldResendChannelTimeoutPacketNow(skipResend.actions)).toBe(false);
    expect(shouldSkipResendChannelTimeoutPacket(skipResend.actions)).toBe(true);

    const clear = stepClearChannelEnvelopePacketWithActions(
      initialClearChannelEnvelopePacketState(),
      { kind: "channel/clear-envelope-packet-gate", packetPresent: true },
    );
    expect(shouldClearChannelEnvelopePacketNow(clear.actions)).toBe(true);
    expect(shouldSkipClearChannelEnvelopePacket(clear.actions)).toBe(false);

    const skipClear = stepClearChannelEnvelopePacketWithActions(
      initialClearChannelEnvelopePacketState(),
      { kind: "channel/clear-envelope-packet-gate", packetPresent: false },
    );
    expect(shouldClearChannelEnvelopePacketNow(skipClear.actions)).toBe(false);
    expect(shouldSkipClearChannelEnvelopePacket(skipClear.actions)).toBe(true);
  });

  it("emits miss / process actions from channel/tx-envelope-op-gate", () => {
    const processPlan = stepChannelTxEnvelopeOpPlanWithActions(
      initialChannelTxEnvelopeOpPlanState(),
      {
        kind: "channel/tx-envelope-op-plan-gate",
        indexOk: true,
        envelopePresent: true,
      },
    );
    expect(channelTxEnvelopeOpPlanFromActions(processPlan.actions)).toBe(
      "process",
    );
    expect(shouldProcessChannelTxEnvelopeOpPlan(processPlan.actions)).toBe(
      true,
    );
    expect(shouldMissChannelTxEnvelopeOpPlan(processPlan.actions)).toBe(false);

    const process = stepChannelTxEnvelopeOpWithActions(
      initialChannelTxEnvelopeOpState(),
      {
        kind: "channel/tx-envelope-op-gate",
        indexOk: true,
        envelopePresent: true,
      },
    );
    expect(shouldProcessChannelTxEnvelopeOp(process.actions)).toBe(true);
    expect(shouldMissChannelTxEnvelopeOp(process.actions)).toBe(false);

    const missIndex = stepChannelTxEnvelopeOpWithActions(
      initialChannelTxEnvelopeOpState(),
      {
        kind: "channel/tx-envelope-op-gate",
        indexOk: false,
        envelopePresent: true,
      },
    );
    expect(shouldMissChannelTxEnvelopeOp(missIndex.actions)).toBe(true);

    const missOpPlan = stepChannelTxEnvelopeOpPlanWithActions(
      initialChannelTxEnvelopeOpPlanState(),
      {
        kind: "channel/tx-envelope-op-plan-gate",
        indexOk: true,
        envelopePresent: true,
        opOk: false,
      },
    );
    expect(channelTxEnvelopeOpPlanFromActions(missOpPlan.actions)).toBe("miss");
    expect(shouldMissChannelTxEnvelopeOpPlan(missOpPlan.actions)).toBe(true);

    const missOp = stepChannelTxEnvelopeOpWithActions(
      initialChannelTxEnvelopeOpState(),
      {
        kind: "channel/tx-envelope-op-gate",
        indexOk: true,
        envelopePresent: true,
        opOk: false,
      },
    );
    expect(shouldMissChannelTxEnvelopeOp(missOp.actions)).toBe(true);
    expect(channelTxEnvelopeOpPlanFromActions([])).toBeNull();
  });
});

describe("protocol channel window actions (continued)", () => {
  it("finds TX envelope index by packet id", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    expect(
      indexOfChannelTxEnvelope({
        packetIds: [null, a, b],
        targetId: new Uint8Array([3, 4]),
      }),
    ).toBe(2);
    expect(
      indexOfChannelTxEnvelope({ packetIds: [a], targetId: null }),
    ).toBeNull();
    expect(
      indexOfChannelTxEnvelope({
        packetIds: [a],
        targetId: new Uint8Array([9, 9]),
      }),
    ).toBeNull();
  });

  it("emits TX-envelope index only from use-index/miss actions", () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4]);
    const hit = stepIndexOfChannelTxEnvelopeWithActions(
      initialIndexOfChannelTxEnvelopeState(),
      {
        kind: "channel/tx-envelope-index-gate",
        packetIds: [null, a, b],
        targetId: new Uint8Array([3, 4]),
      },
    );
    expect(shouldUseChannelTxEnvelopeIndex(hit.actions)).toBe(true);
    expect(shouldMissChannelTxEnvelopeIndex(hit.actions)).toBe(false);
    expect(channelTxEnvelopeIndexFromActions(hit.actions)).toBe(2);

    const miss = stepIndexOfChannelTxEnvelopeWithActions(
      initialIndexOfChannelTxEnvelopeState(),
      {
        kind: "channel/tx-envelope-index-gate",
        packetIds: [a],
        targetId: new Uint8Array([9, 9]),
      },
    );
    expect(shouldUseChannelTxEnvelopeIndex(miss.actions)).toBe(false);
    expect(shouldMissChannelTxEnvelopeIndex(miss.actions)).toBe(true);
    expect(channelTxEnvelopeIndexFromActions(miss.actions)).toBeNull();

    const empty = stepIndexOfChannelTxEnvelopeWithActions(
      initialIndexOfChannelTxEnvelopeState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldUseChannelTxEnvelopeIndex(empty.actions)).toBe(false);
    expect(shouldMissChannelTxEnvelopeIndex(empty.actions)).toBe(false);
    expect(channelTxEnvelopeIndexFromActions(empty.actions)).toBeNull();
  });
});

describe("protocol channel window actions (continued)", () => {
  it("plans packet timeout ignore / retry / give-up without ad-hoc plan.kind reads", () => {
    expect(CHANNEL_MAX_TRIES).toBe(5);
    expect(planChannelPacketTimeout({ delivered: true, tries: 1 })).toEqual({
      kind: "ignore",
    });
    expect(planChannelPacketTimeout({ delivered: false, tries: 2 })).toEqual({
      kind: "retry",
      nextTries: 3,
    });
    expect(planChannelPacketTimeout({ delivered: false, tries: 5 })).toEqual({
      kind: "give-up",
    });

    const ignorePlan = stepChannelPacketTimeoutPlanWithActions(
      initialChannelPacketTimeoutPlanState(),
      {
        kind: "channel/packet-timeout-plan-gate",
        delivered: true,
        tries: 1,
      },
    );
    expect(shouldIgnoreChannelPacketTimeoutPlan(ignorePlan.actions)).toBe(true);
    expect(shouldGiveUpChannelPacketTimeoutPlan(ignorePlan.actions)).toBe(
      false,
    );
    expect(shouldRetryChannelPacketTimeoutPlan(ignorePlan.actions)).toBe(false);
    expect(channelPacketTimeoutPlanFromActions(ignorePlan.actions)).toEqual({
      kind: "ignore",
    });

    const ignore = stepChannelPacketTimeoutWithActions(
      initialChannelPacketTimeoutState(),
      {
        kind: "channel/packet-timeout-gate",
        delivered: true,
        tries: 1,
      },
    );
    expect(shouldIgnoreChannelPacketTimeout(ignore.actions)).toBe(true);
    expect(shouldGiveUpChannelPacketTimeout(ignore.actions)).toBe(false);
    expect(shouldRetryChannelPacketTimeout(ignore.actions)).toBe(false);

    const retryPlan = stepChannelPacketTimeoutPlanWithActions(
      initialChannelPacketTimeoutPlanState(),
      {
        kind: "channel/packet-timeout-plan-gate",
        delivered: false,
        tries: 2,
      },
    );
    expect(shouldRetryChannelPacketTimeoutPlan(retryPlan.actions)).toBe(true);
    expect(channelPacketTimeoutRetryFromActions(retryPlan.actions)).toEqual({
      kind: "retry",
      nextTries: 3,
    });
    expect(channelPacketTimeoutPlanFromActions(retryPlan.actions)).toEqual({
      kind: "retry",
      nextTries: 3,
    });

    const retry = stepChannelPacketTimeoutWithActions(
      initialChannelPacketTimeoutState(),
      {
        kind: "channel/packet-timeout-gate",
        delivered: false,
        tries: 2,
      },
    );
    expect(shouldRetryChannelPacketTimeout(retry.actions)).toBe(true);
    expect(channelPacketTimeoutRetryFromActions(retry.actions)).toEqual({
      kind: "retry",
      nextTries: 3,
    });

    const giveUpPlan = stepChannelPacketTimeoutPlanWithActions(
      initialChannelPacketTimeoutPlanState(),
      {
        kind: "channel/packet-timeout-plan-gate",
        delivered: false,
        tries: 5,
      },
    );
    expect(shouldGiveUpChannelPacketTimeoutPlan(giveUpPlan.actions)).toBe(true);
    expect(channelPacketTimeoutRetryFromActions(giveUpPlan.actions)).toBeNull();

    const giveUp = stepChannelPacketTimeoutWithActions(
      initialChannelPacketTimeoutState(),
      {
        kind: "channel/packet-timeout-gate",
        delivered: false,
        tries: 5,
      },
    );
    expect(shouldGiveUpChannelPacketTimeout(giveUp.actions)).toBe(true);

    const emptyPlan = stepChannelPacketTimeoutPlanWithActions(
      initialChannelPacketTimeoutPlanState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldIgnoreChannelPacketTimeoutPlan(emptyPlan.actions)).toBe(false);
    expect(channelPacketTimeoutPlanFromActions(emptyPlan.actions)).toBeNull();

    const empty = stepChannelPacketTimeoutWithActions(
      initialChannelPacketTimeoutState(),
      {
        kind: "noop",
      } as never,
    );
    expect(shouldIgnoreChannelPacketTimeout(empty.actions)).toBe(false);
  });

  it("steps window timeout and delivery events", () => {
    let state = initialChannelWindowState(0.5);
    state = { ...state, window: 3, windowMax: 7 };
    state = stepChannelWindow(state, { kind: "channel/timeout" }).state;
    expect(state.window).toBe(2);
    state = stepChannelWindow(state, {
      kind: "channel/delivered",
      rtt: 0.5,
    }).state;
    expect(state.window).toBe(3);
  });
});

describe("protocol channel window actions (continued)", () => {
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
    });
    expect(miss.actions).toEqual([]);
    expect(miss.state.window).toBe(4);
    // Nested envelope-op gate: miss index never processes.
    expect(
      shouldMissChannelTxEnvelopeOp(
        stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), {
          kind: "channel/tx-envelope-op-gate",
          indexOk: false,
          envelopePresent: false,
        }).actions,
      ),
    ).toBe(true);

    const ignore = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: true,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
    });
    expect(ignore.actions).toEqual([]);
    expect(ignore.state.window).toBe(4);
    // Nested packet-timeout: delivered envelopes are ignore.
    expect(
      shouldIgnoreChannelPacketTimeout(
        stepChannelPacketTimeoutWithActions(
          initialChannelPacketTimeoutState(),
          {
            kind: "channel/packet-timeout-gate",
            delivered: true,
            tries: 1,
            maxTries: CHANNEL_MAX_TRIES,
          },
        ).actions,
      ),
    ).toBe(true);

    const giveUp = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: CHANNEL_MAX_TRIES,
      maxTries: CHANNEL_MAX_TRIES,
    });
    expect(giveUp.actions).toEqual([{ kind: "give-up" }]);
    expect(shouldGiveUpChannelTxTimeout(giveUp.actions)).toBe(true);
    expect(giveUp.state.window).toBe(4);
    expect(
      shouldGiveUpChannelPacketTimeout(
        stepChannelPacketTimeoutWithActions(
          initialChannelPacketTimeoutState(),
          {
            kind: "channel/packet-timeout-gate",
            delivered: false,
            tries: CHANNEL_MAX_TRIES,
            maxTries: CHANNEL_MAX_TRIES,
          },
        ).actions,
      ),
    ).toBe(true);

    const retry = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 2,
      maxTries: CHANNEL_MAX_TRIES,
    });
    expect(retry.actions).toEqual([{ kind: "retry", nextTries: 3 }]);
    expect(shouldRetryChannelTxTimeout(retry.actions)).toBe(true);
    expect(channelTxTimeoutRetryAction(retry.actions)).toEqual({
      kind: "retry",
      nextTries: 3,
    });
    expect(retry.state.window).toBe(3);
    expect(
      channelPacketTimeoutRetryFromActions(
        stepChannelPacketTimeoutWithActions(
          initialChannelPacketTimeoutState(),
          {
            kind: "channel/packet-timeout-gate",
            delivered: false,
            tries: 2,
            maxTries: CHANNEL_MAX_TRIES,
          },
        ).actions,
      ),
    ).toEqual({ kind: "retry", nextTries: 3 });
  });

  it("StepFn wrapper omits actions while WithActions preserves them", () => {
    const state = {
      ...initialChannelWindowState(0.5),
      window: 3,
      windowMax: 7,
    };
    const withActions = stepChannelTxTimeoutWithActions(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
    });
    const stripped = stepChannelTxTimeout(state, {
      kind: "channel/tx-timeout",
      indexOk: true,
      envelopePresent: true,
      delivered: false,
      tries: 1,
      maxTries: CHANNEL_MAX_TRIES,
    });
    expect(withActions.actions).toEqual([{ kind: "retry", nextTries: 2 }]);
    expect(stripped).toEqual({
      state: withActions.state,
      intents: withActions.intents,
    });
  });
});

describe("protocol channel window actions (continued)", () => {
  it("plans receipt timeout refresh extensions without ad-hoc arm / timeout / extend checks", () => {
    const entries = [
      {
        receiptPresent: false,
        currentTimeout: 1,
        tries: 1,
        rtt: 0.2,
        txRingLength: 1,
      },
      {
        receiptPresent: true,
        currentTimeout: 0.01,
        tries: 2,
        rtt: 0.2,
        txRingLength: 1,
      },
      {
        receiptPresent: true,
        currentTimeout: 100,
        tries: 1,
        rtt: 0.2,
        txRingLength: 1,
      },
    ];
    const extensions = planChannelTxReceiptTimeoutRefresh(entries);
    expect(extensions).toHaveLength(1);
    expect(extensions[0]!.index).toBe(1);
    expect(extensions[0]!.timeoutSeconds).toBe(
      channelPacketTimeoutFromActions(
        stepChannelPacketTimeoutSecondsWithActions(
          initialChannelPacketTimeoutSecondsState(),
          {
            kind: "channel/packet-timeout-gate",
            tries: 2,
            rtt: 0.2,
            txRingLength: 1,
          },
        ).actions,
      ),
    );
    // Nested arm gate: absent receipt never extends.
    expect(
      shouldArmChannelPacketReceiptNow(
        stepArmChannelPacketReceiptWithActions(
          initialArmChannelPacketReceiptState(),
          {
            kind: "channel/arm-packet-receipt-gate",
            receiptPresent: false,
          },
        ).actions,
      ),
    ).toBe(false);
    expect(shouldApplyChannelTxReceiptTimeoutExtension(true)).toBe(true);
    expect(shouldApplyChannelTxReceiptTimeoutExtension(false)).toBe(false);

    const applyExtension = stepApplyChannelTxReceiptTimeoutExtensionWithActions(
      initialApplyChannelTxReceiptTimeoutExtensionState(),
      {
        kind: "channel/apply-tx-receipt-timeout-extension-gate",
        extensionPresent: true,
      },
    );
    expect(
      shouldApplyChannelTxReceiptTimeoutExtensionNow(applyExtension.actions),
    ).toBe(true);
    expect(
      shouldSkipApplyChannelTxReceiptTimeoutExtension(applyExtension.actions),
    ).toBe(false);

    const skipExtension = stepApplyChannelTxReceiptTimeoutExtensionWithActions(
      initialApplyChannelTxReceiptTimeoutExtensionState(),
      {
        kind: "channel/apply-tx-receipt-timeout-extension-gate",
        extensionPresent: false,
      },
    );
    expect(
      shouldApplyChannelTxReceiptTimeoutExtensionNow(skipExtension.actions),
    ).toBe(false);
    expect(
      shouldSkipApplyChannelTxReceiptTimeoutExtension(skipExtension.actions),
    ).toBe(true);

    const planned = stepChannelTxReceiptTimeoutRefreshPlanWithActions(
      initialChannelTxReceiptTimeoutRefreshPlanState(),
      {
        kind: "channel/tx-receipt-timeout-refresh-plan-gate",
        entries,
      },
    );
    expect(
      channelTxReceiptTimeoutRefreshPlanExtensions(planned.actions),
    ).toEqual(extensions);
    expect(
      shouldExtendChannelTxReceiptTimeoutRefreshPlan(planned.actions),
    ).toBe(true);

    const stepped = stepChannelTxReceiptTimeoutRefreshWithActions(
      initialChannelTxReceiptTimeoutRefreshState(),
      {
        kind: "channel/tx-receipt-timeout-refresh-gate",
        entries,
      },
    );
    expect(channelTxReceiptTimeoutExtensions(stepped.actions)).toEqual(
      extensions,
    );
    expect(shouldExtendChannelTxReceiptTimeout(stepped.actions)).toBe(true);
  });

  it("TX timeout double-runs identically", () => {
    const run = () => {
      let state = {
        ...initialChannelWindowState(0.5),
        window: 4,
        windowMax: 7,
      };
      const steps = [];
      steps.push(
        stepChannelTxTimeoutWithActions(state, {
          kind: "channel/tx-timeout",
          indexOk: true,
          envelopePresent: true,
          delivered: false,
          tries: 1,
          maxTries: CHANNEL_MAX_TRIES,
        }),
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
        }),
      );
      return steps.map((s) => ({
        window: s.state.window,
        actions: s.actions,
        intents: s.intents,
      }));
    };
    expect(run()).toEqual(run());
  });
});
