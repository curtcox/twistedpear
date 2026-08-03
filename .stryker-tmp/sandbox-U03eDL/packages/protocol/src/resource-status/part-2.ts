/** Extracted from resource-status.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure resource transfer status transitions and gates.
 * Crypto, link send, and timers stay at the adapter edge.
 * Continue-transfer / receive-part / request-next / watchdog /
 * prove / advertise / incoming-adv / assemble / proof-accept
 * conclusions leave via machine actions (no ad-hoc plan /
 * `can*` / `should*` / `plan ===` reads beside the step).
 * Assemble, proof-accept, and advertise-phase plans nested via
 * {@link stepResourceAssembleOutcomePlanWithActions} /
 * {@link stepResourceProofAcceptPlanWithActions} /
 * {@link stepResourceAdvertisePhasePlanWithActions}.
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
import { ResourceStatus, type ResourceStatusValue } from "../resource-watchdog.js";
import { planResourceAdvertisePhase } from "./part-1.js";
import type { ResourceAdvertisePhasePlan } from "./part-1.js";
/**
 * Resource-advertise-phase plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceAdvertisePhase` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepResourceAdvertiseWaitWithActions}.
 */
export type ResourceAdvertisePhasePlanState = Record<string, never>;
export type ResourceAdvertisePhasePlanEvent = Event | {
  readonly kind: "resource/advertise-phase-plan-gate";
  readonly linkReady: boolean;
};
export type ResourceAdvertisePhasePlanAction = {
  readonly kind: ResourceAdvertisePhasePlan;
};
export interface ResourceAdvertisePhasePlanStepResult {
  readonly state: ResourceAdvertisePhasePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAdvertisePhasePlanAction[];
}
export function initialResourceAdvertisePhasePlanState(): ResourceAdvertisePhasePlanState {
  if (stryMutAct_9fa48("31332")) {
    {}
  } else {
    stryCov_9fa48("31332");
    return {};
  }
}
export function stepResourceAdvertisePhasePlanWithActions(state: ResourceAdvertisePhasePlanState, event: ResourceAdvertisePhasePlanEvent): ResourceAdvertisePhasePlanStepResult {
  if (stryMutAct_9fa48("31333")) {
    {}
  } else {
    stryCov_9fa48("31333");
    if (stryMutAct_9fa48("31336") ? event.kind !== "resource/advertise-phase-plan-gate" : stryMutAct_9fa48("31335") ? false : stryMutAct_9fa48("31334") ? true : (stryCov_9fa48("31334", "31335", "31336"), event.kind === (stryMutAct_9fa48("31337") ? "" : (stryCov_9fa48("31337"), "resource/advertise-phase-plan-gate")))) {
      if (stryMutAct_9fa48("31338")) {
        {}
      } else {
        stryCov_9fa48("31338");
        return stryMutAct_9fa48("31339") ? {} : (stryCov_9fa48("31339"), {
          state,
          intents: stryMutAct_9fa48("31340") ? ["Stryker was here"] : (stryCov_9fa48("31340"), []),
          actions: stryMutAct_9fa48("31341") ? [] : (stryCov_9fa48("31341"), [stryMutAct_9fa48("31342") ? {} : (stryCov_9fa48("31342"), {
            kind: planResourceAdvertisePhase(event.linkReady)
          })])
        });
      }
    }
    return stryMutAct_9fa48("31343") ? {} : (stryCov_9fa48("31343"), {
      state,
      intents: stryMutAct_9fa48("31344") ? ["Stryker was here"] : (stryCov_9fa48("31344"), []),
      actions: stryMutAct_9fa48("31345") ? ["Stryker was here"] : (stryCov_9fa48("31345"), [])
    });
  }
}

