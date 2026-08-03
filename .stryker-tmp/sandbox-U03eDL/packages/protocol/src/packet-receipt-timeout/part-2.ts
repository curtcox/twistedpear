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
import { shouldKeepOutboundReceipt } from "./part-1.js";
import type { KeepOutboundReceiptAction, KeepOutboundReceiptEvent, KeepOutboundReceiptState, KeepOutboundReceiptStepResult } from "./part-1.js";
export function stepKeepOutboundReceiptWithActions(state: KeepOutboundReceiptState, event: KeepOutboundReceiptEvent): KeepOutboundReceiptStepResult {
  if (stryMutAct_9fa48("24091")) {
    {}
  } else {
    stryCov_9fa48("24091");
    if (stryMutAct_9fa48("24094") ? event.kind !== "receipt/keep-outbound-gate" : stryMutAct_9fa48("24093") ? false : stryMutAct_9fa48("24092") ? true : (stryCov_9fa48("24092", "24093", "24094"), event.kind === (stryMutAct_9fa48("24095") ? "" : (stryCov_9fa48("24095"), "receipt/keep-outbound-gate")))) {
      if (stryMutAct_9fa48("24096")) {
        {}
      } else {
        stryCov_9fa48("24096");
        return stryMutAct_9fa48("24097") ? {} : (stryCov_9fa48("24097"), {
          state,
          intents: stryMutAct_9fa48("24098") ? ["Stryker was here"] : (stryCov_9fa48("24098"), []),
          actions: stryMutAct_9fa48("24099") ? [] : (stryCov_9fa48("24099"), [stryMutAct_9fa48("24100") ? {} : (stryCov_9fa48("24100"), {
            kind: shouldKeepOutboundReceipt(stryMutAct_9fa48("24101") ? {} : (stryCov_9fa48("24101"), {
              planKeep: event.planKeep,
              sent: event.sent
            })) ? stryMutAct_9fa48("24102") ? "" : (stryCov_9fa48("24102"), "keep") : stryMutAct_9fa48("24103") ? "" : (stryCov_9fa48("24103"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24104") ? {} : (stryCov_9fa48("24104"), {
      state,
      intents: stryMutAct_9fa48("24105") ? ["Stryker was here"] : (stryCov_9fa48("24105"), []),
      actions: stryMutAct_9fa48("24106") ? ["Stryker was here"] : (stryCov_9fa48("24106"), [])
    });
  }
}
export function shouldKeepOutboundReceiptNow(actions: ReadonlyArray<KeepOutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24107")) {
    {}
  } else {
    stryCov_9fa48("24107");
    return stryMutAct_9fa48("24108") ? actions.every(action => action.kind === "keep") : (stryCov_9fa48("24108"), actions.some(stryMutAct_9fa48("24109") ? () => undefined : (stryCov_9fa48("24109"), action => stryMutAct_9fa48("24112") ? action.kind !== "keep" : stryMutAct_9fa48("24111") ? false : stryMutAct_9fa48("24110") ? true : (stryCov_9fa48("24110", "24111", "24112"), action.kind === (stryMutAct_9fa48("24113") ? "" : (stryCov_9fa48("24113"), "keep"))))));
  }
}
export function shouldSkipKeepOutboundReceipt(actions: ReadonlyArray<KeepOutboundReceiptAction>): boolean {
  if (stryMutAct_9fa48("24114")) {
    {}
  } else {
    stryCov_9fa48("24114");
    return stryMutAct_9fa48("24115") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("24115"), actions.some(stryMutAct_9fa48("24116") ? () => undefined : (stryCov_9fa48("24116"), action => stryMutAct_9fa48("24119") ? action.kind !== "skip" : stryMutAct_9fa48("24118") ? false : stryMutAct_9fa48("24117") ? true : (stryCov_9fa48("24117", "24118", "24119"), action.kind === (stryMutAct_9fa48("24120") ? "" : (stryCov_9fa48("24120"), "skip"))))));
  }
}
export type PacketReceiptProofIngressPlan = "remove-receipt" | "continue";

/**
 * After `planProofIngressKind === "receipt"`: whether this receipt may be removed.
 * Identity recall + validateProofPacket stay at the adapter edge as booleans.
 */
export function planPacketReceiptProofIngress(input: {
  readonly truncatedHashMatches: boolean;
  readonly identityPresent: boolean;
  readonly proofAccepted: boolean;
}): PacketReceiptProofIngressPlan {
  if (stryMutAct_9fa48("24121")) {
    {}
  } else {
    stryCov_9fa48("24121");
    if (stryMutAct_9fa48("24124") ? input.truncatedHashMatches && input.identityPresent || input.proofAccepted : stryMutAct_9fa48("24123") ? false : stryMutAct_9fa48("24122") ? true : (stryCov_9fa48("24122", "24123", "24124"), (stryMutAct_9fa48("24126") ? input.truncatedHashMatches || input.identityPresent : stryMutAct_9fa48("24125") ? true : (stryCov_9fa48("24125", "24126"), input.truncatedHashMatches && input.identityPresent)) && input.proofAccepted)) {
      if (stryMutAct_9fa48("24127")) {
        {}
      } else {
        stryCov_9fa48("24127");
        return stryMutAct_9fa48("24128") ? "" : (stryCov_9fa48("24128"), "remove-receipt");
      }
    }
    return stryMutAct_9fa48("24129") ? "" : (stryCov_9fa48("24129"), "continue");
  }
}

/**
 * Packet-receipt proof ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPacketReceiptProofIngress` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPacketReceiptProofIngressWithActions}.
 */
export type PacketReceiptProofIngressPlanState = Record<string, never>;
export type PacketReceiptProofIngressPlanEvent = Event | {
  readonly kind: "receipt/proof-ingress-plan-gate";
  readonly truncatedHashMatches: boolean;
  readonly identityPresent: boolean;
  readonly proofAccepted: boolean;
};
export type PacketReceiptProofIngressPlanAction = {
  readonly kind: PacketReceiptProofIngressPlan;
};
export interface PacketReceiptProofIngressPlanStepResult {
  readonly state: PacketReceiptProofIngressPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofIngressPlanAction[];
}
export function initialPacketReceiptProofIngressPlanState(): PacketReceiptProofIngressPlanState {
  if (stryMutAct_9fa48("24130")) {
    {}
  } else {
    stryCov_9fa48("24130");
    return {};
  }
}
export function stepPacketReceiptProofIngressPlanWithActions(state: PacketReceiptProofIngressPlanState, event: PacketReceiptProofIngressPlanEvent): PacketReceiptProofIngressPlanStepResult {
  if (stryMutAct_9fa48("24131")) {
    {}
  } else {
    stryCov_9fa48("24131");
    if (stryMutAct_9fa48("24134") ? event.kind !== "receipt/proof-ingress-plan-gate" : stryMutAct_9fa48("24133") ? false : stryMutAct_9fa48("24132") ? true : (stryCov_9fa48("24132", "24133", "24134"), event.kind === (stryMutAct_9fa48("24135") ? "" : (stryCov_9fa48("24135"), "receipt/proof-ingress-plan-gate")))) {
      if (stryMutAct_9fa48("24136")) {
        {}
      } else {
        stryCov_9fa48("24136");
        return stryMutAct_9fa48("24137") ? {} : (stryCov_9fa48("24137"), {
          state,
          intents: stryMutAct_9fa48("24138") ? ["Stryker was here"] : (stryCov_9fa48("24138"), []),
          actions: stryMutAct_9fa48("24139") ? [] : (stryCov_9fa48("24139"), [stryMutAct_9fa48("24140") ? {} : (stryCov_9fa48("24140"), {
            kind: planPacketReceiptProofIngress(stryMutAct_9fa48("24141") ? {} : (stryCov_9fa48("24141"), {
              truncatedHashMatches: event.truncatedHashMatches,
              identityPresent: event.identityPresent,
              proofAccepted: event.proofAccepted
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("24142") ? {} : (stryCov_9fa48("24142"), {
      state,
      intents: stryMutAct_9fa48("24143") ? ["Stryker was here"] : (stryCov_9fa48("24143"), []),
      actions: stryMutAct_9fa48("24144") ? ["Stryker was here"] : (stryCov_9fa48("24144"), [])
    });
  }
}

/** Extract the packet-receipt proof ingress plan from actions; null when empty. */
export function packetReceiptProofIngressPlanFromActions(actions: ReadonlyArray<PacketReceiptProofIngressPlanAction>): PacketReceiptProofIngressPlan | null {
  if (stryMutAct_9fa48("24145")) {
    {}
  } else {
    stryCov_9fa48("24145");
    const action = actions[0];
    return stryMutAct_9fa48("24146") ? action?.kind && null : (stryCov_9fa48("24146"), (stryMutAct_9fa48("24147") ? action.kind : (stryCov_9fa48("24147"), action?.kind)) ?? null);
  }
}
export function shouldRemovePacketReceiptProofIngressPlan(actions: ReadonlyArray<PacketReceiptProofIngressPlanAction>): boolean {
  if (stryMutAct_9fa48("24148")) {
    {}
  } else {
    stryCov_9fa48("24148");
    return stryMutAct_9fa48("24149") ? actions.every(action => action.kind === "remove-receipt") : (stryCov_9fa48("24149"), actions.some(stryMutAct_9fa48("24150") ? () => undefined : (stryCov_9fa48("24150"), action => stryMutAct_9fa48("24153") ? action.kind !== "remove-receipt" : stryMutAct_9fa48("24152") ? false : stryMutAct_9fa48("24151") ? true : (stryCov_9fa48("24151", "24152", "24153"), action.kind === (stryMutAct_9fa48("24154") ? "" : (stryCov_9fa48("24154"), "remove-receipt"))))));
  }
}
export function shouldContinuePacketReceiptProofIngressPlan(actions: ReadonlyArray<PacketReceiptProofIngressPlanAction>): boolean {
  if (stryMutAct_9fa48("24155")) {
    {}
  } else {
    stryCov_9fa48("24155");
    return stryMutAct_9fa48("24156") ? actions.every(action => action.kind === "continue") : (stryCov_9fa48("24156"), actions.some(stryMutAct_9fa48("24157") ? () => undefined : (stryCov_9fa48("24157"), action => stryMutAct_9fa48("24160") ? action.kind !== "continue" : stryMutAct_9fa48("24159") ? false : stryMutAct_9fa48("24158") ? true : (stryCov_9fa48("24158", "24159", "24160"), action.kind === (stryMutAct_9fa48("24161") ? "" : (stryCov_9fa48("24161"), "continue"))))));
  }
}

/**
 * Unregister a packet receipt from the transport receipt list.
 * Splice stays at the adapter.
 */
export function planUnregisterPacketReceipt(index: number): number | null {
  if (stryMutAct_9fa48("24162")) {
    {}
  } else {
    stryCov_9fa48("24162");
    return (stryMutAct_9fa48("24166") ? index < 0 : stryMutAct_9fa48("24165") ? index > 0 : stryMutAct_9fa48("24164") ? false : stryMutAct_9fa48("24163") ? true : (stryCov_9fa48("24163", "24164", "24165", "24166"), index >= 0)) ? index : null;
  }
}

/** Whether unregister may splice after {@link planUnregisterPacketReceipt}. */
export function shouldUnregisterPacketReceipt(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("24167")) {
    {}
  } else {
    stryCov_9fa48("24167");
    return indexPresent;
  }
}

/**
 * Packet-receipt unregister plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPacketReceipt` reads beside the step). Nested under
 * {@link stepPacketReceiptUnregisterWithActions}.
 */
export type PacketReceiptUnregisterPlanState = Record<string, never>;
export type PacketReceiptUnregisterPlanEvent = Event | {
  readonly kind: "receipt/unregister-plan-gate";
  readonly index: number;
};
export type PacketReceiptUnregisterPlanAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface PacketReceiptUnregisterPlanStepResult {
  readonly state: PacketReceiptUnregisterPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptUnregisterPlanAction[];
}
export function initialPacketReceiptUnregisterPlanState(): PacketReceiptUnregisterPlanState {
  if (stryMutAct_9fa48("24168")) {
    {}
  } else {
    stryCov_9fa48("24168");
    return {};
  }
}
export function stepPacketReceiptUnregisterPlanWithActions(state: PacketReceiptUnregisterPlanState, event: PacketReceiptUnregisterPlanEvent): PacketReceiptUnregisterPlanStepResult {
  if (stryMutAct_9fa48("24169")) {
    {}
  } else {
    stryCov_9fa48("24169");
    if (stryMutAct_9fa48("24172") ? event.kind !== "receipt/unregister-plan-gate" : stryMutAct_9fa48("24171") ? false : stryMutAct_9fa48("24170") ? true : (stryCov_9fa48("24170", "24171", "24172"), event.kind === (stryMutAct_9fa48("24173") ? "" : (stryCov_9fa48("24173"), "receipt/unregister-plan-gate")))) {
      if (stryMutAct_9fa48("24174")) {
        {}
      } else {
        stryCov_9fa48("24174");
        const index = planUnregisterPacketReceipt(event.index);
        return stryMutAct_9fa48("24175") ? {} : (stryCov_9fa48("24175"), {
          state,
          intents: stryMutAct_9fa48("24176") ? ["Stryker was here"] : (stryCov_9fa48("24176"), []),
          actions: (stryMutAct_9fa48("24179") ? index !== null : stryMutAct_9fa48("24178") ? false : stryMutAct_9fa48("24177") ? true : (stryCov_9fa48("24177", "24178", "24179"), index === null)) ? stryMutAct_9fa48("24180") ? ["Stryker was here"] : (stryCov_9fa48("24180"), []) : stryMutAct_9fa48("24181") ? [] : (stryCov_9fa48("24181"), [stryMutAct_9fa48("24182") ? {} : (stryCov_9fa48("24182"), {
            kind: stryMutAct_9fa48("24183") ? "" : (stryCov_9fa48("24183"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("24184") ? {} : (stryCov_9fa48("24184"), {
      state,
      intents: stryMutAct_9fa48("24185") ? ["Stryker was here"] : (stryCov_9fa48("24185"), []),
      actions: stryMutAct_9fa48("24186") ? ["Stryker was here"] : (stryCov_9fa48("24186"), [])
    });
  }
}
export function packetReceiptUnregisterPlanIndex(actions: ReadonlyArray<PacketReceiptUnregisterPlanAction>): number | null {
  if (stryMutAct_9fa48("24187")) {
    {}
  } else {
    stryCov_9fa48("24187");
    const action = actions.find(stryMutAct_9fa48("24188") ? () => undefined : (stryCov_9fa48("24188"), entry => stryMutAct_9fa48("24191") ? entry.kind !== "remove" : stryMutAct_9fa48("24190") ? false : stryMutAct_9fa48("24189") ? true : (stryCov_9fa48("24189", "24190", "24191"), entry.kind === (stryMutAct_9fa48("24192") ? "" : (stryCov_9fa48("24192"), "remove")))));
    return (stryMutAct_9fa48("24195") ? action?.kind !== "remove" : stryMutAct_9fa48("24194") ? false : stryMutAct_9fa48("24193") ? true : (stryCov_9fa48("24193", "24194", "24195"), (stryMutAct_9fa48("24196") ? action.kind : (stryCov_9fa48("24196"), action?.kind)) === (stryMutAct_9fa48("24197") ? "" : (stryCov_9fa48("24197"), "remove")))) ? action.index : null;
  }
}
export function shouldRemovePacketReceiptUnregisterPlan(actions: ReadonlyArray<PacketReceiptUnregisterPlanAction>): boolean {
  if (stryMutAct_9fa48("24198")) {
    {}
  } else {
    stryCov_9fa48("24198");
    return stryMutAct_9fa48("24199") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("24199"), actions.some(stryMutAct_9fa48("24200") ? () => undefined : (stryCov_9fa48("24200"), action => stryMutAct_9fa48("24203") ? action.kind !== "remove" : stryMutAct_9fa48("24202") ? false : stryMutAct_9fa48("24201") ? true : (stryCov_9fa48("24201", "24202", "24203"), action.kind === (stryMutAct_9fa48("24204") ? "" : (stryCov_9fa48("24204"), "remove"))))));
  }
}

/**
 * Packet-receipt unregister is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `planUnregisterPacketReceipt` reads beside the step).
 * Plan nested via {@link stepPacketReceiptUnregisterPlanWithActions} (`remove`).
 */
export type PacketReceiptUnregisterState = Record<string, never>;
export type PacketReceiptUnregisterEvent = Event | {
  readonly kind: "receipt/unregister-gate";
  readonly index: number;
};
export type PacketReceiptUnregisterAction = {
  readonly kind: "remove";
  readonly index: number;
};
export interface PacketReceiptUnregisterStepResult {
  readonly state: PacketReceiptUnregisterState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptUnregisterAction[];
}
export function initialPacketReceiptUnregisterState(): PacketReceiptUnregisterState {
  if (stryMutAct_9fa48("24205")) {
    {}
  } else {
    stryCov_9fa48("24205");
    return {};
  }
}
export function stepPacketReceiptUnregisterWithActions(state: PacketReceiptUnregisterState, event: PacketReceiptUnregisterEvent): PacketReceiptUnregisterStepResult {
  if (stryMutAct_9fa48("24206")) {
    {}
  } else {
    stryCov_9fa48("24206");
    if (stryMutAct_9fa48("24209") ? event.kind !== "receipt/unregister-gate" : stryMutAct_9fa48("24208") ? false : stryMutAct_9fa48("24207") ? true : (stryCov_9fa48("24207", "24208", "24209"), event.kind === (stryMutAct_9fa48("24210") ? "" : (stryCov_9fa48("24210"), "receipt/unregister-gate")))) {
      if (stryMutAct_9fa48("24211")) {
        {}
      } else {
        stryCov_9fa48("24211");
        const planActions = stepPacketReceiptUnregisterPlanWithActions(initialPacketReceiptUnregisterPlanState(), stryMutAct_9fa48("24212") ? {} : (stryCov_9fa48("24212"), {
          kind: stryMutAct_9fa48("24213") ? "" : (stryCov_9fa48("24213"), "receipt/unregister-plan-gate"),
          index: event.index
        })).actions;
        const index = packetReceiptUnregisterPlanIndex(planActions);
        return stryMutAct_9fa48("24214") ? {} : (stryCov_9fa48("24214"), {
          state,
          intents: stryMutAct_9fa48("24215") ? ["Stryker was here"] : (stryCov_9fa48("24215"), []),
          actions: (stryMutAct_9fa48("24218") ? index !== null : stryMutAct_9fa48("24217") ? false : stryMutAct_9fa48("24216") ? true : (stryCov_9fa48("24216", "24217", "24218"), index === null)) ? stryMutAct_9fa48("24219") ? ["Stryker was here"] : (stryCov_9fa48("24219"), []) : stryMutAct_9fa48("24220") ? [] : (stryCov_9fa48("24220"), [stryMutAct_9fa48("24221") ? {} : (stryCov_9fa48("24221"), {
            kind: stryMutAct_9fa48("24222") ? "" : (stryCov_9fa48("24222"), "remove"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("24223") ? {} : (stryCov_9fa48("24223"), {
      state,
      intents: stryMutAct_9fa48("24224") ? ["Stryker was here"] : (stryCov_9fa48("24224"), []),
      actions: stryMutAct_9fa48("24225") ? ["Stryker was here"] : (stryCov_9fa48("24225"), [])
    });
  }
}
export function packetReceiptUnregisterIndex(actions: ReadonlyArray<PacketReceiptUnregisterAction>): number | null {
  if (stryMutAct_9fa48("24226")) {
    {}
  } else {
    stryCov_9fa48("24226");
    const action = actions.find(stryMutAct_9fa48("24227") ? () => undefined : (stryCov_9fa48("24227"), entry => stryMutAct_9fa48("24230") ? entry.kind !== "remove" : stryMutAct_9fa48("24229") ? false : stryMutAct_9fa48("24228") ? true : (stryCov_9fa48("24228", "24229", "24230"), entry.kind === (stryMutAct_9fa48("24231") ? "" : (stryCov_9fa48("24231"), "remove")))));
    return (stryMutAct_9fa48("24234") ? action?.kind !== "remove" : stryMutAct_9fa48("24233") ? false : stryMutAct_9fa48("24232") ? true : (stryCov_9fa48("24232", "24233", "24234"), (stryMutAct_9fa48("24235") ? action.kind : (stryCov_9fa48("24235"), action?.kind)) === (stryMutAct_9fa48("24236") ? "" : (stryCov_9fa48("24236"), "remove")))) ? action.index : null;
  }
}
export function shouldRemovePacketReceipt(actions: ReadonlyArray<PacketReceiptUnregisterAction>): boolean {
  if (stryMutAct_9fa48("24237")) {
    {}
  } else {
    stryCov_9fa48("24237");
    return stryMutAct_9fa48("24238") ? actions.every(action => action.kind === "remove") : (stryCov_9fa48("24238"), actions.some(stryMutAct_9fa48("24239") ? () => undefined : (stryCov_9fa48("24239"), action => stryMutAct_9fa48("24242") ? action.kind !== "remove" : stryMutAct_9fa48("24241") ? false : stryMutAct_9fa48("24240") ? true : (stryCov_9fa48("24240", "24241", "24242"), action.kind === (stryMutAct_9fa48("24243") ? "" : (stryCov_9fa48("24243"), "remove"))))));
  }
}

/** Whether an outbound send should create and register a packet receipt. */
export function shouldRegisterPacketReceipt(createReceipt: boolean): boolean {
  if (stryMutAct_9fa48("24244")) {
    {}
  } else {
    stryCov_9fa48("24244");
    return createReceipt;
  }
}

/**
 * Packet-receipt register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldRegisterPacketReceipt` reads beside the step).
 */
export type RegisterPacketReceiptState = Record<string, never>;
export type RegisterPacketReceiptEvent = Event | {
  readonly kind: "receipt/register-gate";
  readonly createReceipt: boolean;
};
export type RegisterPacketReceiptAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface RegisterPacketReceiptStepResult {
  readonly state: RegisterPacketReceiptState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterPacketReceiptAction[];
}
export function initialRegisterPacketReceiptState(): RegisterPacketReceiptState {
  if (stryMutAct_9fa48("24245")) {
    {}
  } else {
    stryCov_9fa48("24245");
    return {};
  }
}
export function stepRegisterPacketReceiptWithActions(state: RegisterPacketReceiptState, event: RegisterPacketReceiptEvent): RegisterPacketReceiptStepResult {
  if (stryMutAct_9fa48("24246")) {
    {}
  } else {
    stryCov_9fa48("24246");
    if (stryMutAct_9fa48("24249") ? event.kind !== "receipt/register-gate" : stryMutAct_9fa48("24248") ? false : stryMutAct_9fa48("24247") ? true : (stryCov_9fa48("24247", "24248", "24249"), event.kind === (stryMutAct_9fa48("24250") ? "" : (stryCov_9fa48("24250"), "receipt/register-gate")))) {
      if (stryMutAct_9fa48("24251")) {
        {}
      } else {
        stryCov_9fa48("24251");
        return stryMutAct_9fa48("24252") ? {} : (stryCov_9fa48("24252"), {
          state,
          intents: stryMutAct_9fa48("24253") ? ["Stryker was here"] : (stryCov_9fa48("24253"), []),
          actions: stryMutAct_9fa48("24254") ? [] : (stryCov_9fa48("24254"), [stryMutAct_9fa48("24255") ? {} : (stryCov_9fa48("24255"), {
            kind: shouldRegisterPacketReceipt(event.createReceipt) ? stryMutAct_9fa48("24256") ? "" : (stryCov_9fa48("24256"), "register") : stryMutAct_9fa48("24257") ? "" : (stryCov_9fa48("24257"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24258") ? {} : (stryCov_9fa48("24258"), {
      state,
      intents: stryMutAct_9fa48("24259") ? ["Stryker was here"] : (stryCov_9fa48("24259"), []),
      actions: stryMutAct_9fa48("24260") ? ["Stryker was here"] : (stryCov_9fa48("24260"), [])
    });
  }
}
export function shouldRegisterPacketReceiptNow(actions: ReadonlyArray<RegisterPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("24261")) {
    {}
  } else {
    stryCov_9fa48("24261");
    return stryMutAct_9fa48("24262") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("24262"), actions.some(stryMutAct_9fa48("24263") ? () => undefined : (stryCov_9fa48("24263"), action => stryMutAct_9fa48("24266") ? action.kind !== "register" : stryMutAct_9fa48("24265") ? false : stryMutAct_9fa48("24264") ? true : (stryCov_9fa48("24264", "24265", "24266"), action.kind === (stryMutAct_9fa48("24267") ? "" : (stryCov_9fa48("24267"), "register"))))));
  }
}
export function shouldSkipRegisterPacketReceipt(actions: ReadonlyArray<RegisterPacketReceiptAction>): boolean {
  if (stryMutAct_9fa48("24268")) {
    {}
  } else {
    stryCov_9fa48("24268");
    return stryMutAct_9fa48("24269") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("24269"), actions.some(stryMutAct_9fa48("24270") ? () => undefined : (stryCov_9fa48("24270"), action => stryMutAct_9fa48("24273") ? action.kind !== "skip" : stryMutAct_9fa48("24272") ? false : stryMutAct_9fa48("24271") ? true : (stryCov_9fa48("24271", "24272", "24273"), action.kind === (stryMutAct_9fa48("24274") ? "" : (stryCov_9fa48("24274"), "skip"))))));
  }
}
export type PacketReceiptCallbackPlan = "clear" | "set";

/** Whether a packet-receipt timeout/delivery callback should be cleared or assigned. */
export function planPacketReceiptCallback(callbackPresent: boolean): PacketReceiptCallbackPlan {
  if (stryMutAct_9fa48("24275")) {
    {}
  } else {
    stryCov_9fa48("24275");
    return callbackPresent ? stryMutAct_9fa48("24276") ? "" : (stryCov_9fa48("24276"), "set") : stryMutAct_9fa48("24277") ? "" : (stryCov_9fa48("24277"), "clear");
  }
}
export type PacketReceiptCallbackPlanEvent = Event | {
  readonly kind: "receipt/callback-plan-gate";
  readonly callbackPresent: boolean;
};
export type PacketReceiptCallbackPlanAction = {
  readonly kind: PacketReceiptCallbackPlan;
};

/** Extract the packet-receipt callback plan from actions; null when empty. */
export function packetReceiptCallbackPlanFromActions(actions: ReadonlyArray<PacketReceiptCallbackPlanAction>): PacketReceiptCallbackPlan | null {
  if (stryMutAct_9fa48("24278")) {
    {}
  } else {
    stryCov_9fa48("24278");
    const action = actions[0];
    return stryMutAct_9fa48("24279") ? action?.kind && null : (stryCov_9fa48("24279"), (stryMutAct_9fa48("24280") ? action.kind : (stryCov_9fa48("24280"), action?.kind)) ?? null);
  }
}
export type PacketReceiptCallbackEvent = Event | {
  readonly kind: "receipt/callback-gate";
  readonly callbackPresent: boolean;
};
export type PacketReceiptCallbackAction = {
  readonly kind: "clear";
} | {
  readonly kind: "set";
};

/**
 * Packet-receipt proof ingress is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPacketReceiptProofIngressPlanWithActions}
 * (`remove-receipt`|`continue`).
 */
export type PacketReceiptProofIngressState = Record<string, never>;
export type PacketReceiptProofIngressEvent = Event | {
  readonly kind: "receipt/proof-ingress-gate";
  readonly truncatedHashMatches: boolean;
  readonly identityPresent: boolean;
  readonly proofAccepted: boolean;
};
export type PacketReceiptProofIngressAction = {
  readonly kind: PacketReceiptProofIngressPlan;
};
export interface PacketReceiptProofIngressStepResult {
  readonly state: PacketReceiptProofIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PacketReceiptProofIngressAction[];
}
export function stepPacketReceiptProofIngressWithActions(state: PacketReceiptProofIngressState, event: PacketReceiptProofIngressEvent): PacketReceiptProofIngressStepResult {
  if (stryMutAct_9fa48("24281")) {
    {}
  } else {
    stryCov_9fa48("24281");
    return stepPacketReceiptProofIngressInner(state, event);
  }
}
export function stepPacketReceiptProofIngressInner(state: PacketReceiptProofIngressState, event: PacketReceiptProofIngressEvent): PacketReceiptProofIngressStepResult {
  if (stryMutAct_9fa48("24282")) {
    {}
  } else {
    stryCov_9fa48("24282");
    if (stryMutAct_9fa48("24285") ? event.kind !== "receipt/proof-ingress-gate" : stryMutAct_9fa48("24284") ? false : stryMutAct_9fa48("24283") ? true : (stryCov_9fa48("24283", "24284", "24285"), event.kind === (stryMutAct_9fa48("24286") ? "" : (stryCov_9fa48("24286"), "receipt/proof-ingress-gate")))) {
      if (stryMutAct_9fa48("24287")) {
        {}
      } else {
        stryCov_9fa48("24287");
        const planActions = stepPacketReceiptProofIngressPlanWithActions(initialPacketReceiptProofIngressPlanState(), stryMutAct_9fa48("24288") ? {} : (stryCov_9fa48("24288"), {
          kind: stryMutAct_9fa48("24289") ? "" : (stryCov_9fa48("24289"), "receipt/proof-ingress-plan-gate"),
          truncatedHashMatches: event.truncatedHashMatches,
          identityPresent: event.identityPresent,
          proofAccepted: event.proofAccepted
        })).actions;
        const plan = packetReceiptProofIngressPlanFromActions(planActions);
        if (stryMutAct_9fa48("24292") ? plan !== null : stryMutAct_9fa48("24291") ? false : stryMutAct_9fa48("24290") ? true : (stryCov_9fa48("24290", "24291", "24292"), plan === null)) {
          if (stryMutAct_9fa48("24293")) {
            {}
          } else {
            stryCov_9fa48("24293");
            return stryMutAct_9fa48("24294") ? {} : (stryCov_9fa48("24294"), {
              state,
              intents: stryMutAct_9fa48("24295") ? ["Stryker was here"] : (stryCov_9fa48("24295"), []),
              actions: stryMutAct_9fa48("24296") ? ["Stryker was here"] : (stryCov_9fa48("24296"), [])
            });
          }
        }
        return stryMutAct_9fa48("24297") ? {} : (stryCov_9fa48("24297"), {
          state,
          intents: stryMutAct_9fa48("24298") ? ["Stryker was here"] : (stryCov_9fa48("24298"), []),
          actions: stryMutAct_9fa48("24299") ? [] : (stryCov_9fa48("24299"), [stryMutAct_9fa48("24300") ? {} : (stryCov_9fa48("24300"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("24301") ? {} : (stryCov_9fa48("24301"), {
      state,
      intents: stryMutAct_9fa48("24302") ? ["Stryker was here"] : (stryCov_9fa48("24302"), []),
      actions: stryMutAct_9fa48("24303") ? ["Stryker was here"] : (stryCov_9fa48("24303"), [])
    });
  }
}