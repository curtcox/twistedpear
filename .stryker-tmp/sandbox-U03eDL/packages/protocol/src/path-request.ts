/**
 * Pure RNS path-request payload framing.
 * Destination hashing stays at the crypto adapter edge.
 * Build / parse / tag-key conclusions leave via machine actions
 * (no ad-hoc `buildPathRequestData` / `parsePathRequestData` /
 * `pathRequestTagKey` reads beside the step).
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
import type { Event, Intent } from "@twistedpear/effects";
import { bytesToHexLower } from "./destination-name.js";
import { TRANSPORT_ID_BYTES } from "./transport-framing.js";
export const PATH_REQUEST_HASH_BYTES = TRANSPORT_ID_BYTES;
export const TRANSPORT_PATH_REQUEST_APP = stryMutAct_9fa48("24538") ? "" : (stryCov_9fa48("24538"), "rnstransport");
export const TRANSPORT_PATH_REQUEST_ASPECTS = ["path", "request"] as const;
export interface PathRequestFields {
  readonly destinationHash: Uint8Array;
  readonly requestorTransportId: Uint8Array | null;
  readonly tag: Uint8Array | null;
}
function concatBytes(...parts: ReadonlyArray<Uint8Array>): Uint8Array {
  if (stryMutAct_9fa48("24539")) {
    {}
  } else {
    stryCov_9fa48("24539");
    const length = parts.reduce(stryMutAct_9fa48("24540") ? () => undefined : (stryCov_9fa48("24540"), (total, part) => stryMutAct_9fa48("24541") ? total - part.length : (stryCov_9fa48("24541"), total + part.length)), 0);
    const output = new Uint8Array(length);
    let offset = 0;
    for (const part of parts) {
      if (stryMutAct_9fa48("24542")) {
        {}
      } else {
        stryCov_9fa48("24542");
        output.set(part, offset);
        stryMutAct_9fa48("24543") ? offset -= part.length : (stryCov_9fa48("24543"), offset += part.length);
      }
    }
    return output;
  }
}
export function buildPathRequestData(destinationHash: Uint8Array, requestorTransportId: Uint8Array | null, tag: Uint8Array): Uint8Array {
  if (stryMutAct_9fa48("24544")) {
    {}
  } else {
    stryCov_9fa48("24544");
    if (stryMutAct_9fa48("24547") ? destinationHash.length === PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24546") ? false : stryMutAct_9fa48("24545") ? true : (stryCov_9fa48("24545", "24546", "24547"), destinationHash.length !== PATH_REQUEST_HASH_BYTES)) {
      if (stryMutAct_9fa48("24548")) {
        {}
      } else {
        stryCov_9fa48("24548");
        throw new Error(stryMutAct_9fa48("24549") ? `` : (stryCov_9fa48("24549"), `destination hash must be ${PATH_REQUEST_HASH_BYTES} bytes`));
      }
    }
    if (stryMutAct_9fa48("24552") ? requestorTransportId !== null : stryMutAct_9fa48("24551") ? false : stryMutAct_9fa48("24550") ? true : (stryCov_9fa48("24550", "24551", "24552"), requestorTransportId === null)) {
      if (stryMutAct_9fa48("24553")) {
        {}
      } else {
        stryCov_9fa48("24553");
        return concatBytes(destinationHash, tag);
      }
    }
    if (stryMutAct_9fa48("24556") ? requestorTransportId.length === PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24555") ? false : stryMutAct_9fa48("24554") ? true : (stryCov_9fa48("24554", "24555", "24556"), requestorTransportId.length !== PATH_REQUEST_HASH_BYTES)) {
      if (stryMutAct_9fa48("24557")) {
        {}
      } else {
        stryCov_9fa48("24557");
        throw new Error(stryMutAct_9fa48("24558") ? `` : (stryCov_9fa48("24558"), `requestor transport id must be ${PATH_REQUEST_HASH_BYTES} bytes`));
      }
    }
    return concatBytes(destinationHash, requestorTransportId, tag);
  }
}
export function parsePathRequestData(data: Uint8Array): PathRequestFields | null {
  if (stryMutAct_9fa48("24559")) {
    {}
  } else {
    stryCov_9fa48("24559");
    if (stryMutAct_9fa48("24563") ? data.length >= PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24562") ? data.length <= PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24561") ? false : stryMutAct_9fa48("24560") ? true : (stryCov_9fa48("24560", "24561", "24562", "24563"), data.length < PATH_REQUEST_HASH_BYTES)) {
      if (stryMutAct_9fa48("24564")) {
        {}
      } else {
        stryCov_9fa48("24564");
        return null;
      }
    }
    const destinationHash = data.subarray(0, PATH_REQUEST_HASH_BYTES);
    let requestorTransportId: Uint8Array | null = null;
    let tag: Uint8Array | null = null;
    if (stryMutAct_9fa48("24568") ? data.length <= PATH_REQUEST_HASH_BYTES * 2 : stryMutAct_9fa48("24567") ? data.length >= PATH_REQUEST_HASH_BYTES * 2 : stryMutAct_9fa48("24566") ? false : stryMutAct_9fa48("24565") ? true : (stryCov_9fa48("24565", "24566", "24567", "24568"), data.length > (stryMutAct_9fa48("24569") ? PATH_REQUEST_HASH_BYTES / 2 : (stryCov_9fa48("24569"), PATH_REQUEST_HASH_BYTES * 2)))) {
      if (stryMutAct_9fa48("24570")) {
        {}
      } else {
        stryCov_9fa48("24570");
        requestorTransportId = data.subarray(PATH_REQUEST_HASH_BYTES, stryMutAct_9fa48("24571") ? PATH_REQUEST_HASH_BYTES / 2 : (stryCov_9fa48("24571"), PATH_REQUEST_HASH_BYTES * 2));
        tag = data.subarray(stryMutAct_9fa48("24572") ? PATH_REQUEST_HASH_BYTES / 2 : (stryCov_9fa48("24572"), PATH_REQUEST_HASH_BYTES * 2));
      }
    } else if (stryMutAct_9fa48("24576") ? data.length <= PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24575") ? data.length >= PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24574") ? false : stryMutAct_9fa48("24573") ? true : (stryCov_9fa48("24573", "24574", "24575", "24576"), data.length > PATH_REQUEST_HASH_BYTES)) {
      if (stryMutAct_9fa48("24577")) {
        {}
      } else {
        stryCov_9fa48("24577");
        tag = data.subarray(PATH_REQUEST_HASH_BYTES);
      }
    }
    if (stryMutAct_9fa48("24580") ? tag !== null || tag.length > PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24579") ? false : stryMutAct_9fa48("24578") ? true : (stryCov_9fa48("24578", "24579", "24580"), (stryMutAct_9fa48("24582") ? tag === null : stryMutAct_9fa48("24581") ? true : (stryCov_9fa48("24581", "24582"), tag !== null)) && (stryMutAct_9fa48("24585") ? tag.length <= PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24584") ? tag.length >= PATH_REQUEST_HASH_BYTES : stryMutAct_9fa48("24583") ? true : (stryCov_9fa48("24583", "24584", "24585"), tag.length > PATH_REQUEST_HASH_BYTES)))) {
      if (stryMutAct_9fa48("24586")) {
        {}
      } else {
        stryCov_9fa48("24586");
        tag = tag.subarray(0, PATH_REQUEST_HASH_BYTES);
      }
    }
    return stryMutAct_9fa48("24587") ? {} : (stryCov_9fa48("24587"), {
      destinationHash,
      requestorTransportId,
      tag
    });
  }
}
export function pathRequestTagKey(destinationHash: Uint8Array, tag: Uint8Array): string {
  if (stryMutAct_9fa48("24588")) {
    {}
  } else {
    stryCov_9fa48("24588");
    return stryMutAct_9fa48("24589") ? bytesToHexLower(destinationHash) - bytesToHexLower(tag) : (stryCov_9fa48("24589"), bytesToHexLower(destinationHash) + bytesToHexLower(tag));
  }
}

/**
 * Path-request build framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `buildPathRequestData`
 * reads beside the step).
 */
