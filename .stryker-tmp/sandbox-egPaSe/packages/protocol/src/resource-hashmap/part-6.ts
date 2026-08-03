/** Extracted from resource-hashmap.ts; the original module remains the public composition point. */
// @ts-nocheck

/**
 * Pure RNS resource hashmap-update framing and request parsing.
 * Link send/receive stays at the adapter edge.
 * Pack / unpack / split / parse / collision-guard / membership / assemble /
 * request-hash conclusions leave via machine actions (no ad-hoc
 * `packResourceHashmapUpdate` / `unpackResourceHashmapUpdate` /
 * `packResourceHashmapUpdatePacket` / `splitResourceHashmapUpdatePacket` /
 * `parseResourcePartRequest` / `appendResourceMapHashCollisionGuard` /
 * `containsResourceHash` / `indexOfResourceHash` /
 * `assembleResourceHashmapBytes` / `readResourceRequestHash` reads beside
 * the step). Slot-write plan nested via
 * {@link stepResourceHashmapSlotWritesPlanWithActions}.
 * Part-request / receive-part / request-fulfill / HMU-accept plans nest via
 * {@link stepResourcePartRequestPlanWithActions} /
 * {@link stepResourceReceivePartPlanWithActions} /
 * {@link stepResourceRequestFulfillPlanWithActions} /
 * {@link stepResourceHashmapUpdateAcceptPlanWithActions}.
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
import { assembleByteArrays, concatByteArrays } from "../bytes.js";
import { msgpackPackArray, msgpackPackBin, msgpackPackUInt, msgpackUnpack, type MsgpackValue } from "../msgpack-core.js";
import { equalByteArrays } from "../path-table.js";
import { appendResourceMapHashCollisionGuard, assembleResourceHashmapBytes, containsResourceHash, indexOfResourceHash, readResourceRequestHash } from "./part-1.js";
import type { ResourcePartRequest } from "./part-1.js";
import type { ParseResourcePartRequestAction } from "./part-5.js";
export function shouldUseParseResourcePartRequest(actions: ReadonlyArray<ParseResourcePartRequestAction>): boolean {
  if (stryMutAct_9fa48("30421")) {
    {}
  } else {
    stryCov_9fa48("30421");
    return stryMutAct_9fa48("30422") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("30422"), actions.some(stryMutAct_9fa48("30423") ? () => undefined : (stryCov_9fa48("30423"), action => stryMutAct_9fa48("30426") ? action.kind !== "use-fields" : stryMutAct_9fa48("30425") ? false : stryMutAct_9fa48("30424") ? true : (stryCov_9fa48("30424", "30425", "30426"), action.kind === (stryMutAct_9fa48("30427") ? "" : (stryCov_9fa48("30427"), "use-fields"))))));
  }
}
export function shouldRejectParseResourcePartRequest(actions: ReadonlyArray<ParseResourcePartRequestAction>): boolean {
  if (stryMutAct_9fa48("30428")) {
    {}
  } else {
    stryCov_9fa48("30428");
    return stryMutAct_9fa48("30429") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("30429"), actions.some(stryMutAct_9fa48("30430") ? () => undefined : (stryCov_9fa48("30430"), action => stryMutAct_9fa48("30433") ? action.kind !== "reject" : stryMutAct_9fa48("30432") ? false : stryMutAct_9fa48("30431") ? true : (stryCov_9fa48("30431", "30432", "30433"), action.kind === (stryMutAct_9fa48("30434") ? "" : (stryCov_9fa48("30434"), "reject"))))));
  }
}

/** Extract parsed part-request fields from step actions; null when no `use-fields`. */
export function resourcePartRequestFieldsFromActions(actions: ReadonlyArray<ParseResourcePartRequestAction>): ResourcePartRequest | null {
  if (stryMutAct_9fa48("30435")) {
    {}
  } else {
    stryCov_9fa48("30435");
    const action = actions.find(stryMutAct_9fa48("30436") ? () => undefined : (stryCov_9fa48("30436"), entry => stryMutAct_9fa48("30439") ? entry.kind !== "use-fields" : stryMutAct_9fa48("30438") ? false : stryMutAct_9fa48("30437") ? true : (stryCov_9fa48("30437", "30438", "30439"), entry.kind === (stryMutAct_9fa48("30440") ? "" : (stryCov_9fa48("30440"), "use-fields")))));
    return (stryMutAct_9fa48("30443") ? action?.kind !== "use-fields" : stryMutAct_9fa48("30442") ? false : stryMutAct_9fa48("30441") ? true : (stryCov_9fa48("30441", "30442", "30443"), (stryMutAct_9fa48("30444") ? action.kind : (stryCov_9fa48("30444"), action?.kind)) === (stryMutAct_9fa48("30445") ? "" : (stryCov_9fa48("30445"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Resource collision-guard append is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `appendResourceMapHashCollisionGuard` reads beside the step).
 */
export type AppendResourceMapHashCollisionGuardState = Record<string, never>;
export type AppendResourceMapHashCollisionGuardEvent = Event | {
  readonly kind: "resource-hashmap/collision-guard-gate";
  readonly guard: ReadonlyArray<Uint8Array>;
  readonly mapHash: Uint8Array;
  readonly hashmapMaxLen: number;
};
export type AppendResourceMapHashCollisionGuardAction = {
  readonly kind: "append";
  readonly guard: readonly Uint8Array[];
} | {
  readonly kind: "collide";
};
export interface AppendResourceMapHashCollisionGuardStepResult {
  readonly state: AppendResourceMapHashCollisionGuardState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AppendResourceMapHashCollisionGuardAction[];
}
export function initialAppendResourceMapHashCollisionGuardState(): AppendResourceMapHashCollisionGuardState {
  if (stryMutAct_9fa48("30446")) {
    {}
  } else {
    stryCov_9fa48("30446");
    return {};
  }
}
export function stepAppendResourceMapHashCollisionGuardWithActions(state: AppendResourceMapHashCollisionGuardState, event: AppendResourceMapHashCollisionGuardEvent): AppendResourceMapHashCollisionGuardStepResult {
  if (stryMutAct_9fa48("30447")) {
    {}
  } else {
    stryCov_9fa48("30447");
    if (stryMutAct_9fa48("30450") ? event.kind !== "resource-hashmap/collision-guard-gate" : stryMutAct_9fa48("30449") ? false : stryMutAct_9fa48("30448") ? true : (stryCov_9fa48("30448", "30449", "30450"), event.kind === (stryMutAct_9fa48("30451") ? "" : (stryCov_9fa48("30451"), "resource-hashmap/collision-guard-gate")))) {
      if (stryMutAct_9fa48("30452")) {
        {}
      } else {
        stryCov_9fa48("30452");
        const result = appendResourceMapHashCollisionGuard(stryMutAct_9fa48("30453") ? {} : (stryCov_9fa48("30453"), {
          guard: event.guard,
          mapHash: event.mapHash,
          hashmapMaxLen: event.hashmapMaxLen
        }));
        if (stryMutAct_9fa48("30455") ? false : stryMutAct_9fa48("30454") ? true : (stryCov_9fa48("30454", "30455"), result.collided)) {
          if (stryMutAct_9fa48("30456")) {
            {}
          } else {
            stryCov_9fa48("30456");
            return stryMutAct_9fa48("30457") ? {} : (stryCov_9fa48("30457"), {
              state,
              intents: stryMutAct_9fa48("30458") ? ["Stryker was here"] : (stryCov_9fa48("30458"), []),
              actions: stryMutAct_9fa48("30459") ? [] : (stryCov_9fa48("30459"), [stryMutAct_9fa48("30460") ? {} : (stryCov_9fa48("30460"), {
                kind: stryMutAct_9fa48("30461") ? "" : (stryCov_9fa48("30461"), "collide")
              })])
            });
          }
        }
        return stryMutAct_9fa48("30462") ? {} : (stryCov_9fa48("30462"), {
          state,
          intents: stryMutAct_9fa48("30463") ? ["Stryker was here"] : (stryCov_9fa48("30463"), []),
          actions: stryMutAct_9fa48("30464") ? [] : (stryCov_9fa48("30464"), [stryMutAct_9fa48("30465") ? {} : (stryCov_9fa48("30465"), {
            kind: stryMutAct_9fa48("30466") ? "" : (stryCov_9fa48("30466"), "append"),
            guard: result.guard
          })])
        });
      }
    }
    return stryMutAct_9fa48("30467") ? {} : (stryCov_9fa48("30467"), {
      state,
      intents: stryMutAct_9fa48("30468") ? ["Stryker was here"] : (stryCov_9fa48("30468"), []),
      actions: stryMutAct_9fa48("30469") ? ["Stryker was here"] : (stryCov_9fa48("30469"), [])
    });
  }
}
export function shouldAppendResourceMapHashCollisionGuard(actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>): boolean {
  if (stryMutAct_9fa48("30470")) {
    {}
  } else {
    stryCov_9fa48("30470");
    return stryMutAct_9fa48("30471") ? actions.every(action => action.kind === "append") : (stryCov_9fa48("30471"), actions.some(stryMutAct_9fa48("30472") ? () => undefined : (stryCov_9fa48("30472"), action => stryMutAct_9fa48("30475") ? action.kind !== "append" : stryMutAct_9fa48("30474") ? false : stryMutAct_9fa48("30473") ? true : (stryCov_9fa48("30473", "30474", "30475"), action.kind === (stryMutAct_9fa48("30476") ? "" : (stryCov_9fa48("30476"), "append"))))));
  }
}
export function shouldCollideResourceMapHashCollisionGuard(actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>): boolean {
  if (stryMutAct_9fa48("30477")) {
    {}
  } else {
    stryCov_9fa48("30477");
    return stryMutAct_9fa48("30478") ? actions.every(action => action.kind === "collide") : (stryCov_9fa48("30478"), actions.some(stryMutAct_9fa48("30479") ? () => undefined : (stryCov_9fa48("30479"), action => stryMutAct_9fa48("30482") ? action.kind !== "collide" : stryMutAct_9fa48("30481") ? false : stryMutAct_9fa48("30480") ? true : (stryCov_9fa48("30480", "30481", "30482"), action.kind === (stryMutAct_9fa48("30483") ? "" : (stryCov_9fa48("30483"), "collide"))))));
  }
}

/** Extract appended collision-guard list from step actions; null when no `append`. */
export function resourceMapHashCollisionGuardFromActions(actions: ReadonlyArray<AppendResourceMapHashCollisionGuardAction>): readonly Uint8Array[] | null {
  if (stryMutAct_9fa48("30484")) {
    {}
  } else {
    stryCov_9fa48("30484");
    const action = actions.find(stryMutAct_9fa48("30485") ? () => undefined : (stryCov_9fa48("30485"), entry => stryMutAct_9fa48("30488") ? entry.kind !== "append" : stryMutAct_9fa48("30487") ? false : stryMutAct_9fa48("30486") ? true : (stryCov_9fa48("30486", "30487", "30488"), entry.kind === (stryMutAct_9fa48("30489") ? "" : (stryCov_9fa48("30489"), "append")))));
    return (stryMutAct_9fa48("30492") ? action?.kind !== "append" : stryMutAct_9fa48("30491") ? false : stryMutAct_9fa48("30490") ? true : (stryCov_9fa48("30490", "30491", "30492"), (stryMutAct_9fa48("30493") ? action.kind : (stryCov_9fa48("30493"), action?.kind)) === (stryMutAct_9fa48("30494") ? "" : (stryCov_9fa48("30494"), "append")))) ? action.guard : null;
  }
}

/**
 * Resource hashmap byte assembly is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc
 * `assembleResourceHashmapBytes` reads beside the step).
 */
export type AssembleResourceHashmapBytesState = Record<string, never>;
export type AssembleResourceHashmapBytesEvent = Event | {
  readonly kind: "resource-hashmap/assemble-bytes-gate";
  readonly mapHashes: ReadonlyArray<Uint8Array>;
};
export type AssembleResourceHashmapBytesAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface AssembleResourceHashmapBytesStepResult {
  readonly state: AssembleResourceHashmapBytesState;
  readonly intents: readonly Intent[];
  readonly actions: readonly AssembleResourceHashmapBytesAction[];
}
export function initialAssembleResourceHashmapBytesState(): AssembleResourceHashmapBytesState {
  if (stryMutAct_9fa48("30495")) {
    {}
  } else {
    stryCov_9fa48("30495");
    return {};
  }
}
export function stepAssembleResourceHashmapBytesWithActions(state: AssembleResourceHashmapBytesState, event: AssembleResourceHashmapBytesEvent): AssembleResourceHashmapBytesStepResult {
  if (stryMutAct_9fa48("30496")) {
    {}
  } else {
    stryCov_9fa48("30496");
    if (stryMutAct_9fa48("30499") ? event.kind !== "resource-hashmap/assemble-bytes-gate" : stryMutAct_9fa48("30498") ? false : stryMutAct_9fa48("30497") ? true : (stryCov_9fa48("30497", "30498", "30499"), event.kind === (stryMutAct_9fa48("30500") ? "" : (stryCov_9fa48("30500"), "resource-hashmap/assemble-bytes-gate")))) {
      if (stryMutAct_9fa48("30501")) {
        {}
      } else {
        stryCov_9fa48("30501");
        return stryMutAct_9fa48("30502") ? {} : (stryCov_9fa48("30502"), {
          state,
          intents: stryMutAct_9fa48("30503") ? ["Stryker was here"] : (stryCov_9fa48("30503"), []),
          actions: stryMutAct_9fa48("30504") ? [] : (stryCov_9fa48("30504"), [stryMutAct_9fa48("30505") ? {} : (stryCov_9fa48("30505"), {
            kind: stryMutAct_9fa48("30506") ? "" : (stryCov_9fa48("30506"), "use-raw"),
            raw: assembleResourceHashmapBytes(event.mapHashes)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30507") ? {} : (stryCov_9fa48("30507"), {
      state,
      intents: stryMutAct_9fa48("30508") ? ["Stryker was here"] : (stryCov_9fa48("30508"), []),
      actions: stryMutAct_9fa48("30509") ? ["Stryker was here"] : (stryCov_9fa48("30509"), [])
    });
  }
}
export function shouldUseAssembleResourceHashmapBytes(actions: ReadonlyArray<AssembleResourceHashmapBytesAction>): boolean {
  if (stryMutAct_9fa48("30510")) {
    {}
  } else {
    stryCov_9fa48("30510");
    return stryMutAct_9fa48("30511") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30511"), actions.some(stryMutAct_9fa48("30512") ? () => undefined : (stryCov_9fa48("30512"), action => stryMutAct_9fa48("30515") ? action.kind !== "use-raw" : stryMutAct_9fa48("30514") ? false : stryMutAct_9fa48("30513") ? true : (stryCov_9fa48("30513", "30514", "30515"), action.kind === (stryMutAct_9fa48("30516") ? "" : (stryCov_9fa48("30516"), "use-raw"))))));
  }
}

/** Extract assembled hashmap bytes from step actions; null when no `use-raw`. */
export function assembleResourceHashmapBytesRawFromActions(actions: ReadonlyArray<AssembleResourceHashmapBytesAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30517")) {
    {}
  } else {
    stryCov_9fa48("30517");
    const action = actions.find(stryMutAct_9fa48("30518") ? () => undefined : (stryCov_9fa48("30518"), entry => stryMutAct_9fa48("30521") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30520") ? false : stryMutAct_9fa48("30519") ? true : (stryCov_9fa48("30519", "30520", "30521"), entry.kind === (stryMutAct_9fa48("30522") ? "" : (stryCov_9fa48("30522"), "use-raw")))));
    return (stryMutAct_9fa48("30525") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30524") ? false : stryMutAct_9fa48("30523") ? true : (stryCov_9fa48("30523", "30524", "30525"), (stryMutAct_9fa48("30526") ? action.kind : (stryCov_9fa48("30526"), action?.kind)) === (stryMutAct_9fa48("30527") ? "" : (stryCov_9fa48("30527"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Resource-hash membership is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `containsResourceHash` /
 * `indexOfResourceHash` reads beside the step).
 */
export type ContainsResourceHashState = Record<string, never>;
export type ContainsResourceHashEvent = Event | {
  readonly kind: "resource-hashmap/contains-hash-gate";
  readonly hashes: ReadonlyArray<Uint8Array>;
  readonly target: Uint8Array;
};
export type ContainsResourceHashAction = {
  readonly kind: "present";
  readonly index: number;
} | {
  readonly kind: "absent";
};
export interface ContainsResourceHashStepResult {
  readonly state: ContainsResourceHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ContainsResourceHashAction[];
}
export function initialContainsResourceHashState(): ContainsResourceHashState {
  if (stryMutAct_9fa48("30528")) {
    {}
  } else {
    stryCov_9fa48("30528");
    return {};
  }
}
export function stepContainsResourceHashWithActions(state: ContainsResourceHashState, event: ContainsResourceHashEvent): ContainsResourceHashStepResult {
  if (stryMutAct_9fa48("30529")) {
    {}
  } else {
    stryCov_9fa48("30529");
    if (stryMutAct_9fa48("30532") ? event.kind !== "resource-hashmap/contains-hash-gate" : stryMutAct_9fa48("30531") ? false : stryMutAct_9fa48("30530") ? true : (stryCov_9fa48("30530", "30531", "30532"), event.kind === (stryMutAct_9fa48("30533") ? "" : (stryCov_9fa48("30533"), "resource-hashmap/contains-hash-gate")))) {
      if (stryMutAct_9fa48("30534")) {
        {}
      } else {
        stryCov_9fa48("30534");
        const index = indexOfResourceHash(stryMutAct_9fa48("30535") ? {} : (stryCov_9fa48("30535"), {
          hashes: event.hashes,
          target: event.target
        }));
        if (stryMutAct_9fa48("30538") ? index !== null : stryMutAct_9fa48("30537") ? false : stryMutAct_9fa48("30536") ? true : (stryCov_9fa48("30536", "30537", "30538"), index === null)) {
          if (stryMutAct_9fa48("30539")) {
            {}
          } else {
            stryCov_9fa48("30539");
            return stryMutAct_9fa48("30540") ? {} : (stryCov_9fa48("30540"), {
              state,
              intents: stryMutAct_9fa48("30541") ? ["Stryker was here"] : (stryCov_9fa48("30541"), []),
              actions: stryMutAct_9fa48("30542") ? [] : (stryCov_9fa48("30542"), [stryMutAct_9fa48("30543") ? {} : (stryCov_9fa48("30543"), {
                kind: stryMutAct_9fa48("30544") ? "" : (stryCov_9fa48("30544"), "absent")
              })])
            });
          }
        }
        return stryMutAct_9fa48("30545") ? {} : (stryCov_9fa48("30545"), {
          state,
          intents: stryMutAct_9fa48("30546") ? ["Stryker was here"] : (stryCov_9fa48("30546"), []),
          actions: stryMutAct_9fa48("30547") ? [] : (stryCov_9fa48("30547"), [stryMutAct_9fa48("30548") ? {} : (stryCov_9fa48("30548"), {
            kind: stryMutAct_9fa48("30549") ? "" : (stryCov_9fa48("30549"), "present"),
            index
          })])
        });
      }
    }
    return stryMutAct_9fa48("30550") ? {} : (stryCov_9fa48("30550"), {
      state,
      intents: stryMutAct_9fa48("30551") ? ["Stryker was here"] : (stryCov_9fa48("30551"), []),
      actions: stryMutAct_9fa48("30552") ? ["Stryker was here"] : (stryCov_9fa48("30552"), [])
    });
  }
}
export function shouldPresentResourceHash(actions: ReadonlyArray<ContainsResourceHashAction>): boolean {
  if (stryMutAct_9fa48("30553")) {
    {}
  } else {
    stryCov_9fa48("30553");
    return stryMutAct_9fa48("30554") ? actions.every(action => action.kind === "present") : (stryCov_9fa48("30554"), actions.some(stryMutAct_9fa48("30555") ? () => undefined : (stryCov_9fa48("30555"), action => stryMutAct_9fa48("30558") ? action.kind !== "present" : stryMutAct_9fa48("30557") ? false : stryMutAct_9fa48("30556") ? true : (stryCov_9fa48("30556", "30557", "30558"), action.kind === (stryMutAct_9fa48("30559") ? "" : (stryCov_9fa48("30559"), "present"))))));
  }
}
export function shouldAbsentResourceHash(actions: ReadonlyArray<ContainsResourceHashAction>): boolean {
  if (stryMutAct_9fa48("30560")) {
    {}
  } else {
    stryCov_9fa48("30560");
    return stryMutAct_9fa48("30561") ? actions.every(action => action.kind === "absent") : (stryCov_9fa48("30561"), actions.some(stryMutAct_9fa48("30562") ? () => undefined : (stryCov_9fa48("30562"), action => stryMutAct_9fa48("30565") ? action.kind !== "absent" : stryMutAct_9fa48("30564") ? false : stryMutAct_9fa48("30563") ? true : (stryCov_9fa48("30563", "30564", "30565"), action.kind === (stryMutAct_9fa48("30566") ? "" : (stryCov_9fa48("30566"), "absent"))))));
  }
}

/** Extract membership index from step actions; null when no `present`. */
export function resourceHashIndexFromActions(actions: ReadonlyArray<ContainsResourceHashAction>): number | null {
  if (stryMutAct_9fa48("30567")) {
    {}
  } else {
    stryCov_9fa48("30567");
    const action = actions.find(stryMutAct_9fa48("30568") ? () => undefined : (stryCov_9fa48("30568"), entry => stryMutAct_9fa48("30571") ? entry.kind !== "present" : stryMutAct_9fa48("30570") ? false : stryMutAct_9fa48("30569") ? true : (stryCov_9fa48("30569", "30570", "30571"), entry.kind === (stryMutAct_9fa48("30572") ? "" : (stryCov_9fa48("30572"), "present")))));
    return (stryMutAct_9fa48("30575") ? action?.kind !== "present" : stryMutAct_9fa48("30574") ? false : stryMutAct_9fa48("30573") ? true : (stryCov_9fa48("30573", "30574", "30575"), (stryMutAct_9fa48("30576") ? action.kind : (stryCov_9fa48("30576"), action?.kind)) === (stryMutAct_9fa48("30577") ? "" : (stryCov_9fa48("30577"), "present")))) ? action.index : null;
  }
}

/**
 * Resource request-hash read is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `readResourceRequestHash`
 * reads beside the step).
 */
export type ReadResourceRequestHashState = Record<string, never>;
export type ReadResourceRequestHashEvent = Event | {
  readonly kind: "resource-hashmap/read-request-hash-gate";
  readonly requestData: Uint8Array;
};
export type ReadResourceRequestHashAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface ReadResourceRequestHashStepResult {
  readonly state: ReadResourceRequestHashState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ReadResourceRequestHashAction[];
}
export function initialReadResourceRequestHashState(): ReadResourceRequestHashState {
  if (stryMutAct_9fa48("30578")) {
    {}
  } else {
    stryCov_9fa48("30578");
    return {};
  }
}
export function stepReadResourceRequestHashWithActions(state: ReadResourceRequestHashState, event: ReadResourceRequestHashEvent): ReadResourceRequestHashStepResult {
  if (stryMutAct_9fa48("30579")) {
    {}
  } else {
    stryCov_9fa48("30579");
    if (stryMutAct_9fa48("30582") ? event.kind !== "resource-hashmap/read-request-hash-gate" : stryMutAct_9fa48("30581") ? false : stryMutAct_9fa48("30580") ? true : (stryCov_9fa48("30580", "30581", "30582"), event.kind === (stryMutAct_9fa48("30583") ? "" : (stryCov_9fa48("30583"), "resource-hashmap/read-request-hash-gate")))) {
      if (stryMutAct_9fa48("30584")) {
        {}
      } else {
        stryCov_9fa48("30584");
        return stryMutAct_9fa48("30585") ? {} : (stryCov_9fa48("30585"), {
          state,
          intents: stryMutAct_9fa48("30586") ? ["Stryker was here"] : (stryCov_9fa48("30586"), []),
          actions: stryMutAct_9fa48("30587") ? [] : (stryCov_9fa48("30587"), [stryMutAct_9fa48("30588") ? {} : (stryCov_9fa48("30588"), {
            kind: stryMutAct_9fa48("30589") ? "" : (stryCov_9fa48("30589"), "use-raw"),
            raw: readResourceRequestHash(event.requestData)
          })])
        });
      }
    }
    return stryMutAct_9fa48("30590") ? {} : (stryCov_9fa48("30590"), {
      state,
      intents: stryMutAct_9fa48("30591") ? ["Stryker was here"] : (stryCov_9fa48("30591"), []),
      actions: stryMutAct_9fa48("30592") ? ["Stryker was here"] : (stryCov_9fa48("30592"), [])
    });
  }
}
export function shouldUseReadResourceRequestHash(actions: ReadonlyArray<ReadResourceRequestHashAction>): boolean {
  if (stryMutAct_9fa48("30593")) {
    {}
  } else {
    stryCov_9fa48("30593");
    return stryMutAct_9fa48("30594") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("30594"), actions.some(stryMutAct_9fa48("30595") ? () => undefined : (stryCov_9fa48("30595"), action => stryMutAct_9fa48("30598") ? action.kind !== "use-raw" : stryMutAct_9fa48("30597") ? false : stryMutAct_9fa48("30596") ? true : (stryCov_9fa48("30596", "30597", "30598"), action.kind === (stryMutAct_9fa48("30599") ? "" : (stryCov_9fa48("30599"), "use-raw"))))));
  }
}

/** Extract request-hash bytes from step actions; null when no `use-raw`. */
export function readResourceRequestHashRawFromActions(actions: ReadonlyArray<ReadResourceRequestHashAction>): Uint8Array | null {
  if (stryMutAct_9fa48("30600")) {
    {}
  } else {
    stryCov_9fa48("30600");
    const action = actions.find(stryMutAct_9fa48("30601") ? () => undefined : (stryCov_9fa48("30601"), entry => stryMutAct_9fa48("30604") ? entry.kind !== "use-raw" : stryMutAct_9fa48("30603") ? false : stryMutAct_9fa48("30602") ? true : (stryCov_9fa48("30602", "30603", "30604"), entry.kind === (stryMutAct_9fa48("30605") ? "" : (stryCov_9fa48("30605"), "use-raw")))));
    return (stryMutAct_9fa48("30608") ? action?.kind !== "use-raw" : stryMutAct_9fa48("30607") ? false : stryMutAct_9fa48("30606") ? true : (stryCov_9fa48("30606", "30607", "30608"), (stryMutAct_9fa48("30609") ? action.kind : (stryCov_9fa48("30609"), action?.kind)) === (stryMutAct_9fa48("30610") ? "" : (stryCov_9fa48("30610"), "use-raw")))) ? action.raw : null;
  }
}