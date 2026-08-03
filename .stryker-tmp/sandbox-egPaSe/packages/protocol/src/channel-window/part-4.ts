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
import { channelPacketTimeoutFromActions, initialChannelPacketTimeoutSecondsState, initialChannelWindowState, stepChannelPacketTimeoutSecondsWithActions } from "./part-1.js";
import { initialArmChannelPacketReceiptState, initialExtendPacketReceiptTimeoutState, planChannelTxEnvelopeOp, shouldArmChannelPacketReceiptNow, shouldExtendPacketReceiptTimeoutNow, stepArmChannelPacketReceiptWithActions, stepExtendPacketReceiptTimeoutWithActions } from "./part-2.js";
import { CHANNEL_MAX_TRIES, applyChannelDelivery, applyChannelTimeout, initialChannelTxEnvelopeOpState, shouldMissChannelTxEnvelopeOp, stepChannelTxEnvelopeOpPlanWithActions, stepChannelTxEnvelopeOpWithActions, stepResendChannelTimeoutPacketWithActions } from "./part-3.js";
import type { ChannelWindowState } from "./part-1.js";
/** Should the channel give up retrying this envelope? */
export function channelRetryExhausted(tries: number, maxTries: number = CHANNEL_MAX_TRIES): boolean {
  if (stryMutAct_9fa48("4886")) {
    {}
  } else {
    stryCov_9fa48("4886");
    return stryMutAct_9fa48("4890") ? tries < maxTries : stryMutAct_9fa48("4889") ? tries > maxTries : stryMutAct_9fa48("4888") ? false : stryMutAct_9fa48("4887") ? true : (stryCov_9fa48("4887", "4888", "4889", "4890"), tries >= maxTries);
  }
}
export type ChannelPacketTimeoutPlan = {
  readonly kind: "ignore";
} | {
  readonly kind: "give-up";
} | {
  readonly kind: "retry";
  readonly nextTries: number;
};

/**
 * Plan TX timeout handling for one envelope.
 * Delivered check and try counting stay pure; resend/shutdown stay at the edge.
 */
export function planChannelPacketTimeout(input: {
  readonly delivered: boolean;
  readonly tries: number;
  readonly maxTries?: number;
}): ChannelPacketTimeoutPlan {
  if (stryMutAct_9fa48("4891")) {
    {}
  } else {
    stryCov_9fa48("4891");
    if (stryMutAct_9fa48("4893") ? false : stryMutAct_9fa48("4892") ? true : (stryCov_9fa48("4892", "4893"), input.delivered)) {
      if (stryMutAct_9fa48("4894")) {
        {}
      } else {
        stryCov_9fa48("4894");
        return stryMutAct_9fa48("4895") ? {} : (stryCov_9fa48("4895"), {
          kind: stryMutAct_9fa48("4896") ? "" : (stryCov_9fa48("4896"), "ignore")
        });
      }
    }
    const maxTries = stryMutAct_9fa48("4897") ? input.maxTries && CHANNEL_MAX_TRIES : (stryCov_9fa48("4897"), input.maxTries ?? CHANNEL_MAX_TRIES);
    if (stryMutAct_9fa48("4899") ? false : stryMutAct_9fa48("4898") ? true : (stryCov_9fa48("4898", "4899"), channelRetryExhausted(input.tries, maxTries))) {
      if (stryMutAct_9fa48("4900")) {
        {}
      } else {
        stryCov_9fa48("4900");
        return stryMutAct_9fa48("4901") ? {} : (stryCov_9fa48("4901"), {
          kind: stryMutAct_9fa48("4902") ? "" : (stryCov_9fa48("4902"), "give-up")
        });
      }
    }
    return stryMutAct_9fa48("4903") ? {} : (stryCov_9fa48("4903"), {
      kind: stryMutAct_9fa48("4904") ? "" : (stryCov_9fa48("4904"), "retry"),
      nextTries: stryMutAct_9fa48("4905") ? input.tries - 1 : (stryCov_9fa48("4905"), input.tries + 1)
    });
  }
}

/**
 * Channel packet-timeout plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelPacketTimeout`
 * / `plan.kind` reads beside the step). Nested under
 * {@link stepChannelPacketTimeoutWithActions}.
 */