export type BuildPathRequestDataState = Record<string, never>;
export type BuildPathRequestDataEvent = Event | {
  readonly kind: "path-request/build-data-gate";
  readonly destinationHash: Uint8Array;
  readonly requestorTransportId: Uint8Array | null;
  readonly tag: Uint8Array;
};
export type BuildPathRequestDataAction = {
  readonly kind: "use-raw";
  readonly raw: Uint8Array;
};
export interface BuildPathRequestDataStepResult {
  readonly state: BuildPathRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly BuildPathRequestDataAction[];
}
export function initialBuildPathRequestDataState(): BuildPathRequestDataState {
  if (stryMutAct_9fa48("24590")) {
    {}
  } else {
    stryCov_9fa48("24590");
    return {};
  }
}
export function stepBuildPathRequestDataWithActions(state: BuildPathRequestDataState, event: BuildPathRequestDataEvent): BuildPathRequestDataStepResult {
  if (stryMutAct_9fa48("24591")) {
    {}
  } else {
    stryCov_9fa48("24591");
    if (stryMutAct_9fa48("24594") ? event.kind !== "path-request/build-data-gate" : stryMutAct_9fa48("24593") ? false : stryMutAct_9fa48("24592") ? true : (stryCov_9fa48("24592", "24593", "24594"), event.kind === (stryMutAct_9fa48("24595") ? "" : (stryCov_9fa48("24595"), "path-request/build-data-gate")))) {
      if (stryMutAct_9fa48("24596")) {
        {}
      } else {
        stryCov_9fa48("24596");
        return stryMutAct_9fa48("24597") ? {} : (stryCov_9fa48("24597"), {
          state,
          intents: stryMutAct_9fa48("24598") ? ["Stryker was here"] : (stryCov_9fa48("24598"), []),
          actions: stryMutAct_9fa48("24599") ? [] : (stryCov_9fa48("24599"), [stryMutAct_9fa48("24600") ? {} : (stryCov_9fa48("24600"), {
            kind: stryMutAct_9fa48("24601") ? "" : (stryCov_9fa48("24601"), "use-raw"),
            raw: buildPathRequestData(event.destinationHash, event.requestorTransportId, event.tag)
          })])
        });
      }
    }
    return stryMutAct_9fa48("24602") ? {} : (stryCov_9fa48("24602"), {
      state,
      intents: stryMutAct_9fa48("24603") ? ["Stryker was here"] : (stryCov_9fa48("24603"), []),
      actions: stryMutAct_9fa48("24604") ? ["Stryker was here"] : (stryCov_9fa48("24604"), [])
    });
  }
}
export function shouldUseBuildPathRequestData(actions: ReadonlyArray<BuildPathRequestDataAction>): boolean {
  if (stryMutAct_9fa48("24605")) {
    {}
  } else {
    stryCov_9fa48("24605");
    return stryMutAct_9fa48("24606") ? actions.every(action => action.kind === "use-raw") : (stryCov_9fa48("24606"), actions.some(stryMutAct_9fa48("24607") ? () => undefined : (stryCov_9fa48("24607"), action => stryMutAct_9fa48("24610") ? action.kind !== "use-raw" : stryMutAct_9fa48("24609") ? false : stryMutAct_9fa48("24608") ? true : (stryCov_9fa48("24608", "24609", "24610"), action.kind === (stryMutAct_9fa48("24611") ? "" : (stryCov_9fa48("24611"), "use-raw"))))));
  }
}

