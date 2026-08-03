/**
 * Pure LINKIDENTIFY payload layout and acceptance gates.
 * Signature verification stays at the crypto adapter edge.
 * Pack / split / signed-material / acceptance conclusions leave via machine
 * actions (no ad-hoc `packLinkIdentifyPayload` / `splitLinkIdentifyPayload` /
 * `linkIdentifySignedMaterial` / `plan.kind` reads beside the step).
 * Accept-before-decrypt / identify-outcome-plan / commit-remote-identity
 * gates conclude via machine actions (no ad-hoc `canAcceptLinkIdentify` /
 * `planLinkIdentifyOutcome` / `outcome ===` /
 * `shouldCommitLinkRemoteIdentity` reads beside the step).
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
export const LINK_IDENTIFY_PUBLIC_KEY_SIZE = 64;
export const LINK_IDENTIFY_SIGNATURE_SIZE = 64;
export const LINK_IDENTIFY_PAYLOAD_SIZE = stryMutAct_9fa48("14856") ? LINK_IDENTIFY_PUBLIC_KEY_SIZE - LINK_IDENTIFY_SIGNATURE_SIZE : (stryCov_9fa48("14856"), LINK_IDENTIFY_PUBLIC_KEY_SIZE + LINK_IDENTIFY_SIGNATURE_SIZE);
export function canAcceptLinkIdentify(initiator: boolean): boolean {
  if (stryMutAct_9fa48("14857")) {
    {}
  } else {
    stryCov_9fa48("14857");
    return stryMutAct_9fa48("14858") ? initiator : (stryCov_9fa48("14858"), !initiator);
  }
}

/**
 * Link-identify accept gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAcceptLinkIdentify`
 * reads beside the step).
 */
