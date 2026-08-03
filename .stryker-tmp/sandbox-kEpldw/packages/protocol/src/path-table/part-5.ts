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
import { computePathExpiry, equalByteArrays, pathEntryLookupPlanFromActions, planPathEntryLookup, shouldAddPathEntry } from "./part-4.js";
import type { PathEntryLookupAction, PathEntryLookupEvent, PathEntryLookupPlan, PathEntryLookupPlanAction, PathEntryLookupPlanEvent, PathTableEntryView } from "./part-4.js";
/**
 * Path-entry lookup plan leaf is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `planPathEntryLookup` /
 * `plan ===` reads beside the step). Nested under
 * {@link stepPathEntryLookupWithActions}.
 */
export type PathEntryLookupPlanState = Record<string, never>;
export interface PathEntryLookupPlanStepResult {
  readonly state: PathEntryLookupPlanState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryLookupPlanAction[];
}
export function initialPathEntryLookupPlanState(): PathEntryLookupPlanState {
  if (stryMutAct_9fa48("25768")) {
    {}
  } else {
    stryCov_9fa48("25768");
    return {};
  }
}
export function stepPathEntryLookupPlanWithActions(state: PathEntryLookupPlanState, event: PathEntryLookupPlanEvent): PathEntryLookupPlanStepResult {
  if (stryMutAct_9fa48("25769")) {
    {}
  } else {
    stryCov_9fa48("25769");
    if (stryMutAct_9fa48("25772") ? event.kind !== "path/entry-lookup-plan-gate" : stryMutAct_9fa48("25771") ? false : stryMutAct_9fa48("25770") ? true : (stryCov_9fa48("25770", "25771", "25772"), event.kind === (stryMutAct_9fa48("25773") ? "" : (stryCov_9fa48("25773"), "path/entry-lookup-plan-gate")))) {
      if (stryMutAct_9fa48("25774")) {
        {}
      } else {
        stryCov_9fa48("25774");
        return stryMutAct_9fa48("25775") ? {} : (stryCov_9fa48("25775"), {
          state,
          intents: stryMutAct_9fa48("25776") ? ["Stryker was here"] : (stryCov_9fa48("25776"), []),
          actions: stryMutAct_9fa48("25777") ? [] : (stryCov_9fa48("25777"), [stryMutAct_9fa48("25778") ? {} : (stryCov_9fa48("25778"), {
            kind: planPathEntryLookup(stryMutAct_9fa48("25779") ? {} : (stryCov_9fa48("25779"), {
              entryPresent: event.entryPresent,
              expired: event.expired
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("25780") ? {} : (stryCov_9fa48("25780"), {
      state,
      intents: stryMutAct_9fa48("25781") ? ["Stryker was here"] : (stryCov_9fa48("25781"), []),
      actions: stryMutAct_9fa48("25782") ? ["Stryker was here"] : (stryCov_9fa48("25782"), [])
    });
  }
}
export function shouldMissPathEntryLookupPlan(actions: ReadonlyArray<PathEntryLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("25783")) {
    {}
  } else {
    stryCov_9fa48("25783");
    return stryMutAct_9fa48("25784") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("25784"), actions.some(stryMutAct_9fa48("25785") ? () => undefined : (stryCov_9fa48("25785"), action => stryMutAct_9fa48("25788") ? action.kind !== "miss" : stryMutAct_9fa48("25787") ? false : stryMutAct_9fa48("25786") ? true : (stryCov_9fa48("25786", "25787", "25788"), action.kind === (stryMutAct_9fa48("25789") ? "" : (stryCov_9fa48("25789"), "miss"))))));
  }
}
export function shouldExpirePathEntryLookupPlan(actions: ReadonlyArray<PathEntryLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("25790")) {
    {}
  } else {
    stryCov_9fa48("25790");
    return stryMutAct_9fa48("25791") ? actions.every(action => action.kind === "expired") : (stryCov_9fa48("25791"), actions.some(stryMutAct_9fa48("25792") ? () => undefined : (stryCov_9fa48("25792"), action => stryMutAct_9fa48("25795") ? action.kind !== "expired" : stryMutAct_9fa48("25794") ? false : stryMutAct_9fa48("25793") ? true : (stryCov_9fa48("25793", "25794", "25795"), action.kind === (stryMutAct_9fa48("25796") ? "" : (stryCov_9fa48("25796"), "expired"))))));
  }
}
export function shouldHitPathEntryLookupPlan(actions: ReadonlyArray<PathEntryLookupPlanAction>): boolean {
  if (stryMutAct_9fa48("25797")) {
    {}
  } else {
    stryCov_9fa48("25797");
    return stryMutAct_9fa48("25798") ? actions.every(action => action.kind === "hit") : (stryCov_9fa48("25798"), actions.some(stryMutAct_9fa48("25799") ? () => undefined : (stryCov_9fa48("25799"), action => stryMutAct_9fa48("25802") ? action.kind !== "hit" : stryMutAct_9fa48("25801") ? false : stryMutAct_9fa48("25800") ? true : (stryCov_9fa48("25800", "25801", "25802"), action.kind === (stryMutAct_9fa48("25803") ? "" : (stryCov_9fa48("25803"), "hit"))))));
  }
}

/**
 * Path-entry lookup is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc plan reads beside the step).
 * Plan nested via {@link stepPathEntryLookupPlanWithActions}
 * (`miss`|`expired`|`hit`).
 */
export type PathEntryLookupState = Record<string, never>;
export interface PathEntryLookupStepResult {
  readonly state: PathEntryLookupState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathEntryLookupAction[];
}
export function initialPathEntryLookupState(): PathEntryLookupState {
  if (stryMutAct_9fa48("25804")) {
    {}
  } else {
    stryCov_9fa48("25804");
    return {};
  }
}
export const stepPathEntryLookup: StepFn<PathEntryLookupState> = (state, event) => {
  if (stryMutAct_9fa48("25805")) {
    {}
  } else {
    stryCov_9fa48("25805");
    const result = stepPathEntryLookupInner(state, event as PathEntryLookupEvent);
    return stryMutAct_9fa48("25806") ? {} : (stryCov_9fa48("25806"), {
      state: result.state,
      intents: result.intents
    });
  }
};
export function stepPathEntryLookupWithActions(state: PathEntryLookupState, event: PathEntryLookupEvent): PathEntryLookupStepResult {
  if (stryMutAct_9fa48("25807")) {
    {}
  } else {
    stryCov_9fa48("25807");
    return stepPathEntryLookupInner(state, event);
  }
}
export function pathEntryLookupFromActions(actions: ReadonlyArray<PathEntryLookupAction>): PathEntryLookupPlan | null {
  if (stryMutAct_9fa48("25808")) {
    {}
  } else {
    stryCov_9fa48("25808");
    const action = actions[0];
    return stryMutAct_9fa48("25809") ? action?.kind && null : (stryCov_9fa48("25809"), (stryMutAct_9fa48("25810") ? action.kind : (stryCov_9fa48("25810"), action?.kind)) ?? null);
  }
}
export function shouldMissPathEntryLookup(actions: ReadonlyArray<PathEntryLookupAction>): boolean {
  if (stryMutAct_9fa48("25811")) {
    {}
  } else {
    stryCov_9fa48("25811");
    return stryMutAct_9fa48("25812") ? actions.every(action => action.kind === "miss") : (stryCov_9fa48("25812"), actions.some(stryMutAct_9fa48("25813") ? () => undefined : (stryCov_9fa48("25813"), action => stryMutAct_9fa48("25816") ? action.kind !== "miss" : stryMutAct_9fa48("25815") ? false : stryMutAct_9fa48("25814") ? true : (stryCov_9fa48("25814", "25815", "25816"), action.kind === (stryMutAct_9fa48("25817") ? "" : (stryCov_9fa48("25817"), "miss"))))));
  }
}
export function shouldExpirePathEntryLookup(actions: ReadonlyArray<PathEntryLookupAction>): boolean {
  if (stryMutAct_9fa48("25818")) {
    {}
  } else {
    stryCov_9fa48("25818");
    return stryMutAct_9fa48("25819") ? actions.every(action => action.kind === "expired") : (stryCov_9fa48("25819"), actions.some(stryMutAct_9fa48("25820") ? () => undefined : (stryCov_9fa48("25820"), action => stryMutAct_9fa48("25823") ? action.kind !== "expired" : stryMutAct_9fa48("25822") ? false : stryMutAct_9fa48("25821") ? true : (stryCov_9fa48("25821", "25822", "25823"), action.kind === (stryMutAct_9fa48("25824") ? "" : (stryCov_9fa48("25824"), "expired"))))));
  }
}
export function shouldHitPathEntryLookup(actions: ReadonlyArray<PathEntryLookupAction>): boolean {
  if (stryMutAct_9fa48("25825")) {
    {}
  } else {
    stryCov_9fa48("25825");
    return stryMutAct_9fa48("25826") ? actions.every(action => action.kind === "hit") : (stryCov_9fa48("25826"), actions.some(stryMutAct_9fa48("25827") ? () => undefined : (stryCov_9fa48("25827"), action => stryMutAct_9fa48("25830") ? action.kind !== "hit" : stryMutAct_9fa48("25829") ? false : stryMutAct_9fa48("25828") ? true : (stryCov_9fa48("25828", "25829", "25830"), action.kind === (stryMutAct_9fa48("25831") ? "" : (stryCov_9fa48("25831"), "hit"))))));
  }
}
function stepPathEntryLookupInner(state: PathEntryLookupState, event: PathEntryLookupEvent): PathEntryLookupStepResult {
  if (stryMutAct_9fa48("25832")) {
    {}
  } else {
    stryCov_9fa48("25832");
    if (stryMutAct_9fa48("25835") ? event.kind !== "path/entry-lookup-gate" : stryMutAct_9fa48("25834") ? false : stryMutAct_9fa48("25833") ? true : (stryCov_9fa48("25833", "25834", "25835"), event.kind === (stryMutAct_9fa48("25836") ? "" : (stryCov_9fa48("25836"), "path/entry-lookup-gate")))) {
      if (stryMutAct_9fa48("25837")) {
        {}
      } else {
        stryCov_9fa48("25837");
        const planActions = stepPathEntryLookupPlanWithActions(initialPathEntryLookupPlanState(), stryMutAct_9fa48("25838") ? {} : (stryCov_9fa48("25838"), {
          kind: stryMutAct_9fa48("25839") ? "" : (stryCov_9fa48("25839"), "path/entry-lookup-plan-gate"),
          entryPresent: event.entryPresent,
          expired: event.expired
        })).actions;
        const plan = pathEntryLookupPlanFromActions(planActions);
        if (stryMutAct_9fa48("25842") ? plan !== null : stryMutAct_9fa48("25841") ? false : stryMutAct_9fa48("25840") ? true : (stryCov_9fa48("25840", "25841", "25842"), plan === null)) {
          if (stryMutAct_9fa48("25843")) {
            {}
          } else {
            stryCov_9fa48("25843");
            return stryMutAct_9fa48("25844") ? {} : (stryCov_9fa48("25844"), {
              state,
              intents: stryMutAct_9fa48("25845") ? ["Stryker was here"] : (stryCov_9fa48("25845"), []),
              actions: stryMutAct_9fa48("25846") ? ["Stryker was here"] : (stryCov_9fa48("25846"), [])
            });
          }
        }
        return stryMutAct_9fa48("25847") ? {} : (stryCov_9fa48("25847"), {
          state,
          intents: stryMutAct_9fa48("25848") ? ["Stryker was here"] : (stryCov_9fa48("25848"), []),
          actions: stryMutAct_9fa48("25849") ? [] : (stryCov_9fa48("25849"), [stryMutAct_9fa48("25850") ? {} : (stryCov_9fa48("25850"), {
            kind: plan
          })])
        });
      }
    }
    return stryMutAct_9fa48("25851") ? {} : (stryCov_9fa48("25851"), {
      state,
      intents: stryMutAct_9fa48("25852") ? ["Stryker was here"] : (stryCov_9fa48("25852"), []),
      actions: stryMutAct_9fa48("25853") ? ["Stryker was here"] : (stryCov_9fa48("25853"), [])
    });
  }
}

/**
 * Dedupe-append a path announce random blob onto the entry's blob list.
 */
export function appendPathRandomBlob(input: {
  readonly randomBlobs: ReadonlyArray<Uint8Array>;
  readonly randomBlob: Uint8Array;
}): readonly Uint8Array[] {
  if (stryMutAct_9fa48("25854")) {
    {}
  } else {
    stryCov_9fa48("25854");
    if (stryMutAct_9fa48("25857") ? input.randomBlobs.every(blob => equalByteArrays(blob, input.randomBlob)) : stryMutAct_9fa48("25856") ? false : stryMutAct_9fa48("25855") ? true : (stryCov_9fa48("25855", "25856", "25857"), input.randomBlobs.some(stryMutAct_9fa48("25858") ? () => undefined : (stryCov_9fa48("25858"), blob => equalByteArrays(blob, input.randomBlob))))) {
      if (stryMutAct_9fa48("25859")) {
        {}
      } else {
        stryCov_9fa48("25859");
        return input.randomBlobs;
      }
    }
    return stryMutAct_9fa48("25860") ? [] : (stryCov_9fa48("25860"), [...input.randomBlobs, input.randomBlob]);
  }
}

/**
 * Path random-blob append is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `appendPathRandomBlob`
 * reads beside the step).
 */
export type AppendPathRandomBlobState = Record<string, never>;
export type AppendPathRandomBlobEvent = Event | {
  readonly kind: "path/append-random-blob-gate";
  readonly randomBlobs: ReadonlyArray<Uint8Array>;
  readonly randomBlob: Uint8Array;
};
export type AppendPathRandomBlobAction = {
  readonly kind: "use-fields";
  readonly randomBlobs: readonly Uint8Array[];
};
export interface AppendPathRandomBlobStepResult {
  readonly state: AppendPathRandomBlobState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AppendPathRandomBlobAction[];
}
export function initialAppendPathRandomBlobState(): AppendPathRandomBlobState {
  if (stryMutAct_9fa48("25861")) {
    {}
  } else {
    stryCov_9fa48("25861");
    return {};
  }
}
export function stepAppendPathRandomBlobWithActions(state: AppendPathRandomBlobState, event: AppendPathRandomBlobEvent): AppendPathRandomBlobStepResult {
  if (stryMutAct_9fa48("25862")) {
    {}
  } else {
    stryCov_9fa48("25862");
    if (stryMutAct_9fa48("25865") ? event.kind !== "path/append-random-blob-gate" : stryMutAct_9fa48("25864") ? false : stryMutAct_9fa48("25863") ? true : (stryCov_9fa48("25863", "25864", "25865"), event.kind === (stryMutAct_9fa48("25866") ? "" : (stryCov_9fa48("25866"), "path/append-random-blob-gate")))) {
      if (stryMutAct_9fa48("25867")) {
        {}
      } else {
        stryCov_9fa48("25867");
        return stryMutAct_9fa48("25868") ? {} : (stryCov_9fa48("25868"), {
          state,
          intents: stryMutAct_9fa48("25869") ? ["Stryker was here"] : (stryCov_9fa48("25869"), []),
          actions: stryMutAct_9fa48("25870") ? [] : (stryCov_9fa48("25870"), [stryMutAct_9fa48("25871") ? {} : (stryCov_9fa48("25871"), {
            kind: stryMutAct_9fa48("25872") ? "" : (stryCov_9fa48("25872"), "use-fields"),
            randomBlobs: appendPathRandomBlob(stryMutAct_9fa48("25873") ? {} : (stryCov_9fa48("25873"), {
              randomBlobs: event.randomBlobs,
              randomBlob: event.randomBlob
            }))
          })])
        });
      }
    }
    return stryMutAct_9fa48("25874") ? {} : (stryCov_9fa48("25874"), {
      state,
      intents: stryMutAct_9fa48("25875") ? ["Stryker was here"] : (stryCov_9fa48("25875"), []),
      actions: stryMutAct_9fa48("25876") ? ["Stryker was here"] : (stryCov_9fa48("25876"), [])
    });
  }
}
export function shouldUseAppendPathRandomBlob(actions: ReadonlyArray<AppendPathRandomBlobAction>): boolean {
  if (stryMutAct_9fa48("25877")) {
    {}
  } else {
    stryCov_9fa48("25877");
    return stryMutAct_9fa48("25878") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("25878"), actions.some(stryMutAct_9fa48("25879") ? () => undefined : (stryCov_9fa48("25879"), action => stryMutAct_9fa48("25882") ? action.kind !== "use-fields" : stryMutAct_9fa48("25881") ? false : stryMutAct_9fa48("25880") ? true : (stryCov_9fa48("25880", "25881", "25882"), action.kind === (stryMutAct_9fa48("25883") ? "" : (stryCov_9fa48("25883"), "use-fields"))))));
  }
}

/** Extract appended random-blob list from step actions; null when no `use-fields`. */
export function appendPathRandomBlobFieldsFromActions(actions: ReadonlyArray<AppendPathRandomBlobAction>): readonly Uint8Array[] | null {
  if (stryMutAct_9fa48("25884")) {
    {}
  } else {
    stryCov_9fa48("25884");
    const action = actions.find(stryMutAct_9fa48("25885") ? () => undefined : (stryCov_9fa48("25885"), entry => stryMutAct_9fa48("25888") ? entry.kind !== "use-fields" : stryMutAct_9fa48("25887") ? false : stryMutAct_9fa48("25886") ? true : (stryCov_9fa48("25886", "25887", "25888"), entry.kind === (stryMutAct_9fa48("25889") ? "" : (stryCov_9fa48("25889"), "use-fields")))));
    return (stryMutAct_9fa48("25892") ? action?.kind !== "use-fields" : stryMutAct_9fa48("25891") ? false : stryMutAct_9fa48("25890") ? true : (stryCov_9fa48("25890", "25891", "25892"), (stryMutAct_9fa48("25893") ? action.kind : (stryCov_9fa48("25893"), action?.kind)) === (stryMutAct_9fa48("25894") ? "" : (stryCov_9fa48("25894"), "use-fields")))) ? action.randomBlobs : null;
  }
}

/** Lightweight path-table step for sim: tracks hops per destination key. */
export interface PathTableState {
  readonly entries: ReadonlyMap<string, {
    readonly hops: number;
    readonly expires: number;
    readonly blobHex: string;
  }>;
  readonly lastAdded: boolean;
}
export type PathTableEvent = Event | {
  readonly kind: "path/announce";
  readonly destinationKey: string;
  readonly hops: number;
  readonly randomBlob: Uint8Array;
  readonly at: number;
};
export function initialPathTableState(): PathTableState {
  if (stryMutAct_9fa48("25895")) {
    {}
  } else {
    stryCov_9fa48("25895");
    return stryMutAct_9fa48("25896") ? {} : (stryCov_9fa48("25896"), {
      entries: new Map(),
      lastAdded: stryMutAct_9fa48("25897") ? true : (stryCov_9fa48("25897"), false)
    });
  }
}
export const stepPathTable: StepFn<PathTableState> = stryMutAct_9fa48("25898") ? () => undefined : (stryCov_9fa48("25898"), (() => {
  const stepPathTable: StepFn<PathTableState> = (state, event) => stepPathTableInner(state, event as PathTableEvent);
  return stepPathTable;
})());
function stepPathTableInner(state: PathTableState, event: PathTableEvent): {
  state: PathTableState;
  intents: [];
} {
  if (stryMutAct_9fa48("25899")) {
    {}
  } else {
    stryCov_9fa48("25899");
    if (stryMutAct_9fa48("25902") ? event.kind === "path/announce" : stryMutAct_9fa48("25901") ? false : stryMutAct_9fa48("25900") ? true : (stryCov_9fa48("25900", "25901", "25902"), event.kind !== (stryMutAct_9fa48("25903") ? "" : (stryCov_9fa48("25903"), "path/announce")))) {
      if (stryMutAct_9fa48("25904")) {
        {}
      } else {
        stryCov_9fa48("25904");
        return stryMutAct_9fa48("25905") ? {} : (stryCov_9fa48("25905"), {
          state,
          intents: stryMutAct_9fa48("25906") ? ["Stryker was here"] : (stryCov_9fa48("25906"), [])
        });
      }
    }
    const existingEntry = state.entries.get(event.destinationKey);
    const existing: PathTableEntryView | null = (stryMutAct_9fa48("25909") ? existingEntry !== undefined : stryMutAct_9fa48("25908") ? false : stryMutAct_9fa48("25907") ? true : (stryCov_9fa48("25907", "25908", "25909"), existingEntry === undefined)) ? null : stryMutAct_9fa48("25910") ? {} : (stryCov_9fa48("25910"), {
      hops: existingEntry.hops,
      expires: existingEntry.expires,
      randomBlobs: stryMutAct_9fa48("25911") ? [] : (stryCov_9fa48("25911"), [hexToBytes(existingEntry.blobHex)])
    });
    const shouldAdd = shouldAddPathEntry(stryMutAct_9fa48("25912") ? {} : (stryCov_9fa48("25912"), {
      hops: event.hops,
      randomBlob: event.randomBlob,
      nowSeconds: event.at,
      existing
    }));
    if (stryMutAct_9fa48("25915") ? false : stryMutAct_9fa48("25914") ? true : stryMutAct_9fa48("25913") ? shouldAdd : (stryCov_9fa48("25913", "25914", "25915"), !shouldAdd)) {
      if (stryMutAct_9fa48("25916")) {
        {}
      } else {
        stryCov_9fa48("25916");
        return stryMutAct_9fa48("25917") ? {} : (stryCov_9fa48("25917"), {
          state: stryMutAct_9fa48("25918") ? {} : (stryCov_9fa48("25918"), {
            ...state,
            lastAdded: stryMutAct_9fa48("25919") ? true : (stryCov_9fa48("25919"), false)
          }),
          intents: stryMutAct_9fa48("25920") ? ["Stryker was here"] : (stryCov_9fa48("25920"), [])
        });
      }
    }
    const entries = new Map(state.entries);
    entries.set(event.destinationKey, stryMutAct_9fa48("25921") ? {} : (stryCov_9fa48("25921"), {
      hops: event.hops,
      expires: computePathExpiry(event.at),
      blobHex: bytesToHex(event.randomBlob)
    }));
    return stryMutAct_9fa48("25922") ? {} : (stryCov_9fa48("25922"), {
      state: stryMutAct_9fa48("25923") ? {} : (stryCov_9fa48("25923"), {
        entries,
        lastAdded: stryMutAct_9fa48("25924") ? false : (stryCov_9fa48("25924"), true)
      }),
      intents: stryMutAct_9fa48("25925") ? ["Stryker was here"] : (stryCov_9fa48("25925"), [])
    });
  }
}
function bytesToHex(bytes: Uint8Array): string {
  if (stryMutAct_9fa48("25926")) {
    {}
  } else {
    stryCov_9fa48("25926");
    let out = stryMutAct_9fa48("25927") ? "Stryker was here!" : (stryCov_9fa48("25927"), "");
    for (const byte of bytes) {
      if (stryMutAct_9fa48("25928")) {
        {}
      } else {
        stryCov_9fa48("25928");
        stryMutAct_9fa48("25929") ? out -= byte.toString(16).padStart(2, "0") : (stryCov_9fa48("25929"), out += byte.toString(16).padStart(2, stryMutAct_9fa48("25930") ? "" : (stryCov_9fa48("25930"), "0")));
      }
    }
    return out;
  }
}
function hexToBytes(hex: string): Uint8Array {
  if (stryMutAct_9fa48("25931")) {
    {}
  } else {
    stryCov_9fa48("25931");
    const out = new Uint8Array(stryMutAct_9fa48("25932") ? hex.length * 2 : (stryCov_9fa48("25932"), hex.length / 2));
    for (let i = 0; stryMutAct_9fa48("25935") ? i >= out.length : stryMutAct_9fa48("25934") ? i <= out.length : stryMutAct_9fa48("25933") ? false : (stryCov_9fa48("25933", "25934", "25935"), i < out.length); stryMutAct_9fa48("25936") ? i -= 1 : (stryCov_9fa48("25936"), i += 1)) {
      if (stryMutAct_9fa48("25937")) {
        {}
      } else {
        stryCov_9fa48("25937");
        out[i] = Number.parseInt(stryMutAct_9fa48("25938") ? hex : (stryCov_9fa48("25938"), hex.slice(stryMutAct_9fa48("25939") ? i / 2 : (stryCov_9fa48("25939"), i * 2), stryMutAct_9fa48("25940") ? i * 2 - 2 : (stryCov_9fa48("25940"), (stryMutAct_9fa48("25941") ? i / 2 : (stryCov_9fa48("25941"), i * 2)) + 2))), 16);
      }
    }
    return out;
  }
}