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
import { planLxmfDirectSend, shouldPlanLxmfDirectSendOk, shouldRejectLxmfDirectSendPlanMissingDestination, shouldRejectLxmfDirectSendPlanMissingPacked } from "./part-7.js";
import type { LxmfDirectSendEvent, LxmfDirectSendPlan, LxmfDirectSendPlanAction, LxmfDirectSendPlanEvent } from "./part-7.js";
/**
 * DIRECT send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfDirectSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfDirectSendWithActions}.
 */
export type LxmfDirectSendPlanState = Record<string, never>;
export interface LxmfDirectSendPlanStepResult {
  readonly state: LxmfDirectSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDirectSendPlanAction[];
}
export function initialLxmfDirectSendPlanState(): LxmfDirectSendPlanState {
  if (stryMutAct_9fa48("20899")) {
    {}
  } else {
    stryCov_9fa48("20899");
    return {};
  }
}
export function stepLxmfDirectSendPlanWithActions(state: LxmfDirectSendPlanState, event: LxmfDirectSendPlanEvent): LxmfDirectSendPlanStepResult {
  if (stryMutAct_9fa48("20900")) {
    {}
  } else {
    stryCov_9fa48("20900");
    if (stryMutAct_9fa48("20903") ? event.kind !== "direct-send/plan-gate" : stryMutAct_9fa48("20902") ? false : stryMutAct_9fa48("20901") ? true : (stryCov_9fa48("20901", "20902", "20903"), event.kind === (stryMutAct_9fa48("20904") ? "" : (stryCov_9fa48("20904"), "direct-send/plan-gate")))) {
      if (stryMutAct_9fa48("20905")) {
        {}
      } else {
        stryCov_9fa48("20905");
        return stryMutAct_9fa48("20906") ? {} : (stryCov_9fa48("20906"), {
          state,
          intents: stryMutAct_9fa48("20907") ? ["Stryker was here"] : (stryCov_9fa48("20907"), []),
          actions: stryMutAct_9fa48("20908") ? [] : (stryCov_9fa48("20908"), [stryMutAct_9fa48("20909") ? {} : (stryCov_9fa48("20909"), {
            kind: planLxmfDirectSend(stryMutAct_9fa48("20910") ? {} : (stryCov_9fa48("20910"), {
              destinationPresent: event.destinationPresent,
              destinationIdentityPresent: event.destinationIdentityPresent,
              packed: event.packed
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("20911") ? {} : (stryCov_9fa48("20911"), {
      state,
      intents: stryMutAct_9fa48("20912") ? ["Stryker was here"] : (stryCov_9fa48("20912"), []),
      actions: stryMutAct_9fa48("20913") ? ["Stryker was here"] : (stryCov_9fa48("20913"), [])
    });
  }
}

/** Extract the DIRECT send plan from actions; null when empty. */
export function lxmfDirectSendPlanFromActions(actions: ReadonlyArray<LxmfDirectSendPlanAction>): LxmfDirectSendPlan | null {
  if (stryMutAct_9fa48("20914")) {
    {}
  } else {
    stryCov_9fa48("20914");
    const action = actions.find(stryMutAct_9fa48("20915") ? () => undefined : (stryCov_9fa48("20915"), entry => stryMutAct_9fa48("20918") ? (entry.kind === "ok" || entry.kind === "missing-destination") && entry.kind === "missing-packed" : stryMutAct_9fa48("20917") ? false : stryMutAct_9fa48("20916") ? true : (stryCov_9fa48("20916", "20917", "20918"), (stryMutAct_9fa48("20920") ? entry.kind === "ok" && entry.kind === "missing-destination" : stryMutAct_9fa48("20919") ? false : (stryCov_9fa48("20919", "20920"), (stryMutAct_9fa48("20922") ? entry.kind !== "ok" : stryMutAct_9fa48("20921") ? false : (stryCov_9fa48("20921", "20922"), entry.kind === (stryMutAct_9fa48("20923") ? "" : (stryCov_9fa48("20923"), "ok")))) || (stryMutAct_9fa48("20925") ? entry.kind !== "missing-destination" : stryMutAct_9fa48("20924") ? false : (stryCov_9fa48("20924", "20925"), entry.kind === (stryMutAct_9fa48("20926") ? "" : (stryCov_9fa48("20926"), "missing-destination")))))) || (stryMutAct_9fa48("20928") ? entry.kind !== "missing-packed" : stryMutAct_9fa48("20927") ? false : (stryCov_9fa48("20927", "20928"), entry.kind === (stryMutAct_9fa48("20929") ? "" : (stryCov_9fa48("20929"), "missing-packed")))))));
    return stryMutAct_9fa48("20930") ? action?.kind && null : (stryCov_9fa48("20930"), (stryMutAct_9fa48("20931") ? action.kind : (stryCov_9fa48("20931"), action?.kind)) ?? null);
  }
}

/**
 * DIRECT send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfDirectSendPlanWithActions}
 * (`ok`|`missing-destination`|`missing-packed`).
 */
export type LxmfDirectSendState = Record<string, never>;

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfDirectSendPlanWithActions}
 * (`ok`|`missing-destination`|`missing-packed`).
 */
export type LxmfDirectSendAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-missing-destination";
} | {
  readonly kind: "reject-missing-packed";
};
export interface LxmfDirectSendStepResult {
  readonly state: LxmfDirectSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfDirectSendAction[];
}
export function initialLxmfDirectSendState(): LxmfDirectSendState {
  if (stryMutAct_9fa48("20932")) {
    {}
  } else {
    stryCov_9fa48("20932");
    return {};
  }
}
export const stepLxmfDirectSend: StepFn<LxmfDirectSendState> = (state, event) => {
  if (stryMutAct_9fa48("20933")) {
    {}
  } else {
    stryCov_9fa48("20933");
    const result = stepLxmfDirectSendInner(state, event as LxmfDirectSendEvent);
    return stryMutAct_9fa48("20934") ? {} : (stryCov_9fa48("20934"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfDirectSendWithActions(state: LxmfDirectSendState, event: LxmfDirectSendEvent): LxmfDirectSendStepResult {
  if (stryMutAct_9fa48("20935")) {
    {}
  } else {
    stryCov_9fa48("20935");
    return stepLxmfDirectSendInner(state, event);
  }
}
export function shouldProceedLxmfDirectSend(actions: ReadonlyArray<LxmfDirectSendAction>): boolean {
  if (stryMutAct_9fa48("20936")) {
    {}
  } else {
    stryCov_9fa48("20936");
    return stryMutAct_9fa48("20937") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("20937"), actions.some(stryMutAct_9fa48("20938") ? () => undefined : (stryCov_9fa48("20938"), action => stryMutAct_9fa48("20941") ? action.kind !== "proceed" : stryMutAct_9fa48("20940") ? false : stryMutAct_9fa48("20939") ? true : (stryCov_9fa48("20939", "20940", "20941"), action.kind === (stryMutAct_9fa48("20942") ? "" : (stryCov_9fa48("20942"), "proceed"))))));
  }
}
export function shouldRejectLxmfDirectMissingDestination(actions: ReadonlyArray<LxmfDirectSendAction>): boolean {
  if (stryMutAct_9fa48("20943")) {
    {}
  } else {
    stryCov_9fa48("20943");
    return stryMutAct_9fa48("20944") ? actions.every(action => action.kind === "reject-missing-destination") : (stryCov_9fa48("20944"), actions.some(stryMutAct_9fa48("20945") ? () => undefined : (stryCov_9fa48("20945"), action => stryMutAct_9fa48("20948") ? action.kind !== "reject-missing-destination" : stryMutAct_9fa48("20947") ? false : stryMutAct_9fa48("20946") ? true : (stryCov_9fa48("20946", "20947", "20948"), action.kind === (stryMutAct_9fa48("20949") ? "" : (stryCov_9fa48("20949"), "reject-missing-destination"))))));
  }
}
export function shouldRejectLxmfDirectMissingPacked(actions: ReadonlyArray<LxmfDirectSendAction>): boolean {
  if (stryMutAct_9fa48("20950")) {
    {}
  } else {
    stryCov_9fa48("20950");
    return stryMutAct_9fa48("20951") ? actions.every(action => action.kind === "reject-missing-packed") : (stryCov_9fa48("20951"), actions.some(stryMutAct_9fa48("20952") ? () => undefined : (stryCov_9fa48("20952"), action => stryMutAct_9fa48("20955") ? action.kind !== "reject-missing-packed" : stryMutAct_9fa48("20954") ? false : stryMutAct_9fa48("20953") ? true : (stryCov_9fa48("20953", "20954", "20955"), action.kind === (stryMutAct_9fa48("20956") ? "" : (stryCov_9fa48("20956"), "reject-missing-packed"))))));
  }
}
function stepLxmfDirectSendInner(state: LxmfDirectSendState, event: LxmfDirectSendEvent): LxmfDirectSendStepResult {
  if (stryMutAct_9fa48("20957")) {
    {}
  } else {
    stryCov_9fa48("20957");
    if (stryMutAct_9fa48("20960") ? event.kind !== "direct-send/gate" : stryMutAct_9fa48("20959") ? false : stryMutAct_9fa48("20958") ? true : (stryCov_9fa48("20958", "20959", "20960"), event.kind === (stryMutAct_9fa48("20961") ? "" : (stryCov_9fa48("20961"), "direct-send/gate")))) {
      if (stryMutAct_9fa48("20962")) {
        {}
      } else {
        stryCov_9fa48("20962");
        const planActions = stepLxmfDirectSendPlanWithActions(initialLxmfDirectSendPlanState(), stryMutAct_9fa48("20963") ? {} : (stryCov_9fa48("20963"), {
          kind: stryMutAct_9fa48("20964") ? "" : (stryCov_9fa48("20964"), "direct-send/plan-gate"),
          destinationPresent: event.destinationPresent,
          destinationIdentityPresent: event.destinationIdentityPresent,
          packed: event.packed
        })).actions;
        if (stryMutAct_9fa48("20966") ? false : stryMutAct_9fa48("20965") ? true : (stryCov_9fa48("20965", "20966"), shouldRejectLxmfDirectSendPlanMissingDestination(planActions))) {
          if (stryMutAct_9fa48("20967")) {
            {}
          } else {
            stryCov_9fa48("20967");
            return stryMutAct_9fa48("20968") ? {} : (stryCov_9fa48("20968"), {
              state,
              intents: stryMutAct_9fa48("20969") ? ["Stryker was here"] : (stryCov_9fa48("20969"), []),
              actions: stryMutAct_9fa48("20970") ? [] : (stryCov_9fa48("20970"), [stryMutAct_9fa48("20971") ? {} : (stryCov_9fa48("20971"), {
                kind: stryMutAct_9fa48("20972") ? "" : (stryCov_9fa48("20972"), "reject-missing-destination")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20974") ? false : stryMutAct_9fa48("20973") ? true : (stryCov_9fa48("20973", "20974"), shouldRejectLxmfDirectSendPlanMissingPacked(planActions))) {
          if (stryMutAct_9fa48("20975")) {
            {}
          } else {
            stryCov_9fa48("20975");
            return stryMutAct_9fa48("20976") ? {} : (stryCov_9fa48("20976"), {
              state,
              intents: stryMutAct_9fa48("20977") ? ["Stryker was here"] : (stryCov_9fa48("20977"), []),
              actions: stryMutAct_9fa48("20978") ? [] : (stryCov_9fa48("20978"), [stryMutAct_9fa48("20979") ? {} : (stryCov_9fa48("20979"), {
                kind: stryMutAct_9fa48("20980") ? "" : (stryCov_9fa48("20980"), "reject-missing-packed")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("20983") ? false : stryMutAct_9fa48("20982") ? true : stryMutAct_9fa48("20981") ? shouldPlanLxmfDirectSendOk(planActions) : (stryCov_9fa48("20981", "20982", "20983"), !shouldPlanLxmfDirectSendOk(planActions))) {
          if (stryMutAct_9fa48("20984")) {
            {}
          } else {
            stryCov_9fa48("20984");
            return stryMutAct_9fa48("20985") ? {} : (stryCov_9fa48("20985"), {
              state,
              intents: stryMutAct_9fa48("20986") ? ["Stryker was here"] : (stryCov_9fa48("20986"), []),
              actions: stryMutAct_9fa48("20987") ? ["Stryker was here"] : (stryCov_9fa48("20987"), [])
            });
          }
        }
        return stryMutAct_9fa48("20988") ? {} : (stryCov_9fa48("20988"), {
          state,
          intents: stryMutAct_9fa48("20989") ? ["Stryker was here"] : (stryCov_9fa48("20989"), []),
          actions: stryMutAct_9fa48("20990") ? [] : (stryCov_9fa48("20990"), [stryMutAct_9fa48("20991") ? {} : (stryCov_9fa48("20991"), {
            kind: stryMutAct_9fa48("20992") ? "" : (stryCov_9fa48("20992"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("20993") ? {} : (stryCov_9fa48("20993"), {
      state,
      intents: stryMutAct_9fa48("20994") ? ["Stryker was here"] : (stryCov_9fa48("20994"), []),
      actions: stryMutAct_9fa48("20995") ? ["Stryker was here"] : (stryCov_9fa48("20995"), [])
    });
  }
}
export type LxmfOpportunisticSendPlan = "ok" | "missing-destination";

/** Whether OPPORTUNISTIC send may proceed (destination present). */
export function planLxmfOpportunisticSend(input: {
  readonly destinationPresent: boolean;
}): LxmfOpportunisticSendPlan {
  if (stryMutAct_9fa48("20996")) {
    {}
  } else {
    stryCov_9fa48("20996");
    if (stryMutAct_9fa48("20999") ? false : stryMutAct_9fa48("20998") ? true : stryMutAct_9fa48("20997") ? input.destinationPresent : (stryCov_9fa48("20997", "20998", "20999"), !input.destinationPresent)) {
      if (stryMutAct_9fa48("21000")) {
        {}
      } else {
        stryCov_9fa48("21000");
        return stryMutAct_9fa48("21001") ? "" : (stryCov_9fa48("21001"), "missing-destination");
      }
    }
    return stryMutAct_9fa48("21002") ? "" : (stryCov_9fa48("21002"), "ok");
  }
}

/**
 * OPPORTUNISTIC send-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLxmfOpportunisticSend` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLxmfOpportunisticSendWithActions}.
 */
export type LxmfOpportunisticSendPlanState = Record<string, never>;
export type LxmfOpportunisticSendPlanEvent = Event | {
  readonly kind: "opportunistic-send/plan-gate";
  readonly destinationPresent: boolean;
};
export type LxmfOpportunisticSendPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "missing-destination";
};
export interface LxmfOpportunisticSendPlanStepResult {
  readonly state: LxmfOpportunisticSendPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticSendPlanAction[];
}
export function initialLxmfOpportunisticSendPlanState(): LxmfOpportunisticSendPlanState {
  if (stryMutAct_9fa48("21003")) {
    {}
  } else {
    stryCov_9fa48("21003");
    return {};
  }
}
export function stepLxmfOpportunisticSendPlanWithActions(state: LxmfOpportunisticSendPlanState, event: LxmfOpportunisticSendPlanEvent): LxmfOpportunisticSendPlanStepResult {
  if (stryMutAct_9fa48("21004")) {
    {}
  } else {
    stryCov_9fa48("21004");
    if (stryMutAct_9fa48("21007") ? event.kind !== "opportunistic-send/plan-gate" : stryMutAct_9fa48("21006") ? false : stryMutAct_9fa48("21005") ? true : (stryCov_9fa48("21005", "21006", "21007"), event.kind === (stryMutAct_9fa48("21008") ? "" : (stryCov_9fa48("21008"), "opportunistic-send/plan-gate")))) {
      if (stryMutAct_9fa48("21009")) {
        {}
      } else {
        stryCov_9fa48("21009");
        return stryMutAct_9fa48("21010") ? {} : (stryCov_9fa48("21010"), {
          state,
          intents: stryMutAct_9fa48("21011") ? ["Stryker was here"] : (stryCov_9fa48("21011"), []),
          actions: stryMutAct_9fa48("21012") ? [] : (stryCov_9fa48("21012"), [stryMutAct_9fa48("21013") ? {} : (stryCov_9fa48("21013"), {
            kind: planLxmfOpportunisticSend(stryMutAct_9fa48("21014") ? {} : (stryCov_9fa48("21014"), {
              destinationPresent: event.destinationPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("21015") ? {} : (stryCov_9fa48("21015"), {
      state,
      intents: stryMutAct_9fa48("21016") ? ["Stryker was here"] : (stryCov_9fa48("21016"), []),
      actions: stryMutAct_9fa48("21017") ? ["Stryker was here"] : (stryCov_9fa48("21017"), [])
    });
  }
}

/** Whether plan actions allow OPPORTUNISTIC send to proceed. */
export function shouldPlanLxmfOpportunisticSendOk(actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>): boolean {
  if (stryMutAct_9fa48("21018")) {
    {}
  } else {
    stryCov_9fa48("21018");
    return stryMutAct_9fa48("21019") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("21019"), actions.some(stryMutAct_9fa48("21020") ? () => undefined : (stryCov_9fa48("21020"), action => stryMutAct_9fa48("21023") ? action.kind !== "ok" : stryMutAct_9fa48("21022") ? false : stryMutAct_9fa48("21021") ? true : (stryCov_9fa48("21021", "21022", "21023"), action.kind === (stryMutAct_9fa48("21024") ? "" : (stryCov_9fa48("21024"), "ok"))))));
  }
}

/** Whether plan actions reject a missing destination. */
export function shouldRejectLxmfOpportunisticSendPlanMissingDestination(actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>): boolean {
  if (stryMutAct_9fa48("21025")) {
    {}
  } else {
    stryCov_9fa48("21025");
    return stryMutAct_9fa48("21026") ? actions.every(action => action.kind === "missing-destination") : (stryCov_9fa48("21026"), actions.some(stryMutAct_9fa48("21027") ? () => undefined : (stryCov_9fa48("21027"), action => stryMutAct_9fa48("21030") ? action.kind !== "missing-destination" : stryMutAct_9fa48("21029") ? false : stryMutAct_9fa48("21028") ? true : (stryCov_9fa48("21028", "21029", "21030"), action.kind === (stryMutAct_9fa48("21031") ? "" : (stryCov_9fa48("21031"), "missing-destination"))))));
  }
}

/** Extract the OPPORTUNISTIC send plan from actions; null when empty. */
export function lxmfOpportunisticSendPlanFromActions(actions: ReadonlyArray<LxmfOpportunisticSendPlanAction>): LxmfOpportunisticSendPlan | null {
  if (stryMutAct_9fa48("21032")) {
    {}
  } else {
    stryCov_9fa48("21032");
    const action = actions.find(stryMutAct_9fa48("21033") ? () => undefined : (stryCov_9fa48("21033"), entry => stryMutAct_9fa48("21036") ? entry.kind === "ok" && entry.kind === "missing-destination" : stryMutAct_9fa48("21035") ? false : stryMutAct_9fa48("21034") ? true : (stryCov_9fa48("21034", "21035", "21036"), (stryMutAct_9fa48("21038") ? entry.kind !== "ok" : stryMutAct_9fa48("21037") ? false : (stryCov_9fa48("21037", "21038"), entry.kind === (stryMutAct_9fa48("21039") ? "" : (stryCov_9fa48("21039"), "ok")))) || (stryMutAct_9fa48("21041") ? entry.kind !== "missing-destination" : stryMutAct_9fa48("21040") ? false : (stryCov_9fa48("21040", "21041"), entry.kind === (stryMutAct_9fa48("21042") ? "" : (stryCov_9fa48("21042"), "missing-destination")))))));
    return stryMutAct_9fa48("21043") ? action?.kind && null : (stryCov_9fa48("21043"), (stryMutAct_9fa48("21044") ? action.kind : (stryCov_9fa48("21044"), action?.kind)) ?? null);
  }
}

/**
 * OPPORTUNISTIC send gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLxmfOpportunisticSendPlanWithActions}
 * (`ok`|`missing-destination`).
 */
export type LxmfOpportunisticSendState = Record<string, never>;
export type LxmfOpportunisticSendEvent = Event | {
  readonly kind: "opportunistic-send/gate";
  readonly destinationPresent: boolean;
};

/**
 * Adapter applies proceed / reject only from these actions.
 * Plan nested via {@link stepLxmfOpportunisticSendPlanWithActions}
 * (`ok`|`missing-destination`).
 */
export type LxmfOpportunisticSendAction = {
  readonly kind: "proceed";
} | {
  readonly kind: "reject-missing-destination";
};
export interface LxmfOpportunisticSendStepResult {
  readonly state: LxmfOpportunisticSendState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LxmfOpportunisticSendAction[];
}
export function initialLxmfOpportunisticSendState(): LxmfOpportunisticSendState {
  if (stryMutAct_9fa48("21045")) {
    {}
  } else {
    stryCov_9fa48("21045");
    return {};
  }
}
export const stepLxmfOpportunisticSend: StepFn<LxmfOpportunisticSendState> = (state, event) => {
  if (stryMutAct_9fa48("21046")) {
    {}
  } else {
    stryCov_9fa48("21046");
    const result = stepLxmfOpportunisticSendInner(state, event as LxmfOpportunisticSendEvent);
    return stryMutAct_9fa48("21047") ? {} : (stryCov_9fa48("21047"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLxmfOpportunisticSendWithActions(state: LxmfOpportunisticSendState, event: LxmfOpportunisticSendEvent): LxmfOpportunisticSendStepResult {
  if (stryMutAct_9fa48("21048")) {
    {}
  } else {
    stryCov_9fa48("21048");
    return stepLxmfOpportunisticSendInner(state, event);
  }
}
export function shouldProceedLxmfOpportunisticSend(actions: ReadonlyArray<LxmfOpportunisticSendAction>): boolean {
  if (stryMutAct_9fa48("21049")) {
    {}
  } else {
    stryCov_9fa48("21049");
    return stryMutAct_9fa48("21050") ? actions.every(action => action.kind === "proceed") : (stryCov_9fa48("21050"), actions.some(stryMutAct_9fa48("21051") ? () => undefined : (stryCov_9fa48("21051"), action => stryMutAct_9fa48("21054") ? action.kind !== "proceed" : stryMutAct_9fa48("21053") ? false : stryMutAct_9fa48("21052") ? true : (stryCov_9fa48("21052", "21053", "21054"), action.kind === (stryMutAct_9fa48("21055") ? "" : (stryCov_9fa48("21055"), "proceed"))))));
  }
}
export function shouldRejectLxmfOpportunisticMissingDestination(actions: ReadonlyArray<LxmfOpportunisticSendAction>): boolean {
  if (stryMutAct_9fa48("21056")) {
    {}
  } else {
    stryCov_9fa48("21056");
    return stryMutAct_9fa48("21057") ? actions.every(action => action.kind === "reject-missing-destination") : (stryCov_9fa48("21057"), actions.some(stryMutAct_9fa48("21058") ? () => undefined : (stryCov_9fa48("21058"), action => stryMutAct_9fa48("21061") ? action.kind !== "reject-missing-destination" : stryMutAct_9fa48("21060") ? false : stryMutAct_9fa48("21059") ? true : (stryCov_9fa48("21059", "21060", "21061"), action.kind === (stryMutAct_9fa48("21062") ? "" : (stryCov_9fa48("21062"), "reject-missing-destination"))))));
  }
}
function stepLxmfOpportunisticSendInner(state: LxmfOpportunisticSendState, event: LxmfOpportunisticSendEvent): LxmfOpportunisticSendStepResult {
  if (stryMutAct_9fa48("21063")) {
    {}
  } else {
    stryCov_9fa48("21063");
    if (stryMutAct_9fa48("21066") ? event.kind !== "opportunistic-send/gate" : stryMutAct_9fa48("21065") ? false : stryMutAct_9fa48("21064") ? true : (stryCov_9fa48("21064", "21065", "21066"), event.kind === (stryMutAct_9fa48("21067") ? "" : (stryCov_9fa48("21067"), "opportunistic-send/gate")))) {
      if (stryMutAct_9fa48("21068")) {
        {}
      } else {
        stryCov_9fa48("21068");
        const planActions = stepLxmfOpportunisticSendPlanWithActions(initialLxmfOpportunisticSendPlanState(), stryMutAct_9fa48("21069") ? {} : (stryCov_9fa48("21069"), {
          kind: stryMutAct_9fa48("21070") ? "" : (stryCov_9fa48("21070"), "opportunistic-send/plan-gate"),
          destinationPresent: event.destinationPresent
        })).actions;
        if (stryMutAct_9fa48("21072") ? false : stryMutAct_9fa48("21071") ? true : (stryCov_9fa48("21071", "21072"), shouldRejectLxmfOpportunisticSendPlanMissingDestination(planActions))) {
          if (stryMutAct_9fa48("21073")) {
            {}
          } else {
            stryCov_9fa48("21073");
            return stryMutAct_9fa48("21074") ? {} : (stryCov_9fa48("21074"), {
              state,
              intents: stryMutAct_9fa48("21075") ? ["Stryker was here"] : (stryCov_9fa48("21075"), []),
              actions: stryMutAct_9fa48("21076") ? [] : (stryCov_9fa48("21076"), [stryMutAct_9fa48("21077") ? {} : (stryCov_9fa48("21077"), {
                kind: stryMutAct_9fa48("21078") ? "" : (stryCov_9fa48("21078"), "reject-missing-destination")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("21081") ? false : stryMutAct_9fa48("21080") ? true : stryMutAct_9fa48("21079") ? shouldPlanLxmfOpportunisticSendOk(planActions) : (stryCov_9fa48("21079", "21080", "21081"), !shouldPlanLxmfOpportunisticSendOk(planActions))) {
          if (stryMutAct_9fa48("21082")) {
            {}
          } else {
            stryCov_9fa48("21082");
            return stryMutAct_9fa48("21083") ? {} : (stryCov_9fa48("21083"), {
              state,
              intents: stryMutAct_9fa48("21084") ? ["Stryker was here"] : (stryCov_9fa48("21084"), []),
              actions: stryMutAct_9fa48("21085") ? ["Stryker was here"] : (stryCov_9fa48("21085"), [])
            });
          }
        }
        return stryMutAct_9fa48("21086") ? {} : (stryCov_9fa48("21086"), {
          state,
          intents: stryMutAct_9fa48("21087") ? ["Stryker was here"] : (stryCov_9fa48("21087"), []),
          actions: stryMutAct_9fa48("21088") ? [] : (stryCov_9fa48("21088"), [stryMutAct_9fa48("21089") ? {} : (stryCov_9fa48("21089"), {
            kind: stryMutAct_9fa48("21090") ? "" : (stryCov_9fa48("21090"), "proceed")
          })])
        });
      }
    }
    return stryMutAct_9fa48("21091") ? {} : (stryCov_9fa48("21091"), {
      state,
      intents: stryMutAct_9fa48("21092") ? ["Stryker was here"] : (stryCov_9fa48("21092"), []),
      actions: stryMutAct_9fa48("21093") ? ["Stryker was here"] : (stryCov_9fa48("21093"), [])
    });
  }
}
export type LxMessageInstancePackGate = "ok" | "already-packed" | "missing-endpoints" | "missing-timestamp";

/** Whether an LXMessage instance may pack (already-packed / endpoints / timestamp). */
export function planLxMessageInstancePack(input: {
  readonly alreadyPacked: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
  readonly timestampPresent: boolean;
}): LxMessageInstancePackGate {
  if (stryMutAct_9fa48("21094")) {
    {}
  } else {
    stryCov_9fa48("21094");
    if (stryMutAct_9fa48("21096") ? false : stryMutAct_9fa48("21095") ? true : (stryCov_9fa48("21095", "21096"), input.alreadyPacked)) {
      if (stryMutAct_9fa48("21097")) {
        {}
      } else {
        stryCov_9fa48("21097");
        return stryMutAct_9fa48("21098") ? "" : (stryCov_9fa48("21098"), "already-packed");
      }
    }
    if (stryMutAct_9fa48("21101") ? (!input.destinationPresent || !input.sourcePresent) && !input.sourceIdentityPresent : stryMutAct_9fa48("21100") ? false : stryMutAct_9fa48("21099") ? true : (stryCov_9fa48("21099", "21100", "21101"), (stryMutAct_9fa48("21103") ? !input.destinationPresent && !input.sourcePresent : stryMutAct_9fa48("21102") ? false : (stryCov_9fa48("21102", "21103"), (stryMutAct_9fa48("21104") ? input.destinationPresent : (stryCov_9fa48("21104"), !input.destinationPresent)) || (stryMutAct_9fa48("21105") ? input.sourcePresent : (stryCov_9fa48("21105"), !input.sourcePresent)))) || (stryMutAct_9fa48("21106") ? input.sourceIdentityPresent : (stryCov_9fa48("21106"), !input.sourceIdentityPresent)))) {
      if (stryMutAct_9fa48("21107")) {
        {}
      } else {
        stryCov_9fa48("21107");
        return stryMutAct_9fa48("21108") ? "" : (stryCov_9fa48("21108"), "missing-endpoints");
      }
    }
    if (stryMutAct_9fa48("21111") ? false : stryMutAct_9fa48("21110") ? true : stryMutAct_9fa48("21109") ? input.timestampPresent : (stryCov_9fa48("21109", "21110", "21111"), !input.timestampPresent)) {
      if (stryMutAct_9fa48("21112")) {
        {}
      } else {
        stryCov_9fa48("21112");
        return stryMutAct_9fa48("21113") ? "" : (stryCov_9fa48("21113"), "missing-timestamp");
      }
    }
    return stryMutAct_9fa48("21114") ? "" : (stryCov_9fa48("21114"), "ok");
  }
}
export type LxMessageInstancePackPlanEvent = Event | {
  readonly kind: "instance-pack/plan-gate";
  readonly alreadyPacked: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
  readonly timestampPresent: boolean;
};
export type LxMessageInstancePackPlanAction = {
  readonly kind: "ok";
} | {
  readonly kind: "already-packed";
} | {
  readonly kind: "missing-endpoints";
} | {
  readonly kind: "missing-timestamp";
};

/** Whether instance-pack-plan actions allow packing to proceed. */
export function shouldPlanLxMessageInstancePackOk(actions: ReadonlyArray<LxMessageInstancePackPlanAction>): boolean {
  if (stryMutAct_9fa48("21115")) {
    {}
  } else {
    stryCov_9fa48("21115");
    return stryMutAct_9fa48("21116") ? actions.every(action => action.kind === "ok") : (stryCov_9fa48("21116"), actions.some(stryMutAct_9fa48("21117") ? () => undefined : (stryCov_9fa48("21117"), action => stryMutAct_9fa48("21120") ? action.kind !== "ok" : stryMutAct_9fa48("21119") ? false : stryMutAct_9fa48("21118") ? true : (stryCov_9fa48("21118", "21119", "21120"), action.kind === (stryMutAct_9fa48("21121") ? "" : (stryCov_9fa48("21121"), "ok"))))));
  }
}

/** Whether instance-pack-plan actions reject an already-packed message. */
export function shouldRejectLxMessageInstancePackPlanAlreadyPacked(actions: ReadonlyArray<LxMessageInstancePackPlanAction>): boolean {
  if (stryMutAct_9fa48("21122")) {
    {}
  } else {
    stryCov_9fa48("21122");
    return stryMutAct_9fa48("21123") ? actions.every(action => action.kind === "already-packed") : (stryCov_9fa48("21123"), actions.some(stryMutAct_9fa48("21124") ? () => undefined : (stryCov_9fa48("21124"), action => stryMutAct_9fa48("21127") ? action.kind !== "already-packed" : stryMutAct_9fa48("21126") ? false : stryMutAct_9fa48("21125") ? true : (stryCov_9fa48("21125", "21126", "21127"), action.kind === (stryMutAct_9fa48("21128") ? "" : (stryCov_9fa48("21128"), "already-packed"))))));
  }
}

/** Whether instance-pack-plan actions reject missing endpoints. */
export function shouldRejectLxMessageInstancePackPlanMissingEndpoints(actions: ReadonlyArray<LxMessageInstancePackPlanAction>): boolean {
  if (stryMutAct_9fa48("21129")) {
    {}
  } else {
    stryCov_9fa48("21129");
    return stryMutAct_9fa48("21130") ? actions.every(action => action.kind === "missing-endpoints") : (stryCov_9fa48("21130"), actions.some(stryMutAct_9fa48("21131") ? () => undefined : (stryCov_9fa48("21131"), action => stryMutAct_9fa48("21134") ? action.kind !== "missing-endpoints" : stryMutAct_9fa48("21133") ? false : stryMutAct_9fa48("21132") ? true : (stryCov_9fa48("21132", "21133", "21134"), action.kind === (stryMutAct_9fa48("21135") ? "" : (stryCov_9fa48("21135"), "missing-endpoints"))))));
  }
}

/** Whether instance-pack-plan actions reject a missing timestamp. */
export function shouldRejectLxMessageInstancePackPlanMissingTimestamp(actions: ReadonlyArray<LxMessageInstancePackPlanAction>): boolean {
  if (stryMutAct_9fa48("21136")) {
    {}
  } else {
    stryCov_9fa48("21136");
    return stryMutAct_9fa48("21137") ? actions.every(action => action.kind === "missing-timestamp") : (stryCov_9fa48("21137"), actions.some(stryMutAct_9fa48("21138") ? () => undefined : (stryCov_9fa48("21138"), action => stryMutAct_9fa48("21141") ? action.kind !== "missing-timestamp" : stryMutAct_9fa48("21140") ? false : stryMutAct_9fa48("21139") ? true : (stryCov_9fa48("21139", "21140", "21141"), action.kind === (stryMutAct_9fa48("21142") ? "" : (stryCov_9fa48("21142"), "missing-timestamp"))))));
  }
}
export type LxMessageInstancePackEvent = Event | {
  readonly kind: "instance-pack/gate";
  readonly alreadyPacked: boolean;
  readonly destinationPresent: boolean;
  readonly sourcePresent: boolean;
  readonly sourceIdentityPresent: boolean;
  readonly timestampPresent: boolean;
};