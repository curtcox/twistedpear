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
export const ChannelWindowLimits = {
  WINDOW: 2,
  WINDOW_MIN: 2,
  WINDOW_MIN_LIMIT_MEDIUM: 5,
  WINDOW_MIN_LIMIT_FAST: 16,
  WINDOW_MAX_SLOW: 5,
  WINDOW_MAX_MEDIUM: 12,
  WINDOW_MAX_FAST: 48,
  FAST_RATE_THRESHOLD: 10,
  RTT_FAST: 0.18,
  RTT_MEDIUM: 0.75,
  RTT_SLOW: 1.45,
  WINDOW_FLEXIBILITY: 4
} as const;
export interface ChannelWindowState {
  readonly window: number;
  readonly windowMax: number;
  readonly windowMin: number;
  readonly windowFlexibility: number;
  readonly fastRateRounds: number;
  readonly mediumRateRounds: number;
}
export function initialChannelWindowState(rtt: number): ChannelWindowState {
  if (stryMutAct_9fa48("4178")) {
    {}
  } else {
    stryCov_9fa48("4178");
    if (stryMutAct_9fa48("4182") ? rtt <= ChannelWindowLimits.RTT_SLOW : stryMutAct_9fa48("4181") ? rtt >= ChannelWindowLimits.RTT_SLOW : stryMutAct_9fa48("4180") ? false : stryMutAct_9fa48("4179") ? true : (stryCov_9fa48("4179", "4180", "4181", "4182"), rtt > ChannelWindowLimits.RTT_SLOW)) {
      if (stryMutAct_9fa48("4183")) {
        {}
      } else {
        stryCov_9fa48("4183");
        return stryMutAct_9fa48("4184") ? {} : (stryCov_9fa48("4184"), {
          window: 1,
          windowMax: 1,
          windowMin: 1,
          windowFlexibility: 1,
          fastRateRounds: 0,
          mediumRateRounds: 0
        });
      }
    }
    return stryMutAct_9fa48("4185") ? {} : (stryCov_9fa48("4185"), {
      window: ChannelWindowLimits.WINDOW,
      windowMax: ChannelWindowLimits.WINDOW_MAX_SLOW,
      windowMin: ChannelWindowLimits.WINDOW_MIN,
      windowFlexibility: ChannelWindowLimits.WINDOW_FLEXIBILITY,
      fastRateRounds: 0,
      mediumRateRounds: 0
    });
  }
}
export function channelPacketTimeoutSeconds(input: {
  readonly tries: number;
  readonly rtt: number;
  readonly txRingLength: number;
}): number {
  if (stryMutAct_9fa48("4186")) {
    {}
  } else {
    stryCov_9fa48("4186");
    return stryMutAct_9fa48("4187") ? Math.pow(1.5, input.tries - 1) * Math.max(input.rtt * 2.5, 0.025) / (input.txRingLength + 1.5) : (stryCov_9fa48("4187"), (stryMutAct_9fa48("4188") ? Math.pow(1.5, input.tries - 1) / Math.max(input.rtt * 2.5, 0.025) : (stryCov_9fa48("4188"), Math.pow(1.5, stryMutAct_9fa48("4189") ? input.tries + 1 : (stryCov_9fa48("4189"), input.tries - 1)) * (stryMutAct_9fa48("4190") ? Math.min(input.rtt * 2.5, 0.025) : (stryCov_9fa48("4190"), Math.max(stryMutAct_9fa48("4191") ? input.rtt / 2.5 : (stryCov_9fa48("4191"), input.rtt * 2.5), 0.025))))) * (stryMutAct_9fa48("4192") ? input.txRingLength - 1.5 : (stryCov_9fa48("4192"), input.txRingLength + 1.5)));
  }
}

/**
 * Channel packet-timeout-seconds computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `channelPacketTimeoutSeconds` reads
 * beside the step).
 */
