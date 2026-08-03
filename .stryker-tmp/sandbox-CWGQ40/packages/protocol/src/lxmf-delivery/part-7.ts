/** Extracted from lxmf-delivery.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure LXMF delivery method / representation planning.
 * Encryption and hashing stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLxmfDelivery` /
 * `canAcceptLxmfPropagationLocalDelivery` /
 * `canUnpackLxmfPropagationLocalIngress` /
 * `shouldAwaitLxmfDeliveryReceipt` / `shouldInvokeLxmfDeliveryCallback`
 * reads beside the step).
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
import { LxmfUnverifiedReason, type LxmfUnverifiedReasonValue } from "../lxmf-fields.js";
import { LxmfDeliveryMethod } from "./part-1.js";
import { shouldAwaitLxmfDeliveryReceipt } from "./part-6.js";
import type { AwaitLxmfDeliveryReceiptAction, AwaitLxmfDeliveryReceiptEvent, AwaitLxmfDeliveryReceiptState, AwaitLxmfDeliveryReceiptStepResult } from "./part-6.js";
export function stepAwaitLxmfDeliveryReceiptWithActions(state: AwaitLxmfDeliveryReceiptState, event: AwaitLxmfDeliveryReceiptEvent): AwaitLxmfDeliveryReceiptStepResult {
  if (stryMutAct_9fa48("20603")) {
    {}
  } else {
    stryCov_9fa48("20603");
    if (stryMutAct_9fa48("20606") ? event.kind !== "lxmf/await-delivery-receipt-gate" : stryMutAct_9fa48("20605") ? false : stryMutAct_9fa48("20604") ? true : (stryCov_9fa48("20604", "20605", "20606"), event.kind === (stryMutAct_9fa48("20607") ? "" : (stryCov_9fa48("20607"), "lxmf/await-delivery-receipt-gate")))) {
      if (stryMutAct_9fa48("20608")) {
        {}
      } else {
        stryCov_9fa48("20608");
        return stryMutAct_9fa48("20609") ? {} : (stryCov_9fa48("20609"), {
          state,
          intents: stryMutAct_9fa48("20610") ? ["Stryker was here"] : (stryCov_9fa48("20610"), []),
          actions: stryMutAct_9fa48("20611") ? [] : (stryCov_9fa48("20611"), [stryMutAct_9fa48("20612") ? {} : (stryCov_9fa48("20612"), {
            kind: shouldAwaitLxmfDeliveryReceipt(event.receiptPresent) ? stryMutAct_9fa48("20613") ? "" : (stryCov_9fa48("20613"), "await") : stryMutAct_9fa48("20614") ? "" : (stryCov_9fa48("20614"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20615") ? {} : (stryCov_9fa48("20615"), {
      state,
      intents: stryMutAct_9fa48("20616") ? ["Stryker was here"] : (stryCov_9fa48("20616"), []),
      actions: stryMutAct_9fa48("20617") ? ["Stryker was here"] : (stryCov_9fa48("20617"), [])
    });
  }
}
export function shouldAwaitLxmfDeliveryReceiptNow(actions: ReadonlyArray<AwaitLxmfDeliveryReceiptAction>): boolean {
  if (stryMutAct_9fa48("20618")) {
    {}
  } else {
    stryCov_9fa48("20618");
    return stryMutAct_9fa48("20619") ? actions.every(action => action.kind === "await") : (stryCov_9fa48("20619"), actions.some(stryMutAct_9fa48("20620") ? () => undefined : (stryCov_9fa48("20620"), action => stryMutAct_9fa48("20623") ? action.kind !== "await" : stryMutAct_9fa48("20622") ? false : stryMutAct_9fa48("20621") ? true : (stryCov_9fa48("20621", "20622", "20623"), action.kind === (stryMutAct_9fa48("20624") ? "" : (stryCov_9fa48("20624"), "await"))))));
  }
}
export function shouldSkipAwaitLxmfDeliveryReceipt(actions: ReadonlyArray<AwaitLxmfDeliveryReceiptAction>): boolean {
  if (stryMutAct_9fa48("20625")) {
    {}
  } else {
    stryCov_9fa48("20625");
    return stryMutAct_9fa48("20626") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("20626"), actions.some(stryMutAct_9fa48("20627") ? () => undefined : (stryCov_9fa48("20627"), action => stryMutAct_9fa48("20630") ? action.kind !== "skip" : stryMutAct_9fa48("20629") ? false : stryMutAct_9fa48("20628") ? true : (stryCov_9fa48("20628", "20629", "20630"), action.kind === (stryMutAct_9fa48("20631") ? "" : (stryCov_9fa48("20631"), "skip"))))));
  }
}

/** Whether an unpacked deliverable should invoke the delivery callback. */
export function shouldInvokeLxmfDeliveryCallback(messagePresent: boolean): boolean {
  if (stryMutAct_9fa48("20632")) {
    {}
  } else {
    stryCov_9fa48("20632");
    return messagePresent;
  }
}

/**
 * LXMF delivery-callback invoke gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldInvokeLxmfDeliveryCallback` reads beside the step).
 */
