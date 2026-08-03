/** Extracted from link-resource-accept.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure link inbound resource-advertisement acceptance planning.
 * Decrypt / unpack / app callbacks stay at the adapter edge.
 * Advertisement-plan / app-result-plan / acceptance conclusions leave via
 * machine actions (no ad-hoc `planLinkResourceAdvertisement` /
 * `planLinkResourceAcceptAppResult` / `plan.kind` / `outcome ===` reads beside
 * the step).
 * Resource register membership concludes via machine actions (no ad-hoc
 * `shouldRegisterLinkResource` reads beside the step).
 * Outgoing RESOURCE_REQ match and incoming-by-hash match conclude via machine
 * actions (no ad-hoc `shouldHandleOutgoingResourceRequest` /
 * `shouldHandleIncomingResourceByHash` reads beside the step).
 * Resource-conclude plan nested via {@link stepLinkResourceConcludePlanWithActions}.
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
import { LinkResourceStrategy, type LinkResourceStrategyValue } from "../link-watchdog.js";
export type LinkResourceAcceptPlan = {
  readonly kind: "ignore";
} | {
  readonly kind: "accept";
} | {
  readonly kind: "ask-app";
};
export interface LinkResourceAdvertisementState {
  readonly strategy: LinkResourceStrategyValue | number;
  readonly waitingApp: boolean;
}
export type LinkResourceAdvertisementEvent = Event | {
  readonly kind: "resource-adv/received";
  readonly isRequest: boolean;
} | {
  readonly kind: "resource-adv/app-result";
  readonly accepted: boolean;
};

/**
 * Adapter applies ignore / ask-app / accept / reject only from these actions.
 * Plan nested via {@link stepLinkResourceAdvertisementPlanWithActions}
 * (`ignore`|`ask-app`|`accept`) and
 * {@link stepLinkResourceAcceptAppResultPlanWithActions} (`accept`|`reject`).
 */
export type LinkResourceAdvertisementAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "ask-app";
} | {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export interface LinkResourceAdvertisementStepResult {
  readonly state: LinkResourceAdvertisementState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceAdvertisementAction[];
}
export function initialLinkResourceAdvertisementState(input: {
  readonly strategy: LinkResourceStrategyValue | number;
}): LinkResourceAdvertisementState {
  if (stryMutAct_9fa48("17257")) {
    {}
  } else {
    stryCov_9fa48("17257");
    return stryMutAct_9fa48("17258") ? {} : (stryCov_9fa48("17258"), {
      strategy: input.strategy,
      waitingApp: stryMutAct_9fa48("17259") ? true : (stryCov_9fa48("17259"), false)
    });
  }
}
export function planLinkResourceAccept(strategy: LinkResourceStrategyValue | number): LinkResourceAcceptPlan {
  if (stryMutAct_9fa48("17260")) {
    {}
  } else {
    stryCov_9fa48("17260");
    if (stryMutAct_9fa48("17263") ? strategy !== LinkResourceStrategy.ACCEPT_NONE : stryMutAct_9fa48("17262") ? false : stryMutAct_9fa48("17261") ? true : (stryCov_9fa48("17261", "17262", "17263"), strategy === LinkResourceStrategy.ACCEPT_NONE)) {
      if (stryMutAct_9fa48("17264")) {
        {}
      } else {
        stryCov_9fa48("17264");
        return stryMutAct_9fa48("17265") ? {} : (stryCov_9fa48("17265"), {
          kind: stryMutAct_9fa48("17266") ? "" : (stryCov_9fa48("17266"), "ignore")
        });
      }
    }
    if (stryMutAct_9fa48("17269") ? strategy !== LinkResourceStrategy.ACCEPT_APP : stryMutAct_9fa48("17268") ? false : stryMutAct_9fa48("17267") ? true : (stryCov_9fa48("17267", "17268", "17269"), strategy === LinkResourceStrategy.ACCEPT_APP)) {
      if (stryMutAct_9fa48("17270")) {
        {}
      } else {
        stryCov_9fa48("17270");
        return stryMutAct_9fa48("17271") ? {} : (stryCov_9fa48("17271"), {
          kind: stryMutAct_9fa48("17272") ? "" : (stryCov_9fa48("17272"), "ask-app")
        });
      }
    }
    return stryMutAct_9fa48("17273") ? {} : (stryCov_9fa48("17273"), {
      kind: stryMutAct_9fa48("17274") ? "" : (stryCov_9fa48("17274"), "accept")
    });
  }
}

/**
 * Whether an inbound RESOURCE_ADV should accept / ask-app / ignore.
 * Request advertisements always accept (bypass strategy); strategy applies to offers.
 */
export function planLinkResourceAdvertisement(input: {
  readonly isRequest: boolean;
  readonly strategy: LinkResourceStrategyValue | number;
}): LinkResourceAcceptPlan {
  if (stryMutAct_9fa48("17275")) {
    {}
  } else {
    stryCov_9fa48("17275");
    if (stryMutAct_9fa48("17277") ? false : stryMutAct_9fa48("17276") ? true : (stryCov_9fa48("17276", "17277"), input.isRequest)) {
      if (stryMutAct_9fa48("17278")) {
        {}
      } else {
        stryCov_9fa48("17278");
        return stryMutAct_9fa48("17279") ? {} : (stryCov_9fa48("17279"), {
          kind: stryMutAct_9fa48("17280") ? "" : (stryCov_9fa48("17280"), "accept")
        });
      }
    }
    return planLinkResourceAccept(input.strategy);
  }
}

/**
 * Advertisement-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkResourceAdvertisement` /
 * `plan.kind` reads beside the step). Nested under
 * {@link stepLinkResourceAdvertisementWithActions}.
 */
export type LinkResourceAdvertisementPlanState = Record<string, never>;
export type LinkResourceAdvertisementPlanEvent = Intent | {
  readonly kind: "resource-adv/advertisement-plan-gate";
  readonly isRequest: boolean;
  readonly strategy: LinkResourceStrategyValue | number;
};
export type LinkResourceAdvertisementPlanAction = {
  readonly kind: "ignore";
} | {
  readonly kind: "ask-app";
} | {
  readonly kind: "accept";
};
export interface LinkResourceAdvertisementPlanStepResult {
  readonly state: LinkResourceAdvertisementPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceAdvertisementPlanAction[];
}
export function initialLinkResourceAdvertisementPlanState(): LinkResourceAdvertisementPlanState {
  if (stryMutAct_9fa48("17281")) {
    {}
  } else {
    stryCov_9fa48("17281");
    return {};
  }
}
export function stepLinkResourceAdvertisementPlanWithActions(state: LinkResourceAdvertisementPlanState, event: LinkResourceAdvertisementPlanEvent): LinkResourceAdvertisementPlanStepResult {
  if (stryMutAct_9fa48("17282")) {
    {}
  } else {
    stryCov_9fa48("17282");
    if (stryMutAct_9fa48("17285") ? event.kind !== "resource-adv/advertisement-plan-gate" : stryMutAct_9fa48("17284") ? false : stryMutAct_9fa48("17283") ? true : (stryCov_9fa48("17283", "17284", "17285"), event.kind === (stryMutAct_9fa48("17286") ? "" : (stryCov_9fa48("17286"), "resource-adv/advertisement-plan-gate")))) {
      if (stryMutAct_9fa48("17287")) {
        {}
      } else {
        stryCov_9fa48("17287");
        return stryMutAct_9fa48("17288") ? {} : (stryCov_9fa48("17288"), {
          state,
          intents: stryMutAct_9fa48("17289") ? ["Stryker was here"] : (stryCov_9fa48("17289"), []),
          actions: stryMutAct_9fa48("17290") ? [] : (stryCov_9fa48("17290"), [planLinkResourceAdvertisement(stryMutAct_9fa48("17291") ? {} : (stryCov_9fa48("17291"), {
            isRequest: event.isRequest,
            strategy: event.strategy
          }))])
        });
      }
    }
    return stryMutAct_9fa48("17292") ? {} : (stryCov_9fa48("17292"), {
      state,
      intents: stryMutAct_9fa48("17293") ? ["Stryker was here"] : (stryCov_9fa48("17293"), []),
      actions: stryMutAct_9fa48("17294") ? ["Stryker was here"] : (stryCov_9fa48("17294"), [])
    });
  }
}
export function shouldIgnoreLinkResourceAdvertisementPlan(actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>): boolean {
  if (stryMutAct_9fa48("17295")) {
    {}
  } else {
    stryCov_9fa48("17295");
    return stryMutAct_9fa48("17296") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("17296"), actions.some(stryMutAct_9fa48("17297") ? () => undefined : (stryCov_9fa48("17297"), action => stryMutAct_9fa48("17300") ? action.kind !== "ignore" : stryMutAct_9fa48("17299") ? false : stryMutAct_9fa48("17298") ? true : (stryCov_9fa48("17298", "17299", "17300"), action.kind === (stryMutAct_9fa48("17301") ? "" : (stryCov_9fa48("17301"), "ignore"))))));
  }
}
export function shouldAskAppLinkResourceAdvertisementPlan(actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>): boolean {
  if (stryMutAct_9fa48("17302")) {
    {}
  } else {
    stryCov_9fa48("17302");
    return stryMutAct_9fa48("17303") ? actions.every(action => action.kind === "ask-app") : (stryCov_9fa48("17303"), actions.some(stryMutAct_9fa48("17304") ? () => undefined : (stryCov_9fa48("17304"), action => stryMutAct_9fa48("17307") ? action.kind !== "ask-app" : stryMutAct_9fa48("17306") ? false : stryMutAct_9fa48("17305") ? true : (stryCov_9fa48("17305", "17306", "17307"), action.kind === (stryMutAct_9fa48("17308") ? "" : (stryCov_9fa48("17308"), "ask-app"))))));
  }
}
export function shouldAcceptLinkResourceAdvertisementPlan(actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>): boolean {
  if (stryMutAct_9fa48("17309")) {
    {}
  } else {
    stryCov_9fa48("17309");
    return stryMutAct_9fa48("17310") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("17310"), actions.some(stryMutAct_9fa48("17311") ? () => undefined : (stryCov_9fa48("17311"), action => stryMutAct_9fa48("17314") ? action.kind !== "accept" : stryMutAct_9fa48("17313") ? false : stryMutAct_9fa48("17312") ? true : (stryCov_9fa48("17312", "17313", "17314"), action.kind === (stryMutAct_9fa48("17315") ? "" : (stryCov_9fa48("17315"), "accept"))))));
  }
}

