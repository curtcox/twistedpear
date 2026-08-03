/** Extracted from packet-receipt-timeout.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure packet-receipt timeout conclusion.
 * Adapters schedule/cancel clocks from timer intents and invoke
 * delivery/timeout callbacks only via machine actions (no ad-hoc
 * `state.timedOut` reads beside the step).
 * Register / keep / fail-and-drop gates conclude via machine actions (no
 * ad-hoc `shouldRegisterPacketReceipt` / `shouldKeepOutboundReceipt` /
 * `shouldFailAndDropOutboundReceipt` reads beside the step).
 * Outbound-receipt / packet-receipt-proof-ingress / packet-receipt-callback /
 * packet-receipt-unregister plans nested via
 * {@link stepOutboundReceiptPlanWithActions} /
 * {@link stepPacketReceiptProofIngressPlanWithActions} /
 * {@link stepPacketReceiptCallbackPlanWithActions} /
 * {@link stepPacketReceiptUnregisterPlanWithActions}.
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
import { stepOutboundReceiptInner } from "./part-1.js";
import { packetReceiptCallbackPlanFromActions, planPacketReceiptCallback, stepPacketReceiptProofIngressInner } from "./part-2.js";
import type { OutboundReceiptAction, OutboundReceiptEvent, OutboundReceiptOutcome, OutboundReceiptState, PacketReceiptTimeoutAction } from "./part-1.js";
import type { PacketReceiptCallbackAction, PacketReceiptCallbackEvent, PacketReceiptCallbackPlanAction, PacketReceiptCallbackPlanEvent, PacketReceiptProofIngressAction, PacketReceiptProofIngressEvent, PacketReceiptProofIngressPlan, PacketReceiptProofIngressState } from "./part-2.js";
/**
 * Packet-receipt callback plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptCallback` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketReceiptCallbackWithActions}.
 */
export type PacketReceiptCallbackPlanState = Record<string, never>;
export interface PacketReceiptCallbackPlanStepResult {
  readonly state: PacketReceiptCallbackPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptCallbackPlanAction[];
}
export function initialPacketReceiptCallbackPlanState(): PacketReceiptCallbackPlanState {
  if (stryMutAct_9fa48("24304")) {
    {}
  } else {
    stryCov_9fa48("24304");
    return {};
  }
}
export function stepPacketReceiptCallbackPlanWithActions(state: PacketReceiptCallbackPlanState, event: PacketReceiptCallbackPlanEvent): PacketReceiptCallbackPlanStepResult {
  if (stryMutAct_9fa48("24305")) {
    {}
  } else {
    stryCov_9fa48("24305");
    if (stryMutAct_9fa48("24308") ? event.kind !== "receipt/callback-plan-gate" : stryMutAct_9fa48("24307") ? false : stryMutAct_9fa48("24306") ? true : (stryCov_9fa48("24306", "24307", "24308"), event.kind === (stryMutAct_9fa48("24309") ? "" : (stryCov_9fa48("24309"), "receipt/callback-plan-gate")))) {
      if (stryMutAct_9fa48("24310")) {
        {}
      } else {
        stryCov_9fa48("24310");
        return stryMutAct_9fa48("24311") ? {} : (stryCov_9fa48("24311"), {
          state,
          intents: stryMutAct_9fa48("24312") ? ["Stryker was here"] : (stryCov_9fa48("24312"), []),
          actions: stryMutAct_9fa48("24313") ? [] : (stryCov_9fa48("24313"), [stryMutAct_9fa48("24314") ? {} : (stryCov_9fa48("24314"), {
            kind: planPacketReceiptCallback(event.callbackPresent)
          })])
        });
      }
    }
    return stryMutAct_9fa48("24315") ? {} : (stryCov_9fa48("24315"), {
      state,
      intents: stryMutAct_9fa48("24316") ? ["Stryker was here"] : (stryCov_9fa48("24316"), []),
      actions: stryMutAct_9fa48("24317") ? ["Stryker was here"] : (stryCov_9fa48("24317"), [])
    });
  }
}
export function shouldClearPacketReceiptCallbackPlan(actions: ReadonlyArray<PacketReceiptCallbackPlanAction>): boolean {
  if (stryMutAct_9fa48("24318")) {
    {}
  } else {
    stryCov_9fa48("24318");
    return stryMutAct_9fa48("24319") ? actions.every(action => action.kind === "clear") : (stryCov_9fa48("24319"), actions.some(stryMutAct_9fa48("24320") ? () => undefined : (stryCov_9fa48("24320"), action => stryMutAct_9fa48("24323") ? action.kind !== "clear" : stryMutAct_9fa48("24322") ? false : stryMutAct_9fa48("24321") ? true : (stryCov_9fa48("24321", "24322", "24323"), action.kind === (stryMutAct_9fa48("24324") ? "" : (stryCov_9fa48("24324"), "clear"))))));
  }
}
export function shouldSetPacketReceiptCallbackPlan(actions: ReadonlyArray<PacketReceiptCallbackPlanAction>): boolean {
  if (stryMutAct_9fa48("24325")) {
    {}
  } else {
    stryCov_9fa48("24325");
    return stryMutAct_9fa48("24326") ? actions.every(action => action.kind === "set") : (stryCov_9fa48("24326"), actions.some(stryMutAct_9fa48("24327") ? () => undefined : (stryCov_9fa48("24327"), action => stryMutAct_9fa48("24330") ? action.kind !== "set" : stryMutAct_9fa48("24329") ? false : stryMutAct_9fa48("24328") ? true : (stryCov_9fa48("24328", "24329", "24330"), action.kind === (stryMutAct_9fa48("24331") ? "" : (stryCov_9fa48("24331"), "set"))))));
  }
}

