/** Extracted from link-establish.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure link establishment status transitions (handshake → proof/RTT → ACTIVE)
 * and inbound application-request dispatch (handler invoke → response send).
 * Crypto verification and packet IO stay at the adapter edge.
 * Conclusions leave via machine actions (no ad-hoc status / plan.kind reads
 * beside the step). RTT compute / merge conclusions leave via machine actions
 * (no ad-hoc `computeLinkRttSeconds` / `mergeLinkRtt` reads beside the step).
 * Send / closed / reuse / packet-interface / encrypt / request-allow /
 * last-data / inbound-DATA / keepalive-update / create-channel /
 * handshake / prove / owner-public-key / validate-proof / proof-crypto /
 * accept-RTT / identify / plaintext-dispatch / resend gates conclude
 * via machine actions (no ad-hoc `canLinkSend` / `isLinkClosed` /
 * `shouldReuseActiveLink` / `shouldAcceptLinkPacketInterface` /
 * `shouldEncryptLinkPayload` / `canLinkRequest` / `shouldUpdateLinkLastData` /
 * `isLinkInboundDataPacket` / `canUpdateLinkKeepalive` /
 * `shouldCreateLinkChannel` / `canPerformLinkHandshake` / `canProveLink` /
 * `canAcceptLinkOwnerPublicKey` / `canAcceptLinkRequestOwner` /
 * `canValidateLinkProof` /
 * `shouldAttemptLinkProofCrypto` / `canAcceptLinkRtt` /
 * `shouldTeardownLinkFromRtt` / `canIdentifyOnLink` /
 * `shouldDispatchLinkPlaintext` / `canResendLinkPacket` reads beside the step).
 * Link-member register / invoke-app-request-handler / send-app-request-response
 * gates conclude via machine actions (no ad-hoc `shouldRegisterLinkMember` /
 * `shouldInvokeLinkAppRequestHandler` / `shouldSendLinkAppRequestResponse`
 * reads beside the step).
 * Continue-validate-request apply gate conclusions leave via machine actions
 * (no ad-hoc `shouldContinueLinkValidateRequest` reads beside the step).
 * Destination request-allow conclusions leave via machine actions (no ad-hoc
 * `planDestinationRequestAllow` reads beside the step).
 * Accept-link-request-owner conclusions leave via machine actions (no ad-hoc
 * `canAcceptLinkRequestOwner` reads beside the step).
 * Send-link-app-response-allow conclusions leave via machine actions (no ad-hoc
 * `canSendLinkAppResponse` reads beside the step).
 * Validate-request / app-request / app-request-dispatch / app-request-response /
 * app-request-transmit-outcome / token-access plan leaves conclude via machine
 * actions (no ad-hoc `planLinkValidateRequest` / `planLinkAppRequest` /
 * `planLinkAppRequestDispatch` / `planLinkAppRequestResponse` /
 * `planLinkAppRequestTransmitOutcome` / `planLinkTokenAccess` / `plan ===`
 * reads beside the parent step).
 * Link register-list / activate-membership / unregister-membership plans nested via
 * {@link stepLinkRegisterListPlanWithActions} /
 * {@link stepLinkActivateMembershipPlanWithActions} /
 * {@link stepLinkUnregisterMembershipPlanWithActions}.
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
import { initialDestinationRequestAllowState, shouldAllowDestinationRequest, stepDestinationRequestAllowWithActions } from "../destination-allow.js";
import { linkPayloadFitsMdu } from "../link-metrics.js";
import { PacketTypeCode } from "../packet-header.js";
import { LinkStatus, type LinkStatusValue } from "../link-watchdog.js";
import { linkRegisterListPlanFromActions, planLinkRegisterList } from "./part-7.js";
import type { LinkRegisterListAction, LinkRegisterListEvent, LinkRegisterListPlanAction, LinkRegisterListPlanEvent } from "./part-7.js";
/**
 * Link register-list plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkRegisterList` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkRegisterListWithActions}.
 */
