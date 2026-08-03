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
import { isChannelOutletTransmitOk } from "./part-1.js";
import type { ChannelOutletTransmitAction, ChannelOutletTransmitEvent, ChannelOutletTransmitState, ChannelOutletTransmitStepResult } from "./part-1.js";
export function stepChannelOutletTransmitWithActions(state: ChannelOutletTransmitState, event: ChannelOutletTransmitEvent): ChannelOutletTransmitStepResult {
  if (stryMutAct_9fa48("4391")) {
    {}
  } else {
    stryCov_9fa48("4391");
    if (stryMutAct_9fa48("4394") ? event.kind !== "channel/outlet-transmit-gate" : stryMutAct_9fa48("4393") ? false : stryMutAct_9fa48("4392") ? true : (stryCov_9fa48("4392", "4393", "4394"), event.kind === (stryMutAct_9fa48("4395") ? "" : (stryCov_9fa48("4395"), "channel/outlet-transmit-gate")))) {
      if (stryMutAct_9fa48("4396")) {
        {}
      } else {
        stryCov_9fa48("4396");
        return stryMutAct_9fa48("4397") ? {} : (stryCov_9fa48("4397"), {
          state,
          intents: stryMutAct_9fa48("4398") ? ["Stryker was here"] : (stryCov_9fa48("4398"), []),
          actions: stryMutAct_9fa48("4399") ? [] : (stryCov_9fa48("4399"), [stryMutAct_9fa48("4400") ? {} : (stryCov_9fa48("4400"), {
            kind: isChannelOutletTransmitOk(stryMutAct_9fa48("4401") ? {} : (stryCov_9fa48("4401"), {
              packetPresent: event.packetPresent,
              rawLength: event.rawLength,
              receiptPresent: event.receiptPresent
            })) ? stryMutAct_9fa48("4402") ? "" : (stryCov_9fa48("4402"), "ok") : stryMutAct_9fa48("4403") ? "" : (stryCov_9fa48("4403"), "reject")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4404") ? {} : (stryCov_9fa48("4404"), {
      state,
      intents: stryMutAct_9fa48("4405") ? ["Stryker was here"] : (stryCov_9fa48("4405"), []),
      actions: stryMutAct_9fa48("4406") ? ["Stryker was here"] : (stryCov_9fa48("4406"), [])
    });
  }
}
export function shouldAcceptChannelOutletTransmit(actions: ReadonlyArray<ChannelOutletTransmitAction>): boolean {
  if (stryMutAct_9fa48("4407")) {
    {}
  } else {
    stryCov_9fa48("4407");
    return stryMutAct_9fa48("4408") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("4408"), actions.some(stryMutAct_9fa48("4409") ? () => undefined : (stryCov_9fa48("4409"), action => stryMutAct_9fa48("4412") ? action.kind !== "ok" : stryMutAct_9fa48("4411") ? false : stryMutAct_9fa48("4410") ? true : (stryCov_9fa48("4410", "4411", "4412"), action.kind === (stryMutAct_9fa48("4413") ? "" : (stryCov_9fa48("4413"), "ok"))))));
  }
}
export function shouldRejectChannelOutletTransmit(actions: ReadonlyArray<ChannelOutletTransmitAction>): boolean {
  if (stryMutAct_9fa48("4414")) {
    {}
  } else {
    stryCov_9fa48("4414");
    return stryMutAct_9fa48("4415") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("4415"), actions.some(stryMutAct_9fa48("4416") ? () => undefined : (stryCov_9fa48("4416"), action => stryMutAct_9fa48("4419") ? action.kind !== "reject" : stryMutAct_9fa48("4418") ? false : stryMutAct_9fa48("4417") ? true : (stryCov_9fa48("4417", "4418", "4419"), action.kind === (stryMutAct_9fa48("4420") ? "" : (stryCov_9fa48("4420"), "reject"))))));
  }
}

/**
 * Count TX-ring entries that still occupy window (unsent or not yet delivered).
 * Packet presence / delivery status are supplied by the adapter.
 */
export function countChannelTxOutstanding(entries: ReadonlyArray<{
  readonly packetPresent: boolean;
  readonly delivered: boolean;
}>): number {
  if (stryMutAct_9fa48("4421")) {
    {}
  } else {
    stryCov_9fa48("4421");
    let outstanding = 0;
    for (const entry of entries) {
      if (stryMutAct_9fa48("4422")) {
        {}
      } else {
        stryCov_9fa48("4422");
        if (stryMutAct_9fa48("4425") ? !entry.packetPresent && !entry.delivered : stryMutAct_9fa48("4424") ? false : stryMutAct_9fa48("4423") ? true : (stryCov_9fa48("4423", "4424", "4425"), (stryMutAct_9fa48("4426") ? entry.packetPresent : (stryCov_9fa48("4426"), !entry.packetPresent)) || (stryMutAct_9fa48("4427") ? entry.delivered : (stryCov_9fa48("4427"), !entry.delivered)))) {
          if (stryMutAct_9fa48("4428")) {
            {}
          } else {
            stryCov_9fa48("4428");
            stryMutAct_9fa48("4429") ? outstanding -= 1 : (stryCov_9fa48("4429"), outstanding += 1);
          }
        }
      }
    }
    return outstanding;
  }
}

/**
 * Channel TX-outstanding count is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `countChannelTxOutstanding`
 * reads beside the step).
 */
export type CountChannelTxOutstandingState = Record<string, never>;
export type CountChannelTxOutstandingEvent = Event | {
  readonly kind: "channel/tx-outstanding-gate";
  readonly entries: ReadonlyArray<{
    readonly packetPresent: boolean;
    readonly delivered: boolean;
  }>;
};
export type CountChannelTxOutstandingAction = {
  readonly kind: "use-count";
  readonly count: number;
};
export interface CountChannelTxOutstandingStepResult {
  readonly state: CountChannelTxOutstandingState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CountChannelTxOutstandingAction[];
}
export function initialCountChannelTxOutstandingState(): CountChannelTxOutstandingState {
  if (stryMutAct_9fa48("4430")) {
    {}
  } else {
    stryCov_9fa48("4430");
    return {};
  }
}
export function stepCountChannelTxOutstandingWithActions(state: CountChannelTxOutstandingState, event: CountChannelTxOutstandingEvent): CountChannelTxOutstandingStepResult {
  if (stryMutAct_9fa48("4431")) {
    {}
  } else {
    stryCov_9fa48("4431");
    if (stryMutAct_9fa48("4434") ? event.kind !== "channel/tx-outstanding-gate" : stryMutAct_9fa48("4433") ? false : stryMutAct_9fa48("4432") ? true : (stryCov_9fa48("4432", "4433", "4434"), event.kind === (stryMutAct_9fa48("4435") ? "" : (stryCov_9fa48("4435"), "channel/tx-outstanding-gate")))) {
      if (stryMutAct_9fa48("4436")) {
        {}
      } else {
        stryCov_9fa48("4436");
        return stryMutAct_9fa48("4437") ? {} : (stryCov_9fa48("4437"), {
          state,
          intents: stryMutAct_9fa48("4438") ? ["Stryker was here"] : (stryCov_9fa48("4438"), []),
          actions: stryMutAct_9fa48("4439") ? [] : (stryCov_9fa48("4439"), [stryMutAct_9fa48("4440") ? {} : (stryCov_9fa48("4440"), {
            kind: stryMutAct_9fa48("4441") ? "" : (stryCov_9fa48("4441"), "use-count"),
            count: countChannelTxOutstanding(event.entries)
          })])
        });
      }
    }
    return stryMutAct_9fa48("4442") ? {} : (stryCov_9fa48("4442"), {
      state,
      intents: stryMutAct_9fa48("4443") ? ["Stryker was here"] : (stryCov_9fa48("4443"), []),
      actions: stryMutAct_9fa48("4444") ? ["Stryker was here"] : (stryCov_9fa48("4444"), [])
    });
  }
}
export function shouldUseChannelTxOutstandingCount(actions: ReadonlyArray<CountChannelTxOutstandingAction>): boolean {
  if (stryMutAct_9fa48("4445")) {
    {}
  } else {
    stryCov_9fa48("4445");
    return stryMutAct_9fa48("4446") ? actions.every(action => action.kind === "use-count") : (stryCov_9fa48("4446"), actions.some(stryMutAct_9fa48("4447") ? () => undefined : (stryCov_9fa48("4447"), action => stryMutAct_9fa48("4450") ? action.kind !== "use-count" : stryMutAct_9fa48("4449") ? false : stryMutAct_9fa48("4448") ? true : (stryCov_9fa48("4448", "4449", "4450"), action.kind === (stryMutAct_9fa48("4451") ? "" : (stryCov_9fa48("4451"), "use-count"))))));
  }
}

/** Extract outstanding count from step actions; null when no `use-count`. */
export function channelTxOutstandingCountFromActions(actions: ReadonlyArray<CountChannelTxOutstandingAction>): number | null {
  if (stryMutAct_9fa48("4452")) {
    {}
  } else {
    stryCov_9fa48("4452");
    const action = actions.find(stryMutAct_9fa48("4453") ? () => undefined : (stryCov_9fa48("4453"), entry => stryMutAct_9fa48("4456") ? entry.kind !== "use-count" : stryMutAct_9fa48("4455") ? false : stryMutAct_9fa48("4454") ? true : (stryCov_9fa48("4454", "4455", "4456"), entry.kind === (stryMutAct_9fa48("4457") ? "" : (stryCov_9fa48("4457"), "use-count")))));
    return (stryMutAct_9fa48("4460") ? action?.kind !== "use-count" : stryMutAct_9fa48("4459") ? false : stryMutAct_9fa48("4458") ? true : (stryCov_9fa48("4458", "4459", "4460"), (stryMutAct_9fa48("4461") ? action.kind : (stryCov_9fa48("4461"), action?.kind)) === (stryMutAct_9fa48("4462") ? "" : (stryCov_9fa48("4462"), "use-count")))) ? action.count : null;
  }
}

/** Whether channel TX timeout refresh / receipt callback arming may use a packet receipt. */
export function canArmChannelPacketReceipt(receiptPresent: boolean): boolean {
  if (stryMutAct_9fa48("4463")) {
    {}
  } else {
    stryCov_9fa48("4463");
    return receiptPresent;
  }
}

/**
 * Channel packet-receipt arm gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canArmChannelPacketReceipt`
 * reads beside the step).
 */
export type ArmChannelPacketReceiptState = Record<string, never>;
export type ArmChannelPacketReceiptEvent = Event | {
  readonly kind: "channel/arm-packet-receipt-gate";
  readonly receiptPresent: boolean;
};
export type ArmChannelPacketReceiptAction = {
  readonly kind: "arm";
} | {
  readonly kind: "skip";
};
export interface ArmChannelPacketReceiptStepResult {
  readonly state: ArmChannelPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ArmChannelPacketReceiptAction[];
}
export function initialArmChannelPacketReceiptState(): ArmChannelPacketReceiptState {
  if (stryMutAct_9fa48("4464")) {
    {}
  } else {
    stryCov_9fa48("4464");
    return {};
  }
}
export function stepArmChannelPacketReceiptWithActions(state: ArmChannelPacketReceiptState, event: ArmChannelPacketReceiptEvent): ArmChannelPacketReceiptStepResult {
  if (stryMutAct_9fa48("4465")) {
    {}
  } else {
    stryCov_9fa48("4465");
    if (stryMutAct_9fa48("4468") ? event.kind !== "channel/arm-packet-receipt-gate" : stryMutAct_9fa48("4467") ? false : stryMutAct_9fa48("4466") ? true : (stryCov_9fa48("4466", "4467", "4468"), event.kind === (stryMutAct_9fa48("4469") ? "" : (stryCov_9fa48("4469"), "channel/arm-packet-receipt-gate")))) {
      if (stryMutAct_9fa48("4470")) {
        {}
      } else {
        stryCov_9fa48("4470");
        return stryMutAct_9fa48("4471") ? {} : (stryCov_9fa48("4471"), {
          state,
          intents: stryMutAct_9fa48("4472") ? ["Stryker was here"] : (stryCov_9fa48("4472"), []),
          actions: stryMutAct_9fa48("4473") ? [] : (stryCov_9fa48("4473"), [stryMutAct_9fa48("4474") ? {} : (stryCov_9fa48("4474"), {
            kind: canArmChannelPacketReceipt(event.receiptPresent) ? stryMutAct_9fa48("4475") ? "" : (stryCov_9fa48("4475"), "arm") : stryMutAct_9fa48("4476") ? "" : (stryCov_9fa48("4476"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4477") ? {} : (stryCov_9fa48("4477"), {
      state,
      intents: stryMutAct_9fa48("4478") ? ["Stryker was here"] : (stryCov_9fa48("4478"), []),
      actions: stryMutAct_9fa48("4479") ? ["Stryker was here"] : (stryCov_9fa48("4479"), [])
    });
  }
}
export function shouldArmChannelPacketReceiptNow(actions: ReadonlyArray<ArmChannelPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("4480")) {
    {}
  } else {
    stryCov_9fa48("4480");
    return stryMutAct_9fa48("4481") ? actions.every(action => action.kind === "arm") : (stryCov_9fa48("4481"), actions.some(stryMutAct_9fa48("4482") ? () => undefined : (stryCov_9fa48("4482"), action => stryMutAct_9fa48("4485") ? action.kind !== "arm" : stryMutAct_9fa48("4484") ? false : stryMutAct_9fa48("4483") ? true : (stryCov_9fa48("4483", "4484", "4485"), action.kind === (stryMutAct_9fa48("4486") ? "" : (stryCov_9fa48("4486"), "arm"))))));
  }
}
export function shouldSkipArmChannelPacketReceipt(actions: ReadonlyArray<ArmChannelPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("4487")) {
    {}
  } else {
    stryCov_9fa48("4487");
    return stryMutAct_9fa48("4488") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4488"), actions.some(stryMutAct_9fa48("4489") ? () => undefined : (stryCov_9fa48("4489"), action => stryMutAct_9fa48("4492") ? action.kind !== "skip" : stryMutAct_9fa48("4491") ? false : stryMutAct_9fa48("4490") ? true : (stryCov_9fa48("4490", "4491", "4492"), action.kind === (stryMutAct_9fa48("4493") ? "" : (stryCov_9fa48("4493"), "skip"))))));
  }
}

/**
 * Whether a recomputed channel packet timeout should replace the receipt's
 * current timeout (updated must be strictly greater than a present current).
 */
export function shouldExtendPacketReceiptTimeout(input: {
  readonly currentTimeout: number | null;
  readonly updatedTimeout: number;
}): boolean {
  if (stryMutAct_9fa48("4494")) {
    {}
  } else {
    stryCov_9fa48("4494");
    return stryMutAct_9fa48("4497") ? input.currentTimeout !== null || input.updatedTimeout > input.currentTimeout : stryMutAct_9fa48("4496") ? false : stryMutAct_9fa48("4495") ? true : (stryCov_9fa48("4495", "4496", "4497"), (stryMutAct_9fa48("4499") ? input.currentTimeout === null : stryMutAct_9fa48("4498") ? true : (stryCov_9fa48("4498", "4499"), input.currentTimeout !== null)) && (stryMutAct_9fa48("4502") ? input.updatedTimeout <= input.currentTimeout : stryMutAct_9fa48("4501") ? input.updatedTimeout >= input.currentTimeout : stryMutAct_9fa48("4500") ? true : (stryCov_9fa48("4500", "4501", "4502"), input.updatedTimeout > input.currentTimeout)));
  }
}

/**
 * Extend-packet-receipt-timeout gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldExtendPacketReceiptTimeout` reads beside the step).
 */
export type ExtendPacketReceiptTimeoutState = Record<string, never>;
export type ExtendPacketReceiptTimeoutEvent = Event | {
  readonly kind: "channel/extend-packet-receipt-timeout-gate";
  readonly currentTimeout: number | null;
  readonly updatedTimeout: number;
};
export type ExtendPacketReceiptTimeoutAction = {
  readonly kind: "extend";
} | {
  readonly kind: "skip";
};
export interface ExtendPacketReceiptTimeoutStepResult {
  readonly state: ExtendPacketReceiptTimeoutState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ExtendPacketReceiptTimeoutAction[];
}
export function initialExtendPacketReceiptTimeoutState(): ExtendPacketReceiptTimeoutState {
  if (stryMutAct_9fa48("4503")) {
    {}
  } else {
    stryCov_9fa48("4503");
    return {};
  }
}
export function stepExtendPacketReceiptTimeoutWithActions(state: ExtendPacketReceiptTimeoutState, event: ExtendPacketReceiptTimeoutEvent): ExtendPacketReceiptTimeoutStepResult {
  if (stryMutAct_9fa48("4504")) {
    {}
  } else {
    stryCov_9fa48("4504");
    if (stryMutAct_9fa48("4507") ? event.kind !== "channel/extend-packet-receipt-timeout-gate" : stryMutAct_9fa48("4506") ? false : stryMutAct_9fa48("4505") ? true : (stryCov_9fa48("4505", "4506", "4507"), event.kind === (stryMutAct_9fa48("4508") ? "" : (stryCov_9fa48("4508"), "channel/extend-packet-receipt-timeout-gate")))) {
      if (stryMutAct_9fa48("4509")) {
        {}
      } else {
        stryCov_9fa48("4509");
        return stryMutAct_9fa48("4510") ? {} : (stryCov_9fa48("4510"), {
          state,
          intents: stryMutAct_9fa48("4511") ? ["Stryker was here"] : (stryCov_9fa48("4511"), []),
          actions: stryMutAct_9fa48("4512") ? [] : (stryCov_9fa48("4512"), [stryMutAct_9fa48("4513") ? {} : (stryCov_9fa48("4513"), {
            kind: shouldExtendPacketReceiptTimeout(stryMutAct_9fa48("4514") ? {} : (stryCov_9fa48("4514"), {
              currentTimeout: event.currentTimeout,
              updatedTimeout: event.updatedTimeout
            })) ? stryMutAct_9fa48("4515") ? "" : (stryCov_9fa48("4515"), "extend") : stryMutAct_9fa48("4516") ? "" : (stryCov_9fa48("4516"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("4517") ? {} : (stryCov_9fa48("4517"), {
      state,
      intents: stryMutAct_9fa48("4518") ? ["Stryker was here"] : (stryCov_9fa48("4518"), []),
      actions: stryMutAct_9fa48("4519") ? ["Stryker was here"] : (stryCov_9fa48("4519"), [])
    });
  }
}
export function shouldExtendPacketReceiptTimeoutNow(actions: ReadonlyArray<ExtendPacketReceiptTimeoutAction>): boolean {
  if (stryMutAct_9fa48("4520")) {
    {}
  } else {
    stryCov_9fa48("4520");
    return stryMutAct_9fa48("4521") ? actions.every(action => action.kind === "extend") : (stryCov_9fa48("4521"), actions.some(stryMutAct_9fa48("4522") ? () => undefined : (stryCov_9fa48("4522"), action => stryMutAct_9fa48("4525") ? action.kind !== "extend" : stryMutAct_9fa48("4524") ? false : stryMutAct_9fa48("4523") ? true : (stryCov_9fa48("4523", "4524", "4525"), action.kind === (stryMutAct_9fa48("4526") ? "" : (stryCov_9fa48("4526"), "extend"))))));
  }
}
export function shouldSkipExtendPacketReceiptTimeout(actions: ReadonlyArray<ExtendPacketReceiptTimeoutAction>): boolean {
  if (stryMutAct_9fa48("4527")) {
    {}
  } else {
    stryCov_9fa48("4527");
    return stryMutAct_9fa48("4528") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("4528"), actions.some(stryMutAct_9fa48("4529") ? () => undefined : (stryCov_9fa48("4529"), action => stryMutAct_9fa48("4532") ? action.kind !== "skip" : stryMutAct_9fa48("4531") ? false : stryMutAct_9fa48("4530") ? true : (stryCov_9fa48("4530", "4531", "4532"), action.kind === (stryMutAct_9fa48("4533") ? "" : (stryCov_9fa48("4533"), "skip"))))));
  }
}

/**
 * Find a TX-ring envelope by outlet packet id.
 * Packet-id extraction stays at the adapter edge.
 */
export function indexOfChannelTxEnvelope(input: {
  readonly packetIds: ReadonlyArray<Uint8Array | null>;
  readonly targetId: Uint8Array | null;
}): number | null {
  if (stryMutAct_9fa48("4534")) {
    {}
  } else {
    stryCov_9fa48("4534");
    if (stryMutAct_9fa48("4537") ? input.targetId !== null : stryMutAct_9fa48("4536") ? false : stryMutAct_9fa48("4535") ? true : (stryCov_9fa48("4535", "4536", "4537"), input.targetId === null)) {
      if (stryMutAct_9fa48("4538")) {
        {}
      } else {
        stryCov_9fa48("4538");
        return null;
      }
    }
    for (let index = 0; stryMutAct_9fa48("4541") ? index >= input.packetIds.length : stryMutAct_9fa48("4540") ? index <= input.packetIds.length : stryMutAct_9fa48("4539") ? false : (stryCov_9fa48("4539", "4540", "4541"), index < input.packetIds.length); stryMutAct_9fa48("4542") ? index -= 1 : (stryCov_9fa48("4542"), index += 1)) {
      if (stryMutAct_9fa48("4543")) {
        {}
      } else {
        stryCov_9fa48("4543");
        const packetId = input.packetIds[index];
        if (stryMutAct_9fa48("4546") ? packetId != null || equalByteArrays(packetId, input.targetId) : stryMutAct_9fa48("4545") ? false : stryMutAct_9fa48("4544") ? true : (stryCov_9fa48("4544", "4545", "4546"), (stryMutAct_9fa48("4548") ? packetId == null : stryMutAct_9fa48("4547") ? true : (stryCov_9fa48("4547", "4548"), packetId != null)) && equalByteArrays(packetId, input.targetId))) {
          if (stryMutAct_9fa48("4549")) {
            {}
          } else {
            stryCov_9fa48("4549");
            return index;
          }
        }
      }
    }
    return null;
  }
}

/**
 * Channel TX-envelope index lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `indexOfChannelTxEnvelope`
 * reads beside the step).
 */
export type IndexOfChannelTxEnvelopeState = Record<string, never>;
export type IndexOfChannelTxEnvelopeEvent = Event | {
  readonly kind: "channel/tx-envelope-index-gate";
  readonly packetIds: ReadonlyArray<Uint8Array | null>;
  readonly targetId: Uint8Array | null;
};
export type IndexOfChannelTxEnvelopeAction = {
  readonly kind: "use-index";
  readonly index: number;
} | {
  readonly kind: "miss";
};
export interface IndexOfChannelTxEnvelopeStepResult {
  readonly state: IndexOfChannelTxEnvelopeState;
  readonly intents: readonly Intent[];
  readonly actions: readonly IndexOfChannelTxEnvelopeAction[];
}
export function initialIndexOfChannelTxEnvelopeState(): IndexOfChannelTxEnvelopeState {
  if (stryMutAct_9fa48("4550")) {
    {}
  } else {
    stryCov_9fa48("4550");
    return {};
  }
}
export function stepIndexOfChannelTxEnvelopeWithActions(state: IndexOfChannelTxEnvelopeState, event: IndexOfChannelTxEnvelopeEvent): IndexOfChannelTxEnvelopeStepResult {
  if (stryMutAct_9fa48("4551")) {
    {}
  } else {
    stryCov_9fa48("4551");
    if (stryMutAct_9fa48("4554") ? event.kind !== "channel/tx-envelope-index-gate" : stryMutAct_9fa48("4553") ? false : stryMutAct_9fa48("4552") ? true : (stryCov_9fa48("4552", "4553", "4554"), event.kind === (stryMutAct_9fa48("4555") ? "" : (stryCov_9fa48("4555"), "channel/tx-envelope-index-gate")))) {
      if (stryMutAct_9fa48("4556")) {
        {}
      } else {
        stryCov_9fa48("4556");
        const index = indexOfChannelTxEnvelope(stryMutAct_9fa48("4557") ? {} : (stryCov_9fa48("4557"), {
          packetIds: event.packetIds,
          targetId: event.targetId
        }));
        return stryMutAct_9fa48("4558") ? {} : (stryCov_9fa48("4558"), {
          state,
          intents: stryMutAct_9fa48("4559") ? ["Stryker was here"] : (stryCov_9fa48("4559"), []),
          actions: (stryMutAct_9fa48("4562") ? index !== null : stryMutAct_9fa48("4561") ? false : stryMutAct_9fa48("4560") ? true : (stryCov_9fa48("4560", "4561", "4562"), index === null)) ? stryMutAct_9fa48("4563") ? [] : (stryCov_9fa48("4563"), [stryMutAct_9fa48("4564") ? {} : (stryCov_9fa48("4564"), {
            kind: stryMutAct_9fa48("4565") ? "" : (stryCov_9fa48("4565"), "miss")
          })]) : stryMutAct_9fa48("4566") ? [] : (stryCov_9fa48("4566"), [stryMutAct_9fa48("4567") ? {} : (stryCov_9fa48("4567"), {
            kind: stryMutAct_9fa48("4568") ? "" : (stryCov_9fa48("4568"), "use-index"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("4569") ? {} : (stryCov_9fa48("4569"), {
      state,
      intents: stryMutAct_9fa48("4570") ? ["Stryker was here"] : (stryCov_9fa48("4570"), []),
      actions: stryMutAct_9fa48("4571") ? ["Stryker was here"] : (stryCov_9fa48("4571"), [])
    });
  }
}
export function shouldUseChannelTxEnvelopeIndex(actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("4572")) {
    {}
  } else {
    stryCov_9fa48("4572");
    return stryMutAct_9fa48("4573") ? actions.every(action => action.kind === "use-index") : (stryCov_9fa48("4573"), actions.some(stryMutAct_9fa48("4574") ? () => undefined : (stryCov_9fa48("4574"), action => stryMutAct_9fa48("4577") ? action.kind !== "use-index" : stryMutAct_9fa48("4576") ? false : stryMutAct_9fa48("4575") ? true : (stryCov_9fa48("4575", "4576", "4577"), action.kind === (stryMutAct_9fa48("4578") ? "" : (stryCov_9fa48("4578"), "use-index"))))));
  }
}
export function shouldMissChannelTxEnvelopeIndex(actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>): boolean {
  if (stryMutAct_9fa48("4579")) {
    {}
  } else {
    stryCov_9fa48("4579");
    return stryMutAct_9fa48("4580") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("4580"), actions.some(stryMutAct_9fa48("4581") ? () => undefined : (stryCov_9fa48("4581"), action => stryMutAct_9fa48("4584") ? action.kind !== "miss" : stryMutAct_9fa48("4583") ? false : stryMutAct_9fa48("4582") ? true : (stryCov_9fa48("4582", "4583", "4584"), action.kind === (stryMutAct_9fa48("4585") ? "" : (stryCov_9fa48("4585"), "miss"))))));
  }
}

/** Extract TX-envelope index from step actions; null when no `use-index`. */
export function channelTxEnvelopeIndexFromActions(actions: ReadonlyArray<IndexOfChannelTxEnvelopeAction>): number | null {
  if (stryMutAct_9fa48("4586")) {
    {}
  } else {
    stryCov_9fa48("4586");
    const action = actions.find(stryMutAct_9fa48("4587") ? () => undefined : (stryCov_9fa48("4587"), entry => stryMutAct_9fa48("4590") ? entry.kind !== "use-index" : stryMutAct_9fa48("4589") ? false : stryMutAct_9fa48("4588") ? true : (stryCov_9fa48("4588", "4589", "4590"), entry.kind === (stryMutAct_9fa48("4591") ? "" : (stryCov_9fa48("4591"), "use-index")))));
    return (stryMutAct_9fa48("4594") ? action?.kind !== "use-index" : stryMutAct_9fa48("4593") ? false : stryMutAct_9fa48("4592") ? true : (stryCov_9fa48("4592", "4593", "4594"), (stryMutAct_9fa48("4595") ? action.kind : (stryCov_9fa48("4595"), action?.kind)) === (stryMutAct_9fa48("4596") ? "" : (stryCov_9fa48("4596"), "use-index")))) ? action.index : null;
  }
}
export type ChannelTxEnvelopeOpPlan = "miss" | "process";

/**
 * Whether a TX-ring lookup may operate on the envelope (timeout/delivery).
 * Pass `opOk: false` when a delivery op declined the envelope.
 */
export function planChannelTxEnvelopeOp(input: {
  readonly indexOk: boolean;
  readonly envelopePresent: boolean;
  readonly opOk?: boolean;
}): ChannelTxEnvelopeOpPlan {
  if (stryMutAct_9fa48("4597")) {
    {}
  } else {
    stryCov_9fa48("4597");
    if (stryMutAct_9fa48("4600") ? (!input.indexOk || !input.envelopePresent) && input.opOk === false : stryMutAct_9fa48("4599") ? false : stryMutAct_9fa48("4598") ? true : (stryCov_9fa48("4598", "4599", "4600"), (stryMutAct_9fa48("4602") ? !input.indexOk && !input.envelopePresent : stryMutAct_9fa48("4601") ? false : (stryCov_9fa48("4601", "4602"), (stryMutAct_9fa48("4603") ? input.indexOk : (stryCov_9fa48("4603"), !input.indexOk)) || (stryMutAct_9fa48("4604") ? input.envelopePresent : (stryCov_9fa48("4604"), !input.envelopePresent)))) || (stryMutAct_9fa48("4606") ? input.opOk !== false : stryMutAct_9fa48("4605") ? false : (stryCov_9fa48("4605", "4606"), input.opOk === (stryMutAct_9fa48("4607") ? true : (stryCov_9fa48("4607"), false)))))) {
      if (stryMutAct_9fa48("4608")) {
        {}
      } else {
        stryCov_9fa48("4608");
        return stryMutAct_9fa48("4609") ? "" : (stryCov_9fa48("4609"), "miss");
      }
    }
    return stryMutAct_9fa48("4610") ? "" : (stryCov_9fa48("4610"), "process");
  }
}
export type ChannelTxEnvelopeOpPlanEvent = Event | {
  readonly kind: "channel/tx-envelope-op-plan-gate";
  readonly indexOk: boolean;
  readonly envelopePresent: boolean;
  readonly opOk?: boolean;
};
export type ChannelTxEnvelopeOpPlanAction = {
  readonly kind: ChannelTxEnvelopeOpPlan;
};

/** Extract the TX-envelope-op plan from actions; null when empty. */
export function channelTxEnvelopeOpPlanFromActions(actions: ReadonlyArray<ChannelTxEnvelopeOpPlanAction>): ChannelTxEnvelopeOpPlan | null {
  if (stryMutAct_9fa48("4611")) {
    {}
  } else {
    stryCov_9fa48("4611");
    const action = actions.find(stryMutAct_9fa48("4612") ? () => undefined : (stryCov_9fa48("4612"), entry => stryMutAct_9fa48("4615") ? entry.kind === "miss" && entry.kind === "process" : stryMutAct_9fa48("4614") ? false : stryMutAct_9fa48("4613") ? true : (stryCov_9fa48("4613", "4614", "4615"), (stryMutAct_9fa48("4617") ? entry.kind !== "miss" : stryMutAct_9fa48("4616") ? false : (stryCov_9fa48("4616", "4617"), entry.kind === (stryMutAct_9fa48("4618") ? "" : (stryCov_9fa48("4618"), "miss")))) || (stryMutAct_9fa48("4620") ? entry.kind !== "process" : stryMutAct_9fa48("4619") ? false : (stryCov_9fa48("4619", "4620"), entry.kind === (stryMutAct_9fa48("4621") ? "" : (stryCov_9fa48("4621"), "process")))))));
    return stryMutAct_9fa48("4622") ? action?.kind && null : (stryCov_9fa48("4622"), (stryMutAct_9fa48("4623") ? action.kind : (stryCov_9fa48("4623"), action?.kind)) ?? null);
  }
}
export type ChannelTxEnvelopeOpEvent = Event | {
  readonly kind: "channel/tx-envelope-op-gate";
  readonly indexOk: boolean;
  readonly envelopePresent: boolean;
  readonly opOk?: boolean;
};
export type ChannelTxEnvelopeOpAction = {
  readonly kind: "miss";
} | {
  readonly kind: "process";
};