export type AcceptLinkIdentifyState = Record<string, never>;
export type AcceptLinkIdentifyEvent = Event | {
  readonly kind: "link-identify/accept-gate";
  readonly initiator: boolean;
};
export type AcceptLinkIdentifyAction = {
  readonly kind: "accept";
} | {
  readonly kind: "skip";
};
export interface AcceptLinkIdentifyStepResult {
  readonly state: AcceptLinkIdentifyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AcceptLinkIdentifyAction[];
}
export function initialAcceptLinkIdentifyState(): AcceptLinkIdentifyState {
  if (stryMutAct_9fa48("14859")) {
    {}
  } else {
    stryCov_9fa48("14859");
    return {};
  }
}
export function stepAcceptLinkIdentifyWithActions(state: AcceptLinkIdentifyState, event: AcceptLinkIdentifyEvent): AcceptLinkIdentifyStepResult {
  if (stryMutAct_9fa48("14860")) {
    {}
  } else {
    stryCov_9fa48("14860");
    if (stryMutAct_9fa48("14863") ? event.kind !== "link-identify/accept-gate" : stryMutAct_9fa48("14862") ? false : stryMutAct_9fa48("14861") ? true : (stryCov_9fa48("14861", "14862", "14863"), event.kind === (stryMutAct_9fa48("14864") ? "" : (stryCov_9fa48("14864"), "link-identify/accept-gate")))) {
      if (stryMutAct_9fa48("14865")) {
        {}
      } else {
        stryCov_9fa48("14865");
        return stryMutAct_9fa48("14866") ? {} : (stryCov_9fa48("14866"), {
          state,
          intents: stryMutAct_9fa48("14867") ? ["Stryker was here"] : (stryCov_9fa48("14867"), []),
          actions: stryMutAct_9fa48("14868") ? [] : (stryCov_9fa48("14868"), [stryMutAct_9fa48("14869") ? {} : (stryCov_9fa48("14869"), {
            kind: canAcceptLinkIdentify(event.initiator) ? stryMutAct_9fa48("14870") ? "" : (stryCov_9fa48("14870"), "accept") : stryMutAct_9fa48("14871") ? "" : (stryCov_9fa48("14871"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14872") ? {} : (stryCov_9fa48("14872"), {
      state,
      intents: stryMutAct_9fa48("14873") ? ["Stryker was here"] : (stryCov_9fa48("14873"), []),
      actions: stryMutAct_9fa48("14874") ? ["Stryker was here"] : (stryCov_9fa48("14874"), [])
    });
  }
}
export function shouldAcceptLinkIdentifyNow(actions: ReadonlyArray<AcceptLinkIdentifyAction>): boolean {
  if (stryMutAct_9fa48("14875")) {
    {}
  } else {
    stryCov_9fa48("14875");
    return stryMutAct_9fa48("14876") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("14876"), actions.some(stryMutAct_9fa48("14877") ? () => undefined : (stryCov_9fa48("14877"), action => stryMutAct_9fa48("14880") ? action.kind !== "accept" : stryMutAct_9fa48("14879") ? false : stryMutAct_9fa48("14878") ? true : (stryCov_9fa48("14878", "14879", "14880"), action.kind === (stryMutAct_9fa48("14881") ? "" : (stryCov_9fa48("14881"), "accept"))))));
  }
}
export function shouldSkipLinkIdentifyAccept(actions: ReadonlyArray<AcceptLinkIdentifyAction>): boolean {
  if (stryMutAct_9fa48("14882")) {
    {}
  } else {
    stryCov_9fa48("14882");
    return stryMutAct_9fa48("14883") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("14883"), actions.some(stryMutAct_9fa48("14884") ? () => undefined : (stryCov_9fa48("14884"), action => stryMutAct_9fa48("14887") ? action.kind !== "skip" : stryMutAct_9fa48("14886") ? false : stryMutAct_9fa48("14885") ? true : (stryCov_9fa48("14885", "14886", "14887"), action.kind === (stryMutAct_9fa48("14888") ? "" : (stryCov_9fa48("14888"), "skip"))))));
  }
}
export type LinkIdentifyOutcome = "accept" | "reject";

/**
 * Whether LINKIDENTIFY payload crypto gates allow setting remoteIdentity.
 * Decrypt / split / key load / signature verification stay at the adapter edge.
 */
export function planLinkIdentifyOutcome(input: {
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
  readonly partsPresent: boolean;
  readonly identityPresent: boolean;
  readonly signatureValid: boolean;
}): LinkIdentifyOutcome {
  if (stryMutAct_9fa48("14889")) {
    {}
  } else {
    stryCov_9fa48("14889");
    if (stryMutAct_9fa48("14892") ? (!input.canAccept || !input.plaintextPresent || !input.partsPresent || !input.identityPresent) && !input.signatureValid : stryMutAct_9fa48("14891") ? false : stryMutAct_9fa48("14890") ? true : (stryCov_9fa48("14890", "14891", "14892"), (stryMutAct_9fa48("14894") ? (!input.canAccept || !input.plaintextPresent || !input.partsPresent) && !input.identityPresent : stryMutAct_9fa48("14893") ? false : (stryCov_9fa48("14893", "14894"), (stryMutAct_9fa48("14896") ? (!input.canAccept || !input.plaintextPresent) && !input.partsPresent : stryMutAct_9fa48("14895") ? false : (stryCov_9fa48("14895", "14896"), (stryMutAct_9fa48("14898") ? !input.canAccept && !input.plaintextPresent : stryMutAct_9fa48("14897") ? false : (stryCov_9fa48("14897", "14898"), (stryMutAct_9fa48("14899") ? input.canAccept : (stryCov_9fa48("14899"), !input.canAccept)) || (stryMutAct_9fa48("14900") ? input.plaintextPresent : (stryCov_9fa48("14900"), !input.plaintextPresent)))) || (stryMutAct_9fa48("14901") ? input.partsPresent : (stryCov_9fa48("14901"), !input.partsPresent)))) || (stryMutAct_9fa48("14902") ? input.identityPresent : (stryCov_9fa48("14902"), !input.identityPresent)))) || (stryMutAct_9fa48("14903") ? input.signatureValid : (stryCov_9fa48("14903"), !input.signatureValid)))) {
      if (stryMutAct_9fa48("14904")) {
        {}
      } else {
        stryCov_9fa48("14904");
        return stryMutAct_9fa48("14905") ? "" : (stryCov_9fa48("14905"), "reject");
      }
    }
    return stryMutAct_9fa48("14906") ? "" : (stryCov_9fa48("14906"), "accept");
  }
}

/**
 * Identify-outcome plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkIdentifyOutcome` /
 * `outcome ===` reads beside the step). Nested under
 * {@link stepLinkIdentifyWithActions}.
 */
export type LinkIdentifyOutcomePlanState = Record<string, never>;
export type LinkIdentifyOutcomePlanEvent = Event | {
  readonly kind: "identify/outcome-plan-gate";
  readonly canAccept: boolean;
  readonly plaintextPresent: boolean;
  readonly partsPresent: boolean;
  readonly identityPresent: boolean;
  readonly signatureValid: boolean;
};
export type LinkIdentifyOutcomePlanAction = {
  readonly kind: "accept";
} | {
  readonly kind: "reject";
};
export interface LinkIdentifyOutcomePlanStepResult {
  readonly state: LinkIdentifyOutcomePlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkIdentifyOutcomePlanAction[];
}
export function initialLinkIdentifyOutcomePlanState(): LinkIdentifyOutcomePlanState {
  if (stryMutAct_9fa48("14907")) {
    {}
  } else {
    stryCov_9fa48("14907");
    return {};
  }
}
export function stepLinkIdentifyOutcomePlanWithActions(state: LinkIdentifyOutcomePlanState, event: LinkIdentifyOutcomePlanEvent): LinkIdentifyOutcomePlanStepResult {
  if (stryMutAct_9fa48("14908")) {
    {}
  } else {
    stryCov_9fa48("14908");
    if (stryMutAct_9fa48("14911") ? event.kind !== "identify/outcome-plan-gate" : stryMutAct_9fa48("14910") ? false : stryMutAct_9fa48("14909") ? true : (stryCov_9fa48("14909", "14910", "14911"), event.kind === (stryMutAct_9fa48("14912") ? "" : (stryCov_9fa48("14912"), "identify/outcome-plan-gate")))) {
      if (stryMutAct_9fa48("14913")) {
        {}
      } else {
        stryCov_9fa48("14913");
        return stryMutAct_9fa48("14914") ? {} : (stryCov_9fa48("14914"), {
          state,
          intents: stryMutAct_9fa48("14915") ? ["Stryker was here"] : (stryCov_9fa48("14915"), []),
          actions: stryMutAct_9fa48("14916") ? [] : (stryCov_9fa48("14916"), [stryMutAct_9fa48("14917") ? {} : (stryCov_9fa48("14917"), {
            kind: planLinkIdentifyOutcome(stryMutAct_9fa48("14918") ? {} : (stryCov_9fa48("14918"), {
              canAccept: event.canAccept,
              plaintextPresent: event.plaintextPresent,
              partsPresent: event.partsPresent,
              identityPresent: event.identityPresent,
              signatureValid: event.signatureValid
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("14919") ? {} : (stryCov_9fa48("14919"), {
      state,
      intents: stryMutAct_9fa48("14920") ? ["Stryker was here"] : (stryCov_9fa48("14920"), []),
      actions: stryMutAct_9fa48("14921") ? ["Stryker was here"] : (stryCov_9fa48("14921"), [])
    });
  }
}
export function shouldAcceptLinkIdentifyOutcomePlan(actions: ReadonlyArray<LinkIdentifyOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("14922")) {
    {}
  } else {
    stryCov_9fa48("14922");
    return stryMutAct_9fa48("14923") ? actions.every(action => action.kind === "accept") : (stryCov_9fa48("14923"), actions.some(stryMutAct_9fa48("14924") ? () => undefined : (stryCov_9fa48("14924"), action => stryMutAct_9fa48("14927") ? action.kind !== "accept" : stryMutAct_9fa48("14926") ? false : stryMutAct_9fa48("14925") ? true : (stryCov_9fa48("14925", "14926", "14927"), action.kind === (stryMutAct_9fa48("14928") ? "" : (stryCov_9fa48("14928"), "accept"))))));
  }
}
export function shouldRejectLinkIdentifyOutcomePlan(actions: ReadonlyArray<LinkIdentifyOutcomePlanAction>): boolean {
  if (stryMutAct_9fa48("14929")) {
    {}
  } else {
    stryCov_9fa48("14929");
    return stryMutAct_9fa48("14930") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("14930"), actions.some(stryMutAct_9fa48("14931") ? () => undefined : (stryCov_9fa48("14931"), action => stryMutAct_9fa48("14934") ? action.kind !== "reject" : stryMutAct_9fa48("14933") ? false : stryMutAct_9fa48("14932") ? true : (stryCov_9fa48("14932", "14933", "14934"), action.kind === (stryMutAct_9fa48("14935") ? "" : (stryCov_9fa48("14935"), "reject"))))));
  }
}

/** Extract the identify-outcome plan from actions; null when empty. */
export function linkIdentifyOutcomePlanFromActions(actions: ReadonlyArray<LinkIdentifyOutcomePlanAction>): LinkIdentifyOutcome | null {
  if (stryMutAct_9fa48("14936")) {
    {}
  } else {
    stryCov_9fa48("14936");
    const action = actions.find(stryMutAct_9fa48("14937") ? () => undefined : (stryCov_9fa48("14937"), entry => stryMutAct_9fa48("14940") ? entry.kind === "accept" && entry.kind === "reject" : stryMutAct_9fa48("14939") ? false : stryMutAct_9fa48("14938") ? true : (stryCov_9fa48("14938", "14939", "14940"), (stryMutAct_9fa48("14942") ? entry.kind !== "accept" : stryMutAct_9fa48("14941") ? false : (stryCov_9fa48("14941", "14942"), entry.kind === (stryMutAct_9fa48("14943") ? "" : (stryCov_9fa48("14943"), "accept")))) || (stryMutAct_9fa48("14945") ? entry.kind !== "reject" : stryMutAct_9fa48("14944") ? false : (stryCov_9fa48("14944", "14945"), entry.kind === (stryMutAct_9fa48("14946") ? "" : (stryCov_9fa48("14946"), "reject")))))));
    return stryMutAct_9fa48("14947") ? action?.kind && null : (stryCov_9fa48("14947"), (stryMutAct_9fa48("14948") ? action.kind : (stryCov_9fa48("14948"), action?.kind)) ?? null);
  }
}

/**
 * Whether LINKIDENTIFY may commit remoteIdentity after {@link planLinkIdentifyOutcome}
 * and the identity reference remains present for narrowing.
 */
export function shouldCommitLinkRemoteIdentity(input: {
  readonly planAccept: boolean;
  readonly identityPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("14949")) {
    {}
  } else {
    stryCov_9fa48("14949");
    return stryMutAct_9fa48("14952") ? input.planAccept || input.identityPresent : stryMutAct_9fa48("14951") ? false : stryMutAct_9fa48("14950") ? true : (stryCov_9fa48("14950", "14951", "14952"), input.planAccept && input.identityPresent);
  }
}

/**
 * LINKIDENTIFY commit-remote-identity apply gate is event-driven; no durable
 * session fields. Conclusions leave via machine actions (no ad-hoc
 * `shouldCommitLinkRemoteIdentity` reads beside the step).
 */
export type CommitLinkRemoteIdentityState = Record<string, never>;
export type CommitLinkRemoteIdentityEvent = Event | {
  readonly kind: "link-identify/commit-remote-identity-gate";
  readonly planAccept: boolean;
  readonly identityPresent: boolean;
};
export type CommitLinkRemoteIdentityAction = {
  readonly kind: "commit";
} | {
  readonly kind: "skip";
};
export interface CommitLinkRemoteIdentityStepResult {
  readonly state: CommitLinkRemoteIdentityState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CommitLinkRemoteIdentityAction[];
}
export function initialCommitLinkRemoteIdentityState(): CommitLinkRemoteIdentityState {
  if (stryMutAct_9fa48("14953")) {
    {}
  } else {
    stryCov_9fa48("14953");
    return {};
  }
}
export function stepCommitLinkRemoteIdentityWithActions(state: CommitLinkRemoteIdentityState, event: CommitLinkRemoteIdentityEvent): CommitLinkRemoteIdentityStepResult {
  if (stryMutAct_9fa48("14954")) {
    {}
  } else {
    stryCov_9fa48("14954");
    if (stryMutAct_9fa48("14957") ? event.kind !== "link-identify/commit-remote-identity-gate" : stryMutAct_9fa48("14956") ? false : stryMutAct_9fa48("14955") ? true : (stryCov_9fa48("14955", "14956", "14957"), event.kind === (stryMutAct_9fa48("14958") ? "" : (stryCov_9fa48("14958"), "link-identify/commit-remote-identity-gate")))) {
      if (stryMutAct_9fa48("14959")) {
        {}
      } else {
        stryCov_9fa48("14959");
        return stryMutAct_9fa48("14960") ? {} : (stryCov_9fa48("14960"), {
          state,
          intents: stryMutAct_9fa48("14961") ? ["Stryker was here"] : (stryCov_9fa48("14961"), []),
          actions: stryMutAct_9fa48("14962") ? [] : (stryCov_9fa48("14962"), [stryMutAct_9fa48("14963") ? {} : (stryCov_9fa48("14963"), {
            kind: shouldCommitLinkRemoteIdentity(stryMutAct_9fa48("14964") ? {} : (stryCov_9fa48("14964"), {
              planAccept: event.planAccept,
              identityPresent: event.identityPresent
            })) ? stryMutAct_9fa48("14965") ? "" : (stryCov_9fa48("14965"), "commit") : stryMutAct_9fa48("14966") ? "" : (stryCov_9fa48("14966"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14967") ? {} : (stryCov_9fa48("14967"), {
      state,
      intents: stryMutAct_9fa48("14968") ? ["Stryker was here"] : (stryCov_9fa48("14968"), []),
      actions: stryMutAct_9fa48("14969") ? ["Stryker was here"] : (stryCov_9fa48("14969"), [])
    });
  }
}
export function shouldCommitLinkRemoteIdentityNow(actions: ReadonlyArray<CommitLinkRemoteIdentityAction>): boolean {
  if (stryMutAct_9fa48("14970")) {
    {}
  } else {
    stryCov_9fa48("14970");
    return stryMutAct_9fa48("14971") ? actions.every(action => action.kind === "commit") : (stryCov_9fa48("14971"), actions.some(stryMutAct_9fa48("14972") ? () => undefined : (stryCov_9fa48("14972"), action => stryMutAct_9fa48("14975") ? action.kind !== "commit" : stryMutAct_9fa48("14974") ? false : stryMutAct_9fa48("14973") ? true : (stryCov_9fa48("14973", "14974", "14975"), action.kind === (stryMutAct_9fa48("14976") ? "" : (stryCov_9fa48("14976"), "commit"))))));
  }
}
export function shouldSkipCommitLinkRemoteIdentity(actions: ReadonlyArray<CommitLinkRemoteIdentityAction>): boolean {
  if (stryMutAct_9fa48("14977")) {
    {}
  } else {
    stryCov_9fa48("14977");
    return stryMutAct_9fa48("14978") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("14978"), actions.some(stryMutAct_9fa48("14979") ? () => undefined : (stryCov_9fa48("14979"), action => stryMutAct_9fa48("14982") ? action.kind !== "skip" : stryMutAct_9fa48("14981") ? false : stryMutAct_9fa48("14980") ? true : (stryCov_9fa48("14980", "14981", "14982"), action.kind === (stryMutAct_9fa48("14983") ? "" : (stryCov_9fa48("14983"), "skip"))))));
  }
}
export interface LinkIdentifyState {
  readonly initiator: boolean;
}
export type LinkIdentifyEvent = Event | {
  readonly kind: "identify/received";
  readonly plaintextPresent: boolean;
  readonly partsPresent: boolean;
  readonly identityPresent: boolean;
  readonly signatureValid: boolean;
};

/**
 * Adapter applies reject / commit only from these actions.
 * Plan nested via {@link stepLinkIdentifyOutcomePlanWithActions}
 * (`accept`|`reject`).
 */
export type LinkIdentifyAction = {
  readonly kind: "reject";
} | {
  readonly kind: "commit";
};
export interface LinkIdentifyStepResult {
  readonly state: LinkIdentifyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkIdentifyAction[];
}
export function initialLinkIdentifyState(input: {
  readonly initiator: boolean;
}): LinkIdentifyState {
  if (stryMutAct_9fa48("14984")) {
    {}
  } else {
    stryCov_9fa48("14984");
    return stryMutAct_9fa48("14985") ? {} : (stryCov_9fa48("14985"), {
      initiator: input.initiator
    });
  }
}
export const stepLinkIdentify: StepFn<LinkIdentifyState> = (state, event) => {
  if (stryMutAct_9fa48("14986")) {
    {}
  } else {
    stryCov_9fa48("14986");
    const result = stepLinkIdentifyInner(state, event as LinkIdentifyEvent);
    return stryMutAct_9fa48("14987") ? {} : (stryCov_9fa48("14987"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkIdentifyWithActions(state: LinkIdentifyState, event: LinkIdentifyEvent): LinkIdentifyStepResult {
  if (stryMutAct_9fa48("14988")) {
    {}
  } else {
    stryCov_9fa48("14988");
    return stepLinkIdentifyInner(state, event);
  }
}

/** Whether step actions include reject. */
export function shouldRejectLinkIdentify(actions: ReadonlyArray<LinkIdentifyAction>): boolean {
  if (stryMutAct_9fa48("14989")) {
    {}
  } else {
    stryCov_9fa48("14989");
    return stryMutAct_9fa48("14990") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("14990"), actions.some(stryMutAct_9fa48("14991") ? () => undefined : (stryCov_9fa48("14991"), action => stryMutAct_9fa48("14994") ? action.kind !== "reject" : stryMutAct_9fa48("14993") ? false : stryMutAct_9fa48("14992") ? true : (stryCov_9fa48("14992", "14993", "14994"), action.kind === (stryMutAct_9fa48("14995") ? "" : (stryCov_9fa48("14995"), "reject"))))));
  }
}

/** Whether step actions include commit (set remoteIdentity + callback). */
export function shouldCommitLinkIdentify(actions: ReadonlyArray<LinkIdentifyAction>): boolean {
  if (stryMutAct_9fa48("14996")) {
    {}
  } else {
    stryCov_9fa48("14996");
    return stryMutAct_9fa48("14997") ? actions.every(action => action.kind === "commit") : (stryCov_9fa48("14997"), actions.some(stryMutAct_9fa48("14998") ? () => undefined : (stryCov_9fa48("14998"), action => stryMutAct_9fa48("15001") ? action.kind !== "commit" : stryMutAct_9fa48("15000") ? false : stryMutAct_9fa48("14999") ? true : (stryCov_9fa48("14999", "15000", "15001"), action.kind === (stryMutAct_9fa48("15002") ? "" : (stryCov_9fa48("15002"), "commit"))))));
  }
}
function stepLinkIdentifyInner(state: LinkIdentifyState, event: LinkIdentifyEvent): LinkIdentifyStepResult {
  if (stryMutAct_9fa48("15003")) {
    {}
  } else {
    stryCov_9fa48("15003");
    if (stryMutAct_9fa48("15006") ? event.kind !== "identify/received" : stryMutAct_9fa48("15005") ? false : stryMutAct_9fa48("15004") ? true : (stryCov_9fa48("15004", "15005", "15006"), event.kind === (stryMutAct_9fa48("15007") ? "" : (stryCov_9fa48("15007"), "identify/received")))) {
      if (stryMutAct_9fa48("15008")) {
        {}
      } else {
        stryCov_9fa48("15008");
        const planActions = stepLinkIdentifyOutcomePlanWithActions(initialLinkIdentifyOutcomePlanState(), stryMutAct_9fa48("15009") ? {} : (stryCov_9fa48("15009"), {
          kind: stryMutAct_9fa48("15010") ? "" : (stryCov_9fa48("15010"), "identify/outcome-plan-gate"),
          canAccept: canAcceptLinkIdentify(state.initiator),
          plaintextPresent: event.plaintextPresent,
          partsPresent: event.partsPresent,
          identityPresent: event.identityPresent,
          signatureValid: event.signatureValid
        })).actions;
        const commitStepped = stepCommitLinkRemoteIdentityWithActions(initialCommitLinkRemoteIdentityState(), stryMutAct_9fa48("15011") ? {} : (stryCov_9fa48("15011"), {
          kind: stryMutAct_9fa48("15012") ? "" : (stryCov_9fa48("15012"), "link-identify/commit-remote-identity-gate"),
          planAccept: shouldAcceptLinkIdentifyOutcomePlan(planActions),
          identityPresent: event.identityPresent
        }));
        if (stryMutAct_9fa48("15015") ? false : stryMutAct_9fa48("15014") ? true : stryMutAct_9fa48("15013") ? shouldCommitLinkRemoteIdentityNow(commitStepped.actions) : (stryCov_9fa48("15013", "15014", "15015"), !shouldCommitLinkRemoteIdentityNow(commitStepped.actions))) {
          if (stryMutAct_9fa48("15016")) {
            {}
          } else {
            stryCov_9fa48("15016");
            return stryMutAct_9fa48("15017") ? {} : (stryCov_9fa48("15017"), {
              state,
              intents: stryMutAct_9fa48("15018") ? ["Stryker was here"] : (stryCov_9fa48("15018"), []),
              actions: stryMutAct_9fa48("15019") ? [] : (stryCov_9fa48("15019"), [stryMutAct_9fa48("15020") ? {} : (stryCov_9fa48("15020"), {
                kind: stryMutAct_9fa48("15021") ? "" : (stryCov_9fa48("15021"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("15022") ? {} : (stryCov_9fa48("15022"), {
          state,
          intents: stryMutAct_9fa48("15023") ? ["Stryker was here"] : (stryCov_9fa48("15023"), []),
          actions: stryMutAct_9fa48("15024") ? [] : (stryCov_9fa48("15024"), [stryMutAct_9fa48("15025") ? {} : (stryCov_9fa48("15025"), {
            kind: stryMutAct_9fa48("15026") ? "" : (stryCov_9fa48("15026"), "commit")
          })])
        });
      }
    }
    return stryMutAct_9fa48("15027") ? {} : (stryCov_9fa48("15027"), {
      state,
      intents: stryMutAct_9fa48("15028") ? ["Stryker was here"] : (stryCov_9fa48("15028"), []),
      actions: stryMutAct_9fa48("15029") ? ["Stryker was here"] : (stryCov_9fa48("15029"), [])
    });
  }
}
export interface LinkIdentifyPayloadFields {
  readonly publicKey: Uint8Array;
  readonly signature: Uint8Array;
}
export function splitLinkIdentifyPayload(plaintext: Uint8Array): LinkIdentifyPayloadFields | null {
  if (stryMutAct_9fa48("15030")) {
    {}
  } else {
    stryCov_9fa48("15030");
    if (stryMutAct_9fa48("15033") ? plaintext.length === LINK_IDENTIFY_PAYLOAD_SIZE : stryMutAct_9fa48("15032") ? false : stryMutAct_9fa48("15031") ? true : (stryCov_9fa48("15031", "15032", "15033"), plaintext.length !== LINK_IDENTIFY_PAYLOAD_SIZE)) {
      if (stryMutAct_9fa48("15034")) {
        {}
      } else {
        stryCov_9fa48("15034");
        return null;
      }
    }
    return stryMutAct_9fa48("15035") ? {} : (stryCov_9fa48("15035"), {
      publicKey: plaintext.subarray(0, LINK_IDENTIFY_PUBLIC_KEY_SIZE),
      signature: plaintext.subarray(LINK_IDENTIFY_PUBLIC_KEY_SIZE, LINK_IDENTIFY_PAYLOAD_SIZE)
    });
  }
}

/** Bytes signed by the identifying identity: linkId || publicKey. */
export function linkIdentifySignedMaterial(linkId: Uint8Array, publicKey: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("15036")) {
    {}
  } else {
    stryCov_9fa48("15036");
    const out = new Uint8Array(stryMutAct_9fa48("15037") ? linkId.length - publicKey.length : (stryCov_9fa48("15037"), linkId.length + publicKey.length));
    out.set(linkId, 0);
    out.set(publicKey, linkId.length);
    return out;
  }
}

/**
 * Link-identify signed-material assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `linkIdentifySignedMaterial`
 * reads beside the step).
 */
export type LinkIdentifySignedMaterialState = Record<string, never>;
export type LinkIdentifySignedMaterialEvent = Event | {
  readonly kind: "link-identify/signed-material-gate";
  readonly linkId: Uint8Array;
  readonly publicKey: Uint8Array;
};
export type LinkIdentifySignedMaterialAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface LinkIdentifySignedMaterialStepResult {
  readonly state: LinkIdentifySignedMaterialState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkIdentifySignedMaterialAction[];
}
export function initialLinkIdentifySignedMaterialState(): LinkIdentifySignedMaterialState {
  if (stryMutAct_9fa48("15038")) {
    {}
  } else {
    stryCov_9fa48("15038");
    return {};
  }
}
export function stepLinkIdentifySignedMaterialWithActions(state: LinkIdentifySignedMaterialState, event: LinkIdentifySignedMaterialEvent): LinkIdentifySignedMaterialStepResult {
  if (stryMutAct_9fa48("15039")) {
    {}
  } else {
    stryCov_9fa48("15039");
    if (stryMutAct_9fa48("15042") ? event.kind !== "link-identify/signed-material-gate" : stryMutAct_9fa48("15041") ? false : stryMutAct_9fa48("15040") ? true : (stryCov_9fa48("15040", "15041", "15042"), event.kind === (stryMutAct_9fa48("15043") ? "" : (stryCov_9fa48("15043"), "link-identify/signed-material-gate")))) {
      if (stryMutAct_9fa48("15044")) {
        {}
      } else {
        stryCov_9fa48("15044");
        return stryMutAct_9fa48("15045") ? {} : (stryCov_9fa48("15045"), {
          state,
          intents: stryMutAct_9fa48("15046") ? ["Stryker was here"] : (stryCov_9fa48("15046"), []),
          actions: stryMutAct_9fa48("15047") ? [] : (stryCov_9fa48("15047"), [stryMutAct_9fa48("15048") ? {} : (stryCov_9fa48("15048"), {
            kind: stryMutAct_9fa48("15049") ? "" : (stryCov_9fa48("15049"), "use-raw"),
            raw: linkIdentifySignedMaterial(event.linkId, event.publicKey)
          })])
        });
      }
    }
    return stryMutAct_9fa48("15050") ? {} : (stryCov_9fa48("15050"), {
      state,
      intents: stryMutAct_9fa48("15051") ? ["Stryker was here"] : (stryCov_9fa48("15051"), []),
      actions: stryMutAct_9fa48("15052") ? ["Stryker was here"] : (stryCov_9fa48("15052"), [])
    });
  }
}
export function shouldUseLinkIdentifySignedMaterial(actions: ReadonlyArray<LinkIdentifySignedMaterialAction>): boolean {
  if (stryMutAct_9fa48("15053")) {
    {}
  } else {
    stryCov_9fa48("15053");
    return stryMutAct_9fa48("15054") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("15054"), actions.some(stryMutAct_9fa48("15055") ? () => undefined : (stryCov_9fa48("15055"), action => stryMutAct_9fa48("15058") ? action.kind !== "use-raw" : stryMutAct_9fa48("15057") ? false : stryMutAct_9fa48("15056") ? true : (stryCov_9fa48("15056", "15057", "15058"), action.kind === (stryMutAct_9fa48("15059") ? "" : (stryCov_9fa48("15059"), "use-raw"))))));
  }
}

/** Extract link-identify signed material from step actions; null when no `use-raw`. */
export function linkIdentifySignedMaterialRawFromActions(actions: ReadonlyArray<LinkIdentifySignedMaterialAction>): Uint8Array | null {
  if (stryMutAct_9fa48("15060")) {
    {}
  } else {
    stryCov_9fa48("15060");
    const action = actions.find(stryMutAct_9fa48("15061") ? () => undefined : (stryCov_9fa48("15061"), entry => stryMutAct_9fa48("15064") ? entry.kind !== "use-raw" : stryMutAct_9fa48("15063") ? false : stryMutAct_9fa48("15062") ? true : (stryCov_9fa48("15062", "15063", "15064"), entry.kind === (stryMutAct_9fa48("15065") ? "" : (stryCov_9fa48("15065"), "use-raw")))));
    return (stryMutAct_9fa48("15068") ? action?.kind !== "use-raw" : stryMutAct_9fa48("15067") ? false : stryMutAct_9fa48("15066") ? true : (stryCov_9fa48("15066", "15067", "15068"), (stryMutAct_9fa48("15069") ? action.kind : (stryCov_9fa48("15069"), action?.kind)) === (stryMutAct_9fa48("15070") ? "" : (stryCov_9fa48("15070"), "use-raw")))) ? action.raw : null;
  }
}

/** Pack identify plaintext for outbound LINKIDENTIFY (publicKey || signature). */
export function packLinkIdentifyPayload(publicKey: Uint8Array, signature: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("15071")) {
    {}
  } else {
    stryCov_9fa48("15071");
    if (stryMutAct_9fa48("15074") ? publicKey.length !== LINK_IDENTIFY_PUBLIC_KEY_SIZE && signature.length !== LINK_IDENTIFY_SIGNATURE_SIZE : stryMutAct_9fa48("15073") ? false : stryMutAct_9fa48("15072") ? true : (stryCov_9fa48("15072", "15073", "15074"), (stryMutAct_9fa48("15076") ? publicKey.length === LINK_IDENTIFY_PUBLIC_KEY_SIZE : stryMutAct_9fa48("15075") ? false : (stryCov_9fa48("15075", "15076"), publicKey.length !== LINK_IDENTIFY_PUBLIC_KEY_SIZE)) || (stryMutAct_9fa48("15078") ? signature.length === LINK_IDENTIFY_SIGNATURE_SIZE : stryMutAct_9fa48("15077") ? false : (stryCov_9fa48("15077", "15078"), signature.length !== LINK_IDENTIFY_SIGNATURE_SIZE)))) {
      if (stryMutAct_9fa48("15079")) {
        {}
      } else {
        stryCov_9fa48("15079");
        throw new Error(stryMutAct_9fa48("15080") ? "" : (stryCov_9fa48("15080"), "Invalid link identify key or signature size"));
      }
    }
    const out = new Uint8Array(LINK_IDENTIFY_PAYLOAD_SIZE);
    out.set(publicKey, 0);
    out.set(signature, LINK_IDENTIFY_PUBLIC_KEY_SIZE);
    return out;
  }
}

/**
 * Link-identify pack framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `packLinkIdentifyPayload`
 * reads beside the step). Invalid sizes become `reject` (helper may throw).
 */
export type PackLinkIdentifyPayloadState = Record<string, never>;
export type PackLinkIdentifyPayloadEvent = Event | {
  readonly kind: "link-identify/pack-gate";
  readonly publicKey: Uint8Array;
  readonly signature: Uint8Array;
};
export type PackLinkIdentifyPayloadAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
} | {
  readonly kind: "reject";
};
export interface PackLinkIdentifyPayloadStepResult {
  readonly state: PackLinkIdentifyPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PackLinkIdentifyPayloadAction[];
}
export function initialPackLinkIdentifyPayloadState(): PackLinkIdentifyPayloadState {
  if (stryMutAct_9fa48("15081")) {
    {}
  } else {
    stryCov_9fa48("15081");
    return {};
  }
}
export function stepPackLinkIdentifyPayloadWithActions(state: PackLinkIdentifyPayloadState, event: PackLinkIdentifyPayloadEvent): PackLinkIdentifyPayloadStepResult {
  if (stryMutAct_9fa48("15082")) {
    {}
  } else {
    stryCov_9fa48("15082");
    if (stryMutAct_9fa48("15085") ? event.kind !== "link-identify/pack-gate" : stryMutAct_9fa48("15084") ? false : stryMutAct_9fa48("15083") ? true : (stryCov_9fa48("15083", "15084", "15085"), event.kind === (stryMutAct_9fa48("15086") ? "" : (stryCov_9fa48("15086"), "link-identify/pack-gate")))) {
      if (stryMutAct_9fa48("15087")) {
        {}
      } else {
        stryCov_9fa48("15087");
        try {
          if (stryMutAct_9fa48("15088")) {
            {}
          } else {
            stryCov_9fa48("15088");
            return stryMutAct_9fa48("15089") ? {} : (stryCov_9fa48("15089"), {
              state,
              intents: stryMutAct_9fa48("15090") ? ["Stryker was here"] : (stryCov_9fa48("15090"), []),
              actions: stryMutAct_9fa48("15091") ? [] : (stryCov_9fa48("15091"), [stryMutAct_9fa48("15092") ? {} : (stryCov_9fa48("15092"), {
                kind: stryMutAct_9fa48("15093") ? "" : (stryCov_9fa48("15093"), "use-raw"),
                raw: packLinkIdentifyPayload(event.publicKey, event.signature)
              })])
            });
          }
        } catch {
          if (stryMutAct_9fa48("15094")) {
            {}
          } else {
            stryCov_9fa48("15094");
            return stryMutAct_9fa48("15095") ? {} : (stryCov_9fa48("15095"), {
              state,
              intents: stryMutAct_9fa48("15096") ? ["Stryker was here"] : (stryCov_9fa48("15096"), []),
              actions: stryMutAct_9fa48("15097") ? [] : (stryCov_9fa48("15097"), [stryMutAct_9fa48("15098") ? {} : (stryCov_9fa48("15098"), {
                kind: stryMutAct_9fa48("15099") ? "" : (stryCov_9fa48("15099"), "reject")
              })])
            });
          }
        }
      }
    }
    return stryMutAct_9fa48("15100") ? {} : (stryCov_9fa48("15100"), {
      state,
      intents: stryMutAct_9fa48("15101") ? ["Stryker was here"] : (stryCov_9fa48("15101"), []),
      actions: stryMutAct_9fa48("15102") ? ["Stryker was here"] : (stryCov_9fa48("15102"), [])
    });
  }
}
export function shouldUsePackLinkIdentifyPayload(actions: ReadonlyArray<PackLinkIdentifyPayloadAction>): boolean {
  if (stryMutAct_9fa48("15103")) {
    {}
  } else {
    stryCov_9fa48("15103");
    return stryMutAct_9fa48("15104") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("15104"), actions.some(stryMutAct_9fa48("15105") ? () => undefined : (stryCov_9fa48("15105"), action => stryMutAct_9fa48("15108") ? action.kind !== "use-raw" : stryMutAct_9fa48("15107") ? false : stryMutAct_9fa48("15106") ? true : (stryCov_9fa48("15106", "15107", "15108"), action.kind === (stryMutAct_9fa48("15109") ? "" : (stryCov_9fa48("15109"), "use-raw"))))));
  }
}
export function shouldRejectPackLinkIdentifyPayload(actions: ReadonlyArray<PackLinkIdentifyPayloadAction>): boolean {
  if (stryMutAct_9fa48("15110")) {
    {}
  } else {
    stryCov_9fa48("15110");
    return stryMutAct_9fa48("15111") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15111"), actions.some(stryMutAct_9fa48("15112") ? () => undefined : (stryCov_9fa48("15112"), action => stryMutAct_9fa48("15115") ? action.kind !== "reject" : stryMutAct_9fa48("15114") ? false : stryMutAct_9fa48("15113") ? true : (stryCov_9fa48("15113", "15114", "15115"), action.kind === (stryMutAct_9fa48("15116") ? "" : (stryCov_9fa48("15116"), "reject"))))));
  }
}

/** Extract packed identify payload from step actions; null when no `use-raw`. */
export function packLinkIdentifyPayloadRawFromActions(actions: ReadonlyArray<PackLinkIdentifyPayloadAction>): Uint8Array | null {
  if (stryMutAct_9fa48("15117")) {
    {}
  } else {
    stryCov_9fa48("15117");
    const action = actions.find(stryMutAct_9fa48("15118") ? () => undefined : (stryCov_9fa48("15118"), entry => stryMutAct_9fa48("15121") ? entry.kind !== "use-raw" : stryMutAct_9fa48("15120") ? false : stryMutAct_9fa48("15119") ? true : (stryCov_9fa48("15119", "15120", "15121"), entry.kind === (stryMutAct_9fa48("15122") ? "" : (stryCov_9fa48("15122"), "use-raw")))));
    return (stryMutAct_9fa48("15125") ? action?.kind !== "use-raw" : stryMutAct_9fa48("15124") ? false : stryMutAct_9fa48("15123") ? true : (stryCov_9fa48("15123", "15124", "15125"), (stryMutAct_9fa48("15126") ? action.kind : (stryCov_9fa48("15126"), action?.kind)) === (stryMutAct_9fa48("15127") ? "" : (stryCov_9fa48("15127"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Link-identify split framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `splitLinkIdentifyPayload`
 * reads beside the step).
 */
export type SplitLinkIdentifyPayloadState = Record<string, never>;
export type SplitLinkIdentifyPayloadEvent = Event | {
  readonly kind: "link-identify/split-gate";
  readonly plaintext: Uint8Array;
};
export type SplitLinkIdentifyPayloadAction = {
  readonly kind: "use-fields";
  readonly fields: LinkIdentifyPayloadFields;
} | {
  readonly kind: "reject";
};
export interface SplitLinkIdentifyPayloadStepResult {
  readonly state: SplitLinkIdentifyPayloadState;
  readonly intents: readonly Intent[];
  readonly actions: readonly SplitLinkIdentifyPayloadAction[];
}
export function initialSplitLinkIdentifyPayloadState(): SplitLinkIdentifyPayloadState {
  if (stryMutAct_9fa48("15128")) {
    {}
  } else {
    stryCov_9fa48("15128");
    return {};
  }
}
export function stepSplitLinkIdentifyPayloadWithActions(state: SplitLinkIdentifyPayloadState, event: SplitLinkIdentifyPayloadEvent): SplitLinkIdentifyPayloadStepResult {
  if (stryMutAct_9fa48("15129")) {
    {}
  } else {
    stryCov_9fa48("15129");
    if (stryMutAct_9fa48("15132") ? event.kind !== "link-identify/split-gate" : stryMutAct_9fa48("15131") ? false : stryMutAct_9fa48("15130") ? true : (stryCov_9fa48("15130", "15131", "15132"), event.kind === (stryMutAct_9fa48("15133") ? "" : (stryCov_9fa48("15133"), "link-identify/split-gate")))) {
      if (stryMutAct_9fa48("15134")) {
        {}
      } else {
        stryCov_9fa48("15134");
        const fields = splitLinkIdentifyPayload(event.plaintext);
        if (stryMutAct_9fa48("15137") ? fields !== null : stryMutAct_9fa48("15136") ? false : stryMutAct_9fa48("15135") ? true : (stryCov_9fa48("15135", "15136", "15137"), fields === null)) {
          if (stryMutAct_9fa48("15138")) {
            {}
          } else {
            stryCov_9fa48("15138");
            return stryMutAct_9fa48("15139") ? {} : (stryCov_9fa48("15139"), {
              state,
              intents: stryMutAct_9fa48("15140") ? ["Stryker was here"] : (stryCov_9fa48("15140"), []),
              actions: stryMutAct_9fa48("15141") ? [] : (stryCov_9fa48("15141"), [stryMutAct_9fa48("15142") ? {} : (stryCov_9fa48("15142"), {
                kind: stryMutAct_9fa48("15143") ? "" : (stryCov_9fa48("15143"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("15144") ? {} : (stryCov_9fa48("15144"), {
          state,
          intents: stryMutAct_9fa48("15145") ? ["Stryker was here"] : (stryCov_9fa48("15145"), []),
          actions: stryMutAct_9fa48("15146") ? [] : (stryCov_9fa48("15146"), [stryMutAct_9fa48("15147") ? {} : (stryCov_9fa48("15147"), {
            kind: stryMutAct_9fa48("15148") ? "" : (stryCov_9fa48("15148"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("15149") ? {} : (stryCov_9fa48("15149"), {
      state,
      intents: stryMutAct_9fa48("15150") ? ["Stryker was here"] : (stryCov_9fa48("15150"), []),
      actions: stryMutAct_9fa48("15151") ? ["Stryker was here"] : (stryCov_9fa48("15151"), [])
    });
  }
}
export function shouldUseSplitLinkIdentifyPayload(actions: ReadonlyArray<SplitLinkIdentifyPayloadAction>): boolean {
  if (stryMutAct_9fa48("15152")) {
    {}
  } else {
    stryCov_9fa48("15152");
    return stryMutAct_9fa48("15153") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("15153"), actions.some(stryMutAct_9fa48("15154") ? () => undefined : (stryCov_9fa48("15154"), action => stryMutAct_9fa48("15157") ? action.kind !== "use-fields" : stryMutAct_9fa48("15156") ? false : stryMutAct_9fa48("15155") ? true : (stryCov_9fa48("15155", "15156", "15157"), action.kind === (stryMutAct_9fa48("15158") ? "" : (stryCov_9fa48("15158"), "use-fields"))))));
  }
}
export function shouldRejectSplitLinkIdentifyPayload(actions: ReadonlyArray<SplitLinkIdentifyPayloadAction>): boolean {
  if (stryMutAct_9fa48("15159")) {
    {}
  } else {
    stryCov_9fa48("15159");
    return stryMutAct_9fa48("15160") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("15160"), actions.some(stryMutAct_9fa48("15161") ? () => undefined : (stryCov_9fa48("15161"), action => stryMutAct_9fa48("15164") ? action.kind !== "reject" : stryMutAct_9fa48("15163") ? false : stryMutAct_9fa48("15162") ? true : (stryCov_9fa48("15162", "15163", "15164"), action.kind === (stryMutAct_9fa48("15165") ? "" : (stryCov_9fa48("15165"), "reject"))))));
  }
}

/** Extract split identify payload fields from step actions; null when no `use-fields`. */
export function linkIdentifyPayloadFieldsFromActions(actions: ReadonlyArray<SplitLinkIdentifyPayloadAction>): LinkIdentifyPayloadFields | null {
  if (stryMutAct_9fa48("15166")) {
    {}
  } else {
    stryCov_9fa48("15166");
    const action = actions.find(stryMutAct_9fa48("15167") ? () => undefined : (stryCov_9fa48("15167"), entry => stryMutAct_9fa48("15170") ? entry.kind !== "use-fields" : stryMutAct_9fa48("15169") ? false : stryMutAct_9fa48("15168") ? true : (stryCov_9fa48("15168", "15169", "15170"), entry.kind === (stryMutAct_9fa48("15171") ? "" : (stryCov_9fa48("15171"), "use-fields")))));
    return (stryMutAct_9fa48("15174") ? action?.kind !== "use-fields" : stryMutAct_9fa48("15173") ? false : stryMutAct_9fa48("15172") ? true : (stryCov_9fa48("15172", "15173", "15174"), (stryMutAct_9fa48("15175") ? action.kind : (stryCov_9fa48("15175"), action?.kind)) === (stryMutAct_9fa48("15176") ? "" : (stryCov_9fa48("15176"), "use-fields")))) ? action.fields : null;
  }
}