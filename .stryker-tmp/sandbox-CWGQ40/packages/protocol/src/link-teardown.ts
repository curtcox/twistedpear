/**
 * Pure link teardown gate and reason planning.
 * Packet send / decrypt stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc `plan.kind` /
 * `planLinkTeardown` / `shouldAcceptLinkTeardown` / `planLinkTeardownReason`
 * reads beside the step).
 * Teardown plan nested via {@link stepLinkTeardownPlanWithActions}.
 * Reason plan nested via {@link stepLinkTeardownReasonPlanWithActions}.
 */
// @ts-nocheck
function stryNS_9fa48() {
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
import { LinkStatus, LinkTeardownReason, type LinkStatusValue, type LinkTeardownReasonValue } from "./link-watchdog.js";
export type LinkTeardownPlan = {
  readonly kind: "close-only";
} | {
  readonly kind: "send-teardown-then-close";
};
export interface LinkTeardownState {
  readonly status: LinkStatusValue | number;
  readonly initiator: boolean;
}
export type LinkTeardownEvent = Event | {
  readonly kind: "teardown/local";
} | {
  readonly kind: "teardown/remote";
  readonly plaintextPresent: boolean;
  readonly linkIdMatches: boolean;
};

/**
 * Adapter applies close / send-LINKCLOSE / remote-close only from these actions.
 */
export type LinkTeardownAction = {
  readonly kind: "close-only";
} | {
  readonly kind: "send-teardown-then-close";
  readonly reason: LinkTeardownReasonValue;
} | {
  readonly kind: "accept-remote-close";
  readonly reason: LinkTeardownReasonValue;
};
export interface LinkTeardownStepResult {
  readonly state: LinkTeardownState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownAction[];
}
export function initialLinkTeardownState(input: {
  readonly status: LinkStatusValue | number;
  readonly initiator: boolean;
}): LinkTeardownState {
  if (stryMutAct_9fa48("17854")) {
    {}
  } else {
    stryCov_9fa48("17854");
    return stryMutAct_9fa48("17855") ? {} : (stryCov_9fa48("17855"), {
      status: input.status,
      initiator: input.initiator
    });
  }
}

/** PENDING/CLOSED links only close; otherwise send LINKCLOSE first. */
export function planLinkTeardown(status: LinkStatusValue | number): LinkTeardownPlan {
  if (stryMutAct_9fa48("17856")) {
    {}
  } else {
    stryCov_9fa48("17856");
    if (stryMutAct_9fa48("17859") ? status === LinkStatus.PENDING && status === LinkStatus.CLOSED : stryMutAct_9fa48("17858") ? false : stryMutAct_9fa48("17857") ? true : (stryCov_9fa48("17857", "17858", "17859"), (stryMutAct_9fa48("17861") ? status !== LinkStatus.PENDING : stryMutAct_9fa48("17860") ? false : (stryCov_9fa48("17860", "17861"), status === LinkStatus.PENDING)) || (stryMutAct_9fa48("17863") ? status !== LinkStatus.CLOSED : stryMutAct_9fa48("17862") ? false : (stryCov_9fa48("17862", "17863"), status === LinkStatus.CLOSED)))) {
      if (stryMutAct_9fa48("17864")) {
        {}
      } else {
        stryCov_9fa48("17864");
        return stryMutAct_9fa48("17865") ? {} : (stryCov_9fa48("17865"), {
          kind: stryMutAct_9fa48("17866") ? "" : (stryCov_9fa48("17866"), "close-only")
        });
      }
    }
    return stryMutAct_9fa48("17867") ? {} : (stryCov_9fa48("17867"), {
      kind: stryMutAct_9fa48("17868") ? "" : (stryCov_9fa48("17868"), "send-teardown-then-close")
    });
  }
}

/**
 * planLinkTeardown planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTeardown` /
 * `plan.kind` reads beside the step).
 */
export type LinkTeardownPlanState = Record<string, never>;
export type LinkTeardownPlanEvent = Event | {
  readonly kind: "link/teardown-plan-gate";
  readonly status: LinkStatusValue | number;
};
export type LinkTeardownPlanAction = {
  readonly kind: "close-only";
} | {
  readonly kind: "send-teardown-then-close";
};
export interface LinkTeardownPlanStepResult {
  readonly state: LinkTeardownPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownPlanAction[];
}
export function initialLinkTeardownPlanState(): LinkTeardownPlanState {
  if (stryMutAct_9fa48("17869")) {
    {}
  } else {
    stryCov_9fa48("17869");
    return {};
  }
}
export function stepLinkTeardownPlanWithActions(state: LinkTeardownPlanState, event: LinkTeardownPlanEvent): LinkTeardownPlanStepResult {
  if (stryMutAct_9fa48("17870")) {
    {}
  } else {
    stryCov_9fa48("17870");
    if (stryMutAct_9fa48("17873") ? event.kind !== "link/teardown-plan-gate" : stryMutAct_9fa48("17872") ? false : stryMutAct_9fa48("17871") ? true : (stryCov_9fa48("17871", "17872", "17873"), event.kind === (stryMutAct_9fa48("17874") ? "" : (stryCov_9fa48("17874"), "link/teardown-plan-gate")))) {
      if (stryMutAct_9fa48("17875")) {
        {}
      } else {
        stryCov_9fa48("17875");
        return stryMutAct_9fa48("17876") ? {} : (stryCov_9fa48("17876"), {
          state,
          intents: stryMutAct_9fa48("17877") ? ["Stryker was here"] : (stryCov_9fa48("17877"), []),
          actions: stryMutAct_9fa48("17878") ? [] : (stryCov_9fa48("17878"), [planLinkTeardown(event.status)])
        });
      }
    }
    return stryMutAct_9fa48("17879") ? {} : (stryCov_9fa48("17879"), {
      state,
      intents: stryMutAct_9fa48("17880") ? ["Stryker was here"] : (stryCov_9fa48("17880"), []),
      actions: stryMutAct_9fa48("17881") ? ["Stryker was here"] : (stryCov_9fa48("17881"), [])
    });
  }
}

/** Whether step actions include close-only. */
export function shouldCloseOnlyLinkTeardownPlan(actions: ReadonlyArray<LinkTeardownPlanAction>): boolean {
  if (stryMutAct_9fa48("17882")) {
    {}
  } else {
    stryCov_9fa48("17882");
    return stryMutAct_9fa48("17883") ? actions.every(action => action.kind === "close-only") : (stryCov_9fa48("17883"), actions.some(stryMutAct_9fa48("17884") ? () => undefined : (stryCov_9fa48("17884"), action => stryMutAct_9fa48("17887") ? action.kind !== "close-only" : stryMutAct_9fa48("17886") ? false : stryMutAct_9fa48("17885") ? true : (stryCov_9fa48("17885", "17886", "17887"), action.kind === (stryMutAct_9fa48("17888") ? "" : (stryCov_9fa48("17888"), "close-only"))))));
  }
}

/** Whether step actions include send-teardown-then-close. */
export function shouldSendLinkTeardownThenClosePlan(actions: ReadonlyArray<LinkTeardownPlanAction>): boolean {
  if (stryMutAct_9fa48("17889")) {
    {}
  } else {
    stryCov_9fa48("17889");
    return stryMutAct_9fa48("17890") ? actions.every(action => action.kind === "send-teardown-then-close") : (stryCov_9fa48("17890"), actions.some(stryMutAct_9fa48("17891") ? () => undefined : (stryCov_9fa48("17891"), action => stryMutAct_9fa48("17894") ? action.kind !== "send-teardown-then-close" : stryMutAct_9fa48("17893") ? false : stryMutAct_9fa48("17892") ? true : (stryCov_9fa48("17892", "17893", "17894"), action.kind === (stryMutAct_9fa48("17895") ? "" : (stryCov_9fa48("17895"), "send-teardown-then-close"))))));
  }
}

/** Extract teardown plan from step actions; null when empty. */
export function linkTeardownPlanFromActions(actions: ReadonlyArray<LinkTeardownPlanAction>): LinkTeardownPlan | null {
  if (stryMutAct_9fa48("17896")) {
    {}
  } else {
    stryCov_9fa48("17896");
    const action = actions.find(stryMutAct_9fa48("17897") ? () => undefined : (stryCov_9fa48("17897"), entry => stryMutAct_9fa48("17900") ? entry.kind === "close-only" && entry.kind === "send-teardown-then-close" : stryMutAct_9fa48("17899") ? false : stryMutAct_9fa48("17898") ? true : (stryCov_9fa48("17898", "17899", "17900"), (stryMutAct_9fa48("17902") ? entry.kind !== "close-only" : stryMutAct_9fa48("17901") ? false : (stryCov_9fa48("17901", "17902"), entry.kind === (stryMutAct_9fa48("17903") ? "" : (stryCov_9fa48("17903"), "close-only")))) || (stryMutAct_9fa48("17905") ? entry.kind !== "send-teardown-then-close" : stryMutAct_9fa48("17904") ? false : (stryCov_9fa48("17904", "17905"), entry.kind === (stryMutAct_9fa48("17906") ? "" : (stryCov_9fa48("17906"), "send-teardown-then-close")))))));
    return stryMutAct_9fa48("17907") ? action && null : (stryCov_9fa48("17907"), action ?? null);
  }
}

/**
 * Local teardown: initiator closed vs destination closed.
 * Remote peer teardown inverts the reason relative to this node.
 */
export function planLinkTeardownReason(input: {
  readonly initiator: boolean;
  readonly remote: boolean;
}): LinkTeardownReasonValue {
  if (stryMutAct_9fa48("17908")) {
    {}
  } else {
    stryCov_9fa48("17908");
    if (stryMutAct_9fa48("17910") ? false : stryMutAct_9fa48("17909") ? true : (stryCov_9fa48("17909", "17910"), input.remote)) {
      if (stryMutAct_9fa48("17911")) {
        {}
      } else {
        stryCov_9fa48("17911");
        return input.initiator ? LinkTeardownReason.DESTINATION_CLOSED : LinkTeardownReason.INITIATOR_CLOSED;
      }
    }
    return input.initiator ? LinkTeardownReason.INITIATOR_CLOSED : LinkTeardownReason.DESTINATION_CLOSED;
  }
}

/**
 * planLinkTeardownReason planning is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTeardownReason`
 * reads beside the step). Nested under {@link stepLinkTeardownReasonWithActions}.
 */
export type LinkTeardownReasonPlanState = Record<string, never>;
export type LinkTeardownReasonPlanEvent = Event | {
  readonly kind: "link/teardown-reason-plan-gate";
  readonly initiator: boolean;
  readonly remote: boolean;
};
export type LinkTeardownReasonPlanAction = {
  readonly kind: "use-reason";
  readonly reason: LinkTeardownReasonValue;
};
export interface LinkTeardownReasonPlanStepResult {
  readonly state: LinkTeardownReasonPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownReasonPlanAction[];
}
export function initialLinkTeardownReasonPlanState(): LinkTeardownReasonPlanState {
  if (stryMutAct_9fa48("17912")) {
    {}
  } else {
    stryCov_9fa48("17912");
    return {};
  }
}
export function stepLinkTeardownReasonPlanWithActions(state: LinkTeardownReasonPlanState, event: LinkTeardownReasonPlanEvent): LinkTeardownReasonPlanStepResult {
  if (stryMutAct_9fa48("17913")) {
    {}
  } else {
    stryCov_9fa48("17913");
    if (stryMutAct_9fa48("17916") ? event.kind !== "link/teardown-reason-plan-gate" : stryMutAct_9fa48("17915") ? false : stryMutAct_9fa48("17914") ? true : (stryCov_9fa48("17914", "17915", "17916"), event.kind === (stryMutAct_9fa48("17917") ? "" : (stryCov_9fa48("17917"), "link/teardown-reason-plan-gate")))) {
      if (stryMutAct_9fa48("17918")) {
        {}
      } else {
        stryCov_9fa48("17918");
        return stryMutAct_9fa48("17919") ? {} : (stryCov_9fa48("17919"), {
          state,
          intents: stryMutAct_9fa48("17920") ? ["Stryker was here"] : (stryCov_9fa48("17920"), []),
          actions: stryMutAct_9fa48("17921") ? [] : (stryCov_9fa48("17921"), [stryMutAct_9fa48("17922") ? {} : (stryCov_9fa48("17922"), {
            kind: stryMutAct_9fa48("17923") ? "" : (stryCov_9fa48("17923"), "use-reason"),
            reason: planLinkTeardownReason(stryMutAct_9fa48("17924") ? {} : (stryCov_9fa48("17924"), {
              initiator: event.initiator,
              remote: event.remote
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("17925") ? {} : (stryCov_9fa48("17925"), {
      state,
      intents: stryMutAct_9fa48("17926") ? ["Stryker was here"] : (stryCov_9fa48("17926"), []),
      actions: stryMutAct_9fa48("17927") ? ["Stryker was here"] : (stryCov_9fa48("17927"), [])
    });
  }
}
export function shouldUseLinkTeardownReasonPlan(actions: ReadonlyArray<LinkTeardownReasonPlanAction>): boolean {
  if (stryMutAct_9fa48("17928")) {
    {}
  } else {
    stryCov_9fa48("17928");
    return stryMutAct_9fa48("17929") ? actions.every(action => action.kind === "use-reason") : (stryCov_9fa48("17929"), actions.some(stryMutAct_9fa48("17930") ? () => undefined : (stryCov_9fa48("17930"), action => stryMutAct_9fa48("17933") ? action.kind !== "use-reason" : stryMutAct_9fa48("17932") ? false : stryMutAct_9fa48("17931") ? true : (stryCov_9fa48("17931", "17932", "17933"), action.kind === (stryMutAct_9fa48("17934") ? "" : (stryCov_9fa48("17934"), "use-reason"))))));
  }
}

/** Extract teardown reason from plan-step actions; null when no `use-reason`. */
export function linkTeardownReasonPlanFromActions(actions: ReadonlyArray<LinkTeardownReasonPlanAction>): LinkTeardownReasonValue | null {
  if (stryMutAct_9fa48("17935")) {
    {}
  } else {
    stryCov_9fa48("17935");
    const action = actions.find(stryMutAct_9fa48("17936") ? () => undefined : (stryCov_9fa48("17936"), entry => stryMutAct_9fa48("17939") ? entry.kind !== "use-reason" : stryMutAct_9fa48("17938") ? false : stryMutAct_9fa48("17937") ? true : (stryCov_9fa48("17937", "17938", "17939"), entry.kind === (stryMutAct_9fa48("17940") ? "" : (stryCov_9fa48("17940"), "use-reason")))));
    return (stryMutAct_9fa48("17943") ? action?.kind !== "use-reason" : stryMutAct_9fa48("17942") ? false : stryMutAct_9fa48("17941") ? true : (stryCov_9fa48("17941", "17942", "17943"), (stryMutAct_9fa48("17944") ? action.kind : (stryCov_9fa48("17944"), action?.kind)) === (stryMutAct_9fa48("17945") ? "" : (stryCov_9fa48("17945"), "use-reason")))) ? action.reason : null;
  }
}

/**
 * Teardown-reason gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTeardownReason`
 * reads beside the step).
 * Plan nested via {@link stepLinkTeardownReasonPlanWithActions} (`use-reason`).
 */
export type LinkTeardownReasonState = Record<string, never>;
export type LinkTeardownReasonEvent = Event | {
  readonly kind: "link/teardown-reason-gate";
  readonly initiator: boolean;
  readonly remote: boolean;
};
export type LinkTeardownReasonAction = {
  readonly kind: "use-reason";
  readonly reason: LinkTeardownReasonValue;
};
export interface LinkTeardownReasonStepResult {
  readonly state: LinkTeardownReasonState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTeardownReasonAction[];
}
export function initialLinkTeardownReasonState(): LinkTeardownReasonState {
  if (stryMutAct_9fa48("17946")) {
    {}
  } else {
    stryCov_9fa48("17946");
    return {};
  }
}
export function stepLinkTeardownReasonWithActions(state: LinkTeardownReasonState, event: LinkTeardownReasonEvent): LinkTeardownReasonStepResult {
  if (stryMutAct_9fa48("17947")) {
    {}
  } else {
    stryCov_9fa48("17947");
    if (stryMutAct_9fa48("17950") ? event.kind !== "link/teardown-reason-gate" : stryMutAct_9fa48("17949") ? false : stryMutAct_9fa48("17948") ? true : (stryCov_9fa48("17948", "17949", "17950"), event.kind === (stryMutAct_9fa48("17951") ? "" : (stryCov_9fa48("17951"), "link/teardown-reason-gate")))) {
      if (stryMutAct_9fa48("17952")) {
        {}
      } else {
        stryCov_9fa48("17952");
        const planActions = stepLinkTeardownReasonPlanWithActions(initialLinkTeardownReasonPlanState(), stryMutAct_9fa48("17953") ? {} : (stryCov_9fa48("17953"), {
          kind: stryMutAct_9fa48("17954") ? "" : (stryCov_9fa48("17954"), "link/teardown-reason-plan-gate"),
          initiator: event.initiator,
          remote: event.remote
        })).actions;
        const reason = linkTeardownReasonPlanFromActions(planActions);
        if (stryMutAct_9fa48("17957") ? reason !== null : stryMutAct_9fa48("17956") ? false : stryMutAct_9fa48("17955") ? true : (stryCov_9fa48("17955", "17956", "17957"), reason === null)) {
          if (stryMutAct_9fa48("17958")) {
            {}
          } else {
            stryCov_9fa48("17958");
            return stryMutAct_9fa48("17959") ? {} : (stryCov_9fa48("17959"), {
              state,
              intents: stryMutAct_9fa48("17960") ? ["Stryker was here"] : (stryCov_9fa48("17960"), []),
              actions: stryMutAct_9fa48("17961") ? ["Stryker was here"] : (stryCov_9fa48("17961"), [])
            });
          }
        }
        return stryMutAct_9fa48("17962") ? {} : (stryCov_9fa48("17962"), {
          state,
          intents: stryMutAct_9fa48("17963") ? ["Stryker was here"] : (stryCov_9fa48("17963"), []),
          actions: stryMutAct_9fa48("17964") ? [] : (stryCov_9fa48("17964"), [stryMutAct_9fa48("17965") ? {} : (stryCov_9fa48("17965"), {
            kind: stryMutAct_9fa48("17966") ? "" : (stryCov_9fa48("17966"), "use-reason"),
            reason
          })])
        });
      }
    }
    return stryMutAct_9fa48("17967") ? {} : (stryCov_9fa48("17967"), {
      state,
      intents: stryMutAct_9fa48("17968") ? ["Stryker was here"] : (stryCov_9fa48("17968"), []),
      actions: stryMutAct_9fa48("17969") ? ["Stryker was here"] : (stryCov_9fa48("17969"), [])
    });
  }
}
export function shouldUseLinkTeardownReason(actions: ReadonlyArray<LinkTeardownReasonAction>): boolean {
  if (stryMutAct_9fa48("17970")) {
    {}
  } else {
    stryCov_9fa48("17970");
    return stryMutAct_9fa48("17971") ? actions.every(action => action.kind === "use-reason") : (stryCov_9fa48("17971"), actions.some(stryMutAct_9fa48("17972") ? () => undefined : (stryCov_9fa48("17972"), action => stryMutAct_9fa48("17975") ? action.kind !== "use-reason" : stryMutAct_9fa48("17974") ? false : stryMutAct_9fa48("17973") ? true : (stryCov_9fa48("17973", "17974", "17975"), action.kind === (stryMutAct_9fa48("17976") ? "" : (stryCov_9fa48("17976"), "use-reason"))))));
  }
}

/** Extract teardown reason from step actions; null when no `use-reason`. */
export function linkTeardownReasonFromActions(actions: ReadonlyArray<LinkTeardownReasonAction>): LinkTeardownReasonValue | null {
  if (stryMutAct_9fa48("17977")) {
    {}
  } else {
    stryCov_9fa48("17977");
    const action = actions.find(stryMutAct_9fa48("17978") ? () => undefined : (stryCov_9fa48("17978"), entry => stryMutAct_9fa48("17981") ? entry.kind !== "use-reason" : stryMutAct_9fa48("17980") ? false : stryMutAct_9fa48("17979") ? true : (stryCov_9fa48("17979", "17980", "17981"), entry.kind === (stryMutAct_9fa48("17982") ? "" : (stryCov_9fa48("17982"), "use-reason")))));
    return (stryMutAct_9fa48("17985") ? action?.kind !== "use-reason" : stryMutAct_9fa48("17984") ? false : stryMutAct_9fa48("17983") ? true : (stryCov_9fa48("17983", "17984", "17985"), (stryMutAct_9fa48("17986") ? action.kind : (stryCov_9fa48("17986"), action?.kind)) === (stryMutAct_9fa48("17987") ? "" : (stryCov_9fa48("17987"), "use-reason")))) ? action.reason : null;
  }
}

/** Whether a decrypted LINKCLOSE payload is acceptable for this link. */
export function shouldAcceptLinkTeardown(input: {
  readonly plaintextPresent: boolean;
  readonly linkIdMatches: boolean;
}): boolean {
  if (stryMutAct_9fa48("17988")) {
    {}
  } else {
    stryCov_9fa48("17988");
    return stryMutAct_9fa48("17991") ? input.plaintextPresent || input.linkIdMatches : stryMutAct_9fa48("17990") ? false : stryMutAct_9fa48("17989") ? true : (stryCov_9fa48("17989", "17990", "17991"), input.plaintextPresent && input.linkIdMatches);
  }
}

/**
 * shouldAcceptLinkTeardown gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAcceptLinkTeardown`
 * reads beside the step).
 */
export type AcceptLinkTeardownState = Record<string, never>;
export type AcceptLinkTeardownEvent = Event | {
  readonly kind: "link/accept-teardown-gate";
  readonly plaintextPresent: boolean;
  readonly linkIdMatches: boolean;
};
export type AcceptLinkTeardownAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptLinkTeardownStepResult {
  readonly state: AcceptLinkTeardownState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkTeardownAction[];
}
export function initialAcceptLinkTeardownState(): AcceptLinkTeardownState {
  if (stryMutAct_9fa48("17992")) {
    {}
  } else {
    stryCov_9fa48("17992");
    return {};
  }
}
export function stepAcceptLinkTeardownWithActions(state: AcceptLinkTeardownState, event: AcceptLinkTeardownEvent): AcceptLinkTeardownStepResult {
  if (stryMutAct_9fa48("17993")) {
    {}
  } else {
    stryCov_9fa48("17993");
    if (stryMutAct_9fa48("17996") ? event.kind !== "link/accept-teardown-gate" : stryMutAct_9fa48("17995") ? false : stryMutAct_9fa48("17994") ? true : (stryCov_9fa48("17994", "17995", "17996"), event.kind === (stryMutAct_9fa48("17997") ? "" : (stryCov_9fa48("17997"), "link/accept-teardown-gate")))) {
      if (stryMutAct_9fa48("17998")) {
        {}
      } else {
        stryCov_9fa48("17998");
        return stryMutAct_9fa48("17999") ? {} : (stryCov_9fa48("17999"), {
          state,
          intents: stryMutAct_9fa48("18000") ? ["Stryker was here"] : (stryCov_9fa48("18000"), []),
          actions: stryMutAct_9fa48("18001") ? [] : (stryCov_9fa48("18001"), [stryMutAct_9fa48("18002") ? {} : (stryCov_9fa48("18002"), {
            kind: shouldAcceptLinkTeardown(stryMutAct_9fa48("18003") ? {} : (stryCov_9fa48("18003"), {
              plaintextPresent: event.plaintextPresent,
              linkIdMatches: event.linkIdMatches
            })) ? stryMutAct_9fa48("18004") ? "" : (stryCov_9fa48("18004"), "accept") : stryMutAct_9fa48("18005") ? "" : (stryCov_9fa48("18005"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("18006") ? {} : (stryCov_9fa48("18006"), {
      state,
      intents: stryMutAct_9fa48("18007") ? ["Stryker was here"] : (stryCov_9fa48("18007"), []),
      actions: stryMutAct_9fa48("18008") ? ["Stryker was here"] : (stryCov_9fa48("18008"), [])
    });
  }
}
export function shouldAcceptLinkTeardownNow(actions: ReadonlyArray<AcceptLinkTeardownAction>): boolean {
  if (stryMutAct_9fa48("18009")) {
    {}
  } else {
    stryCov_9fa48("18009");
    return stryMutAct_9fa48("18010") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("18010"), actions.some(stryMutAct_9fa48("18011") ? () => undefined : (stryCov_9fa48("18011"), action => stryMutAct_9fa48("18014") ? action.kind !== "accept" : stryMutAct_9fa48("18013") ? false : stryMutAct_9fa48("18012") ? true : (stryCov_9fa48("18012", "18013", "18014"), action.kind === (stryMutAct_9fa48("18015") ? "" : (stryCov_9fa48("18015"), "accept"))))));
  }
}
export function shouldSkipLinkTeardownAccept(actions: ReadonlyArray<AcceptLinkTeardownAction>): boolean {
  if (stryMutAct_9fa48("18016")) {
    {}
  } else {
    stryCov_9fa48("18016");
    return stryMutAct_9fa48("18017") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("18017"), actions.some(stryMutAct_9fa48("18018") ? () => undefined : (stryCov_9fa48("18018"), action => stryMutAct_9fa48("18021") ? action.kind !== "skip" : stryMutAct_9fa48("18020") ? false : stryMutAct_9fa48("18019") ? true : (stryCov_9fa48("18019", "18020", "18021"), action.kind === (stryMutAct_9fa48("18022") ? "" : (stryCov_9fa48("18022"), "skip"))))));
  }
}
export const stepLinkTeardown: StepFn<LinkTeardownState> = (state, event) => {
  if (stryMutAct_9fa48("18023")) {
    {}
  } else {
    stryCov_9fa48("18023");
    const result = stepLinkTeardownInner(state, event as LinkTeardownEvent);
    return stryMutAct_9fa48("18024") ? {} : (stryCov_9fa48("18024"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkTeardownWithActions(state: LinkTeardownState, event: LinkTeardownEvent): LinkTeardownStepResult {
  if (stryMutAct_9fa48("18025")) {
    {}
  } else {
    stryCov_9fa48("18025");
    return stepLinkTeardownInner(state, event);
  }
}

/** Whether step actions include close-only. */
export function shouldCloseOnlyLinkTeardown(actions: ReadonlyArray<LinkTeardownAction>): boolean {
  if (stryMutAct_9fa48("18026")) {
    {}
  } else {
    stryCov_9fa48("18026");
    return stryMutAct_9fa48("18027") ? actions.every(action => action.kind === "close-only") : (stryCov_9fa48("18027"), actions.some(stryMutAct_9fa48("18028") ? () => undefined : (stryCov_9fa48("18028"), action => stryMutAct_9fa48("18031") ? action.kind !== "close-only" : stryMutAct_9fa48("18030") ? false : stryMutAct_9fa48("18029") ? true : (stryCov_9fa48("18029", "18030", "18031"), action.kind === (stryMutAct_9fa48("18032") ? "" : (stryCov_9fa48("18032"), "close-only"))))));
  }
}

/** Whether step actions include send-teardown-then-close. */
export function shouldSendLinkTeardownThenClose(actions: ReadonlyArray<LinkTeardownAction>): boolean {
  if (stryMutAct_9fa48("18033")) {
    {}
  } else {
    stryCov_9fa48("18033");
    return stryMutAct_9fa48("18034") ? actions.every(action => action.kind === "send-teardown-then-close") : (stryCov_9fa48("18034"), actions.some(stryMutAct_9fa48("18035") ? () => undefined : (stryCov_9fa48("18035"), action => stryMutAct_9fa48("18038") ? action.kind !== "send-teardown-then-close" : stryMutAct_9fa48("18037") ? false : stryMutAct_9fa48("18036") ? true : (stryCov_9fa48("18036", "18037", "18038"), action.kind === (stryMutAct_9fa48("18039") ? "" : (stryCov_9fa48("18039"), "send-teardown-then-close"))))));
  }
}

/** Whether step actions include accept-remote-close. */
export function shouldAcceptRemoteLinkTeardown(actions: ReadonlyArray<LinkTeardownAction>): boolean {
  if (stryMutAct_9fa48("18040")) {
    {}
  } else {
    stryCov_9fa48("18040");
    return stryMutAct_9fa48("18041") ? actions.every(action => action.kind === "accept-remote-close") : (stryCov_9fa48("18041"), actions.some(stryMutAct_9fa48("18042") ? () => undefined : (stryCov_9fa48("18042"), action => stryMutAct_9fa48("18045") ? action.kind !== "accept-remote-close" : stryMutAct_9fa48("18044") ? false : stryMutAct_9fa48("18043") ? true : (stryCov_9fa48("18043", "18044", "18045"), action.kind === (stryMutAct_9fa48("18046") ? "" : (stryCov_9fa48("18046"), "accept-remote-close"))))));
  }
}

/** Extract the send-teardown-then-close action, if any. */
export function linkTeardownSendThenCloseAction(actions: ReadonlyArray<LinkTeardownAction>): Extract<LinkTeardownAction, {
  kind: "send-teardown-then-close";
}> | null {
  if (stryMutAct_9fa48("18047")) {
    {}
  } else {
    stryCov_9fa48("18047");
    for (const action of actions) {
      if (stryMutAct_9fa48("18048")) {
        {}
      } else {
        stryCov_9fa48("18048");
        if (stryMutAct_9fa48("18051") ? action.kind !== "send-teardown-then-close" : stryMutAct_9fa48("18050") ? false : stryMutAct_9fa48("18049") ? true : (stryCov_9fa48("18049", "18050", "18051"), action.kind === (stryMutAct_9fa48("18052") ? "" : (stryCov_9fa48("18052"), "send-teardown-then-close")))) {
          if (stryMutAct_9fa48("18053")) {
            {}
          } else {
            stryCov_9fa48("18053");
            return action;
          }
        }
      }
    }
    return null;
  }
}

/** Extract the accept-remote-close action, if any. */
export function linkTeardownRemoteCloseAction(actions: ReadonlyArray<LinkTeardownAction>): Extract<LinkTeardownAction, {
  kind: "accept-remote-close";
}> | null {
  if (stryMutAct_9fa48("18054")) {
    {}
  } else {
    stryCov_9fa48("18054");
    for (const action of actions) {
      if (stryMutAct_9fa48("18055")) {
        {}
      } else {
        stryCov_9fa48("18055");
        if (stryMutAct_9fa48("18058") ? action.kind !== "accept-remote-close" : stryMutAct_9fa48("18057") ? false : stryMutAct_9fa48("18056") ? true : (stryCov_9fa48("18056", "18057", "18058"), action.kind === (stryMutAct_9fa48("18059") ? "" : (stryCov_9fa48("18059"), "accept-remote-close")))) {
          if (stryMutAct_9fa48("18060")) {
            {}
          } else {
            stryCov_9fa48("18060");
            return action;
          }
        }
      }
    }
    return null;
  }
}
function stepLinkTeardownInner(state: LinkTeardownState, event: LinkTeardownEvent): LinkTeardownStepResult {
  if (stryMutAct_9fa48("18061")) {
    {}
  } else {
    stryCov_9fa48("18061");
    if (stryMutAct_9fa48("18064") ? event.kind !== "teardown/local" : stryMutAct_9fa48("18063") ? false : stryMutAct_9fa48("18062") ? true : (stryCov_9fa48("18062", "18063", "18064"), event.kind === (stryMutAct_9fa48("18065") ? "" : (stryCov_9fa48("18065"), "teardown/local")))) {
      if (stryMutAct_9fa48("18066")) {
        {}
      } else {
        stryCov_9fa48("18066");
        const planActions = stepLinkTeardownPlanWithActions(initialLinkTeardownPlanState(), stryMutAct_9fa48("18067") ? {} : (stryCov_9fa48("18067"), {
          kind: stryMutAct_9fa48("18068") ? "" : (stryCov_9fa48("18068"), "link/teardown-plan-gate"),
          status: state.status
        })).actions;
        if (stryMutAct_9fa48("18070") ? false : stryMutAct_9fa48("18069") ? true : (stryCov_9fa48("18069", "18070"), shouldCloseOnlyLinkTeardownPlan(planActions))) {
          if (stryMutAct_9fa48("18071")) {
            {}
          } else {
            stryCov_9fa48("18071");
            return stryMutAct_9fa48("18072") ? {} : (stryCov_9fa48("18072"), {
              state: stryMutAct_9fa48("18073") ? {} : (stryCov_9fa48("18073"), {
                ...state,
                status: LinkStatus.CLOSED
              }),
              intents: stryMutAct_9fa48("18074") ? ["Stryker was here"] : (stryCov_9fa48("18074"), []),
              actions: stryMutAct_9fa48("18075") ? [] : (stryCov_9fa48("18075"), [stryMutAct_9fa48("18076") ? {} : (stryCov_9fa48("18076"), {
                kind: stryMutAct_9fa48("18077") ? "" : (stryCov_9fa48("18077"), "close-only")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("18080") ? false : stryMutAct_9fa48("18079") ? true : stryMutAct_9fa48("18078") ? shouldSendLinkTeardownThenClosePlan(planActions) : (stryCov_9fa48("18078", "18079", "18080"), !shouldSendLinkTeardownThenClosePlan(planActions))) {
          if (stryMutAct_9fa48("18081")) {
            {}
          } else {
            stryCov_9fa48("18081");
            return stryMutAct_9fa48("18082") ? {} : (stryCov_9fa48("18082"), {
              state,
              intents: stryMutAct_9fa48("18083") ? ["Stryker was here"] : (stryCov_9fa48("18083"), []),
              actions: stryMutAct_9fa48("18084") ? ["Stryker was here"] : (stryCov_9fa48("18084"), [])
            });
          }
        }
        const reason = linkTeardownReasonFromActions(stepLinkTeardownReasonWithActions(initialLinkTeardownReasonState(), stryMutAct_9fa48("18085") ? {} : (stryCov_9fa48("18085"), {
          kind: stryMutAct_9fa48("18086") ? "" : (stryCov_9fa48("18086"), "link/teardown-reason-gate"),
          initiator: state.initiator,
          remote: stryMutAct_9fa48("18087") ? true : (stryCov_9fa48("18087"), false)
        })).actions);
        if (stryMutAct_9fa48("18090") ? reason !== null : stryMutAct_9fa48("18089") ? false : stryMutAct_9fa48("18088") ? true : (stryCov_9fa48("18088", "18089", "18090"), reason === null)) {
          if (stryMutAct_9fa48("18091")) {
            {}
          } else {
            stryCov_9fa48("18091");
            return stryMutAct_9fa48("18092") ? {} : (stryCov_9fa48("18092"), {
              state,
              intents: stryMutAct_9fa48("18093") ? ["Stryker was here"] : (stryCov_9fa48("18093"), []),
              actions: stryMutAct_9fa48("18094") ? ["Stryker was here"] : (stryCov_9fa48("18094"), [])
            });
          }
        }
        return stryMutAct_9fa48("18095") ? {} : (stryCov_9fa48("18095"), {
          state: stryMutAct_9fa48("18096") ? {} : (stryCov_9fa48("18096"), {
            ...state,
            status: LinkStatus.CLOSED
          }),
          intents: stryMutAct_9fa48("18097") ? ["Stryker was here"] : (stryCov_9fa48("18097"), []),
          actions: stryMutAct_9fa48("18098") ? [] : (stryCov_9fa48("18098"), [stryMutAct_9fa48("18099") ? {} : (stryCov_9fa48("18099"), {
            kind: stryMutAct_9fa48("18100") ? "" : (stryCov_9fa48("18100"), "send-teardown-then-close"),
            reason
          })])
        });
      }
    }
    if (stryMutAct_9fa48("18103") ? event.kind !== "teardown/remote" : stryMutAct_9fa48("18102") ? false : stryMutAct_9fa48("18101") ? true : (stryCov_9fa48("18101", "18102", "18103"), event.kind === (stryMutAct_9fa48("18104") ? "" : (stryCov_9fa48("18104"), "teardown/remote")))) {
      if (stryMutAct_9fa48("18105")) {
        {}
      } else {
        stryCov_9fa48("18105");
        if (stryMutAct_9fa48("18108") ? false : stryMutAct_9fa48("18107") ? true : stryMutAct_9fa48("18106") ? shouldAcceptLinkTeardownNow(stepAcceptLinkTeardownWithActions(initialAcceptLinkTeardownState(), {
          kind: "link/accept-teardown-gate",
          plaintextPresent: event.plaintextPresent,
          linkIdMatches: event.linkIdMatches
        }).actions) : (stryCov_9fa48("18106", "18107", "18108"), !shouldAcceptLinkTeardownNow(stepAcceptLinkTeardownWithActions(initialAcceptLinkTeardownState(), stryMutAct_9fa48("18109") ? {} : (stryCov_9fa48("18109"), {
          kind: stryMutAct_9fa48("18110") ? "" : (stryCov_9fa48("18110"), "link/accept-teardown-gate"),
          plaintextPresent: event.plaintextPresent,
          linkIdMatches: event.linkIdMatches
        })).actions))) {
          if (stryMutAct_9fa48("18111")) {
            {}
          } else {
            stryCov_9fa48("18111");
            return stryMutAct_9fa48("18112") ? {} : (stryCov_9fa48("18112"), {
              state,
              intents: stryMutAct_9fa48("18113") ? ["Stryker was here"] : (stryCov_9fa48("18113"), []),
              actions: stryMutAct_9fa48("18114") ? ["Stryker was here"] : (stryCov_9fa48("18114"), [])
            });
          }
        }
        const reason = linkTeardownReasonFromActions(stepLinkTeardownReasonWithActions(initialLinkTeardownReasonState(), stryMutAct_9fa48("18115") ? {} : (stryCov_9fa48("18115"), {
          kind: stryMutAct_9fa48("18116") ? "" : (stryCov_9fa48("18116"), "link/teardown-reason-gate"),
          initiator: state.initiator,
          remote: stryMutAct_9fa48("18117") ? false : (stryCov_9fa48("18117"), true)
        })).actions);
        if (stryMutAct_9fa48("18120") ? reason !== null : stryMutAct_9fa48("18119") ? false : stryMutAct_9fa48("18118") ? true : (stryCov_9fa48("18118", "18119", "18120"), reason === null)) {
          if (stryMutAct_9fa48("18121")) {
            {}
          } else {
            stryCov_9fa48("18121");
            return stryMutAct_9fa48("18122") ? {} : (stryCov_9fa48("18122"), {
              state,
              intents: stryMutAct_9fa48("18123") ? ["Stryker was here"] : (stryCov_9fa48("18123"), []),
              actions: stryMutAct_9fa48("18124") ? ["Stryker was here"] : (stryCov_9fa48("18124"), [])
            });
          }
        }
        return stryMutAct_9fa48("18125") ? {} : (stryCov_9fa48("18125"), {
          state: stryMutAct_9fa48("18126") ? {} : (stryCov_9fa48("18126"), {
            ...state,
            status: LinkStatus.CLOSED
          }),
          intents: stryMutAct_9fa48("18127") ? ["Stryker was here"] : (stryCov_9fa48("18127"), []),
          actions: stryMutAct_9fa48("18128") ? [] : (stryCov_9fa48("18128"), [stryMutAct_9fa48("18129") ? {} : (stryCov_9fa48("18129"), {
            kind: stryMutAct_9fa48("18130") ? "" : (stryCov_9fa48("18130"), "accept-remote-close"),
            reason
          })])
        });
      }
    }
    return stryMutAct_9fa48("18131") ? {} : (stryCov_9fa48("18131"), {
      state,
      intents: stryMutAct_9fa48("18132") ? ["Stryker was here"] : (stryCov_9fa48("18132"), []),
      actions: stryMutAct_9fa48("18133") ? ["Stryker was here"] : (stryCov_9fa48("18133"), [])
    });
  }
}