/** Extract the advertisement plan from actions; null when empty. */
export function linkResourceAdvertisementPlanFromActions(actions: ReadonlyArray<LinkResourceAdvertisementPlanAction>): LinkResourceAcceptPlan | null {
  if (stryMutAct_9fa48("17316")) {
    {}
  } else {
    stryCov_9fa48("17316");
    const action = actions.find(stryMutAct_9fa48("17317") ? () => undefined : (stryCov_9fa48("17317"), entry => stryMutAct_9fa48("17320") ? (entry.kind === "ignore" || entry.kind === "ask-app") && entry.kind === "accept" : stryMutAct_9fa48("17319") ? false : stryMutAct_9fa48("17318") ? true : (stryCov_9fa48("17318", "17319", "17320"), (stryMutAct_9fa48("17322") ? entry.kind === "ignore" && entry.kind === "ask-app" : stryMutAct_9fa48("17321") ? false : (stryCov_9fa48("17321", "17322"), (stryMutAct_9fa48("17324") ? entry.kind !== "ignore" : stryMutAct_9fa48("17323") ? false : (stryCov_9fa48("17323", "17324"), entry.kind === (stryMutAct_9fa48("17325") ? "" : (stryCov_9fa48("17325"), "ignore")))) || (stryMutAct_9fa48("17327") ? entry.kind !== "ask-app" : stryMutAct_9fa48("17326") ? false : (stryCov_9fa48("17326", "17327"), entry.kind === (stryMutAct_9fa48("17328") ? "" : (stryCov_9fa48("17328"), "ask-app")))))) || (stryMutAct_9fa48("17330") ? entry.kind !== "accept" : stryMutAct_9fa48("17329") ? false : (stryCov_9fa48("17329", "17330"), entry.kind === (stryMutAct_9fa48("17331") ? "" : (stryCov_9fa48("17331"), "accept")))))));
    return stryMutAct_9fa48("17332") ? action && null : (stryCov_9fa48("17332"), action ?? null);
  }
}

/** After ask-app, map the app callback result to accept/reject. */
export function planLinkResourceAcceptAppResult(appAccepted: boolean): "accept" | "reject" {
  if (stryMutAct_9fa48("17333")) {
    {}
  } else {
    stryCov_9fa48("17333");
    return appAccepted ? stryMutAct_9fa48("17334") ? "" : (stryCov_9fa48("17334"), "accept") : stryMutAct_9fa48("17335") ? "" : (stryCov_9fa48("17335"), "reject");
  }
}

/**
 * App-result-plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkResourceAcceptAppResult` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkResourceAdvertisementWithActions}.
 */
