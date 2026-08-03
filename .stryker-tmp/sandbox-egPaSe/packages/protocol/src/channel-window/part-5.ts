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
import { channelPacketTimeoutSeconds, stepChannelPacketTimeoutSecondsWithActions } from "./part-1.js";
import { canArmChannelPacketReceipt, stepArmChannelPacketReceiptWithActions } from "./part-2.js";
import { channelTxReceiptTimeoutRefreshPlanExtensions, planChannelTxReceiptTimeoutRefresh } from "./part-4.js";
import type { ChannelTxReceiptTimeoutRefreshAction, ChannelTxReceiptTimeoutRefreshEvent, ChannelTxReceiptTimeoutRefreshPlanAction, ChannelTxReceiptTimeoutRefreshPlanEvent } from "./part-4.js";
/**
 * Channel TX receipt-timeout refresh plan leaf is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `planChannelTxReceiptTimeoutRefresh` reads beside the step). Nested under
 * {@link stepChannelTxReceiptTimeoutRefreshWithActions}.
 */
export type ChannelTxReceiptTimeoutRefreshPlanState = Record<string, never>;
export interface ChannelTxReceiptTimeoutRefreshPlanStepResult {
  readonly state: ChannelTxReceiptTimeoutRefreshPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxReceiptTimeoutRefreshPlanAction[];
}
export function initialChannelTxReceiptTimeoutRefreshPlanState(): ChannelTxReceiptTimeoutRefreshPlanState {
  if (stryMutAct_9fa48("5144")) {
    {}
  } else {
    stryCov_9fa48("5144");
    return {};
  }
}
export function stepChannelTxReceiptTimeoutRefreshPlanWithActions(state: ChannelTxReceiptTimeoutRefreshPlanState, event: ChannelTxReceiptTimeoutRefreshPlanEvent): ChannelTxReceiptTimeoutRefreshPlanStepResult {
  if (stryMutAct_9fa48("5145")) {
    {}
  } else {
    stryCov_9fa48("5145");
    if (stryMutAct_9fa48("5148") ? event.kind !== "channel/tx-receipt-timeout-refresh-plan-gate" : stryMutAct_9fa48("5147") ? false : stryMutAct_9fa48("5146") ? true : (stryCov_9fa48("5146", "5147", "5148"), event.kind === (stryMutAct_9fa48("5149") ? "" : (stryCov_9fa48("5149"), "channel/tx-receipt-timeout-refresh-plan-gate")))) {
      if (stryMutAct_9fa48("5150")) {
        {}
      } else {
        stryCov_9fa48("5150");
        return stryMutAct_9fa48("5151") ? {} : (stryCov_9fa48("5151"), {
          state,
          intents: stryMutAct_9fa48("5152") ? ["Stryker was here"] : (stryCov_9fa48("5152"), []),
          actions: planChannelTxReceiptTimeoutRefresh(event.entries).map(stryMutAct_9fa48("5153") ? () => undefined : (stryCov_9fa48("5153"), extension => stryMutAct_9fa48("5154") ? {} : (stryCov_9fa48("5154"), {
            kind: "extend" as const,
            index: extension.index,
            timeoutSeconds: extension.timeoutSeconds
          })))
        });
      }
    }
    return stryMutAct_9fa48("5155") ? {} : (stryCov_9fa48("5155"), {
      state,
      intents: stryMutAct_9fa48("5156") ? ["Stryker was here"] : (stryCov_9fa48("5156"), []),
      actions: stryMutAct_9fa48("5157") ? ["Stryker was here"] : (stryCov_9fa48("5157"), [])
    });
  }
}
export function shouldExtendChannelTxReceiptTimeoutRefreshPlan(actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshPlanAction>): boolean {
  if (stryMutAct_9fa48("5158")) {
    {}
  } else {
    stryCov_9fa48("5158");
    return stryMutAct_9fa48("5159") ? actions.every(action => action.kind === "extend") : (stryCov_9fa48("5159"), actions.some(stryMutAct_9fa48("5160") ? () => undefined : (stryCov_9fa48("5160"), action => stryMutAct_9fa48("5163") ? action.kind !== "extend" : stryMutAct_9fa48("5162") ? false : stryMutAct_9fa48("5161") ? true : (stryCov_9fa48("5161", "5162", "5163"), action.kind === (stryMutAct_9fa48("5164") ? "" : (stryCov_9fa48("5164"), "extend"))))));
  }
}

/** Whether the adapter should apply a planned receipt timeout extension. */
export function shouldApplyChannelTxReceiptTimeoutExtension(extensionPresent: boolean): boolean {
  if (stryMutAct_9fa48("5165")) {
    {}
  } else {
    stryCov_9fa48("5165");
    return extensionPresent;
  }
}

/**
 * Channel TX receipt-timeout extension apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldApplyChannelTxReceiptTimeoutExtension` reads beside the step).
 */
