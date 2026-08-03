/** Extracted from channel-window.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS Channel congestion window + packet timeout decisions.
 * Adapters own send/resend/timers; this owns window sizing and timeout formulas.
 * Packet-timeout-seconds / packet-timeout plan / TX outstanding / send-allow /
 * outlet-transmit / TX-envelope index / TX timeout / arm-packet-receipt /
 * extend-packet-receipt-timeout conclusions leave via machine actions (no
 * ad-hoc `channelPacketTimeoutSeconds` / `planChannelPacketTimeout` /
 * `countChannelTxOutstanding` / `channelAllowsSend` /
 * `isChannelOutletTransmitOk` / `indexOfChannelTxEnvelope` /
 * `canArmChannelPacketReceipt` / `shouldExtendPacketReceiptTimeout` /
 * `plan.kind` reads beside the step).
 * TX receipt-timeout refresh nests packet-timeout-seconds via
 * `stepChannelPacketTimeoutSecondsWithActions` (`use-timeout`) and the refresh
 * plan via {@link stepChannelTxReceiptTimeoutRefreshPlanWithActions} (`extend`).
 * TX timeout nests envelope-op via `stepChannelTxEnvelopeOpWithActions`
 * (`miss`|`process`; plan nested via {@link stepChannelTxEnvelopeOpPlanWithActions})
 * and packet-timeout via `stepChannelPacketTimeoutWithActions`
 * (`ignore`|`give-up`|`retry`; plan nested via
 * {@link stepChannelPacketTimeoutPlanWithActions}: ignore|give-up|retry).
 */function stryNS_9fa48() {
  var g = typeof globalThis === 'object' && globalThis && globalThis.Math === Math && globalThis || new Function("return this")();
  var ns = g.__stryker__ || (g.__stryker__ = {});
  if (ns.activeMutant === undefined && g.process && g.process.env && g.process.env.__STRYKER_ACTIVE_MUTANT__) {
    ns.activeMutant = g.process.env.__STRYKER_ACTIVE_MUTANT__;
  }
  function retrieveNS() {
    return ns;
  }
  stryNS_9fa48 = retrieveNS;
  return retrieveNS();
}
stryNS_9fa48();
function stryCov_9fa48() {
  var ns = stryNS_9fa48();
  var cov = ns.mutantCoverage || (ns.mutantCoverage = {
    static: {},
    perTest: {}
  });
  function cover() {
    var c = cov.static;
    if (ns.currentTestId) {
      c = cov.perTest[ns.currentTestId] = cov.perTest[ns.currentTestId] || {};
    }
    var a = arguments;
    for (var i = 0; i < a.length; i++) {
      c[a[i]] = (c[a[i]] || 0) + 1;
    }
  }
  stryCov_9fa48 = cover;
  cover.apply(null, arguments);
}
function stryMutAct_9fa48(id) {
  var ns = stryNS_9fa48();
  function isActive(id) {
    if (ns.activeMutant === id) {
      if (ns.hitCount !== void 0 && ++ns.hitCount > ns.hitLimit) {
        throw new Error('Stryker: Hit count limit reached (' + ns.hitCount + ')');
      }
      return true;
    }
    return false;
  }
  stryMutAct_9fa48 = isActive;
  return isActive(id);
}
import type { Event, Intent, StepFn } from "@twistedpear/effects";
import { equalByteArrays } from "../path-table.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { ChannelWindowLimits } from "./part-1.js";
import { channelTxEnvelopeOpPlanFromActions, planChannelTxEnvelopeOp } from "./part-2.js";
import type { ChannelWindowState } from "./part-1.js";
import type { ChannelTxEnvelopeOpAction, ChannelTxEnvelopeOpEvent, ChannelTxEnvelopeOpPlanAction, ChannelTxEnvelopeOpPlanEvent } from "./part-2.js";
/**
 * Channel TX-envelope-op plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelTxEnvelopeOp`
 * / `plan === "miss"` reads beside the step). Nested under
 * {@link stepChannelTxEnvelopeOpWithActions}.
 */