/** Extract the advertise-phase plan from actions; null when empty. */
export function resourceAdvertisePhasePlanFromActions(actions: ReadonlyArray<ResourceAdvertisePhasePlanAction>): ResourceAdvertisePhasePlan | null {
  if (stryMutAct_9fa48("31346")) {
    {}
  } else {
    stryCov_9fa48("31346");
    const action = actions.find(stryMutAct_9fa48("31347") ? () => undefined : (stryCov_9fa48("31347"), entry => stryMutAct_9fa48("31350") ? entry.kind === "queue" && entry.kind === "advertise" : stryMutAct_9fa48("31349") ? false : stryMutAct_9fa48("31348") ? true : (stryCov_9fa48("31348", "31349", "31350"), (stryMutAct_9fa48("31352") ? entry.kind !== "queue" : stryMutAct_9fa48("31351") ? false : (stryCov_9fa48("31351", "31352"), entry.kind === (stryMutAct_9fa48("31353") ? "" : (stryCov_9fa48("31353"), "queue")))) || (stryMutAct_9fa48("31355") ? entry.kind !== "advertise" : stryMutAct_9fa48("31354") ? false : (stryCov_9fa48("31354", "31355"), entry.kind === (stryMutAct_9fa48("31356") ? "" : (stryCov_9fa48("31356"), "advertise")))))));
    return stryMutAct_9fa48("31357") ? action?.kind && null : (stryCov_9fa48("31357"), (stryMutAct_9fa48("31358") ? action.kind : (stryCov_9fa48("31358"), action?.kind)) ?? null);
  }
}
export function shouldQueueResourceAdvertisePhasePlan(actions: ReadonlyArray<ResourceAdvertisePhasePlanAction>): boolean {
  if (stryMutAct_9fa48("31359")) {
    {}
  } else {
    stryCov_9fa48("31359");
    return stryMutAct_9fa48("31360") ? actions.every(action => action.kind === "queue") : (stryCov_9fa48("31360"), actions.some(stryMutAct_9fa48("31361") ? () => undefined : (stryCov_9fa48("31361"), action => stryMutAct_9fa48("31364") ? action.kind !== "queue" : stryMutAct_9fa48("31363") ? false : stryMutAct_9fa48("31362") ? true : (stryCov_9fa48("31362", "31363", "31364"), action.kind === (stryMutAct_9fa48("31365") ? "" : (stryCov_9fa48("31365"), "queue"))))));
  }
}
export function shouldAdvertiseResourceAdvertisePhasePlan(actions: ReadonlyArray<ResourceAdvertisePhasePlanAction>): boolean {
  if (stryMutAct_9fa48("31366")) {
    {}
  } else {
    stryCov_9fa48("31366");
    return stryMutAct_9fa48("31367") ? actions.every(action => action.kind === "advertise") : (stryCov_9fa48("31367"), actions.some(stryMutAct_9fa48("31368") ? () => undefined : (stryCov_9fa48("31368"), action => stryMutAct_9fa48("31371") ? action.kind !== "advertise" : stryMutAct_9fa48("31370") ? false : stryMutAct_9fa48("31369") ? true : (stryCov_9fa48("31369", "31370", "31371"), action.kind === (stryMutAct_9fa48("31372") ? "" : (stryCov_9fa48("31372"), "advertise"))))));
  }
}

/** Whether Resource.prove may build and send a proof (assembled data present). */
export function canProveResource(dataPresent: boolean): boolean {
  if (stryMutAct_9fa48("31373")) {
    {}
  } else {
    stryCov_9fa48("31373");
    return dataPresent;
  }
}

/**
 * Resource prove-allow gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canProveResource` reads
 * beside the step).
 */