export type LinkResourceAcceptAppResultPlanState = Record<string, never>;
export type LinkResourceAcceptAppResultPlanEvent = Intent | {
  readonly kind: "resource-adv/app-result-plan-gate";
  readonly accepted: boolean;
};
export type LinkResourceAcceptAppResultPlanAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export interface LinkResourceAcceptAppResultPlanStepResult {
  readonly state: LinkResourceAcceptAppResultPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkResourceAcceptAppResultPlanAction[];
}
export function initialLinkResourceAcceptAppResultPlanState(): LinkResourceAcceptAppResultPlanState {
  if (stryMutAct_9fa48("17336")) {
    {}
  } else {
    stryCov_9fa48("17336");
    return {};
  }
}
export function stepLinkResourceAcceptAppResultPlanWithActions(state: LinkResourceAcceptAppResultPlanState, event: LinkResourceAcceptAppResultPlanEvent): LinkResourceAcceptAppResultPlanStepResult {
  if (stryMutAct_9fa48("17337")) {
    {}
  } else {
    stryCov_9fa48("17337");
    if (stryMutAct_9fa48("17340") ? event.kind !== "resource-adv/app-result-plan-gate" : stryMutAct_9fa48("17339") ? false : stryMutAct_9fa48("17338") ? true : (stryCov_9fa48("17338", "17339", "17340"), event.kind === (stryMutAct_9fa48("17341") ? "" : (stryCov_9fa48("17341"), "resource-adv/app-result-plan-gate")))) {
      if (stryMutAct_9fa48("17342")) {
        {}
      } else {
        stryCov_9fa48("17342");
        return stryMutAct_9fa48("17343") ? {} : (stryCov_9fa48("17343"), {
          state,
          intents: stryMutAct_9fa48("17344") ? ["Stryker was here"] : (stryCov_9fa48("17344"), []),
          actions: stryMutAct_9fa48("17345") ? [] : (stryCov_9fa48("17345"), [stryMutAct_9fa48("17346") ? {} : (stryCov_9fa48("17346"), {
            kind: planLinkResourceAcceptAppResult(event.accepted)
          })])
        });
      }
    }
    return stryMutAct_9fa48("17347") ? {} : (stryCov_9fa48("17347"), {
      state,
      intents: stryMutAct_9fa48("17348") ? ["Stryker was here"] : (stryCov_9fa48("17348"), []),
      actions: stryMutAct_9fa48("17349") ? ["Stryker was here"] : (stryCov_9fa48("17349"), [])
    });
  }
}
export function shouldAcceptLinkResourceAcceptAppResultPlan(actions: ReadonlyArray<LinkResourceAcceptAppResultPlanAction>): boolean {
  if (stryMutAct_9fa48("17350")) {
    {}
  } else {
    stryCov_9fa48("17350");
    return stryMutAct_9fa48("17351") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("17351"), actions.some(stryMutAct_9fa48("17352") ? () => undefined : (stryCov_9fa48("17352"), action => stryMutAct_9fa48("17355") ? action.kind !== "accept" : stryMutAct_9fa48("17354") ? false : stryMutAct_9fa48("17353") ? true : (stryCov_9fa48("17353", "17354", "17355"), action.kind === (stryMutAct_9fa48("17356") ? "" : (stryCov_9fa48("17356"), "accept"))))));
  }
}
export function shouldRejectLinkResourceAcceptAppResultPlan(actions: ReadonlyArray<LinkResourceAcceptAppResultPlanAction>): boolean {
  if (stryMutAct_9fa48("17357")) {
    {}
  } else {
    stryCov_9fa48("17357");
    return stryMutAct_9fa48("17358") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("17358"), actions.some(stryMutAct_9fa48("17359") ? () => undefined : (stryCov_9fa48("17359"), action => stryMutAct_9fa48("17362") ? action.kind !== "reject" : stryMutAct_9fa48("17361") ? false : stryMutAct_9fa48("17360") ? true : (stryCov_9fa48("17360", "17361", "17362"), action.kind === (stryMutAct_9fa48("17363") ? "" : (stryCov_9fa48("17363"), "reject"))))));
  }
}