export type ChannelPacketTimeoutPlanState = Record<string, never>;
export type ChannelPacketTimeoutPlanEvent = Event | {
  readonly kind: "channel/packet-timeout-plan-gate";
  readonly delivered: boolean;
  readonly tries: number;
  readonly maxTries?: number;
};
export type ChannelPacketTimeoutPlanAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "give-up";
} | {
  readonly kind: "retry";
  readonly nextTries: number;
};
export interface ChannelPacketTimeoutPlanStepResult {
  readonly state: ChannelPacketTimeoutPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelPacketTimeoutPlanAction[];
}
export function initialChannelPacketTimeoutPlanState(): ChannelPacketTimeoutPlanState {
  if (stryMutAct_9fa48("4906")) {
    {}
  } else {
    stryCov_9fa48("4906");
    return {};
  }
}
export function stepChannelPacketTimeoutPlanWithActions(state: ChannelPacketTimeoutPlanState, event: ChannelPacketTimeoutPlanEvent): ChannelPacketTimeoutPlanStepResult {
  if (stryMutAct_9fa48("4907")) {
    {}
  } else {
    stryCov_9fa48("4907");
    if (stryMutAct_9fa48("4910") ? event.kind !== "channel/packet-timeout-plan-gate" : stryMutAct_9fa48("4909") ? false : stryMutAct_9fa48("4908") ? true : (stryCov_9fa48("4908", "4909", "4910"), event.kind === (stryMutAct_9fa48("4911") ? "" : (stryCov_9fa48("4911"), "channel/packet-timeout-plan-gate")))) {
      if (stryMutAct_9fa48("4912")) {
        {}
      } else {
        stryCov_9fa48("4912");
        return stryMutAct_9fa48("4913") ? {} : (stryCov_9fa48("4913"), {
          state,
          intents: stryMutAct_9fa48("4914") ? ["Stryker was here"] : (stryCov_9fa48("4914"), []),
          actions: stryMutAct_9fa48("4915") ? [] : (stryCov_9fa48("4915"), [planChannelPacketTimeout(stryMutAct_9fa48("4916") ? {} : (stryCov_9fa48("4916"), {
            delivered: event.delivered,
            tries: event.tries,
            ...((stryMutAct_9fa48("4919") ? event.maxTries === undefined : stryMutAct_9fa48("4918") ? false : stryMutAct_9fa48("4917") ? true : (stryCov_9fa48("4917", "4918", "4919"), event.maxTries !== undefined)) ? stryMutAct_9fa48("4920") ? {} : (stryCov_9fa48("4920"), {
              maxTries: event.maxTries
            }) : {})
          }))])
        });
      }
    }
    return stryMutAct_9fa48("4921") ? {} : (stryCov_9fa48("4921"), {
      state,
      intents: stryMutAct_9fa48("4922") ? ["Stryker was here"] : (stryCov_9fa48("4922"), []),
      actions: stryMutAct_9fa48("4923") ? ["Stryker was here"] : (stryCov_9fa48("4923"), [])
    });
  }
}
export function shouldIgnoreChannelPacketTimeoutPlan(actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>): boolean {
  if (stryMutAct_9fa48("4924")) {
    {}
  } else {
    stryCov_9fa48("4924");
    return stryMutAct_9fa48("4925") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("4925"), actions.some(stryMutAct_9fa48("4926") ? () => undefined : (stryCov_9fa48("4926"), action => stryMutAct_9fa48("4929") ? action.kind !== "ignore" : stryMutAct_9fa48("4928") ? false : stryMutAct_9fa48("4927") ? true : (stryCov_9fa48("4927", "4928", "4929"), action.kind === (stryMutAct_9fa48("4930") ? "" : (stryCov_9fa48("4930"), "ignore"))))));
  }
}
export function shouldGiveUpChannelPacketTimeoutPlan(actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>): boolean {
  if (stryMutAct_9fa48("4931")) {
    {}
  } else {
    stryCov_9fa48("4931");
    return stryMutAct_9fa48("4932") ? actions.every(action => action.kind === "give-up") : (stryCov_9fa48("4932"), actions.some(stryMutAct_9fa48("4933") ? () => undefined : (stryCov_9fa48("4933"), action => stryMutAct_9fa48("4936") ? action.kind !== "give-up" : stryMutAct_9fa48("4935") ? false : stryMutAct_9fa48("4934") ? true : (stryCov_9fa48("4934", "4935", "4936"), action.kind === (stryMutAct_9fa48("4937") ? "" : (stryCov_9fa48("4937"), "give-up"))))));
  }
}
export function shouldRetryChannelPacketTimeoutPlan(actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>): boolean {
  if (stryMutAct_9fa48("4938")) {
    {}
  } else {
    stryCov_9fa48("4938");
    return stryMutAct_9fa48("4939") ? actions.every(action => action.kind === "retry") : (stryCov_9fa48("4939"), actions.some(stryMutAct_9fa48("4940") ? () => undefined : (stryCov_9fa48("4940"), action => stryMutAct_9fa48("4943") ? action.kind !== "retry" : stryMutAct_9fa48("4942") ? false : stryMutAct_9fa48("4941") ? true : (stryCov_9fa48("4941", "4942", "4943"), action.kind === (stryMutAct_9fa48("4944") ? "" : (stryCov_9fa48("4944"), "retry"))))));
  }
}

/** Extract the retry plan action, if any. */
export function channelPacketTimeoutRetryFromActions(actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>): Extract<ChannelPacketTimeoutPlanAction, {
  kind: "retry";
}> | null {
  if (stryMutAct_9fa48("4945")) {
    {}
  } else {
    stryCov_9fa48("4945");
    for (const action of actions) {
      if (stryMutAct_9fa48("4946")) {
        {}
      } else {
        stryCov_9fa48("4946");
        if (stryMutAct_9fa48("4949") ? action.kind !== "retry" : stryMutAct_9fa48("4948") ? false : stryMutAct_9fa48("4947") ? true : (stryCov_9fa48("4947", "4948", "4949"), action.kind === (stryMutAct_9fa48("4950") ? "" : (stryCov_9fa48("4950"), "retry")))) {
          if (stryMutAct_9fa48("4951")) {
            {}
          } else {
            stryCov_9fa48("4951");
            return action;
          }
        }
      }
    }
    return null;
  }
}