export type LinkRegisterListPlanState = Record<string, never>;
export interface LinkRegisterListPlanStepResult {
  readonly state: LinkRegisterListPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRegisterListPlanAction[];
}
export function initialLinkRegisterListPlanState(): LinkRegisterListPlanState {
  if (stryMutAct_9fa48("14279")) {
    {}
  } else {
    stryCov_9fa48("14279");
    return {};
  }
}
export function stepLinkRegisterListPlanWithActions(state: LinkRegisterListPlanState, event: LinkRegisterListPlanEvent): LinkRegisterListPlanStepResult {
  if (stryMutAct_9fa48("14280")) {
    {}
  } else {
    stryCov_9fa48("14280");
    if (stryMutAct_9fa48("14283") ? event.kind !== "link/register-list-plan-gate" : stryMutAct_9fa48("14282") ? false : stryMutAct_9fa48("14281") ? true : (stryCov_9fa48("14281", "14282", "14283"), event.kind === (stryMutAct_9fa48("14284") ? "" : (stryCov_9fa48("14284"), "link/register-list-plan-gate")))) {
      if (stryMutAct_9fa48("14285")) {
        {}
      } else {
        stryCov_9fa48("14285");
        return stryMutAct_9fa48("14286") ? {} : (stryCov_9fa48("14286"), {
          state,
          intents: stryMutAct_9fa48("14287") ? ["Stryker was here"] : (stryCov_9fa48("14287"), []),
          actions: stryMutAct_9fa48("14288") ? [] : (stryCov_9fa48("14288"), [stryMutAct_9fa48("14289") ? {} : (stryCov_9fa48("14289"), {
            kind: planLinkRegisterList(event.initiator)
          })])
        });
      }
    }
    return stryMutAct_9fa48("14290") ? {} : (stryCov_9fa48("14290"), {
      state,
      intents: stryMutAct_9fa48("14291") ? ["Stryker was here"] : (stryCov_9fa48("14291"), []),
      actions: stryMutAct_9fa48("14292") ? ["Stryker was here"] : (stryCov_9fa48("14292"), [])
    });
  }
}
export function shouldRegisterLinkPendingPlan(actions: ReadonlyArray<LinkRegisterListPlanAction>): boolean {
  if (stryMutAct_9fa48("14293")) {
    {}
  } else {
    stryCov_9fa48("14293");
    return stryMutAct_9fa48("14294") ? actions.every(action => action.kind === "pending") : (stryCov_9fa48("14294"), actions.some(stryMutAct_9fa48("14295") ? () => undefined : (stryCov_9fa48("14295"), action => stryMutAct_9fa48("14298") ? action.kind !== "pending" : stryMutAct_9fa48("14297") ? false : stryMutAct_9fa48("14296") ? true : (stryCov_9fa48("14296", "14297", "14298"), action.kind === (stryMutAct_9fa48("14299") ? "" : (stryCov_9fa48("14299"), "pending"))))));
  }
}
export function shouldRegisterLinkActivePlan(actions: ReadonlyArray<LinkRegisterListPlanAction>): boolean {
  if (stryMutAct_9fa48("14300")) {
    {}
  } else {
    stryCov_9fa48("14300");
    return stryMutAct_9fa48("14301") ? actions.every(action => action.kind === "active") : (stryCov_9fa48("14301"), actions.some(stryMutAct_9fa48("14302") ? () => undefined : (stryCov_9fa48("14302"), action => stryMutAct_9fa48("14305") ? action.kind !== "active" : stryMutAct_9fa48("14304") ? false : stryMutAct_9fa48("14303") ? true : (stryCov_9fa48("14303", "14304", "14305"), action.kind === (stryMutAct_9fa48("14306") ? "" : (stryCov_9fa48("14306"), "active"))))));
  }
}

/** Whether a transport link list should receive a new member (not already present). */
export function shouldRegisterLinkMember(alreadyPresent: boolean): boolean {
  if (stryMutAct_9fa48("14307")) {
    {}
  } else {
    stryCov_9fa48("14307");
    return stryMutAct_9fa48("14308") ? alreadyPresent : (stryCov_9fa48("14308"), !alreadyPresent);
  }
}

/**
 * Link-member register gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRegisterLinkMember`
 * reads beside the step).
 */
