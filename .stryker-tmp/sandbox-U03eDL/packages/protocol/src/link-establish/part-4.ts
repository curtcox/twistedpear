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
import { canLinkRequest, canUpdateLinkKeepalive } from "./part-3.js";
import type { UpdateLinkKeepaliveAllowAction, UpdateLinkKeepaliveAllowEvent, UpdateLinkKeepaliveAllowState, UpdateLinkKeepaliveAllowStepResult } from "./part-3.js";
export function initialUpdateLinkKeepaliveAllowState(): UpdateLinkKeepaliveAllowState {
  if (stryMutAct_9fa48("13319")) {
    {}
  } else {
    stryCov_9fa48("13319");
    return {};
  }
}
export function stepUpdateLinkKeepaliveAllowWithActions(state: UpdateLinkKeepaliveAllowState, event: UpdateLinkKeepaliveAllowEvent): UpdateLinkKeepaliveAllowStepResult {
  if (stryMutAct_9fa48("13320")) {
    {}
  } else {
    stryCov_9fa48("13320");
    if (stryMutAct_9fa48("13323") ? event.kind !== "link/update-keepalive-allow-gate" : stryMutAct_9fa48("13322") ? false : stryMutAct_9fa48("13321") ? true : (stryCov_9fa48("13321", "13322", "13323"), event.kind === (stryMutAct_9fa48("13324") ? "" : (stryCov_9fa48("13324"), "link/update-keepalive-allow-gate")))) {
      if (stryMutAct_9fa48("13325")) {
        {}
      } else {
        stryCov_9fa48("13325");
        return stryMutAct_9fa48("13326") ? {} : (stryCov_9fa48("13326"), {
          state,
          intents: stryMutAct_9fa48("13327") ? ["Stryker was here"] : (stryCov_9fa48("13327"), []),
          actions: stryMutAct_9fa48("13328") ? [] : (stryCov_9fa48("13328"), [stryMutAct_9fa48("13329") ? {} : (stryCov_9fa48("13329"), {
            kind: canUpdateLinkKeepalive(event.rttPresent) ? stryMutAct_9fa48("13330") ? "" : (stryCov_9fa48("13330"), "allow") : stryMutAct_9fa48("13331") ? "" : (stryCov_9fa48("13331"), "deny")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13332") ? {} : (stryCov_9fa48("13332"), {
      state,
      intents: stryMutAct_9fa48("13333") ? ["Stryker was here"] : (stryCov_9fa48("13333"), []),
      actions: stryMutAct_9fa48("13334") ? ["Stryker was here"] : (stryCov_9fa48("13334"), [])
    });
  }
}
export function shouldAllowUpdateLinkKeepalive(actions: ReadonlyArray<UpdateLinkKeepaliveAllowAction>): boolean {
  if (stryMutAct_9fa48("13335")) {
    {}
  } else {
    stryCov_9fa48("13335");
    return stryMutAct_9fa48("13336") ? actions.every(action => action.kind === "allow") : (stryCov_9fa48("13336"), actions.some(stryMutAct_9fa48("13337") ? () => undefined : (stryCov_9fa48("13337"), action => stryMutAct_9fa48("13340") ? action.kind !== "allow" : stryMutAct_9fa48("13339") ? false : stryMutAct_9fa48("13338") ? true : (stryCov_9fa48("13338", "13339", "13340"), action.kind === (stryMutAct_9fa48("13341") ? "" : (stryCov_9fa48("13341"), "allow"))))));
  }
}
export function shouldDenyUpdateLinkKeepalive(actions: ReadonlyArray<UpdateLinkKeepaliveAllowAction>): boolean {
  if (stryMutAct_9fa48("13342")) {
    {}
  } else {
    stryCov_9fa48("13342");
    return stryMutAct_9fa48("13343") ? actions.every(action => action.kind === "deny") : (stryCov_9fa48("13343"), actions.some(stryMutAct_9fa48("13344") ? () => undefined : (stryCov_9fa48("13344"), action => stryMutAct_9fa48("13347") ? action.kind !== "deny" : stryMutAct_9fa48("13346") ? false : stryMutAct_9fa48("13345") ? true : (stryCov_9fa48("13345", "13346", "13347"), action.kind === (stryMutAct_9fa48("13348") ? "" : (stryCov_9fa48("13348"), "deny"))))));
  }
}
/** Whether getChannel should construct a lazy Channel outlet. */
export function shouldCreateLinkChannel(channelPresent: boolean): boolean {
  if (stryMutAct_9fa48("13349")) {
    {}
  } else {
    stryCov_9fa48("13349");
    return stryMutAct_9fa48("13350") ? channelPresent : (stryCov_9fa48("13350"), !channelPresent);
  }
}

/**
 * shouldCreateLinkChannel gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldCreateLinkChannel` reads beside
 * the step).
 */
export type CreateLinkChannelState = Record<string, never>;
export type CreateLinkChannelEvent = Event | {
  readonly kind: "link/create-channel-gate";
  readonly channelPresent: boolean;
};
export type CreateLinkChannelAction = {
  readonly kind: "create";
} | {
  readonly kind: "reuse";
};
export interface CreateLinkChannelStepResult {
  readonly state: CreateLinkChannelState;
  readonly intents: readonly Intent[];
  readonly actions: readonly CreateLinkChannelAction[];
}
export function initialCreateLinkChannelState(): CreateLinkChannelState {
  if (stryMutAct_9fa48("13351")) {
    {}
  } else {
    stryCov_9fa48("13351");
    return {};
  }
}
export function stepCreateLinkChannelWithActions(state: CreateLinkChannelState, event: CreateLinkChannelEvent): CreateLinkChannelStepResult {
  if (stryMutAct_9fa48("13352")) {
    {}
  } else {
    stryCov_9fa48("13352");
    if (stryMutAct_9fa48("13355") ? event.kind !== "link/create-channel-gate" : stryMutAct_9fa48("13354") ? false : stryMutAct_9fa48("13353") ? true : (stryCov_9fa48("13353", "13354", "13355"), event.kind === (stryMutAct_9fa48("13356") ? "" : (stryCov_9fa48("13356"), "link/create-channel-gate")))) {
      if (stryMutAct_9fa48("13357")) {
        {}
      } else {
        stryCov_9fa48("13357");
        return stryMutAct_9fa48("13358") ? {} : (stryCov_9fa48("13358"), {
          state,
          intents: stryMutAct_9fa48("13359") ? ["Stryker was here"] : (stryCov_9fa48("13359"), []),
          actions: stryMutAct_9fa48("13360") ? [] : (stryCov_9fa48("13360"), [stryMutAct_9fa48("13361") ? {} : (stryCov_9fa48("13361"), {
            kind: shouldCreateLinkChannel(event.channelPresent) ? stryMutAct_9fa48("13362") ? "" : (stryCov_9fa48("13362"), "create") : stryMutAct_9fa48("13363") ? "" : (stryCov_9fa48("13363"), "reuse")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13364") ? {} : (stryCov_9fa48("13364"), {
      state,
      intents: stryMutAct_9fa48("13365") ? ["Stryker was here"] : (stryCov_9fa48("13365"), []),
      actions: stryMutAct_9fa48("13366") ? ["Stryker was here"] : (stryCov_9fa48("13366"), [])
    });
  }
}
export function shouldCreateLinkChannelNow(actions: ReadonlyArray<CreateLinkChannelAction>): boolean {
  if (stryMutAct_9fa48("13367")) {
    {}
  } else {
    stryCov_9fa48("13367");
    return stryMutAct_9fa48("13368") ? actions.every(action => action.kind === "create") : (stryCov_9fa48("13368"), actions.some(stryMutAct_9fa48("13369") ? () => undefined : (stryCov_9fa48("13369"), action => stryMutAct_9fa48("13372") ? action.kind !== "create" : stryMutAct_9fa48("13371") ? false : stryMutAct_9fa48("13370") ? true : (stryCov_9fa48("13370", "13371", "13372"), action.kind === (stryMutAct_9fa48("13373") ? "" : (stryCov_9fa48("13373"), "create"))))));
  }
}
export function shouldReuseLinkChannel(actions: ReadonlyArray<CreateLinkChannelAction>): boolean {
  if (stryMutAct_9fa48("13374")) {
    {}
  } else {
    stryCov_9fa48("13374");
    return stryMutAct_9fa48("13375") ? actions.every(action => action.kind === "reuse") : (stryCov_9fa48("13375"), actions.some(stryMutAct_9fa48("13376") ? () => undefined : (stryCov_9fa48("13376"), action => stryMutAct_9fa48("13379") ? action.kind !== "reuse" : stryMutAct_9fa48("13378") ? false : stryMutAct_9fa48("13377") ? true : (stryCov_9fa48("13377", "13378", "13379"), action.kind === (stryMutAct_9fa48("13380") ? "" : (stryCov_9fa48("13380"), "reuse"))))));
  }
}
export type LinkTokenAccessPlan = "reject-no-key" | "create" | "reuse";

/**
 * Token access for encrypt/decrypt: reject without derived key, create, or reuse.
 * Token construction stays at the adapter when the plan is create.
 */
export function planLinkTokenAccess(input: {
  readonly derivedKeyPresent: boolean;
  readonly tokenPresent: boolean;
}): LinkTokenAccessPlan {
  if (stryMutAct_9fa48("13381")) {
    {}
  } else {
    stryCov_9fa48("13381");
    if (stryMutAct_9fa48("13384") ? false : stryMutAct_9fa48("13383") ? true : stryMutAct_9fa48("13382") ? input.derivedKeyPresent : (stryCov_9fa48("13382", "13383", "13384"), !input.derivedKeyPresent)) {
      if (stryMutAct_9fa48("13385")) {
        {}
      } else {
        stryCov_9fa48("13385");
        return stryMutAct_9fa48("13386") ? "" : (stryCov_9fa48("13386"), "reject-no-key");
      }
    }
    if (stryMutAct_9fa48("13389") ? false : stryMutAct_9fa48("13388") ? true : stryMutAct_9fa48("13387") ? input.tokenPresent : (stryCov_9fa48("13387", "13388", "13389"), !input.tokenPresent)) {
      if (stryMutAct_9fa48("13390")) {
        {}
      } else {
        stryCov_9fa48("13390");
        return stryMutAct_9fa48("13391") ? "" : (stryCov_9fa48("13391"), "create");
      }
    }
    return stryMutAct_9fa48("13392") ? "" : (stryCov_9fa48("13392"), "reuse");
  }
}

/**
 * Token-access plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkTokenAccess` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkTokenAccessWithActions}.
 */
export type LinkTokenAccessPlanState = Record<string, never>;
export type LinkTokenAccessPlanEvent = Event | {
  readonly kind: "token/access-plan-gate";
  readonly derivedKeyPresent: boolean;
  readonly tokenPresent: boolean;
};
export type LinkTokenAccessPlanAction = {
  readonly kind: "reject-no-key";
} | {
  readonly kind: "create";
} | {
  readonly kind: "reuse";
};
export interface LinkTokenAccessPlanStepResult {
  readonly state: LinkTokenAccessPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTokenAccessPlanAction[];
}
export function initialLinkTokenAccessPlanState(): LinkTokenAccessPlanState {
  if (stryMutAct_9fa48("13393")) {
    {}
  } else {
    stryCov_9fa48("13393");
    return {};
  }
}
export function stepLinkTokenAccessPlanWithActions(state: LinkTokenAccessPlanState, event: LinkTokenAccessPlanEvent): LinkTokenAccessPlanStepResult {
  if (stryMutAct_9fa48("13394")) {
    {}
  } else {
    stryCov_9fa48("13394");
    if (stryMutAct_9fa48("13397") ? event.kind !== "token/access-plan-gate" : stryMutAct_9fa48("13396") ? false : stryMutAct_9fa48("13395") ? true : (stryCov_9fa48("13395", "13396", "13397"), event.kind === (stryMutAct_9fa48("13398") ? "" : (stryCov_9fa48("13398"), "token/access-plan-gate")))) {
      if (stryMutAct_9fa48("13399")) {
        {}
      } else {
        stryCov_9fa48("13399");
        return stryMutAct_9fa48("13400") ? {} : (stryCov_9fa48("13400"), {
          state,
          intents: stryMutAct_9fa48("13401") ? ["Stryker was here"] : (stryCov_9fa48("13401"), []),
          actions: stryMutAct_9fa48("13402") ? [] : (stryCov_9fa48("13402"), [stryMutAct_9fa48("13403") ? {} : (stryCov_9fa48("13403"), {
            kind: planLinkTokenAccess(stryMutAct_9fa48("13404") ? {} : (stryCov_9fa48("13404"), {
              derivedKeyPresent: event.derivedKeyPresent,
              tokenPresent: event.tokenPresent
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("13405") ? {} : (stryCov_9fa48("13405"), {
      state,
      intents: stryMutAct_9fa48("13406") ? ["Stryker was here"] : (stryCov_9fa48("13406"), []),
      actions: stryMutAct_9fa48("13407") ? ["Stryker was here"] : (stryCov_9fa48("13407"), [])
    });
  }
}
export function shouldRejectNoKeyLinkTokenAccessPlan(actions: ReadonlyArray<LinkTokenAccessPlanAction>): boolean {
  if (stryMutAct_9fa48("13408")) {
    {}
  } else {
    stryCov_9fa48("13408");
    return stryMutAct_9fa48("13409") ? actions.every(action => action.kind === "reject-no-key") : (stryCov_9fa48("13409"), actions.some(stryMutAct_9fa48("13410") ? () => undefined : (stryCov_9fa48("13410"), action => stryMutAct_9fa48("13413") ? action.kind !== "reject-no-key" : stryMutAct_9fa48("13412") ? false : stryMutAct_9fa48("13411") ? true : (stryCov_9fa48("13411", "13412", "13413"), action.kind === (stryMutAct_9fa48("13414") ? "" : (stryCov_9fa48("13414"), "reject-no-key"))))));
  }
}
export function shouldCreateLinkTokenAccessPlan(actions: ReadonlyArray<LinkTokenAccessPlanAction>): boolean {
  if (stryMutAct_9fa48("13415")) {
    {}
  } else {
    stryCov_9fa48("13415");
    return stryMutAct_9fa48("13416") ? actions.every(action => action.kind === "create") : (stryCov_9fa48("13416"), actions.some(stryMutAct_9fa48("13417") ? () => undefined : (stryCov_9fa48("13417"), action => stryMutAct_9fa48("13420") ? action.kind !== "create" : stryMutAct_9fa48("13419") ? false : stryMutAct_9fa48("13418") ? true : (stryCov_9fa48("13418", "13419", "13420"), action.kind === (stryMutAct_9fa48("13421") ? "" : (stryCov_9fa48("13421"), "create"))))));
  }
}
export function shouldReuseLinkTokenAccessPlan(actions: ReadonlyArray<LinkTokenAccessPlanAction>): boolean {
  if (stryMutAct_9fa48("13422")) {
    {}
  } else {
    stryCov_9fa48("13422");
    return stryMutAct_9fa48("13423") ? actions.every(action => action.kind === "reuse") : (stryCov_9fa48("13423"), actions.some(stryMutAct_9fa48("13424") ? () => undefined : (stryCov_9fa48("13424"), action => stryMutAct_9fa48("13427") ? action.kind !== "reuse" : stryMutAct_9fa48("13426") ? false : stryMutAct_9fa48("13425") ? true : (stryCov_9fa48("13425", "13426", "13427"), action.kind === (stryMutAct_9fa48("13428") ? "" : (stryCov_9fa48("13428"), "reuse"))))));
  }
}

/** Extract the token-access plan from actions; null when empty. */
export function linkTokenAccessPlanFromActions(actions: ReadonlyArray<LinkTokenAccessPlanAction>): LinkTokenAccessPlan | null {
  if (stryMutAct_9fa48("13429")) {
    {}
  } else {
    stryCov_9fa48("13429");
    const action = actions.find(stryMutAct_9fa48("13430") ? () => undefined : (stryCov_9fa48("13430"), entry => stryMutAct_9fa48("13433") ? (entry.kind === "reject-no-key" || entry.kind === "create") && entry.kind === "reuse" : stryMutAct_9fa48("13432") ? false : stryMutAct_9fa48("13431") ? true : (stryCov_9fa48("13431", "13432", "13433"), (stryMutAct_9fa48("13435") ? entry.kind === "reject-no-key" && entry.kind === "create" : stryMutAct_9fa48("13434") ? false : (stryCov_9fa48("13434", "13435"), (stryMutAct_9fa48("13437") ? entry.kind !== "reject-no-key" : stryMutAct_9fa48("13436") ? false : (stryCov_9fa48("13436", "13437"), entry.kind === (stryMutAct_9fa48("13438") ? "" : (stryCov_9fa48("13438"), "reject-no-key")))) || (stryMutAct_9fa48("13440") ? entry.kind !== "create" : stryMutAct_9fa48("13439") ? false : (stryCov_9fa48("13439", "13440"), entry.kind === (stryMutAct_9fa48("13441") ? "" : (stryCov_9fa48("13441"), "create")))))) || (stryMutAct_9fa48("13443") ? entry.kind !== "reuse" : stryMutAct_9fa48("13442") ? false : (stryCov_9fa48("13442", "13443"), entry.kind === (stryMutAct_9fa48("13444") ? "" : (stryCov_9fa48("13444"), "reuse")))))));
    return stryMutAct_9fa48("13445") ? action?.kind && null : (stryCov_9fa48("13445"), (stryMutAct_9fa48("13446") ? action.kind : (stryCov_9fa48("13446"), action?.kind)) ?? null);
  }
}

/**
 * Token access gates are event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkTokenAccessPlanWithActions}
 * (`reject-no-key`|`create`|`reuse`).
 */
export type LinkTokenAccessState = Record<string, never>;
export type LinkTokenAccessEvent = Event | {
  readonly kind: "token/access-gate";
  readonly derivedKeyPresent: boolean;
  readonly tokenPresent: boolean;
};
export type LinkTokenAccessAction = {
  readonly kind: "reject-no-key";
} | {
  readonly kind: "create";
} | {
  readonly kind: "reuse";
};
export interface LinkTokenAccessStepResult {
  readonly state: LinkTokenAccessState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkTokenAccessAction[];
}
export function initialLinkTokenAccessState(): LinkTokenAccessState {
  if (stryMutAct_9fa48("13447")) {
    {}
  } else {
    stryCov_9fa48("13447");
    return {};
  }
}
export const stepLinkTokenAccess: StepFn<LinkTokenAccessState> = (state, event) => {
  if (stryMutAct_9fa48("13448")) {
    {}
  } else {
    stryCov_9fa48("13448");
    const result = stepLinkTokenAccessInner(state, event as LinkTokenAccessEvent);
    return stryMutAct_9fa48("13449") ? {} : (stryCov_9fa48("13449"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepLinkTokenAccessWithActions(state: LinkTokenAccessState, event: LinkTokenAccessEvent): LinkTokenAccessStepResult {
  if (stryMutAct_9fa48("13450")) {
    {}
  } else {
    stryCov_9fa48("13450");
    return stepLinkTokenAccessInner(state, event);
  }
}
export function shouldRejectLinkTokenNoKey(actions: ReadonlyArray<LinkTokenAccessAction>): boolean {
  if (stryMutAct_9fa48("13451")) {
    {}
  } else {
    stryCov_9fa48("13451");
    return stryMutAct_9fa48("13452") ? actions.every(action => action.kind === "reject-no-key") : (stryCov_9fa48("13452"), actions.some(stryMutAct_9fa48("13453") ? () => undefined : (stryCov_9fa48("13453"), action => stryMutAct_9fa48("13456") ? action.kind !== "reject-no-key" : stryMutAct_9fa48("13455") ? false : stryMutAct_9fa48("13454") ? true : (stryCov_9fa48("13454", "13455", "13456"), action.kind === (stryMutAct_9fa48("13457") ? "" : (stryCov_9fa48("13457"), "reject-no-key"))))));
  }
}
export function shouldCreateLinkToken(actions: ReadonlyArray<LinkTokenAccessAction>): boolean {
  if (stryMutAct_9fa48("13458")) {
    {}
  } else {
    stryCov_9fa48("13458");
    return stryMutAct_9fa48("13459") ? actions.every(action => action.kind === "create") : (stryCov_9fa48("13459"), actions.some(stryMutAct_9fa48("13460") ? () => undefined : (stryCov_9fa48("13460"), action => stryMutAct_9fa48("13463") ? action.kind !== "create" : stryMutAct_9fa48("13462") ? false : stryMutAct_9fa48("13461") ? true : (stryCov_9fa48("13461", "13462", "13463"), action.kind === (stryMutAct_9fa48("13464") ? "" : (stryCov_9fa48("13464"), "create"))))));
  }
}
export function shouldReuseLinkToken(actions: ReadonlyArray<LinkTokenAccessAction>): boolean {
  if (stryMutAct_9fa48("13465")) {
    {}
  } else {
    stryCov_9fa48("13465");
    return stryMutAct_9fa48("13466") ? actions.every(action => action.kind === "reuse") : (stryCov_9fa48("13466"), actions.some(stryMutAct_9fa48("13467") ? () => undefined : (stryCov_9fa48("13467"), action => stryMutAct_9fa48("13470") ? action.kind !== "reuse" : stryMutAct_9fa48("13469") ? false : stryMutAct_9fa48("13468") ? true : (stryCov_9fa48("13468", "13469", "13470"), action.kind === (stryMutAct_9fa48("13471") ? "" : (stryCov_9fa48("13471"), "reuse"))))));
  }
}
function stepLinkTokenAccessInner(state: LinkTokenAccessState, event: LinkTokenAccessEvent): LinkTokenAccessStepResult {
  if (stryMutAct_9fa48("13472")) {
    {}
  } else {
    stryCov_9fa48("13472");
    if (stryMutAct_9fa48("13475") ? event.kind !== "token/access-gate" : stryMutAct_9fa48("13474") ? false : stryMutAct_9fa48("13473") ? true : (stryCov_9fa48("13473", "13474", "13475"), event.kind === (stryMutAct_9fa48("13476") ? "" : (stryCov_9fa48("13476"), "token/access-gate")))) {
      if (stryMutAct_9fa48("13477")) {
        {}
      } else {
        stryCov_9fa48("13477");
        const planActions = stepLinkTokenAccessPlanWithActions(initialLinkTokenAccessPlanState(), stryMutAct_9fa48("13478") ? {} : (stryCov_9fa48("13478"), {
          kind: stryMutAct_9fa48("13479") ? "" : (stryCov_9fa48("13479"), "token/access-plan-gate"),
          derivedKeyPresent: event.derivedKeyPresent,
          tokenPresent: event.tokenPresent
        })).actions;
        if (stryMutAct_9fa48("13481") ? false : stryMutAct_9fa48("13480") ? true : (stryCov_9fa48("13480", "13481"), shouldRejectNoKeyLinkTokenAccessPlan(planActions))) {
          if (stryMutAct_9fa48("13482")) {
            {}
          } else {
            stryCov_9fa48("13482");
            return stryMutAct_9fa48("13483") ? {} : (stryCov_9fa48("13483"), {
              state,
              intents: stryMutAct_9fa48("13484") ? ["Stryker was here"] : (stryCov_9fa48("13484"), []),
              actions: stryMutAct_9fa48("13485") ? [] : (stryCov_9fa48("13485"), [stryMutAct_9fa48("13486") ? {} : (stryCov_9fa48("13486"), {
                kind: stryMutAct_9fa48("13487") ? "" : (stryCov_9fa48("13487"), "reject-no-key")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("13489") ? false : stryMutAct_9fa48("13488") ? true : (stryCov_9fa48("13488", "13489"), shouldCreateLinkTokenAccessPlan(planActions))) {
          if (stryMutAct_9fa48("13490")) {
            {}
          } else {
            stryCov_9fa48("13490");
            return stryMutAct_9fa48("13491") ? {} : (stryCov_9fa48("13491"), {
              state,
              intents: stryMutAct_9fa48("13492") ? ["Stryker was here"] : (stryCov_9fa48("13492"), []),
              actions: stryMutAct_9fa48("13493") ? [] : (stryCov_9fa48("13493"), [stryMutAct_9fa48("13494") ? {} : (stryCov_9fa48("13494"), {
                kind: stryMutAct_9fa48("13495") ? "" : (stryCov_9fa48("13495"), "create")
              })])
            });
          }
        }
        if (stryMutAct_9fa48("13498") ? false : stryMutAct_9fa48("13497") ? true : stryMutAct_9fa48("13496") ? shouldReuseLinkTokenAccessPlan(planActions) : (stryCov_9fa48("13496", "13497", "13498"), !shouldReuseLinkTokenAccessPlan(planActions))) {
          if (stryMutAct_9fa48("13499")) {
            {}
          } else {
            stryCov_9fa48("13499");
            return stryMutAct_9fa48("13500") ? {} : (stryCov_9fa48("13500"), {
              state,
              intents: stryMutAct_9fa48("13501") ? ["Stryker was here"] : (stryCov_9fa48("13501"), []),
              actions: stryMutAct_9fa48("13502") ? ["Stryker was here"] : (stryCov_9fa48("13502"), [])
            });
          }
        }
        return stryMutAct_9fa48("13503") ? {} : (stryCov_9fa48("13503"), {
          state,
          intents: stryMutAct_9fa48("13504") ? ["Stryker was here"] : (stryCov_9fa48("13504"), []),
          actions: stryMutAct_9fa48("13505") ? [] : (stryCov_9fa48("13505"), [stryMutAct_9fa48("13506") ? {} : (stryCov_9fa48("13506"), {
            kind: stryMutAct_9fa48("13507") ? "" : (stryCov_9fa48("13507"), "reuse")
          })])
        });
      }
    }
    return stryMutAct_9fa48("13508") ? {} : (stryCov_9fa48("13508"), {
      state,
      intents: stryMutAct_9fa48("13509") ? ["Stryker was here"] : (stryCov_9fa48("13509"), []),
      actions: stryMutAct_9fa48("13510") ? ["Stryker was here"] : (stryCov_9fa48("13510"), [])
    });
  }
}

/**
 * Whether a packed application request may be sent (request gate + MDU fit).
 * Path hashing / encrypt / packet IO stay at the adapter edge.
 */
export type LinkAppRequestPlan = "send" | "reject";
export function planLinkAppRequest(input: {
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
  readonly packedLength: number;
  readonly mdu: number;
}): LinkAppRequestPlan {
  if (stryMutAct_9fa48("13511")) {
    {}
  } else {
    stryCov_9fa48("13511");
    if (stryMutAct_9fa48("13514") ? false : stryMutAct_9fa48("13513") ? true : stryMutAct_9fa48("13512") ? canLinkRequest({
      status: input.status,
      rtt: input.rtt
    }) : (stryCov_9fa48("13512", "13513", "13514"), !canLinkRequest(stryMutAct_9fa48("13515") ? {} : (stryCov_9fa48("13515"), {
      status: input.status,
      rtt: input.rtt
    })))) {
      if (stryMutAct_9fa48("13516")) {
        {}
      } else {
        stryCov_9fa48("13516");
        return stryMutAct_9fa48("13517") ? "" : (stryCov_9fa48("13517"), "reject");
      }
    }
    if (stryMutAct_9fa48("13520") ? false : stryMutAct_9fa48("13519") ? true : stryMutAct_9fa48("13518") ? linkPayloadFitsMdu(input.packedLength, input.mdu) : (stryCov_9fa48("13518", "13519", "13520"), !linkPayloadFitsMdu(input.packedLength, input.mdu))) {
      if (stryMutAct_9fa48("13521")) {
        {}
      } else {
        stryCov_9fa48("13521");
        return stryMutAct_9fa48("13522") ? "" : (stryCov_9fa48("13522"), "reject");
      }
    }
    return stryMutAct_9fa48("13523") ? "" : (stryCov_9fa48("13523"), "send");
  }
}

/**
 * App-request send plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planLinkAppRequest` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepLinkAppRequestWithActions}.
 */
export type LinkAppRequestPlanState = Record<string, never>;
export type LinkAppRequestPlanEvent = Event | {
  readonly kind: "link/app-request-plan-gate";
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
  readonly packedLength: number;
  readonly mdu: number;
};
export type LinkAppRequestPlanAction = {
  readonly kind: LinkAppRequestPlan;
};
export interface LinkAppRequestPlanStepResult {
  readonly state: LinkAppRequestPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestPlanAction[];
}
export function initialLinkAppRequestPlanState(): LinkAppRequestPlanState {
  if (stryMutAct_9fa48("13524")) {
    {}
  } else {
    stryCov_9fa48("13524");
    return {};
  }
}
export function stepLinkAppRequestPlanWithActions(state: LinkAppRequestPlanState, event: LinkAppRequestPlanEvent): LinkAppRequestPlanStepResult {
  if (stryMutAct_9fa48("13525")) {
    {}
  } else {
    stryCov_9fa48("13525");
    if (stryMutAct_9fa48("13528") ? event.kind !== "link/app-request-plan-gate" : stryMutAct_9fa48("13527") ? false : stryMutAct_9fa48("13526") ? true : (stryCov_9fa48("13526", "13527", "13528"), event.kind === (stryMutAct_9fa48("13529") ? "" : (stryCov_9fa48("13529"), "link/app-request-plan-gate")))) {
      if (stryMutAct_9fa48("13530")) {
        {}
      } else {
        stryCov_9fa48("13530");
        return stryMutAct_9fa48("13531") ? {} : (stryCov_9fa48("13531"), {
          state,
          intents: stryMutAct_9fa48("13532") ? ["Stryker was here"] : (stryCov_9fa48("13532"), []),
          actions: stryMutAct_9fa48("13533") ? [] : (stryCov_9fa48("13533"), [stryMutAct_9fa48("13534") ? {} : (stryCov_9fa48("13534"), {
            kind: planLinkAppRequest(stryMutAct_9fa48("13535") ? {} : (stryCov_9fa48("13535"), {
              status: event.status,
              rtt: event.rtt,
              packedLength: event.packedLength,
              mdu: event.mdu
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("13536") ? {} : (stryCov_9fa48("13536"), {
      state,
      intents: stryMutAct_9fa48("13537") ? ["Stryker was here"] : (stryCov_9fa48("13537"), []),
      actions: stryMutAct_9fa48("13538") ? ["Stryker was here"] : (stryCov_9fa48("13538"), [])
    });
  }
}

/** Extract the app-request plan from actions; null when empty. */
export function linkAppRequestPlanFromActions(actions: ReadonlyArray<LinkAppRequestPlanAction>): LinkAppRequestPlan | null {
  if (stryMutAct_9fa48("13539")) {
    {}
  } else {
    stryCov_9fa48("13539");
    const action = actions.find(stryMutAct_9fa48("13540") ? () => undefined : (stryCov_9fa48("13540"), entry => stryMutAct_9fa48("13543") ? entry.kind === "send" && entry.kind === "reject" : stryMutAct_9fa48("13542") ? false : stryMutAct_9fa48("13541") ? true : (stryCov_9fa48("13541", "13542", "13543"), (stryMutAct_9fa48("13545") ? entry.kind !== "send" : stryMutAct_9fa48("13544") ? false : (stryCov_9fa48("13544", "13545"), entry.kind === (stryMutAct_9fa48("13546") ? "" : (stryCov_9fa48("13546"), "send")))) || (stryMutAct_9fa48("13548") ? entry.kind !== "reject" : stryMutAct_9fa48("13547") ? false : (stryCov_9fa48("13547", "13548"), entry.kind === (stryMutAct_9fa48("13549") ? "" : (stryCov_9fa48("13549"), "reject")))))));
    return stryMutAct_9fa48("13550") ? action?.kind && null : (stryCov_9fa48("13550"), (stryMutAct_9fa48("13551") ? action.kind : (stryCov_9fa48("13551"), action?.kind)) ?? null);
  }
}
export function shouldSendLinkAppRequestPlan(actions: ReadonlyArray<LinkAppRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("13552")) {
    {}
  } else {
    stryCov_9fa48("13552");
    return stryMutAct_9fa48("13553") ? actions.every(action => action.kind === "send") : (stryCov_9fa48("13553"), actions.some(stryMutAct_9fa48("13554") ? () => undefined : (stryCov_9fa48("13554"), action => stryMutAct_9fa48("13557") ? action.kind !== "send" : stryMutAct_9fa48("13556") ? false : stryMutAct_9fa48("13555") ? true : (stryCov_9fa48("13555", "13556", "13557"), action.kind === (stryMutAct_9fa48("13558") ? "" : (stryCov_9fa48("13558"), "send"))))));
  }
}
export function shouldRejectLinkAppRequestPlan(actions: ReadonlyArray<LinkAppRequestPlanAction>): boolean {
  if (stryMutAct_9fa48("13559")) {
    {}
  } else {
    stryCov_9fa48("13559");
    return stryMutAct_9fa48("13560") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("13560"), actions.some(stryMutAct_9fa48("13561") ? () => undefined : (stryCov_9fa48("13561"), action => stryMutAct_9fa48("13564") ? action.kind !== "reject" : stryMutAct_9fa48("13563") ? false : stryMutAct_9fa48("13562") ? true : (stryCov_9fa48("13562", "13563", "13564"), action.kind === (stryMutAct_9fa48("13565") ? "" : (stryCov_9fa48("13565"), "reject"))))));
  }
}

/**
 * Link app-request send gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepLinkAppRequestPlanWithActions} (`send`|`reject`).
 */
export type LinkAppRequestState = Record<string, never>;
export type LinkAppRequestEvent = Event | {
  readonly kind: "link/app-request-gate";
  readonly status: LinkStatusValue;
  readonly rtt: number | null;
  readonly packedLength: number;
  readonly mdu: number;
};
export type LinkAppRequestAction = {
  readonly kind: LinkAppRequestPlan;
};
export interface LinkAppRequestStepResult {
  readonly state: LinkAppRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly LinkAppRequestAction[];
}
export function stepLinkAppRequestWithActions(state: LinkAppRequestState, event: LinkAppRequestEvent): LinkAppRequestStepResult {
  if (stryMutAct_9fa48("13566")) {
    {}
  } else {
    stryCov_9fa48("13566");
    return stepLinkAppRequestInner(state, event);
  }
}
export function stepLinkAppRequestInner(state: LinkAppRequestState, event: LinkAppRequestEvent): LinkAppRequestStepResult {
  if (stryMutAct_9fa48("13567")) {
    {}
  } else {
    stryCov_9fa48("13567");
    if (stryMutAct_9fa48("13570") ? event.kind !== "link/app-request-gate" : stryMutAct_9fa48("13569") ? false : stryMutAct_9fa48("13568") ? true : (stryCov_9fa48("13568", "13569", "13570"), event.kind === (stryMutAct_9fa48("13571") ? "" : (stryCov_9fa48("13571"), "link/app-request-gate")))) {
      if (stryMutAct_9fa48("13572")) {
        {}
      } else {
        stryCov_9fa48("13572");
        const planActions = stepLinkAppRequestPlanWithActions(initialLinkAppRequestPlanState(), stryMutAct_9fa48("13573") ? {} : (stryCov_9fa48("13573"), {
          kind: stryMutAct_9fa48("13574") ? "" : (stryCov_9fa48("13574"), "link/app-request-plan-gate"),
          status: event.status,
          rtt: event.rtt,
          packedLength: event.packedLength,
          mdu: event.mdu
        })).actions;
        const plan = linkAppRequestPlanFromActions(planActions);
        if (stryMutAct_9fa48("13577") ? plan !== null : stryMutAct_9fa48("13576") ? false : stryMutAct_9fa48("13575") ? true : (stryCov_9fa48("13575", "13576", "13577"), plan === null)) {
          if (stryMutAct_9fa48("13578")) {
            {}
          } else {
            stryCov_9fa48("13578");
            return stryMutAct_9fa48("13579") ? {} : (stryCov_9fa48("13579"), {
              state,
              intents: stryMutAct_9fa48("13580") ? ["Stryker was here"] : (stryCov_9fa48("13580"), []),
              actions: stryMutAct_9fa48("13581") ? ["Stryker was here"] : (stryCov_9fa48("13581"), [])
            });
          }
        }
        return stryMutAct_9fa48("13582") ? {} : (stryCov_9fa48("13582"), {
          state,
          intents: stryMutAct_9fa48("13583") ? ["Stryker was here"] : (stryCov_9fa48("13583"), []),
          actions: stryMutAct_9fa48("13584") ? [] : (stryCov_9fa48("13584"), [stryMutAct_9fa48("13585") ? {} : (stryCov_9fa48("13585"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("13586") ? {} : (stryCov_9fa48("13586"), {
      state,
      intents: stryMutAct_9fa48("13587") ? ["Stryker was here"] : (stryCov_9fa48("13587"), []),
      actions: stryMutAct_9fa48("13588") ? ["Stryker was here"] : (stryCov_9fa48("13588"), [])
    });
  }
}