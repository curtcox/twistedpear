/** Extracted from path-table.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure path-table / pathfinder decisions for announce ingress and path requests.
 * No IO — time and bytes arrive only as event/parameters.
 * Path-request ingress / discovery fulfill / outbound / entry-lookup conclusions
 * leave via machine actions (no ad-hoc plan reads beside the step). Plans nested via
 * {@link stepPathRequestIngressPlanWithActions} /
 * {@link stepPathOutboundPlanWithActions} /
 * {@link stepDiscoveryPathRequestFulfillPlanWithActions} /
 * {@link stepPathEntryLookupPlanWithActions}.
 * Path random-blob append / expiry conclusions leave via machine actions (no
 * ad-hoc `appendPathRandomBlob` / `computePathExpiry` reads beside the step).
 * Path-request emit / discovery-expired / begin-discovery / path-entry expired /
 * add-entry conclusions leave via machine actions (no ad-hoc
 * `shouldEmitPathRequest` / `isDiscoveryPathRequestExpired` /
 * `shouldBeginPathDiscovery` / `isPathEntryExpired` / `shouldAddPathEntry`
 * reads beside the step). Answer-local / remember-tag / clear-expired-discovery /
 * use-path-for-outbound / answer-path-with-entry / touch-path-entry conclusions
 * leave via machine actions (no ad-hoc `canAnswerLocalPathRequest` /
 * `shouldRememberPathRequestTag` / `shouldClearExpiredDiscoveryPathRequest` /
 * `shouldUsePathForOutbound` / `shouldAnswerPathWithEntry` /
 * `shouldTouchPathEntry` / `shouldAnswerPathRequest` /
 * `shouldFulfillDiscoveryPending` reads beside the step).
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
import { TRUNCATED_HASH_BYTES } from "../hash-truncate.js";
import { PACKET_DEST_TYPE_GROUP, PACKET_DEST_TYPE_PLAIN, PACKET_HEADER_1, PACKET_TYPE_ANNOUNCE } from "../packet-header.js";
import { canAnswerLocalPathRequest } from "./part-1.js";
import type { AnswerLocalPathRequestEvent, AnswerLocalPathRequestState } from "./part-1.js";
export type AnswerLocalPathRequestAction = {
  readonly kind: "answer";
} | {
  readonly kind: "skip";
};
export interface AnswerLocalPathRequestStepResult {
  readonly state: AnswerLocalPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnswerLocalPathRequestAction[];
}
export function initialAnswerLocalPathRequestState(): AnswerLocalPathRequestState {
  if (stryMutAct_9fa48("25025")) {
    {}
  } else {
    stryCov_9fa48("25025");
    return {};
  }
}
export function stepAnswerLocalPathRequestWithActions(state: AnswerLocalPathRequestState, event: AnswerLocalPathRequestEvent): AnswerLocalPathRequestStepResult {
  if (stryMutAct_9fa48("25026")) {
    {}
  } else {
    stryCov_9fa48("25026");
    if (stryMutAct_9fa48("25029") ? event.kind !== "path-request/answer-local-handler-gate" : stryMutAct_9fa48("25028") ? false : stryMutAct_9fa48("25027") ? true : (stryCov_9fa48("25027", "25028", "25029"), event.kind === (stryMutAct_9fa48("25030") ? "" : (stryCov_9fa48("25030"), "path-request/answer-local-handler-gate")))) {
      if (stryMutAct_9fa48("25031")) {
        {}
      } else {
        stryCov_9fa48("25031");
        return stryMutAct_9fa48("25032") ? {} : (stryCov_9fa48("25032"), {
          state,
          intents: stryMutAct_9fa48("25033") ? ["Stryker was here"] : (stryCov_9fa48("25033"), []),
          actions: stryMutAct_9fa48("25034") ? [] : (stryCov_9fa48("25034"), [stryMutAct_9fa48("25035") ? {} : (stryCov_9fa48("25035"), {
            kind: canAnswerLocalPathRequest(event.handlerPresent) ? stryMutAct_9fa48("25036") ? "" : (stryCov_9fa48("25036"), "answer") : stryMutAct_9fa48("25037") ? "" : (stryCov_9fa48("25037"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25038") ? {} : (stryCov_9fa48("25038"), {
      state,
      intents: stryMutAct_9fa48("25039") ? ["Stryker was here"] : (stryCov_9fa48("25039"), []),
      actions: stryMutAct_9fa48("25040") ? ["Stryker was here"] : (stryCov_9fa48("25040"), [])
    });
  }
}
export function shouldAnswerLocalPathRequestNow(actions: ReadonlyArray<AnswerLocalPathRequestAction>): boolean {
  if (stryMutAct_9fa48("25041")) {
    {}
  } else {
    stryCov_9fa48("25041");
    return stryMutAct_9fa48("25042") ? actions.every(action => action.kind === "answer") : (stryCov_9fa48("25042"), actions.some(stryMutAct_9fa48("25043") ? () => undefined : (stryCov_9fa48("25043"), action => stryMutAct_9fa48("25046") ? action.kind !== "answer" : stryMutAct_9fa48("25045") ? false : stryMutAct_9fa48("25044") ? true : (stryCov_9fa48("25044", "25045", "25046"), action.kind === (stryMutAct_9fa48("25047") ? "" : (stryCov_9fa48("25047"), "answer"))))));
  }
}
export function shouldSkipAnswerLocalPathRequest(actions: ReadonlyArray<AnswerLocalPathRequestAction>): boolean {
  if (stryMutAct_9fa48("25048")) {
    {}
  } else {
    stryCov_9fa48("25048");
    return stryMutAct_9fa48("25049") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25049"), actions.some(stryMutAct_9fa48("25050") ? () => undefined : (stryCov_9fa48("25050"), action => stryMutAct_9fa48("25053") ? action.kind !== "skip" : stryMutAct_9fa48("25052") ? false : stryMutAct_9fa48("25051") ? true : (stryCov_9fa48("25051", "25052", "25053"), action.kind === (stryMutAct_9fa48("25054") ? "" : (stryCov_9fa48("25054"), "skip"))))));
  }
}

/**
 * Whether start-discovery may record a pending request and flood peers.
 * Tag / destination-key extraction stays at the adapter edge as booleans.
 */