/** Extract path-request build bytes from step actions; null when no `use-raw`. */
export function buildPathRequestDataRawFromActions(actions: ReadonlyArray<BuildPathRequestDataAction>): Uint8Array | null {
  if (stryMutAct_9fa48("24612")) {
    {}
  } else {
    stryCov_9fa48("24612");
    const action = actions.find(stryMutAct_9fa48("24613") ? () => undefined : (stryCov_9fa48("24613"), entry => stryMutAct_9fa48("24616") ? entry.kind !== "use-raw" : stryMutAct_9fa48("24615") ? false : stryMutAct_9fa48("24614") ? true : (stryCov_9fa48("24614", "24615", "24616"), entry.kind === (stryMutAct_9fa48("24617") ? "" : (stryCov_9fa48("24617"), "use-raw")))));
    return (stryMutAct_9fa48("24620") ? action?.kind !== "use-raw" : stryMutAct_9fa48("24619") ? false : stryMutAct_9fa48("24618") ? true : (stryCov_9fa48("24618", "24619", "24620"), (stryMutAct_9fa48("24621") ? action.kind : (stryCov_9fa48("24621"), action?.kind)) === (stryMutAct_9fa48("24622") ? "" : (stryCov_9fa48("24622"), "use-raw")))) ? action.raw : null;
  }
}