/** Extract the app-result plan from actions; null when empty. */
export function linkResourceAcceptAppResultPlanFromActions(actions: ReadonlyArray<LinkResourceAcceptAppResultPlanAction>): "accept" | "reject" | null {
  if (stryMutAct_9fa48("17364")) {
    {}
  } else {
    stryCov_9fa48("17364");
    const action = actions.find(stryMutAct_9fa48("17365") ? () => undefined : (stryCov_9fa48("17365"), entry => stryMutAct_9fa48("17368") ? entry.kind === "accept" && entry.kind === "reject" : stryMutAct_9fa48("17367") ? false : stryMutAct_9fa48("17366") ? true : (stryCov_9fa48("17366", "17367", "17368"), (stryMutAct_9fa48("17370") ? entry.kind !== "accept" : stryMutAct_9fa48("17369") ? false : (stryCov_9fa48("17369", "17370"), entry.kind === (stryMutAct_9fa48("17371") ? "" : (stryCov_9fa48("17371"), "accept")))) || (stryMutAct_9fa48("17373") ? entry.kind !== "reject" : stryMutAct_9fa48("17372") ? false : (stryCov_9fa48("17372", "17373"), entry.kind === (stryMutAct_9fa48("17374") ? "" : (stryCov_9fa48("17374"), "reject")))))));
    return stryMutAct_9fa48("17375") ? action?.kind && null : (stryCov_9fa48("17375"), (stryMutAct_9fa48("17376") ? action.kind : (stryCov_9fa48("17376"), action?.kind)) ?? null);
  }
}
export const stepLinkResourceAdvertisement: StepFn<LinkResourceAdvertisementState> = (state, event) => {
  if (stryMutAct_9fa48("17377")) {
    {}
  } else {
    stryCov_9fa48("17377");
    const result = stepLinkResourceAdvertisementInner(state, event as LinkResourceAdvertisementEvent);
    return stryMutAct_9fa48("17378") ? {} : (stryCov_9fa48("17378"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkResourceAdvertisementWithActions(state: LinkResourceAdvertisementState, event: LinkResourceAdvertisementEvent): LinkResourceAdvertisementStepResult {
  if (stryMutAct_9fa48("17379")) {
    {}
  } else {
    stryCov_9fa48("17379");
    return stepLinkResourceAdvertisementInner(state, event);
  }
}

/** Whether step actions include ignore. */
export function shouldIgnoreLinkResourceAdvertisement(actions: ReadonlyArray<LinkResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("17380")) {
    {}
  } else {
    stryCov_9fa48("17380");
    return stryMutAct_9fa48("17381") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("17381"), actions.some(stryMutAct_9fa48("17382") ? () => undefined : (stryCov_9fa48("17382"), action => stryMutAct_9fa48("17385") ? action.kind !== "ignore" : stryMutAct_9fa48("17384") ? false : stryMutAct_9fa48("17383") ? true : (stryCov_9fa48("17383", "17384", "17385"), action.kind === (stryMutAct_9fa48("17386") ? "" : (stryCov_9fa48("17386"), "ignore"))))));
  }
}

/** Whether step actions include ask-app. */
export function shouldAskAppLinkResourceAdvertisement(actions: ReadonlyArray<LinkResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("17387")) {
    {}
  } else {
    stryCov_9fa48("17387");
    return stryMutAct_9fa48("17388") ? actions.every(action => action.kind === "ask-app") : (stryCov_9fa48("17388"), actions.some(stryMutAct_9fa48("17389") ? () => undefined : (stryCov_9fa48("17389"), action => stryMutAct_9fa48("17392") ? action.kind !== "ask-app" : stryMutAct_9fa48("17391") ? false : stryMutAct_9fa48("17390") ? true : (stryCov_9fa48("17390", "17391", "17392"), action.kind === (stryMutAct_9fa48("17393") ? "" : (stryCov_9fa48("17393"), "ask-app"))))));
  }
}

/** Whether step actions include accept. */
export function shouldAcceptLinkResourceAdvertisement(actions: ReadonlyArray<LinkResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("17394")) {
    {}
  } else {
    stryCov_9fa48("17394");
    return stryMutAct_9fa48("17395") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("17395"), actions.some(stryMutAct_9fa48("17396") ? () => undefined : (stryCov_9fa48("17396"), action => stryMutAct_9fa48("17399") ? action.kind !== "accept" : stryMutAct_9fa48("17398") ? false : stryMutAct_9fa48("17397") ? true : (stryCov_9fa48("17397", "17398", "17399"), action.kind === (stryMutAct_9fa48("17400") ? "" : (stryCov_9fa48("17400"), "accept"))))));
  }
}

