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
export { TRUNCATED_HASH_BYTES };
export const PATHFINDER_MAX_HOPS = 128;
export const PATHFINDER_EXPIRY_SECONDS = stryMutAct_9fa48("24765") ? 60 * 60 * 24 / 7 : (stryCov_9fa48("24765"), (stryMutAct_9fa48("24766") ? 60 * 60 / 24 : (stryCov_9fa48("24766"), (stryMutAct_9fa48("24767") ? 60 / 60 : (stryCov_9fa48("24767"), 60 * 60)) * 24)) * 7);
export const PATH_REQUEST_TIMEOUT_SECONDS = 15;
export const PATH_REQUEST_GRACE_MS = 400;
export const PATH_REQUEST_MIN_INTERVAL = 20;

/** Whether enough time has passed to emit another path request for a destination. */
export function shouldEmitPathRequest(input: {
  readonly lastRequestAt: number;
  readonly nowSeconds: number;
  readonly minIntervalSeconds?: number;
}): boolean {
  if (stryMutAct_9fa48("24768")) {
    {}
  } else {
    stryCov_9fa48("24768");
    const minInterval = stryMutAct_9fa48("24769") ? input.minIntervalSeconds && PATH_REQUEST_MIN_INTERVAL : (stryCov_9fa48("24769"), input.minIntervalSeconds ?? PATH_REQUEST_MIN_INTERVAL);
    return stryMutAct_9fa48("24773") ? input.nowSeconds - input.lastRequestAt < minInterval : stryMutAct_9fa48("24772") ? input.nowSeconds - input.lastRequestAt > minInterval : stryMutAct_9fa48("24771") ? false : stryMutAct_9fa48("24770") ? true : (stryCov_9fa48("24770", "24771", "24772", "24773"), (stryMutAct_9fa48("24774") ? input.nowSeconds + input.lastRequestAt : (stryCov_9fa48("24774"), input.nowSeconds - input.lastRequestAt)) >= minInterval);
  }
}

/**
 * shouldEmitPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldEmitPathRequest`
 * reads beside the step).
 */