export type ProveResourceAllowState = Record<string, never>;
export type ProveResourceAllowEvent = Event | {
  readonly kind: "resource/prove-allow-gate";
  readonly dataPresent: boolean;
};
export type ProveResourceAllowAction = {
  readonly kind: "allow";
} | {
  readonly kind: "deny";
};
export interface ProveResourceAllowStepResult {
  readonly state: ProveResourceAllowState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ProveResourceAllowAction[];
}
export function initialProveResourceAllowState(): ProveResourceAllowState {
  if (stryMutAct_9fa48("31374")) {
    {}
  } else {
    stryCov_9fa48("31374");
    return {};
  }
}
export function stepProveResourceAllowWithActions(state: ProveResourceAllowState, event: ProveResourceAllowEvent): ProveResourceAllowStepResult {
  if (stryMutAct_9fa48("31375")) {
    {}
  } else {
    stryCov_9fa48("31375");
    if (stryMutAct_9fa48("31378") ? event.kind !== "resource/prove-allow-gate" : stryMutAct_9fa48("31377") ? false : stryMutAct_9fa48("31376") ? true : (stryCov_9fa48("31376", "31377", "31378"), event.kind === (stryMutAct_9fa48("31379") ? "" : (stryCov_9fa48("31379"), "resource/prove-allow-gate")))) {
      if (stryMutAct_9fa48("31380")) {
        {}
      } else {
        stryCov_9fa48("31380");
        return stryMutAct_9fa48("31381") ? {} : (stryCov_9fa48("31381"), {
          state,
          intents: stryMutAct_9fa48("31382") ? ["Stryker was here"] : (stryCov_9fa48("31382"), []),
          actions: stryMutAct_9fa48("31383") ? [] : (stryCov_9fa48("31383"), [stryMutAct_9fa48("31384") ? {} : (stryCov_9fa48("31384"), {
            kind: canProveResource(event.dataPresent) ? stryMutAct_9fa48("31385") ? "" : (stryCov_9fa48("31385"), "allow") : stryMutAct_9fa48("31386") ? "" : (stryCov_9fa48("31386"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31387") ? {} : (stryCov_9fa48("31387"), {
      state,
      intents: stryMutAct_9fa48("31388") ? ["Stryker was here"] : (stryCov_9fa48("31388"), []),
      actions: stryMutAct_9fa48("31389") ? ["Stryker was here"] : (stryCov_9fa48("31389"), [])
    });
  }
}
export function shouldAllowProveResource(actions: ReadonlyArray<ProveResourceAllowAction>): boolean {
  if (stryMutAct_9fa48("31390")) {
    {}
  } else {
    stryCov_9fa48("31390");
    return stryMutAct_9fa48("31391") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("31391"), actions.some(stryMutAct_9fa48("31392") ? () => undefined : (stryCov_9fa48("31392"), action => stryMutAct_9fa48("31395") ? action.kind !== "allow" : stryMutAct_9fa48("31394") ? false : stryMutAct_9fa48("31393") ? true : (stryCov_9fa48("31393", "31394", "31395"), action.kind === (stryMutAct_9fa48("31396") ? "" : (stryCov_9fa48("31396"), "allow"))))));
  }
}
export function shouldDenyProveResource(actions: ReadonlyArray<ProveResourceAllowAction>): boolean {
  if (stryMutAct_9fa48("31397")) {
    {}
  } else {
    stryCov_9fa48("31397");
    return stryMutAct_9fa48("31398") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("31398"), actions.some(stryMutAct_9fa48("31399") ? () => undefined : (stryCov_9fa48("31399"), action => stryMutAct_9fa48("31402") ? action.kind !== "deny" : stryMutAct_9fa48("31401") ? false : stryMutAct_9fa48("31400") ? true : (stryCov_9fa48("31400", "31401", "31402"), action.kind === (stryMutAct_9fa48("31403") ? "" : (stryCov_9fa48("31403"), "deny"))))));
  }
}

/**
 * Whether Resource.send should auto-advertise after construction.
 * Default true when the option is omitted (`advertise !== false`).
 */
export function shouldAdvertiseResource(advertiseOption: boolean | undefined): boolean {
  if (stryMutAct_9fa48("31404")) {
    {}
  } else {
    stryCov_9fa48("31404");
    return stryMutAct_9fa48("31407") ? advertiseOption === false : stryMutAct_9fa48("31406") ? false : stryMutAct_9fa48("31405") ? true : (stryCov_9fa48("31405", "31406", "31407"), advertiseOption !== (stryMutAct_9fa48("31408") ? true : (stryCov_9fa48("31408"), false)));
  }
}

/**
 * Resource advertise-option gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAdvertiseResource`
 * reads beside the step).
 */
export type AdvertiseResourceState = Record<string, never>;
export type AdvertiseResourceEvent = Event | {
  readonly kind: "resource/advertise-option-gate";
  readonly advertiseOption: boolean | undefined;
};
export type AdvertiseResourceAction = {
  readonly kind: "advertise";
} | {
  readonly kind: "skip";
};
export interface AdvertiseResourceStepResult {
  readonly state: AdvertiseResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AdvertiseResourceAction[];
}
export function initialAdvertiseResourceState(): AdvertiseResourceState {
  if (stryMutAct_9fa48("31409")) {
    {}
  } else {
    stryCov_9fa48("31409");
    return {};
  }
}
export function stepAdvertiseResourceWithActions(state: AdvertiseResourceState, event: AdvertiseResourceEvent): AdvertiseResourceStepResult {
  if (stryMutAct_9fa48("31410")) {
    {}
  } else {
    stryCov_9fa48("31410");
    if (stryMutAct_9fa48("31413") ? event.kind !== "resource/advertise-option-gate" : stryMutAct_9fa48("31412") ? false : stryMutAct_9fa48("31411") ? true : (stryCov_9fa48("31411", "31412", "31413"), event.kind === (stryMutAct_9fa48("31414") ? "" : (stryCov_9fa48("31414"), "resource/advertise-option-gate")))) {
      if (stryMutAct_9fa48("31415")) {
        {}
      } else {
        stryCov_9fa48("31415");
        return stryMutAct_9fa48("31416") ? {} : (stryCov_9fa48("31416"), {
          state,
          intents: stryMutAct_9fa48("31417") ? ["Stryker was here"] : (stryCov_9fa48("31417"), []),
          actions: stryMutAct_9fa48("31418") ? [] : (stryCov_9fa48("31418"), [stryMutAct_9fa48("31419") ? {} : (stryCov_9fa48("31419"), {
            kind: shouldAdvertiseResource(event.advertiseOption) ? stryMutAct_9fa48("31420") ? "" : (stryCov_9fa48("31420"), "advertise") : stryMutAct_9fa48("31421") ? "" : (stryCov_9fa48("31421"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31422") ? {} : (stryCov_9fa48("31422"), {
      state,
      intents: stryMutAct_9fa48("31423") ? ["Stryker was here"] : (stryCov_9fa48("31423"), []),
      actions: stryMutAct_9fa48("31424") ? ["Stryker was here"] : (stryCov_9fa48("31424"), [])
    });
  }
}
export function shouldAdvertiseResourceNow(actions: ReadonlyArray<AdvertiseResourceAction>): boolean {
  if (stryMutAct_9fa48("31425")) {
    {}
  } else {
    stryCov_9fa48("31425");
    return stryMutAct_9fa48("31426") ? actions.every(action => action.kind === "advertise") : (stryCov_9fa48("31426"), actions.some(stryMutAct_9fa48("31427") ? () => undefined : (stryCov_9fa48("31427"), action => stryMutAct_9fa48("31430") ? action.kind !== "advertise" : stryMutAct_9fa48("31429") ? false : stryMutAct_9fa48("31428") ? true : (stryCov_9fa48("31428", "31429", "31430"), action.kind === (stryMutAct_9fa48("31431") ? "" : (stryCov_9fa48("31431"), "advertise"))))));
  }
}
export function shouldSkipAdvertiseResource(actions: ReadonlyArray<AdvertiseResourceAction>): boolean {
  if (stryMutAct_9fa48("31432")) {
    {}
  } else {
    stryCov_9fa48("31432");
    return stryMutAct_9fa48("31433") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("31433"), actions.some(stryMutAct_9fa48("31434") ? () => undefined : (stryCov_9fa48("31434"), action => stryMutAct_9fa48("31437") ? action.kind !== "skip" : stryMutAct_9fa48("31436") ? false : stryMutAct_9fa48("31435") ? true : (stryCov_9fa48("31435", "31436", "31437"), action.kind === (stryMutAct_9fa48("31438") ? "" : (stryCov_9fa48("31438"), "skip"))))));
  }
}

/**
 * Assemble validation outcome from crypto-edge booleans
 * (decrypt / payload split / hash match).
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 */
export type ResourceAssembleOutcome = "complete" | "corrupt";
export function planResourceAssembleOutcome(input: {
  readonly decryptedPresent: boolean;
  readonly payloadPresent: boolean;
  readonly hashMatches: boolean;
}): ResourceAssembleOutcome {
  if (stryMutAct_9fa48("31439")) {
    {}
  } else {
    stryCov_9fa48("31439");
    if (stryMutAct_9fa48("31442") ? (!input.decryptedPresent || !input.payloadPresent) && !input.hashMatches : stryMutAct_9fa48("31441") ? false : stryMutAct_9fa48("31440") ? true : (stryCov_9fa48("31440", "31441", "31442"), (stryMutAct_9fa48("31444") ? !input.decryptedPresent && !input.payloadPresent : stryMutAct_9fa48("31443") ? false : (stryCov_9fa48("31443", "31444"), (stryMutAct_9fa48("31445") ? input.decryptedPresent : (stryCov_9fa48("31445"), !input.decryptedPresent)) || (stryMutAct_9fa48("31446") ? input.payloadPresent : (stryCov_9fa48("31446"), !input.payloadPresent)))) || (stryMutAct_9fa48("31447") ? input.hashMatches : (stryCov_9fa48("31447"), !input.hashMatches)))) {
      if (stryMutAct_9fa48("31448")) {
        {}
      } else {
        stryCov_9fa48("31448");
        return stryMutAct_9fa48("31449") ? "" : (stryCov_9fa48("31449"), "corrupt");
      }
    }
    return stryMutAct_9fa48("31450") ? "" : (stryCov_9fa48("31450"), "complete");
  }
}

/**
 * Resource-assemble-outcome-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planResourceAssembleOutcome` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepResourceAssembleWithActions}.
 */
export type ResourceAssembleOutcomePlanState = Record<string, never>;
export type ResourceAssembleOutcomePlanEvent = Event | {
  readonly kind: "resource/assemble-outcome-plan-gate";
  readonly decryptedPresent: boolean;
  readonly payloadPresent: boolean;
  readonly hashMatches: boolean;
};
export type ResourceAssembleOutcomePlanAction = {
  readonly kind: ResourceAssembleOutcome;
};
export interface ResourceAssembleOutcomePlanStepResult {
  readonly state: ResourceAssembleOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAssembleOutcomePlanAction[];
}
export function initialResourceAssembleOutcomePlanState(): ResourceAssembleOutcomePlanState {
  if (stryMutAct_9fa48("31451")) {
    {}
  } else {
    stryCov_9fa48("31451");
    return {};
  }
}
export function stepResourceAssembleOutcomePlanWithActions(state: ResourceAssembleOutcomePlanState, event: ResourceAssembleOutcomePlanEvent): ResourceAssembleOutcomePlanStepResult {
  if (stryMutAct_9fa48("31452")) {
    {}
  } else {
    stryCov_9fa48("31452");
    if (stryMutAct_9fa48("31455") ? event.kind !== "resource/assemble-outcome-plan-gate" : stryMutAct_9fa48("31454") ? false : stryMutAct_9fa48("31453") ? true : (stryCov_9fa48("31453", "31454", "31455"), event.kind === (stryMutAct_9fa48("31456") ? "" : (stryCov_9fa48("31456"), "resource/assemble-outcome-plan-gate")))) {
      if (stryMutAct_9fa48("31457")) {
        {}
      } else {
        stryCov_9fa48("31457");
        return stryMutAct_9fa48("31458") ? {} : (stryCov_9fa48("31458"), {
          state,
          intents: stryMutAct_9fa48("31459") ? ["Stryker was here"] : (stryCov_9fa48("31459"), []),
          actions: stryMutAct_9fa48("31460") ? [] : (stryCov_9fa48("31460"), [stryMutAct_9fa48("31461") ? {} : (stryCov_9fa48("31461"), {
            kind: planResourceAssembleOutcome(stryMutAct_9fa48("31462") ? {} : (stryCov_9fa48("31462"), {
              decryptedPresent: event.decryptedPresent,
              payloadPresent: event.payloadPresent,
              hashMatches: event.hashMatches
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("31463") ? {} : (stryCov_9fa48("31463"), {
      state,
      intents: stryMutAct_9fa48("31464") ? ["Stryker was here"] : (stryCov_9fa48("31464"), []),
      actions: stryMutAct_9fa48("31465") ? ["Stryker was here"] : (stryCov_9fa48("31465"), [])
    });
  }
}

/** Extract the assemble outcome from actions; null when empty. */
export function resourceAssembleOutcomePlanFromActions(actions: ReadonlyArray<ResourceAssembleOutcomePlanAction>): ResourceAssembleOutcome | null {
  if (stryMutAct_9fa48("31466")) {
    {}
  } else {
    stryCov_9fa48("31466");
    const action = actions.find(stryMutAct_9fa48("31467") ? () => undefined : (stryCov_9fa48("31467"), entry => stryMutAct_9fa48("31470") ? entry.kind === "complete" && entry.kind === "corrupt" : stryMutAct_9fa48("31469") ? false : stryMutAct_9fa48("31468") ? true : (stryCov_9fa48("31468", "31469", "31470"), (stryMutAct_9fa48("31472") ? entry.kind !== "complete" : stryMutAct_9fa48("31471") ? false : (stryCov_9fa48("31471", "31472"), entry.kind === (stryMutAct_9fa48("31473") ? "" : (stryCov_9fa48("31473"), "complete")))) || (stryMutAct_9fa48("31475") ? entry.kind !== "corrupt" : stryMutAct_9fa48("31474") ? false : (stryCov_9fa48("31474", "31475"), entry.kind === (stryMutAct_9fa48("31476") ? "" : (stryCov_9fa48("31476"), "corrupt")))))));
    return stryMutAct_9fa48("31477") ? action?.kind && null : (stryCov_9fa48("31477"), (stryMutAct_9fa48("31478") ? action.kind : (stryCov_9fa48("31478"), action?.kind)) ?? null);
  }
}
export function shouldCompleteResourceAssembleOutcomePlan(actions: ReadonlyArray<ResourceAssembleOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("31479")) {
    {}
  } else {
    stryCov_9fa48("31479");
    return stryMutAct_9fa48("31480") ? actions.every(action => action.kind === "complete") : (stryCov_9fa48("31480"), actions.some(stryMutAct_9fa48("31481") ? () => undefined : (stryCov_9fa48("31481"), action => stryMutAct_9fa48("31484") ? action.kind !== "complete" : stryMutAct_9fa48("31483") ? false : stryMutAct_9fa48("31482") ? true : (stryCov_9fa48("31482", "31483", "31484"), action.kind === (stryMutAct_9fa48("31485") ? "" : (stryCov_9fa48("31485"), "complete"))))));
  }
}
export function shouldCorruptResourceAssembleOutcomePlan(actions: ReadonlyArray<ResourceAssembleOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("31486")) {
    {}
  } else {
    stryCov_9fa48("31486");
    return stryMutAct_9fa48("31487") ? actions.every(action => action.kind === "corrupt") : (stryCov_9fa48("31487"), actions.some(stryMutAct_9fa48("31488") ? () => undefined : (stryCov_9fa48("31488"), action => stryMutAct_9fa48("31491") ? action.kind !== "corrupt" : stryMutAct_9fa48("31490") ? false : stryMutAct_9fa48("31489") ? true : (stryCov_9fa48("31489", "31490", "31491"), action.kind === (stryMutAct_9fa48("31492") ? "" : (stryCov_9fa48("31492"), "corrupt"))))));
  }
}

/**
 * Resource assemble gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepResourceAssembleOutcomePlanWithActions}
 * (`complete`|`corrupt`).
 */
export type ResourceAssembleState = Record<string, never>;
export type ResourceAssembleEvent = Event | {
  readonly kind: "resource/assemble-gate";
  readonly decryptedPresent: boolean;
  readonly payloadPresent: boolean;
  readonly hashMatches: boolean;
};

/**
 * Adapter continues or marks corrupt only from these actions.
 * Plan nested via {@link stepResourceAssembleOutcomePlanWithActions}
 * (`complete`|`corrupt`).
 */
export type ResourceAssembleAction = {
  readonly kind: ResourceAssembleOutcome;
};
export interface ResourceAssembleStepResult {
  readonly state: ResourceAssembleState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ResourceAssembleAction[];
}
export function initialResourceAssembleState(): ResourceAssembleState {
  if (stryMutAct_9fa48("31493")) {
    {}
  } else {
    stryCov_9fa48("31493");
    return {};
  }
}
export const stepResourceAssemble: StepFn<ResourceAssembleState> = (state, event) => {
  if (stryMutAct_9fa48("31494")) {
    {}
  } else {
    stryCov_9fa48("31494");
    const result = stepResourceAssembleInner(state, event as ResourceAssembleEvent);
    return stryMutAct_9fa48("31495") ? {} : (stryCov_9fa48("31495"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepResourceAssembleWithActions(state: ResourceAssembleState, event: ResourceAssembleEvent): ResourceAssembleStepResult {
  if (stryMutAct_9fa48("31496")) {
    {}
  } else {
    stryCov_9fa48("31496");
    return stepResourceAssembleInner(state, event);
  }
}
export function shouldCompleteResourceAssemble(actions: ReadonlyArray<ResourceAssembleAction>): boolean {
  if (stryMutAct_9fa48("31497")) {
    {}
  } else {
    stryCov_9fa48("31497");
    return stryMutAct_9fa48("31498") ? actions.every(action => action.kind === "complete") : (stryCov_9fa48("31498"), actions.some(stryMutAct_9fa48("31499") ? () => undefined : (stryCov_9fa48("31499"), action => stryMutAct_9fa48("31502") ? action.kind !== "complete" : stryMutAct_9fa48("31501") ? false : stryMutAct_9fa48("31500") ? true : (stryCov_9fa48("31500", "31501", "31502"), action.kind === (stryMutAct_9fa48("31503") ? "" : (stryCov_9fa48("31503"), "complete"))))));
  }
}
export function shouldCorruptResourceAssemble(actions: ReadonlyArray<ResourceAssembleAction>): boolean {
  if (stryMutAct_9fa48("31504")) {
    {}
  } else {
    stryCov_9fa48("31504");
    return stryMutAct_9fa48("31505") ? actions.every(action => action.kind === "corrupt") : (stryCov_9fa48("31505"), actions.some(stryMutAct_9fa48("31506") ? () => undefined : (stryCov_9fa48("31506"), action => stryMutAct_9fa48("31509") ? action.kind !== "corrupt" : stryMutAct_9fa48("31508") ? false : stryMutAct_9fa48("31507") ? true : (stryCov_9fa48("31507", "31508", "31509"), action.kind === (stryMutAct_9fa48("31510") ? "" : (stryCov_9fa48("31510"), "corrupt"))))));
  }
}
function stepResourceAssembleInner(state: ResourceAssembleState, event: ResourceAssembleEvent): ResourceAssembleStepResult {
  if (stryMutAct_9fa48("31511")) {
    {}
  } else {
    stryCov_9fa48("31511");
    if (stryMutAct_9fa48("31514") ? event.kind !== "resource/assemble-gate" : stryMutAct_9fa48("31513") ? false : stryMutAct_9fa48("31512") ? true : (stryCov_9fa48("31512", "31513", "31514"), event.kind === (stryMutAct_9fa48("31515") ? "" : (stryCov_9fa48("31515"), "resource/assemble-gate")))) {
      if (stryMutAct_9fa48("31516")) {
        {}
      } else {
        stryCov_9fa48("31516");
        const planActions = stepResourceAssembleOutcomePlanWithActions(initialResourceAssembleOutcomePlanState(), stryMutAct_9fa48("31517") ? {} : (stryCov_9fa48("31517"), {
          kind: stryMutAct_9fa48("31518") ? "" : (stryCov_9fa48("31518"), "resource/assemble-outcome-plan-gate"),
          decryptedPresent: event.decryptedPresent,
          payloadPresent: event.payloadPresent,
          hashMatches: event.hashMatches
        })).actions;
        const plan = resourceAssembleOutcomePlanFromActions(planActions);
        if (stryMutAct_9fa48("31521") ? plan !== null : stryMutAct_9fa48("31520") ? false : stryMutAct_9fa48("31519") ? true : (stryCov_9fa48("31519", "31520", "31521"), plan === null)) {
          if (stryMutAct_9fa48("31522")) {
            {}
          } else {
            stryCov_9fa48("31522");
            return stryMutAct_9fa48("31523") ? {} : (stryCov_9fa48("31523"), {
              state,
              intents: stryMutAct_9fa48("31524") ? ["Stryker was here"] : (stryCov_9fa48("31524"), []),
              actions: stryMutAct_9fa48("31525") ? ["Stryker was here"] : (stryCov_9fa48("31525"), [])
            });
          }
        }
        return stryMutAct_9fa48("31526") ? {} : (stryCov_9fa48("31526"), {
          state,
          intents: stryMutAct_9fa48("31527") ? ["Stryker was here"] : (stryCov_9fa48("31527"), []),
          actions: stryMutAct_9fa48("31528") ? [] : (stryCov_9fa48("31528"), [stryMutAct_9fa48("31529") ? {} : (stryCov_9fa48("31529"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("31530") ? {} : (stryCov_9fa48("31530"), {
      state,
      intents: stryMutAct_9fa48("31531") ? ["Stryker was here"] : (stryCov_9fa48("31531"), []),
      actions: stryMutAct_9fa48("31532") ? ["Stryker was here"] : (stryCov_9fa48("31532"), [])
    });
  }
}

/**
 * Whether assemble may commit payload after {@link planResourceAssembleOutcome}
 * returns complete and split payload bytes remain present.
 */
export function shouldCommitResourceAssemblePayload(input: {
  readonly outcomeComplete: boolean;
  readonly payloadPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("31533")) {
    {}
  } else {
    stryCov_9fa48("31533");
    return stryMutAct_9fa48("31536") ? input.outcomeComplete || input.payloadPresent : stryMutAct_9fa48("31535") ? false : stryMutAct_9fa48("31534") ? true : (stryCov_9fa48("31534", "31535", "31536"), input.outcomeComplete && input.payloadPresent);
  }
}

/**
 * Resource assemble payload-commit gate is event-driven; no durable session
 * fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitResourceAssemblePayload` reads beside the step).
 */
export type CommitResourceAssemblePayloadState = Record<string, never>;
export type CommitResourceAssemblePayloadEvent = Event | {
  readonly kind: "resource/commit-assemble-payload-gate";
  readonly outcomeComplete: boolean;
  readonly payloadPresent: boolean;
};
export type CommitResourceAssemblePayloadAction = {
  readonly kind: "commit";
} | {
  readonly kind: "skip";
};
export interface CommitResourceAssemblePayloadStepResult {
  readonly state: CommitResourceAssemblePayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitResourceAssemblePayloadAction[];
}
export function initialCommitResourceAssemblePayloadState(): CommitResourceAssemblePayloadState {
  if (stryMutAct_9fa48("31537")) {
    {}
  } else {
    stryCov_9fa48("31537");
    return {};
  }
}
export function stepCommitResourceAssemblePayloadWithActions(state: CommitResourceAssemblePayloadState, event: CommitResourceAssemblePayloadEvent): CommitResourceAssemblePayloadStepResult {
  if (stryMutAct_9fa48("31538")) {
    {}
  } else {
    stryCov_9fa48("31538");
    if (stryMutAct_9fa48("31541") ? event.kind !== "resource/commit-assemble-payload-gate" : stryMutAct_9fa48("31540") ? false : stryMutAct_9fa48("31539") ? true : (stryCov_9fa48("31539", "31540", "31541"), event.kind === (stryMutAct_9fa48("31542") ? "" : (stryCov_9fa48("31542"), "resource/commit-assemble-payload-gate")))) {
      if (stryMutAct_9fa48("31543")) {
        {}
      } else {
        stryCov_9fa48("31543");
        return stryMutAct_9fa48("31544") ? {} : (stryCov_9fa48("31544"), {
          state,
          intents: stryMutAct_9fa48("31545") ? ["Stryker was here"] : (stryCov_9fa48("31545"), []),
          actions: stryMutAct_9fa48("31546") ? [] : (stryCov_9fa48("31546"), [stryMutAct_9fa48("31547") ? {} : (stryCov_9fa48("31547"), {
            kind: shouldCommitResourceAssemblePayload(stryMutAct_9fa48("31548") ? {} : (stryCov_9fa48("31548"), {
              outcomeComplete: event.outcomeComplete,
              payloadPresent: event.payloadPresent
            })) ? stryMutAct_9fa48("31549") ? "" : (stryCov_9fa48("31549"), "commit") : stryMutAct_9fa48("31550") ? "" : (stryCov_9fa48("31550"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("31551") ? {} : (stryCov_9fa48("31551"), {
      state,
      intents: stryMutAct_9fa48("31552") ? ["Stryker was here"] : (stryCov_9fa48("31552"), []),
      actions: stryMutAct_9fa48("31553") ? ["Stryker was here"] : (stryCov_9fa48("31553"), [])
    });
  }
}
export function shouldCommitResourceAssemblePayloadNow(actions: ReadonlyArray<CommitResourceAssemblePayloadAction>): boolean {
  if (stryMutAct_9fa48("31554")) {
    {}
  } else {
    stryCov_9fa48("31554");
    return stryMutAct_9fa48("31555") ? actions.every(action => action.kind === "commit") : (stryCov_9fa48("31555"), actions.some(stryMutAct_9fa48("31556") ? () => undefined : (stryCov_9fa48("31556"), action => stryMutAct_9fa48("31559") ? action.kind !== "commit" : stryMutAct_9fa48("31558") ? false : stryMutAct_9fa48("31557") ? true : (stryCov_9fa48("31557", "31558", "31559"), action.kind === (stryMutAct_9fa48("31560") ? "" : (stryCov_9fa48("31560"), "commit"))))));
  }
}
export function shouldSkipCommitResourceAssemblePayload(actions: ReadonlyArray<CommitResourceAssemblePayloadAction>): boolean {
  if (stryMutAct_9fa48("31561")) {
    {}
  } else {
    stryCov_9fa48("31561");
    return stryMutAct_9fa48("31562") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("31562"), actions.some(stryMutAct_9fa48("31563") ? () => undefined : (stryCov_9fa48("31563"), action => stryMutAct_9fa48("31566") ? action.kind !== "skip" : stryMutAct_9fa48("31565") ? false : stryMutAct_9fa48("31564") ? true : (stryCov_9fa48("31564", "31565", "31566"), action.kind === (stryMutAct_9fa48("31567") ? "" : (stryCov_9fa48("31567"), "skip"))))));
  }
}