/** Extract the full plan from actions; null when empty. */
export function channelPacketTimeoutPlanFromActions(actions: ReadonlyArray<ChannelPacketTimeoutPlanAction>): ChannelPacketTimeoutPlan | null {
  if (stryMutAct_9fa48("4952")) {
    {}
  } else {
    stryCov_9fa48("4952");
    const action = actions.find(stryMutAct_9fa48("4953") ? () => undefined : (stryCov_9fa48("4953"), entry => stryMutAct_9fa48("4956") ? (entry.kind === "ignore" || entry.kind === "give-up") && entry.kind === "retry" : stryMutAct_9fa48("4955") ? false : stryMutAct_9fa48("4954") ? true : (stryCov_9fa48("4954", "4955", "4956"), (stryMutAct_9fa48("4958") ? entry.kind === "ignore" && entry.kind === "give-up" : stryMutAct_9fa48("4957") ? false : (stryCov_9fa48("4957", "4958"), (stryMutAct_9fa48("4960") ? entry.kind !== "ignore" : stryMutAct_9fa48("4959") ? false : (stryCov_9fa48("4959", "4960"), entry.kind === (stryMutAct_9fa48("4961") ? "" : (stryCov_9fa48("4961"), "ignore")))) || (stryMutAct_9fa48("4963") ? entry.kind !== "give-up" : stryMutAct_9fa48("4962") ? false : (stryCov_9fa48("4962", "4963"), entry.kind === (stryMutAct_9fa48("4964") ? "" : (stryCov_9fa48("4964"), "give-up")))))) || (stryMutAct_9fa48("4966") ? entry.kind !== "retry" : stryMutAct_9fa48("4965") ? false : (stryCov_9fa48("4965", "4966"), entry.kind === (stryMutAct_9fa48("4967") ? "" : (stryCov_9fa48("4967"), "retry")))))));
    return stryMutAct_9fa48("4968") ? action && null : (stryCov_9fa48("4968"), action ?? null);
  }
}

/**
 * Channel packet-timeout gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelPacketTimeout`
 * / `plan.kind` reads beside the step).
 * Plan nested via {@link stepChannelPacketTimeoutPlanWithActions}
 * (`ignore`|`give-up`|`retry`).
 */