export type RegisterLinkMemberState = Record<string, never>;
export type RegisterLinkMemberEvent = Event | {
  readonly kind: "link/register-member-gate";
  readonly alreadyPresent: boolean;
};
export type RegisterLinkMemberAction = {
  readonly kind: "register";
} | {
  readonly kind: "skip";
};
export interface RegisterLinkMemberStepResult {
  readonly state: RegisterLinkMemberState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RegisterLinkMemberAction[];
}
export function initialRegisterLinkMemberState(): RegisterLinkMemberState {
  if (stryMutAct_9fa48("14309")) {
    {}
  } else {
    stryCov_9fa48("14309");
    return {};
  }
}
export function stepRegisterLinkMemberWithActions(state: RegisterLinkMemberState, event: RegisterLinkMemberEvent): RegisterLinkMemberStepResult {
  if (stryMutAct_9fa48("14310")) {
    {}
  } else {
    stryCov_9fa48("14310");
    if (stryMutAct_9fa48("14313") ? event.kind !== "link/register-member-gate" : stryMutAct_9fa48("14312") ? false : stryMutAct_9fa48("14311") ? true : (stryCov_9fa48("14311", "14312", "14313"), event.kind === (stryMutAct_9fa48("14314") ? "" : (stryCov_9fa48("14314"), "link/register-member-gate")))) {
      if (stryMutAct_9fa48("14315")) {
        {}
      } else {
        stryCov_9fa48("14315");
        return stryMutAct_9fa48("14316") ? {} : (stryCov_9fa48("14316"), {
          state,
          intents: stryMutAct_9fa48("14317") ? ["Stryker was here"] : (stryCov_9fa48("14317"), []),
          actions: stryMutAct_9fa48("14318") ? [] : (stryCov_9fa48("14318"), [stryMutAct_9fa48("14319") ? {} : (stryCov_9fa48("14319"), {
            kind: shouldRegisterLinkMember(event.alreadyPresent) ? stryMutAct_9fa48("14320") ? "" : (stryCov_9fa48("14320"), "register") : stryMutAct_9fa48("14321") ? "" : (stryCov_9fa48("14321"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("14322") ? {} : (stryCov_9fa48("14322"), {
      state,
      intents: stryMutAct_9fa48("14323") ? ["Stryker was here"] : (stryCov_9fa48("14323"), []),
      actions: stryMutAct_9fa48("14324") ? ["Stryker was here"] : (stryCov_9fa48("14324"), [])
    });
  }
}
export function shouldRegisterLinkMemberNow(actions: ReadonlyArray<RegisterLinkMemberAction>): boolean {
  if (stryMutAct_9fa48("14325")) {
    {}
  } else {
    stryCov_9fa48("14325");
    return stryMutAct_9fa48("14326") ? actions.every(action => action.kind === "register") : (stryCov_9fa48("14326"), actions.some(stryMutAct_9fa48("14327") ? () => undefined : (stryCov_9fa48("14327"), action => stryMutAct_9fa48("14330") ? action.kind !== "register" : stryMutAct_9fa48("14329") ? false : stryMutAct_9fa48("14328") ? true : (stryCov_9fa48("14328", "14329", "14330"), action.kind === (stryMutAct_9fa48("14331") ? "" : (stryCov_9fa48("14331"), "register"))))));
  }
}
export function shouldSkipRegisterLinkMember(actions: ReadonlyArray<RegisterLinkMemberAction>): boolean {
  if (stryMutAct_9fa48("14332")) {
    {}
  } else {
    stryCov_9fa48("14332");
    return stryMutAct_9fa48("14333") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("14333"), actions.some(stryMutAct_9fa48("14334") ? () => undefined : (stryCov_9fa48("14334"), action => stryMutAct_9fa48("14337") ? action.kind !== "skip" : stryMutAct_9fa48("14336") ? false : stryMutAct_9fa48("14335") ? true : (stryCov_9fa48("14335", "14336", "14337"), action.kind === (stryMutAct_9fa48("14338") ? "" : (stryCov_9fa48("14338"), "skip"))))));
  }
}
export type LinkActivateMembershipPlan = {
  readonly removePendingIndex: number | null;
  readonly appendActive: boolean;
};

/**
 * Activate a pending/initiator link: drop from pending (if present), unique-push to active.
 * Splice / push stay at the adapter.
 */
export function planLinkActivateMembership(input: {
  readonly pendingIndex: number;
  readonly alreadyActive: boolean;
}): LinkActivateMembershipPlan {
  if (stryMutAct_9fa48("14339")) {
    {}
  } else {
    stryCov_9fa48("14339");
    return stryMutAct_9fa48("14340") ? {} : (stryCov_9fa48("14340"), {
      removePendingIndex: (stryMutAct_9fa48("14344") ? input.pendingIndex < 0 : stryMutAct_9fa48("14343") ? input.pendingIndex > 0 : stryMutAct_9fa48("14342") ? false : stryMutAct_9fa48("14341") ? true : (stryCov_9fa48("14341", "14342", "14343", "14344"), input.pendingIndex >= 0)) ? input.pendingIndex : null,
      appendActive: stryMutAct_9fa48("14345") ? input.alreadyActive : (stryCov_9fa48("14345"), !input.alreadyActive)
    });
  }
}

/**
 * Link activate-membership plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkActivateMembership`
 * reads beside the step). Nested under {@link stepLinkActivateMembershipWithActions}.
 */
export type LinkActivateMembershipPlanState = Record<string, never>;
export type LinkActivateMembershipPlanEvent = Event | {
  readonly kind: "link/activate-membership-plan-gate";
  readonly pendingIndex: number;
  readonly alreadyActive: boolean;
};
export type LinkActivateMembershipPlanAction = {
  readonly kind: "plan";
  readonly removePendingIndex: number | null;
  readonly appendActive: boolean;
};
export interface LinkActivateMembershipPlanStepResult {
  readonly state: LinkActivateMembershipPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkActivateMembershipPlanAction[];
}
export function initialLinkActivateMembershipPlanState(): LinkActivateMembershipPlanState {
  if (stryMutAct_9fa48("14346")) {
    {}
  } else {
    stryCov_9fa48("14346");
    return {};
  }
}
export function stepLinkActivateMembershipPlanWithActions(state: LinkActivateMembershipPlanState, event: LinkActivateMembershipPlanEvent): LinkActivateMembershipPlanStepResult {
  if (stryMutAct_9fa48("14347")) {
    {}
  } else {
    stryCov_9fa48("14347");
    if (stryMutAct_9fa48("14350") ? event.kind !== "link/activate-membership-plan-gate" : stryMutAct_9fa48("14349") ? false : stryMutAct_9fa48("14348") ? true : (stryCov_9fa48("14348", "14349", "14350"), event.kind === (stryMutAct_9fa48("14351") ? "" : (stryCov_9fa48("14351"), "link/activate-membership-plan-gate")))) {
      if (stryMutAct_9fa48("14352")) {
        {}
      } else {
        stryCov_9fa48("14352");
        const plan = planLinkActivateMembership(stryMutAct_9fa48("14353") ? {} : (stryCov_9fa48("14353"), {
          pendingIndex: event.pendingIndex,
          alreadyActive: event.alreadyActive
        }));
        return stryMutAct_9fa48("14354") ? {} : (stryCov_9fa48("14354"), {
          state,
          intents: stryMutAct_9fa48("14355") ? ["Stryker was here"] : (stryCov_9fa48("14355"), []),
          actions: stryMutAct_9fa48("14356") ? [] : (stryCov_9fa48("14356"), [stryMutAct_9fa48("14357") ? {} : (stryCov_9fa48("14357"), {
            kind: stryMutAct_9fa48("14358") ? "" : (stryCov_9fa48("14358"), "plan"),
            removePendingIndex: plan.removePendingIndex,
            appendActive: plan.appendActive
          })])
        });
      }
    }
    return stryMutAct_9fa48("14359") ? {} : (stryCov_9fa48("14359"), {
      state,
      intents: stryMutAct_9fa48("14360") ? ["Stryker was here"] : (stryCov_9fa48("14360"), []),
      actions: stryMutAct_9fa48("14361") ? ["Stryker was here"] : (stryCov_9fa48("14361"), [])
    });
  }
}

/** Extract the activate-membership plan from actions; null when empty. */
export function linkActivateMembershipPlanFromActions(actions: ReadonlyArray<LinkActivateMembershipPlanAction>): LinkActivateMembershipPlan | null {
  if (stryMutAct_9fa48("14362")) {
    {}
  } else {
    stryCov_9fa48("14362");
    const action = actions.find(stryMutAct_9fa48("14363") ? () => undefined : (stryCov_9fa48("14363"), entry => stryMutAct_9fa48("14366") ? entry.kind !== "plan" : stryMutAct_9fa48("14365") ? false : stryMutAct_9fa48("14364") ? true : (stryCov_9fa48("14364", "14365", "14366"), entry.kind === (stryMutAct_9fa48("14367") ? "" : (stryCov_9fa48("14367"), "plan")))));
    if (stryMutAct_9fa48("14370") ? action !== undefined : stryMutAct_9fa48("14369") ? false : stryMutAct_9fa48("14368") ? true : (stryCov_9fa48("14368", "14369", "14370"), action === undefined)) {
      if (stryMutAct_9fa48("14371")) {
        {}
      } else {
        stryCov_9fa48("14371");
        return null;
      }
    }
    return stryMutAct_9fa48("14372") ? {} : (stryCov_9fa48("14372"), {
      removePendingIndex: action.removePendingIndex,
      appendActive: action.appendActive
    });
  }
}

/** Whether activate may splice pending after {@link planLinkActivateMembership}. */
export function shouldRemovePendingLinkMembership(indexPresent: boolean): boolean {
  if (stryMutAct_9fa48("14373")) {
    {}
  } else {
    stryCov_9fa48("14373");
    return indexPresent;
  }
}

/** Whether activate may unique-push to active after {@link planLinkActivateMembership}. */
export function shouldAppendActiveLinkMembership(appendActive: boolean): boolean {
  if (stryMutAct_9fa48("14374")) {
    {}
  } else {
    stryCov_9fa48("14374");
    return appendActive;
  }
}
export type LinkUnregisterMembershipPlan = {
  readonly removePendingIndex: number | null;
  readonly removeActiveIndex: number | null;
};

/**
 * Unregister from pending and/or active transport link lists.
 * Splice stays at the adapter.
 */
export function planLinkUnregisterMembership(input: {
  readonly pendingIndex: number;
  readonly activeIndex: number;
}): LinkUnregisterMembershipPlan {
  if (stryMutAct_9fa48("14375")) {
    {}
  } else {
    stryCov_9fa48("14375");
    return stryMutAct_9fa48("14376") ? {} : (stryCov_9fa48("14376"), {
      removePendingIndex: (stryMutAct_9fa48("14380") ? input.pendingIndex < 0 : stryMutAct_9fa48("14379") ? input.pendingIndex > 0 : stryMutAct_9fa48("14378") ? false : stryMutAct_9fa48("14377") ? true : (stryCov_9fa48("14377", "14378", "14379", "14380"), input.pendingIndex >= 0)) ? input.pendingIndex : null,
      removeActiveIndex: (stryMutAct_9fa48("14384") ? input.activeIndex < 0 : stryMutAct_9fa48("14383") ? input.activeIndex > 0 : stryMutAct_9fa48("14382") ? false : stryMutAct_9fa48("14381") ? true : (stryCov_9fa48("14381", "14382", "14383", "14384"), input.activeIndex >= 0)) ? input.activeIndex : null
    });
  }
}
export type LinkUnregisterMembershipPlanEvent = Event | {
  readonly kind: "link/unregister-membership-plan-gate";
  readonly pendingIndex: number;
  readonly activeIndex: number;
};
export type LinkUnregisterMembershipPlanAction = {
  readonly kind: "plan";
  readonly removePendingIndex: number | null;
  readonly removeActiveIndex: number | null;
};

/** Extract the unregister-membership plan from actions; null when empty. */
export function linkUnregisterMembershipPlanFromActions(actions: ReadonlyArray<LinkUnregisterMembershipPlanAction>): LinkUnregisterMembershipPlan | null {
  if (stryMutAct_9fa48("14385")) {
    {}
  } else {
    stryCov_9fa48("14385");
    const action = actions.find(stryMutAct_9fa48("14386") ? () => undefined : (stryCov_9fa48("14386"), entry => stryMutAct_9fa48("14389") ? entry.kind !== "plan" : stryMutAct_9fa48("14388") ? false : stryMutAct_9fa48("14387") ? true : (stryCov_9fa48("14387", "14388", "14389"), entry.kind === (stryMutAct_9fa48("14390") ? "" : (stryCov_9fa48("14390"), "plan")))));
    if (stryMutAct_9fa48("14393") ? action !== undefined : stryMutAct_9fa48("14392") ? false : stryMutAct_9fa48("14391") ? true : (stryCov_9fa48("14391", "14392", "14393"), action === undefined)) {
      if (stryMutAct_9fa48("14394")) {
        {}
      } else {
        stryCov_9fa48("14394");
        return null;
      }
    }
    return stryMutAct_9fa48("14395") ? {} : (stryCov_9fa48("14395"), {
      removePendingIndex: action.removePendingIndex,
      removeActiveIndex: action.removeActiveIndex
    });
  }
}

/**
 * Link register-list choice is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkRegisterListPlanWithActions} (`pending`|`active`).
 */
export type LinkRegisterListState = Record<string, never>;
export interface LinkRegisterListStepResult {
  readonly state: LinkRegisterListState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkRegisterListAction[];
}
export function stepLinkRegisterListWithActions(state: LinkRegisterListState, event: LinkRegisterListEvent): LinkRegisterListStepResult {
  if (stryMutAct_9fa48("14396")) {
    {}
  } else {
    stryCov_9fa48("14396");
    return stepLinkRegisterListInner(state, event);
  }
}
export function stepLinkRegisterListInner(state: LinkRegisterListState, event: LinkRegisterListEvent): LinkRegisterListStepResult {
  if (stryMutAct_9fa48("14397")) {
    {}
  } else {
    stryCov_9fa48("14397");
    if (stryMutAct_9fa48("14400") ? event.kind !== "link/register-list-gate" : stryMutAct_9fa48("14399") ? false : stryMutAct_9fa48("14398") ? true : (stryCov_9fa48("14398", "14399", "14400"), event.kind === (stryMutAct_9fa48("14401") ? "" : (stryCov_9fa48("14401"), "link/register-list-gate")))) {
      if (stryMutAct_9fa48("14402")) {
        {}
      } else {
        stryCov_9fa48("14402");
        const planActions = stepLinkRegisterListPlanWithActions(initialLinkRegisterListPlanState(), stryMutAct_9fa48("14403") ? {} : (stryCov_9fa48("14403"), {
          kind: stryMutAct_9fa48("14404") ? "" : (stryCov_9fa48("14404"), "link/register-list-plan-gate"),
          initiator: event.initiator
        })).actions;
        const plan = linkRegisterListPlanFromActions(planActions);
        if (stryMutAct_9fa48("14407") ? plan !== null : stryMutAct_9fa48("14406") ? false : stryMutAct_9fa48("14405") ? true : (stryCov_9fa48("14405", "14406", "14407"), plan === null)) {
          if (stryMutAct_9fa48("14408")) {
            {}
          } else {
            stryCov_9fa48("14408");
            return stryMutAct_9fa48("14409") ? {} : (stryCov_9fa48("14409"), {
              state,
              intents: stryMutAct_9fa48("14410") ? ["Stryker was here"] : (stryCov_9fa48("14410"), []),
              actions: stryMutAct_9fa48("14411") ? ["Stryker was here"] : (stryCov_9fa48("14411"), [])
            });
          }
        }
        return stryMutAct_9fa48("14412") ? {} : (stryCov_9fa48("14412"), {
          state,
          intents: stryMutAct_9fa48("14413") ? ["Stryker was here"] : (stryCov_9fa48("14413"), []),
          actions: stryMutAct_9fa48("14414") ? [] : (stryCov_9fa48("14414"), [stryMutAct_9fa48("14415") ? {} : (stryCov_9fa48("14415"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("14416") ? {} : (stryCov_9fa48("14416"), {
      state,
      intents: stryMutAct_9fa48("14417") ? ["Stryker was here"] : (stryCov_9fa48("14417"), []),
      actions: stryMutAct_9fa48("14418") ? ["Stryker was here"] : (stryCov_9fa48("14418"), [])
    });
  }
}

/**
 * Link activate-membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkActivateMembershipPlanWithActions}.
 */
export type LinkActivateMembershipState = Record<string, never>;
export type LinkActivateMembershipEvent = Event | {
  readonly kind: "link/activate-membership-gate";
  readonly pendingIndex: number;
  readonly alreadyActive: boolean;
};
export type LinkActivateMembershipAction = {
  readonly kind: "remove-pending";
  readonly index: number;
} | {
  readonly kind: "append-active";
};
export interface LinkActivateMembershipStepResult {
  readonly state: LinkActivateMembershipState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkActivateMembershipAction[];
}
export function stepLinkActivateMembershipWithActions(state: LinkActivateMembershipState, event: LinkActivateMembershipEvent): LinkActivateMembershipStepResult {
  if (stryMutAct_9fa48("14419")) {
    {}
  } else {
    stryCov_9fa48("14419");
    return stepLinkActivateMembershipInner(state, event);
  }
}
export function stepLinkActivateMembershipInner(state: LinkActivateMembershipState, event: LinkActivateMembershipEvent): LinkActivateMembershipStepResult {
  if (stryMutAct_9fa48("14420")) {
    {}
  } else {
    stryCov_9fa48("14420");
    if (stryMutAct_9fa48("14423") ? event.kind !== "link/activate-membership-gate" : stryMutAct_9fa48("14422") ? false : stryMutAct_9fa48("14421") ? true : (stryCov_9fa48("14421", "14422", "14423"), event.kind === (stryMutAct_9fa48("14424") ? "" : (stryCov_9fa48("14424"), "link/activate-membership-gate")))) {
      if (stryMutAct_9fa48("14425")) {
        {}
      } else {
        stryCov_9fa48("14425");
        const planActions = stepLinkActivateMembershipPlanWithActions(initialLinkActivateMembershipPlanState(), stryMutAct_9fa48("14426") ? {} : (stryCov_9fa48("14426"), {
          kind: stryMutAct_9fa48("14427") ? "" : (stryCov_9fa48("14427"), "link/activate-membership-plan-gate"),
          pendingIndex: event.pendingIndex,
          alreadyActive: event.alreadyActive
        })).actions;
        const plan = linkActivateMembershipPlanFromActions(planActions);
        if (stryMutAct_9fa48("14430") ? plan !== null : stryMutAct_9fa48("14429") ? false : stryMutAct_9fa48("14428") ? true : (stryCov_9fa48("14428", "14429", "14430"), plan === null)) {
          if (stryMutAct_9fa48("14431")) {
            {}
          } else {
            stryCov_9fa48("14431");
            return stryMutAct_9fa48("14432") ? {} : (stryCov_9fa48("14432"), {
              state,
              intents: stryMutAct_9fa48("14433") ? ["Stryker was here"] : (stryCov_9fa48("14433"), []),
              actions: stryMutAct_9fa48("14434") ? ["Stryker was here"] : (stryCov_9fa48("14434"), [])
            });
          }
        }
        const actions: LinkActivateMembershipAction[] = stryMutAct_9fa48("14435") ? ["Stryker was here"] : (stryCov_9fa48("14435"), []);
        if (stryMutAct_9fa48("14438") ? plan.removePendingIndex === null : stryMutAct_9fa48("14437") ? false : stryMutAct_9fa48("14436") ? true : (stryCov_9fa48("14436", "14437", "14438"), plan.removePendingIndex !== null)) {
          if (stryMutAct_9fa48("14439")) {
            {}
          } else {
            stryCov_9fa48("14439");
            actions.push(stryMutAct_9fa48("14440") ? {} : (stryCov_9fa48("14440"), {
              kind: stryMutAct_9fa48("14441") ? "" : (stryCov_9fa48("14441"), "remove-pending"),
              index: plan.removePendingIndex
            }));
          }
        }
        if (stryMutAct_9fa48("14443") ? false : stryMutAct_9fa48("14442") ? true : (stryCov_9fa48("14442", "14443"), plan.appendActive)) {
          if (stryMutAct_9fa48("14444")) {
            {}
          } else {
            stryCov_9fa48("14444");
            actions.push(stryMutAct_9fa48("14445") ? {} : (stryCov_9fa48("14445"), {
              kind: stryMutAct_9fa48("14446") ? "" : (stryCov_9fa48("14446"), "append-active")
            }));
          }
        }
        return stryMutAct_9fa48("14447") ? {} : (stryCov_9fa48("14447"), {
          state,
          intents: stryMutAct_9fa48("14448") ? ["Stryker was here"] : (stryCov_9fa48("14448"), []),
          actions
        });
      }
    }
    return stryMutAct_9fa48("14449") ? {} : (stryCov_9fa48("14449"), {
      state,
      intents: stryMutAct_9fa48("14450") ? ["Stryker was here"] : (stryCov_9fa48("14450"), []),
      actions: stryMutAct_9fa48("14451") ? ["Stryker was here"] : (stryCov_9fa48("14451"), [])
    });
  }
}
export type LinkUnregisterMembershipEvent = Event | {
  readonly kind: "link/unregister-membership-gate";
  readonly pendingIndex: number;
  readonly activeIndex: number;
};
export type LinkUnregisterMembershipAction = {
  readonly kind: "remove-pending";
  readonly index: number;
} | {
  readonly kind: "remove-active";
  readonly index: number;
};