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
import { PATHFINDER_EXPIRY_SECONDS, PATHFINDER_MAX_HOPS } from "./part-1.js";
import { stepPathOutboundInner } from "./part-3.js";
import type { PathOutboundAction, PathOutboundEvent, PathOutboundKind, PathOutboundPlanAction, PathOutboundState } from "./part-3.js";
export function shouldFloodPathOutboundPlan(actions: ReadonlyArray<PathOutboundPlanAction>): boolean {
  if (stryMutAct_9fa48("25502")) {
    {}
  } else {
    stryCov_9fa48("25502");
    return stryMutAct_9fa48("25503") ? actions.every(action => action.kind === "flood") : (stryCov_9fa48("25503"), actions.some(stryMutAct_9fa48("25504") ? () => undefined : (stryCov_9fa48("25504"), action => stryMutAct_9fa48("25507") ? action.kind !== "flood" : stryMutAct_9fa48("25506") ? false : stryMutAct_9fa48("25505") ? true : (stryCov_9fa48("25505", "25506", "25507"), action.kind === (stryMutAct_9fa48("25508") ? "" : (stryCov_9fa48("25508"), "flood"))))));
  }
}
export function initialPathOutboundState(): PathOutboundState {
  if (stryMutAct_9fa48("25509")) {
    {}
  } else {
    stryCov_9fa48("25509");
    return {};
  }
}
export const stepPathOutbound: StepFn<PathOutboundState> = (state, event) => {
  if (stryMutAct_9fa48("25510")) {
    {}
  } else {
    stryCov_9fa48("25510");
    const result = stepPathOutboundInner(state, event as PathOutboundEvent);
    return stryMutAct_9fa48("25511") ? {} : (stryCov_9fa48("25511"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function pathOutboundFromActions(actions: ReadonlyArray<PathOutboundAction>): PathOutboundKind | null {
  if (stryMutAct_9fa48("25512")) {
    {}
  } else {
    stryCov_9fa48("25512");
    const action = actions[0];
    return stryMutAct_9fa48("25513") ? action?.kind && null : (stryCov_9fa48("25513"), (stryMutAct_9fa48("25514") ? action.kind : (stryCov_9fa48("25514"), action?.kind)) ?? null);
  }
}
export function shouldWrapPathOutbound(actions: ReadonlyArray<PathOutboundAction>): boolean {
  if (stryMutAct_9fa48("25515")) {
    {}
  } else {
    stryCov_9fa48("25515");
    return stryMutAct_9fa48("25516") ? actions.every(action => action.kind === "wrap") : (stryCov_9fa48("25516"), actions.some(stryMutAct_9fa48("25517") ? () => undefined : (stryCov_9fa48("25517"), action => stryMutAct_9fa48("25520") ? action.kind !== "wrap" : stryMutAct_9fa48("25519") ? false : stryMutAct_9fa48("25518") ? true : (stryCov_9fa48("25518", "25519", "25520"), action.kind === (stryMutAct_9fa48("25521") ? "" : (stryCov_9fa48("25521"), "wrap"))))));
  }
}
export function shouldDirectPathOutbound(actions: ReadonlyArray<PathOutboundAction>): boolean {
  if (stryMutAct_9fa48("25522")) {
    {}
  } else {
    stryCov_9fa48("25522");
    return stryMutAct_9fa48("25523") ? actions.every(action => action.kind === "direct") : (stryCov_9fa48("25523"), actions.some(stryMutAct_9fa48("25524") ? () => undefined : (stryCov_9fa48("25524"), action => stryMutAct_9fa48("25527") ? action.kind !== "direct" : stryMutAct_9fa48("25526") ? false : stryMutAct_9fa48("25525") ? true : (stryCov_9fa48("25525", "25526", "25527"), action.kind === (stryMutAct_9fa48("25528") ? "" : (stryCov_9fa48("25528"), "direct"))))));
  }
}
export function shouldFloodPathOutbound(actions: ReadonlyArray<PathOutboundAction>): boolean {
  if (stryMutAct_9fa48("25529")) {
    {}
  } else {
    stryCov_9fa48("25529");
    return stryMutAct_9fa48("25530") ? actions.every(action => action.kind === "flood") : (stryCov_9fa48("25530"), actions.some(stryMutAct_9fa48("25531") ? () => undefined : (stryCov_9fa48("25531"), action => stryMutAct_9fa48("25534") ? action.kind !== "flood" : stryMutAct_9fa48("25533") ? false : stryMutAct_9fa48("25532") ? true : (stryCov_9fa48("25532", "25533", "25534"), action.kind === (stryMutAct_9fa48("25535") ? "" : (stryCov_9fa48("25535"), "flood"))))));
  }
}
export interface PathTableEntryView {
  readonly hops: number;
  readonly expires: number;
  readonly randomBlobs: readonly Uint8Array[];
}
export interface PathAddDecisionInput {
  readonly hops: number;
  readonly randomBlob: Uint8Array;
  readonly nowSeconds: number;
  readonly existing: PathTableEntryView | null;
}

/** Mirrors RNS announce random-blob timestamp decode (bytes 5..9). */
export function announceEmittedFromRandomBlob(randomBlob: Uint8Array): number {
  if (stryMutAct_9fa48("25536")) {
    {}
  } else {
    stryCov_9fa48("25536");
    if (stryMutAct_9fa48("25540") ? randomBlob.length >= 10 : stryMutAct_9fa48("25539") ? randomBlob.length <= 10 : stryMutAct_9fa48("25538") ? false : stryMutAct_9fa48("25537") ? true : (stryCov_9fa48("25537", "25538", "25539", "25540"), randomBlob.length < 10)) {
      if (stryMutAct_9fa48("25541")) {
        {}
      } else {
        stryCov_9fa48("25541");
        return 0;
      }
    }
    let value = 0;
    for (let index = 5; stryMutAct_9fa48("25544") ? index >= 10 : stryMutAct_9fa48("25543") ? index <= 10 : stryMutAct_9fa48("25542") ? false : (stryCov_9fa48("25542", "25543", "25544"), index < 10); stryMutAct_9fa48("25545") ? index -= 1 : (stryCov_9fa48("25545"), index += 1)) {
      if (stryMutAct_9fa48("25546")) {
        {}
      } else {
        stryCov_9fa48("25546");
        value = value << 8 | (stryMutAct_9fa48("25547") ? randomBlob[index] && 0 : (stryCov_9fa48("25547"), randomBlob[index] ?? 0));
      }
    }
    return value;
  }
}
export function timebaseFromRandomBlobs(randomBlobs: ReadonlyArray<Uint8Array>): number {
  if (stryMutAct_9fa48("25548")) {
    {}
  } else {
    stryCov_9fa48("25548");
    let latest = 0;
    for (const blob of randomBlobs) {
      if (stryMutAct_9fa48("25549")) {
        {}
      } else {
        stryCov_9fa48("25549");
        latest = stryMutAct_9fa48("25550") ? Math.min(latest, announceEmittedFromRandomBlob(blob)) : (stryCov_9fa48("25550"), Math.max(latest, announceEmittedFromRandomBlob(blob)));
      }
    }
    return latest;
  }
}
export function equalByteArrays(left: Uint8Array, right: Uint8Array): boolean {
  if (stryMutAct_9fa48("25551")) {
    {}
  } else {
    stryCov_9fa48("25551");
    if (stryMutAct_9fa48("25554") ? left.length === right.length : stryMutAct_9fa48("25553") ? false : stryMutAct_9fa48("25552") ? true : (stryCov_9fa48("25552", "25553", "25554"), left.length !== right.length)) {
      if (stryMutAct_9fa48("25555")) {
        {}
      } else {
        stryCov_9fa48("25555");
        return stryMutAct_9fa48("25556") ? true : (stryCov_9fa48("25556"), false);
      }
    }
    for (let i = 0; stryMutAct_9fa48("25559") ? i >= left.length : stryMutAct_9fa48("25558") ? i <= left.length : stryMutAct_9fa48("25557") ? false : (stryCov_9fa48("25557", "25558", "25559"), i < left.length); stryMutAct_9fa48("25560") ? i -= 1 : (stryCov_9fa48("25560"), i += 1)) {
      if (stryMutAct_9fa48("25561")) {
        {}
      } else {
        stryCov_9fa48("25561");
        if (stryMutAct_9fa48("25564") ? left[i] === right[i] : stryMutAct_9fa48("25563") ? false : stryMutAct_9fa48("25562") ? true : (stryCov_9fa48("25562", "25563", "25564"), left[i] !== right[i])) {
          if (stryMutAct_9fa48("25565")) {
            {}
          } else {
            stryCov_9fa48("25565");
            return stryMutAct_9fa48("25566") ? true : (stryCov_9fa48("25566"), false);
          }
        }
      }
    }
    return stryMutAct_9fa48("25567") ? false : (stryCov_9fa48("25567"), true);
  }
}
export function shouldAnswerPathRequest(nextHop: Uint8Array, requestorTransportId: Uint8Array | null): boolean {
  if (stryMutAct_9fa48("25568")) {
    {}
  } else {
    stryCov_9fa48("25568");
    if (stryMutAct_9fa48("25571") ? requestorTransportId !== null : stryMutAct_9fa48("25570") ? false : stryMutAct_9fa48("25569") ? true : (stryCov_9fa48("25569", "25570", "25571"), requestorTransportId === null)) {
      if (stryMutAct_9fa48("25572")) {
        {}
      } else {
        stryCov_9fa48("25572");
        return stryMutAct_9fa48("25573") ? false : (stryCov_9fa48("25573"), true);
      }
    }
    return stryMutAct_9fa48("25574") ? equalByteArrays(nextHop, requestorTransportId) : (stryCov_9fa48("25574"), !equalByteArrays(nextHop, requestorTransportId));
  }
}

/**
 * shouldAnswerPathRequest gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAnswerPathRequest`
 * reads beside the step).
 */
export type AnswerPathRequestState = Record<string, never>;
export type AnswerPathRequestEvent = Event | {
  readonly kind: "path-request/answer-path-gate";
  readonly nextHop: Uint8Array;
  readonly requestorTransportId: Uint8Array | null;
};
export type AnswerPathRequestAction = {
  readonly kind: "answer";
} | {
  readonly kind: "skip";
};
export interface AnswerPathRequestStepResult {
  readonly state: AnswerPathRequestState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AnswerPathRequestAction[];
}
export function initialAnswerPathRequestState(): AnswerPathRequestState {
  if (stryMutAct_9fa48("25575")) {
    {}
  } else {
    stryCov_9fa48("25575");
    return {};
  }
}
export function stepAnswerPathRequestWithActions(state: AnswerPathRequestState, event: AnswerPathRequestEvent): AnswerPathRequestStepResult {
  if (stryMutAct_9fa48("25576")) {
    {}
  } else {
    stryCov_9fa48("25576");
    if (stryMutAct_9fa48("25579") ? event.kind !== "path-request/answer-path-gate" : stryMutAct_9fa48("25578") ? false : stryMutAct_9fa48("25577") ? true : (stryCov_9fa48("25577", "25578", "25579"), event.kind === (stryMutAct_9fa48("25580") ? "" : (stryCov_9fa48("25580"), "path-request/answer-path-gate")))) {
      if (stryMutAct_9fa48("25581")) {
        {}
      } else {
        stryCov_9fa48("25581");
        return stryMutAct_9fa48("25582") ? {} : (stryCov_9fa48("25582"), {
          state,
          intents: stryMutAct_9fa48("25583") ? ["Stryker was here"] : (stryCov_9fa48("25583"), []),
          actions: stryMutAct_9fa48("25584") ? [] : (stryCov_9fa48("25584"), [stryMutAct_9fa48("25585") ? {} : (stryCov_9fa48("25585"), {
            kind: shouldAnswerPathRequest(event.nextHop, event.requestorTransportId) ? stryMutAct_9fa48("25586") ? "" : (stryCov_9fa48("25586"), "answer") : stryMutAct_9fa48("25587") ? "" : (stryCov_9fa48("25587"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25588") ? {} : (stryCov_9fa48("25588"), {
      state,
      intents: stryMutAct_9fa48("25589") ? ["Stryker was here"] : (stryCov_9fa48("25589"), []),
      actions: stryMutAct_9fa48("25590") ? ["Stryker was here"] : (stryCov_9fa48("25590"), [])
    });
  }
}
export function shouldAnswerPathRequestNow(actions: ReadonlyArray<AnswerPathRequestAction>): boolean {
  if (stryMutAct_9fa48("25591")) {
    {}
  } else {
    stryCov_9fa48("25591");
    return stryMutAct_9fa48("25592") ? actions.every(action => action.kind === "answer") : (stryCov_9fa48("25592"), actions.some(stryMutAct_9fa48("25593") ? () => undefined : (stryCov_9fa48("25593"), action => stryMutAct_9fa48("25596") ? action.kind !== "answer" : stryMutAct_9fa48("25595") ? false : stryMutAct_9fa48("25594") ? true : (stryCov_9fa48("25594", "25595", "25596"), action.kind === (stryMutAct_9fa48("25597") ? "" : (stryCov_9fa48("25597"), "answer"))))));
  }
}
export function shouldSkipAnswerPathRequest(actions: ReadonlyArray<AnswerPathRequestAction>): boolean {
  if (stryMutAct_9fa48("25598")) {
    {}
  } else {
    stryCov_9fa48("25598");
    return stryMutAct_9fa48("25599") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25599"), actions.some(stryMutAct_9fa48("25600") ? () => undefined : (stryCov_9fa48("25600"), action => stryMutAct_9fa48("25603") ? action.kind !== "skip" : stryMutAct_9fa48("25602") ? false : stryMutAct_9fa48("25601") ? true : (stryCov_9fa48("25601", "25602", "25603"), action.kind === (stryMutAct_9fa48("25604") ? "" : (stryCov_9fa48("25604"), "skip"))))));
  }
}

/**
 * Decide whether an announce should replace/update the path table entry.
 * Mirrors TransportNode announce path-table update predicates.
 */
export function shouldAddPathEntry(input: PathAddDecisionInput): boolean {
  if (stryMutAct_9fa48("25605")) {
    {}
  } else {
    stryCov_9fa48("25605");
    const {
      hops,
      randomBlob,
      nowSeconds,
      existing
    } = input;
    if (stryMutAct_9fa48("25608") ? existing !== null : stryMutAct_9fa48("25607") ? false : stryMutAct_9fa48("25606") ? true : (stryCov_9fa48("25606", "25607", "25608"), existing === null)) {
      if (stryMutAct_9fa48("25609")) {
        {}
      } else {
        stryCov_9fa48("25609");
        return stryMutAct_9fa48("25613") ? hops >= PATHFINDER_MAX_HOPS + 1 : stryMutAct_9fa48("25612") ? hops <= PATHFINDER_MAX_HOPS + 1 : stryMutAct_9fa48("25611") ? false : stryMutAct_9fa48("25610") ? true : (stryCov_9fa48("25610", "25611", "25612", "25613"), hops < (stryMutAct_9fa48("25614") ? PATHFINDER_MAX_HOPS - 1 : (stryCov_9fa48("25614"), PATHFINDER_MAX_HOPS + 1)));
      }
    }
    if (stryMutAct_9fa48("25618") ? hops > existing.hops : stryMutAct_9fa48("25617") ? hops < existing.hops : stryMutAct_9fa48("25616") ? false : stryMutAct_9fa48("25615") ? true : (stryCov_9fa48("25615", "25616", "25617", "25618"), hops <= existing.hops)) {
      if (stryMutAct_9fa48("25619")) {
        {}
      } else {
        stryCov_9fa48("25619");
        const pathTimebase = timebaseFromRandomBlobs(existing.randomBlobs);
        const announceEmitted = announceEmittedFromRandomBlob(randomBlob);
        const seen = stryMutAct_9fa48("25620") ? existing.randomBlobs.every(blob => equalByteArrays(blob, randomBlob)) : (stryCov_9fa48("25620"), existing.randomBlobs.some(stryMutAct_9fa48("25621") ? () => undefined : (stryCov_9fa48("25621"), blob => equalByteArrays(blob, randomBlob))));
        return stryMutAct_9fa48("25624") ? !seen || announceEmitted > pathTimebase : stryMutAct_9fa48("25623") ? false : stryMutAct_9fa48("25622") ? true : (stryCov_9fa48("25622", "25623", "25624"), (stryMutAct_9fa48("25625") ? seen : (stryCov_9fa48("25625"), !seen)) && (stryMutAct_9fa48("25628") ? announceEmitted <= pathTimebase : stryMutAct_9fa48("25627") ? announceEmitted >= pathTimebase : stryMutAct_9fa48("25626") ? true : (stryCov_9fa48("25626", "25627", "25628"), announceEmitted > pathTimebase)));
      }
    }
    if (stryMutAct_9fa48("25630") ? false : stryMutAct_9fa48("25629") ? true : (stryCov_9fa48("25629", "25630"), isPathEntryExpired(stryMutAct_9fa48("25631") ? {} : (stryCov_9fa48("25631"), {
      expires: existing.expires,
      nowSeconds
    })))) {
      if (stryMutAct_9fa48("25632")) {
        {}
      } else {
        stryCov_9fa48("25632");
        return stryMutAct_9fa48("25633") ? existing.randomBlobs.some(blob => equalByteArrays(blob, randomBlob)) : (stryCov_9fa48("25633"), !(stryMutAct_9fa48("25634") ? existing.randomBlobs.every(blob => equalByteArrays(blob, randomBlob)) : (stryCov_9fa48("25634"), existing.randomBlobs.some(stryMutAct_9fa48("25635") ? () => undefined : (stryCov_9fa48("25635"), blob => equalByteArrays(blob, randomBlob))))));
      }
    }
    return stryMutAct_9fa48("25636") ? true : (stryCov_9fa48("25636"), false);
  }
}

/**
 * shouldAddPathEntry gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `shouldAddPathEntry` reads
 * beside the step).
 */
export type AddPathEntryState = Record<string, never>;
export type AddPathEntryEvent = Event | {
  readonly kind: "path/add-entry-gate";
  readonly hops: number;
  readonly randomBlob: Uint8Array;
  readonly nowSeconds: number;
  readonly existing: PathTableEntryView | null;
};
export type AddPathEntryAction = {
  readonly kind: "add";
} | {
  readonly kind: "skip";
};
export interface AddPathEntryStepResult {
  readonly state: AddPathEntryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AddPathEntryAction[];
}
export function initialAddPathEntryState(): AddPathEntryState {
  if (stryMutAct_9fa48("25637")) {
    {}
  } else {
    stryCov_9fa48("25637");
    return {};
  }
}
export function stepAddPathEntryWithActions(state: AddPathEntryState, event: AddPathEntryEvent): AddPathEntryStepResult {
  if (stryMutAct_9fa48("25638")) {
    {}
  } else {
    stryCov_9fa48("25638");
    if (stryMutAct_9fa48("25641") ? event.kind !== "path/add-entry-gate" : stryMutAct_9fa48("25640") ? false : stryMutAct_9fa48("25639") ? true : (stryCov_9fa48("25639", "25640", "25641"), event.kind === (stryMutAct_9fa48("25642") ? "" : (stryCov_9fa48("25642"), "path/add-entry-gate")))) {
      if (stryMutAct_9fa48("25643")) {
        {}
      } else {
        stryCov_9fa48("25643");
        return stryMutAct_9fa48("25644") ? {} : (stryCov_9fa48("25644"), {
          state,
          intents: stryMutAct_9fa48("25645") ? ["Stryker was here"] : (stryCov_9fa48("25645"), []),
          actions: stryMutAct_9fa48("25646") ? [] : (stryCov_9fa48("25646"), [stryMutAct_9fa48("25647") ? {} : (stryCov_9fa48("25647"), {
            kind: shouldAddPathEntry(stryMutAct_9fa48("25648") ? {} : (stryCov_9fa48("25648"), {
              hops: event.hops,
              randomBlob: event.randomBlob,
              nowSeconds: event.nowSeconds,
              existing: event.existing
            })) ? stryMutAct_9fa48("25649") ? "" : (stryCov_9fa48("25649"), "add") : stryMutAct_9fa48("25650") ? "" : (stryCov_9fa48("25650"), "skip")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25651") ? {} : (stryCov_9fa48("25651"), {
      state,
      intents: stryMutAct_9fa48("25652") ? ["Stryker was here"] : (stryCov_9fa48("25652"), []),
      actions: stryMutAct_9fa48("25653") ? ["Stryker was here"] : (stryCov_9fa48("25653"), [])
    });
  }
}
export function shouldAddPathEntryNow(actions: ReadonlyArray<AddPathEntryAction>): boolean {
  if (stryMutAct_9fa48("25654")) {
    {}
  } else {
    stryCov_9fa48("25654");
    return stryMutAct_9fa48("25655") ? actions.every(action => action.kind === "add") : (stryCov_9fa48("25655"), actions.some(stryMutAct_9fa48("25656") ? () => undefined : (stryCov_9fa48("25656"), action => stryMutAct_9fa48("25659") ? action.kind !== "add" : stryMutAct_9fa48("25658") ? false : stryMutAct_9fa48("25657") ? true : (stryCov_9fa48("25657", "25658", "25659"), action.kind === (stryMutAct_9fa48("25660") ? "" : (stryCov_9fa48("25660"), "add"))))));
  }
}
export function shouldSkipAddPathEntry(actions: ReadonlyArray<AddPathEntryAction>): boolean {
  if (stryMutAct_9fa48("25661")) {
    {}
  } else {
    stryCov_9fa48("25661");
    return stryMutAct_9fa48("25662") ? actions.every(action => action.kind === "skip") : (stryCov_9fa48("25662"), actions.some(stryMutAct_9fa48("25663") ? () => undefined : (stryCov_9fa48("25663"), action => stryMutAct_9fa48("25666") ? action.kind !== "skip" : stryMutAct_9fa48("25665") ? false : stryMutAct_9fa48("25664") ? true : (stryCov_9fa48("25664", "25665", "25666"), action.kind === (stryMutAct_9fa48("25667") ? "" : (stryCov_9fa48("25667"), "skip"))))));
  }
}
export function computePathExpiry(nowSeconds: number): number {
  if (stryMutAct_9fa48("25668")) {
    {}
  } else {
    stryCov_9fa48("25668");
    return stryMutAct_9fa48("25669") ? nowSeconds - PATHFINDER_EXPIRY_SECONDS : (stryCov_9fa48("25669"), nowSeconds + PATHFINDER_EXPIRY_SECONDS);
  }
}

/**
 * Path expiry computation is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `computePathExpiry`
 * reads beside the step).
 */
export type ComputePathExpiryState = Record<string, never>;
export type ComputePathExpiryEvent = Event | {
  readonly kind: "path/expiry-gate";
  readonly nowSeconds: number;
};
export type ComputePathExpiryAction = {
  readonly kind: "use-expiry";
  readonly expires: number;
};
export interface ComputePathExpiryStepResult {
  readonly state: ComputePathExpiryState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ComputePathExpiryAction[];
}
export function initialComputePathExpiryState(): ComputePathExpiryState {
  if (stryMutAct_9fa48("25670")) {
    {}
  } else {
    stryCov_9fa48("25670");
    return {};
  }
}
export function stepComputePathExpiryWithActions(state: ComputePathExpiryState, event: ComputePathExpiryEvent): ComputePathExpiryStepResult {
  if (stryMutAct_9fa48("25671")) {
    {}
  } else {
    stryCov_9fa48("25671");
    if (stryMutAct_9fa48("25674") ? event.kind !== "path/expiry-gate" : stryMutAct_9fa48("25673") ? false : stryMutAct_9fa48("25672") ? true : (stryCov_9fa48("25672", "25673", "25674"), event.kind === (stryMutAct_9fa48("25675") ? "" : (stryCov_9fa48("25675"), "path/expiry-gate")))) {
      if (stryMutAct_9fa48("25676")) {
        {}
      } else {
        stryCov_9fa48("25676");
        return stryMutAct_9fa48("25677") ? {} : (stryCov_9fa48("25677"), {
          state,
          intents: stryMutAct_9fa48("25678") ? ["Stryker was here"] : (stryCov_9fa48("25678"), []),
          actions: stryMutAct_9fa48("25679") ? [] : (stryCov_9fa48("25679"), [stryMutAct_9fa48("25680") ? {} : (stryCov_9fa48("25680"), {
            kind: stryMutAct_9fa48("25681") ? "" : (stryCov_9fa48("25681"), "use-expiry"),
            expires: computePathExpiry(event.nowSeconds)
          })])
        });
      }
    }
    return stryMutAct_9fa48("25682") ? {} : (stryCov_9fa48("25682"), {
      state,
      intents: stryMutAct_9fa48("25683") ? ["Stryker was here"] : (stryCov_9fa48("25683"), []),
      actions: stryMutAct_9fa48("25684") ? ["Stryker was here"] : (stryCov_9fa48("25684"), [])
    });
  }
}
export function shouldUsePathExpiry(actions: ReadonlyArray<ComputePathExpiryAction>): boolean {
  if (stryMutAct_9fa48("25685")) {
    {}
  } else {
    stryCov_9fa48("25685");
    return stryMutAct_9fa48("25686") ? actions.every(action => action.kind === "use-expiry") : (stryCov_9fa48("25686"), actions.some(stryMutAct_9fa48("25687") ? () => undefined : (stryCov_9fa48("25687"), action => stryMutAct_9fa48("25690") ? action.kind !== "use-expiry" : stryMutAct_9fa48("25689") ? false : stryMutAct_9fa48("25688") ? true : (stryCov_9fa48("25688", "25689", "25690"), action.kind === (stryMutAct_9fa48("25691") ? "" : (stryCov_9fa48("25691"), "use-expiry"))))));
  }
}

/** Extract path expiry instant from step actions; null when no `use-expiry`. */
export function pathExpiryFromActions(actions: ReadonlyArray<ComputePathExpiryAction>): number | null {
  if (stryMutAct_9fa48("25692")) {
    {}
  } else {
    stryCov_9fa48("25692");
    const action = actions.find(stryMutAct_9fa48("25693") ? () => undefined : (stryCov_9fa48("25693"), entry => stryMutAct_9fa48("25696") ? entry.kind !== "use-expiry" : stryMutAct_9fa48("25695") ? false : stryMutAct_9fa48("25694") ? true : (stryCov_9fa48("25694", "25695", "25696"), entry.kind === (stryMutAct_9fa48("25697") ? "" : (stryCov_9fa48("25697"), "use-expiry")))));
    return (stryMutAct_9fa48("25700") ? action?.kind !== "use-expiry" : stryMutAct_9fa48("25699") ? false : stryMutAct_9fa48("25698") ? true : (stryCov_9fa48("25698", "25699", "25700"), (stryMutAct_9fa48("25701") ? action.kind : (stryCov_9fa48("25701"), action?.kind)) === (stryMutAct_9fa48("25702") ? "" : (stryCov_9fa48("25702"), "use-expiry")))) ? action.expires : null;
  }
}

/** True when a path-table entry is past its expiry instant. */
export function isPathEntryExpired(input: {
  readonly expires: number;
  readonly nowSeconds: number;
}): boolean {
  if (stryMutAct_9fa48("25703")) {
    {}
  } else {
    stryCov_9fa48("25703");
    return stryMutAct_9fa48("25707") ? input.nowSeconds < input.expires : stryMutAct_9fa48("25706") ? input.nowSeconds > input.expires : stryMutAct_9fa48("25705") ? false : stryMutAct_9fa48("25704") ? true : (stryCov_9fa48("25704", "25705", "25706", "25707"), input.nowSeconds >= input.expires);
  }
}

/**
 * isPathEntryExpired gate is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `isPathEntryExpired`
 * reads beside the step).
 */
export type PathEntryExpiredState = Record<string, never>;
export type PathEntryExpiredEvent = Event | {
  readonly kind: "path/entry-expired-gate";
  readonly expires: number;
  readonly nowSeconds: number;
};
export type PathEntryExpiredAction = {
  readonly kind: "expired";
} | {
  readonly kind: "live";
};
export interface PathEntryExpiredStepResult {
  readonly state: PathEntryExpiredState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryExpiredAction[];
}
export function initialPathEntryExpiredState(): PathEntryExpiredState {
  if (stryMutAct_9fa48("25708")) {
    {}
  } else {
    stryCov_9fa48("25708");
    return {};
  }
}
export function stepPathEntryExpiredWithActions(state: PathEntryExpiredState, event: PathEntryExpiredEvent): PathEntryExpiredStepResult {
  if (stryMutAct_9fa48("25709")) {
    {}
  } else {
    stryCov_9fa48("25709");
    if (stryMutAct_9fa48("25712") ? event.kind !== "path/entry-expired-gate" : stryMutAct_9fa48("25711") ? false : stryMutAct_9fa48("25710") ? true : (stryCov_9fa48("25710", "25711", "25712"), event.kind === (stryMutAct_9fa48("25713") ? "" : (stryCov_9fa48("25713"), "path/entry-expired-gate")))) {
      if (stryMutAct_9fa48("25714")) {
        {}
      } else {
        stryCov_9fa48("25714");
        return stryMutAct_9fa48("25715") ? {} : (stryCov_9fa48("25715"), {
          state,
          intents: stryMutAct_9fa48("25716") ? ["Stryker was here"] : (stryCov_9fa48("25716"), []),
          actions: stryMutAct_9fa48("25717") ? [] : (stryCov_9fa48("25717"), [stryMutAct_9fa48("25718") ? {} : (stryCov_9fa48("25718"), {
            kind: isPathEntryExpired(stryMutAct_9fa48("25719") ? {} : (stryCov_9fa48("25719"), {
              expires: event.expires,
              nowSeconds: event.nowSeconds
            })) ? stryMutAct_9fa48("25720") ? "" : (stryCov_9fa48("25720"), "expired") : stryMutAct_9fa48("25721") ? "" : (stryCov_9fa48("25721"), "live")
          })])
        });
      }
    }
    return stryMutAct_9fa48("25722") ? {} : (stryCov_9fa48("25722"), {
      state,
      intents: stryMutAct_9fa48("25723") ? ["Stryker was here"] : (stryCov_9fa48("25723"), []),
      actions: stryMutAct_9fa48("25724") ? ["Stryker was here"] : (stryCov_9fa48("25724"), [])
    });
  }
}
export function shouldTreatPathEntryExpired(actions: ReadonlyArray<PathEntryExpiredAction>): boolean {
  if (stryMutAct_9fa48("25725")) {
    {}
  } else {
    stryCov_9fa48("25725");
    return stryMutAct_9fa48("25726") ? actions.every(action => action.kind === "expired") : (stryCov_9fa48("25726"), actions.some(stryMutAct_9fa48("25727") ? () => undefined : (stryCov_9fa48("25727"), action => stryMutAct_9fa48("25730") ? action.kind !== "expired" : stryMutAct_9fa48("25729") ? false : stryMutAct_9fa48("25728") ? true : (stryCov_9fa48("25728", "25729", "25730"), action.kind === (stryMutAct_9fa48("25731") ? "" : (stryCov_9fa48("25731"), "expired"))))));
  }
}
export function shouldTreatPathEntryLive(actions: ReadonlyArray<PathEntryExpiredAction>): boolean {
  if (stryMutAct_9fa48("25732")) {
    {}
  } else {
    stryCov_9fa48("25732");
    return stryMutAct_9fa48("25733") ? actions.every(action => action.kind === "live") : (stryCov_9fa48("25733"), actions.some(stryMutAct_9fa48("25734") ? () => undefined : (stryCov_9fa48("25734"), action => stryMutAct_9fa48("25737") ? action.kind !== "live" : stryMutAct_9fa48("25736") ? false : stryMutAct_9fa48("25735") ? true : (stryCov_9fa48("25735", "25736", "25737"), action.kind === (stryMutAct_9fa48("25738") ? "" : (stryCov_9fa48("25738"), "live"))))));
  }
}
export type PathEntryLookupPlan = "miss" | "expired" | "hit";

/**
 * Path-table get: miss, expired (adapter deletes), or hit.
 * Map delete stays at the adapter.
 */
export function planPathEntryLookup(input: {
  readonly entryPresent: boolean;
  readonly expired: boolean;
}): PathEntryLookupPlan {
  if (stryMutAct_9fa48("25739")) {
    {}
  } else {
    stryCov_9fa48("25739");
    if (stryMutAct_9fa48("25742") ? false : stryMutAct_9fa48("25741") ? true : stryMutAct_9fa48("25740") ? input.entryPresent : (stryCov_9fa48("25740", "25741", "25742"), !input.entryPresent)) {
      if (stryMutAct_9fa48("25743")) {
        {}
      } else {
        stryCov_9fa48("25743");
        return stryMutAct_9fa48("25744") ? "" : (stryCov_9fa48("25744"), "miss");
      }
    }
    if (stryMutAct_9fa48("25746") ? false : stryMutAct_9fa48("25745") ? true : (stryCov_9fa48("25745", "25746"), input.expired)) {
      if (stryMutAct_9fa48("25747")) {
        {}
      } else {
        stryCov_9fa48("25747");
        return stryMutAct_9fa48("25748") ? "" : (stryCov_9fa48("25748"), "expired");
      }
    }
    return stryMutAct_9fa48("25749") ? "" : (stryCov_9fa48("25749"), "hit");
  }
}
export type PathEntryLookupPlanEvent = Event | {
  readonly kind: "path/entry-lookup-plan-gate";
  readonly entryPresent: boolean;
  readonly expired: boolean;
};
export type PathEntryLookupPlanAction = {
  readonly kind: PathEntryLookupPlan;
};

/** Extract the path-entry lookup plan from actions; null when empty. */
export function pathEntryLookupPlanFromActions(actions: ReadonlyArray<PathEntryLookupPlanAction>): PathEntryLookupPlan | null {
  if (stryMutAct_9fa48("25750")) {
    {}
  } else {
    stryCov_9fa48("25750");
    const action = actions.find(stryMutAct_9fa48("25751") ? () => undefined : (stryCov_9fa48("25751"), entry => stryMutAct_9fa48("25754") ? (entry.kind === "miss" || entry.kind === "expired") && entry.kind === "hit" : stryMutAct_9fa48("25753") ? false : stryMutAct_9fa48("25752") ? true : (stryCov_9fa48("25752", "25753", "25754"), (stryMutAct_9fa48("25756") ? entry.kind === "miss" && entry.kind === "expired" : stryMutAct_9fa48("25755") ? false : (stryCov_9fa48("25755", "25756"), (stryMutAct_9fa48("25758") ? entry.kind !== "miss" : stryMutAct_9fa48("25757") ? false : (stryCov_9fa48("25757", "25758"), entry.kind === (stryMutAct_9fa48("25759") ? "" : (stryCov_9fa48("25759"), "miss")))) || (stryMutAct_9fa48("25761") ? entry.kind !== "expired" : stryMutAct_9fa48("25760") ? false : (stryCov_9fa48("25760", "25761"), entry.kind === (stryMutAct_9fa48("25762") ? "" : (stryCov_9fa48("25762"), "expired")))))) || (stryMutAct_9fa48("25764") ? entry.kind !== "hit" : stryMutAct_9fa48("25763") ? false : (stryCov_9fa48("25763", "25764"), entry.kind === (stryMutAct_9fa48("25765") ? "" : (stryCov_9fa48("25765"), "hit")))))));
    return stryMutAct_9fa48("25766") ? action?.kind && null : (stryCov_9fa48("25766"), (stryMutAct_9fa48("25767") ? action.kind : (stryCov_9fa48("25767"), action?.kind)) ?? null);
  }
}
export type PathEntryLookupEvent = Event | {
  readonly kind: "path/entry-lookup-gate";
  readonly entryPresent: boolean;
  readonly expired: boolean;
};
export type PathEntryLookupAction = {
  readonly kind: PathEntryLookupPlan;
};