export type ChannelPacketTimeoutState = Record<string, never>;
export type ChannelPacketTimeoutEvent = Event | {
  readonly kind: "channel/packet-timeout-gate";
  readonly delivered: boolean;
  readonly tries: number;
  readonly maxTries?: number;
};
export type ChannelPacketTimeoutAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "give-up";
} | {
  readonly kind: "retry";
  readonly nextTries: number;
};
export interface ChannelPacketTimeoutStepResult {
  readonly state: ChannelPacketTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelPacketTimeoutAction[];
}
export function initialChannelPacketTimeoutState(): ChannelPacketTimeoutState {
  if (stryMutAct_9fa48("4969")) {
    {}
  } else {
    stryCov_9fa48("4969");
    return {};
  }
}
export function stepChannelPacketTimeoutWithActions(state: ChannelPacketTimeoutState, event: ChannelPacketTimeoutEvent): ChannelPacketTimeoutStepResult {
  if (stryMutAct_9fa48("4970")) {
    {}
  } else {
    stryCov_9fa48("4970");
    if (stryMutAct_9fa48("4973") ? event.kind !== "channel/packet-timeout-gate" : stryMutAct_9fa48("4972") ? false : stryMutAct_9fa48("4971") ? true : (stryCov_9fa48("4971", "4972", "4973"), event.kind === (stryMutAct_9fa48("4974") ? "" : (stryCov_9fa48("4974"), "channel/packet-timeout-gate")))) {
      if (stryMutAct_9fa48("4975")) {
        {}
      } else {
        stryCov_9fa48("4975");
        const planActions = stepChannelPacketTimeoutPlanWithActions(initialChannelPacketTimeoutPlanState(), stryMutAct_9fa48("4976") ? {} : (stryCov_9fa48("4976"), {
          kind: stryMutAct_9fa48("4977") ? "" : (stryCov_9fa48("4977"), "channel/packet-timeout-plan-gate"),
          delivered: event.delivered,
          tries: event.tries,
          ...((stryMutAct_9fa48("4980") ? event.maxTries === undefined : stryMutAct_9fa48("4979") ? false : stryMutAct_9fa48("4978") ? true : (stryCov_9fa48("4978", "4979", "4980"), event.maxTries !== undefined)) ? stryMutAct_9fa48("4981") ? {} : (stryCov_9fa48("4981"), {
            maxTries: event.maxTries
          }) : {})
        })).actions;
        const plan = channelPacketTimeoutPlanFromActions(planActions);
        if (stryMutAct_9fa48("4984") ? plan !== null : stryMutAct_9fa48("4983") ? false : stryMutAct_9fa48("4982") ? true : (stryCov_9fa48("4982", "4983", "4984"), plan === null)) {
          if (stryMutAct_9fa48("4985")) {
            {}
          } else {
            stryCov_9fa48("4985");
            return stryMutAct_9fa48("4986") ? {} : (stryCov_9fa48("4986"), {
              state,
              intents: stryMutAct_9fa48("4987") ? ["Stryker was here"] : (stryCov_9fa48("4987"), []),
              actions: stryMutAct_9fa48("4988") ? ["Stryker was here"] : (stryCov_9fa48("4988"), [])
            });
          }
        }
        return stryMutAct_9fa48("4989") ? {} : (stryCov_9fa48("4989"), {
          state,
          intents: stryMutAct_9fa48("4990") ? ["Stryker was here"] : (stryCov_9fa48("4990"), []),
          actions: stryMutAct_9fa48("4991") ? [] : (stryCov_9fa48("4991"), [plan])
        });
      }
    }
    return stryMutAct_9fa48("4992") ? {} : (stryCov_9fa48("4992"), {
      state,
      intents: stryMutAct_9fa48("4993") ? ["Stryker was here"] : (stryCov_9fa48("4993"), []),
      actions: stryMutAct_9fa48("4994") ? ["Stryker was here"] : (stryCov_9fa48("4994"), [])
    });
  }
}
export function shouldIgnoreChannelPacketTimeout(actions: ReadonlyArray<ChannelPacketTimeoutAction>): boolean {
  if (stryMutAct_9fa48("4995")) {
    {}
  } else {
    stryCov_9fa48("4995");
    return stryMutAct_9fa48("4996") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("4996"), actions.some(stryMutAct_9fa48("4997") ? () => undefined : (stryCov_9fa48("4997"), action => stryMutAct_9fa48("5000") ? action.kind !== "ignore" : stryMutAct_9fa48("4999") ? false : stryMutAct_9fa48("4998") ? true : (stryCov_9fa48("4998", "4999", "5000"), action.kind === (stryMutAct_9fa48("5001") ? "" : (stryCov_9fa48("5001"), "ignore"))))));
  }
}
export function shouldGiveUpChannelPacketTimeout(actions: ReadonlyArray<ChannelPacketTimeoutAction>): boolean {
  if (stryMutAct_9fa48("5002")) {
    {}
  } else {
    stryCov_9fa48("5002");
    return stryMutAct_9fa48("5003") ? actions.every(action => action.kind === "give-up") : (stryCov_9fa48("5003"), actions.some(stryMutAct_9fa48("5004") ? () => undefined : (stryCov_9fa48("5004"), action => stryMutAct_9fa48("5007") ? action.kind !== "give-up" : stryMutAct_9fa48("5006") ? false : stryMutAct_9fa48("5005") ? true : (stryCov_9fa48("5005", "5006", "5007"), action.kind === (stryMutAct_9fa48("5008") ? "" : (stryCov_9fa48("5008"), "give-up"))))));
  }
}
export function shouldRetryChannelPacketTimeout(actions: ReadonlyArray<ChannelPacketTimeoutAction>): boolean {
  if (stryMutAct_9fa48("5009")) {
    {}
  } else {
    stryCov_9fa48("5009");
    return stryMutAct_9fa48("5010") ? actions.every(action => action.kind === "retry") : (stryCov_9fa48("5010"), actions.some(stryMutAct_9fa48("5011") ? () => undefined : (stryCov_9fa48("5011"), action => stryMutAct_9fa48("5014") ? action.kind !== "retry" : stryMutAct_9fa48("5013") ? false : stryMutAct_9fa48("5012") ? true : (stryCov_9fa48("5012", "5013", "5014"), action.kind === (stryMutAct_9fa48("5015") ? "" : (stryCov_9fa48("5015"), "retry"))))));
  }
}
export type ChannelWindowEvent = Event | {
  readonly kind: "channel/init";
  readonly rtt: number;
} | {
  readonly kind: "channel/timeout";
} | {
  readonly kind: "channel/delivered";
  readonly rtt: number;
};
export function stepChannelWindow(state: ChannelWindowState, event: ChannelWindowEvent): {
  state: ChannelWindowState;
  intents: [];
} {
  if (stryMutAct_9fa48("5016")) {
    {}
  } else {
    stryCov_9fa48("5016");
    return stepChannelWindowInner(state, event);
  }
}
function stepChannelWindowInner(state: ChannelWindowState, event: ChannelWindowEvent): {
  state: ChannelWindowState;
  intents: [];
} {
  if (stryMutAct_9fa48("5017")) {
    {}
  } else {
    stryCov_9fa48("5017");
    if (stryMutAct_9fa48("5020") ? event.kind !== "channel/init" : stryMutAct_9fa48("5019") ? false : stryMutAct_9fa48("5018") ? true : (stryCov_9fa48("5018", "5019", "5020"), event.kind === (stryMutAct_9fa48("5021") ? "" : (stryCov_9fa48("5021"), "channel/init")))) {
      if (stryMutAct_9fa48("5022")) {
        {}
      } else {
        stryCov_9fa48("5022");
        return stryMutAct_9fa48("5023") ? {} : (stryCov_9fa48("5023"), {
          state: initialChannelWindowState(event.rtt),
          intents: stryMutAct_9fa48("5024") ? ["Stryker was here"] : (stryCov_9fa48("5024"), [])
        });
      }
    }
    if (stryMutAct_9fa48("5027") ? event.kind !== "channel/timeout" : stryMutAct_9fa48("5026") ? false : stryMutAct_9fa48("5025") ? true : (stryCov_9fa48("5025", "5026", "5027"), event.kind === (stryMutAct_9fa48("5028") ? "" : (stryCov_9fa48("5028"), "channel/timeout")))) {
      if (stryMutAct_9fa48("5029")) {
        {}
      } else {
        stryCov_9fa48("5029");
        return stryMutAct_9fa48("5030") ? {} : (stryCov_9fa48("5030"), {
          state: applyChannelTimeout(state),
          intents: stryMutAct_9fa48("5031") ? ["Stryker was here"] : (stryCov_9fa48("5031"), [])
        });
      }
    }
    if (stryMutAct_9fa48("5034") ? event.kind !== "channel/delivered" : stryMutAct_9fa48("5033") ? false : stryMutAct_9fa48("5032") ? true : (stryCov_9fa48("5032", "5033", "5034"), event.kind === (stryMutAct_9fa48("5035") ? "" : (stryCov_9fa48("5035"), "channel/delivered")))) {
      if (stryMutAct_9fa48("5036")) {
        {}
      } else {
        stryCov_9fa48("5036");
        return stryMutAct_9fa48("5037") ? {} : (stryCov_9fa48("5037"), {
          state: applyChannelDelivery(state, event.rtt),
          intents: stryMutAct_9fa48("5038") ? ["Stryker was here"] : (stryCov_9fa48("5038"), [])
        });
      }
    }
    return stryMutAct_9fa48("5039") ? {} : (stryCov_9fa48("5039"), {
      state,
      intents: stryMutAct_9fa48("5040") ? ["Stryker was here"] : (stryCov_9fa48("5040"), [])
    });
  }
}

