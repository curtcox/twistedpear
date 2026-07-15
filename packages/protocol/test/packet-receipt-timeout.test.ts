import { describe, expect, it } from "vitest";
import {
  PacketReceiptStatus,
  RECEIPT_TIMEOUT_TIMER_ID,
  checkPacketReceiptTimeout,
  initialFailAndDropOutboundReceiptState,
  initialKeepOutboundReceiptState,
  initialOutboundReceiptState,
  initialPacketReceiptCallbackState,
  initialPacketReceiptProofIngressState,
  initialPacketReceiptTimeoutState,
  initialPacketReceiptUnregisterState,
  initialRegisterPacketReceiptState,
  outboundReceiptOutcomeFromActions,
  packetReceiptProofIngressFromActions,
  packetReceiptUnregisterIndex,
  planOutboundReceiptOutcome,
  planPacketReceiptCallback,
  planPacketReceiptProofIngress,
  planUnregisterPacketReceipt,
  shouldArmPacketReceiptTimeoutTimer,
  shouldClearPacketReceiptCallback,
  shouldContinuePacketReceiptProofIngress,
  shouldFailAndDropOutboundReceipt,
  shouldFailAndDropOutboundReceiptNow,
  shouldInvokePacketReceiptAction,
  shouldInvokePacketReceiptTimeoutCallback,
  shouldKeepOutboundReceipt,
  shouldKeepOutboundReceiptNow,
  shouldOutboundFailAndDropReceipt,
  shouldOutboundKeepReceipt,
  shouldOutboundReceiptNone,
  shouldRegisterPacketReceipt,
  shouldRegisterPacketReceiptNow,
  shouldRemovePacketReceipt,
  shouldRemovePacketReceiptProofIngress,
  shouldSetPacketReceiptCallback,
  shouldSkipFailAndDropOutboundReceipt,
  shouldSkipKeepOutboundReceipt,
  shouldSkipRegisterPacketReceipt,
  shouldUnregisterPacketReceipt,
  stepFailAndDropOutboundReceiptWithActions,
  stepKeepOutboundReceiptWithActions,
  stepOutboundReceiptWithActions,
  stepPacketReceiptCallbackWithActions,
  stepPacketReceiptProofIngressWithActions,
  stepPacketReceiptTimeout,
  stepPacketReceiptTimeoutWithActions,
  stepPacketReceiptUnregisterWithActions,
  stepRegisterPacketReceiptWithActions
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

  it("step machine arms with timer intents and concludes via timeout action", () => {
    const armed = stepPacketReceiptTimeoutWithActions(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 1000,
      timeoutSeconds: 5
    });
    expect(armed.state.timeoutAt).toBe(1005);
    expect(shouldArmPacketReceiptTimeoutTimer(5)).toBe(true);
    expect(armed.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } },
      {
        kind: "timer/set",
        timer: { id: RECEIPT_TIMEOUT_TIMER_ID, delayMs: 5_000 }
      }
    ]);
    expect(armed.actions).toEqual([]);

    const checked = stepPacketReceiptTimeoutWithActions(armed.state, {
      kind: "receipt/check",
      at: 1005
    });
    expect(checked.state.timedOut).toBe(true);
    expect(checked.state.status).toBe(PacketReceiptStatus.FAILED);
    expect(checked.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ]);
    expect(checked.actions).toEqual([{ kind: "timeout" }]);
    expect(shouldInvokePacketReceiptTimeoutCallback(checked.actions)).toBe(true);
  });

  it("emits delivered/failed actions and concludes timeout on timer/fired", () => {
    let state = stepPacketReceiptTimeoutWithActions(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 10,
      timeoutSeconds: 5
    }).state;

    const failed = stepPacketReceiptTimeoutWithActions(state, {
      kind: "receipt/failed",
      at: 11
    });
    expect(failed.state.status).toBe(PacketReceiptStatus.FAILED);
    expect(failed.state.concludedAt).toBe(11);
    expect(failed.state.timedOut).toBe(false);
    expect(failed.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ]);
    expect(failed.actions).toEqual([{ kind: "failed" }]);
    expect(shouldInvokePacketReceiptAction(failed.actions, "failed")).toBe(true);

    const delivered = stepPacketReceiptTimeoutWithActions(initialPacketReceiptTimeoutState(), {
      kind: "receipt/delivered",
      at: 1
    });
    expect(delivered.intents).toEqual([
      { kind: "timer/cancel", timer: { id: RECEIPT_TIMEOUT_TIMER_ID } }
    ]);
    expect(delivered.actions).toEqual([{ kind: "delivered" }]);
    expect(shouldInvokePacketReceiptAction(delivered.actions, "delivered")).toBe(true);
    expect(
      stepPacketReceiptTimeoutWithActions(delivered.state, { kind: "receipt/failed", at: 2 }).state
        .status
    ).toBe(PacketReceiptStatus.DELIVERED);

    state = stepPacketReceiptTimeoutWithActions(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 1,
      timeoutSeconds: 2
    }).state;
    const fired = stepPacketReceiptTimeoutWithActions(state, {
      kind: "timer/fired",
      id: RECEIPT_TIMEOUT_TIMER_ID,
      at: 3_000
    });
    expect(fired.state.timedOut).toBe(true);
    expect(fired.state.status).toBe(PacketReceiptStatus.FAILED);
    expect(fired.intents).toEqual([]);
    expect(fired.actions).toEqual([{ kind: "timeout" }]);
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
    expect(shouldRegisterPacketReceipt(true)).toBe(true);
    expect(shouldRegisterPacketReceipt(false)).toBe(false);

    const register = stepRegisterPacketReceiptWithActions(initialRegisterPacketReceiptState(), {
      kind: "receipt/register-gate",
      createReceipt: true
    });
    expect(register.actions).toEqual([{ kind: "register" }]);
    expect(shouldRegisterPacketReceiptNow(register.actions)).toBe(true);
    expect(shouldSkipRegisterPacketReceipt(register.actions)).toBe(false);

    const skipRegister = stepRegisterPacketReceiptWithActions(initialRegisterPacketReceiptState(), {
      kind: "receipt/register-gate",
      createReceipt: false
    });
    expect(skipRegister.actions).toEqual([{ kind: "skip" }]);
    expect(shouldRegisterPacketReceiptNow(skipRegister.actions)).toBe(false);
    expect(shouldSkipRegisterPacketReceipt(skipRegister.actions)).toBe(true);

    expect(shouldKeepOutboundReceipt({ planKeep: true, sent: true })).toBe(true);
    expect(shouldKeepOutboundReceipt({ planKeep: true, sent: false })).toBe(false);
    expect(shouldKeepOutboundReceipt({ planKeep: false, sent: true })).toBe(false);

    const keep = stepKeepOutboundReceiptWithActions(initialKeepOutboundReceiptState(), {
      kind: "receipt/keep-outbound-gate",
      planKeep: true,
      sent: true
    });
    expect(keep.actions).toEqual([{ kind: "keep" }]);
    expect(shouldKeepOutboundReceiptNow(keep.actions)).toBe(true);
    expect(shouldSkipKeepOutboundReceipt(keep.actions)).toBe(false);

    const skipKeepUnsent = stepKeepOutboundReceiptWithActions(initialKeepOutboundReceiptState(), {
      kind: "receipt/keep-outbound-gate",
      planKeep: true,
      sent: false
    });
    expect(skipKeepUnsent.actions).toEqual([{ kind: "skip" }]);
    expect(shouldKeepOutboundReceiptNow(skipKeepUnsent.actions)).toBe(false);
    expect(shouldSkipKeepOutboundReceipt(skipKeepUnsent.actions)).toBe(true);

    const skipKeep = stepKeepOutboundReceiptWithActions(initialKeepOutboundReceiptState(), {
      kind: "receipt/keep-outbound-gate",
      planKeep: false,
      sent: true
    });
    expect(skipKeep.actions).toEqual([{ kind: "skip" }]);
    expect(shouldKeepOutboundReceiptNow(skipKeep.actions)).toBe(false);
    expect(shouldSkipKeepOutboundReceipt(skipKeep.actions)).toBe(true);

    const failDrop = stepFailAndDropOutboundReceiptWithActions(
      initialFailAndDropOutboundReceiptState(),
      {
        kind: "receipt/fail-and-drop-gate",
        failAndDrop: true,
        receiptPresent: true
      }
    );
    expect(failDrop.actions).toEqual([{ kind: "fail-and-drop" }]);
    expect(shouldFailAndDropOutboundReceiptNow(failDrop.actions)).toBe(true);
    expect(shouldSkipFailAndDropOutboundReceipt(failDrop.actions)).toBe(false);

    const skipFailDrop = stepFailAndDropOutboundReceiptWithActions(
      initialFailAndDropOutboundReceiptState(),
      {
        kind: "receipt/fail-and-drop-gate",
        failAndDrop: true,
        receiptPresent: false
      }
    );
    expect(skipFailDrop.actions).toEqual([{ kind: "skip" }]);
    expect(shouldFailAndDropOutboundReceiptNow(skipFailDrop.actions)).toBe(false);
    expect(shouldSkipFailAndDropOutboundReceipt(skipFailDrop.actions)).toBe(true);

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
    const remove = stepPacketReceiptUnregisterWithActions(initialPacketReceiptUnregisterState(), {
      kind: "receipt/unregister-gate",
      index: 2
    });
    expect(shouldRemovePacketReceipt(remove.actions)).toBe(true);
    expect(packetReceiptUnregisterIndex(remove.actions)).toBe(2);
    const skip = stepPacketReceiptUnregisterWithActions(initialPacketReceiptUnregisterState(), {
      kind: "receipt/unregister-gate",
      index: -1
    });
    expect(shouldRemovePacketReceipt(skip.actions)).toBe(false);
    expect(packetReceiptUnregisterIndex(skip.actions)).toBeNull();
    expect(planPacketReceiptCallback(true)).toBe("set");
    expect(planPacketReceiptCallback(false)).toBe("clear");
    expect(shouldInvokePacketReceiptTimeoutCallback([{ kind: "timeout" }])).toBe(true);
    expect(shouldInvokePacketReceiptTimeoutCallback([{ kind: "delivered" }])).toBe(false);
    expect(shouldInvokePacketReceiptTimeoutCallback([])).toBe(false);
    expect(shouldArmPacketReceiptTimeoutTimer(0)).toBe(false);
  });

  it("emits clear / set actions from receipt/callback-gate", () => {
    const clear = stepPacketReceiptCallbackWithActions(initialPacketReceiptCallbackState(), {
      kind: "receipt/callback-gate",
      callbackPresent: false
    });
    expect(shouldClearPacketReceiptCallback(clear.actions)).toBe(true);
    expect(shouldSetPacketReceiptCallback(clear.actions)).toBe(false);

    const set = stepPacketReceiptCallbackWithActions(initialPacketReceiptCallbackState(), {
      kind: "receipt/callback-gate",
      callbackPresent: true
    });
    expect(shouldSetPacketReceiptCallback(set.actions)).toBe(true);
    expect(shouldClearPacketReceiptCallback(set.actions)).toBe(false);
  });

  it("emits outbound receipt and proof-ingress actions from gate steps", () => {
    const none = stepOutboundReceiptWithActions(initialOutboundReceiptState(), {
      kind: "receipt/outbound-gate",
      createReceipt: false,
      sent: true
    });
    expect(outboundReceiptOutcomeFromActions(none.actions)).toBe("none");
    expect(shouldOutboundReceiptNone(none.actions)).toBe(true);

    const keep = stepOutboundReceiptWithActions(initialOutboundReceiptState(), {
      kind: "receipt/outbound-gate",
      createReceipt: true,
      sent: true
    });
    expect(shouldOutboundKeepReceipt(keep.actions)).toBe(true);

    const fail = stepOutboundReceiptWithActions(initialOutboundReceiptState(), {
      kind: "receipt/outbound-gate",
      createReceipt: true,
      sent: false
    });
    expect(shouldOutboundFailAndDropReceipt(fail.actions)).toBe(true);

    const remove = stepPacketReceiptProofIngressWithActions(
      initialPacketReceiptProofIngressState(),
      {
        kind: "receipt/proof-ingress-gate",
        truncatedHashMatches: true,
        identityPresent: true,
        proofAccepted: true
      }
    );
    expect(packetReceiptProofIngressFromActions(remove.actions)).toBe("remove-receipt");
    expect(shouldRemovePacketReceiptProofIngress(remove.actions)).toBe(true);

    const cont = stepPacketReceiptProofIngressWithActions(initialPacketReceiptProofIngressState(), {
      kind: "receipt/proof-ingress-gate",
      truncatedHashMatches: true,
      identityPresent: true,
      proofAccepted: false
    });
    expect(shouldContinuePacketReceiptProofIngress(cont.actions)).toBe(true);
  });

  it("StepFn wrapper omits actions while WithActions preserves them", () => {
    const armed = stepPacketReceiptTimeoutWithActions(initialPacketReceiptTimeoutState(), {
      kind: "receipt/arm",
      at: 1,
      timeoutSeconds: 1
    });
    const withActions = stepPacketReceiptTimeoutWithActions(armed.state, {
      kind: "timer/fired",
      id: RECEIPT_TIMEOUT_TIMER_ID,
      at: 2_000
    });
    const stripped = stepPacketReceiptTimeout(armed.state, {
      kind: "timer/fired",
      id: RECEIPT_TIMEOUT_TIMER_ID,
      at: 2_000
    });
    expect(withActions.actions).toEqual([{ kind: "timeout" }]);
    expect(stripped).toEqual({ state: withActions.state, intents: withActions.intents });
  });

  it("double-runs identically", () => {
    const run = () => {
      const steps = [];
      let state = initialPacketReceiptTimeoutState();
      steps.push(
        stepPacketReceiptTimeoutWithActions(state, {
          kind: "receipt/arm",
          at: 100,
          timeoutSeconds: 1
        })
      );
      state = steps[0]!.state;
      steps.push(
        stepPacketReceiptTimeoutWithActions(state, {
          kind: "timer/fired",
          id: RECEIPT_TIMEOUT_TIMER_ID,
          at: 1_100
        })
      );
      return steps.map((step) => ({
        status: step.state.status,
        timedOut: step.state.timedOut,
        concludedAt: step.state.concludedAt,
        intents: step.intents,
        actions: step.actions
      }));
    };
    expect(run()).toEqual(run());
  });
});