export type EmitPathRequestState = Record<string, never>;
export type EmitPathRequestEvent = Event | {
  readonly kind: "path-request/emit-gate";
  readonly lastRequestAt: number;
  readonly nowSeconds: number;
  readonly minIntervalSeconds?: number;
};
export type EmitPathRequestAction = {
  readonly kind: "emit";
} | {
  readonly kind: "skip";
};
export interface EmitPathRequestStepResult {
  readonly state: EmitPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly EmitPathRequestAction[];
}
export function initialEmitPathRequestState(): EmitPathRequestState {
  if (stryMutAct_9fa48("24775")) {
    {}
  } else {
    stryCov_9fa48("24775");
    return {};
  }
}
export function stepEmitPathRequestWithActions(state: EmitPathRequestState, event: EmitPathRequestEvent): EmitPathRequestStepResult {
  if (stryMutAct_9fa48("24776")) {
    {}
  } else {
    stryCov_9fa48("24776");
    if (stryMutAct_9fa48("24779") ? event.kind !== "path-request/emit-gate" : stryMutAct_9fa48("24778") ? false : stryMutAct_9fa48("24777") ? true : (stryCov_9fa48("24777", "24778", "24779"), event.kind === (stryMutAct_9fa48("24780") ? "" : (stryCov_9fa48("24780"), "path-request/emit-gate")))) {
      if (stryMutAct_9fa48("24781")) {
        {}
      } else {
        stryCov_9fa48("24781");
        return stryMutAct_9fa48("24782") ? {} : (stryCov_9fa48("24782"), {
          state,
          intents: stryMutAct_9fa48("24783") ? ["Stryker was here"] : (stryCov_9fa48("24783"), []),
          actions: stryMutAct_9fa48("24784") ? [] : (stryCov_9fa48("24784"), [stryMutAct_9fa48("24785") ? {} : (stryCov_9fa48("24785"), {
            kind: shouldEmitPathRequest(stryMutAct_9fa48("24786") ? {} : (stryCov_9fa48("24786"), {
              lastRequestAt: event.lastRequestAt,
              nowSeconds: event.nowSeconds,
              ...((stryMutAct_9fa48("24789") ? event.minIntervalSeconds === undefined : stryMutAct_9fa48("24788") ? false : stryMutAct_9fa48("24787") ? true : (stryCov_9fa48("24787", "24788", "24789"), event.minIntervalSeconds !== undefined)) ? stryMutAct_9fa48("24790") ? {} : (stryCov_9fa48("24790"), {
                minIntervalSeconds: event.minIntervalSeconds
              }) : {})
            })) ? stryMutAct_9fa48("24791") ? "" : (stryCov_9fa48("24791"), "emit") : stryMutAct_9fa48("24792") ? "" : (stryCov_9fa48("24792"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24793") ? {} : (stryCov_9fa48("24793"), {
      state,
      intents: stryMutAct_9fa48("24794") ? ["Stryker was here"] : (stryCov_9fa48("24794"), []),
      actions: stryMutAct_9fa48("24795") ? ["Stryker was here"] : (stryCov_9fa48("24795"), [])
    });
  }
}
export function shouldEmitPathRequestNow(actions: ReadonlyArray<EmitPathRequestAction>): boolean {
  if (stryMutAct_9fa48("24796")) {
    {}
  } else {
    stryCov_9fa48("24796");
    return stryMutAct_9fa48("24797") ? actions.every(action => action.kind === "emit") : (stryCov_9fa48("24797"), actions.some(stryMutAct_9fa48("24798") ? () => undefined : (stryCov_9fa48("24798"), action => stryMutAct_9fa48("24801") ? action.kind !== "emit" : stryMutAct_9fa48("24800") ? false : stryMutAct_9fa48("24799") ? true : (stryCov_9fa48("24799", "24800", "24801"), action.kind === (stryMutAct_9fa48("24802") ? "" : (stryCov_9fa48("24802"), "emit"))))));
  }
}
export function shouldSkipEmitPathRequest(actions: ReadonlyArray<EmitPathRequestAction>): boolean {
  if (stryMutAct_9fa48("24803")) {
    {}
  } else {
    stryCov_9fa48("24803");
    return stryMutAct_9fa48("24804") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("24804"), actions.some(stryMutAct_9fa48("24805") ? () => undefined : (stryCov_9fa48("24805"), action => stryMutAct_9fa48("24808") ? action.kind !== "skip" : stryMutAct_9fa48("24807") ? false : stryMutAct_9fa48("24806") ? true : (stryCov_9fa48("24806", "24807", "24808"), action.kind === (stryMutAct_9fa48("24809") ? "" : (stryCov_9fa48("24809"), "skip"))))));
  }
}

/** True when a discovery path-request entry is past its absolute deadline. */
export function isDiscoveryPathRequestExpired(input: {
  readonly timeoutAt: number;
  readonly nowSeconds: number;
}): boolean {
  if (stryMutAct_9fa48("24810")) {
    {}
  } else {
    stryCov_9fa48("24810");
    return stryMutAct_9fa48("24814") ? input.nowSeconds <= input.timeoutAt : stryMutAct_9fa48("24813") ? input.nowSeconds >= input.timeoutAt : stryMutAct_9fa48("24812") ? false : stryMutAct_9fa48("24811") ? true : (stryCov_9fa48("24811", "24812", "24813", "24814"), input.nowSeconds > input.timeoutAt);
  }
}

/**
 * isDiscoveryPathRequestExpired gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `isDiscoveryPathRequestExpired` reads beside the step).
 */
export type DiscoveryPathRequestExpiredState = Record<string, never>;
export type DiscoveryPathRequestExpiredEvent = Event | {
  readonly kind: "path-request/discovery-expired-gate";
  readonly timeoutAt: number;
  readonly nowSeconds: number;
};
export type DiscoveryPathRequestExpiredAction = {
  readonly kind: "expired";
} | {
  readonly kind: "live";
};
export interface DiscoveryPathRequestExpiredStepResult {
  readonly state: DiscoveryPathRequestExpiredState;
  readonly intents: readonly Intent[];
  readonly actions: readonly DiscoveryPathRequestExpiredAction[];
}
export function initialDiscoveryPathRequestExpiredState(): DiscoveryPathRequestExpiredState {
  if (stryMutAct_9fa48("24815")) {
    {}
  } else {
    stryCov_9fa48("24815");
    return {};
  }
}
export function stepDiscoveryPathRequestExpiredWithActions(state: DiscoveryPathRequestExpiredState, event: DiscoveryPathRequestExpiredEvent): DiscoveryPathRequestExpiredStepResult {
  if (stryMutAct_9fa48("24816")) {
    {}
  } else {
    stryCov_9fa48("24816");
    if (stryMutAct_9fa48("24819") ? event.kind !== "path-request/discovery-expired-gate" : stryMutAct_9fa48("24818") ? false : stryMutAct_9fa48("24817") ? true : (stryCov_9fa48("24817", "24818", "24819"), event.kind === (stryMutAct_9fa48("24820") ? "" : (stryCov_9fa48("24820"), "path-request/discovery-expired-gate")))) {
      if (stryMutAct_9fa48("24821")) {
        {}
      } else {
        stryCov_9fa48("24821");
        return stryMutAct_9fa48("24822") ? {} : (stryCov_9fa48("24822"), {
          state,
          intents: stryMutAct_9fa48("24823") ? ["Stryker was here"] : (stryCov_9fa48("24823"), []),
          actions: stryMutAct_9fa48("24824") ? [] : (stryCov_9fa48("24824"), [stryMutAct_9fa48("24825") ? {} : (stryCov_9fa48("24825"), {
            kind: isDiscoveryPathRequestExpired(stryMutAct_9fa48("24826") ? {} : (stryCov_9fa48("24826"), {
              timeoutAt: event.timeoutAt,
              nowSeconds: event.nowSeconds
            })) ? stryMutAct_9fa48("24827") ? "" : (stryCov_9fa48("24827"), "expired") : stryMutAct_9fa48("24828") ? "" : (stryCov_9fa48("24828"), "live")
          })])
        });
      }
    }
    return stryMutAct_9fa48("24829") ? {} : (stryCov_9fa48("24829"), {
      state,
      intents: stryMutAct_9fa48("24830") ? ["Stryker was here"] : (stryCov_9fa48("24830"), []),
      actions: stryMutAct_9fa48("24831") ? ["Stryker was here"] : (stryCov_9fa48("24831"), [])
    });
  }
}
export function shouldTreatDiscoveryPathRequestExpired(actions: ReadonlyArray<DiscoveryPathRequestExpiredAction>): boolean {
  if (stryMutAct_9fa48("24832")) {
    {}
  } else {
    stryCov_9fa48("24832");
    return stryMutAct_9fa48("24833") ? actions.every(action => action.kind === "expired") : (stryCov_9fa48("24833"), actions.some(stryMutAct_9fa48("24834") ? () => undefined : (stryCov_9fa48("24834"), action => stryMutAct_9fa48("24837") ? action.kind !== "expired" : stryMutAct_9fa48("24836") ? false : stryMutAct_9fa48("24835") ? true : (stryCov_9fa48("24835", "24836", "24837"), action.kind === (stryMutAct_9fa48("24838") ? "" : (stryCov_9fa48("24838"), "expired"))))));
  }
}
export function shouldTreatDiscoveryPathRequestLive(actions: ReadonlyArray<DiscoveryPathRequestExpiredAction>): boolean {
  if (stryMutAct_9fa48("24839")) {
    {}
  } else {
    stryCov_9fa48("24839");
    return stryMutAct_9fa48("24840") ? actions.every(action => action.kind === "live") : (stryCov_9fa48("24840"), actions.some(stryMutAct_9fa48("24841") ? () => undefined : (stryCov_9fa48("24841"), action => stryMutAct_9fa48("24844") ? action.kind !== "live" : stryMutAct_9fa48("24843") ? false : stryMutAct_9fa48("24842") ? true : (stryCov_9fa48("24842", "24843", "24844"), action.kind === (stryMutAct_9fa48("24845") ? "" : (stryCov_9fa48("24845"), "live"))))));
  }
}

/**
 * Path-request ingress outcome after parse / tag / local / path / discovery gates.
 * Tag recording and transmit stay at the adapter edge.
 */
export type PathRequestIngressPlan = "ignore-unparsed" | "ignore-seen-tag" | "answer-local" | "answer-path" | "ignore" | "ignore-in-flight-discovery" | "start-discovery";

/**
 * Plan inbound path-request handling for leaf and transport-enabled nodes.
 * Pass `allowDiscovery: true` on TransportNode (missing path may forward);
 * leaf transport keeps the default (`false`) and ignores when no answerable path.
 */
export function planPathRequestIngress(input: {
  readonly parsedOk: boolean;
  readonly hasTag: boolean;
  readonly tagAlreadySeen: boolean;
  readonly hasLocalAnswerer: boolean;
  readonly transportEnabled: boolean;
  readonly hasPath: boolean;
  readonly shouldAnswerPath: boolean;
  readonly discoveryPresent: boolean;
  readonly discoveryExpired: boolean;
  readonly allowDiscovery?: boolean;
}): PathRequestIngressPlan {
  if (stryMutAct_9fa48("24846")) {
    {}
  } else {
    stryCov_9fa48("24846");
    if (stryMutAct_9fa48("24849") ? !input.parsedOk && !input.hasTag : stryMutAct_9fa48("24848") ? false : stryMutAct_9fa48("24847") ? true : (stryCov_9fa48("24847", "24848", "24849"), (stryMutAct_9fa48("24850") ? input.parsedOk : (stryCov_9fa48("24850"), !input.parsedOk)) || (stryMutAct_9fa48("24851") ? input.hasTag : (stryCov_9fa48("24851"), !input.hasTag)))) {
      if (stryMutAct_9fa48("24852")) {
        {}
      } else {
        stryCov_9fa48("24852");
        return stryMutAct_9fa48("24853") ? "" : (stryCov_9fa48("24853"), "ignore-unparsed");
      }
    }
    if (stryMutAct_9fa48("24855") ? false : stryMutAct_9fa48("24854") ? true : (stryCov_9fa48("24854", "24855"), input.tagAlreadySeen)) {
      if (stryMutAct_9fa48("24856")) {
        {}
      } else {
        stryCov_9fa48("24856");
        return stryMutAct_9fa48("24857") ? "" : (stryCov_9fa48("24857"), "ignore-seen-tag");
      }
    }
    if (stryMutAct_9fa48("24859") ? false : stryMutAct_9fa48("24858") ? true : (stryCov_9fa48("24858", "24859"), input.hasLocalAnswerer)) {
      if (stryMutAct_9fa48("24860")) {
        {}
      } else {
        stryCov_9fa48("24860");
        return stryMutAct_9fa48("24861") ? "" : (stryCov_9fa48("24861"), "answer-local");
      }
    }
    if (stryMutAct_9fa48("24864") ? false : stryMutAct_9fa48("24863") ? true : stryMutAct_9fa48("24862") ? input.transportEnabled : (stryCov_9fa48("24862", "24863", "24864"), !input.transportEnabled)) {
      if (stryMutAct_9fa48("24865")) {
        {}
      } else {
        stryCov_9fa48("24865");
        return stryMutAct_9fa48("24866") ? "" : (stryCov_9fa48("24866"), "ignore");
      }
    }
    if (stryMutAct_9fa48("24868") ? false : stryMutAct_9fa48("24867") ? true : (stryCov_9fa48("24867", "24868"), input.hasPath)) {
      if (stryMutAct_9fa48("24869")) {
        {}
      } else {
        stryCov_9fa48("24869");
        return input.shouldAnswerPath ? stryMutAct_9fa48("24870") ? "" : (stryCov_9fa48("24870"), "answer-path") : stryMutAct_9fa48("24871") ? "" : (stryCov_9fa48("24871"), "ignore");
      }
    }
    if (stryMutAct_9fa48("24874") ? input.allowDiscovery === true : stryMutAct_9fa48("24873") ? false : stryMutAct_9fa48("24872") ? true : (stryCov_9fa48("24872", "24873", "24874"), input.allowDiscovery !== (stryMutAct_9fa48("24875") ? false : (stryCov_9fa48("24875"), true)))) {
      if (stryMutAct_9fa48("24876")) {
        {}
      } else {
        stryCov_9fa48("24876");
        return stryMutAct_9fa48("24877") ? "" : (stryCov_9fa48("24877"), "ignore");
      }
    }
    if (stryMutAct_9fa48("24880") ? input.discoveryPresent || !input.discoveryExpired : stryMutAct_9fa48("24879") ? false : stryMutAct_9fa48("24878") ? true : (stryCov_9fa48("24878", "24879", "24880"), input.discoveryPresent && (stryMutAct_9fa48("24881") ? input.discoveryExpired : (stryCov_9fa48("24881"), !input.discoveryExpired)))) {
      if (stryMutAct_9fa48("24882")) {
        {}
      } else {
        stryCov_9fa48("24882");
        return stryMutAct_9fa48("24883") ? "" : (stryCov_9fa48("24883"), "ignore-in-flight-discovery");
      }
    }
    return stryMutAct_9fa48("24884") ? "" : (stryCov_9fa48("24884"), "start-discovery");
  }
}

/**
 * Path-request-ingress plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPathRequestIngress` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPathRequestIngressWithActions}.
 */
export type PathRequestIngressPlanState = Record<string, never>;
export type PathRequestIngressPlanEvent = Event | {
  readonly kind: "path-request/ingress-plan-gate";
  readonly parsedOk: boolean;
  readonly hasTag: boolean;
  readonly tagAlreadySeen: boolean;
  readonly hasLocalAnswerer: boolean;
  readonly transportEnabled: boolean;
  readonly hasPath: boolean;
  readonly shouldAnswerPath: boolean;
  readonly discoveryPresent: boolean;
  readonly discoveryExpired: boolean;
  readonly allowDiscovery?: boolean;
};
export type PathRequestIngressPlanAction = {
  readonly kind: PathRequestIngressPlan;
};
export interface PathRequestIngressPlanStepResult {
  readonly state: PathRequestIngressPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestIngressPlanAction[];
}
export function initialPathRequestIngressPlanState(): PathRequestIngressPlanState {
  if (stryMutAct_9fa48("24885")) {
    {}
  } else {
    stryCov_9fa48("24885");
    return {};
  }
}
export function stepPathRequestIngressPlanWithActions(state: PathRequestIngressPlanState, event: PathRequestIngressPlanEvent): PathRequestIngressPlanStepResult {
  if (stryMutAct_9fa48("24886")) {
    {}
  } else {
    stryCov_9fa48("24886");
    if (stryMutAct_9fa48("24889") ? event.kind !== "path-request/ingress-plan-gate" : stryMutAct_9fa48("24888") ? false : stryMutAct_9fa48("24887") ? true : (stryCov_9fa48("24887", "24888", "24889"), event.kind === (stryMutAct_9fa48("24890") ? "" : (stryCov_9fa48("24890"), "path-request/ingress-plan-gate")))) {
      if (stryMutAct_9fa48("24891")) {
        {}
      } else {
        stryCov_9fa48("24891");
        return stryMutAct_9fa48("24892") ? {} : (stryCov_9fa48("24892"), {
          state,
          intents: stryMutAct_9fa48("24893") ? ["Stryker was here"] : (stryCov_9fa48("24893"), []),
          actions: stryMutAct_9fa48("24894") ? [] : (stryCov_9fa48("24894"), [stryMutAct_9fa48("24895") ? {} : (stryCov_9fa48("24895"), {
            kind: planPathRequestIngress(stryMutAct_9fa48("24896") ? {} : (stryCov_9fa48("24896"), {
              parsedOk: event.parsedOk,
              hasTag: event.hasTag,
              tagAlreadySeen: event.tagAlreadySeen,
              hasLocalAnswerer: event.hasLocalAnswerer,
              transportEnabled: event.transportEnabled,
              hasPath: event.hasPath,
              shouldAnswerPath: event.shouldAnswerPath,
              discoveryPresent: event.discoveryPresent,
              discoveryExpired: event.discoveryExpired,
              ...((stryMutAct_9fa48("24899") ? event.allowDiscovery === undefined : stryMutAct_9fa48("24898") ? false : stryMutAct_9fa48("24897") ? true : (stryCov_9fa48("24897", "24898", "24899"), event.allowDiscovery !== undefined)) ? stryMutAct_9fa48("24900") ? {} : (stryCov_9fa48("24900"), {
                allowDiscovery: event.allowDiscovery
              }) : {})
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("24901") ? {} : (stryCov_9fa48("24901"), {
      state,
      intents: stryMutAct_9fa48("24902") ? ["Stryker was here"] : (stryCov_9fa48("24902"), []),
      actions: stryMutAct_9fa48("24903") ? ["Stryker was here"] : (stryCov_9fa48("24903"), [])
    });
  }
}

/** Extract the path-request ingress plan from actions; null when empty. */
export function pathRequestIngressPlanFromActions(actions: ReadonlyArray<PathRequestIngressPlanAction>): PathRequestIngressPlan | null {
  if (stryMutAct_9fa48("24904")) {
    {}
  } else {
    stryCov_9fa48("24904");
    const action = actions.find(stryMutAct_9fa48("24905") ? () => undefined : (stryCov_9fa48("24905"), entry => stryMutAct_9fa48("24908") ? (entry.kind === "ignore-unparsed" || entry.kind === "ignore-seen-tag" || entry.kind === "answer-local" || entry.kind === "answer-path" || entry.kind === "ignore" || entry.kind === "ignore-in-flight-discovery") && entry.kind === "start-discovery" : stryMutAct_9fa48("24907") ? false : stryMutAct_9fa48("24906") ? true : (stryCov_9fa48("24906", "24907", "24908"), (stryMutAct_9fa48("24910") ? (entry.kind === "ignore-unparsed" || entry.kind === "ignore-seen-tag" || entry.kind === "answer-local" || entry.kind === "answer-path" || entry.kind === "ignore") && entry.kind === "ignore-in-flight-discovery" : stryMutAct_9fa48("24909") ? false : (stryCov_9fa48("24909", "24910"), (stryMutAct_9fa48("24912") ? (entry.kind === "ignore-unparsed" || entry.kind === "ignore-seen-tag" || entry.kind === "answer-local" || entry.kind === "answer-path") && entry.kind === "ignore" : stryMutAct_9fa48("24911") ? false : (stryCov_9fa48("24911", "24912"), (stryMutAct_9fa48("24914") ? (entry.kind === "ignore-unparsed" || entry.kind === "ignore-seen-tag" || entry.kind === "answer-local") && entry.kind === "answer-path" : stryMutAct_9fa48("24913") ? false : (stryCov_9fa48("24913", "24914"), (stryMutAct_9fa48("24916") ? (entry.kind === "ignore-unparsed" || entry.kind === "ignore-seen-tag") && entry.kind === "answer-local" : stryMutAct_9fa48("24915") ? false : (stryCov_9fa48("24915", "24916"), (stryMutAct_9fa48("24918") ? entry.kind === "ignore-unparsed" && entry.kind === "ignore-seen-tag" : stryMutAct_9fa48("24917") ? false : (stryCov_9fa48("24917", "24918"), (stryMutAct_9fa48("24920") ? entry.kind !== "ignore-unparsed" : stryMutAct_9fa48("24919") ? false : (stryCov_9fa48("24919", "24920"), entry.kind === (stryMutAct_9fa48("24921") ? "" : (stryCov_9fa48("24921"), "ignore-unparsed")))) || (stryMutAct_9fa48("24923") ? entry.kind !== "ignore-seen-tag" : stryMutAct_9fa48("24922") ? false : (stryCov_9fa48("24922", "24923"), entry.kind === (stryMutAct_9fa48("24924") ? "" : (stryCov_9fa48("24924"), "ignore-seen-tag")))))) || (stryMutAct_9fa48("24926") ? entry.kind !== "answer-local" : stryMutAct_9fa48("24925") ? false : (stryCov_9fa48("24925", "24926"), entry.kind === (stryMutAct_9fa48("24927") ? "" : (stryCov_9fa48("24927"), "answer-local")))))) || (stryMutAct_9fa48("24929") ? entry.kind !== "answer-path" : stryMutAct_9fa48("24928") ? false : (stryCov_9fa48("24928", "24929"), entry.kind === (stryMutAct_9fa48("24930") ? "" : (stryCov_9fa48("24930"), "answer-path")))))) || (stryMutAct_9fa48("24932") ? entry.kind !== "ignore" : stryMutAct_9fa48("24931") ? false : (stryCov_9fa48("24931", "24932"), entry.kind === (stryMutAct_9fa48("24933") ? "" : (stryCov_9fa48("24933"), "ignore")))))) || (stryMutAct_9fa48("24935") ? entry.kind !== "ignore-in-flight-discovery" : stryMutAct_9fa48("24934") ? false : (stryCov_9fa48("24934", "24935"), entry.kind === (stryMutAct_9fa48("24936") ? "" : (stryCov_9fa48("24936"), "ignore-in-flight-discovery")))))) || (stryMutAct_9fa48("24938") ? entry.kind !== "start-discovery" : stryMutAct_9fa48("24937") ? false : (stryCov_9fa48("24937", "24938"), entry.kind === (stryMutAct_9fa48("24939") ? "" : (stryCov_9fa48("24939"), "start-discovery")))))));
    return stryMutAct_9fa48("24940") ? action?.kind && null : (stryCov_9fa48("24940"), (stryMutAct_9fa48("24941") ? action.kind : (stryCov_9fa48("24941"), action?.kind)) ?? null);
  }
}

/**
 * Path-request ingress is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPathRequestIngressPlanWithActions}.
 */
export type PathRequestIngressState = Record<string, never>;
export type PathRequestIngressEvent = Event | {
  readonly kind: "path-request/ingress-gate";
  readonly parsedOk: boolean;
  readonly hasTag: boolean;
  readonly tagAlreadySeen: boolean;
  readonly hasLocalAnswerer: boolean;
  readonly transportEnabled: boolean;
  readonly hasPath: boolean;
  readonly shouldAnswerPath: boolean;
  readonly discoveryPresent: boolean;
  readonly discoveryExpired: boolean;
  readonly allowDiscovery?: boolean;
};
export type PathRequestIngressAction = {
  readonly kind: PathRequestIngressPlan;
};
export interface PathRequestIngressStepResult {
  readonly state: PathRequestIngressState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestIngressAction[];
}
export function initialPathRequestIngressState(): PathRequestIngressState {
  if (stryMutAct_9fa48("24942")) {
    {}
  } else {
    stryCov_9fa48("24942");
    return {};
  }
}
export const stepPathRequestIngress: StepFn<PathRequestIngressState> = (state, event) => {
  if (stryMutAct_9fa48("24943")) {
    {}
  } else {
    stryCov_9fa48("24943");
    const result = stepPathRequestIngressInner(state, event as PathRequestIngressEvent);
    return stryMutAct_9fa48("24944") ? {} : (stryCov_9fa48("24944"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPathRequestIngressWithActions(state: PathRequestIngressState, event: PathRequestIngressEvent): PathRequestIngressStepResult {
  if (stryMutAct_9fa48("24945")) {
    {}
  } else {
    stryCov_9fa48("24945");
    return stepPathRequestIngressInner(state, event);
  }
}
export function pathRequestIngressFromActions(actions: ReadonlyArray<PathRequestIngressAction>): PathRequestIngressPlan | null {
  if (stryMutAct_9fa48("24946")) {
    {}
  } else {
    stryCov_9fa48("24946");
    const action = actions[0];
    return stryMutAct_9fa48("24947") ? action?.kind && null : (stryCov_9fa48("24947"), (stryMutAct_9fa48("24948") ? action.kind : (stryCov_9fa48("24948"), action?.kind)) ?? null);
  }
}
export function shouldIgnorePathRequestUnparsed(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24949")) {
    {}
  } else {
    stryCov_9fa48("24949");
    return stryMutAct_9fa48("24950") ? actions.every(action => action.kind === "ignore-unparsed") : (stryCov_9fa48("24950"), actions.some(stryMutAct_9fa48("24951") ? () => undefined : (stryCov_9fa48("24951"), action => stryMutAct_9fa48("24954") ? action.kind !== "ignore-unparsed" : stryMutAct_9fa48("24953") ? false : stryMutAct_9fa48("24952") ? true : (stryCov_9fa48("24952", "24953", "24954"), action.kind === (stryMutAct_9fa48("24955") ? "" : (stryCov_9fa48("24955"), "ignore-unparsed"))))));
  }
}
export function shouldIgnorePathRequestSeenTag(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24956")) {
    {}
  } else {
    stryCov_9fa48("24956");
    return stryMutAct_9fa48("24957") ? actions.every(action => action.kind === "ignore-seen-tag") : (stryCov_9fa48("24957"), actions.some(stryMutAct_9fa48("24958") ? () => undefined : (stryCov_9fa48("24958"), action => stryMutAct_9fa48("24961") ? action.kind !== "ignore-seen-tag" : stryMutAct_9fa48("24960") ? false : stryMutAct_9fa48("24959") ? true : (stryCov_9fa48("24959", "24960", "24961"), action.kind === (stryMutAct_9fa48("24962") ? "" : (stryCov_9fa48("24962"), "ignore-seen-tag"))))));
  }
}
export function shouldAnswerPathRequestLocal(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24963")) {
    {}
  } else {
    stryCov_9fa48("24963");
    return stryMutAct_9fa48("24964") ? actions.every(action => action.kind === "answer-local") : (stryCov_9fa48("24964"), actions.some(stryMutAct_9fa48("24965") ? () => undefined : (stryCov_9fa48("24965"), action => stryMutAct_9fa48("24968") ? action.kind !== "answer-local" : stryMutAct_9fa48("24967") ? false : stryMutAct_9fa48("24966") ? true : (stryCov_9fa48("24966", "24967", "24968"), action.kind === (stryMutAct_9fa48("24969") ? "" : (stryCov_9fa48("24969"), "answer-local"))))));
  }
}
export function shouldAnswerPathRequestPath(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24970")) {
    {}
  } else {
    stryCov_9fa48("24970");
    return stryMutAct_9fa48("24971") ? actions.every(action => action.kind === "answer-path") : (stryCov_9fa48("24971"), actions.some(stryMutAct_9fa48("24972") ? () => undefined : (stryCov_9fa48("24972"), action => stryMutAct_9fa48("24975") ? action.kind !== "answer-path" : stryMutAct_9fa48("24974") ? false : stryMutAct_9fa48("24973") ? true : (stryCov_9fa48("24973", "24974", "24975"), action.kind === (stryMutAct_9fa48("24976") ? "" : (stryCov_9fa48("24976"), "answer-path"))))));
  }
}
export function shouldIgnorePathRequestIngress(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24977")) {
    {}
  } else {
    stryCov_9fa48("24977");
    return stryMutAct_9fa48("24978") ? actions.every(action => action.kind === "ignore") : (stryCov_9fa48("24978"), actions.some(stryMutAct_9fa48("24979") ? () => undefined : (stryCov_9fa48("24979"), action => stryMutAct_9fa48("24982") ? action.kind !== "ignore" : stryMutAct_9fa48("24981") ? false : stryMutAct_9fa48("24980") ? true : (stryCov_9fa48("24980", "24981", "24982"), action.kind === (stryMutAct_9fa48("24983") ? "" : (stryCov_9fa48("24983"), "ignore"))))));
  }
}
export function shouldIgnorePathRequestInFlightDiscovery(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24984")) {
    {}
  } else {
    stryCov_9fa48("24984");
    return stryMutAct_9fa48("24985") ? actions.every(action => action.kind === "ignore-in-flight-discovery") : (stryCov_9fa48("24985"), actions.some(stryMutAct_9fa48("24986") ? () => undefined : (stryCov_9fa48("24986"), action => stryMutAct_9fa48("24989") ? action.kind !== "ignore-in-flight-discovery" : stryMutAct_9fa48("24988") ? false : stryMutAct_9fa48("24987") ? true : (stryCov_9fa48("24987", "24988", "24989"), action.kind === (stryMutAct_9fa48("24990") ? "" : (stryCov_9fa48("24990"), "ignore-in-flight-discovery"))))));
  }
}
export function shouldStartPathRequestDiscovery(actions: ReadonlyArray<PathRequestIngressAction>): boolean {
  if (stryMutAct_9fa48("24991")) {
    {}
  } else {
    stryCov_9fa48("24991");
    return stryMutAct_9fa48("24992") ? actions.every(action => action.kind === "start-discovery") : (stryCov_9fa48("24992"), actions.some(stryMutAct_9fa48("24993") ? () => undefined : (stryCov_9fa48("24993"), action => stryMutAct_9fa48("24996") ? action.kind !== "start-discovery" : stryMutAct_9fa48("24995") ? false : stryMutAct_9fa48("24994") ? true : (stryCov_9fa48("24994", "24995", "24996"), action.kind === (stryMutAct_9fa48("24997") ? "" : (stryCov_9fa48("24997"), "start-discovery"))))));
  }
}
function stepPathRequestIngressInner(state: PathRequestIngressState, event: PathRequestIngressEvent): PathRequestIngressStepResult {
  if (stryMutAct_9fa48("24998")) {
    {}
  } else {
    stryCov_9fa48("24998");
    if (stryMutAct_9fa48("25001") ? event.kind !== "path-request/ingress-gate" : stryMutAct_9fa48("25000") ? false : stryMutAct_9fa48("24999") ? true : (stryCov_9fa48("24999", "25000", "25001"), event.kind === (stryMutAct_9fa48("25002") ? "" : (stryCov_9fa48("25002"), "path-request/ingress-gate")))) {
      if (stryMutAct_9fa48("25003")) {
        {}
      } else {
        stryCov_9fa48("25003");
        const planActions = stepPathRequestIngressPlanWithActions(initialPathRequestIngressPlanState(), stryMutAct_9fa48("25004") ? {} : (stryCov_9fa48("25004"), {
          kind: stryMutAct_9fa48("25005") ? "" : (stryCov_9fa48("25005"), "path-request/ingress-plan-gate"),
          parsedOk: event.parsedOk,
          hasTag: event.hasTag,
          tagAlreadySeen: event.tagAlreadySeen,
          hasLocalAnswerer: event.hasLocalAnswerer,
          transportEnabled: event.transportEnabled,
          hasPath: event.hasPath,
          shouldAnswerPath: event.shouldAnswerPath,
          discoveryPresent: event.discoveryPresent,
          discoveryExpired: event.discoveryExpired,
          ...((stryMutAct_9fa48("25008") ? event.allowDiscovery === undefined : stryMutAct_9fa48("25007") ? false : stryMutAct_9fa48("25006") ? true : (stryCov_9fa48("25006", "25007", "25008"), event.allowDiscovery !== undefined)) ? stryMutAct_9fa48("25009") ? {} : (stryCov_9fa48("25009"), {
            allowDiscovery: event.allowDiscovery
          }) : {})
        })).actions;
        const plan = pathRequestIngressPlanFromActions(planActions);
        if (stryMutAct_9fa48("25012") ? plan !== null : stryMutAct_9fa48("25011") ? false : stryMutAct_9fa48("25010") ? true : (stryCov_9fa48("25010", "25011", "25012"), plan === null)) {
          if (stryMutAct_9fa48("25013")) {
            {}
          } else {
            stryCov_9fa48("25013");
            return stryMutAct_9fa48("25014") ? {} : (stryCov_9fa48("25014"), {
              state,
              intents: stryMutAct_9fa48("25015") ? ["Stryker was here"] : (stryCov_9fa48("25015"), []),
              actions: stryMutAct_9fa48("25016") ? ["Stryker was here"] : (stryCov_9fa48("25016"), [])
            });
          }
        }
        return stryMutAct_9fa48("25017") ? {} : (stryCov_9fa48("25017"), {
          state,
          intents: stryMutAct_9fa48("25018") ? ["Stryker was here"] : (stryCov_9fa48("25018"), []),
          actions: stryMutAct_9fa48("25019") ? [] : (stryCov_9fa48("25019"), [stryMutAct_9fa48("25020") ? {} : (stryCov_9fa48("25020"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("25021") ? {} : (stryCov_9fa48("25021"), {
      state,
      intents: stryMutAct_9fa48("25022") ? ["Stryker was here"] : (stryCov_9fa48("25022"), []),
      actions: stryMutAct_9fa48("25023") ? ["Stryker was here"] : (stryCov_9fa48("25023"), [])
    });
  }
}

/** Whether answer-local may invoke the local destination path-request handler. */
export function canAnswerLocalPathRequest(handlerPresent: boolean): boolean {
  if (stryMutAct_9fa48("25024")) {
    {}
  } else {
    stryCov_9fa48("25024");
    return handlerPresent;
  }
}

/**
 * canAnswerLocalPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `canAnswerLocalPathRequest`
 * reads beside the step).
 */
export type AnswerLocalPathRequestState = Record<string, never>;
export type AnswerLocalPathRequestEvent = Event | {
  readonly kind: "path-request/answer-local-handler-gate";
  readonly handlerPresent: boolean;
};