export type InvokeLxmfDeliveryCallbackState = Record<string, never>;
export type InvokeLxmfDeliveryCallbackEvent = Event | {
  readonly kind: "lxmf/invoke-delivery-callback-gate";
  readonly messagePresent: boolean;
};
export type InvokeLxmfDeliveryCallbackAction = {
  readonly kind: "invoke";
} | {
  readonly kind: "skip";
};
export interface InvokeLxmfDeliveryCallbackStepResult {
  readonly state: InvokeLxmfDeliveryCallbackState;
  readonly intents: readonly Intent[];
  readonly actions: readonly InvokeLxmfDeliveryCallbackAction[];
}
export function initialInvokeLxmfDeliveryCallbackState(): InvokeLxmfDeliveryCallbackState {
  if (stryMutAct_9fa48("20633")) {
    {}
  } else {
    stryCov_9fa48("20633");
    return {};
  }
}
export function stepInvokeLxmfDeliveryCallbackWithActions(state: InvokeLxmfDeliveryCallbackState, event: InvokeLxmfDeliveryCallbackEvent): InvokeLxmfDeliveryCallbackStepResult {
  if (stryMutAct_9fa48("20634")) {
    {}
  } else {
    stryCov_9fa48("20634");
    if (stryMutAct_9fa48("20637") ? event.kind !== "lxmf/invoke-delivery-callback-gate" : stryMutAct_9fa48("20636") ? false : stryMutAct_9fa48("20635") ? true : (stryCov_9fa48("20635", "20636", "20637"), event.kind === (stryMutAct_9fa48("20638") ? "" : (stryCov_9fa48("20638"), "lxmf/invoke-delivery-callback-gate")))) {
      if (stryMutAct_9fa48("20639")) {
        {}
      } else {
        stryCov_9fa48("20639");
        return stryMutAct_9fa48("20640") ? {} : (stryCov_9fa48("20640"), {
          state,
          intents: stryMutAct_9fa48("20641") ? ["Stryker was here"] : (stryCov_9fa48("20641"), []),
          actions: stryMutAct_9fa48("20642") ? [] : (stryCov_9fa48("20642"), [stryMutAct_9fa48("20643") ? {} : (stryCov_9fa48("20643"), {
            kind: shouldInvokeLxmfDeliveryCallback(event.messagePresent) ? stryMutAct_9fa48("20644") ? "" : (stryCov_9fa48("20644"), "invoke") : stryMutAct_9fa48("20645") ? "" : (stryCov_9fa48("20645"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20646") ? {} : (stryCov_9fa48("20646"), {
      state,
      intents: stryMutAct_9fa48("20647") ? ["Stryker was here"] : (stryCov_9fa48("20647"), []),
      actions: stryMutAct_9fa48("20648") ? ["Stryker was here"] : (stryCov_9fa48("20648"), [])
    });
  }
}
export function shouldInvokeLxmfDeliveryCallbackNow(actions: ReadonlyArray<InvokeLxmfDeliveryCallbackAction>): boolean {
  if (stryMutAct_9fa48("20649")) {
    {}
  } else {
    stryCov_9fa48("20649");
    return stryMutAct_9fa48("20650") ? actions.every(action => action.kind === "invoke") : (stryCov_9fa48("20650"), actions.some(stryMutAct_9fa48("20651") ? () => undefined : (stryCov_9fa48("20651"), action => stryMutAct_9fa48("20654") ? action.kind !== "invoke" : stryMutAct_9fa48("20653") ? false : stryMutAct_9fa48("20652") ? true : (stryCov_9fa48("20652", "20653", "20654"), action.kind === (stryMutAct_9fa48("20655") ? "" : (stryCov_9fa48("20655"), "invoke"))))));
  }
}
export function shouldSkipInvokeLxmfDeliveryCallback(actions: ReadonlyArray<InvokeLxmfDeliveryCallbackAction>): boolean {
  if (stryMutAct_9fa48("20656")) {
    {}
  } else {
    stryCov_9fa48("20656");
    return stryMutAct_9fa48("20657") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("20657"), actions.some(stryMutAct_9fa48("20658") ? () => undefined : (stryCov_9fa48("20658"), action => stryMutAct_9fa48("20661") ? action.kind !== "skip" : stryMutAct_9fa48("20660") ? false : stryMutAct_9fa48("20659") ? true : (stryCov_9fa48("20659", "20660", "20661"), action.kind === (stryMutAct_9fa48("20662") ? "" : (stryCov_9fa48("20662"), "skip"))))));
  }
}

/** LXMFRouter.send method dispatch after packed-envelope check. */
export type LxmfSendMethodPlan = "opportunistic" | "direct" | "propagated" | "reject-unpacked" | "reject-unsupported";
export function planLxmfSendMethod(input: {
  readonly packed: boolean;
  readonly method: number;
}): LxmfSendMethodPlan {
  if (stryMutAct_9fa48("20663")) {
    {}
  } else {
    stryCov_9fa48("20663");
    if (stryMutAct_9fa48("20666") ? false : stryMutAct_9fa48("20665") ? true : stryMutAct_9fa48("20664") ? input.packed : (stryCov_9fa48("20664", "20665", "20666"), !input.packed)) {
      if (stryMutAct_9fa48("20667")) {
        {}
      } else {
        stryCov_9fa48("20667");
        return stryMutAct_9fa48("20668") ? "" : (stryCov_9fa48("20668"), "reject-unpacked");
      }
    }
    if (stryMutAct_9fa48("20671") ? input.method !== LxmfDeliveryMethod.OPPORTUNISTIC : stryMutAct_9fa48("20670") ? false : stryMutAct_9fa48("20669") ? true : (stryCov_9fa48("20669", "20670", "20671"), input.method === LxmfDeliveryMethod.OPPORTUNISTIC)) {
      if (stryMutAct_9fa48("20672")) {
        {}
      } else {
        stryCov_9fa48("20672");
        return stryMutAct_9fa48("20673") ? "" : (stryCov_9fa48("20673"), "opportunistic");
      }
    }
    if (stryMutAct_9fa48("20676") ? input.method !== LxmfDeliveryMethod.DIRECT : stryMutAct_9fa48("20675") ? false : stryMutAct_9fa48("20674") ? true : (stryCov_9fa48("20674", "20675", "20676"), input.method === LxmfDeliveryMethod.DIRECT)) {
      if (stryMutAct_9fa48("20677")) {
        {}
      } else {
        stryCov_9fa48("20677");
        return stryMutAct_9fa48("20678") ? "" : (stryCov_9fa48("20678"), "direct");
      }
    }
    if (stryMutAct_9fa48("20681") ? input.method !== LxmfDeliveryMethod.PROPAGATED : stryMutAct_9fa48("20680") ? false : stryMutAct_9fa48("20679") ? true : (stryCov_9fa48("20679", "20680", "20681"), input.method === LxmfDeliveryMethod.PROPAGATED)) {
      if (stryMutAct_9fa48("20682")) {
        {}
      } else {
        stryCov_9fa48("20682");
        return stryMutAct_9fa48("20683") ? "" : (stryCov_9fa48("20683"), "propagated");
      }
    }
    return stryMutAct_9fa48("20684") ? "" : (stryCov_9fa48("20684"), "reject-unsupported");
  }
}

/**
 * Send-method-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfSendMethod` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfSendMethodWithActions}.
 */
export type LxmfSendMethodPlanState = Record<string, never>;
export type LxmfSendMethodPlanEvent = Event | {
  readonly kind: "send/plan-gate";
  readonly packed: boolean;
  readonly method: number;
};
export type LxmfSendMethodPlanAction = {
  readonly kind: "opportunistic";
} | {
  readonly kind: "direct";
} | {
  readonly kind: "propagated";
} | {
  readonly kind: "reject-unpacked";
} | {
  readonly kind: "reject-unsupported";
};
export interface LxmfSendMethodPlanStepResult {
  readonly state: LxmfSendMethodPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSendMethodPlanAction[];
}
export function initialLxmfSendMethodPlanState(): LxmfSendMethodPlanState {
  if (stryMutAct_9fa48("20685")) {
    {}
  } else {
    stryCov_9fa48("20685");
    return {};
  }
}
export function stepLxmfSendMethodPlanWithActions(state: LxmfSendMethodPlanState, event: LxmfSendMethodPlanEvent): LxmfSendMethodPlanStepResult {
  if (stryMutAct_9fa48("20686")) {
    {}
  } else {
    stryCov_9fa48("20686");
    if (stryMutAct_9fa48("20689") ? event.kind !== "send/plan-gate" : stryMutAct_9fa48("20688") ? false : stryMutAct_9fa48("20687") ? true : (stryCov_9fa48("20687", "20688", "20689"), event.kind === (stryMutAct_9fa48("20690") ? "" : (stryCov_9fa48("20690"), "send/plan-gate")))) {
      if (stryMutAct_9fa48("20691")) {
        {}
      } else {
        stryCov_9fa48("20691");
        return stryMutAct_9fa48("20692") ? {} : (stryCov_9fa48("20692"), {
          state,
          intents: stryMutAct_9fa48("20693") ? ["Stryker was here"] : (stryCov_9fa48("20693"), []),
          actions: stryMutAct_9fa48("20694") ? [] : (stryCov_9fa48("20694"), [stryMutAct_9fa48("20695") ? {} : (stryCov_9fa48("20695"), {
            kind: planLxmfSendMethod(stryMutAct_9fa48("20696") ? {} : (stryCov_9fa48("20696"), {
              packed: event.packed,
              method: event.method
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("20697") ? {} : (stryCov_9fa48("20697"), {
      state,
      intents: stryMutAct_9fa48("20698") ? ["Stryker was here"] : (stryCov_9fa48("20698"), []),
      actions: stryMutAct_9fa48("20699") ? ["Stryker was here"] : (stryCov_9fa48("20699"), [])
    });
  }
}

/** Whether plan actions reject an unpacked send. */
export function shouldRejectLxmfSendMethodPlanUnpacked(actions: ReadonlyArray<LxmfSendMethodPlanAction>): boolean {
  if (stryMutAct_9fa48("20700")) {
    {}
  } else {
    stryCov_9fa48("20700");
    return stryMutAct_9fa48("20701") ? actions.every(action => action.kind === "reject-unpacked") : (stryCov_9fa48("20701"), actions.some(stryMutAct_9fa48("20702") ? () => undefined : (stryCov_9fa48("20702"), action => stryMutAct_9fa48("20705") ? action.kind !== "reject-unpacked" : stryMutAct_9fa48("20704") ? false : stryMutAct_9fa48("20703") ? true : (stryCov_9fa48("20703", "20704", "20705"), action.kind === (stryMutAct_9fa48("20706") ? "" : (stryCov_9fa48("20706"), "reject-unpacked"))))));
  }
}

/** Whether plan actions select opportunistic send. */
export function shouldPlanLxmfSendMethodOpportunistic(actions: ReadonlyArray<LxmfSendMethodPlanAction>): boolean {
  if (stryMutAct_9fa48("20707")) {
    {}
  } else {
    stryCov_9fa48("20707");
    return stryMutAct_9fa48("20708") ? actions.every(action => action.kind === "opportunistic") : (stryCov_9fa48("20708"), actions.some(stryMutAct_9fa48("20709") ? () => undefined : (stryCov_9fa48("20709"), action => stryMutAct_9fa48("20712") ? action.kind !== "opportunistic" : stryMutAct_9fa48("20711") ? false : stryMutAct_9fa48("20710") ? true : (stryCov_9fa48("20710", "20711", "20712"), action.kind === (stryMutAct_9fa48("20713") ? "" : (stryCov_9fa48("20713"), "opportunistic"))))));
  }
}

/** Whether plan actions select direct send. */
export function shouldPlanLxmfSendMethodDirect(actions: ReadonlyArray<LxmfSendMethodPlanAction>): boolean {
  if (stryMutAct_9fa48("20714")) {
    {}
  } else {
    stryCov_9fa48("20714");
    return stryMutAct_9fa48("20715") ? actions.every(action => action.kind === "direct") : (stryCov_9fa48("20715"), actions.some(stryMutAct_9fa48("20716") ? () => undefined : (stryCov_9fa48("20716"), action => stryMutAct_9fa48("20719") ? action.kind !== "direct" : stryMutAct_9fa48("20718") ? false : stryMutAct_9fa48("20717") ? true : (stryCov_9fa48("20717", "20718", "20719"), action.kind === (stryMutAct_9fa48("20720") ? "" : (stryCov_9fa48("20720"), "direct"))))));
  }
}

/** Whether plan actions select propagated send. */
export function shouldPlanLxmfSendMethodPropagated(actions: ReadonlyArray<LxmfSendMethodPlanAction>): boolean {
  if (stryMutAct_9fa48("20721")) {
    {}
  } else {
    stryCov_9fa48("20721");
    return stryMutAct_9fa48("20722") ? actions.every(action => action.kind === "propagated") : (stryCov_9fa48("20722"), actions.some(stryMutAct_9fa48("20723") ? () => undefined : (stryCov_9fa48("20723"), action => stryMutAct_9fa48("20726") ? action.kind !== "propagated" : stryMutAct_9fa48("20725") ? false : stryMutAct_9fa48("20724") ? true : (stryCov_9fa48("20724", "20725", "20726"), action.kind === (stryMutAct_9fa48("20727") ? "" : (stryCov_9fa48("20727"), "propagated"))))));
  }
}

/** Whether plan actions reject an unsupported delivery method. */
export function shouldRejectLxmfSendMethodPlanUnsupported(actions: ReadonlyArray<LxmfSendMethodPlanAction>): boolean {
  if (stryMutAct_9fa48("20728")) {
    {}
  } else {
    stryCov_9fa48("20728");
    return stryMutAct_9fa48("20729") ? actions.every(action => action.kind === "reject-unsupported") : (stryCov_9fa48("20729"), actions.some(stryMutAct_9fa48("20730") ? () => undefined : (stryCov_9fa48("20730"), action => stryMutAct_9fa48("20733") ? action.kind !== "reject-unsupported" : stryMutAct_9fa48("20732") ? false : stryMutAct_9fa48("20731") ? true : (stryCov_9fa48("20731", "20732", "20733"), action.kind === (stryMutAct_9fa48("20734") ? "" : (stryCov_9fa48("20734"), "reject-unsupported"))))));
  }
}

/** Extract the send-method plan from actions; null when empty. */
export function lxmfSendMethodPlanFromActions(actions: ReadonlyArray<LxmfSendMethodPlanAction>): LxmfSendMethodPlan | null {
  if (stryMutAct_9fa48("20735")) {
    {}
  } else {
    stryCov_9fa48("20735");
    const action = actions.find(stryMutAct_9fa48("20736") ? () => undefined : (stryCov_9fa48("20736"), entry => stryMutAct_9fa48("20739") ? (entry.kind === "opportunistic" || entry.kind === "direct" || entry.kind === "propagated" || entry.kind === "reject-unpacked") && entry.kind === "reject-unsupported" : stryMutAct_9fa48("20738") ? false : stryMutAct_9fa48("20737") ? true : (stryCov_9fa48("20737", "20738", "20739"), (stryMutAct_9fa48("20741") ? (entry.kind === "opportunistic" || entry.kind === "direct" || entry.kind === "propagated") && entry.kind === "reject-unpacked" : stryMutAct_9fa48("20740") ? false : (stryCov_9fa48("20740", "20741"), (stryMutAct_9fa48("20743") ? (entry.kind === "opportunistic" || entry.kind === "direct") && entry.kind === "propagated" : stryMutAct_9fa48("20742") ? false : (stryCov_9fa48("20742", "20743"), (stryMutAct_9fa48("20745") ? entry.kind === "opportunistic" && entry.kind === "direct" : stryMutAct_9fa48("20744") ? false : (stryCov_9fa48("20744", "20745"), (stryMutAct_9fa48("20747") ? entry.kind !== "opportunistic" : stryMutAct_9fa48("20746") ? false : (stryCov_9fa48("20746", "20747"), entry.kind === (stryMutAct_9fa48("20748") ? "" : (stryCov_9fa48("20748"), "opportunistic")))) || (stryMutAct_9fa48("20750") ? entry.kind !== "direct" : stryMutAct_9fa48("20749") ? false : (stryCov_9fa48("20749", "20750"), entry.kind === (stryMutAct_9fa48("20751") ? "" : (stryCov_9fa48("20751"), "direct")))))) || (stryMutAct_9fa48("20753") ? entry.kind !== "propagated" : stryMutAct_9fa48("20752") ? false : (stryCov_9fa48("20752", "20753"), entry.kind === (stryMutAct_9fa48("20754") ? "" : (stryCov_9fa48("20754"), "propagated")))))) || (stryMutAct_9fa48("20756") ? entry.kind !== "reject-unpacked" : stryMutAct_9fa48("20755") ? false : (stryCov_9fa48("20755", "20756"), entry.kind === (stryMutAct_9fa48("20757") ? "" : (stryCov_9fa48("20757"), "reject-unpacked")))))) || (stryMutAct_9fa48("20759") ? entry.kind !== "reject-unsupported" : stryMutAct_9fa48("20758") ? false : (stryCov_9fa48("20758", "20759"), entry.kind === (stryMutAct_9fa48("20760") ? "" : (stryCov_9fa48("20760"), "reject-unsupported")))))));
    return stryMutAct_9fa48("20761") ? action?.kind && null : (stryCov_9fa48("20761"), (stryMutAct_9fa48("20762") ? action.kind : (stryCov_9fa48("20762"), action?.kind)) ?? null);
  }
}

/**
 * Send-method dispatch is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfSendMethodPlanWithActions}
 * (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`).
 */
export type LxmfSendMethodState = Record<string, never>;
export type LxmfSendMethodEvent = Event | {
  readonly kind: "send/dispatch";
  readonly packed: boolean;
  readonly method: number;
};

/**
 * Adapter applies reject / method-send only from these actions.
 * Plan nested via {@link stepLxmfSendMethodPlanWithActions}
 * (`opportunistic`|`direct`|`propagated`|`reject-unpacked`|`reject-unsupported`).
 */
export type LxmfSendMethodAction = {
  readonly kind: "reject-unpacked";
} | {
  readonly kind: "send-opportunistic";
} | {
  readonly kind: "send-direct";
} | {
  readonly kind: "send-propagated";
} | {
  readonly kind: "reject-unsupported";
  readonly method: number;
};
export interface LxmfSendMethodStepResult {
  readonly state: LxmfSendMethodState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfSendMethodAction[];
}
export function initialLxmfSendMethodState(): LxmfSendMethodState {
  if (stryMutAct_9fa48("20763")) {
    {}
  } else {
    stryCov_9fa48("20763");
    return {};
  }
}
export const stepLxmfSendMethod: StepFn<LxmfSendMethodState> = (state, event) => {
  if (stryMutAct_9fa48("20764")) {
    {}
  } else {
    stryCov_9fa48("20764");
    const result = stepLxmfSendMethodInner(state, event as LxmfSendMethodEvent);
    return stryMutAct_9fa48("20765") ? {} : (stryCov_9fa48("20765"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfSendMethodWithActions(state: LxmfSendMethodState, event: LxmfSendMethodEvent): LxmfSendMethodStepResult {
  if (stryMutAct_9fa48("20766")) {
    {}
  } else {
    stryCov_9fa48("20766");
    return stepLxmfSendMethodInner(state, event);
  }
}

/** Whether step actions reject an unpacked send. */
export function shouldRejectLxmfSendUnpacked(actions: ReadonlyArray<LxmfSendMethodAction>): boolean {
  if (stryMutAct_9fa48("20767")) {
    {}
  } else {
    stryCov_9fa48("20767");
    return stryMutAct_9fa48("20768") ? actions.every(action => action.kind === "reject-unpacked") : (stryCov_9fa48("20768"), actions.some(stryMutAct_9fa48("20769") ? () => undefined : (stryCov_9fa48("20769"), action => stryMutAct_9fa48("20772") ? action.kind !== "reject-unpacked" : stryMutAct_9fa48("20771") ? false : stryMutAct_9fa48("20770") ? true : (stryCov_9fa48("20770", "20771", "20772"), action.kind === (stryMutAct_9fa48("20773") ? "" : (stryCov_9fa48("20773"), "reject-unpacked"))))));
  }
}

/** Whether step actions dispatch opportunistic send. */
export function shouldSendLxmfOpportunistic(actions: ReadonlyArray<LxmfSendMethodAction>): boolean {
  if (stryMutAct_9fa48("20774")) {
    {}
  } else {
    stryCov_9fa48("20774");
    return stryMutAct_9fa48("20775") ? actions.every(action => action.kind === "send-opportunistic") : (stryCov_9fa48("20775"), actions.some(stryMutAct_9fa48("20776") ? () => undefined : (stryCov_9fa48("20776"), action => stryMutAct_9fa48("20779") ? action.kind !== "send-opportunistic" : stryMutAct_9fa48("20778") ? false : stryMutAct_9fa48("20777") ? true : (stryCov_9fa48("20777", "20778", "20779"), action.kind === (stryMutAct_9fa48("20780") ? "" : (stryCov_9fa48("20780"), "send-opportunistic"))))));
  }
}

/** Whether step actions dispatch direct send. */
export function shouldSendLxmfDirect(actions: ReadonlyArray<LxmfSendMethodAction>): boolean {
  if (stryMutAct_9fa48("20781")) {
    {}
  } else {
    stryCov_9fa48("20781");
    return stryMutAct_9fa48("20782") ? actions.every(action => action.kind === "send-direct") : (stryCov_9fa48("20782"), actions.some(stryMutAct_9fa48("20783") ? () => undefined : (stryCov_9fa48("20783"), action => stryMutAct_9fa48("20786") ? action.kind !== "send-direct" : stryMutAct_9fa48("20785") ? false : stryMutAct_9fa48("20784") ? true : (stryCov_9fa48("20784", "20785", "20786"), action.kind === (stryMutAct_9fa48("20787") ? "" : (stryCov_9fa48("20787"), "send-direct"))))));
  }
}

/** Whether step actions dispatch propagated send. */
export function shouldSendLxmfPropagated(actions: ReadonlyArray<LxmfSendMethodAction>): boolean {
  if (stryMutAct_9fa48("20788")) {
    {}
  } else {
    stryCov_9fa48("20788");
    return stryMutAct_9fa48("20789") ? actions.every(action => action.kind === "send-propagated") : (stryCov_9fa48("20789"), actions.some(stryMutAct_9fa48("20790") ? () => undefined : (stryCov_9fa48("20790"), action => stryMutAct_9fa48("20793") ? action.kind !== "send-propagated" : stryMutAct_9fa48("20792") ? false : stryMutAct_9fa48("20791") ? true : (stryCov_9fa48("20791", "20792", "20793"), action.kind === (stryMutAct_9fa48("20794") ? "" : (stryCov_9fa48("20794"), "send-propagated"))))));
  }
}

/** Whether step actions reject an unsupported delivery method. */
export function shouldRejectLxmfSendUnsupported(actions: ReadonlyArray<LxmfSendMethodAction>): boolean {
  if (stryMutAct_9fa48("20795")) {
    {}
  } else {
    stryCov_9fa48("20795");
    return stryMutAct_9fa48("20796") ? actions.every(action => action.kind === "reject-unsupported") : (stryCov_9fa48("20796"), actions.some(stryMutAct_9fa48("20797") ? () => undefined : (stryCov_9fa48("20797"), action => stryMutAct_9fa48("20800") ? action.kind !== "reject-unsupported" : stryMutAct_9fa48("20799") ? false : stryMutAct_9fa48("20798") ? true : (stryCov_9fa48("20798", "20799", "20800"), action.kind === (stryMutAct_9fa48("20801") ? "" : (stryCov_9fa48("20801"), "reject-unsupported"))))));
  }
}

/** Unsupported method code from a reject-unsupported action, if present. */
export function lxmfSendUnsupportedMethod(actions: ReadonlyArray<LxmfSendMethodAction>): number | null {
  if (stryMutAct_9fa48("20802")) {
    {}
  } else {
    stryCov_9fa48("20802");
    for (const action of actions) {
      if (stryMutAct_9fa48("20803")) {
        {}
      } else {
        stryCov_9fa48("20803");
        if (stryMutAct_9fa48("20806") ? action.kind !== "reject-unsupported" : stryMutAct_9fa48("20805") ? false : stryMutAct_9fa48("20804") ? true : (stryCov_9fa48("20804", "20805", "20806"), action.kind === (stryMutAct_9fa48("20807") ? "" : (stryCov_9fa48("20807"), "reject-unsupported")))) {
          if (stryMutAct_9fa48("20808")) {
            {}
          } else {
            stryCov_9fa48("20808");
            return action.method;
          }
        }
      }
    }
    return null;
  }
}
function stepLxmfSendMethodInner(state: LxmfSendMethodState, event: LxmfSendMethodEvent): LxmfSendMethodStepResult {
  if (stryMutAct_9fa48("20809")) {
    {}
  } else {
    stryCov_9fa48("20809");
    if (stryMutAct_9fa48("20812") ? event.kind !== "send/dispatch" : stryMutAct_9fa48("20811") ? false : stryMutAct_9fa48("20810") ? true : (stryCov_9fa48("20810", "20811", "20812"), event.kind === (stryMutAct_9fa48("20813") ? "" : (stryCov_9fa48("20813"), "send/dispatch")))) {
      if (stryMutAct_9fa48("20814")) {
        {}
      } else {
        stryCov_9fa48("20814");
        const planActions = stepLxmfSendMethodPlanWithActions(initialLxmfSendMethodPlanState(), stryMutAct_9fa48("20815") ? {} : (stryCov_9fa48("20815"), {
          kind: stryMutAct_9fa48("20816") ? "" : (stryCov_9fa48("20816"), "send/plan-gate"),
          packed: event.packed,
          method: event.method
        })).actions;
        if (stryMutAct_9fa48("20818") ? false : stryMutAct_9fa48("20817") ? true : (stryCov_9fa48("20817", "20818"), shouldRejectLxmfSendMethodPlanUnpacked(planActions))) {
          if (stryMutAct_9fa48("20819")) {
            {}
          } else {
            stryCov_9fa48("20819");
            return stryMutAct_9fa48("20820") ? {} : (stryCov_9fa48("20820"), {
              state,
              intents: stryMutAct_9fa48("20821") ? ["Stryker was here"] : (stryCov_9fa48("20821"), []),
              actions: stryMutAct_9fa48("20822") ? [] : (stryCov_9fa48("20822"), [stryMutAct_9fa48("20823") ? {} : (stryCov_9fa48("20823"), {
                kind: stryMutAct_9fa48("20824") ? "" : (stryCov_9fa48("20824"), "reject-unpacked")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20826") ? false : stryMutAct_9fa48("20825") ? true : (stryCov_9fa48("20825", "20826"), shouldPlanLxmfSendMethodOpportunistic(planActions))) {
          if (stryMutAct_9fa48("20827")) {
            {}
          } else {
            stryCov_9fa48("20827");
            return stryMutAct_9fa48("20828") ? {} : (stryCov_9fa48("20828"), {
              state,
              intents: stryMutAct_9fa48("20829") ? ["Stryker was here"] : (stryCov_9fa48("20829"), []),
              actions: stryMutAct_9fa48("20830") ? [] : (stryCov_9fa48("20830"), [stryMutAct_9fa48("20831") ? {} : (stryCov_9fa48("20831"), {
                kind: stryMutAct_9fa48("20832") ? "" : (stryCov_9fa48("20832"), "send-opportunistic")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20834") ? false : stryMutAct_9fa48("20833") ? true : (stryCov_9fa48("20833", "20834"), shouldPlanLxmfSendMethodDirect(planActions))) {
          if (stryMutAct_9fa48("20835")) {
            {}
          } else {
            stryCov_9fa48("20835");
            return stryMutAct_9fa48("20836") ? {} : (stryCov_9fa48("20836"), {
              state,
              intents: stryMutAct_9fa48("20837") ? ["Stryker was here"] : (stryCov_9fa48("20837"), []),
              actions: stryMutAct_9fa48("20838") ? [] : (stryCov_9fa48("20838"), [stryMutAct_9fa48("20839") ? {} : (stryCov_9fa48("20839"), {
                kind: stryMutAct_9fa48("20840") ? "" : (stryCov_9fa48("20840"), "send-direct")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20842") ? false : stryMutAct_9fa48("20841") ? true : (stryCov_9fa48("20841", "20842"), shouldPlanLxmfSendMethodPropagated(planActions))) {
          if (stryMutAct_9fa48("20843")) {
            {}
          } else {
            stryCov_9fa48("20843");
            return stryMutAct_9fa48("20844") ? {} : (stryCov_9fa48("20844"), {
              state,
              intents: stryMutAct_9fa48("20845") ? ["Stryker was here"] : (stryCov_9fa48("20845"), []),
              actions: stryMutAct_9fa48("20846") ? [] : (stryCov_9fa48("20846"), [stryMutAct_9fa48("20847") ? {} : (stryCov_9fa48("20847"), {
                kind: stryMutAct_9fa48("20848") ? "" : (stryCov_9fa48("20848"), "send-propagated")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20851") ? false : stryMutAct_9fa48("20850") ? true : stryMutAct_9fa48("20849") ? shouldRejectLxmfSendMethodPlanUnsupported(planActions) : (stryCov_9fa48("20849", "20850", "20851"), !shouldRejectLxmfSendMethodPlanUnsupported(planActions))) {
          if (stryMutAct_9fa48("20852")) {
            {}
          } else {
            stryCov_9fa48("20852");
            return stryMutAct_9fa48("20853") ? {} : (stryCov_9fa48("20853"), {
              state,
              intents: stryMutAct_9fa48("20854") ? ["Stryker was here"] : (stryCov_9fa48("20854"), []),
              actions: stryMutAct_9fa48("20855") ? ["Stryker was here"] : (stryCov_9fa48("20855"), [])
            });
          }
        }
        return stryMutAct_9fa48("20856") ? {} : (stryCov_9fa48("20856"), {
          state,
          intents: stryMutAct_9fa48("20857") ? ["Stryker was here"] : (stryCov_9fa48("20857"), []),
          actions: stryMutAct_9fa48("20858") ? [] : (stryCov_9fa48("20858"), [stryMutAct_9fa48("20859") ? {} : (stryCov_9fa48("20859"), {
            kind: stryMutAct_9fa48("20860") ? "" : (stryCov_9fa48("20860"), "reject-unsupported"),
            method: event.method
          })])
        });
      }
    }
    return stryMutAct_9fa48("20861") ? {} : (stryCov_9fa48("20861"), {
      state,
      intents: stryMutAct_9fa48("20862") ? ["Stryker was here"] : (stryCov_9fa48("20862"), []),
      actions: stryMutAct_9fa48("20863") ? ["Stryker was here"] : (stryCov_9fa48("20863"), [])
    });
  }
}
export type LxmfDirectSendPlan = "ok" | "missing-destination" | "missing-packed";

/** Whether DIRECT send may proceed (destination identity + packed envelope). */
export function planLxmfDirectSend(input: {
  readonly destinationPresent: boolean;
  readonly destinationIdentityPresent: boolean;
  readonly packed: boolean;
}): LxmfDirectSendPlan {
  if (stryMutAct_9fa48("20864")) {
    {}
  } else {
    stryCov_9fa48("20864");
    if (stryMutAct_9fa48("20867") ? !input.destinationPresent && !input.destinationIdentityPresent : stryMutAct_9fa48("20866") ? false : stryMutAct_9fa48("20865") ? true : (stryCov_9fa48("20865", "20866", "20867"), (stryMutAct_9fa48("20868") ? input.destinationPresent : (stryCov_9fa48("20868"), !input.destinationPresent)) || (stryMutAct_9fa48("20869") ? input.destinationIdentityPresent : (stryCov_9fa48("20869"), !input.destinationIdentityPresent)))) {
      if (stryMutAct_9fa48("20870")) {
        {}
      } else {
        stryCov_9fa48("20870");
        return stryMutAct_9fa48("20871") ? "" : (stryCov_9fa48("20871"), "missing-destination");
      }
    }
    if (stryMutAct_9fa48("20874") ? false : stryMutAct_9fa48("20873") ? true : stryMutAct_9fa48("20872") ? input.packed : (stryCov_9fa48("20872", "20873", "20874"), !input.packed)) {
      if (stryMutAct_9fa48("20875")) {
        {}
      } else {
        stryCov_9fa48("20875");
        return stryMutAct_9fa48("20876") ? "" : (stryCov_9fa48("20876"), "missing-packed");
      }
    }
    return stryMutAct_9fa48("20877") ? "" : (stryCov_9fa48("20877"), "ok");
  }
}
export type LxmfDirectSendPlanEvent = Event | {
  readonly kind: "direct-send/plan-gate";
  readonly destinationPresent: boolean;
  readonly destinationIdentityPresent: boolean;
  readonly packed: boolean;
};
export type LxmfDirectSendPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "missing-destination";
} | {
  readonly kind: "missing-packed";
};

/** Whether plan actions allow DIRECT send to proceed. */
export function shouldPlanLxmfDirectSendOk(actions: ReadonlyArray<LxmfDirectSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20878")) {
    {}
  } else {
    stryCov_9fa48("20878");
    return stryMutAct_9fa48("20879") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("20879"), actions.some(stryMutAct_9fa48("20880") ? () => undefined : (stryCov_9fa48("20880"), action => stryMutAct_9fa48("20883") ? action.kind !== "ok" : stryMutAct_9fa48("20882") ? false : stryMutAct_9fa48("20881") ? true : (stryCov_9fa48("20881", "20882", "20883"), action.kind === (stryMutAct_9fa48("20884") ? "" : (stryCov_9fa48("20884"), "ok"))))));
  }
}

/** Whether plan actions reject a missing destination / identity. */
export function shouldRejectLxmfDirectSendPlanMissingDestination(actions: ReadonlyArray<LxmfDirectSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20885")) {
    {}
  } else {
    stryCov_9fa48("20885");
    return stryMutAct_9fa48("20886") ? actions.every(action => action.kind === "missing-destination") : (stryCov_9fa48("20886"), actions.some(stryMutAct_9fa48("20887") ? () => undefined : (stryCov_9fa48("20887"), action => stryMutAct_9fa48("20890") ? action.kind !== "missing-destination" : stryMutAct_9fa48("20889") ? false : stryMutAct_9fa48("20888") ? true : (stryCov_9fa48("20888", "20889", "20890"), action.kind === (stryMutAct_9fa48("20891") ? "" : (stryCov_9fa48("20891"), "missing-destination"))))));
  }
}

/** Whether plan actions reject a missing packed envelope. */
export function shouldRejectLxmfDirectSendPlanMissingPacked(actions: ReadonlyArray<LxmfDirectSendPlanAction>): boolean {
  if (stryMutAct_9fa48("20892")) {
    {}
  } else {
    stryCov_9fa48("20892");
    return stryMutAct_9fa48("20893") ? actions.every(action => action.kind === "missing-packed") : (stryCov_9fa48("20893"), actions.some(stryMutAct_9fa48("20894") ? () => undefined : (stryCov_9fa48("20894"), action => stryMutAct_9fa48("20897") ? action.kind !== "missing-packed" : stryMutAct_9fa48("20896") ? false : stryMutAct_9fa48("20895") ? true : (stryCov_9fa48("20895", "20896", "20897"), action.kind === (stryMutAct_9fa48("20898") ? "" : (stryCov_9fa48("20898"), "missing-packed"))))));
  }
}
export type LxmfDirectSendEvent = Event | {
  readonly kind: "direct-send/gate";
  readonly destinationPresent: boolean;
  readonly destinationIdentityPresent: boolean;
  readonly packed: boolean;
};