export function shouldBeginPathDiscovery(input: {
  readonly parsedOk: boolean;
  readonly tagPresent: boolean;
  readonly destinationKeyPresent: boolean;
}): boolean {
  if (stryMutAct_9fa48("25055")) {
    {}
  } else {
    stryCov_9fa48("25055");
    return stryMutAct_9fa48("25058") ? input.parsedOk && input.tagPresent || input.destinationKeyPresent : stryMutAct_9fa48("25057") ? false : stryMutAct_9fa48("25056") ? true : (stryCov_9fa48("25056", "25057", "25058"), (stryMutAct_9fa48("25060") ? input.parsedOk || input.tagPresent : stryMutAct_9fa48("25059") ? true : (stryCov_9fa48("25059", "25060"), input.parsedOk && input.tagPresent)) && input.destinationKeyPresent);
  }
}

/**
 * shouldBeginPathDiscovery gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldBeginPathDiscovery`
 * reads beside the step).
 */
export type BeginPathDiscoveryState = Record<string, never>;
export type BeginPathDiscoveryEvent = Event | {
  readonly kind: "path-request/begin-discovery-gate";
  readonly parsedOk: boolean;
  readonly tagPresent: boolean;
  readonly destinationKeyPresent: boolean;
};
export type BeginPathDiscoveryAction = {
  readonly kind: "begin";
} | {
  readonly kind: "skip";
};
export interface BeginPathDiscoveryStepResult {
  readonly state: BeginPathDiscoveryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly BeginPathDiscoveryAction[];
}
export function initialBeginPathDiscoveryState(): BeginPathDiscoveryState {
  if (stryMutAct_9fa48("25061")) {
    {}
  } else {
    stryCov_9fa48("25061");
    return {};
  }
}
export function stepBeginPathDiscoveryWithActions(state: BeginPathDiscoveryState, event: BeginPathDiscoveryEvent): BeginPathDiscoveryStepResult {
  if (stryMutAct_9fa48("25062")) {
    {}
  } else {
    stryCov_9fa48("25062");
    if (stryMutAct_9fa48("25065") ? event.kind !== "path-request/begin-discovery-gate" : stryMutAct_9fa48("25064") ? false : stryMutAct_9fa48("25063") ? true : (stryCov_9fa48("25063", "25064", "25065"), event.kind === (stryMutAct_9fa48("25066") ? "" : (stryCov_9fa48("25066"), "path-request/begin-discovery-gate")))) {
      if (stryMutAct_9fa48("25067")) {
        {}
      } else {
        stryCov_9fa48("25067");
        return stryMutAct_9fa48("25068") ? {} : (stryCov_9fa48("25068"), {
          state,
          intents: stryMutAct_9fa48("25069") ? ["Stryker was here"] : (stryCov_9fa48("25069"), []),
          actions: stryMutAct_9fa48("25070") ? [] : (stryCov_9fa48("25070"), [stryMutAct_9fa48("25071") ? {} : (stryCov_9fa48("25071"), {
            kind: shouldBeginPathDiscovery(stryMutAct_9fa48("25072") ? {} : (stryCov_9fa48("25072"), {
              parsedOk: event.parsedOk,
              tagPresent: event.tagPresent,
              destinationKeyPresent: event.destinationKeyPresent
            })) ? stryMutAct_9fa48("25073") ? "" : (stryCov_9fa48("25073"), "begin") : stryMutAct_9fa48("25074") ? "" : (stryCov_9fa48("25074"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25075") ? {} : (stryCov_9fa48("25075"), {
      state,
      intents: stryMutAct_9fa48("25076") ? ["Stryker was here"] : (stryCov_9fa48("25076"), []),
      actions: stryMutAct_9fa48("25077") ? ["Stryker was here"] : (stryCov_9fa48("25077"), [])
    });
  }
}
export function shouldBeginPathDiscoveryNow(actions: ReadonlyArray<BeginPathDiscoveryAction>): boolean {
  if (stryMutAct_9fa48("25078")) {
    {}
  } else {
    stryCov_9fa48("25078");
    return stryMutAct_9fa48("25079") ? actions.every(action => action.kind === "begin") : (stryCov_9fa48("25079"), actions.some(stryMutAct_9fa48("25080") ? () => undefined : (stryCov_9fa48("25080"), action => stryMutAct_9fa48("25083") ? action.kind !== "begin" : stryMutAct_9fa48("25082") ? false : stryMutAct_9fa48("25081") ? true : (stryCov_9fa48("25081", "25082", "25083"), action.kind === (stryMutAct_9fa48("25084") ? "" : (stryCov_9fa48("25084"), "begin"))))));
  }
}
export function shouldSkipBeginPathDiscovery(actions: ReadonlyArray<BeginPathDiscoveryAction>): boolean {
  if (stryMutAct_9fa48("25085")) {
    {}
  } else {
    stryCov_9fa48("25085");
    return stryMutAct_9fa48("25086") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25086"), actions.some(stryMutAct_9fa48("25087") ? () => undefined : (stryCov_9fa48("25087"), action => stryMutAct_9fa48("25090") ? action.kind !== "skip" : stryMutAct_9fa48("25089") ? false : stryMutAct_9fa48("25088") ? true : (stryCov_9fa48("25088", "25089", "25090"), action.kind === (stryMutAct_9fa48("25091") ? "" : (stryCov_9fa48("25091"), "skip"))))));
  }
}

/** Whether an expired discovery path-request entry should be cleared before reinsert. */
export function shouldClearExpiredDiscoveryPathRequest(discoveryExpired: boolean): boolean {
  if (stryMutAct_9fa48("25092")) {
    {}
  } else {
    stryCov_9fa48("25092");
    return discoveryExpired;
  }
}

/**
 * shouldClearExpiredDiscoveryPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `shouldClearExpiredDiscoveryPathRequest` reads beside the step).
 */
export type ClearExpiredDiscoveryPathRequestState = Record<string, never>;
export type ClearExpiredDiscoveryPathRequestEvent = Event | {
  readonly kind: "path-request/clear-expired-discovery-gate";
  readonly discoveryExpired: boolean;
};
export type ClearExpiredDiscoveryPathRequestAction = {
  readonly kind: "clear";
} | {
  readonly kind: "skip";
};
export interface ClearExpiredDiscoveryPathRequestStepResult {
  readonly state: ClearExpiredDiscoveryPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ClearExpiredDiscoveryPathRequestAction[];
}
export function initialClearExpiredDiscoveryPathRequestState(): ClearExpiredDiscoveryPathRequestState {
  if (stryMutAct_9fa48("25093")) {
    {}
  } else {
    stryCov_9fa48("25093");
    return {};
  }
}
export function stepClearExpiredDiscoveryPathRequestWithActions(state: ClearExpiredDiscoveryPathRequestState, event: ClearExpiredDiscoveryPathRequestEvent): ClearExpiredDiscoveryPathRequestStepResult {
  if (stryMutAct_9fa48("25094")) {
    {}
  } else {
    stryCov_9fa48("25094");
    if (stryMutAct_9fa48("25097") ? event.kind !== "path-request/clear-expired-discovery-gate" : stryMutAct_9fa48("25096") ? false : stryMutAct_9fa48("25095") ? true : (stryCov_9fa48("25095", "25096", "25097"), event.kind === (stryMutAct_9fa48("25098") ? "" : (stryCov_9fa48("25098"), "path-request/clear-expired-discovery-gate")))) {
      if (stryMutAct_9fa48("25099")) {
        {}
      } else {
        stryCov_9fa48("25099");
        return stryMutAct_9fa48("25100") ? {} : (stryCov_9fa48("25100"), {
          state,
          intents: stryMutAct_9fa48("25101") ? ["Stryker was here"] : (stryCov_9fa48("25101"), []),
          actions: stryMutAct_9fa48("25102") ? [] : (stryCov_9fa48("25102"), [stryMutAct_9fa48("25103") ? {} : (stryCov_9fa48("25103"), {
            kind: shouldClearExpiredDiscoveryPathRequest(event.discoveryExpired) ? stryMutAct_9fa48("25104") ? "" : (stryCov_9fa48("25104"), "clear") : stryMutAct_9fa48("25105") ? "" : (stryCov_9fa48("25105"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25106") ? {} : (stryCov_9fa48("25106"), {
      state,
      intents: stryMutAct_9fa48("25107") ? ["Stryker was here"] : (stryCov_9fa48("25107"), []),
      actions: stryMutAct_9fa48("25108") ? ["Stryker was here"] : (stryCov_9fa48("25108"), [])
    });
  }
}
export function shouldClearExpiredDiscoveryPathRequestNow(actions: ReadonlyArray<ClearExpiredDiscoveryPathRequestAction>): boolean {
  if (stryMutAct_9fa48("25109")) {
    {}
  } else {
    stryCov_9fa48("25109");
    return stryMutAct_9fa48("25110") ? actions.every(action => action.kind === "clear") : (stryCov_9fa48("25110"), actions.some(stryMutAct_9fa48("25111") ? () => undefined : (stryCov_9fa48("25111"), action => stryMutAct_9fa48("25114") ? action.kind !== "clear" : stryMutAct_9fa48("25113") ? false : stryMutAct_9fa48("25112") ? true : (stryCov_9fa48("25112", "25113", "25114"), action.kind === (stryMutAct_9fa48("25115") ? "" : (stryCov_9fa48("25115"), "clear"))))));
  }
}
export function shouldSkipClearExpiredDiscoveryPathRequest(actions: ReadonlyArray<ClearExpiredDiscoveryPathRequestAction>): boolean {
  if (stryMutAct_9fa48("25116")) {
    {}
  } else {
    stryCov_9fa48("25116");
    return stryMutAct_9fa48("25117") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25117"), actions.some(stryMutAct_9fa48("25118") ? () => undefined : (stryCov_9fa48("25118"), action => stryMutAct_9fa48("25121") ? action.kind !== "skip" : stryMutAct_9fa48("25120") ? false : stryMutAct_9fa48("25119") ? true : (stryCov_9fa48("25119", "25120", "25121"), action.kind === (stryMutAct_9fa48("25122") ? "" : (stryCov_9fa48("25122"), "skip"))))));
  }
}

/** Whether a path-request tag key should be remembered in the seen-tag set. */
export function shouldRememberPathRequestTag(tagKeyPresent: boolean): boolean {
  if (stryMutAct_9fa48("25123")) {
    {}
  } else {
    stryCov_9fa48("25123");
    return tagKeyPresent;
  }
}

/**
 * shouldRememberPathRequestTag gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldRememberPathRequestTag`
 * reads beside the step).
 */
export type RememberPathRequestTagState = Record<string, never>;
export type RememberPathRequestTagEvent = Event | {
  readonly kind: "path-request/remember-tag-gate";
  readonly tagKeyPresent: boolean;
};
export type RememberPathRequestTagAction = {
  readonly kind: "remember";
} | {
  readonly kind: "skip";
};
export interface RememberPathRequestTagStepResult {
  readonly state: RememberPathRequestTagState;
  readonly intents: readonly Intent[];
  readonly actions: readonly RememberPathRequestTagAction[];
}
export function initialRememberPathRequestTagState(): RememberPathRequestTagState {
  if (stryMutAct_9fa48("25124")) {
    {}
  } else {
    stryCov_9fa48("25124");
    return {};
  }
}
export function stepRememberPathRequestTagWithActions(state: RememberPathRequestTagState, event: RememberPathRequestTagEvent): RememberPathRequestTagStepResult {
  if (stryMutAct_9fa48("25125")) {
    {}
  } else {
    stryCov_9fa48("25125");
    if (stryMutAct_9fa48("25128") ? event.kind !== "path-request/remember-tag-gate" : stryMutAct_9fa48("25127") ? false : stryMutAct_9fa48("25126") ? true : (stryCov_9fa48("25126", "25127", "25128"), event.kind === (stryMutAct_9fa48("25129") ? "" : (stryCov_9fa48("25129"), "path-request/remember-tag-gate")))) {
      if (stryMutAct_9fa48("25130")) {
        {}
      } else {
        stryCov_9fa48("25130");
        return stryMutAct_9fa48("25131") ? {} : (stryCov_9fa48("25131"), {
          state,
          intents: stryMutAct_9fa48("25132") ? ["Stryker was here"] : (stryCov_9fa48("25132"), []),
          actions: stryMutAct_9fa48("25133") ? [] : (stryCov_9fa48("25133"), [stryMutAct_9fa48("25134") ? {} : (stryCov_9fa48("25134"), {
            kind: shouldRememberPathRequestTag(event.tagKeyPresent) ? stryMutAct_9fa48("25135") ? "" : (stryCov_9fa48("25135"), "remember") : stryMutAct_9fa48("25136") ? "" : (stryCov_9fa48("25136"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25137") ? {} : (stryCov_9fa48("25137"), {
      state,
      intents: stryMutAct_9fa48("25138") ? ["Stryker was here"] : (stryCov_9fa48("25138"), []),
      actions: stryMutAct_9fa48("25139") ? ["Stryker was here"] : (stryCov_9fa48("25139"), [])
    });
  }
}
export function shouldRememberPathRequestTagNow(actions: ReadonlyArray<RememberPathRequestTagAction>): boolean {
  if (stryMutAct_9fa48("25140")) {
    {}
  } else {
    stryCov_9fa48("25140");
    return stryMutAct_9fa48("25141") ? actions.every(action => action.kind === "remember") : (stryCov_9fa48("25141"), actions.some(stryMutAct_9fa48("25142") ? () => undefined : (stryCov_9fa48("25142"), action => stryMutAct_9fa48("25145") ? action.kind !== "remember" : stryMutAct_9fa48("25144") ? false : stryMutAct_9fa48("25143") ? true : (stryCov_9fa48("25143", "25144", "25145"), action.kind === (stryMutAct_9fa48("25146") ? "" : (stryCov_9fa48("25146"), "remember"))))));
  }
}
export function shouldSkipRememberPathRequestTag(actions: ReadonlyArray<RememberPathRequestTagAction>): boolean {
  if (stryMutAct_9fa48("25147")) {
    {}
  } else {
    stryCov_9fa48("25147");
    return stryMutAct_9fa48("25148") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25148"), actions.some(stryMutAct_9fa48("25149") ? () => undefined : (stryCov_9fa48("25149"), action => stryMutAct_9fa48("25152") ? action.kind !== "skip" : stryMutAct_9fa48("25151") ? false : stryMutAct_9fa48("25150") ? true : (stryCov_9fa48("25150", "25151", "25152"), action.kind === (stryMutAct_9fa48("25153") ? "" : (stryCov_9fa48("25153"), "skip"))))));
  }
}

/** Whether wrap/direct outbound may use a resolved path-table entry. */
export function shouldUsePathForOutbound(pathPresent: boolean): boolean {
  if (stryMutAct_9fa48("25154")) {
    {}
  } else {
    stryCov_9fa48("25154");
    return pathPresent;
  }
}

/**
 * shouldUsePathForOutbound gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldUsePathForOutbound`
 * reads beside the step).
 */
export type UsePathForOutboundState = Record<string, never>;
export type UsePathForOutboundEvent = Event | {
  readonly kind: "path/use-for-outbound-gate";
  readonly pathPresent: boolean;
};
export type UsePathForOutboundAction = {
  readonly kind: "use";
} | {
  readonly kind: "skip";
};
export interface UsePathForOutboundStepResult {
  readonly state: UsePathForOutboundState;
  readonly intents: readonly Intent[];
  readonly actions: readonly UsePathForOutboundAction[];
}
export function initialUsePathForOutboundState(): UsePathForOutboundState {
  if (stryMutAct_9fa48("25155")) {
    {}
  } else {
    stryCov_9fa48("25155");
    return {};
  }
}
export function stepUsePathForOutboundWithActions(state: UsePathForOutboundState, event: UsePathForOutboundEvent): UsePathForOutboundStepResult {
  if (stryMutAct_9fa48("25156")) {
    {}
  } else {
    stryCov_9fa48("25156");
    if (stryMutAct_9fa48("25159") ? event.kind !== "path/use-for-outbound-gate" : stryMutAct_9fa48("25158") ? false : stryMutAct_9fa48("25157") ? true : (stryCov_9fa48("25157", "25158", "25159"), event.kind === (stryMutAct_9fa48("25160") ? "" : (stryCov_9fa48("25160"), "path/use-for-outbound-gate")))) {
      if (stryMutAct_9fa48("25161")) {
        {}
      } else {
        stryCov_9fa48("25161");
        return stryMutAct_9fa48("25162") ? {} : (stryCov_9fa48("25162"), {
          state,
          intents: stryMutAct_9fa48("25163") ? ["Stryker was here"] : (stryCov_9fa48("25163"), []),
          actions: stryMutAct_9fa48("25164") ? [] : (stryCov_9fa48("25164"), [stryMutAct_9fa48("25165") ? {} : (stryCov_9fa48("25165"), {
            kind: shouldUsePathForOutbound(event.pathPresent) ? stryMutAct_9fa48("25166") ? "" : (stryCov_9fa48("25166"), "use") : stryMutAct_9fa48("25167") ? "" : (stryCov_9fa48("25167"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25168") ? {} : (stryCov_9fa48("25168"), {
      state,
      intents: stryMutAct_9fa48("25169") ? ["Stryker was here"] : (stryCov_9fa48("25169"), []),
      actions: stryMutAct_9fa48("25170") ? ["Stryker was here"] : (stryCov_9fa48("25170"), [])
    });
  }
}
export function shouldUsePathForOutboundNow(actions: ReadonlyArray<UsePathForOutboundAction>): boolean {
  if (stryMutAct_9fa48("25171")) {
    {}
  } else {
    stryCov_9fa48("25171");
    return stryMutAct_9fa48("25172") ? actions.every(action => action.kind === "use") : (stryCov_9fa48("25172"), actions.some(stryMutAct_9fa48("25173") ? () => undefined : (stryCov_9fa48("25173"), action => stryMutAct_9fa48("25176") ? action.kind !== "use" : stryMutAct_9fa48("25175") ? false : stryMutAct_9fa48("25174") ? true : (stryCov_9fa48("25174", "25175", "25176"), action.kind === (stryMutAct_9fa48("25177") ? "" : (stryCov_9fa48("25177"), "use"))))));
  }
}
export function shouldSkipUsePathForOutbound(actions: ReadonlyArray<UsePathForOutboundAction>): boolean {
  if (stryMutAct_9fa48("25178")) {
    {}
  } else {
    stryCov_9fa48("25178");
    return stryMutAct_9fa48("25179") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25179"), actions.some(stryMutAct_9fa48("25180") ? () => undefined : (stryCov_9fa48("25180"), action => stryMutAct_9fa48("25183") ? action.kind !== "skip" : stryMutAct_9fa48("25182") ? false : stryMutAct_9fa48("25181") ? true : (stryCov_9fa48("25181", "25182", "25183"), action.kind === (stryMutAct_9fa48("25184") ? "" : (stryCov_9fa48("25184"), "skip"))))));
  }
}

/** Whether answer-path may send a response for a resolved path-table entry. */
export function shouldAnswerPathWithEntry(pathPresent: boolean): boolean {
  if (stryMutAct_9fa48("25185")) {
    {}
  } else {
    stryCov_9fa48("25185");
    return pathPresent;
  }
}

/**
 * shouldAnswerPathWithEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAnswerPathWithEntry`
 * reads beside the step).
 */
export type AnswerPathWithEntryState = Record<string, never>;
export type AnswerPathWithEntryEvent = Event | {
  readonly kind: "path-request/answer-path-entry-gate";
  readonly pathPresent: boolean;
};
export type AnswerPathWithEntryAction = {
  readonly kind: "answer";
} | {
  readonly kind: "skip";
};
export interface AnswerPathWithEntryStepResult {
  readonly state: AnswerPathWithEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnswerPathWithEntryAction[];
}
export function initialAnswerPathWithEntryState(): AnswerPathWithEntryState {
  if (stryMutAct_9fa48("25186")) {
    {}
  } else {
    stryCov_9fa48("25186");
    return {};
  }
}
export function stepAnswerPathWithEntryWithActions(state: AnswerPathWithEntryState, event: AnswerPathWithEntryEvent): AnswerPathWithEntryStepResult {
  if (stryMutAct_9fa48("25187")) {
    {}
  } else {
    stryCov_9fa48("25187");
    if (stryMutAct_9fa48("25190") ? event.kind !== "path-request/answer-path-entry-gate" : stryMutAct_9fa48("25189") ? false : stryMutAct_9fa48("25188") ? true : (stryCov_9fa48("25188", "25189", "25190"), event.kind === (stryMutAct_9fa48("25191") ? "" : (stryCov_9fa48("25191"), "path-request/answer-path-entry-gate")))) {
      if (stryMutAct_9fa48("25192")) {
        {}
      } else {
        stryCov_9fa48("25192");
        return stryMutAct_9fa48("25193") ? {} : (stryCov_9fa48("25193"), {
          state,
          intents: stryMutAct_9fa48("25194") ? ["Stryker was here"] : (stryCov_9fa48("25194"), []),
          actions: stryMutAct_9fa48("25195") ? [] : (stryCov_9fa48("25195"), [stryMutAct_9fa48("25196") ? {} : (stryCov_9fa48("25196"), {
            kind: shouldAnswerPathWithEntry(event.pathPresent) ? stryMutAct_9fa48("25197") ? "" : (stryCov_9fa48("25197"), "answer") : stryMutAct_9fa48("25198") ? "" : (stryCov_9fa48("25198"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25199") ? {} : (stryCov_9fa48("25199"), {
      state,
      intents: stryMutAct_9fa48("25200") ? ["Stryker was here"] : (stryCov_9fa48("25200"), []),
      actions: stryMutAct_9fa48("25201") ? ["Stryker was here"] : (stryCov_9fa48("25201"), [])
    });
  }
}
export function shouldAnswerPathWithEntryNow(actions: ReadonlyArray<AnswerPathWithEntryAction>): boolean {
  if (stryMutAct_9fa48("25202")) {
    {}
  } else {
    stryCov_9fa48("25202");
    return stryMutAct_9fa48("25203") ? actions.every(action => action.kind === "answer") : (stryCov_9fa48("25203"), actions.some(stryMutAct_9fa48("25204") ? () => undefined : (stryCov_9fa48("25204"), action => stryMutAct_9fa48("25207") ? action.kind !== "answer" : stryMutAct_9fa48("25206") ? false : stryMutAct_9fa48("25205") ? true : (stryCov_9fa48("25205", "25206", "25207"), action.kind === (stryMutAct_9fa48("25208") ? "" : (stryCov_9fa48("25208"), "answer"))))));
  }
}
export function shouldSkipAnswerPathWithEntry(actions: ReadonlyArray<AnswerPathWithEntryAction>): boolean {
  if (stryMutAct_9fa48("25209")) {
    {}
  } else {
    stryCov_9fa48("25209");
    return stryMutAct_9fa48("25210") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25210"), actions.some(stryMutAct_9fa48("25211") ? () => undefined : (stryCov_9fa48("25211"), action => stryMutAct_9fa48("25214") ? action.kind !== "skip" : stryMutAct_9fa48("25213") ? false : stryMutAct_9fa48("25212") ? true : (stryCov_9fa48("25212", "25213", "25214"), action.kind === (stryMutAct_9fa48("25215") ? "" : (stryCov_9fa48("25215"), "skip"))))));
  }
}

/** Whether path-table touch may refresh a resolved entry's timestamp. */
export function shouldTouchPathEntry(pathPresent: boolean): boolean {
  if (stryMutAct_9fa48("25216")) {
    {}
  } else {
    stryCov_9fa48("25216");
    return pathPresent;
  }
}

/**
 * shouldTouchPathEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldTouchPathEntry`
 * reads beside the step).
 */
export type TouchPathEntryState = Record<string, never>;
export type TouchPathEntryEvent = Event | {
  readonly kind: "path/touch-entry-gate";
  readonly pathPresent: boolean;
};
export type TouchPathEntryAction = {
  readonly kind: "touch";
} | {
  readonly kind: "skip";
};
export interface TouchPathEntryStepResult {
  readonly state: TouchPathEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly TouchPathEntryAction[];
}
export function initialTouchPathEntryState(): TouchPathEntryState {
  if (stryMutAct_9fa48("25217")) {
    {}
  } else {
    stryCov_9fa48("25217");
    return {};
  }
}
export function stepTouchPathEntryWithActions(state: TouchPathEntryState, event: TouchPathEntryEvent): TouchPathEntryStepResult {
  if (stryMutAct_9fa48("25218")) {
    {}
  } else {
    stryCov_9fa48("25218");
    if (stryMutAct_9fa48("25221") ? event.kind !== "path/touch-entry-gate" : stryMutAct_9fa48("25220") ? false : stryMutAct_9fa48("25219") ? true : (stryCov_9fa48("25219", "25220", "25221"), event.kind === (stryMutAct_9fa48("25222") ? "" : (stryCov_9fa48("25222"), "path/touch-entry-gate")))) {
      if (stryMutAct_9fa48("25223")) {
        {}
      } else {
        stryCov_9fa48("25223");
        return stryMutAct_9fa48("25224") ? {} : (stryCov_9fa48("25224"), {
          state,
          intents: stryMutAct_9fa48("25225") ? ["Stryker was here"] : (stryCov_9fa48("25225"), []),
          actions: stryMutAct_9fa48("25226") ? [] : (stryCov_9fa48("25226"), [stryMutAct_9fa48("25227") ? {} : (stryCov_9fa48("25227"), {
            kind: shouldTouchPathEntry(event.pathPresent) ? stryMutAct_9fa48("25228") ? "" : (stryCov_9fa48("25228"), "touch") : stryMutAct_9fa48("25229") ? "" : (stryCov_9fa48("25229"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25230") ? {} : (stryCov_9fa48("25230"), {
      state,
      intents: stryMutAct_9fa48("25231") ? ["Stryker was here"] : (stryCov_9fa48("25231"), []),
      actions: stryMutAct_9fa48("25232") ? ["Stryker was here"] : (stryCov_9fa48("25232"), [])
    });
  }
}
export function shouldTouchPathEntryNow(actions: ReadonlyArray<TouchPathEntryAction>): boolean {
  if (stryMutAct_9fa48("25233")) {
    {}
  } else {
    stryCov_9fa48("25233");
    return stryMutAct_9fa48("25234") ? actions.every(action => action.kind === "touch") : (stryCov_9fa48("25234"), actions.some(stryMutAct_9fa48("25235") ? () => undefined : (stryCov_9fa48("25235"), action => stryMutAct_9fa48("25238") ? action.kind !== "touch" : stryMutAct_9fa48("25237") ? false : stryMutAct_9fa48("25236") ? true : (stryCov_9fa48("25236", "25237", "25238"), action.kind === (stryMutAct_9fa48("25239") ? "" : (stryCov_9fa48("25239"), "touch"))))));
  }
}