/**
 * Packet-receipt callback assignment is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptCallback`
 * / `plan === "clear"` reads beside the step).
 * Plan nested via {@link stepPacketReceiptCallbackPlanWithActions} (`clear`|`set`).
 */
export type PacketReceiptCallbackState = Record<string, never>;
export interface PacketReceiptCallbackStepResult {
  readonly state: PacketReceiptCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptCallbackAction[];
}
export function initialPacketReceiptCallbackState(): PacketReceiptCallbackState {
  if (stryMutAct_9fa48("24332")) {
    {}
  } else {
    stryCov_9fa48("24332");
    return {};
  }
}
export function stepPacketReceiptCallbackWithActions(state: PacketReceiptCallbackState, event: PacketReceiptCallbackEvent): PacketReceiptCallbackStepResult {
  if (stryMutAct_9fa48("24333")) {
    {}
  } else {
    stryCov_9fa48("24333");
    if (stryMutAct_9fa48("24336") ? event.kind !== "receipt/callback-gate" : stryMutAct_9fa48("24335") ? false : stryMutAct_9fa48("24334") ? true : (stryCov_9fa48("24334", "24335", "24336"), event.kind === (stryMutAct_9fa48("24337") ? "" : (stryCov_9fa48("24337"), "receipt/callback-gate")))) {
      if (stryMutAct_9fa48("24338")) {
        {}
      } else {
        stryCov_9fa48("24338");
        const planActions = stepPacketReceiptCallbackPlanWithActions(initialPacketReceiptCallbackPlanState(), stryMutAct_9fa48("24339") ? {} : (stryCov_9fa48("24339"), {
          kind: stryMutAct_9fa48("24340") ? "" : (stryCov_9fa48("24340"), "receipt/callback-plan-gate"),
          callbackPresent: event.callbackPresent
        })).actions;
        const plan = packetReceiptCallbackPlanFromActions(planActions);
        if (stryMutAct_9fa48("24343") ? plan !== null : stryMutAct_9fa48("24342") ? false : stryMutAct_9fa48("24341") ? true : (stryCov_9fa48("24341", "24342", "24343"), plan === null)) {
          if (stryMutAct_9fa48("24344")) {
            {}
          } else {
            stryCov_9fa48("24344");
            return stryMutAct_9fa48("24345") ? {} : (stryCov_9fa48("24345"), {
              state,
              intents: stryMutAct_9fa48("24346") ? ["Stryker was here"] : (stryCov_9fa48("24346"), []),
              actions: stryMutAct_9fa48("24347") ? ["Stryker was here"] : (stryCov_9fa48("24347"), [])
            });
          }
        }
        return stryMutAct_9fa48("24348") ? {} : (stryCov_9fa48("24348"), {
          state,
          intents: stryMutAct_9fa48("24349") ? ["Stryker was here"] : (stryCov_9fa48("24349"), []),
          actions: stryMutAct_9fa48("24350") ? [] : (stryCov_9fa48("24350"), [stryMutAct_9fa48("24351") ? {} : (stryCov_9fa48("24351"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("24352") ? {} : (stryCov_9fa48("24352"), {
      state,
      intents: stryMutAct_9fa48("24353") ? ["Stryker was here"] : (stryCov_9fa48("24353"), []),
      actions: stryMutAct_9fa48("24354") ? ["Stryker was here"] : (stryCov_9fa48("24354"), [])
    });
  }
}
export function shouldClearPacketReceiptCallback(actions: ReadonlyArray<PacketReceiptCallbackAction>): boolean {
  if (stryMutAct_9fa48("24355")) {
    {}
  } else {
    stryCov_9fa48("24355");
    return stryMutAct_9fa48("24356") ? actions.every(action => action.kind === "clear") : (stryCov_9fa48("24356"), actions.some(stryMutAct_9fa48("24357") ? () => undefined : (stryCov_9fa48("24357"), action => stryMutAct_9fa48("24360") ? action.kind !== "clear" : stryMutAct_9fa48("24359") ? false : stryMutAct_9fa48("24358") ? true : (stryCov_9fa48("24358", "24359", "24360"), action.kind === (stryMutAct_9fa48("24361") ? "" : (stryCov_9fa48("24361"), "clear"))))));
  }
}
export function shouldSetPacketReceiptCallback(actions: ReadonlyArray<PacketReceiptCallbackAction>): boolean {
  if (stryMutAct_9fa48("24362")) {
    {}
  } else {
    stryCov_9fa48("24362");
    return stryMutAct_9fa48("24363") ? actions.every(action => action.kind === "set") : (stryCov_9fa48("24363"), actions.some(stryMutAct_9fa48("24364") ? () => undefined : (stryCov_9fa48("24364"), action => stryMutAct_9fa48("24367") ? action.kind !== "set" : stryMutAct_9fa48("24366") ? false : stryMutAct_9fa48("24365") ? true : (stryCov_9fa48("24365", "24366", "24367"), action.kind === (stryMutAct_9fa48("24368") ? "" : (stryCov_9fa48("24368"), "set"))))));
  }
}

/** Whether step actions include a timeout/delivery/failed fanout for the adapter callback. */
export function shouldInvokePacketReceiptAction(actions: ReadonlyArray<PacketReceiptTimeoutAction>, kind: PacketReceiptTimeoutAction["kind"]): boolean {
  if (stryMutAct_9fa48("24369")) {
    {}
  } else {
    stryCov_9fa48("24369");
    return stryMutAct_9fa48("24370") ? actions.every(action => action.kind === kind) : (stryCov_9fa48("24370"), actions.some(stryMutAct_9fa48("24371") ? () => undefined : (stryCov_9fa48("24371"), action => stryMutAct_9fa48("24374") ? action.kind !== kind : stryMutAct_9fa48("24373") ? false : stryMutAct_9fa48("24372") ? true : (stryCov_9fa48("24372", "24373", "24374"), action.kind === kind))));
  }
}

/** Whether the adapter should invoke the timeout callback after a timed-out step. */
export function shouldInvokePacketReceiptTimeoutCallback(actions: ReadonlyArray<PacketReceiptTimeoutAction>): boolean {
  if (stryMutAct_9fa48("24375")) {
    {}
  } else {
    stryCov_9fa48("24375");
    return shouldInvokePacketReceiptAction(actions, stryMutAct_9fa48("24376") ? "" : (stryCov_9fa48("24376"), "timeout"));
  }
}
export function initialOutboundReceiptState(): OutboundReceiptState {
  if (stryMutAct_9fa48("24377")) {
    {}
  } else {
    stryCov_9fa48("24377");
    return {};
  }
}
export const stepOutboundReceipt: StepFn<OutboundReceiptState> = (state, event) => {
  if (stryMutAct_9fa48("24378")) {
    {}
  } else {
    stryCov_9fa48("24378");
    const result = stepOutboundReceiptInner(state, event as OutboundReceiptEvent);
    return stryMutAct_9fa48("24379") ? {} : (stryCov_9fa48("24379"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function outboundReceiptOutcomeFromActions(actions: ReadonlyArray<OutboundReceiptAction>): OutboundReceiptOutcome | null {
  if (stryMutAct_9fa48("24380")) {
    {}
  } else {
    stryCov_9fa48("24380");
    const action = actions[0];
    return stryMutAct_9fa48("24381") ? action?.kind && null : (stryCov_9fa48("24381"), (stryMutAct_9fa48("24382") ? action.kind : (stryCov_9fa48("24382"), action?.kind)) ?? null);
  }
}
export function shouldOutboundReceiptNone(actions: ReadonlyArray<OutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24383")) {
    {}
  } else {
    stryCov_9fa48("24383");
    return stryMutAct_9fa48("24384") ? actions.every(action => action.kind === "none") : (stryCov_9fa48("24384"), actions.some(stryMutAct_9fa48("24385") ? () => undefined : (stryCov_9fa48("24385"), action => stryMutAct_9fa48("24388") ? action.kind !== "none" : stryMutAct_9fa48("24387") ? false : stryMutAct_9fa48("24386") ? true : (stryCov_9fa48("24386", "24387", "24388"), action.kind === (stryMutAct_9fa48("24389") ? "" : (stryCov_9fa48("24389"), "none"))))));
  }
}
export function shouldOutboundKeepReceipt(actions: ReadonlyArray<OutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24390")) {
    {}
  } else {
    stryCov_9fa48("24390");
    return stryMutAct_9fa48("24391") ? actions.every(action => action.kind === "keep-receipt") : (stryCov_9fa48("24391"), actions.some(stryMutAct_9fa48("24392") ? () => undefined : (stryCov_9fa48("24392"), action => stryMutAct_9fa48("24395") ? action.kind !== "keep-receipt" : stryMutAct_9fa48("24394") ? false : stryMutAct_9fa48("24393") ? true : (stryCov_9fa48("24393", "24394", "24395"), action.kind === (stryMutAct_9fa48("24396") ? "" : (stryCov_9fa48("24396"), "keep-receipt"))))));
  }
}
export function shouldOutboundFailAndDropReceipt(actions: ReadonlyArray<OutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24397")) {
    {}
  } else {
    stryCov_9fa48("24397");
    return stryMutAct_9fa48("24398") ? actions.every(action => action.kind === "fail-and-drop-receipt") : (stryCov_9fa48("24398"), actions.some(stryMutAct_9fa48("24399") ? () => undefined : (stryCov_9fa48("24399"), action => stryMutAct_9fa48("24402") ? action.kind !== "fail-and-drop-receipt" : stryMutAct_9fa48("24401") ? false : stryMutAct_9fa48("24400") ? true : (stryCov_9fa48("24400", "24401", "24402"), action.kind === (stryMutAct_9fa48("24403") ? "" : (stryCov_9fa48("24403"), "fail-and-drop-receipt"))))));
  }
}
export function initialPacketReceiptProofIngressState(): PacketReceiptProofIngressState {
  if (stryMutAct_9fa48("24404")) {
    {}
  } else {
    stryCov_9fa48("24404");
    return {};
  }
}
export const stepPacketReceiptProofIngress: StepFn<PacketReceiptProofIngressState> = (state, event) => {
  if (stryMutAct_9fa48("24405")) {
    {}
  } else {
    stryCov_9fa48("24405");
    const result = stepPacketReceiptProofIngressInner(state, event as PacketReceiptProofIngressEvent);
    return stryMutAct_9fa48("24406") ? {} : (stryCov_9fa48("24406"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function packetReceiptProofIngressFromActions(actions: ReadonlyArray<PacketReceiptProofIngressAction>): PacketReceiptProofIngressPlan | null {
  if (stryMutAct_9fa48("24407")) {
    {}
  } else {
    stryCov_9fa48("24407");
    const action = actions[0];
    return stryMutAct_9fa48("24408") ? action?.kind && null : (stryCov_9fa48("24408"), (stryMutAct_9fa48("24409") ? action.kind : (stryCov_9fa48("24409"), action?.kind)) ?? null);
  }
}
export function shouldRemovePacketReceiptProofIngress(actions: ReadonlyArray<PacketReceiptProofIngressAction>): boolean {
  if (stryMutAct_9fa48("24410")) {
    {}
  } else {
    stryCov_9fa48("24410");
    return stryMutAct_9fa48("24411") ? actions.every(action => action.kind === "remove-receipt") : (stryCov_9fa48("24411"), actions.some(stryMutAct_9fa48("24412") ? () => undefined : (stryCov_9fa48("24412"), action => stryMutAct_9fa48("24415") ? action.kind !== "remove-receipt" : stryMutAct_9fa48("24414") ? false : stryMutAct_9fa48("24413") ? true : (stryCov_9fa48("24413", "24414", "24415"), action.kind === (stryMutAct_9fa48("24416") ? "" : (stryCov_9fa48("24416"), "remove-receipt"))))));
  }
}
export function shouldContinuePacketReceiptProofIngress(actions: ReadonlyArray<PacketReceiptProofIngressAction>): boolean {
  if (stryMutAct_9fa48("24417")) {
    {}
  } else {
    stryCov_9fa48("24417");
    return stryMutAct_9fa48("24418") ? actions.every(action => action.kind === "continue") : (stryCov_9fa48("24418"), actions.some(stryMutAct_9fa48("24419") ? () => undefined : (stryCov_9fa48("24419"), action => stryMutAct_9fa48("24422") ? action.kind !== "continue" : stryMutAct_9fa48("24421") ? false : stryMutAct_9fa48("24420") ? true : (stryCov_9fa48("24420", "24421", "24422"), action.kind === (stryMutAct_9fa48("24423") ? "" : (stryCov_9fa48("24423"), "continue"))))));
  }
}