export type ChannelPacketTimeoutSecondsState = Record<string, never>;
export type ChannelPacketTimeoutSecondsEvent = Event | {
  readonly kind: "channel/packet-timeout-gate";
  readonly tries: number;
  readonly rtt: number;
  readonly txRingLength: number;
};
export type ChannelPacketTimeoutSecondsAction = {
  readonly kind: "use-timeout";
  readonly timeout: number;
};
export interface ChannelPacketTimeoutSecondsStepResult {
  readonly state: ChannelPacketTimeoutSecondsState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelPacketTimeoutSecondsAction[];
}
export function initialChannelPacketTimeoutSecondsState(): ChannelPacketTimeoutSecondsState {
  if (stryMutAct_9fa48("4193")) {
    {}
  } else {
    stryCov_9fa48("4193");
    return {};
  }
}
export function stepChannelPacketTimeoutSecondsWithActions(state: ChannelPacketTimeoutSecondsState, event: ChannelPacketTimeoutSecondsEvent): ChannelPacketTimeoutSecondsStepResult {
  if (stryMutAct_9fa48("4194")) {
    {}
  } else {
    stryCov_9fa48("4194");
    if (stryMutAct_9fa48("4197") ? event.kind !== "channel/packet-timeout-gate" : stryMutAct_9fa48("4196") ? false : stryMutAct_9fa48("4195") ? true : (stryCov_9fa48("4195", "4196", "4197"), event.kind === (stryMutAct_9fa48("4198") ? "" : (stryCov_9fa48("4198"), "channel/packet-timeout-gate")))) {
      if (stryMutAct_9fa48("4199")) {
        {}
      } else {
        stryCov_9fa48("4199");
        return stryMutAct_9fa48("4200") ? {} : (stryCov_9fa48("4200"), {
          state,
          intents: stryMutAct_9fa48("4201") ? ["Stryker was here"] : (stryCov_9fa48("4201"), []),
          actions: stryMutAct_9fa48("4202") ? [] : (stryCov_9fa48("4202"), [stryMutAct_9fa48("4203") ? {} : (stryCov_9fa48("4203"), {
            kind: stryMutAct_9fa48("4204") ? "" : (stryCov_9fa48("4204"), "use-timeout"),
            timeout: channelPacketTimeoutSeconds(stryMutAct_9fa48("4205") ? {} : (stryCov_9fa48("4205"), {
              tries: event.tries,
              rtt: event.rtt,
              txRingLength: event.txRingLength
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("4206") ? {} : (stryCov_9fa48("4206"), {
      state,
      intents: stryMutAct_9fa48("4207") ? ["Stryker was here"] : (stryCov_9fa48("4207"), []),
      actions: stryMutAct_9fa48("4208") ? ["Stryker was here"] : (stryCov_9fa48("4208"), [])
    });
  }
}
export function shouldUseChannelPacketTimeout(actions: ReadonlyArray<ChannelPacketTimeoutSecondsAction>): boolean {
  if (stryMutAct_9fa48("4209")) {
    {}
  } else {
    stryCov_9fa48("4209");
    return stryMutAct_9fa48("4210") ? actions.every(action => action.kind === "use-timeout") : (stryCov_9fa48("4210"), actions.some(stryMutAct_9fa48("4211") ? () => undefined : (stryCov_9fa48("4211"), action => stryMutAct_9fa48("4214") ? action.kind !== "use-timeout" : stryMutAct_9fa48("4213") ? false : stryMutAct_9fa48("4212") ? true : (stryCov_9fa48("4212", "4213", "4214"), action.kind === (stryMutAct_9fa48("4215") ? "" : (stryCov_9fa48("4215"), "use-timeout"))))));
  }
}

/** Extract packet timeout from step actions; null when no `use-timeout`. */
export function channelPacketTimeoutFromActions(actions: ReadonlyArray<ChannelPacketTimeoutSecondsAction>): number | null {
  if (stryMutAct_9fa48("4216")) {
    {}
  } else {
    stryCov_9fa48("4216");
    const action = actions.find(stryMutAct_9fa48("4217") ? () => undefined : (stryCov_9fa48("4217"), entry => stryMutAct_9fa48("4220") ? entry.kind !== "use-timeout" : stryMutAct_9fa48("4219") ? false : stryMutAct_9fa48("4218") ? true : (stryCov_9fa48("4218", "4219", "4220"), entry.kind === (stryMutAct_9fa48("4221") ? "" : (stryCov_9fa48("4221"), "use-timeout")))));
    return (stryMutAct_9fa48("4224") ? action?.kind !== "use-timeout" : stryMutAct_9fa48("4223") ? false : stryMutAct_9fa48("4222") ? true : (stryCov_9fa48("4222", "4223", "4224"), (stryMutAct_9fa48("4225") ? action.kind : (stryCov_9fa48("4225"), action?.kind)) === (stryMutAct_9fa48("4226") ? "" : (stryCov_9fa48("4226"), "use-timeout")))) ? action.timeout : null;
  }
}
export function channelAllowsSend(input: {
  readonly isUsable: boolean;
  readonly outstanding: number;
  readonly window: number;
}): boolean {
  if (stryMutAct_9fa48("4227")) {
    {}
  } else {
    stryCov_9fa48("4227");
    return stryMutAct_9fa48("4230") ? input.isUsable || input.outstanding < input.window : stryMutAct_9fa48("4229") ? false : stryMutAct_9fa48("4228") ? true : (stryCov_9fa48("4228", "4229", "4230"), input.isUsable && (stryMutAct_9fa48("4233") ? input.outstanding >= input.window : stryMutAct_9fa48("4232") ? input.outstanding <= input.window : stryMutAct_9fa48("4231") ? true : (stryCov_9fa48("4231", "4232", "4233"), input.outstanding < input.window)));
  }
}

/**
 * Channel send-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `channelAllowsSend` reads
 * beside the step).
 */
export type ChannelAllowsSendState = Record<string, never>;
export type ChannelAllowsSendEvent = Event | {
  readonly kind: "channel/allows-send-gate";
  readonly isUsable: boolean;
  readonly outstanding: number;
  readonly window: number;
};
export type ChannelAllowsSendAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ChannelAllowsSendStepResult {
  readonly state: ChannelAllowsSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelAllowsSendAction[];
}
export function initialChannelAllowsSendState(): ChannelAllowsSendState {
  if (stryMutAct_9fa48("4234")) {
    {}
  } else {
    stryCov_9fa48("4234");
    return {};
  }
}
export function stepChannelAllowsSendWithActions(state: ChannelAllowsSendState, event: ChannelAllowsSendEvent): ChannelAllowsSendStepResult {
  if (stryMutAct_9fa48("4235")) {
    {}
  } else {
    stryCov_9fa48("4235");
    if (stryMutAct_9fa48("4238") ? event.kind !== "channel/allows-send-gate" : stryMutAct_9fa48("4237") ? false : stryMutAct_9fa48("4236") ? true : (stryCov_9fa48("4236", "4237", "4238"), event.kind === (stryMutAct_9fa48("4239") ? "" : (stryCov_9fa48("4239"), "channel/allows-send-gate")))) {
      if (stryMutAct_9fa48("4240")) {
        {}
      } else {
        stryCov_9fa48("4240");
        return stryMutAct_9fa48("4241") ? {} : (stryCov_9fa48("4241"), {
          state,
          intents: stryMutAct_9fa48("4242") ? ["Stryker was here"] : (stryCov_9fa48("4242"), []),
          actions: stryMutAct_9fa48("4243") ? [] : (stryCov_9fa48("4243"), [stryMutAct_9fa48("4244") ? {} : (stryCov_9fa48("4244"), {
            kind: channelAllowsSend(stryMutAct_9fa48("4245") ? {} : (stryCov_9fa48("4245"), {
              isUsable: event.isUsable,
              outstanding: event.outstanding,
              window: event.window
            })) ? stryMutAct_9fa48("4246") ? "" : (stryCov_9fa48("4246"), "allow") : stryMutAct_9fa48("4247") ? "" : (stryCov_9fa48("4247"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4248") ? {} : (stryCov_9fa48("4248"), {
      state,
      intents: stryMutAct_9fa48("4249") ? ["Stryker was here"] : (stryCov_9fa48("4249"), []),
      actions: stryMutAct_9fa48("4250") ? ["Stryker was here"] : (stryCov_9fa48("4250"), [])
    });
  }
}
export function shouldAllowChannelSend(actions: ReadonlyArray<ChannelAllowsSendAction>): boolean {
  if (stryMutAct_9fa48("4251")) {
    {}
  } else {
    stryCov_9fa48("4251");
    return stryMutAct_9fa48("4252") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("4252"), actions.some(stryMutAct_9fa48("4253") ? () => undefined : (stryCov_9fa48("4253"), action => stryMutAct_9fa48("4256") ? action.kind !== "allow" : stryMutAct_9fa48("4255") ? false : stryMutAct_9fa48("4254") ? true : (stryCov_9fa48("4254", "4255", "4256"), action.kind === (stryMutAct_9fa48("4257") ? "" : (stryCov_9fa48("4257"), "allow"))))));
  }
}
export function shouldDenyChannelSend(actions: ReadonlyArray<ChannelAllowsSendAction>): boolean {
  if (stryMutAct_9fa48("4258")) {
    {}
  } else {
    stryCov_9fa48("4258");
    return stryMutAct_9fa48("4259") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("4259"), actions.some(stryMutAct_9fa48("4260") ? () => undefined : (stryCov_9fa48("4260"), action => stryMutAct_9fa48("4263") ? action.kind !== "deny" : stryMutAct_9fa48("4262") ? false : stryMutAct_9fa48("4261") ? true : (stryCov_9fa48("4261", "4262", "4263"), action.kind === (stryMutAct_9fa48("4264") ? "" : (stryCov_9fa48("4264"), "deny"))))));
  }
}

/**
 * Channel send gate: ready-to-send and packed-payload MDU fitness.
 * Pass `packedLength: null` to check readiness only (before pack).
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ChannelSendPlan = "proceed" | "link-not-ready" | "too-big";
export function planChannelSend(input: {
  readonly ready: boolean;
  readonly packedLength: number | null;
  readonly mdu: number;
}): ChannelSendPlan {
  if (stryMutAct_9fa48("4265")) {
    {}
  } else {
    stryCov_9fa48("4265");
    if (stryMutAct_9fa48("4268") ? false : stryMutAct_9fa48("4267") ? true : stryMutAct_9fa48("4266") ? input.ready : (stryCov_9fa48("4266", "4267", "4268"), !input.ready)) {
      if (stryMutAct_9fa48("4269")) {
        {}
      } else {
        stryCov_9fa48("4269");
        return stryMutAct_9fa48("4270") ? "" : (stryCov_9fa48("4270"), "link-not-ready");
      }
    }
    if (stryMutAct_9fa48("4273") ? input.packedLength !== null || !linkPayloadFitsMdu(input.packedLength, input.mdu) : stryMutAct_9fa48("4272") ? false : stryMutAct_9fa48("4271") ? true : (stryCov_9fa48("4271", "4272", "4273"), (stryMutAct_9fa48("4275") ? input.packedLength === null : stryMutAct_9fa48("4274") ? true : (stryCov_9fa48("4274", "4275"), input.packedLength !== null)) && (stryMutAct_9fa48("4276") ? linkPayloadFitsMdu(input.packedLength, input.mdu) : (stryCov_9fa48("4276"), !linkPayloadFitsMdu(input.packedLength, input.mdu))))) {
      if (stryMutAct_9fa48("4277")) {
        {}
      } else {
        stryCov_9fa48("4277");
        return stryMutAct_9fa48("4278") ? "" : (stryCov_9fa48("4278"), "too-big");
      }
    }
    return stryMutAct_9fa48("4279") ? "" : (stryCov_9fa48("4279"), "proceed");
  }
}

/**
 * Channel-send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planChannelSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepChannelSendWithActions}.
 */
export type ChannelSendPlanState = Record<string, never>;
export type ChannelSendPlanEvent = Event | {
  readonly kind: "channel/send-plan-gate";
  readonly ready: boolean;
  readonly packedLength: number | null;
  readonly mdu: number;
};
export type ChannelSendPlanAction = {
  readonly kind: ChannelSendPlan;
};
export interface ChannelSendPlanStepResult {
  readonly state: ChannelSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelSendPlanAction[];
}
export function initialChannelSendPlanState(): ChannelSendPlanState {
  if (stryMutAct_9fa48("4280")) {
    {}
  } else {
    stryCov_9fa48("4280");
    return {};
  }
}
export function stepChannelSendPlanWithActions(state: ChannelSendPlanState, event: ChannelSendPlanEvent): ChannelSendPlanStepResult {
  if (stryMutAct_9fa48("4281")) {
    {}
  } else {
    stryCov_9fa48("4281");
    if (stryMutAct_9fa48("4284") ? event.kind !== "channel/send-plan-gate" : stryMutAct_9fa48("4283") ? false : stryMutAct_9fa48("4282") ? true : (stryCov_9fa48("4282", "4283", "4284"), event.kind === (stryMutAct_9fa48("4285") ? "" : (stryCov_9fa48("4285"), "channel/send-plan-gate")))) {
      if (stryMutAct_9fa48("4286")) {
        {}
      } else {
        stryCov_9fa48("4286");
        return stryMutAct_9fa48("4287") ? {} : (stryCov_9fa48("4287"), {
          state,
          intents: stryMutAct_9fa48("4288") ? ["Stryker was here"] : (stryCov_9fa48("4288"), []),
          actions: stryMutAct_9fa48("4289") ? [] : (stryCov_9fa48("4289"), [stryMutAct_9fa48("4290") ? {} : (stryCov_9fa48("4290"), {
            kind: planChannelSend(stryMutAct_9fa48("4291") ? {} : (stryCov_9fa48("4291"), {
              ready: event.ready,
              packedLength: event.packedLength,
              mdu: event.mdu
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("4292") ? {} : (stryCov_9fa48("4292"), {
      state,
      intents: stryMutAct_9fa48("4293") ? ["Stryker was here"] : (stryCov_9fa48("4293"), []),
      actions: stryMutAct_9fa48("4294") ? ["Stryker was here"] : (stryCov_9fa48("4294"), [])
    });
  }
}

/** Extract the send plan from actions; null when empty. */
export function channelSendPlanFromActions(actions: ReadonlyArray<ChannelSendPlanAction>): ChannelSendPlan | null {
  if (stryMutAct_9fa48("4295")) {
    {}
  } else {
    stryCov_9fa48("4295");
    const action = actions.find(stryMutAct_9fa48("4296") ? () => undefined : (stryCov_9fa48("4296"), entry => stryMutAct_9fa48("4299") ? (entry.kind === "proceed" || entry.kind === "link-not-ready") && entry.kind === "too-big" : stryMutAct_9fa48("4298") ? false : stryMutAct_9fa48("4297") ? true : (stryCov_9fa48("4297", "4298", "4299"), (stryMutAct_9fa48("4301") ? entry.kind === "proceed" && entry.kind === "link-not-ready" : stryMutAct_9fa48("4300") ? false : (stryCov_9fa48("4300", "4301"), (stryMutAct_9fa48("4303") ? entry.kind !== "proceed" : stryMutAct_9fa48("4302") ? false : (stryCov_9fa48("4302", "4303"), entry.kind === (stryMutAct_9fa48("4304") ? "" : (stryCov_9fa48("4304"), "proceed")))) || (stryMutAct_9fa48("4306") ? entry.kind !== "link-not-ready" : stryMutAct_9fa48("4305") ? false : (stryCov_9fa48("4305", "4306"), entry.kind === (stryMutAct_9fa48("4307") ? "" : (stryCov_9fa48("4307"), "link-not-ready")))))) || (stryMutAct_9fa48("4309") ? entry.kind !== "too-big" : stryMutAct_9fa48("4308") ? false : (stryCov_9fa48("4308", "4309"), entry.kind === (stryMutAct_9fa48("4310") ? "" : (stryCov_9fa48("4310"), "too-big")))))));
    return stryMutAct_9fa48("4311") ? action?.kind && null : (stryCov_9fa48("4311"), (stryMutAct_9fa48("4312") ? action.kind : (stryCov_9fa48("4312"), action?.kind)) ?? null);
  }
}
export function shouldProceedChannelSendPlan(actions: ReadonlyArray<ChannelSendPlanAction>): boolean {
  if (stryMutAct_9fa48("4313")) {
    {}
  } else {
    stryCov_9fa48("4313");
    return stryMutAct_9fa48("4314") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("4314"), actions.some(stryMutAct_9fa48("4315") ? () => undefined : (stryCov_9fa48("4315"), action => stryMutAct_9fa48("4318") ? action.kind !== "proceed" : stryMutAct_9fa48("4317") ? false : stryMutAct_9fa48("4316") ? true : (stryCov_9fa48("4316", "4317", "4318"), action.kind === (stryMutAct_9fa48("4319") ? "" : (stryCov_9fa48("4319"), "proceed"))))));
  }
}
export function shouldRejectChannelSendPlanLinkNotReady(actions: ReadonlyArray<ChannelSendPlanAction>): boolean {
  if (stryMutAct_9fa48("4320")) {
    {}
  } else {
    stryCov_9fa48("4320");
    return stryMutAct_9fa48("4321") ? actions.every(action => action.kind === "link-not-ready") : (stryCov_9fa48("4321"), actions.some(stryMutAct_9fa48("4322") ? () => undefined : (stryCov_9fa48("4322"), action => stryMutAct_9fa48("4325") ? action.kind !== "link-not-ready" : stryMutAct_9fa48("4324") ? false : stryMutAct_9fa48("4323") ? true : (stryCov_9fa48("4323", "4324", "4325"), action.kind === (stryMutAct_9fa48("4326") ? "" : (stryCov_9fa48("4326"), "link-not-ready"))))));
  }
}
export function shouldRejectChannelSendPlanTooBig(actions: ReadonlyArray<ChannelSendPlanAction>): boolean {
  if (stryMutAct_9fa48("4327")) {
    {}
  } else {
    stryCov_9fa48("4327");
    return stryMutAct_9fa48("4328") ? actions.every(action => action.kind === "too-big") : (stryCov_9fa48("4328"), actions.some(stryMutAct_9fa48("4329") ? () => undefined : (stryCov_9fa48("4329"), action => stryMutAct_9fa48("4332") ? action.kind !== "too-big" : stryMutAct_9fa48("4331") ? false : stryMutAct_9fa48("4330") ? true : (stryCov_9fa48("4330", "4331", "4332"), action.kind === (stryMutAct_9fa48("4333") ? "" : (stryCov_9fa48("4333"), "too-big"))))));
  }
}

/**
 * Channel send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepChannelSendPlanWithActions}
 * (`proceed`|`link-not-ready`|`too-big`).
 */
export type ChannelSendState = Record<string, never>;
export type ChannelSendEvent = Event | {
  readonly kind: "channel/send-gate";
  readonly ready: boolean;
  readonly packedLength: number | null;
  readonly mdu: number;
};

/**
 * Adapter throws or continues only from these actions.
 * Plan nested via {@link stepChannelSendPlanWithActions}
 * (`proceed`|`link-not-ready`|`too-big`).
 */
export type ChannelSendAction = {
  readonly kind: ChannelSendPlan;
};
export interface ChannelSendStepResult {
  readonly state: ChannelSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelSendAction[];
}
export function initialChannelSendState(): ChannelSendState {
  if (stryMutAct_9fa48("4334")) {
    {}
  } else {
    stryCov_9fa48("4334");
    return {};
  }
}
export const stepChannelSend: StepFn<ChannelSendState> = (state, event) => {
  if (stryMutAct_9fa48("4335")) {
    {}
  } else {
    stryCov_9fa48("4335");
    const result = stepChannelSendInner(state, event as ChannelSendEvent);
    return stryMutAct_9fa48("4336") ? {} : (stryCov_9fa48("4336"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepChannelSendWithActions(state: ChannelSendState, event: ChannelSendEvent): ChannelSendStepResult {
  if (stryMutAct_9fa48("4337")) {
    {}
  } else {
    stryCov_9fa48("4337");
    return stepChannelSendInner(state, event);
  }
}
export function shouldProceedChannelSend(actions: ReadonlyArray<ChannelSendAction>): boolean {
  if (stryMutAct_9fa48("4338")) {
    {}
  } else {
    stryCov_9fa48("4338");
    return stryMutAct_9fa48("4339") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("4339"), actions.some(stryMutAct_9fa48("4340") ? () => undefined : (stryCov_9fa48("4340"), action => stryMutAct_9fa48("4343") ? action.kind !== "proceed" : stryMutAct_9fa48("4342") ? false : stryMutAct_9fa48("4341") ? true : (stryCov_9fa48("4341", "4342", "4343"), action.kind === (stryMutAct_9fa48("4344") ? "" : (stryCov_9fa48("4344"), "proceed"))))));
  }
}
export function shouldRejectChannelSendLinkNotReady(actions: ReadonlyArray<ChannelSendAction>): boolean {
  if (stryMutAct_9fa48("4345")) {
    {}
  } else {
    stryCov_9fa48("4345");
    return stryMutAct_9fa48("4346") ? actions.every(action => action.kind === "link-not-ready") : (stryCov_9fa48("4346"), actions.some(stryMutAct_9fa48("4347") ? () => undefined : (stryCov_9fa48("4347"), action => stryMutAct_9fa48("4350") ? action.kind !== "link-not-ready" : stryMutAct_9fa48("4349") ? false : stryMutAct_9fa48("4348") ? true : (stryCov_9fa48("4348", "4349", "4350"), action.kind === (stryMutAct_9fa48("4351") ? "" : (stryCov_9fa48("4351"), "link-not-ready"))))));
  }
}
export function shouldRejectChannelSendTooBig(actions: ReadonlyArray<ChannelSendAction>): boolean {
  if (stryMutAct_9fa48("4352")) {
    {}
  } else {
    stryCov_9fa48("4352");
    return stryMutAct_9fa48("4353") ? actions.every(action => action.kind === "too-big") : (stryCov_9fa48("4353"), actions.some(stryMutAct_9fa48("4354") ? () => undefined : (stryCov_9fa48("4354"), action => stryMutAct_9fa48("4357") ? action.kind !== "too-big" : stryMutAct_9fa48("4356") ? false : stryMutAct_9fa48("4355") ? true : (stryCov_9fa48("4355", "4356", "4357"), action.kind === (stryMutAct_9fa48("4358") ? "" : (stryCov_9fa48("4358"), "too-big"))))));
  }
}
function stepChannelSendInner(state: ChannelSendState, event: ChannelSendEvent): ChannelSendStepResult {
  if (stryMutAct_9fa48("4359")) {
    {}
  } else {
    stryCov_9fa48("4359");
    if (stryMutAct_9fa48("4362") ? event.kind !== "channel/send-gate" : stryMutAct_9fa48("4361") ? false : stryMutAct_9fa48("4360") ? true : (stryCov_9fa48("4360", "4361", "4362"), event.kind === (stryMutAct_9fa48("4363") ? "" : (stryCov_9fa48("4363"), "channel/send-gate")))) {
      if (stryMutAct_9fa48("4364")) {
        {}
      } else {
        stryCov_9fa48("4364");
        const planActions = stepChannelSendPlanWithActions(initialChannelSendPlanState(), stryMutAct_9fa48("4365") ? {} : (stryCov_9fa48("4365"), {
          kind: stryMutAct_9fa48("4366") ? "" : (stryCov_9fa48("4366"), "channel/send-plan-gate"),
          ready: event.ready,
          packedLength: event.packedLength,
          mdu: event.mdu
        })).actions;
        const plan = channelSendPlanFromActions(planActions);
        if (stryMutAct_9fa48("4369") ? plan !== null : stryMutAct_9fa48("4368") ? false : stryMutAct_9fa48("4367") ? true : (stryCov_9fa48("4367", "4368", "4369"), plan === null)) {
          if (stryMutAct_9fa48("4370")) {
            {}
          } else {
            stryCov_9fa48("4370");
            return stryMutAct_9fa48("4371") ? {} : (stryCov_9fa48("4371"), {
              state,
              intents: stryMutAct_9fa48("4372") ? ["Stryker was here"] : (stryCov_9fa48("4372"), []),
              actions: stryMutAct_9fa48("4373") ? ["Stryker was here"] : (stryCov_9fa48("4373"), [])
            });
          }
        }
        return stryMutAct_9fa48("4374") ? {} : (stryCov_9fa48("4374"), {
          state,
          intents: stryMutAct_9fa48("4375") ? ["Stryker was here"] : (stryCov_9fa48("4375"), []),
          actions: stryMutAct_9fa48("4376") ? [] : (stryCov_9fa48("4376"), [stryMutAct_9fa48("4377") ? {} : (stryCov_9fa48("4377"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("4378") ? {} : (stryCov_9fa48("4378"), {
      state,
      intents: stryMutAct_9fa48("4379") ? ["Stryker was here"] : (stryCov_9fa48("4379"), []),
      actions: stryMutAct_9fa48("4380") ? ["Stryker was here"] : (stryCov_9fa48("4380"), [])
    });
  }
}

/**
 * Whether an outlet send result is usable for TX tracking (non-empty packet with a receipt).
 */
export function isChannelOutletTransmitOk(input: {
  readonly packetPresent: boolean;
  readonly rawLength: number;
  readonly receiptPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("4381")) {
    {}
  } else {
    stryCov_9fa48("4381");
    return stryMutAct_9fa48("4384") ? input.packetPresent && input.rawLength > 0 || input.receiptPresent : stryMutAct_9fa48("4383") ? false : stryMutAct_9fa48("4382") ? true : (stryCov_9fa48("4382", "4383", "4384"), (stryMutAct_9fa48("4386") ? input.packetPresent || input.rawLength > 0 : stryMutAct_9fa48("4385") ? true : (stryCov_9fa48("4385", "4386"), input.packetPresent && (stryMutAct_9fa48("4389") ? input.rawLength <= 0 : stryMutAct_9fa48("4388") ? input.rawLength >= 0 : stryMutAct_9fa48("4387") ? true : (stryCov_9fa48("4387", "4388", "4389"), input.rawLength > 0)))) && input.receiptPresent);
  }
}

/**
 * Channel outlet-transmit gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isChannelOutletTransmitOk`
 * reads beside the step).
 */
export type ChannelOutletTransmitState = Record<string, never>;
export type ChannelOutletTransmitEvent = Event | {
  readonly kind: "channel/outlet-transmit-gate";
  readonly packetPresent: boolean;
  readonly rawLength: number;
  readonly receiptPresent: boolean;
};
export type ChannelOutletTransmitAction = {
  readonly kind: "ok";
} | {
  readonly kind: "reject";
};
export interface ChannelOutletTransmitStepResult {
  readonly state: ChannelOutletTransmitState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ChannelOutletTransmitAction[];
}
export function initialChannelOutletTransmitState(): ChannelOutletTransmitState {
  if (stryMutAct_9fa48("4390")) {
    {}
  } else {
    stryCov_9fa48("4390");
    return {};
  }
}