export type ApplyChannelTxReceiptTimeoutExtensionState = Record<string, never>;
export type ApplyChannelTxReceiptTimeoutExtensionEvent = Event | {
  readonly kind: "channel/apply-tx-receipt-timeout-extension-gate";
  readonly extensionPresent: boolean;
};
export type ApplyChannelTxReceiptTimeoutExtensionAction = {
  readonly kind: "apply";
} | {
  readonly kind: "skip";
};
export interface ApplyChannelTxReceiptTimeoutExtensionStepResult {
  readonly state: ApplyChannelTxReceiptTimeoutExtensionState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ApplyChannelTxReceiptTimeoutExtensionAction[];
}
export function initialApplyChannelTxReceiptTimeoutExtensionState(): ApplyChannelTxReceiptTimeoutExtensionState {
  if (stryMutAct_9fa48("5166")) {
    {}
  } else {
    stryCov_9fa48("5166");
    return {};
  }
}
export function stepApplyChannelTxReceiptTimeoutExtensionWithActions(state: ApplyChannelTxReceiptTimeoutExtensionState, event: ApplyChannelTxReceiptTimeoutExtensionEvent): ApplyChannelTxReceiptTimeoutExtensionStepResult {
  if (stryMutAct_9fa48("5167")) {
    {}
  } else {
    stryCov_9fa48("5167");
    if (stryMutAct_9fa48("5170") ? event.kind !== "channel/apply-tx-receipt-timeout-extension-gate" : stryMutAct_9fa48("5169") ? false : stryMutAct_9fa48("5168") ? true : (stryCov_9fa48("5168", "5169", "5170"), event.kind === (stryMutAct_9fa48("5171") ? "" : (stryCov_9fa48("5171"), "channel/apply-tx-receipt-timeout-extension-gate")))) {
      if (stryMutAct_9fa48("5172")) {
        {}
      } else {
        stryCov_9fa48("5172");
        return stryMutAct_9fa48("5173") ? {} : (stryCov_9fa48("5173"), {
          state,
          intents: stryMutAct_9fa48("5174") ? ["Stryker was here"] : (stryCov_9fa48("5174"), []),
          actions: stryMutAct_9fa48("5175") ? [] : (stryCov_9fa48("5175"), [stryMutAct_9fa48("5176") ? {} : (stryCov_9fa48("5176"), {
            kind: shouldApplyChannelTxReceiptTimeoutExtension(event.extensionPresent) ? stryMutAct_9fa48("5177") ? "" : (stryCov_9fa48("5177"), "apply") : stryMutAct_9fa48("5178") ? "" : (stryCov_9fa48("5178"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("5179") ? {} : (stryCov_9fa48("5179"), {
      state,
      intents: stryMutAct_9fa48("5180") ? ["Stryker was here"] : (stryCov_9fa48("5180"), []),
      actions: stryMutAct_9fa48("5181") ? ["Stryker was here"] : (stryCov_9fa48("5181"), [])
    });
  }
}
export function shouldApplyChannelTxReceiptTimeoutExtensionNow(actions: ReadonlyArray<ApplyChannelTxReceiptTimeoutExtensionAction>): boolean {
  if (stryMutAct_9fa48("5182")) {
    {}
  } else {
    stryCov_9fa48("5182");
    return stryMutAct_9fa48("5183") ? actions.every(action => action.kind === "apply") : (stryCov_9fa48("5183"), actions.some(stryMutAct_9fa48("5184") ? () => undefined : (stryCov_9fa48("5184"), action => stryMutAct_9fa48("5187") ? action.kind !== "apply" : stryMutAct_9fa48("5186") ? false : stryMutAct_9fa48("5185") ? true : (stryCov_9fa48("5185", "5186", "5187"), action.kind === (stryMutAct_9fa48("5188") ? "" : (stryCov_9fa48("5188"), "apply"))))));
  }
}
export function shouldSkipApplyChannelTxReceiptTimeoutExtension(actions: ReadonlyArray<ApplyChannelTxReceiptTimeoutExtensionAction>): boolean {
  if (stryMutAct_9fa48("5189")) {
    {}
  } else {
    stryCov_9fa48("5189");
    return stryMutAct_9fa48("5190") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("5190"), actions.some(stryMutAct_9fa48("5191") ? () => undefined : (stryCov_9fa48("5191"), action => stryMutAct_9fa48("5194") ? action.kind !== "skip" : stryMutAct_9fa48("5193") ? false : stryMutAct_9fa48("5192") ? true : (stryCov_9fa48("5192", "5193", "5194"), action.kind === (stryMutAct_9fa48("5195") ? "" : (stryCov_9fa48("5195"), "skip"))))));
  }
}

/**
 * Channel TX receipt-timeout refresh is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planChannelTxReceiptTimeoutRefresh` / `canArmChannelPacketReceipt` /
 * `channelPacketTimeoutSeconds` reads beside the step). Arm gate nested via
 * `stepArmChannelPacketReceiptWithActions` (`arm`|`skip`); timeout formula
 * nested via `stepChannelPacketTimeoutSecondsWithActions` (`use-timeout`).
 * Plan nested via {@link stepChannelTxReceiptTimeoutRefreshPlanWithActions}
 * (`extend`).
 */
export type ChannelTxReceiptTimeoutRefreshState = Record<string, never>;
export interface ChannelTxReceiptTimeoutRefreshStepResult {
  readonly state: ChannelTxReceiptTimeoutRefreshState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxReceiptTimeoutRefreshAction[];
}
export function initialChannelTxReceiptTimeoutRefreshState(): ChannelTxReceiptTimeoutRefreshState {
  if (stryMutAct_9fa48("5196")) {
    {}
  } else {
    stryCov_9fa48("5196");
    return {};
  }
}
export function stepChannelTxReceiptTimeoutRefreshWithActions(state: ChannelTxReceiptTimeoutRefreshState, event: ChannelTxReceiptTimeoutRefreshEvent): ChannelTxReceiptTimeoutRefreshStepResult {
  if (stryMutAct_9fa48("5197")) {
    {}
  } else {
    stryCov_9fa48("5197");
    if (stryMutAct_9fa48("5200") ? event.kind !== "channel/tx-receipt-timeout-refresh-gate" : stryMutAct_9fa48("5199") ? false : stryMutAct_9fa48("5198") ? true : (stryCov_9fa48("5198", "5199", "5200"), event.kind === (stryMutAct_9fa48("5201") ? "" : (stryCov_9fa48("5201"), "channel/tx-receipt-timeout-refresh-gate")))) {
      if (stryMutAct_9fa48("5202")) {
        {}
      } else {
        stryCov_9fa48("5202");
        const planActions = stepChannelTxReceiptTimeoutRefreshPlanWithActions(initialChannelTxReceiptTimeoutRefreshPlanState(), stryMutAct_9fa48("5203") ? {} : (stryCov_9fa48("5203"), {
          kind: stryMutAct_9fa48("5204") ? "" : (stryCov_9fa48("5204"), "channel/tx-receipt-timeout-refresh-plan-gate"),
          entries: event.entries
        })).actions;
        return stryMutAct_9fa48("5205") ? {} : (stryCov_9fa48("5205"), {
          state,
          intents: stryMutAct_9fa48("5206") ? ["Stryker was here"] : (stryCov_9fa48("5206"), []),
          actions: channelTxReceiptTimeoutRefreshPlanExtensions(planActions).map(stryMutAct_9fa48("5207") ? () => undefined : (stryCov_9fa48("5207"), extension => stryMutAct_9fa48("5208") ? {} : (stryCov_9fa48("5208"), {
            kind: "extend" as const,
            index: extension.index,
            timeoutSeconds: extension.timeoutSeconds
          })))
        });
      }
    }
    return stryMutAct_9fa48("5209") ? {} : (stryCov_9fa48("5209"), {
      state,
      intents: stryMutAct_9fa48("5210") ? ["Stryker was here"] : (stryCov_9fa48("5210"), []),
      actions: stryMutAct_9fa48("5211") ? ["Stryker was here"] : (stryCov_9fa48("5211"), [])
    });
  }
}

/** Whether step actions include a receipt timeout extension at `index`. */
export function shouldExtendChannelTxReceiptTimeout(actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshAction>): boolean {
  if (stryMutAct_9fa48("5212")) {
    {}
  } else {
    stryCov_9fa48("5212");
    return stryMutAct_9fa48("5213") ? actions.every(action => action.kind === "extend") : (stryCov_9fa48("5213"), actions.some(stryMutAct_9fa48("5214") ? () => undefined : (stryCov_9fa48("5214"), action => stryMutAct_9fa48("5217") ? action.kind !== "extend" : stryMutAct_9fa48("5216") ? false : stryMutAct_9fa48("5215") ? true : (stryCov_9fa48("5215", "5216", "5217"), action.kind === (stryMutAct_9fa48("5218") ? "" : (stryCov_9fa48("5218"), "extend"))))));
  }
}

/** Extract extend actions for the adapter to apply `setTimeout`. */
export function channelTxReceiptTimeoutExtensions(actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshAction>): ReadonlyArray<{
  readonly index: number;
  readonly timeoutSeconds: number;
}> {
  if (stryMutAct_9fa48("5219")) {
    {}
  } else {
    stryCov_9fa48("5219");
    return stryMutAct_9fa48("5220") ? actions.map(action => ({
      index: action.index,
      timeoutSeconds: action.timeoutSeconds
    })) : (stryCov_9fa48("5220"), actions.filter(stryMutAct_9fa48("5221") ? () => undefined : (stryCov_9fa48("5221"), (action): action is ChannelTxReceiptTimeoutRefreshAction => stryMutAct_9fa48("5224") ? action.kind !== "extend" : stryMutAct_9fa48("5223") ? false : stryMutAct_9fa48("5222") ? true : (stryCov_9fa48("5222", "5223", "5224"), action.kind === (stryMutAct_9fa48("5225") ? "" : (stryCov_9fa48("5225"), "extend"))))).map(stryMutAct_9fa48("5226") ? () => undefined : (stryCov_9fa48("5226"), action => stryMutAct_9fa48("5227") ? {} : (stryCov_9fa48("5227"), {
      index: action.index,
      timeoutSeconds: action.timeoutSeconds
    }))));
  }
}