/**
 * Path-request parse framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `parsePathRequestData`
 * reads beside the step).
 */
export type ParsePathRequestDataState = Record<string, never>;
export type ParsePathRequestDataEvent = Event | {
  readonly kind: "path-request/parse-data-gate";
  readonly data: Uint8Array;
};
export type ParsePathRequestDataAction = {
  readonly kind: "use-fields";
  readonly fields: PathRequestFields;
} | {
  readonly kind: "reject";
};
export interface ParsePathRequestDataStepResult {
  readonly state: ParsePathRequestDataState;
  readonly intents: readonly Intent[];
  readonly actions: readonly ParsePathRequestDataAction[];
}
export function initialParsePathRequestDataState(): ParsePathRequestDataState {
  if (stryMutAct_9fa48("24623")) {
    {}
  } else {
    stryCov_9fa48("24623");
    return {};
  }
}
export function stepParsePathRequestDataWithActions(state: ParsePathRequestDataState, event: ParsePathRequestDataEvent): ParsePathRequestDataStepResult {
  if (stryMutAct_9fa48("24624")) {
    {}
  } else {
    stryCov_9fa48("24624");
    if (stryMutAct_9fa48("24627") ? event.kind !== "path-request/parse-data-gate" : stryMutAct_9fa48("24626") ? false : stryMutAct_9fa48("24625") ? true : (stryCov_9fa48("24625", "24626", "24627"), event.kind === (stryMutAct_9fa48("24628") ? "" : (stryCov_9fa48("24628"), "path-request/parse-data-gate")))) {
      if (stryMutAct_9fa48("24629")) {
        {}
      } else {
        stryCov_9fa48("24629");
        const fields = parsePathRequestData(event.data);
        if (stryMutAct_9fa48("24632") ? fields !== null : stryMutAct_9fa48("24631") ? false : stryMutAct_9fa48("24630") ? true : (stryCov_9fa48("24630", "24631", "24632"), fields === null)) {
          if (stryMutAct_9fa48("24633")) {
            {}
          } else {
            stryCov_9fa48("24633");
            return stryMutAct_9fa48("24634") ? {} : (stryCov_9fa48("24634"), {
              state,
              intents: stryMutAct_9fa48("24635") ? ["Stryker was here"] : (stryCov_9fa48("24635"), []),
              actions: stryMutAct_9fa48("24636") ? [] : (stryCov_9fa48("24636"), [stryMutAct_9fa48("24637") ? {} : (stryCov_9fa48("24637"), {
                kind: stryMutAct_9fa48("24638") ? "" : (stryCov_9fa48("24638"), "reject")
              })])
            });
          }
        }
        return stryMutAct_9fa48("24639") ? {} : (stryCov_9fa48("24639"), {
          state,
          intents: stryMutAct_9fa48("24640") ? ["Stryker was here"] : (stryCov_9fa48("24640"), []),
          actions: stryMutAct_9fa48("24641") ? [] : (stryCov_9fa48("24641"), [stryMutAct_9fa48("24642") ? {} : (stryCov_9fa48("24642"), {
            kind: stryMutAct_9fa48("24643") ? "" : (stryCov_9fa48("24643"), "use-fields"),
            fields
          })])
        });
      }
    }
    return stryMutAct_9fa48("24644") ? {} : (stryCov_9fa48("24644"), {
      state,
      intents: stryMutAct_9fa48("24645") ? ["Stryker was here"] : (stryCov_9fa48("24645"), []),
      actions: stryMutAct_9fa48("24646") ? ["Stryker was here"] : (stryCov_9fa48("24646"), [])
    });
  }
}
export function shouldUseParsePathRequestData(actions: ReadonlyArray<ParsePathRequestDataAction>): boolean {
  if (stryMutAct_9fa48("24647")) {
    {}
  } else {
    stryCov_9fa48("24647");
    return stryMutAct_9fa48("24648") ? actions.every(action => action.kind === "use-fields") : (stryCov_9fa48("24648"), actions.some(stryMutAct_9fa48("24649") ? () => undefined : (stryCov_9fa48("24649"), action => stryMutAct_9fa48("24652") ? action.kind !== "use-fields" : stryMutAct_9fa48("24651") ? false : stryMutAct_9fa48("24650") ? true : (stryCov_9fa48("24650", "24651", "24652"), action.kind === (stryMutAct_9fa48("24653") ? "" : (stryCov_9fa48("24653"), "use-fields"))))));
  }
}
export function shouldRejectParsePathRequestData(actions: ReadonlyArray<ParsePathRequestDataAction>): boolean {
  if (stryMutAct_9fa48("24654")) {
    {}
  } else {
    stryCov_9fa48("24654");
    return stryMutAct_9fa48("24655") ? actions.every(action => action.kind === "reject") : (stryCov_9fa48("24655"), actions.some(stryMutAct_9fa48("24656") ? () => undefined : (stryCov_9fa48("24656"), action => stryMutAct_9fa48("24659") ? action.kind !== "reject" : stryMutAct_9fa48("24658") ? false : stryMutAct_9fa48("24657") ? true : (stryCov_9fa48("24657", "24658", "24659"), action.kind === (stryMutAct_9fa48("24660") ? "" : (stryCov_9fa48("24660"), "reject"))))));
  }
}