/**
 * Channel TX-timeout step: compose envelope miss / ignore / give-up / retry
 * with window shrink. Adapters apply give-up (shutdown) and retry (resend +
 * re-arm) only from actions — not by reading `plan.kind` /
 * `planChannelTxEnvelopeOp` / `planChannelPacketTimeout` beside the step.
 * Envelope-op nested via `stepChannelTxEnvelopeOpWithActions` (`miss`|`process`;
 * plan nested via {@link stepChannelTxEnvelopeOpPlanWithActions}: miss|process).
 * Packet-timeout nested via `stepChannelPacketTimeoutWithActions`
 * (`ignore`|`give-up`|`retry`; plan nested via
 * {@link stepChannelPacketTimeoutPlanWithActions}: ignore|give-up|retry).
 * Resend itself is gated separately via
 * `stepResendChannelTimeoutPacketWithActions`.
 */
export type ChannelTxTimeoutEvent = Event | {
  readonly kind: "channel/tx-timeout";
  readonly indexOk: boolean;
  readonly envelopePresent: boolean;
  readonly delivered: boolean;
  readonly tries: number;
  readonly maxTries: number;
};
export type ChannelTxTimeoutAction = {
  readonly kind: "give-up";
} | {
  readonly kind: "retry";
  readonly nextTries: number;
};
export interface ChannelTxTimeoutStepResult {
  readonly state: ChannelWindowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelTxTimeoutAction[];
}
export const stepChannelTxTimeout: StepFn<ChannelWindowState> = (state, event) => {
  if (stryMutAct_9fa48("5041")) {
    {}
  } else {
    stryCov_9fa48("5041");
    const result = stepChannelTxTimeoutInner(state, event as ChannelTxTimeoutEvent);
    return stryMutAct_9fa48("5042") ? {} : (stryCov_9fa48("5042"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepChannelTxTimeoutWithActions(state: ChannelWindowState, event: ChannelTxTimeoutEvent): ChannelTxTimeoutStepResult {
  if (stryMutAct_9fa48("5043")) {
    {}
  } else {
    stryCov_9fa48("5043");
    return stepChannelTxTimeoutInner(state, event);
  }
}
function stepChannelTxTimeoutInner(state: ChannelWindowState, event: ChannelTxTimeoutEvent): ChannelTxTimeoutStepResult {
  if (stryMutAct_9fa48("5044")) {
    {}
  } else {
    stryCov_9fa48("5044");
    if (stryMutAct_9fa48("5047") ? event.kind === "channel/tx-timeout" : stryMutAct_9fa48("5046") ? false : stryMutAct_9fa48("5045") ? true : (stryCov_9fa48("5045", "5046", "5047"), event.kind !== (stryMutAct_9fa48("5048") ? "" : (stryCov_9fa48("5048"), "channel/tx-timeout")))) {
      if (stryMutAct_9fa48("5049")) {
        {}
      } else {
        stryCov_9fa48("5049");
        return stryMutAct_9fa48("5050") ? {} : (stryCov_9fa48("5050"), {
          state,
          intents: stryMutAct_9fa48("5051") ? ["Stryker was here"] : (stryCov_9fa48("5051"), []),
          actions: stryMutAct_9fa48("5052") ? ["Stryker was here"] : (stryCov_9fa48("5052"), [])
        });
      }
    }
    if (stryMutAct_9fa48("5054") ? false : stryMutAct_9fa48("5053") ? true : (stryCov_9fa48("5053", "5054"), shouldMissChannelTxEnvelopeOp(stepChannelTxEnvelopeOpWithActions(initialChannelTxEnvelopeOpState(), stryMutAct_9fa48("5055") ? {} : (stryCov_9fa48("5055"), {
      kind: stryMutAct_9fa48("5056") ? "" : (stryCov_9fa48("5056"), "channel/tx-envelope-op-gate"),
      indexOk: event.indexOk,
      envelopePresent: event.envelopePresent
    })).actions))) {
      if (stryMutAct_9fa48("5057")) {
        {}
      } else {
        stryCov_9fa48("5057");
        return stryMutAct_9fa48("5058") ? {} : (stryCov_9fa48("5058"), {
          state,
          intents: stryMutAct_9fa48("5059") ? ["Stryker was here"] : (stryCov_9fa48("5059"), []),
          actions: stryMutAct_9fa48("5060") ? ["Stryker was here"] : (stryCov_9fa48("5060"), [])
        });
      }
    }
    const planActions = stepChannelPacketTimeoutWithActions(initialChannelPacketTimeoutState(), stryMutAct_9fa48("5061") ? {} : (stryCov_9fa48("5061"), {
      kind: stryMutAct_9fa48("5062") ? "" : (stryCov_9fa48("5062"), "channel/packet-timeout-gate"),
      delivered: event.delivered,
      tries: event.tries,
      maxTries: event.maxTries
    })).actions;
    if (stryMutAct_9fa48("5064") ? false : stryMutAct_9fa48("5063") ? true : (stryCov_9fa48("5063", "5064"), shouldIgnoreChannelPacketTimeout(planActions))) {
      if (stryMutAct_9fa48("5065")) {
        {}
      } else {
        stryCov_9fa48("5065");
        return stryMutAct_9fa48("5066") ? {} : (stryCov_9fa48("5066"), {
          state,
          intents: stryMutAct_9fa48("5067") ? ["Stryker was here"] : (stryCov_9fa48("5067"), []),
          actions: stryMutAct_9fa48("5068") ? ["Stryker was here"] : (stryCov_9fa48("5068"), [])
        });
      }
    }
    if (stryMutAct_9fa48("5070") ? false : stryMutAct_9fa48("5069") ? true : (stryCov_9fa48("5069", "5070"), shouldGiveUpChannelPacketTimeout(planActions))) {
      if (stryMutAct_9fa48("5071")) {
        {}
      } else {
        stryCov_9fa48("5071");
        return stryMutAct_9fa48("5072") ? {} : (stryCov_9fa48("5072"), {
          state,
          intents: stryMutAct_9fa48("5073") ? ["Stryker was here"] : (stryCov_9fa48("5073"), []),
          actions: stryMutAct_9fa48("5074") ? [] : (stryCov_9fa48("5074"), [stryMutAct_9fa48("5075") ? {} : (stryCov_9fa48("5075"), {
            kind: stryMutAct_9fa48("5076") ? "" : (stryCov_9fa48("5076"), "give-up")
          })])
        });
      }
    }
    const retry = channelPacketTimeoutRetryFromActions(planActions);
    if (stryMutAct_9fa48("5079") ? retry !== null : stryMutAct_9fa48("5078") ? false : stryMutAct_9fa48("5077") ? true : (stryCov_9fa48("5077", "5078", "5079"), retry === null)) {
      if (stryMutAct_9fa48("5080")) {
        {}
      } else {
        stryCov_9fa48("5080");
        return stryMutAct_9fa48("5081") ? {} : (stryCov_9fa48("5081"), {
          state,
          intents: stryMutAct_9fa48("5082") ? ["Stryker was here"] : (stryCov_9fa48("5082"), []),
          actions: stryMutAct_9fa48("5083") ? ["Stryker was here"] : (stryCov_9fa48("5083"), [])
        });
      }
    }
    return stryMutAct_9fa48("5084") ? {} : (stryCov_9fa48("5084"), {
      state: applyChannelTimeout(state),
      intents: stryMutAct_9fa48("5085") ? ["Stryker was here"] : (stryCov_9fa48("5085"), []),
      actions: stryMutAct_9fa48("5086") ? [] : (stryCov_9fa48("5086"), [stryMutAct_9fa48("5087") ? {} : (stryCov_9fa48("5087"), {
        kind: stryMutAct_9fa48("5088") ? "" : (stryCov_9fa48("5088"), "retry"),
        nextTries: retry.nextTries
      })])
    });
  }
}

/** Whether step actions include a give-up for channel TX timeout. */
export function shouldGiveUpChannelTxTimeout(actions: ReadonlyArray<ChannelTxTimeoutAction>): boolean {
  if (stryMutAct_9fa48("5089")) {
    {}
  } else {
    stryCov_9fa48("5089");
    return stryMutAct_9fa48("5090") ? actions.every(action => action.kind === "give-up") : (stryCov_9fa48("5090"), actions.some(stryMutAct_9fa48("5091") ? () => undefined : (stryCov_9fa48("5091"), action => stryMutAct_9fa48("5094") ? action.kind !== "give-up" : stryMutAct_9fa48("5093") ? false : stryMutAct_9fa48("5092") ? true : (stryCov_9fa48("5092", "5093", "5094"), action.kind === (stryMutAct_9fa48("5095") ? "" : (stryCov_9fa48("5095"), "give-up"))))));
  }
}

/** Whether step actions include a retry for channel TX timeout. */
export function shouldRetryChannelTxTimeout(actions: ReadonlyArray<ChannelTxTimeoutAction>): boolean {
  if (stryMutAct_9fa48("5096")) {
    {}
  } else {
    stryCov_9fa48("5096");
    return stryMutAct_9fa48("5097") ? actions.every(action => action.kind === "retry") : (stryCov_9fa48("5097"), actions.some(stryMutAct_9fa48("5098") ? () => undefined : (stryCov_9fa48("5098"), action => stryMutAct_9fa48("5101") ? action.kind !== "retry" : stryMutAct_9fa48("5100") ? false : stryMutAct_9fa48("5099") ? true : (stryCov_9fa48("5099", "5100", "5101"), action.kind === (stryMutAct_9fa48("5102") ? "" : (stryCov_9fa48("5102"), "retry"))))));
  }
}

/** Extract the retry action from a TX-timeout step, if any. */
export function channelTxTimeoutRetryAction(actions: ReadonlyArray<ChannelTxTimeoutAction>): Extract<ChannelTxTimeoutAction, {
  kind: "retry";
}> | null {
  if (stryMutAct_9fa48("5103")) {
    {}
  } else {
    stryCov_9fa48("5103");
    for (const action of actions) {
      if (stryMutAct_9fa48("5104")) {
        {}
      } else {
        stryCov_9fa48("5104");
        if (stryMutAct_9fa48("5107") ? action.kind !== "retry" : stryMutAct_9fa48("5106") ? false : stryMutAct_9fa48("5105") ? true : (stryCov_9fa48("5105", "5106", "5107"), action.kind === (stryMutAct_9fa48("5108") ? "" : (stryCov_9fa48("5108"), "retry")))) {
          if (stryMutAct_9fa48("5109")) {
            {}
          } else {
            stryCov_9fa48("5109");
            return action;
          }
        }
      }
    }
    return null;
  }
}
export type ChannelTxReceiptTimeoutRefreshEntry = {
  readonly receiptPresent: boolean;
  readonly currentTimeout: number | null;
  readonly tries: number;
  readonly rtt: number;
  readonly txRingLength: number;
};
export type ChannelTxReceiptTimeoutRefreshExtension = {
  readonly index: number;
  readonly timeoutSeconds: number;
};

/**
 * Plan which TX-ring receipts need a longer timeout after a send/retry.
 * Adapter applies `setTimeout` only for returned indexes (arm gate nested via
 * `stepArmChannelPacketReceiptWithActions`; timeout formula nested via
 * `stepChannelPacketTimeoutSecondsWithActions`; extend decisions only from
 * `stepExtendPacketReceiptTimeoutWithActions` actions).
 */
export function planChannelTxReceiptTimeoutRefresh(entries: ReadonlyArray<ChannelTxReceiptTimeoutRefreshEntry>): ReadonlyArray<ChannelTxReceiptTimeoutRefreshExtension> {
  if (stryMutAct_9fa48("5110")) {
    {}
  } else {
    stryCov_9fa48("5110");
    const extensions: Array<ChannelTxReceiptTimeoutRefreshExtension> = stryMutAct_9fa48("5111") ? ["Stryker was here"] : (stryCov_9fa48("5111"), []);
    for (let index = 0; stryMutAct_9fa48("5114") ? index >= entries.length : stryMutAct_9fa48("5113") ? index <= entries.length : stryMutAct_9fa48("5112") ? false : (stryCov_9fa48("5112", "5113", "5114"), index < entries.length); stryMutAct_9fa48("5115") ? index -= 1 : (stryCov_9fa48("5115"), index += 1)) {
      if (stryMutAct_9fa48("5116")) {
        {}
      } else {
        stryCov_9fa48("5116");
        const entry = entries[index]!;
        if (stryMutAct_9fa48("5119") ? false : stryMutAct_9fa48("5118") ? true : stryMutAct_9fa48("5117") ? shouldArmChannelPacketReceiptNow(stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), {
          kind: "channel/arm-packet-receipt-gate",
          receiptPresent: entry.receiptPresent
        }).actions) : (stryCov_9fa48("5117", "5118", "5119"), !shouldArmChannelPacketReceiptNow(stepArmChannelPacketReceiptWithActions(initialArmChannelPacketReceiptState(), stryMutAct_9fa48("5120") ? {} : (stryCov_9fa48("5120"), {
          kind: stryMutAct_9fa48("5121") ? "" : (stryCov_9fa48("5121"), "channel/arm-packet-receipt-gate"),
          receiptPresent: entry.receiptPresent
        })).actions))) {
          if (stryMutAct_9fa48("5122")) {
            {}
          } else {
            stryCov_9fa48("5122");
            continue;
          }
        }
        const updatedTimeout = channelPacketTimeoutFromActions(stepChannelPacketTimeoutSecondsWithActions(initialChannelPacketTimeoutSecondsState(), stryMutAct_9fa48("5123") ? {} : (stryCov_9fa48("5123"), {
          kind: stryMutAct_9fa48("5124") ? "" : (stryCov_9fa48("5124"), "channel/packet-timeout-gate"),
          tries: entry.tries,
          rtt: entry.rtt,
          txRingLength: entry.txRingLength
        })).actions);
        if (stryMutAct_9fa48("5127") ? updatedTimeout !== null : stryMutAct_9fa48("5126") ? false : stryMutAct_9fa48("5125") ? true : (stryCov_9fa48("5125", "5126", "5127"), updatedTimeout === null)) {
          if (stryMutAct_9fa48("5128")) {
            {}
          } else {
            stryCov_9fa48("5128");
            continue;
          }
        }
        if (stryMutAct_9fa48("5130") ? false : stryMutAct_9fa48("5129") ? true : (stryCov_9fa48("5129", "5130"), shouldExtendPacketReceiptTimeoutNow(stepExtendPacketReceiptTimeoutWithActions(initialExtendPacketReceiptTimeoutState(), stryMutAct_9fa48("5131") ? {} : (stryCov_9fa48("5131"), {
          kind: stryMutAct_9fa48("5132") ? "" : (stryCov_9fa48("5132"), "channel/extend-packet-receipt-timeout-gate"),
          currentTimeout: entry.currentTimeout,
          updatedTimeout
        })).actions))) {
          if (stryMutAct_9fa48("5133")) {
            {}
          } else {
            stryCov_9fa48("5133");
            extensions.push(stryMutAct_9fa48("5134") ? {} : (stryCov_9fa48("5134"), {
              index,
              timeoutSeconds: updatedTimeout
            }));
          }
        }
      }
    }
    return extensions;
  }
}
export type ChannelTxReceiptTimeoutRefreshPlanEvent = Event | {
  readonly kind: "channel/tx-receipt-timeout-refresh-plan-gate";
  readonly entries: ReadonlyArray<ChannelTxReceiptTimeoutRefreshEntry>;
};
export type ChannelTxReceiptTimeoutRefreshPlanAction = {
  readonly kind: "extend";
  readonly index: number;
  readonly timeoutSeconds: number;
};

/** Extract extend actions for the planned receipt timeout refresh. */
export function channelTxReceiptTimeoutRefreshPlanExtensions(actions: ReadonlyArray<ChannelTxReceiptTimeoutRefreshPlanAction>): ReadonlyArray<ChannelTxReceiptTimeoutRefreshExtension> {
  if (stryMutAct_9fa48("5135")) {
    {}
  } else {
    stryCov_9fa48("5135");
    return stryMutAct_9fa48("5136") ? actions.map(action => ({
      index: action.index,
      timeoutSeconds: action.timeoutSeconds
    })) : (stryCov_9fa48("5136"), actions.filter(stryMutAct_9fa48("5137") ? () => undefined : (stryCov_9fa48("5137"), (action): action is ChannelTxReceiptTimeoutRefreshPlanAction => stryMutAct_9fa48("5140") ? action.kind !== "extend" : stryMutAct_9fa48("5139") ? false : stryMutAct_9fa48("5138") ? true : (stryCov_9fa48("5138", "5139", "5140"), action.kind === (stryMutAct_9fa48("5141") ? "" : (stryCov_9fa48("5141"), "extend"))))).map(stryMutAct_9fa48("5142") ? () => undefined : (stryCov_9fa48("5142"), action => stryMutAct_9fa48("5143") ? {} : (stryCov_9fa48("5143"), {
      index: action.index,
      timeoutSeconds: action.timeoutSeconds
    }))));
  }
}
export type ChannelTxReceiptTimeoutRefreshEvent = Event | {
  readonly kind: "channel/tx-receipt-timeout-refresh-gate";
  readonly entries: ReadonlyArray<ChannelTxReceiptTimeoutRefreshEntry>;
};
export type ChannelTxReceiptTimeoutRefreshAction = {
  readonly kind: "extend";
  readonly index: number;
  readonly timeoutSeconds: number;
};