export type ChannelTxEnvelopeOpPlanState = Record<string, never>;
export interface ChannelTxEnvelopeOpPlanStepResult {
  readonly state: ChannelTxEnvelopeOpPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxEnvelopeOpPlanAction[];
}
export function initialChannelTxEnvelopeOpPlanState(): ChannelTxEnvelopeOpPlanState {
  if (stryMutAct_9fa48("4624")) {
    {}
  } else {
    stryCov_9fa48("4624");
    return {};
  }
}
export function stepChannelTxEnvelopeOpPlanWithActions(state: ChannelTxEnvelopeOpPlanState, event: ChannelTxEnvelopeOpPlanEvent): ChannelTxEnvelopeOpPlanStepResult {
  if (stryMutAct_9fa48("4625")) {
    {}
  } else {
    stryCov_9fa48("4625");
    if (stryMutAct_9fa48("4628") ? event.kind !== "channel/tx-envelope-op-plan-gate" : stryMutAct_9fa48("4627") ? false : stryMutAct_9fa48("4626") ? true : (stryCov_9fa48("4626", "4627", "4628"), event.kind === (stryMutAct_9fa48("4629") ? "" : (stryCov_9fa48("4629"), "channel/tx-envelope-op-plan-gate")))) {
      if (stryMutAct_9fa48("4630")) {
        {}
      } else {
        stryCov_9fa48("4630");
        return stryMutAct_9fa48("4631") ? {} : (stryCov_9fa48("4631"), {
          state,
          intents: stryMutAct_9fa48("4632") ? ["Stryker was here"] : (stryCov_9fa48("4632"), []),
          actions: stryMutAct_9fa48("4633") ? [] : (stryCov_9fa48("4633"), [stryMutAct_9fa48("4634") ? {} : (stryCov_9fa48("4634"), {
            kind: planChannelTxEnvelopeOp(stryMutAct_9fa48("4635") ? {} : (stryCov_9fa48("4635"), {
              indexOk: event.indexOk,
              envelopePresent: event.envelopePresent,
              ...((stryMutAct_9fa48("4638") ? event.opOk === undefined : stryMutAct_9fa48("4637") ? false : stryMutAct_9fa48("4636") ? true : (stryCov_9fa48("4636", "4637", "4638"), event.opOk !== undefined)) ? stryMutAct_9fa48("4639") ? {} : (stryCov_9fa48("4639"), {
                opOk: event.opOk
              }) : {})
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("4640") ? {} : (stryCov_9fa48("4640"), {
      state,
      intents: stryMutAct_9fa48("4641") ? ["Stryker was here"] : (stryCov_9fa48("4641"), []),
      actions: stryMutAct_9fa48("4642") ? ["Stryker was here"] : (stryCov_9fa48("4642"), [])
    });
  }
}
export function shouldMissChannelTxEnvelopeOpPlan(actions: ReadonlyArray<ChannelTxEnvelopeOpPlanAction>): boolean {
  if (stryMutAct_9fa48("4643")) {
    {}
  } else {
    stryCov_9fa48("4643");
    return stryMutAct_9fa48("4644") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("4644"), actions.some(stryMutAct_9fa48("4645") ? () => undefined : (stryCov_9fa48("4645"), action => stryMutAct_9fa48("4648") ? action.kind !== "miss" : stryMutAct_9fa48("4647") ? false : stryMutAct_9fa48("4646") ? true : (stryCov_9fa48("4646", "4647", "4648"), action.kind === (stryMutAct_9fa48("4649") ? "" : (stryCov_9fa48("4649"), "miss"))))));
  }
}
export function shouldProcessChannelTxEnvelopeOpPlan(actions: ReadonlyArray<ChannelTxEnvelopeOpPlanAction>): boolean {
  if (stryMutAct_9fa48("4650")) {
    {}
  } else {
    stryCov_9fa48("4650");
    return stryMutAct_9fa48("4651") ? actions.every(action => action.kind === "process") : (stryCov_9fa48("4651"), actions.some(stryMutAct_9fa48("4652") ? () => undefined : (stryCov_9fa48("4652"), action => stryMutAct_9fa48("4655") ? action.kind !== "process" : stryMutAct_9fa48("4654") ? false : stryMutAct_9fa48("4653") ? true : (stryCov_9fa48("4653", "4654", "4655"), action.kind === (stryMutAct_9fa48("4656") ? "" : (stryCov_9fa48("4656"), "process"))))));
  }
}

/**
 * Channel TX-envelope op gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelTxEnvelopeOp`
 * / `plan === "miss"` reads beside the step).
 * Plan nested via {@link stepChannelTxEnvelopeOpPlanWithActions}
 * (`miss`|`process`).
 */
export type ChannelTxEnvelopeOpState = Record<string, never>;
export interface ChannelTxEnvelopeOpStepResult {
  readonly state: ChannelTxEnvelopeOpState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxEnvelopeOpAction[];
}
export function initialChannelTxEnvelopeOpState(): ChannelTxEnvelopeOpState {
  if (stryMutAct_9fa48("4657")) {
    {}
  } else {
    stryCov_9fa48("4657");
    return {};
  }
}
export function stepChannelTxEnvelopeOpWithActions(state: ChannelTxEnvelopeOpState, event: ChannelTxEnvelopeOpEvent): ChannelTxEnvelopeOpStepResult {
  if (stryMutAct_9fa48("4658")) {
    {}
  } else {
    stryCov_9fa48("4658");
    if (stryMutAct_9fa48("4661") ? event.kind !== "channel/tx-envelope-op-gate" : stryMutAct_9fa48("4660") ? false : stryMutAct_9fa48("4659") ? true : (stryCov_9fa48("4659", "4660", "4661"), event.kind === (stryMutAct_9fa48("4662") ? "" : (stryCov_9fa48("4662"), "channel/tx-envelope-op-gate")))) {
      if (stryMutAct_9fa48("4663")) {
        {}
      } else {
        stryCov_9fa48("4663");
        const planActions = stepChannelTxEnvelopeOpPlanWithActions(initialChannelTxEnvelopeOpPlanState(), stryMutAct_9fa48("4664") ? {} : (stryCov_9fa48("4664"), {
          kind: stryMutAct_9fa48("4665") ? "" : (stryCov_9fa48("4665"), "channel/tx-envelope-op-plan-gate"),
          indexOk: event.indexOk,
          envelopePresent: event.envelopePresent,
          ...((stryMutAct_9fa48("4668") ? event.opOk === undefined : stryMutAct_9fa48("4667") ? false : stryMutAct_9fa48("4666") ? true : (stryCov_9fa48("4666", "4667", "4668"), event.opOk !== undefined)) ? stryMutAct_9fa48("4669") ? {} : (stryCov_9fa48("4669"), {
            opOk: event.opOk
          }) : {})
        })).actions;
        const plan = channelTxEnvelopeOpPlanFromActions(planActions);
        if (stryMutAct_9fa48("4672") ? plan !== null : stryMutAct_9fa48("4671") ? false : stryMutAct_9fa48("4670") ? true : (stryCov_9fa48("4670", "4671", "4672"), plan === null)) {
          if (stryMutAct_9fa48("4673")) {
            {}
          } else {
            stryCov_9fa48("4673");
            return stryMutAct_9fa48("4674") ? {} : (stryCov_9fa48("4674"), {
              state,
              intents: stryMutAct_9fa48("4675") ? ["Stryker was here"] : (stryCov_9fa48("4675"), []),
              actions: stryMutAct_9fa48("4676") ? ["Stryker was here"] : (stryCov_9fa48("4676"), [])
            });
          }
        }
        return stryMutAct_9fa48("4677") ? {} : (stryCov_9fa48("4677"), {
          state,
          intents: stryMutAct_9fa48("4678") ? ["Stryker was here"] : (stryCov_9fa48("4678"), []),
          actions: stryMutAct_9fa48("4679") ? [] : (stryCov_9fa48("4679"), [stryMutAct_9fa48("4680") ? {} : (stryCov_9fa48("4680"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("4681") ? {} : (stryCov_9fa48("4681"), {
      state,
      intents: stryMutAct_9fa48("4682") ? ["Stryker was here"] : (stryCov_9fa48("4682"), []),
      actions: stryMutAct_9fa48("4683") ? ["Stryker was here"] : (stryCov_9fa48("4683"), [])
    });
  }
}
export function shouldMissChannelTxEnvelopeOp(actions: ReadonlyArray<ChannelTxEnvelopeOpAction>): boolean {
  if (stryMutAct_9fa48("4684")) {
    {}
  } else {
    stryCov_9fa48("4684");
    return stryMutAct_9fa48("4685") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("4685"), actions.some(stryMutAct_9fa48("4686") ? () => undefined : (stryCov_9fa48("4686"), action => stryMutAct_9fa48("4689") ? action.kind !== "miss" : stryMutAct_9fa48("4688") ? false : stryMutAct_9fa48("4687") ? true : (stryCov_9fa48("4687", "4688", "4689"), action.kind === (stryMutAct_9fa48("4690") ? "" : (stryCov_9fa48("4690"), "miss"))))));
  }
}
export function shouldProcessChannelTxEnvelopeOp(actions: ReadonlyArray<ChannelTxEnvelopeOpAction>): boolean {
  if (stryMutAct_9fa48("4691")) {
    {}
  } else {
    stryCov_9fa48("4691");
    return stryMutAct_9fa48("4692") ? actions.every(action => action.kind === "process") : (stryCov_9fa48("4692"), actions.some(stryMutAct_9fa48("4693") ? () => undefined : (stryCov_9fa48("4693"), action => stryMutAct_9fa48("4696") ? action.kind !== "process" : stryMutAct_9fa48("4695") ? false : stryMutAct_9fa48("4694") ? true : (stryCov_9fa48("4694", "4695", "4696"), action.kind === (stryMutAct_9fa48("4697") ? "" : (stryCov_9fa48("4697"), "process"))))));
  }
}

/** Whether channel outlet arming should apply a non-null receipt timeout. */
export function shouldApplyChannelPacketReceiptTimeout(timeoutPresent: boolean): boolean {
  if (stryMutAct_9fa48("4698")) {
    {}
  } else {
    stryCov_9fa48("4698");
    return timeoutPresent;
  }
}

/**
 * Channel packet-receipt timeout apply gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyChannelPacketReceiptTimeout` reads beside the step).
 */
export type ApplyChannelPacketReceiptTimeoutState = Record<string, never>;
export type ApplyChannelPacketReceiptTimeoutEvent = Event | {
  readonly kind: "channel/apply-packet-receipt-timeout-gate";
  readonly timeoutPresent: boolean;
};
export type ApplyChannelPacketReceiptTimeoutAction = {
  readonly kind: "apply";
} | {
  readonly kind: "skip";
};
export interface ApplyChannelPacketReceiptTimeoutStepResult {
  readonly state: ApplyChannelPacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyChannelPacketReceiptTimeoutAction[];
}
export function initialApplyChannelPacketReceiptTimeoutState(): ApplyChannelPacketReceiptTimeoutState {
  if (stryMutAct_9fa48("4699")) {
    {}
  } else {
    stryCov_9fa48("4699");
    return {};
  }
}
export function stepApplyChannelPacketReceiptTimeoutWithActions(state: ApplyChannelPacketReceiptTimeoutState, event: ApplyChannelPacketReceiptTimeoutEvent): ApplyChannelPacketReceiptTimeoutStepResult {
  if (stryMutAct_9fa48("4700")) {
    {}
  } else {
    stryCov_9fa48("4700");
    if (stryMutAct_9fa48("4703") ? event.kind !== "channel/apply-packet-receipt-timeout-gate" : stryMutAct_9fa48("4702") ? false : stryMutAct_9fa48("4701") ? true : (stryCov_9fa48("4701", "4702", "4703"), event.kind === (stryMutAct_9fa48("4704") ? "" : (stryCov_9fa48("4704"), "channel/apply-packet-receipt-timeout-gate")))) {
      if (stryMutAct_9fa48("4705")) {
        {}
      } else {
        stryCov_9fa48("4705");
        return stryMutAct_9fa48("4706") ? {} : (stryCov_9fa48("4706"), {
          state,
          intents: stryMutAct_9fa48("4707") ? ["Stryker was here"] : (stryCov_9fa48("4707"), []),
          actions: stryMutAct_9fa48("4708") ? [] : (stryCov_9fa48("4708"), [stryMutAct_9fa48("4709") ? {} : (stryCov_9fa48("4709"), {
            kind: shouldApplyChannelPacketReceiptTimeout(event.timeoutPresent) ? stryMutAct_9fa48("4710") ? "" : (stryCov_9fa48("4710"), "apply") : stryMutAct_9fa48("4711") ? "" : (stryCov_9fa48("4711"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4712") ? {} : (stryCov_9fa48("4712"), {
      state,
      intents: stryMutAct_9fa48("4713") ? ["Stryker was here"] : (stryCov_9fa48("4713"), []),
      actions: stryMutAct_9fa48("4714") ? ["Stryker was here"] : (stryCov_9fa48("4714"), [])
    });
  }
}
export function shouldApplyChannelPacketReceiptTimeoutNow(actions: ReadonlyArray<ApplyChannelPacketReceiptTimeoutAction>): boolean {
  if (stryMutAct_9fa48("4715")) {
    {}
  } else {
    stryCov_9fa48("4715");
    return stryMutAct_9fa48("4716") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("4716"), actions.some(stryMutAct_9fa48("4717") ? () => undefined : (stryCov_9fa48("4717"), action => stryMutAct_9fa48("4720") ? action.kind !== "apply" : stryMutAct_9fa48("4719") ? false : stryMutAct_9fa48("4718") ? true : (stryCov_9fa48("4718", "4719", "4720"), action.kind === (stryMutAct_9fa48("4721") ? "" : (stryCov_9fa48("4721"), "apply"))))));
  }
}
export function shouldSkipApplyChannelPacketReceiptTimeout(actions: ReadonlyArray<ApplyChannelPacketReceiptTimeoutAction>): boolean {
  if (stryMutAct_9fa48("4722")) {
    {}
  } else {
    stryCov_9fa48("4722");
    return stryMutAct_9fa48("4723") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4723"), actions.some(stryMutAct_9fa48("4724") ? () => undefined : (stryCov_9fa48("4724"), action => stryMutAct_9fa48("4727") ? action.kind !== "skip" : stryMutAct_9fa48("4726") ? false : stryMutAct_9fa48("4725") ? true : (stryCov_9fa48("4725", "4726", "4727"), action.kind === (stryMutAct_9fa48("4728") ? "" : (stryCov_9fa48("4728"), "skip"))))));
  }
}

/** Whether a successful resend should replace the envelope's tracked packet. */
export function shouldReplaceChannelResentPacket(resentPresent: boolean): boolean {
  if (stryMutAct_9fa48("4729")) {
    {}
  } else {
    stryCov_9fa48("4729");
    return resentPresent;
  }
}

/**
 * Channel resent-packet replace gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldReplaceChannelResentPacket`
 * reads beside the step).
 */
export type ReplaceChannelResentPacketState = Record<string, never>;
export type ReplaceChannelResentPacketEvent = Event | {
  readonly kind: "channel/replace-resent-packet-gate";
  readonly resentPresent: boolean;
};
export type ReplaceChannelResentPacketAction = {
  readonly kind: "replace";
} | {
  readonly kind: "skip";
};
export interface ReplaceChannelResentPacketStepResult {
  readonly state: ReplaceChannelResentPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReplaceChannelResentPacketAction[];
}
export function initialReplaceChannelResentPacketState(): ReplaceChannelResentPacketState {
  if (stryMutAct_9fa48("4730")) {
    {}
  } else {
    stryCov_9fa48("4730");
    return {};
  }
}
export function stepReplaceChannelResentPacketWithActions(state: ReplaceChannelResentPacketState, event: ReplaceChannelResentPacketEvent): ReplaceChannelResentPacketStepResult {
  if (stryMutAct_9fa48("4731")) {
    {}
  } else {
    stryCov_9fa48("4731");
    if (stryMutAct_9fa48("4734") ? event.kind !== "channel/replace-resent-packet-gate" : stryMutAct_9fa48("4733") ? false : stryMutAct_9fa48("4732") ? true : (stryCov_9fa48("4732", "4733", "4734"), event.kind === (stryMutAct_9fa48("4735") ? "" : (stryCov_9fa48("4735"), "channel/replace-resent-packet-gate")))) {
      if (stryMutAct_9fa48("4736")) {
        {}
      } else {
        stryCov_9fa48("4736");
        return stryMutAct_9fa48("4737") ? {} : (stryCov_9fa48("4737"), {
          state,
          intents: stryMutAct_9fa48("4738") ? ["Stryker was here"] : (stryCov_9fa48("4738"), []),
          actions: stryMutAct_9fa48("4739") ? [] : (stryCov_9fa48("4739"), [stryMutAct_9fa48("4740") ? {} : (stryCov_9fa48("4740"), {
            kind: shouldReplaceChannelResentPacket(event.resentPresent) ? stryMutAct_9fa48("4741") ? "" : (stryCov_9fa48("4741"), "replace") : stryMutAct_9fa48("4742") ? "" : (stryCov_9fa48("4742"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4743") ? {} : (stryCov_9fa48("4743"), {
      state,
      intents: stryMutAct_9fa48("4744") ? ["Stryker was here"] : (stryCov_9fa48("4744"), []),
      actions: stryMutAct_9fa48("4745") ? ["Stryker was here"] : (stryCov_9fa48("4745"), [])
    });
  }
}
export function shouldReplaceChannelResentPacketNow(actions: ReadonlyArray<ReplaceChannelResentPacketAction>): boolean {
  if (stryMutAct_9fa48("4746")) {
    {}
  } else {
    stryCov_9fa48("4746");
    return stryMutAct_9fa48("4747") ? actions.every(action => action.kind === "replace") : (stryCov_9fa48("4747"), actions.some(stryMutAct_9fa48("4748") ? () => undefined : (stryCov_9fa48("4748"), action => stryMutAct_9fa48("4751") ? action.kind !== "replace" : stryMutAct_9fa48("4750") ? false : stryMutAct_9fa48("4749") ? true : (stryCov_9fa48("4749", "4750", "4751"), action.kind === (stryMutAct_9fa48("4752") ? "" : (stryCov_9fa48("4752"), "replace"))))));
  }
}
export function shouldSkipReplaceChannelResentPacket(actions: ReadonlyArray<ReplaceChannelResentPacketAction>): boolean {
  if (stryMutAct_9fa48("4753")) {
    {}
  } else {
    stryCov_9fa48("4753");
    return stryMutAct_9fa48("4754") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4754"), actions.some(stryMutAct_9fa48("4755") ? () => undefined : (stryCov_9fa48("4755"), action => stryMutAct_9fa48("4758") ? action.kind !== "skip" : stryMutAct_9fa48("4757") ? false : stryMutAct_9fa48("4756") ? true : (stryCov_9fa48("4756", "4757", "4758"), action.kind === (stryMutAct_9fa48("4759") ? "" : (stryCov_9fa48("4759"), "skip"))))));
  }
}

/** Whether a timed-out channel envelope still has a packet to resend. */
export function shouldResendChannelTimeoutPacket(packetPresent: boolean): boolean {
  if (stryMutAct_9fa48("4760")) {
    {}
  } else {
    stryCov_9fa48("4760");
    return packetPresent;
  }
}

/**
 * Channel TX-timeout resend gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldResendChannelTimeoutPacket`
 * reads beside the step).
 */
export type ResendChannelTimeoutPacketState = Record<string, never>;
export type ResendChannelTimeoutPacketEvent = Event | {
  readonly kind: "channel/resend-timeout-packet-gate";
  readonly packetPresent: boolean;
};
export type ResendChannelTimeoutPacketAction = {
  readonly kind: "resend";
} | {
  readonly kind: "skip";
};
export interface ResendChannelTimeoutPacketStepResult {
  readonly state: ResendChannelTimeoutPacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResendChannelTimeoutPacketAction[];
}
export function initialResendChannelTimeoutPacketState(): ResendChannelTimeoutPacketState {
  if (stryMutAct_9fa48("4761")) {
    {}
  } else {
    stryCov_9fa48("4761");
    return {};
  }
}
export function stepResendChannelTimeoutPacketWithActions(state: ResendChannelTimeoutPacketState, event: ResendChannelTimeoutPacketEvent): ResendChannelTimeoutPacketStepResult {
  if (stryMutAct_9fa48("4762")) {
    {}
  } else {
    stryCov_9fa48("4762");
    if (stryMutAct_9fa48("4765") ? event.kind !== "channel/resend-timeout-packet-gate" : stryMutAct_9fa48("4764") ? false : stryMutAct_9fa48("4763") ? true : (stryCov_9fa48("4763", "4764", "4765"), event.kind === (stryMutAct_9fa48("4766") ? "" : (stryCov_9fa48("4766"), "channel/resend-timeout-packet-gate")))) {
      if (stryMutAct_9fa48("4767")) {
        {}
      } else {
        stryCov_9fa48("4767");
        return stryMutAct_9fa48("4768") ? {} : (stryCov_9fa48("4768"), {
          state,
          intents: stryMutAct_9fa48("4769") ? ["Stryker was here"] : (stryCov_9fa48("4769"), []),
          actions: stryMutAct_9fa48("4770") ? [] : (stryCov_9fa48("4770"), [stryMutAct_9fa48("4771") ? {} : (stryCov_9fa48("4771"), {
            kind: shouldResendChannelTimeoutPacket(event.packetPresent) ? stryMutAct_9fa48("4772") ? "" : (stryCov_9fa48("4772"), "resend") : stryMutAct_9fa48("4773") ? "" : (stryCov_9fa48("4773"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4774") ? {} : (stryCov_9fa48("4774"), {
      state,
      intents: stryMutAct_9fa48("4775") ? ["Stryker was here"] : (stryCov_9fa48("4775"), []),
      actions: stryMutAct_9fa48("4776") ? ["Stryker was here"] : (stryCov_9fa48("4776"), [])
    });
  }
}
export function shouldResendChannelTimeoutPacketNow(actions: ReadonlyArray<ResendChannelTimeoutPacketAction>): boolean {
  if (stryMutAct_9fa48("4777")) {
    {}
  } else {
    stryCov_9fa48("4777");
    return stryMutAct_9fa48("4778") ? actions.every(action => action.kind === "resend") : (stryCov_9fa48("4778"), actions.some(stryMutAct_9fa48("4779") ? () => undefined : (stryCov_9fa48("4779"), action => stryMutAct_9fa48("4782") ? action.kind !== "resend" : stryMutAct_9fa48("4781") ? false : stryMutAct_9fa48("4780") ? true : (stryCov_9fa48("4780", "4781", "4782"), action.kind === (stryMutAct_9fa48("4783") ? "" : (stryCov_9fa48("4783"), "resend"))))));
  }
}
export function shouldSkipResendChannelTimeoutPacket(actions: ReadonlyArray<ResendChannelTimeoutPacketAction>): boolean {
  if (stryMutAct_9fa48("4784")) {
    {}
  } else {
    stryCov_9fa48("4784");
    return stryMutAct_9fa48("4785") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4785"), actions.some(stryMutAct_9fa48("4786") ? () => undefined : (stryCov_9fa48("4786"), action => stryMutAct_9fa48("4789") ? action.kind !== "skip" : stryMutAct_9fa48("4788") ? false : stryMutAct_9fa48("4787") ? true : (stryCov_9fa48("4787", "4788", "4789"), action.kind === (stryMutAct_9fa48("4790") ? "" : (stryCov_9fa48("4790"), "skip"))))));
  }
}

/** Whether shutdown may clear outlet callbacks for a TX-ring envelope packet. */
export function shouldClearChannelEnvelopePacket(packetPresent: boolean): boolean {
  if (stryMutAct_9fa48("4791")) {
    {}
  } else {
    stryCov_9fa48("4791");
    return packetPresent;
  }
}

/**
 * Channel envelope-packet clear gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldClearChannelEnvelopePacket`
 * reads beside the step).
 */
export type ClearChannelEnvelopePacketState = Record<string, never>;
export type ClearChannelEnvelopePacketEvent = Event | {
  readonly kind: "channel/clear-envelope-packet-gate";
  readonly packetPresent: boolean;
};
export type ClearChannelEnvelopePacketAction = {
  readonly kind: "clear";
} | {
  readonly kind: "skip";
};
export interface ClearChannelEnvelopePacketStepResult {
  readonly state: ClearChannelEnvelopePacketState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClearChannelEnvelopePacketAction[];
}
export function initialClearChannelEnvelopePacketState(): ClearChannelEnvelopePacketState {
  if (stryMutAct_9fa48("4792")) {
    {}
  } else {
    stryCov_9fa48("4792");
    return {};
  }
}
export function stepClearChannelEnvelopePacketWithActions(state: ClearChannelEnvelopePacketState, event: ClearChannelEnvelopePacketEvent): ClearChannelEnvelopePacketStepResult {
  if (stryMutAct_9fa48("4793")) {
    {}
  } else {
    stryCov_9fa48("4793");
    if (stryMutAct_9fa48("4796") ? event.kind !== "channel/clear-envelope-packet-gate" : stryMutAct_9fa48("4795") ? false : stryMutAct_9fa48("4794") ? true : (stryCov_9fa48("4794", "4795", "4796"), event.kind === (stryMutAct_9fa48("4797") ? "" : (stryCov_9fa48("4797"), "channel/clear-envelope-packet-gate")))) {
      if (stryMutAct_9fa48("4798")) {
        {}
      } else {
        stryCov_9fa48("4798");
        return stryMutAct_9fa48("4799") ? {} : (stryCov_9fa48("4799"), {
          state,
          intents: stryMutAct_9fa48("4800") ? ["Stryker was here"] : (stryCov_9fa48("4800"), []),
          actions: stryMutAct_9fa48("4801") ? [] : (stryCov_9fa48("4801"), [stryMutAct_9fa48("4802") ? {} : (stryCov_9fa48("4802"), {
            kind: shouldClearChannelEnvelopePacket(event.packetPresent) ? stryMutAct_9fa48("4803") ? "" : (stryCov_9fa48("4803"), "clear") : stryMutAct_9fa48("4804") ? "" : (stryCov_9fa48("4804"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4805") ? {} : (stryCov_9fa48("4805"), {
      state,
      intents: stryMutAct_9fa48("4806") ? ["Stryker was here"] : (stryCov_9fa48("4806"), []),
      actions: stryMutAct_9fa48("4807") ? ["Stryker was here"] : (stryCov_9fa48("4807"), [])
    });
  }
}
export function shouldClearChannelEnvelopePacketNow(actions: ReadonlyArray<ClearChannelEnvelopePacketAction>): boolean {
  if (stryMutAct_9fa48("4808")) {
    {}
  } else {
    stryCov_9fa48("4808");
    return stryMutAct_9fa48("4809") ? actions.every(action => action.kind === "clear") : (stryCov_9fa48("4809"), actions.some(stryMutAct_9fa48("4810") ? () => undefined : (stryCov_9fa48("4810"), action => stryMutAct_9fa48("4813") ? action.kind !== "clear" : stryMutAct_9fa48("4812") ? false : stryMutAct_9fa48("4811") ? true : (stryCov_9fa48("4811", "4812", "4813"), action.kind === (stryMutAct_9fa48("4814") ? "" : (stryCov_9fa48("4814"), "clear"))))));
  }
}
export function shouldSkipClearChannelEnvelopePacket(actions: ReadonlyArray<ClearChannelEnvelopePacketAction>): boolean {
  if (stryMutAct_9fa48("4815")) {
    {}
  } else {
    stryCov_9fa48("4815");
    return stryMutAct_9fa48("4816") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4816"), actions.some(stryMutAct_9fa48("4817") ? () => undefined : (stryCov_9fa48("4817"), action => stryMutAct_9fa48("4820") ? action.kind !== "skip" : stryMutAct_9fa48("4819") ? false : stryMutAct_9fa48("4818") ? true : (stryCov_9fa48("4818", "4819", "4820"), action.kind === (stryMutAct_9fa48("4821") ? "" : (stryCov_9fa48("4821"), "skip"))))));
  }
}

/** Shrink window after a packet timeout / retry. */
export function applyChannelTimeout(state: ChannelWindowState): ChannelWindowState {
  if (stryMutAct_9fa48("4822")) {
    {}
  } else {
    stryCov_9fa48("4822");
    let window = state.window;
    let windowMax = state.windowMax;
    if (stryMutAct_9fa48("4826") ? window <= state.windowMin : stryMutAct_9fa48("4825") ? window >= state.windowMin : stryMutAct_9fa48("4824") ? false : stryMutAct_9fa48("4823") ? true : (stryCov_9fa48("4823", "4824", "4825", "4826"), window > state.windowMin)) {
      if (stryMutAct_9fa48("4827")) {
        {}
      } else {
        stryCov_9fa48("4827");
        stryMutAct_9fa48("4828") ? window += 1 : (stryCov_9fa48("4828"), window -= 1);
      }
    }
    if (stryMutAct_9fa48("4832") ? windowMax <= state.windowMin + state.windowFlexibility : stryMutAct_9fa48("4831") ? windowMax >= state.windowMin + state.windowFlexibility : stryMutAct_9fa48("4830") ? false : stryMutAct_9fa48("4829") ? true : (stryCov_9fa48("4829", "4830", "4831", "4832"), windowMax > (stryMutAct_9fa48("4833") ? state.windowMin - state.windowFlexibility : (stryCov_9fa48("4833"), state.windowMin + state.windowFlexibility)))) {
      if (stryMutAct_9fa48("4834")) {
        {}
      } else {
        stryCov_9fa48("4834");
        stryMutAct_9fa48("4835") ? windowMax += 1 : (stryCov_9fa48("4835"), windowMax -= 1);
      }
    }
    return stryMutAct_9fa48("4836") ? {} : (stryCov_9fa48("4836"), {
      ...state,
      window,
      windowMax
    });
  }
}

/** Grow window / upgrade rate tiers after a successful delivery. */
export function applyChannelDelivery(state: ChannelWindowState, rtt: number): ChannelWindowState {
  if (stryMutAct_9fa48("4837")) {
    {}
  } else {
    stryCov_9fa48("4837");
    let {
      window,
      windowMax,
      windowMin,
      windowFlexibility,
      fastRateRounds,
      mediumRateRounds
    } = state;
    if (stryMutAct_9fa48("4841") ? window >= windowMax : stryMutAct_9fa48("4840") ? window <= windowMax : stryMutAct_9fa48("4839") ? false : stryMutAct_9fa48("4838") ? true : (stryCov_9fa48("4838", "4839", "4840", "4841"), window < windowMax)) {
      if (stryMutAct_9fa48("4842")) {
        {}
      } else {
        stryCov_9fa48("4842");
        stryMutAct_9fa48("4843") ? window -= 1 : (stryCov_9fa48("4843"), window += 1);
      }
    }
    if (stryMutAct_9fa48("4846") ? rtt !== 0 : stryMutAct_9fa48("4845") ? false : stryMutAct_9fa48("4844") ? true : (stryCov_9fa48("4844", "4845", "4846"), rtt === 0)) {
      if (stryMutAct_9fa48("4847")) {
        {}
      } else {
        stryCov_9fa48("4847");
        return stryMutAct_9fa48("4848") ? {} : (stryCov_9fa48("4848"), {
          window,
          windowMax,
          windowMin,
          windowFlexibility,
          fastRateRounds,
          mediumRateRounds
        });
      }
    }
    if (stryMutAct_9fa48("4852") ? rtt <= ChannelWindowLimits.RTT_FAST : stryMutAct_9fa48("4851") ? rtt >= ChannelWindowLimits.RTT_FAST : stryMutAct_9fa48("4850") ? false : stryMutAct_9fa48("4849") ? true : (stryCov_9fa48("4849", "4850", "4851", "4852"), rtt > ChannelWindowLimits.RTT_FAST)) {
      if (stryMutAct_9fa48("4853")) {
        {}
      } else {
        stryCov_9fa48("4853");
        fastRateRounds = 0;
      }
    }
    if (stryMutAct_9fa48("4857") ? rtt <= ChannelWindowLimits.RTT_MEDIUM : stryMutAct_9fa48("4856") ? rtt >= ChannelWindowLimits.RTT_MEDIUM : stryMutAct_9fa48("4855") ? false : stryMutAct_9fa48("4854") ? true : (stryCov_9fa48("4854", "4855", "4856", "4857"), rtt > ChannelWindowLimits.RTT_MEDIUM)) {
      if (stryMutAct_9fa48("4858")) {
        {}
      } else {
        stryCov_9fa48("4858");
        mediumRateRounds = 0;
      }
    } else {
      if (stryMutAct_9fa48("4859")) {
        {}
      } else {
        stryCov_9fa48("4859");
        stryMutAct_9fa48("4860") ? mediumRateRounds -= 1 : (stryCov_9fa48("4860"), mediumRateRounds += 1);
        if (stryMutAct_9fa48("4863") ? windowMax < ChannelWindowLimits.WINDOW_MAX_MEDIUM || mediumRateRounds === ChannelWindowLimits.FAST_RATE_THRESHOLD : stryMutAct_9fa48("4862") ? false : stryMutAct_9fa48("4861") ? true : (stryCov_9fa48("4861", "4862", "4863"), (stryMutAct_9fa48("4866") ? windowMax >= ChannelWindowLimits.WINDOW_MAX_MEDIUM : stryMutAct_9fa48("4865") ? windowMax <= ChannelWindowLimits.WINDOW_MAX_MEDIUM : stryMutAct_9fa48("4864") ? true : (stryCov_9fa48("4864", "4865", "4866"), windowMax < ChannelWindowLimits.WINDOW_MAX_MEDIUM)) && (stryMutAct_9fa48("4868") ? mediumRateRounds !== ChannelWindowLimits.FAST_RATE_THRESHOLD : stryMutAct_9fa48("4867") ? true : (stryCov_9fa48("4867", "4868"), mediumRateRounds === ChannelWindowLimits.FAST_RATE_THRESHOLD)))) {
          if (stryMutAct_9fa48("4869")) {
            {}
          } else {
            stryCov_9fa48("4869");
            windowMax = ChannelWindowLimits.WINDOW_MAX_MEDIUM;
            windowMin = ChannelWindowLimits.WINDOW_MIN_LIMIT_MEDIUM;
          }
        }
      }
    }
    if (stryMutAct_9fa48("4873") ? rtt > ChannelWindowLimits.RTT_FAST : stryMutAct_9fa48("4872") ? rtt < ChannelWindowLimits.RTT_FAST : stryMutAct_9fa48("4871") ? false : stryMutAct_9fa48("4870") ? true : (stryCov_9fa48("4870", "4871", "4872", "4873"), rtt <= ChannelWindowLimits.RTT_FAST)) {
      if (stryMutAct_9fa48("4874")) {
        {}
      } else {
        stryCov_9fa48("4874");
        stryMutAct_9fa48("4875") ? fastRateRounds -= 1 : (stryCov_9fa48("4875"), fastRateRounds += 1);
        if (stryMutAct_9fa48("4878") ? windowMax < ChannelWindowLimits.WINDOW_MAX_FAST || fastRateRounds === ChannelWindowLimits.FAST_RATE_THRESHOLD : stryMutAct_9fa48("4877") ? false : stryMutAct_9fa48("4876") ? true : (stryCov_9fa48("4876", "4877", "4878"), (stryMutAct_9fa48("4881") ? windowMax >= ChannelWindowLimits.WINDOW_MAX_FAST : stryMutAct_9fa48("4880") ? windowMax <= ChannelWindowLimits.WINDOW_MAX_FAST : stryMutAct_9fa48("4879") ? true : (stryCov_9fa48("4879", "4880", "4881"), windowMax < ChannelWindowLimits.WINDOW_MAX_FAST)) && (stryMutAct_9fa48("4883") ? fastRateRounds !== ChannelWindowLimits.FAST_RATE_THRESHOLD : stryMutAct_9fa48("4882") ? true : (stryCov_9fa48("4882", "4883"), fastRateRounds === ChannelWindowLimits.FAST_RATE_THRESHOLD)))) {
          if (stryMutAct_9fa48("4884")) {
            {}
          } else {
            stryCov_9fa48("4884");
            windowMax = ChannelWindowLimits.WINDOW_MAX_FAST;
            windowMin = ChannelWindowLimits.WINDOW_MIN_LIMIT_FAST;
          }
        }
      }
    }
    return stryMutAct_9fa48("4885") ? {} : (stryCov_9fa48("4885"), {
      window,
      windowMax,
      windowMin,
      windowFlexibility,
      fastRateRounds,
      mediumRateRounds
    });
  }
}

/** Default max TX tries for a channel envelope (RNS Channel). */
export const CHANNEL_MAX_TRIES = 5;