/** Extract parsed path-request fields from step actions; null when no `use-fields`. */
export function pathRequestFieldsFromActions(actions: ReadonlyArray<ParsePathRequestDataAction>): PathRequestFields | null {
  if (stryMutAct_9fa48("24661")) {
    {}
  } else {
    stryCov_9fa48("24661");
    const action = actions.find(stryMutAct_9fa48("24662") ? () => undefined : (stryCov_9fa48("24662"), entry => stryMutAct_9fa48("24665") ? entry.kind !== "use-fields" : stryMutAct_9fa48("24664") ? false : stryMutAct_9fa48("24663") ? true : (stryCov_9fa48("24663", "24664", "24665"), entry.kind === (stryMutAct_9fa48("24666") ? "" : (stryCov_9fa48("24666"), "use-fields")))));
    return (stryMutAct_9fa48("24669") ? action?.kind !== "use-fields" : stryMutAct_9fa48("24668") ? false : stryMutAct_9fa48("24667") ? true : (stryCov_9fa48("24667", "24668", "24669"), (stryMutAct_9fa48("24670") ? action.kind : (stryCov_9fa48("24670"), action?.kind)) === (stryMutAct_9fa48("24671") ? "" : (stryCov_9fa48("24671"), "use-fields")))) ? action.fields : null;
  }
}

/**
 * Path-request tag-key framing is event-driven; no durable session fields.
 * Conclusions leave via machine actions (no ad-hoc `pathRequestTagKey`
 * reads beside the step).
 */