/** Whether step actions include reject. */
export function shouldRejectLinkResourceAdvertisement(actions: ReadonlyArray<LinkResourceAdvertisementAction>): boolean {
  if (stryMutAct_9fa48("17401")) {
    {}
  } else {
    stryCov_9fa48("17401");
    return stryMutAct_9fa48("17402") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("17402"), actions.some(stryMutAct_9fa48("17403") ? () => undefined : (stryCov_9fa48("17403"), action => stryMutAct_9fa48("17406") ? action.kind !== "reject" : stryMutAct_9fa48("17405") ? false : stryMutAct_9fa48("17404") ? true : (stryCov_9fa48("17404", "17405", "17406"), action.kind === (stryMutAct_9fa48("17407") ? "" : (stryCov_9fa48("17407"), "reject"))))));
  }
}
function stepLinkResourceAdvertisementInner(state: LinkResourceAdvertisementState, event: LinkResourceAdvertisementEvent): LinkResourceAdvertisementStepResult {
  if (stryMutAct_9fa48("17408")) {
    {}
  } else {
    stryCov_9fa48("17408");
    if (stryMutAct_9fa48("17411") ? event.kind !== "resource-adv/received" : stryMutAct_9fa48("17410") ? false : stryMutAct_9fa48("17409") ? true : (stryCov_9fa48("17409", "17410", "17411"), event.kind === (stryMutAct_9fa48("17412") ? "" : (stryCov_9fa48("17412"), "resource-adv/received")))) {
      if (stryMutAct_9fa48("17413")) {
        {}
      } else {
        stryCov_9fa48("17413");
        const planActions = stepLinkResourceAdvertisementPlanWithActions(initialLinkResourceAdvertisementPlanState(), stryMutAct_9fa48("17414") ? {} : (stryCov_9fa48("17414"), {
          kind: stryMutAct_9fa48("17415") ? "" : (stryCov_9fa48("17415"), "resource-adv/advertisement-plan-gate"),
          isRequest: event.isRequest,
          strategy: state.strategy
        })).actions;
        if (stryMutAct_9fa48("17417") ? false : stryMutAct_9fa48("17416") ? true : (stryCov_9fa48("17416", "17417"), shouldIgnoreLinkResourceAdvertisementPlan(planActions))) {
          if (stryMutAct_9fa48("17418")) {
            {}
          } else {
            stryCov_9fa48("17418");
            return stryMutAct_9fa48("17419") ? {} : (stryCov_9fa48("17419"), {
              state,
              intents: stryMutAct_9fa48("17420") ? ["Stryker was here"] : (stryCov_9fa48("17420"), []),
              actions: stryMutAct_9fa48("17421") ? [] : (stryCov_9fa48("17421"), [stryMutAct_9fa48("17422") ? {} : (stryCov_9fa48("17422"), {
                kind: stryMutAct_9fa48("17423") ? "" : (stryCov_9fa48("17423"), "ignore")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("17425") ? false : stryMutAct_9fa48("17424") ? true : (stryCov_9fa48("17424", "17425"), shouldAskAppLinkResourceAdvertisementPlan(planActions))) {
          if (stryMutAct_9fa48("17426")) {
            {}
          } else {
            stryCov_9fa48("17426");
            return stryMutAct_9fa48("17427") ? {} : (stryCov_9fa48("17427"), {
              state: stryMutAct_9fa48("17428") ? {} : (stryCov_9fa48("17428"), {
                ...state,
                waitingApp: stryMutAct_9fa48("17429") ? false : (stryCov_9fa48("17429"), true)
              }),
              intents: stryMutAct_9fa48("17430") ? ["Stryker was here"] : (stryCov_9fa48("17430"), []),
              actions: stryMutAct_9fa48("17431") ? [] : (stryCov_9fa48("17431"), [stryMutAct_9fa48("17432") ? {} : (stryCov_9fa48("17432"), {
                kind: stryMutAct_9fa48("17433") ? "" : (stryCov_9fa48("17433"), "ask-app")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("17436") ? false : stryMutAct_9fa48("17435") ? true : stryMutAct_9fa48("17434") ? shouldAcceptLinkResourceAdvertisementPlan(planActions) : (stryCov_9fa48("17434", "17435", "17436"), !shouldAcceptLinkResourceAdvertisementPlan(planActions))) {
          if (stryMutAct_9fa48("17437")) {
            {}
          } else {
            stryCov_9fa48("17437");
            return stryMutAct_9fa48("17438") ? {} : (stryCov_9fa48("17438"), {
              state,
              intents: stryMutAct_9fa48("17439") ? ["Stryker was here"] : (stryCov_9fa48("17439"), []),
              actions: stryMutAct_9fa48("17440") ? ["Stryker was here"] : (stryCov_9fa48("17440"), [])
            });
          }
        }
        return stryMutAct_9fa48("17441") ? {} : (stryCov_9fa48("17441"), {
          state,
          intents: stryMutAct_9fa48("17442") ? ["Stryker was here"] : (stryCov_9fa48("17442"), []),
          actions: stryMutAct_9fa48("17443") ? [] : (stryCov_9fa48("17443"), [stryMutAct_9fa48("17444") ? {} : (stryCov_9fa48("17444"), {
            kind: stryMutAct_9fa48("17445") ? "" : (stryCov_9fa48("17445"), "accept")
          })])
        });
      }
    }
    if (stryMutAct_9fa48("17448") ? event.kind !== "resource-adv/app-result" : stryMutAct_9fa48("17447") ? false : stryMutAct_9fa48("17446") ? true : (stryCov_9fa48("17446", "17447", "17448"), event.kind === (stryMutAct_9fa48("17449") ? "" : (stryCov_9fa48("17449"), "resource-adv/app-result")))) {
      if (stryMutAct_9fa48("17450")) {
        {}
      } else {
        stryCov_9fa48("17450");
        if (stryMutAct_9fa48("17453") ? false : stryMutAct_9fa48("17452") ? true : stryMutAct_9fa48("17451") ? state.waitingApp : (stryCov_9fa48("17451", "17452", "17453"), !state.waitingApp)) {
          if (stryMutAct_9fa48("17454")) {
            {}
          } else {
            stryCov_9fa48("17454");
            return stryMutAct_9fa48("17455") ? {} : (stryCov_9fa48("17455"), {
              state,
              intents: stryMutAct_9fa48("17456") ? ["Stryker was here"] : (stryCov_9fa48("17456"), []),
              actions: stryMutAct_9fa48("17457") ? ["Stryker was here"] : (stryCov_9fa48("17457"), [])
            });
          }
        }
        const planActions = stepLinkResourceAcceptAppResultPlanWithActions(initialLinkResourceAcceptAppResultPlanState(), stryMutAct_9fa48("17458") ? {} : (stryCov_9fa48("17458"), {
          kind: stryMutAct_9fa48("17459") ? "" : (stryCov_9fa48("17459"), "resource-adv/app-result-plan-gate"),
          accepted: event.accepted
        })).actions;
        if (stryMutAct_9fa48("17461") ? false : stryMutAct_9fa48("17460") ? true : (stryCov_9fa48("17460", "17461"), shouldRejectLinkResourceAcceptAppResultPlan(planActions))) {
          if (stryMutAct_9fa48("17462")) {
            {}
          } else {
            stryCov_9fa48("17462");
            return stryMutAct_9fa48("17463") ? {} : (stryCov_9fa48("17463"), {
              state: stryMutAct_9fa48("17464") ? {} : (stryCov_9fa48("17464"), {
                ...state,
                waitingApp: stryMutAct_9fa48("17465") ? true : (stryCov_9fa48("17465"), false)
              }),
              intents: stryMutAct_9fa48("17466") ? ["Stryker was here"] : (stryCov_9fa48("17466"), []),
              actions: stryMutAct_9fa48("17467") ? [] : (stryCov_9fa48("17467"), [stryMutAct_9fa48("17468") ? {} : (stryCov_9fa48("17468"), {
                kind: stryMutAct_9fa48("17469") ? "" : (stryCov_9fa48("17469"), "reject")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("17472") ? false : stryMutAct_9fa48("17471") ? true : stryMutAct_9fa48("17470") ? shouldAcceptLinkResourceAcceptAppResultPlan(planActions) : (stryCov_9fa48("17470", "17471", "17472"), !shouldAcceptLinkResourceAcceptAppResultPlan(planActions))) {
          if (stryMutAct_9fa48("17473")) {
            {}
          } else {
            stryCov_9fa48("17473");
            return stryMutAct_9fa48("17474") ? {} : (stryCov_9fa48("17474"), {
              state: stryMutAct_9fa48("17475") ? {} : (stryCov_9fa48("17475"), {
                ...state,
                waitingApp: stryMutAct_9fa48("17476") ? true : (stryCov_9fa48("17476"), false)
              }),
              intents: stryMutAct_9fa48("17477") ? ["Stryker was here"] : (stryCov_9fa48("17477"), []),
              actions: stryMutAct_9fa48("17478") ? ["Stryker was here"] : (stryCov_9fa48("17478"), [])
            });
          }
        }
        return stryMutAct_9fa48("17479") ? {} : (stryCov_9fa48("17479"), {
          state: stryMutAct_9fa48("17480") ? {} : (stryCov_9fa48("17480"), {
            ...state,
            waitingApp: stryMutAct_9fa48("17481") ? true : (stryCov_9fa48("17481"), false)
          }),
          intents: stryMutAct_9fa48("17482") ? ["Stryker was here"] : (stryCov_9fa48("17482"), []),
          actions: stryMutAct_9fa48("17483") ? [] : (stryCov_9fa48("17483"), [stryMutAct_9fa48("17484") ? {} : (stryCov_9fa48("17484"), {
            kind: stryMutAct_9fa48("17485") ? "" : (stryCov_9fa48("17485"), "accept")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17486") ? {} : (stryCov_9fa48("17486"), {
      state,
      intents: stryMutAct_9fa48("17487") ? ["Stryker was here"] : (stryCov_9fa48("17487"), []),
      actions: stryMutAct_9fa48("17488") ? ["Stryker was here"] : (stryCov_9fa48("17488"), [])
    });
  }
}

/** Whether the link may start another outbound resource transfer (no outgoing in flight). */
export function linkReadyForNewResource(outgoingCount: number): boolean {
  if (stryMutAct_9fa48("17489")) {
    {}
  } else {
    stryCov_9fa48("17489");
    return stryMutAct_9fa48("17492") ? outgoingCount !== 0 : stryMutAct_9fa48("17491") ? false : stryMutAct_9fa48("17490") ? true : (stryCov_9fa48("17490", "17491", "17492"), outgoingCount === 0);
  }
}

/**
 * linkReadyForNewResource gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkReadyForNewResource` reads beside
 * the step).
 */
export type LinkReadyForNewResourceState = Record<string, never>;
export type LinkReadyForNewResourceEvent = Event | {
  readonly kind: "link/ready-for-new-resource-gate";
  readonly outgoingCount: number;
};
export type LinkReadyForNewResourceAction = {
  readonly kind: "ready";
} | {
  readonly kind: "busy";
};
export interface LinkReadyForNewResourceStepResult {
  readonly state: LinkReadyForNewResourceState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkReadyForNewResourceAction[];
}
export function initialLinkReadyForNewResourceState(): LinkReadyForNewResourceState {
  if (stryMutAct_9fa48("17493")) {
    {}
  } else {
    stryCov_9fa48("17493");
    return {};
  }
}
export function stepLinkReadyForNewResourceWithActions(state: LinkReadyForNewResourceState, event: LinkReadyForNewResourceEvent): LinkReadyForNewResourceStepResult {
  if (stryMutAct_9fa48("17494")) {
    {}
  } else {
    stryCov_9fa48("17494");
    if (stryMutAct_9fa48("17497") ? event.kind !== "link/ready-for-new-resource-gate" : stryMutAct_9fa48("17496") ? false : stryMutAct_9fa48("17495") ? true : (stryCov_9fa48("17495", "17496", "17497"), event.kind === (stryMutAct_9fa48("17498") ? "" : (stryCov_9fa48("17498"), "link/ready-for-new-resource-gate")))) {
      if (stryMutAct_9fa48("17499")) {
        {}
      } else {
        stryCov_9fa48("17499");
        return stryMutAct_9fa48("17500") ? {} : (stryCov_9fa48("17500"), {
          state,
          intents: stryMutAct_9fa48("17501") ? ["Stryker was here"] : (stryCov_9fa48("17501"), []),
          actions: stryMutAct_9fa48("17502") ? [] : (stryCov_9fa48("17502"), [stryMutAct_9fa48("17503") ? {} : (stryCov_9fa48("17503"), {
            kind: linkReadyForNewResource(event.outgoingCount) ? stryMutAct_9fa48("17504") ? "" : (stryCov_9fa48("17504"), "ready") : stryMutAct_9fa48("17505") ? "" : (stryCov_9fa48("17505"), "busy")
          })])
        });
      }
    }
    return stryMutAct_9fa48("17506") ? {} : (stryCov_9fa48("17506"), {
      state,
      intents: stryMutAct_9fa48("17507") ? ["Stryker was here"] : (stryCov_9fa48("17507"), []),
      actions: stryMutAct_9fa48("17508") ? ["Stryker was here"] : (stryCov_9fa48("17508"), [])
    });
  }
}
export function shouldLinkReadyForNewResource(actions: ReadonlyArray<LinkReadyForNewResourceAction>): boolean {
  if (stryMutAct_9fa48("17509")) {
    {}
  } else {
    stryCov_9fa48("17509");
    return stryMutAct_9fa48("17510") ? actions.every(action => action.kind === "ready") : (stryCov_9fa48("17510"), actions.some(stryMutAct_9fa48("17511") ? () => undefined : (stryCov_9fa48("17511"), action => stryMutAct_9fa48("17514") ? action.kind !== "ready" : stryMutAct_9fa48("17513") ? false : stryMutAct_9fa48("17512") ? true : (stryCov_9fa48("17512", "17513", "17514"), action.kind === (stryMutAct_9fa48("17515") ? "" : (stryCov_9fa48("17515"), "ready"))))));
  }
}
export function shouldLinkBusyForNewResource(actions: ReadonlyArray<LinkReadyForNewResourceAction>): boolean {
  if (stryMutAct_9fa48("17516")) {
    {}
  } else {
    stryCov_9fa48("17516");
    return stryMutAct_9fa48("17517") ? actions.every(action => action.kind === "busy") : (stryCov_9fa48("17517"), actions.some(stryMutAct_9fa48("17518") ? () => undefined : (stryCov_9fa48("17518"), action => stryMutAct_9fa48("17521") ? action.kind !== "busy" : stryMutAct_9fa48("17520") ? false : stryMutAct_9fa48("17519") ? true : (stryCov_9fa48("17519", "17520", "17521"), action.kind === (stryMutAct_9fa48("17522") ? "" : (stryCov_9fa48("17522"), "busy"))))));
  }
}
/** Whether an outgoing resource should handle this RESOURCE_REQ packet. */
export function shouldHandleOutgoingResourceRequest(input: {
  readonly hashMatches: boolean;
  readonly alreadySeen: boolean;
}): boolean {
  if (stryMutAct_9fa48("17523")) {
    {}
  } else {
    stryCov_9fa48("17523");
    return stryMutAct_9fa48("17526") ? input.hashMatches || !input.alreadySeen : stryMutAct_9fa48("17525") ? false : stryMutAct_9fa48("17524") ? true : (stryCov_9fa48("17524", "17525", "17526"), input.hashMatches && (stryMutAct_9fa48("17527") ? input.alreadySeen : (stryCov_9fa48("17527"), !input.alreadySeen)));
  }
}

/**
 * shouldHandleOutgoingResourceRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldHandleOutgoingResourceRequest`
 * reads beside the step).
 */
export type HandleOutgoingResourceRequestState = Record<string, never>;
export type HandleOutgoingResourceRequestEvent = Event | {
  readonly kind: "link/handle-outgoing-resource-request-gate";
  readonly hashMatches: boolean;
  readonly alreadySeen: boolean;
};
export type HandleOutgoingResourceRequestAction = {
  readonly kind: "handle";
} | {
  readonly kind: "skip";
};
export interface HandleOutgoingResourceRequestStepResult {
  readonly state: HandleOutgoingResourceRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly HandleOutgoingResourceRequestAction[];
}
export function initialHandleOutgoingResourceRequestState(): HandleOutgoingResourceRequestState {
  if (stryMutAct_9fa48("17528")) {
    {}
  } else {
    stryCov_9fa48("17528");
    return {};
  }
}