export type PathRequestTagKeyState = Record<string, never>;
export type PathRequestTagKeyEvent = Event | {
  readonly kind: "path-request/tag-key-gate";
  readonly destinationHash: Uint8Array;
  readonly tag: Uint8Array;
};
export type PathRequestTagKeyAction = {
  readonly kind: "use-key";
  readonly key: string;
};
export interface PathRequestTagKeyStepResult {
  readonly state: PathRequestTagKeyState;
  readonly intents: readonly Intent[];
  readonly actions: readonly PathRequestTagKeyAction[];
}
export function initialPathRequestTagKeyState(): PathRequestTagKeyState {
  if (stryMutAct_9fa48("24672")) {
    {}
  } else {
    stryCov_9fa48("24672");
    return {};
  }
}
export function stepPathRequestTagKeyWithActions(state: PathRequestTagKeyState, event: PathRequestTagKeyEvent): PathRequestTagKeyStepResult {
  if (stryMutAct_9fa48("24673")) {
    {}
  } else {
    stryCov_9fa48("24673");
    if (stryMutAct_9fa48("24676") ? event.kind !== "path-request/tag-key-gate" : stryMutAct_9fa48("24675") ? false : stryMutAct_9fa48("24674") ? true : (stryCov_9fa48("24674", "24675", "24676"), event.kind === (stryMutAct_9fa48("24677") ? "" : (stryCov_9fa48("24677"), "path-request/tag-key-gate")))) {
      if (stryMutAct_9fa48("24678")) {
        {}
      } else {
        stryCov_9fa48("24678");
        return stryMutAct_9fa48("24679") ? {} : (stryCov_9fa48("24679"), {
          state,
          intents: stryMutAct_9fa48("24680") ? ["Stryker was here"] : (stryCov_9fa48("24680"), []),
          actions: stryMutAct_9fa48("24681") ? [] : (stryCov_9fa48("24681"), [stryMutAct_9fa48("24682") ? {} : (stryCov_9fa48("24682"), {
            kind: stryMutAct_9fa48("24683") ? "" : (stryCov_9fa48("24683"), "use-key"),
            key: pathRequestTagKey(event.destinationHash, event.tag)
          })])
        });
      }
    }
    return stryMutAct_9fa48("24684") ? {} : (stryCov_9fa48("24684"), {
      state,
      intents: stryMutAct_9fa48("24685") ? ["Stryker was here"] : (stryCov_9fa48("24685"), []),
      actions: stryMutAct_9fa48("24686") ? ["Stryker was here"] : (stryCov_9fa48("24686"), [])
    });
  }
}
export function shouldUsePathRequestTagKey(actions: ReadonlyArray<PathRequestTagKeyAction>): boolean {
  if (stryMutAct_9fa48("24687")) {
    {}
  } else {
    stryCov_9fa48("24687");
    return stryMutAct_9fa48("24688") ? actions.every(action => action.kind === "use-key") : (stryCov_9fa48("24688"), actions.some(stryMutAct_9fa48("24689") ? () => undefined : (stryCov_9fa48("24689"), action => stryMutAct_9fa48("24692") ? action.kind !== "use-key" : stryMutAct_9fa48("24691") ? false : stryMutAct_9fa48("24690") ? true : (stryCov_9fa48("24690", "24691", "24692"), action.kind === (stryMutAct_9fa48("24693") ? "" : (stryCov_9fa48("24693"), "use-key"))))));
  }
}

/** Extract path-request tag key from step actions; null when no `use-key`. */
export function pathRequestTagKeyFromActions(actions: ReadonlyArray<PathRequestTagKeyAction>): string | null {
  if (stryMutAct_9fa48("24694")) {
    {}
  } else {
    stryCov_9fa48("24694");
    const action = actions.find(stryMutAct_9fa48("24695") ? () => undefined : (stryCov_9fa48("24695"), entry => stryMutAct_9fa48("24698") ? entry.kind !== "use-key" : stryMutAct_9fa48("24697") ? false : stryMutAct_9fa48("24696") ? true : (stryCov_9fa48("24696", "24697", "24698"), entry.kind === (stryMutAct_9fa48("24699") ? "" : (stryCov_9fa48("24699"), "use-key")))));
    return (stryMutAct_9fa48("24702") ? action?.kind !== "use-key" : stryMutAct_9fa48("24701") ? false : stryMutAct_9fa48("24700") ? true : (stryCov_9fa48("24700", "24701", "24702"), (stryMutAct_9fa48("24703") ? action.kind : (stryCov_9fa48("24703"), action?.kind)) === (stryMutAct_9fa48("24704") ? "" : (stryCov_9fa48("24704"), "use-key")))) ? action.key : null;
  }
}